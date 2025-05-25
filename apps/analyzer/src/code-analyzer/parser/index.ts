import * as fs from 'fs';
import * as path from 'path';
import Parser from 'web-tree-sitter';
import Logger from '../../utils/log';
import { type CodeNodeInfo } from '../type';

type CodeNodeInfoWithoutFilepath = Omit<CodeNodeInfo, 'filePath'>;

// 创建一个日志记录器，指定模块名为 'code-parser'
const logger = Logger('code-parser');

// 语言到Tree-sitter语法的映射
const languageMap: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'jsx': 'javascript',
  'tsx': 'tsx',
  'py': 'python',
  'java': 'java',
  'cpp': 'cpp',
  'c': 'c',
  'go': 'go',
  'rb': 'ruby',
  'php': 'php',
  'html': 'html',
  'css': 'css',
  'rust': 'rust',
};

// 初始化Tree-sitter的Promise
let parserInitPromise: Promise<void> | null = null;
// 语言解析器的缓存
const parsers: Record<string, Parser> = {};

/**
 * 初始化Tree-sitter解析器
 */
async function initParser(): Promise<void> {
  if (parserInitPromise) {
    return parserInitPromise;
  }

  parserInitPromise = (async () => {
    try {
      // 初始化树解析器
      await Parser.init();
      logger.info('Tree-sitter parser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Tree-sitter parser', { error });
      throw error;
    }
  })();

  return parserInitPromise;
}

/**
 * 根据文件扩展名获取对应的语言解析器
 */
async function getLanguageParser(extension: string): Promise<Parser | null> {
  // 确保Parser已初始化
  await initParser();
  
  const lang = languageMap[extension.toLowerCase().substring(1)];
  if (!lang) {
    logger.warn(`Unsupported file extension: ${extension}`);
    return null;
  }

  if (parsers[lang]) {
    return parsers[lang];
  }

  try {
    // 创建新的解析器实例
    const parser = new Parser();
    
    // 使用更灵活的方式定位 WASM 文件
    // 首先尝试在项目中指定的位置查找，如果不存在则尝试在 node_modules 中查找
    const possiblePaths = [
      path.resolve(__dirname, `../../../node_modules/tree-sitter-wasms/out/tree-sitter-${lang}.wasm`),
    ];

    logger.info('possiblePaths', possiblePaths);
    
    let wasmPath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        wasmPath = p;
        break;
      }
    }
    
    if (wasmPath) {
      const langWasm = await Parser.Language.load(wasmPath);
      parser.setLanguage(langWasm);
      parsers[lang] = parser;
      logger.info(`Loaded language parser for ${lang} from ${wasmPath}`);
      return parser;
    } else {
      logger.error(`Language WASM file not found for ${lang}`);
      return null;
    }
  } catch (error) {
    logger.error(`Error loading language parser for ${lang}`, { error });
    return null;
  }
}

/**
 * 从语法树中提取函数/方法声明
 */
