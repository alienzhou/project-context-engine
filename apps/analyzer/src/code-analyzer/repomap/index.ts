import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseCodeFile } from '../parser';
import Logger from '../../utils/log';
import { shouldProcessFile } from '../../utils/fs';

const logger = Logger('repo-map');

export interface RepoMapSymbol {
  name: string;
  type: 'class' | 'function' | 'interface' | 'method' | 'variable' | 'type' | 'constructor' | 'property' | 'enum' | 'constant' | 'static_method' | 'async_function' | 'getter' | 'setter' | 'html_element';
  signature: string;
  line: number;
  importance: number;
  modifiers?: string[]; // 如: ['static', 'async', 'private', 'readonly']
  returnType?: string;
  parameters?: string[];
}

export interface RepoMapFile {
  filepath: string;
  relativePath: string;
  symbols: RepoMapSymbol[];
  imports: string[];
  exports: string[];
}

export interface RepoMapOptions {
  maxTokens?: number;
  includeTypes?: boolean;
  includeVariables?: boolean;
  minImportance?: number;
  rootPath: string;
}

export interface RepoMapResult {
  files: RepoMapFile[];
  totalSymbols: number;
  estimatedTokens: number;
  map: string;
}

/**
 * 从代码中提取导入和导出信息
 */
function extractImportsExports(code: string): { imports: string[], exports: string[] } {
  const imports: string[] = [];
  const exports: string[] = [];

  // 匹配 import 语句
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }

  // 匹配 export 语句
  const exportRegex = /export\s+(?:default\s+)?(?:class|function|interface|type|const|let|var)\s+(\w+)/g;
  while ((match = exportRegex.exec(code)) !== null) {
    exports.push(match[1]);
  }

  // 匹配 export { ... } 语句
  const namedExportRegex = /export\s+\{([^}]+)\}/g;
  while ((match = namedExportRegex.exec(code)) !== null) {
    const namedExports = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
    exports.push(...namedExports);
  }

  return { imports, exports };
}

/**
 * 计算符号的重要性分数
 */
function calculateImportance(
  symbol: RepoMapSymbol,
  fileInfo: RepoMapFile,
  allFiles: RepoMapFile[]
): number {
  let score = 0;

  // 基础分数 - 按符号类型分配权重
  const typeScores: Record<RepoMapSymbol['type'], number> = {
    'class': 25,
    'interface': 20,
    'enum': 18,
    'type': 15,
    'constructor': 12,
    'function': 10,
    'async_function': 12,
    'static_method': 10,
    'method': 8,
    'getter': 6,
    'setter': 6,
    'property': 5,
    'constant': 7,
    'variable': 4,
    'html_element': 8,
  };

  score += typeScores[symbol.type] || 4;

  // 修饰符加分
  if (symbol.modifiers) {
    if (symbol.modifiers.includes('export')) score += 5;
    if (symbol.modifiers.includes('public')) score += 2;
    if (symbol.modifiers.includes('static')) score += 3;
    if (symbol.modifiers.includes('async')) score += 2;
    if (symbol.modifiers.includes('abstract')) score += 3;
    if (symbol.modifiers.includes('override')) score += 2;
  }

  // 导出的符号更重要
  if (fileInfo.exports.includes(symbol.name)) {
    score += 8;
  }

  // 被其他文件引用的符号更重要
  const referencedByCount = allFiles.filter(f =>
    f.imports.some(imp => imp.includes(fileInfo.relativePath.replace(/\.[^.]+$/, '')))
  ).length;
  score += referencedByCount * 2;

  // 名称模式加分（常见的重要模式）
  const name = symbol.name.toLowerCase();
  if (name.includes('main') || name.includes('init') || name.includes('setup')) score += 3;
  if (name.includes('config') || name.includes('setting')) score += 2;
  if (name.includes('util') || name.includes('helper')) score += 1;
  if (name.includes('test') || name.includes('spec')) score -= 2; // 测试代码降权

  // 参数复杂度加分
  if (symbol.parameters && symbol.parameters.length > 0) {
    score += Math.min(symbol.parameters.length * 0.5, 3);
  }

  return Math.max(score, 0);
}

/**
 * 构建依赖图并计算 PageRank
 */
