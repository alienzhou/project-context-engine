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
  // JavaScript/TypeScript 生态
  'js': 'javascript',
  'mjs': 'javascript',
  'cjs': 'javascript',
  'ts': 'typescript',
  'jsx': 'javascript',
  'tsx': 'tsx',

  // Python
  'py': 'python',
  'pyw': 'python',

  // Java 生态
  'java': 'java',
  'kt': 'kotlin',
  'kts': 'kotlin',

  // C/C++
  'c': 'c',
  'cpp': 'cpp',
  'cc': 'cpp',
  'cxx': 'cpp',
  'c++': 'cpp',
  'h': 'cpp',
  'hpp': 'cpp',
  'hxx': 'cpp',

  // 其他编程语言
  'go': 'go',
  'rs': 'rust',
  'swift': 'swift',
  'scala': 'scala',
  'cs': 'c_sharp',
  'rb': 'ruby',
  'php': 'php',
  'lua': 'lua',

  // Shell
  'sh': 'bash',
  'bash': 'bash',
  'zsh': 'bash',

  // 配置文件（降级处理）
  'json': 'json',
  'yaml': 'yaml',
  'yml': 'yaml',
  'toml': 'toml',
  'xml': 'xml',

  // Web 相关
  'html': 'html',
  'htm': 'html',
  'css': 'css',
  'scss': 'css',
  'sass': 'css',
  'vue': 'vue',

  // 新兴语言
  'zig': 'zig',
  'dart': 'dart',
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
// 语言降级映射：如果主要解析器不可用，尝试使用兼容的解析器
const fallbackMap: Record<string, string[]> = {
  'typescript': ['javascript'],
  'tsx': ['javascript'],
  'kotlin': ['java'],
  'c_sharp': ['java'],
  'scala': ['java'],
  'scss': ['css'],
  'sass': ['css'],
  'yaml': ['json'],
  'toml': ['json'],
  'zsh': ['bash'],
  'pyw': ['python'],
  'mjs': ['javascript'],
  'cjs': ['javascript'],
  'vue': ['javascript'], // Vue 文件降级到 JavaScript 解析器
};

async function getLanguageParser(extension: string): Promise<Parser | null> {
  // 确保Parser已初始化
  await initParser();

  const ext = extension.toLowerCase().substring(1);
  const lang = languageMap[ext];

  if (!lang) {
    logger.warn(`Unsupported file extension: ${extension}`);
    return null;
  }

  // 如果已经缓存了解析器，直接返回
  if (parsers[lang]) {
    return parsers[lang];
  }

  // 尝试加载主要解析器
  const parser = await tryLoadParser(lang);
  if (parser) {
    return parser;
  }

  // 尝试降级解析器
  const fallbacks = fallbackMap[lang] || [];
  for (const fallbackLang of fallbacks) {
    logger.info(`Trying fallback parser ${fallbackLang} for ${lang}`);
    const fallbackParser = await tryLoadParser(fallbackLang);
    if (fallbackParser) {
      // 缓存降级解析器
      parsers[lang] = fallbackParser;
      return fallbackParser;
    }
  }

  logger.error(`No parser available for language: ${lang}`);
  return null;
}

async function tryLoadParser(lang: string): Promise<Parser | null> {
  if (parsers[lang]) {
    return parsers[lang];
  }

  try {
    const parser = new Parser();

    // 多路径查找策略
    const possiblePaths = [
      path.resolve(__dirname, `../../../node_modules/tree-sitter-wasms/out/tree-sitter-${lang}.wasm`),
      path.resolve(__dirname, `../../../../node_modules/tree-sitter-wasms/out/tree-sitter-${lang}.wasm`),
      path.resolve(process.cwd(), `node_modules/tree-sitter-wasms/out/tree-sitter-${lang}.wasm`),
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
      logger.warn(`Language WASM file not found for ${lang}`);
      return null;
    }
  } catch (error) {
    logger.error(`Error loading language parser for ${lang}`, { error });
    return null;
  }
}

/**
 * 从 Vue 文件中提取 <script> 和 <template> 部分的内容
 */