function extractCodeSnippets(root: Parser.SyntaxNode): CodeNodeInfoWithoutFilepath[] {
  const snippets: CodeNodeInfoWithoutFilepath[] = [];
  
  // 遍历语法树的第一层子节点
  for (let i = 0; i < root.childCount; i++) {
    const node = root.child(i);
    if (!node) continue;
    
    // 检查节点类型是否为函数/方法定义相关的类型
    const isFunctionLike =
      node.type === 'function_declaration' ||
      node.type === 'method_definition' || 
      node.type === 'function' || 
      node.type === 'arrow_function' ||
      node.type === 'class_declaration' ||
      node.type === 'method_declaration';
    
    // 检查是否为导出声明（可能包含函数定义）
    const isExport = node.type === 'export_statement';
    
    if (isFunctionLike) {
      processFunction(node, snippets);
    } else if (isExport) {
      // 处理导出的函数声明
      for (let j = 0; j < node.childCount; j++) {
        const exportedNode = node.child(j);
        if (!exportedNode) continue;
        
        const isExportedFunction = 
          exportedNode.type === 'function_declaration' ||
          exportedNode.type === 'method_definition' || 
          exportedNode.type === 'function' ||
          exportedNode.type === 'arrow_function' ||
          exportedNode.type === 'class_declaration' ||
          exportedNode.type === 'method_declaration';
        
        if (isExportedFunction) {
          processFunction(exportedNode, snippets);
        }
        
        // 处理导出声明中的默认声明
        if (exportedNode.type === 'default') {
          for (let k = 0; k < exportedNode.childCount; k++) {
            const defaultNode = exportedNode.child(k);
            if (!defaultNode) continue;
            
            const isDefaultFunction = 
              defaultNode.type === 'function_declaration' ||
              defaultNode.type === 'method_definition' || 
              defaultNode.type === 'function' || 
              defaultNode.type === 'arrow_function' ||
              defaultNode.type === 'class_declaration' ||
              defaultNode.type === 'method_declaration';
            
            if (isDefaultFunction) {
              processFunction(defaultNode, snippets);
            }
          }
        }
      }
    } else if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
      // 处理通过 const/let/var 声明的函数表达式
      for (let j = 0; j < node.childCount; j++) {
        const varNode = node.child(j);
        if (varNode && varNode.type === 'variable_declarator') {
          for (let k = 0; k < varNode.childCount; k++) {
            const valueNode = varNode.child(k);
            if (valueNode && (
                valueNode.type === 'function' || 
                valueNode.type === 'arrow_function'
              )) {
              processFunction(valueNode, snippets, varNode.text.split('=')[0].trim());
            }
          }
        }
      }
    }
  }
  
  return snippets;
}

/**
 * 处理函数节点，提取其文本和签名
 */