function buildDependencyGraph(files: RepoMapFile[]): Map<string, number> {
  const graph = new Map<string, string[]>();
  const pageRank = new Map<string, number>();

  // 初始化图
  files.forEach(file => {
    graph.set(file.relativePath, []);
    pageRank.set(file.relativePath, 1.0);
  });

  // 构建依赖关系
  files.forEach(file => {
    file.imports.forEach(importPath => {
      const targetFile = files.find(f =>
        f.relativePath.includes(importPath) ||
        importPath.includes(f.relativePath.replace(/\.[^.]+$/, ''))
      );
      if (targetFile) {
        const deps = graph.get(file.relativePath) || [];
        deps.push(targetFile.relativePath);
        graph.set(file.relativePath, deps);
      }
    });
  });

  // 简化的 PageRank 算法
  const dampingFactor = 0.85;
  const iterations = 10;

  for (let i = 0; i < iterations; i++) {
    const newRanks = new Map<string, number>();

    files.forEach(file => {
      let rank = (1 - dampingFactor) / files.length;

      // 计算来自其他节点的贡献
      files.forEach(otherFile => {
        const deps = graph.get(otherFile.relativePath) || [];
        if (deps.includes(file.relativePath)) {
          const otherRank = pageRank.get(otherFile.relativePath) || 1.0;
          rank += dampingFactor * (otherRank / Math.max(deps.length, 1));
        }
      });

      newRanks.set(file.relativePath, rank);
    });

    newRanks.forEach((rank, filePath) => {
      pageRank.set(filePath, rank);
    });
  }

  return pageRank;
}

/**
 * 获取符号类型对应的图标
 */
function getSymbolIcon(type: RepoMapSymbol['type']): string {
  const icons: Record<RepoMapSymbol['type'], string> = {
    'class': '🏛️',
    'interface': '📋',
    'enum': '🔢',
    'type': '🏷️',
    'constructor': '🏗️',
    'function': '⚡',
    'async_function': '⚡🔄',
    'static_method': '⚡📌',
    'method': '🔧',
    'getter': '📤',
    'setter': '📥',
    'property': '💎',
    'constant': '🔒',
    'variable': '📦',
    'html_element': '📦',
  };
  return icons[type] || '❓';
}

/**
 * 生成简洁的符号签名（只显示声明，不显示方法体）
 */
function generateCleanSignature(symbol: RepoMapSymbol): string {
  const signature = symbol.signature;
  const icon = getSymbolIcon(symbol.type);
  let cleanSig = '';

  // 对于 HTML 元素：直接使用签名
  if (symbol.type === 'html_element') {
    cleanSig = signature.trim();
  }

  // 对于类：只显示类声明行
  if (symbol.type === 'class') {
    const lines = signature.split('\n');
    const classLine = lines.find(line => line.trim().startsWith('class ') || line.trim().includes('class '));
    if (classLine) {
      cleanSig = classLine.trim() + ' { }';
    }
  }

  // 对于接口：只显示接口声明行
  else if (symbol.type === 'interface') {
    const lines = signature.split('\n');
    const interfaceLine = lines.find(line => line.trim().startsWith('interface '));
    if (interfaceLine) {
      cleanSig = interfaceLine.trim() + ' { }';
    }
  }

  // 对于枚举：只显示枚举声明行
  else if (symbol.type === 'enum') {
    const lines = signature.split('\n');
    const enumLine = lines.find(line => line.trim().startsWith('enum '));
    if (enumLine) {
      cleanSig = enumLine.trim() + ' { }';
    }
  }

  // 对于函数/方法：提取函数声明
  else if (['function', 'method', 'async_function', 'static_method', 'constructor', 'getter', 'setter'].includes(symbol.type)) {
    // Go 函数格式：func (receiver) FunctionName(params) returnType
    if (signature.includes('func ')) {
      const match = signature.match(/func\s+(?:\([^)]*\)\s+)?(\w+)\([^)]*\)(?:\s+[^{]*)?/);
      if (match) {
        cleanSig = match[0].trim() + ' { }';
      }
    }
    // Java/Kotlin 方法格式
    else {
      const lines = signature.split('\n');
      const firstLine = lines[0].trim();

      // 如果第一行包含方法声明，使用它
      if (firstLine.includes('(') && firstLine.includes(')')) {
        // 移除可能的修饰符前缀，保留核心签名
        let cleanLine = firstLine.replace(/^\s*(public|private|protected|static|final|override|suspend)\s+/g, '');
        if (cleanLine.includes('{')) {
          cleanSig = cleanLine.split('{')[0].trim() + ' { }';
        } else {
          cleanSig = cleanLine + ' { }';
        }
      }
      // TypeScript/JavaScript 函数
      else {
        const tsMatch = signature.match(/(function\s+\w+\([^)]*\)|\w+\s*\([^)]*\)\s*=>|\w+\s*\([^)]*\))/);
        if (tsMatch) {
          cleanSig = tsMatch[0].trim() + ' { }';
        }
      }
    }
  }

  // 默认情况：返回第一行
  if (!cleanSig) {
    cleanSig = signature.split('\n')[0].trim() + (signature.split('\n').length > 1 ? ' { }' : '');
  }

  // 添加修饰符标记
  let modifierStr = '';
  if (symbol.modifiers && symbol.modifiers.length > 0) {
    const importantModifiers = symbol.modifiers.filter(m =>
      ['export', 'static', 'async', 'abstract', 'readonly'].includes(m)
    );
    if (importantModifiers.length > 0) {
      modifierStr = ` [${importantModifiers.join(', ')}]`;
    }
  }

  return `${icon} ${cleanSig}${modifierStr}`;
}