function extractVueContent(vueContent: string): {
  script: string;
  lang: string;
  template: string;
  hasTemplate: boolean;
} {
  // 匹配 <script> 标签，支持 lang 属性
  const scriptRegex = /<script(?:\s+lang=["'](\w+)["'])?[^>]*>([\s\S]*?)<\/script>/i;
  const scriptMatch = vueContent.match(scriptRegex);

  // 匹配 <template> 标签
  const templateRegex = /<template[^>]*>([\s\S]*?)<\/template>/i;
  const templateMatch = vueContent.match(templateRegex);

  const script = scriptMatch ? scriptMatch[2] || '' : '';
  const lang = scriptMatch ? scriptMatch[1] || 'javascript' : 'javascript';
  const template = templateMatch ? templateMatch[1] || '' : '';
  const hasTemplate = !!templateMatch && template.trim().length > 0;

  return { script, lang, template, hasTemplate };
}

/**
 * HTML 元素信息
 */
interface HtmlElement {
  tagName: string;
  hasId: boolean;
  hasClass: boolean;
  children: HtmlElement[];
  depth: number;
}

/**
 * 从 HTML 文件中提取重要的标签结构
 */
function extractHtmlElements(root: Parser.SyntaxNode): CodeNodeInfoWithoutFilepath[] {
  const elements: CodeNodeInfoWithoutFilepath[] = [];

  // 重要的语义化标签
  const importantTags = new Set([
    'html', 'head', 'body', 'header', 'nav', 'main', 'section', 'article',
    'aside', 'footer', 'div', 'form', 'table', 'ul', 'ol', 'li'
  ]);

  // 构建HTML层级结构
  function buildHtmlStructure(node: Parser.SyntaxNode, depth: number = 0): HtmlElement | null {
    if (node.type !== 'element') {
      return null;
    }

    // 获取标签名
    const startTag = node.child(0);
    if (!startTag || startTag.type !== 'start_tag') {
      return null;
    }

    const tagNameNode = startTag.child(1);
    if (!tagNameNode || tagNameNode.type !== 'tag_name') {
      return null;
    }

    const tagName = tagNameNode.text.toLowerCase();

    // 检查是否有 id 或 class 属性
    const hasId = hasAttribute(startTag, 'id');
    const hasClass = hasAttribute(startTag, 'class');

    // 只包含重要标签或有重要属性的元素
    const shouldInclude = importantTags.has(tagName) || hasId || hasClass;

    if (!shouldInclude) {
      return null;
    }

    const element: HtmlElement = {
      tagName,
      hasId,
      hasClass,
      children: [],
      depth
    };

    // 递归处理子元素
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === 'element') {
        const childElement = buildHtmlStructure(child, depth + 1);
        if (childElement) {
          element.children.push(childElement);
        }
      }
    }

    return element;
  }

  // 将HTML结构转换为签名字符串，采用智能过滤策略
  function convertToSignatures(element: HtmlElement, depth: number = 0): void {
    // 构建树形缩进，使用空格和符号来表示层级
    const indent = '  '.repeat(depth); // 每层缩进2个空格
    const treeSymbol = depth === 0 ? '' : '├─ '; // 树形连接符
    const signature = `${indent}${treeSymbol}${element.tagName}`;

    // 添加属性信息（如果有id或class）
    let attributeInfo = '';
    if (element.hasId || element.hasClass) {
      const attrs = [];
      if (element.hasId) attrs.push('id');
      if (element.hasClass) attrs.push('class');
      attributeInfo = ` [${attrs.join(', ')}]`;
    }

    const fullSignature = signature + attributeInfo;

    // 简化的HTML过滤逻辑：显示更多层级，专注于树形结构
    const shouldInclude = shouldIncludeHtmlElement(element, depth);

    if (shouldInclude) {
      elements.push({
        fullText: fullSignature,
        signature: fullSignature
      });
    }

    // 递归处理子元素，增加缩进层级
    for (const child of element.children) {
      convertToSignatures(child, depth + 1);
    }
  }

  // 专门为HTML设计的过滤函数 - 更宽松的策略以显示树形结构
  function shouldIncludeHtmlElement(element: HtmlElement, depth: number): boolean {
    const tagName = element.tagName;

    // 限制最大深度为6层，避免过深嵌套
    if (depth > 6) {
      return false;
    }

    // 1. 总是包含顶级结构标签
    if (['html', 'head', 'body'].includes(tagName)) {
      return true;
    }

    // 2. 包含重要的语义化标签（不管层级）
    const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'];
    if (semanticTags.includes(tagName)) {
      return true;
    }

    // 3. 包含有 id 的元素（这些通常是重要的）
    if (element.hasId) {
      return true;
    }

    // 4. 包含有 class 的元素（这些通常是重要的）
    if (element.hasClass) {
      return true;
    }

    // 5. 表单相关元素
    if (['form', 'table', 'ul', 'ol', 'li'].includes(tagName)) {
      return true;
    }

    // 6. 常见的重要标签
    const commonTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'input', 'select'];
    if (commonTags.includes(tagName)) {
      return true;
    }

    // 7. div 元素在浅层显示
    if (tagName === 'div' && depth <= 4) {
      return true;
    }

    // 8. 默认不包含
    return false;
  }

  // 判断是否应该包含这个元素
  function shouldIncludeElement(element: HtmlElement, path: string[]): boolean {
    const depth = path.length;
    const tagName = element.tagName;

    // 限制最大深度为10层，避免过深嵌套
    if (depth > 10) {
      return false;
    }

    // 1. 总是包含顶级结构标签
    if (['html', 'head', 'body'].includes(tagName)) {
      return true;
    }

    // 2. 包含重要的语义化标签（不管层级）
    const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'];
    if (semanticTags.includes(tagName)) {
      return true;
    }

    // 3. 包含有 id 的元素（这些通常是重要的）
    if (element.hasId) {
      return true;
    }

    // 4. 对于 div，放宽限制
    if (tagName === 'div') {
      // 有 class 或 id 的 div 在深度8层内
      if (element.hasClass || element.hasId) {
        return depth <= 8;
      }
      // 普通 div 在深度5层内
      return depth <= 5;
    }

    // 5. 表单相关元素，放宽限制
    if (['form', 'table', 'ul', 'ol', 'li'].includes(tagName)) {
      return depth <= 8;
    }

    // 6. 其他有 class 的元素在深度7层内
    if (element.hasClass) {
      return depth <= 7;
    }

    // 7. 常见的重要标签
    const commonTags = ['a', 'button', 'input', 'select', 'textarea', 'img', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    if (commonTags.includes(tagName)) {
      return depth <= 6;
    }

    // 8. 默认不包含
    return false;
  }

  // 只处理顶级文档元素，避免重复
  function processTopLevelElements(node: Parser.SyntaxNode): void {
    // 直接查找 html 元素作为根节点
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === 'element') {
        const element = buildHtmlStructure(child);
        if (element) {
          convertToSignatures(element);
          return; // 只处理第一个顶级元素（通常是 html）
        }
      }
    }
  }

  processTopLevelElements(root);
  return elements;
}

