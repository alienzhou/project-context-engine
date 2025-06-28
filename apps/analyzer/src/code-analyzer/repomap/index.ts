import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseCodeFile } from '../parser';
import Logger from '../../utils/log';
import { shouldProcessFile } from '../../utils/fs';

const logger = Logger('repo-map');

export interface RepoMapSymbol {
  name: string;
  type: 'class' | 'function' | 'interface' | 'method' | 'variable' | 'type' | 'constructor' | 'property' | 'enum' | 'constant' | 'static_method' | 'async_function' | 'getter' | 'setter' | 'html_element' | 'separator';
  signature: string;
  line: number;
  endLine?: number; // End line number
  importance: number;
  modifiers?: string[]; // e.g., ['static', 'async', 'private', 'readonly']
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
  language?: string;
  rootPath: string;
}

export interface RepoMapResult {
  files: RepoMapFile[];
  totalSymbols: number;
  estimatedTokens: number;
  map: string;
}

/**
 * Extract imports and exports information from code
 */
function extractImportsExports(code: string): { imports: string[], exports: string[] } {
  const imports: string[] = [];
  const exports: string[] = [];

  // Match import statements
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }

  // Match export statements
  const exportRegex = /export\s+(?:default\s+)?(?:class|function|interface|type|const|let|var)\s+(\w+)/g;
  while ((match = exportRegex.exec(code)) !== null) {
    exports.push(match[1]);
  }

  // Match export { ... } statements
  const namedExportRegex = /export\s+\{([^}]+)\}/g;
  while ((match = namedExportRegex.exec(code)) !== null) {
    const namedExports = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
    exports.push(...namedExports);
  }

  return { imports, exports };
}

/**
 * Calculate symbol importance score
 */
function calculateImportance(
  symbol: RepoMapSymbol,
  fileInfo: RepoMapFile,
  allFiles: RepoMapFile[]
): number {
  let score = 0;

  // Base score - assign weights based on symbol type
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
    'separator': 100, // Give high score to ensure not filtered out
  };

  score += typeScores[symbol.type] || 4;

  // Modifier bonus
  if (symbol.modifiers) {
    if (symbol.modifiers.includes('export')) score += 5;
    if (symbol.modifiers.includes('public')) score += 2;
    if (symbol.modifiers.includes('static')) score += 3;
    if (symbol.modifiers.includes('async')) score += 2;
    if (symbol.modifiers.includes('abstract')) score += 3;
    if (symbol.modifiers.includes('override')) score += 2;
  }

  // Exported symbols are more important
  if (fileInfo.exports.includes(symbol.name)) {
    score += 8;
  }

  // Symbols referenced by other files are more important
  const referencedByCount = allFiles.filter(f =>
    f.imports.some(imp => imp.includes(fileInfo.relativePath.replace(/\.[^.]+$/, '')))
  ).length;
  score += referencedByCount * 2;

  // Name pattern bonus (common important patterns)
  const name = symbol.name.toLowerCase();
  if (name.includes('main') || name.includes('init') || name.includes('setup')) score += 3;
  if (name.includes('config') || name.includes('setting')) score += 2;
  if (name.includes('util') || name.includes('helper')) score += 1;
  if (name.includes('test') || name.includes('spec')) score -= 2; // Test code downweight

  // Parameter complexity bonus
  if (symbol.parameters && symbol.parameters.length > 0) {
    score += Math.min(symbol.parameters.length * 0.5, 3);
  }

  return Math.max(score, 0);
}

/**
 * Build dependency graph and calculate PageRank
 */