/**
 * 从函数签名中提取符号名称
 */
function extractSymbolName(signature: string): string {
  // 改进的正则匹配，支持更多语言模式

  // HTML 元素：提取标签名称
  if (signature.includes('├─') || signature.includes('html')) {
    // 提取标签名（去掉树形符号和属性）
    const match = signature.match(/(?:├─\s*)?(\w+)(?:\s*\[.*\])?/);
    if (match) {
      return match[1];
    }
    return 'html';
  }

  // Go: func (receiver) FunctionName 或 func FunctionName
  let match = signature.match(/func\s+(?:\([^)]*\)\s+)?(\w+)/);
  if (match) return match[1];

  // Java/Kotlin/C#: class ClassName 或 interface InterfaceName
  match = signature.match(/(?:class|interface|struct|enum)\s+(\w+)/);
  if (match) return match[1];

  // 方法/函数：methodName( 或 function functionName
  match = signature.match(/(?:function\s+)?(\w+)\s*\(/);
  if (match) return match[1];

  // 类型定义：type TypeName
  match = signature.match(/type\s+(\w+)/);
  if (match) return match[1];

  // 变量/常量：var/const/let varName
  match = signature.match(/(?:var|const|let)\s+(\w+)/);
  if (match) return match[1];

  return 'unknown';
}

/**
 * 判断符号是否为构造函数
 */
function isConstructor(symbol: RepoMapSymbol): boolean {
  const signature = symbol.signature.toLowerCase();
  return signature.includes('constructor') ||
    (symbol.type === 'function' && symbol.name === extractSymbolName(symbol.signature));
}

/**
 * 去重复符号（C++等语言可能有重复的函数声明和定义）
 */