/**
 * 检查标签是否有指定属性
 */
function hasAttribute(startTag: Parser.SyntaxNode, attributeName: string): boolean {
  for (let i = 0; i < startTag.childCount; i++) {
    const child = startTag.child(i);
    if (child && child.type === 'attribute') {
      // HTML 属性的结构通常是: attribute_name="attribute_value"
      const nameNode = child.child(0); // 第一个子节点是属性名
      if (nameNode && nameNode.type === 'attribute_name') {
        const attrName = nameNode.text.toLowerCase();
        if (attrName === attributeName.toLowerCase()) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * 检查标签是否有重要属性（id 或 class）
 */
function hasImportantAttributes(startTag: Parser.SyntaxNode): boolean {
  return hasAttribute(startTag, 'id') || hasAttribute(startTag, 'class');
}

/**
 * 提取标签的属性
 */
function extractAttributes(startTag: Parser.SyntaxNode): { id?: string; class?: string;[key: string]: string | undefined } {
  const attributes: { id?: string; class?: string;[key: string]: string | undefined } = {};

  for (let i = 0; i < startTag.childCount; i++) {
    const child = startTag.child(i);
    if (child && child.type === 'attribute') {
      // HTML 属性结构: attribute_name="attribute_value" 或 attribute_name='attribute_value'
      const nameNode = child.child(0); // 属性名
      const valueNode = child.child(2); // 属性值（跳过 = 符号）

      if (nameNode && nameNode.type === 'attribute_name' && valueNode && valueNode.type === 'quoted_attribute_value') {
        const attrName = nameNode.text.toLowerCase();

        // 在 quoted_attribute_value 中查找实际的属性值
        const actualValueNode = valueNode.child(1); // 中间的子节点是 attribute_value
        let attrValue = actualValueNode ? actualValueNode.text : valueNode.text;

        // 如果没有找到子节点，则移除引号
        if (!actualValueNode) {
          if ((attrValue.startsWith('"') && attrValue.endsWith('"')) ||
            (attrValue.startsWith("'") && attrValue.endsWith("'"))) {
            attrValue = attrValue.slice(1, -1);
          }
        }

        attributes[attrName] = attrValue;
      }
    }
  }

  return attributes;
}

/**
 * 从 Vue 组件对象中提取方法
 */
function extractVueComponentMethods(objectNode: Parser.SyntaxNode, snippets: CodeNodeInfoWithoutFilepath[]): void {
  for (let i = 0; i < objectNode.childCount; i++) {
    const child = objectNode.child(i);
    if (!child) continue;

    // 处理直接的方法定义（如 data(), mounted() 等）
    if (child.type === 'method_definition') {
      const nameNode = child.childForFieldName('name');
      const paramsNode = child.childForFieldName('parameters');

      if (nameNode && paramsNode) {
        const methodName = nameNode.text;
        const signature = `${methodName}${paramsNode.text} { }`;
        const fullText = child.text;

        snippets.push({
          fullText,
          signature
        });
      }
      continue;
    }

    if (child.type !== 'pair') continue;

    // 检查是否是 methods 属性
    const keyNode = child.childForFieldName('key');
    const valueNode = child.childForFieldName('value');

    if (keyNode && valueNode &&
      (keyNode.text === 'methods' || keyNode.text === '"methods"' || keyNode.text === "'methods'")) {

      // 遍历 methods 对象中的所有方法
      if (valueNode.type === 'object') {
        for (let j = 0; j < valueNode.childCount; j++) {
          const methodChild = valueNode.child(j);
          if (!methodChild) continue;

          // 处理直接的方法定义（Vue methods 中的方法）
          if (methodChild.type === 'method_definition') {
            const nameNode = methodChild.childForFieldName('name');
            const paramsNode = methodChild.childForFieldName('parameters');

            if (nameNode && paramsNode) {
              const methodName = nameNode.text;
              const signature = `${methodName}${paramsNode.text} { }`;
              const fullText = methodChild.text;

              snippets.push({
                fullText,
                signature
              });
            }
            continue;
          }

          // 处理 pair 类型的方法（函数表达式形式）
          if (methodChild.type === 'pair') {
            const methodKeyNode = methodChild.childForFieldName('key');
            const methodValueNode = methodChild.childForFieldName('value');

            if (methodKeyNode && methodValueNode &&
              (methodValueNode.type === 'function' || methodValueNode.type === 'arrow_function')) {

              // 提取方法名
              const methodName = methodKeyNode.text.replace(/['"]/g, '');

              // 创建方法签名
              const paramsNode = methodValueNode.childForFieldName('parameters');
              const paramsText = paramsNode ? paramsNode.text : '()';

              const signature = `${methodName}${paramsText} { }`;
              const fullText = methodValueNode.text;

              snippets.push({
                fullText,
                signature
              });
            }
          }
        }
      }
    }

    // 检查其他生命周期钩子和计算属性
    if (keyNode && valueNode) {
      const key = keyNode.text.replace(/['"]/g, '');

      // Vue 生命周期钩子
      const lifecycleHooks = [
        'data', 'computed', 'watch', 'created', 'mounted', 'updated',
        'destroyed', 'beforeCreate', 'beforeMount', 'beforeUpdate',
        'beforeDestroy', 'activated', 'deactivated', 'errorCaptured',
        'setup' // Vue 3 Composition API
      ];

      if (lifecycleHooks.includes(key)) {
        if (valueNode.type === 'function' || valueNode.type === 'arrow_function') {
          const paramsNode = valueNode.childForFieldName('parameters');
          const paramsText = paramsNode ? paramsNode.text : '()';

          const signature = `${key}${paramsText} { }`;
          const fullText = valueNode.text;

          snippets.push({
            fullText,
            signature
          });
        } else if (key === 'computed' && valueNode.type === 'object') {
          // 处理计算属性
          for (let j = 0; j < valueNode.childCount; j++) {
            const computedPair = valueNode.child(j);
            if (!computedPair || computedPair.type !== 'pair') continue;

            const computedKeyNode = computedPair.childForFieldName('key');
            const computedValueNode = computedPair.childForFieldName('value');

            if (computedKeyNode && computedValueNode &&
              (computedValueNode.type === 'function' || computedValueNode.type === 'arrow_function')) {

              const computedName = computedKeyNode.text.replace(/['"]/g, '');
              const paramsNode = computedValueNode.childForFieldName('parameters');
              const paramsText = paramsNode ? paramsNode.text : '()';

              const signature = `computed ${computedName}${paramsText} { }`;
              const fullText = computedValueNode.text;

              snippets.push({
                fullText,
                signature
              });
            }
          }
        }
      }
    }
  }
}

/**
 * 从类内部提取方法和函数
 */
function extractMethodsFromClass(classNode: Parser.SyntaxNode, snippets: CodeNodeInfoWithoutFilepath[]): void {
  // 递归搜索类内部的所有子节点
  function searchNode(node: Parser.SyntaxNode): void {
    // 检查当前节点是否为方法或函数
    const isMethod = [
      // Java
      'method_declaration', 'constructor_declaration',
      // Kotlin
      'function_declaration', 'property_declaration',
      // C++
      'function_definition', 'function_declarator',
      // JavaScript/TypeScript (类方法)
      'method_definition',
      // 其他通用类型
      'function_declaration'
    ].includes(node.type);

    if (isMethod) {
      processFunction(node, snippets);
    }

    // 递归搜索子节点，但不要进入嵌套的类定义
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type !== 'class_declaration' && child.type !== 'class_specifier') {
        searchNode(child);
      }
    }
  }

  // 查找类体节点
  const bodyNode = classNode.childForFieldName('body') || classNode.children.find(c => c.type === 'class_body');

  if (bodyNode) {
    // 直接遍历类体中的方法定义
    for (let i = 0; i < bodyNode.childCount; i++) {
      const child = bodyNode.child(i);
      if (!child) continue;

      if (child.type === 'method_definition') {
        processFunction(child, snippets);
      } else {
        // 递归搜索其他可能包含方法的节点
        searchNode(child);
      }
    }
  } else {
    // 如果找不到类体，使用原来的递归搜索
    searchNode(classNode);
  }
}

/**
 * 从语法树中提取函数/方法声明
 */
function extractCodeSnippets(root: Parser.SyntaxNode): CodeNodeInfoWithoutFilepath[] {
  const snippets: CodeNodeInfoWithoutFilepath[] = [];



  // 递归处理节点 - 支持预处理器块等嵌套结构
  function processNode(node: Parser.SyntaxNode): void {
    // 检查节点类型是否为函数/方法定义相关的类型
    const isFunctionLike = [
      // JavaScript/TypeScript
      'function_declaration', 'method_definition', 'function', 'arrow_function', 'class_declaration', 'method_declaration',
      // Java
      'method_declaration', 'constructor_declaration', 'class_declaration', 'interface_declaration',
      // Kotlin  
      'function_declaration', 'class_declaration', 'property_declaration',
      // Go
      'function_declaration', 'method_declaration', 'type_declaration', 'struct_type',
      // C/C++
      'function_definition', 'function_declarator', 'class_specifier', 'struct_specifier', 'declaration',
      // Python
      'function_definition', 'class_definition', 'decorated_definition',
      // Rust
      'function_item', 'impl_item', 'struct_item', 'enum_item',
      // Swift
      'function_declaration', 'class_declaration', 'struct_declaration',
      // C#
      'method_declaration', 'constructor_declaration', 'class_declaration', 'interface_declaration',
      // Common
      'interface_declaration', 'type_alias_declaration'
    ].includes(node.type);

    // 检查是否为预处理器块或其他容器节点
    const isContainer = [
      'preproc_ifdef', 'preproc_if', 'preproc_ifndef', 'namespace_definition', 'linkage_specifier'
    ].includes(node.type);

    // 检查是否为导出声明（可能包含函数定义）
    const isExport = node.type === 'export_statement';

    if (isFunctionLike) {
      processFunction(node, snippets);

      // 如果是类声明，递归搜索类内部的方法
      if (node.type === 'class_declaration' || node.type === 'class_specifier') {
        extractMethodsFromClass(node, snippets);
      }
    } else if (isContainer) {
      // 递归处理容器内部的节点
      for (let j = 0; j < node.childCount; j++) {
        const child = node.child(j);
        if (child) {
          processNode(child);
        }
      }
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

          // 如果是导出的类，也要提取类方法
          if (exportedNode.type === 'class_declaration') {
            extractMethodsFromClass(exportedNode, snippets);
          }
        }

        // 直接检查是否是对象字面量（Vue 组件）
        if (exportedNode.type === 'object') {
          extractVueComponentMethods(exportedNode, snippets);
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

              // 如果是默认导出的类，也要提取类方法
              if (defaultNode.type === 'class_declaration') {
                extractMethodsFromClass(defaultNode, snippets);
              }
            } else if (defaultNode.type === 'object') {
              // 处理 Vue 组件的 export default {} 语法
              extractVueComponentMethods(defaultNode, snippets);
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

  // 遍历语法树的所有子节点
  for (let i = 0; i < root.childCount; i++) {
    const node = root.child(i);
    if (node) {
      processNode(node);
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

    let fileContent = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath);
    let actualExt = ext;

    // 特殊处理 Vue 文件
    if (ext.toLowerCase() === '.vue') {
      const { script, lang, template, hasTemplate } = extractVueContent(fileContent);
      const snippets: CodeNodeInfo[] = [];

      // 处理 script 部分
      if (script.trim()) {
        // 根据 script 标签的 lang 属性确定实际的语言类型
        const scriptExt = lang === 'ts' || lang === 'typescript' ? '.ts' : '.js';
        const parser = await getLanguageParser(scriptExt);

        if (parser) {
          const tree = parser.parse(script);
          const scriptSnippets = extractCodeSnippets(tree.rootNode);
          snippets.push(...scriptSnippets.map(s => ({ ...s, filePath })));
          logger.info(`Extracted ${lang} script from Vue file: ${filePath}`);
        }
      }

      // 添加script和template之间的分隔符
      if (script.trim() && hasTemplate) {
        snippets.push({
          fullText: '--- Template ---',
          signature: '--- Template ---',
          filePath
        });
      }

      // 处理 template 部分
      if (hasTemplate) {
        const htmlParser = await getLanguageParser('.html');
        if (htmlParser) {
          // 将template内容包装成完整的HTML文档以便解析
          const wrappedTemplate = `<div>${template}</div>`;
          const tree = htmlParser.parse(wrappedTemplate);
          const templateElements = extractHtmlElements(tree.rootNode);
          snippets.push(...templateElements.map(e => ({ ...e, filePath })));
          logger.info(`Extracted template from Vue file: ${filePath}, found ${templateElements.length} elements`);
        }
      }

      if (snippets.length === 0) {
        logger.warn(`No script or template content found in Vue file: ${filePath}`);
      }

      return snippets;
    }

    // 特殊处理 HTML 文件
    if (ext.toLowerCase() === '.html' || ext.toLowerCase() === '.htm') {
      const parser = await getLanguageParser(actualExt);
      if (!parser) {
        logger.warn(`No HTML parser available for file: ${filePath}`);
        return [];
      }

      // 解析 HTML 内容
      const tree = parser.parse(fileContent);

      // 提取 HTML 元素结构
      const elements = extractHtmlElements(tree.rootNode);



      logger.info(`Parsed HTML file ${filePath}, found ${elements.length} important elements`);

      return elements.map(e => ({
        ...e,
        filePath
      }));
    }

    const parser = await getLanguageParser(actualExt);
    if (!parser) {
      logger.warn(`No parser available for file: ${filePath} (detected as ${actualExt})`);
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