function buildDependencyGraph(files: RepoMapFile[]): Map<string, number> {
  const graph = new Map<string, string[]>();
  const pageRank = new Map<string, number>();

  // Initialize graph
  files.forEach(file => {
    graph.set(file.relativePath, []);
    pageRank.set(file.relativePath, 1.0);
  });

  // Build dependency relationships
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

  // Simplified PageRank algorithm
  const dampingFactor = 0.85;
  const iterations = 10;

  for (let i = 0; i < iterations; i++) {
    const newRanks = new Map<string, number>();

    files.forEach(file => {
      let rank = (1 - dampingFactor) / files.length;

      // Calculate contributions from other nodes
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
 * Get icon for symbol type
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
    'separator': '📝',
  };
  return icons[type] || '❓';
}

/**
 * Generate clean symbol signature (show only declaration, not method body)
 */
function generateCleanSignature(symbol: RepoMapSymbol): string {
  const signature = symbol.signature;
  const icon = getSymbolIcon(symbol.type);
  let cleanSig = '';

  // For separators: Use signature directly
  if (symbol.type === 'separator') {
    cleanSig = signature.trim();
  }

  // For HTML elements: Use signature directly
  else if (symbol.type === 'html_element') {
    cleanSig = signature.trim();
  }

  // For classes: Use only class declaration line
  if (symbol.type === 'class') {
    const lines = signature.split('\n');
    const classLine = lines.find(line => line.trim().startsWith('class ') || line.trim().includes('class '));
    if (classLine) {
      cleanSig = classLine.trim() + ' { }';
    }
  }

  // For interfaces: Use only interface declaration line
  else if (symbol.type === 'interface') {
    const lines = signature.split('\n');
    const interfaceLine = lines.find(line => line.trim().startsWith('interface '));
    if (interfaceLine) {
      cleanSig = interfaceLine.trim() + ' { }';
    }
  }

  // For enums: Use only enum declaration line
  else if (symbol.type === 'enum') {
    const lines = signature.split('\n');
    const enumLine = lines.find(line => line.trim().startsWith('enum '));
    if (enumLine) {
      cleanSig = enumLine.trim() + ' { }';
    }
  }

  // For functions/methods: Extract function declaration
  else if (['function', 'method', 'async_function', 'static_method', 'constructor', 'getter', 'setter'].includes(symbol.type)) {
    // Go function format: func (receiver) FunctionName(params) returnType
    if (signature.includes('func ')) {
      const match = signature.match(/func\s+(?:\([^)]*\)\s+)?(\w+)\([^)]*\)(?:\s+[^{]*)?/);
      if (match) {
        cleanSig = match[0].trim() + ' { }';
      }
    }
    // Java/Kotlin method format
    else {
      const lines = signature.split('\n');
      const firstLine = lines[0].trim();

      // If first line contains method declaration, use it
      if (firstLine.includes('(') && firstLine.includes(')')) {
        // Remove possible modifier prefixes, keep core signature
        let cleanLine = firstLine.replace(/^\s*(public|private|protected|static|final|override|suspend)\s+/g, '');
        if (cleanLine.includes('{')) {
          cleanSig = cleanLine.split('{')[0].trim() + ' { }';
        } else {
          cleanSig = cleanLine + ' { }';
        }
      }
      // TypeScript/JavaScript function
      else {
        const tsMatch = signature.match(/(function\s+\w+\([^)]*\)|\w+\s*\([^)]*\)\s*=>|\w+\s*\([^)]*\))/);
        if (tsMatch) {
          cleanSig = tsMatch[0].trim() + ' { }';
        }
      }
    }
  }

  // Default case: Return first line
  if (!cleanSig) {
    cleanSig = signature.split('\n')[0].trim() + (signature.split('\n').length > 1 ? ' { }' : '');
  }

  // Add modifier marker
  let modifierStr = '';
  if (symbol.modifiers && symbol.modifiers.length > 0) {
    const importantModifiers = symbol.modifiers.filter(m =>
      ['export', 'static', 'async', 'abstract', 'readonly'].includes(m)
    );
    if (importantModifiers.length > 0) {
      modifierStr = ` [${importantModifiers.join(', ')}]`;
    }
  }

  // Add line range information
  let lineRangeStr = '';
  if (symbol.line > 0) {
    if (symbol.endLine && symbol.endLine !== symbol.line) {
      lineRangeStr = ` [L${symbol.line}-${symbol.endLine}]`;
    } else {
      lineRangeStr = ` [L${symbol.line}]`;
    }
  }

  return `${icon} ${cleanSig}${modifierStr}${lineRangeStr}`;
}

/**
 * Extract symbol name from function signature
 */
function extractSymbolName(signature: string): string {
  // Improved regular expression matching, supporting more language patterns

  // HTML element: Extract tag name
  if (signature.includes('├─') || signature.includes('html')) {
    // Extract tag name (remove tree symbol and attributes)
    const match = signature.match(/(?:├─\s*)?(\w+)(?:\s*\[.*\])?/);
    if (match) {
      return match[1];
    }
    return 'html';
  }

  // Go: func (receiver) FunctionName or func FunctionName
  let match = signature.match(/func\s+(?:\([^)]*\)\s+)?(\w+)/);
  if (match) return match[1];

  // Java/Kotlin/C#: class ClassName or interface InterfaceName
  match = signature.match(/(?:class|interface|struct|enum)\s+(\w+)/);
  if (match) return match[1];

  // Method/function: methodName( or function functionName
  match = signature.match(/(?:function\s+)?(\w+)\s*\(/);
  if (match) return match[1];

  // Type definition: type TypeName
  match = signature.match(/type\s+(\w+)/);
  if (match) return match[1];

  // Variable/constant: var/const/let varName
  match = signature.match(/(?:var|const|let)\s+(\w+)/);
  if (match) return match[1];

  return 'unknown';
}