function deduplicateSymbols(symbols: RepoMapSymbol[]): RepoMapSymbol[] {
  const seen = new Set<string>();
  const result: RepoMapSymbol[] = [];

  for (const symbol of symbols) {
    const key = `${symbol.type}-${symbol.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(symbol);
    }
  }

  return result;
}

/**
 * 计算文件优先级
 */
function calculateFilePriority(file: RepoMapFile): number {
  let priority = 0;

  // 基于文件路径的优先级
  const path = file.relativePath.toLowerCase();

  // 降低测试文件优先级
  if (path.includes('test') || path.includes('spec') || path.includes('__test__')) {
    priority -= 10;
  }

  // 降低配置文件优先级
  if (path.includes('config') || path.includes('.json') || path.includes('.yaml')) {
    priority -= 5;
  }

  // 提高核心业务文件优先级
  if (path.includes('src/') || path.includes('lib/') || path.includes('core/')) {
    priority += 5;
  }

  // 提高入口文件优先级
  if (path.includes('index') || path.includes('main') || path.includes('app')) {
    priority += 8;
  }

  // 基于符号数量和重要性的优先级
  const totalImportance = file.symbols.reduce((sum, symbol) => sum + symbol.importance, 0);
  priority += Math.min(totalImportance / 10, 20); // 最多加20分

  // 基于导出数量的优先级
  priority += Math.min(file.exports.length * 2, 10); // 最多加10分

  return priority;
}

/**
 * 生成格式化的 repo map 字符串
 */
function formatRepoMap(files: RepoMapFile[], maxTokens: number): string {
  let result = '';
  let currentTokens = 0;

  // 过滤掉空文件，计算优先级并排序
  const sortedFiles = files
    .filter(file => file.symbols.length > 0)
    .map(file => ({
      ...file,
      priority: calculateFilePriority(file)
    }))
    .sort((a, b) => {
      // 首先按优先级排序，然后按路径排序
      if (Math.abs(a.priority - b.priority) > 0.1) {
        return b.priority - a.priority;
      }
      return a.relativePath.localeCompare(b.relativePath);
    });

  for (const file of sortedFiles) {
    if (file.symbols.length === 0) continue;

    const fileHeader = `${file.relativePath}:\n`;
    const fileHeaderTokens = Math.ceil(fileHeader.length / 4);

    if (currentTokens + fileHeaderTokens > maxTokens) break;

    result += fileHeader;
    currentTokens += fileHeaderTokens;

    // 过滤和去重符号 - 降低过滤阈值，HTML元素特殊处理
    let symbols = file.symbols
      .filter(s => {
        // HTML元素使用更低的阈值
        if (s.type === 'html_element') {
          return s.importance > 0.001;
        }
        return s.importance > 0.01;
      })
      .sort((a, b) => b.importance - a.importance);

    symbols = deduplicateSymbols(symbols);

    // 检查是否为HTML文件
    const isHtmlFile = file.relativePath.toLowerCase().endsWith('.html') || file.relativePath.toLowerCase().endsWith('.htm');

    let hasAddedContent = false;

    if (isHtmlFile) {
      // HTML文件特殊处理：直接显示树形结构
      const htmlElements = symbols.filter(s => s.type === 'html_element');

      for (const element of htmlElements) {
        const elementLine = `⋮...\n│${element.signature}\n`;
        const elementTokens = Math.ceil(elementLine.length / 4);

        if (currentTokens + elementTokens > maxTokens) break;
        result += elementLine;
        currentTokens += elementTokens;
        hasAddedContent = true;
      }
    } else {
      // 非HTML文件：分组显示：类/接口 -> 函数 -> 其他
      const classes = symbols.filter(s => s.type === 'class' || s.type === 'interface');
      const functions = symbols.filter(s => s.type === 'function' && !classes.some(c => c.name === s.name));
      const others = symbols.filter(s => !classes.includes(s) && !functions.includes(s));

      // 先显示类/接口及其方法
      for (const classSymbol of classes) {
        const cleanSignature = generateCleanSignature(classSymbol);
        const symbolLine = `⋮...\n│${cleanSignature}\n`;
        const symbolTokens = Math.ceil(symbolLine.length / 4);

        if (currentTokens + symbolTokens > maxTokens) break;
        result += symbolLine;
        currentTokens += symbolTokens;
        hasAddedContent = true;

        // 查找该类的所有方法和构造函数
        // 优化：通过解析类签名来确定哪些方法属于这个类
        const classSignature = classSymbol.signature;
        const classMethodNames = new Set<string>();

        // 从类签名中提取方法名
        if (classSignature.includes('{') && classSignature.includes('}')) {
          const methodMatches = classSignature.match(/(\w+)\([^)]*\)\s*\{\s*\}/g);
          if (methodMatches) {
            methodMatches.forEach(match => {
              const methodName = match.match(/^(\w+)\(/)?.[1];
              if (methodName) {
                classMethodNames.add(methodName);
              }
            });
          }
        }

        const classMethods = symbols.filter(s => {
          // 只包含在类签名中明确定义的方法
          if (s.type === 'function' && classMethodNames.has(s.name)) {
            return true;
          }

          // 对于方法类型，需要更严格的检查
          if (s.type === 'method') {
            return classMethodNames.has(s.name);
          }

          return false;
        }).slice(0, 8); // 每个类最多显示8个方法

        for (const method of classMethods) {
          const cleanMethodSignature = generateCleanSignature(method);
          const methodLine = `    │  ${cleanMethodSignature}\n`;
          const methodTokens = Math.ceil(methodLine.length / 4);

          if (currentTokens + methodTokens > maxTokens) break;
          result += methodLine;
          currentTokens += methodTokens;
        }

        // 从functions中移除已显示的方法
        classMethods.forEach(method => {
          const index = functions.indexOf(method);
          if (index > -1) functions.splice(index, 1);
        });
      }

      // 显示剩余的独立函数
      for (const func of functions.slice(0, 5)) { // 限制显示数量
        const cleanSignature = generateCleanSignature(func);
        const symbolLine = `⋮...\n│${cleanSignature}\n`;
        const symbolTokens = Math.ceil(symbolLine.length / 4);

        if (currentTokens + symbolTokens > maxTokens) break;
        result += symbolLine;
        currentTokens += symbolTokens;
        hasAddedContent = true;
      }

      // 显示其他重要符号
      for (const other of others.slice(0, 2)) { // 限制其他符号
        const cleanSignature = generateCleanSignature(other);
        const symbolLine = `⋮...\n│${cleanSignature}\n`;
        const symbolTokens = Math.ceil(symbolLine.length / 4);

        if (currentTokens + symbolTokens > maxTokens) break;
        result += symbolLine;
        currentTokens += symbolTokens;
        hasAddedContent = true;
      }
    }

    if (hasAddedContent) {
      result += '\n';
      currentTokens += 1;
    }
  }

  return result.trim();
}

/**
 * 递归扫描目录中的所有代码文件
 */
async function scanDirectory(dirPath: string, options: RepoMapOptions): Promise<string[]> {
  const files: string[] = [];

  async function scan(currentPath: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          // 跳过不需要处理的目录
          if (shouldProcessFile(entry.name)) {
            await scan(fullPath);
          }
        } else if (entry.isFile()) {
          // 只处理代码文件
          const ext = path.extname(entry.name).toLowerCase();
          const supportedExtensions = [
            // JavaScript/TypeScript
            '.js', '.ts', '.jsx', '.tsx',
            // Python
            '.py',
            // Java/Kotlin
            '.java', '.kt', '.kts',
            // C/C++
            '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp',
            // Go
            '.go',
            // Rust
            '.rs',
            // Swift
            '.swift',
            // C#
            '.cs',
            // Scala
            '.scala',
            // Ruby
            '.rb',
            // PHP
            '.php',
            // Lua
            '.lua',
            // Shell
            '.sh', '.bash',
            // Configuration files
            '.json', '.yaml', '.yml', '.toml',
            // Web
            '.html', '.htm', '.vue'
          ];

          if (supportedExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      logger.warn(`无法读取目录 ${currentPath}:`, error);
    }
  }

  await scan(dirPath);
  return files;
}

/**
 * 生成仓库地图
 */
export async function generateRepoMap(
  rootPath: string,
  options: Partial<RepoMapOptions> = {}
): Promise<RepoMapResult> {
  const opts: RepoMapOptions = {
    maxTokens: 1024,
    includeTypes: true,
    includeVariables: false,
    minImportance: 0.5,
    ...options,
    rootPath,
  };

  logger.info(`开始生成 repo map: ${rootPath}`);

  // 1. 扫描所有代码文件
  const filePaths = await scanDirectory(rootPath, opts);
  logger.info(`找到 ${filePaths.length} 个代码文件`);

  // 2. 解析每个文件
  const repoMapFiles: RepoMapFile[] = [];

  for (const filePath of filePaths) {
    try {
      const relativePath = path.relative(rootPath, filePath);
      const code = await fs.promises.readFile(filePath, 'utf-8');
      const { imports, exports } = extractImportsExports(code);

      // 使用现有的解析器
      const codeNodes = await parseCodeFile(filePath);

      const symbols: RepoMapSymbol[] = codeNodes.map(node => {
        const details = parseSymbolDetails(node.signature);
        return {
          name: extractSymbolName(node.signature),
          type: detectSymbolType(node.signature),
          signature: node.signature,
          line: 1, // 暂时设为1，实际可以从AST中获取
          importance: 0, // 稍后计算
          modifiers: details.modifiers,
          returnType: details.returnType,
          parameters: details.parameters,
        };
      });

      repoMapFiles.push({
        filepath: filePath,
        relativePath,
        symbols,
        imports,
        exports,
      });
    } catch (error) {
      logger.warn(`解析文件失败 ${filePath}:`, error);
    }
  }

  // 3. 计算依赖图和PageRank
  const pageRanks = buildDependencyGraph(repoMapFiles);

  // 4. 计算符号重要性
  repoMapFiles.forEach(file => {
    const fileImportance = pageRanks.get(file.relativePath) || 1.0;
    file.symbols.forEach(symbol => {
      const baseImportance = calculateImportance(symbol, file, repoMapFiles);
      symbol.importance = baseImportance * fileImportance;
    });
  });

  // 5. 生成格式化的地图
  const map = formatRepoMap(repoMapFiles, opts.maxTokens || 1024);
  const totalSymbols = repoMapFiles.reduce((sum, file) => sum + file.symbols.length, 0);
  const estimatedTokens = Math.ceil(map.length / 4);

  logger.info(`生成完成: ${totalSymbols} 个符号, 预估 ${estimatedTokens} tokens`);

  return {
    files: repoMapFiles,
    totalSymbols,
    estimatedTokens,
    map,
  };
}

/**
 * 检测符号类型
 */
function detectSymbolType(signature: string): RepoMapSymbol['type'] {
  const sig = signature.trim().toLowerCase();

  // HTML 元素检测（检查树形符号）
  if ((sig.includes('├─') || sig.includes('html') || sig.includes('body') || sig.includes('head')) &&
    !sig.includes('(') && !sig.includes('class ') && !sig.includes('function ')) return 'html_element';

  // 类相关
  if (sig.includes('class ')) return 'class';
  if (sig.includes('interface ')) return 'interface';
  if (sig.includes('enum ')) return 'enum';
  if (sig.includes('type ')) return 'type';

  // 构造函数
  if (sig.includes('constructor') || sig.includes('__init__')) return 'constructor';

  // 静态方法
  if (sig.includes('static ') && (sig.includes('(') || sig.includes('function'))) return 'static_method';

  // 异步函数
  if (sig.includes('async ') && (sig.includes('(') || sig.includes('function'))) return 'async_function';

  // getter/setter
  if (sig.includes('get ') && sig.includes('(')) return 'getter';
  if (sig.includes('set ') && sig.includes('(')) return 'setter';

  // 函数/方法
  if (sig.includes('function ') || sig.includes('func ') ||
    sig.includes('def ') || sig.includes('(')) {
    // 判断是否为方法（在类内部）
    if (sig.includes('public ') || sig.includes('private ') || sig.includes('protected ') ||
      signature.includes('    ') || signature.includes('\t')) { // 缩进表示在类内部
      return 'method';
    }
    return 'function';
  }

  // 常量
  if (sig.includes('const ') || sig.includes('final ') ||
    sig.includes('readonly ') || sig.match(/^[A-Z_][A-Z0-9_]*$/)) {
    return 'constant';
  }

  // 属性
  if (sig.includes('property') || sig.includes('var ') ||
    sig.includes('let ') || sig.includes('val ')) {
    return 'property';
  }

  return 'variable';
}

/**
 * 解析符号的修饰符、返回类型和参数
 */
function parseSymbolDetails(signature: string): {
  modifiers: string[];
  returnType?: string;
  parameters?: string[];
} {
  const modifiers: string[] = [];
  let returnType: string | undefined;
  let parameters: string[] | undefined;

  // 提取修饰符
  const modifierPatterns = [
    'public', 'private', 'protected', 'static', 'final', 'abstract',
    'async', 'readonly', 'const', 'export', 'default', 'override'
  ];

  for (const modifier of modifierPatterns) {
    if (signature.toLowerCase().includes(modifier)) {
      modifiers.push(modifier);
    }
  }

  // 提取参数（简化版）
  const paramMatch = signature.match(/\(([^)]*)\)/);
  if (paramMatch) {
    const paramStr = paramMatch[1].trim();
    if (paramStr) {
      parameters = paramStr.split(',').map(p => p.trim());
    }
  }

  // 提取返回类型（简化版 - TypeScript/Java风格）
  const returnTypeMatch = signature.match(/:\s*([^{;]+)/);
  if (returnTypeMatch) {
    returnType = returnTypeMatch[1].trim();
  }

  return { modifiers, returnType, parameters };
} 