function processFunction(node: Parser.SyntaxNode, snippets: CodeNodeInfoWithoutFilepath[], nameOverride?: string): void {
  // 获取完整的函数/方法文本
  const fullText = node.text;
  
  // 提取函数/方法签名
  let signature = '';
  
  // 根据不同的节点类型提取签名
  if (node.type === 'function_declaration') {
    // 查找函数体开始的位置
    const bodyNode = node.childForFieldName('body');
    if (bodyNode) {
      // 查找函数名和参数
      const nameNode = node.childForFieldName('name');
      const paramsNode = node.childForFieldName('parameters');
      
      if (nameNode && paramsNode) {
        // 直接构建签名，确保包含函数名和参数
        signature = `function ${nameNode.text}${paramsNode.text} { }`;
      } else {
        // 如果无法获取名称或参数，退回到简单的文本提取
        signature = fullText.substring(0, bodyNode.startPosition.column - node.startPosition.column) + ' { }';
      }
    }
  } else if (node.type === 'method_definition' || node.type === 'method_declaration') {
    // 查找方法体开始的位置
    const bodyNode = node.childForFieldName('body');
    if (bodyNode) {
      // 查找方法名和参数
      const nameNode = node.childForFieldName('name');
      const paramsNode = node.childForFieldName('parameters');
      if (nameNode && paramsNode) {
        // 直接构建签名，确保包含方法名和参数
        signature = `${nameNode.text}${paramsNode.text} { }`;
      } else {
        // 如果无法获取名称或参数，退回到简单的文本提取
        signature = fullText.substring(0, bodyNode.startPosition.column - node.startPosition.column) + ' { }';
      }
    }
  } else if (node.type === 'arrow_function') {
    // 对于箭头函数，如果提供了名称重写，使用它
    if (nameOverride) {
      const paramsText = node.childForFieldName('parameters')?.text || '()';
      signature = `${nameOverride} = ${paramsText} => { }`;
    } else {
      // 查找箭头函数参数
      const paramsNode = node.childForFieldName('parameters');
      if (paramsNode) {
        signature = `${paramsNode.text} => { }`;
      } else {
        // 如果无法获取参数，退回到简单的文本提取
        const arrowPos = fullText.indexOf('=>');
        if (arrowPos !== -1) {
          signature = fullText.substring(0, arrowPos + 2) + ' { }';
        }
      }
    }
  } else if (node.type === 'function') {
    // 对于函数表达式，如果提供了名称重写，使用它
    if (nameOverride) {
      const paramsText = node.childForFieldName('parameters')?.text || '()';
      signature = `${nameOverride} = function${paramsText} { }`;
    } else {
      // 查找函数名（如果有）和参数
      const nameNode = node.childForFieldName('name');
      const paramsNode = node.childForFieldName('parameters');
      
      if (paramsNode) {
        const nameText = nameNode ? nameNode.text : '';
        signature = `function ${nameText}${paramsNode.text} { }`;
      } else {
        // 如果无法获取参数，退回到简单的文本提取
        const bodyNode = node.childForFieldName('body');
        if (bodyNode) {
          signature = fullText.substring(0, bodyNode.startPosition.column - node.startPosition.column) + ' { }';
        }
      }
    }
  } else if (node.type === 'class_declaration') {
    // 对于类声明，提取类签名和其中的方法签名
    const bodyNode = node.childForFieldName('body');
    const nameNode = node.childForFieldName('name');
    
    if (nameNode && bodyNode) {
      // 首先创建类的基本签名
      let classSignature = `class ${nameNode.text} {`;
      
      // 遍历类体中的所有子节点，查找方法定义
      const methodSignatures: string[] = [];
      for (let i = 0; i < bodyNode.childCount; i++) {
        const child = bodyNode.child(i);
        if (!child) continue;
        if (child.type === 'method_definition') {
          // 对于每个方法，提取其签名
          const methodNameNode = child.childForFieldName('name');
          const methodParamsNode = child.childForFieldName('parameters');
          
          if (methodNameNode && methodParamsNode) {
            // 构建方法签名
            methodSignatures.push(`  ${methodNameNode.text}${methodParamsNode.text} { }`);
          }
        } else if (child.type === 'public_field_definition') {
          // 处理类中的公共字段
          const fieldNameNode = child.childForFieldName('name');
          if (fieldNameNode) {
            methodSignatures.push(`  ${fieldNameNode.text};`);
          }
        }
      }
      
      // 将所有方法签名合并到类签名中
      if (methodSignatures.length > 0) {
        classSignature += '\n' + methodSignatures.join('\n') + '\n}';
      } else {
        classSignature += ' }';
      }
      
      signature = classSignature;
    } else if (bodyNode) {
      signature = fullText.substring(0, bodyNode.startPosition.column - node.startPosition.column) + ' { }';
    }
  }
  
  // 如果无法提取签名，则使用完整文本
  if (!signature) {
    signature = fullText;
  }
  
  snippets.push({
    fullText,
    signature
  });
}

/**
 * 解析代码文件为方法片段
 * 
 * @param filePath 文件路径
 * @returns 代码片段信息数组
 */
export async function parseCodeFile(filePath: string): Promise<CodeNodeInfo[]> {
  try {
    if (!fs.existsSync(filePath)) {
      logger.error(`File does not exist: ${filePath}`);
      return [];
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath);
    
    const parser = await getLanguageParser(ext);
    if (!parser) {
      logger.warn(`No parser available for file: ${filePath}`);
      return [];
    }
    
    // 解析代码内容
    const tree = parser.parse(fileContent);
    
    // 提取代码片段
    const snippets = extractCodeSnippets(tree.rootNode);
    
    logger.info(`Parsed file ${filePath}, found ${snippets.length} code snippets`);
    
    return snippets.map(s => ({
      ...s,
      filePath
    }));
  } catch (error) {
    logger.error(`Error parsing file: ${filePath}`, { error });
    return [];
  }
}