/**
 * Check if symbol is a constructor
 */
function isConstructor(symbol: RepoMapSymbol): boolean {
  const signature = symbol.signature.toLowerCase();
  return signature.includes('constructor') ||
    (symbol.type === 'function' && symbol.name === extractSymbolName(symbol.signature));
}

/**
 * Deduplicate symbols (C++ etc. may have duplicate function declarations and definitions)
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
 * Calculate file priority
 */
function calculateFilePriority(file: RepoMapFile): number {
  let priority = 0;

  // Path-based priority
  const path = file.relativePath.toLowerCase();

  // Downweight test files
  if (path.includes('test') || path.includes('spec') || path.includes('__test__')) {
    priority -= 10;
  }

  // Downweight configuration files
  if (path.includes('config') || path.includes('.json') || path.includes('.yaml')) {
    priority -= 5;
  }

  // Upweight core business files
  if (path.includes('src/') || path.includes('lib/') || path.includes('core/')) {
    priority += 5;
  }

  // Upweight entry files
  if (path.includes('index') || path.includes('main') || path.includes('app')) {
    priority += 8;
  }

  // Symbol quantity and importance priority
  const totalImportance = file.symbols.reduce((sum, symbol) => sum + symbol.importance, 0);
  priority += Math.min(totalImportance / 10, 20); // Maximum add 20 points

  // Export quantity priority
  priority += Math.min(file.exports.length * 2, 10); // Maximum add 10 points

  return priority;
}

/**
 * Generate formatted repo map string
 */
function formatRepoMap(files: RepoMapFile[], maxTokens: number): string {
  let result = '';
  let currentTokens = 0;

  // Filter out empty files, calculate priority and sort
  const sortedFiles = files
    .filter(file => file.symbols.length > 0)
    .map(file => ({
      ...file,
      priority: calculateFilePriority(file)
    }))
    .sort((a, b) => {
      // First sort by priority, then by path
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

    // Filter and deduplicate symbols - lower filter threshold, HTML elements and separators special handling
    let symbols = file.symbols
      .filter(s => {
        // Separators always kept
        if (s.type === 'separator') {
          return true;
        }
        // HTML elements use lower threshold
        if (s.type === 'html_element') {
          return s.importance > 0.001;
        }
        return s.importance > 0.01;
      })
      .sort((a, b) => b.importance - a.importance);

    symbols = deduplicateSymbols(symbols);

    // Check if HTML file
    const isHtmlFile = file.relativePath.toLowerCase().endsWith('.html') || file.relativePath.toLowerCase().endsWith('.htm');

    let hasAddedContent = false;

    if (isHtmlFile) {
      // HTML file special handling: Display tree structure directly
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
      // Non-HTML file: Group display: Class/Interface -> Function -> Separator -> Other
      const classes = symbols.filter(s => s.type === 'class' || s.type === 'interface');
      const functions = symbols.filter(s => s.type === 'function' && !classes.some(c => c.name === s.name));
      const separators = symbols.filter(s => s.type === 'separator');
      const others = symbols.filter(s => !classes.includes(s) && !functions.includes(s) && !separators.includes(s));

      // First display Class/Interface and its methods
      for (const classSymbol of classes) {
        const cleanSignature = generateCleanSignature(classSymbol);
        const symbolLine = `⋮...\n│${cleanSignature}\n`;
        const symbolTokens = Math.ceil(symbolLine.length / 4);

        if (currentTokens + symbolTokens > maxTokens) break;
        result += symbolLine;
        currentTokens += symbolTokens;
        hasAddedContent = true;

        // Find all methods and constructors of this class
        // Optimization: Determine which methods belong to this class by parsing class signature
        const classSignature = classSymbol.signature;
        const classMethodNames = new Set<string>();

        // Extract method names from class signature
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
          // Only include methods explicitly defined in class signature
          if (s.type === 'function' && classMethodNames.has(s.name)) {
            return true;
          }

          // For method types, need stricter check
          if (s.type === 'method') {
            return classMethodNames.has(s.name);
          }

          return false;
        }).slice(0, 8); // Maximum 8 methods per class

        for (const method of classMethods) {
          const cleanMethodSignature = generateCleanSignature(method);
          const methodLine = `    │  ${cleanMethodSignature}\n`;
          const methodTokens = Math.ceil(methodLine.length / 4);

          if (currentTokens + methodTokens > maxTokens) break;
          result += methodLine;
          currentTokens += methodTokens;
        }

        // Remove displayed methods from functions
        classMethods.forEach(method => {
          const index = functions.indexOf(method);
          if (index > -1) functions.splice(index, 1);
        });
      }

      // Display remaining independent functions
      for (const func of functions.slice(0, 5)) { // Limit display quantity
        const cleanSignature = generateCleanSignature(func);
        const symbolLine = `⋮...\n│${cleanSignature}\n`;
        const symbolTokens = Math.ceil(symbolLine.length / 4);

        if (currentTokens + symbolTokens > maxTokens) break;
        result += symbolLine;
        currentTokens += symbolTokens;
        hasAddedContent = true;
      }

      // Display separators (keep original order)
      for (const separator of separators) {
        const cleanSignature = generateCleanSignature(separator);
        const symbolLine = `⋮...\n│${cleanSignature}\n`;
        const symbolTokens = Math.ceil(symbolLine.length / 4);

        if (currentTokens + symbolTokens > maxTokens) break;
        result += symbolLine;
        currentTokens += symbolTokens;
        hasAddedContent = true;
      }

      // Display other important symbols
      for (const other of others.slice(0, 2)) { // Limit other symbols
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
 * Get file extensions for language
 */
function getLanguageExtensions(language: string): string[] {
  const languageExtensionMap: Record<string, string[]> = {
    'javascript': ['.js', '.mjs', '.cjs', '.jsx'],
    'typescript': ['.ts', '.tsx'],
    'python': ['.py', '.pyw'],
    'java': ['.java'],
    'kotlin': ['.kt', '.kts'],
    'cpp': ['.cpp', '.cc', '.cxx', '.c++', '.h', '.hpp', '.hxx'],
    'c': ['.c', '.h'],
    'go': ['.go'],
    'rust': ['.rs'],
    'swift': ['.swift'],
    'scala': ['.scala'],
    'csharp': ['.cs'],
    'ruby': ['.rb'],
    'php': ['.php'],
    'lua': ['.lua'],
    'bash': ['.sh', '.bash', '.zsh'],
    'html': ['.html', '.htm'],
    'css': ['.css', '.scss', '.sass'],
    'vue': ['.vue'],
    'json': ['.json'],
    'yaml': ['.yaml', '.yml'],
    'xml': ['.xml'],
  };

  return languageExtensionMap[language.toLowerCase()] || [];
}

/**
 * Check if file matches specified language
 */
function matchesLanguage(filePath: string, language?: string): boolean {
  if (!language) {
    return true; // If no language specified, match all files
  }

  const ext = path.extname(filePath).toLowerCase();
  const extensions = getLanguageExtensions(language);
  return extensions.includes(ext);
}

/**
 * Recursively scan all code files in directory
 */
async function scanDirectory(dirPath: string, options: RepoMapOptions): Promise<string[]> {
  const files: string[] = [];

  async function scan(currentPath: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          // Skip directories that don't need processing
          if (shouldProcessFile(entry.name)) {
            await scan(fullPath);
          }
        } else if (entry.isFile()) {
          // Only process code files
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

          if (supportedExtensions.includes(ext) && matchesLanguage(fullPath, options.language)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      logger.warn(`Cannot read directory ${currentPath}:`, error);
    }
  }

  await scan(dirPath);
  return files;
}

/**
 * Generate repository map
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

  logger.info(`Starting to generate repo map: ${rootPath}`);

  // 1. Scan all code files
  const filePaths = await scanDirectory(rootPath, opts);
  logger.info(`Found ${filePaths.length} code files`);

  // 2. Parse each file
  const repoMapFiles: RepoMapFile[] = [];

  for (const filePath of filePaths) {
    try {
      const relativePath = path.relative(rootPath, filePath);
      const code = await fs.promises.readFile(filePath, 'utf-8');
      const { imports, exports } = extractImportsExports(code);

      // Use existing parser
      const codeNodes = await parseCodeFile(filePath);

      const symbols: RepoMapSymbol[] = codeNodes.map(node => {
        const details = parseSymbolDetails(node.signature);
        return {
          name: extractSymbolName(node.signature),
          type: detectSymbolType(node.signature),
          signature: node.signature,
          line: node.startLine || 1,
          endLine: node.endLine,
          importance: 0, // Calculate later
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
      logger.warn(`Failed to parse file ${filePath}:`, error);
    }
  }

  // 3. Calculate dependency graph and PageRank
  const pageRanks = buildDependencyGraph(repoMapFiles);

  // 4. Calculate symbol importance
  repoMapFiles.forEach(file => {
    const fileImportance = pageRanks.get(file.relativePath) || 1.0;
    file.symbols.forEach(symbol => {
      const baseImportance = calculateImportance(symbol, file, repoMapFiles);
      symbol.importance = baseImportance * fileImportance;
    });
  });

  // 5. Generate formatted map
  const map = formatRepoMap(repoMapFiles, opts.maxTokens || 1024);
  const totalSymbols = repoMapFiles.reduce((sum, file) => sum + file.symbols.length, 0);
  const estimatedTokens = Math.ceil(map.length / 4);

  logger.info(`Generation completed: ${totalSymbols} symbols, estimated ${estimatedTokens} tokens`);

  return {
    files: repoMapFiles,
    totalSymbols,
    estimatedTokens,
    map,
  };
}

/**
 * Detect symbol type
 */
function detectSymbolType(signature: string): RepoMapSymbol['type'] {
  const sig = signature.trim().toLowerCase();

  // Separator detection
  if (sig.includes('--- template ---') || sig.includes('---') && sig.includes('template')) return 'separator';

  // HTML element detection (check tree symbol)
  if ((sig.includes('├─') || sig.includes('html') || sig.includes('body') || sig.includes('head')) &&
    !sig.includes('(') && !sig.includes('class ') && !sig.includes('function ')) return 'html_element';

  // Class related
  if (sig.includes('class ')) return 'class';
  if (sig.includes('interface ')) return 'interface';
  if (sig.includes('enum ')) return 'enum';
  if (sig.includes('type ')) return 'type';

  // Constructor
  if (sig.includes('constructor') || sig.includes('__init__')) return 'constructor';

  // Static method
  if (sig.includes('static ') && (sig.includes('(') || sig.includes('function'))) return 'static_method';

  // Async function
  if (sig.includes('async ') && (sig.includes('(') || sig.includes('function'))) return 'async_function';

  // getter/setter
  if (sig.includes('get ') && sig.includes('(')) return 'getter';
  if (sig.includes('set ') && sig.includes('(')) return 'setter';

  // Function/method
  if (sig.includes('function ') || sig.includes('func ') ||
    sig.includes('def ') || sig.includes('(')) {
    // Check if method (inside class)
    if (sig.includes('public ') || sig.includes('private ') || sig.includes('protected ') ||
      signature.includes('    ') || signature.includes('\t')) { // Indentation indicates inside class
      return 'method';
    }
    return 'function';
  }

  // Constant
  if (sig.includes('const ') || sig.includes('final ') ||
    sig.includes('readonly ') || sig.match(/^[A-Z_][A-Z0-9_]*$/)) {
    return 'constant';
  }

  // Property
  if (sig.includes('property') || sig.includes('var ') ||
    sig.includes('let ') || sig.includes('val ')) {
    return 'property';
  }

  return 'variable';
}

/**
 * Parse symbol modifiers, return type and parameters
 */
function parseSymbolDetails(signature: string): {
  modifiers: string[];
  returnType?: string;
  parameters?: string[];
} {
  const modifiers: string[] = [];
  let returnType: string | undefined;
  let parameters: string[] | undefined;

  // Extract modifiers
  const modifierPatterns = [
    'public', 'private', 'protected', 'static', 'final', 'abstract',
    'async', 'readonly', 'const', 'export', 'default', 'override'
  ];

  for (const modifier of modifierPatterns) {
    if (signature.toLowerCase().includes(modifier)) {
      modifiers.push(modifier);
    }
  }

  // Extract parameters (simplified version)
  const paramMatch = signature.match(/\(([^)]*)\)/);
  if (paramMatch) {
    const paramStr = paramMatch[1].trim();
    if (paramStr) {
      parameters = paramStr.split(',').map(p => p.trim());
    }
  }

  // Extract return type (simplified version - TypeScript/Java style)
  const returnTypeMatch = signature.match(/:\s*([^{;]+)/);
  if (returnTypeMatch) {
    returnType = returnTypeMatch[1].trim();
  }

  return { modifiers, returnType, parameters };
} 