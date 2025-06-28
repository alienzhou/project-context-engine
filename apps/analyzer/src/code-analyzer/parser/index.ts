import * as fs from 'fs';
import * as path from 'path';
import Parser from 'web-tree-sitter';
import Logger from '../../utils/log';
import { type CodeNodeInfo } from '../type';

type CodeNodeInfoWithoutFilepath = Omit<CodeNodeInfo, 'filePath'>;

// Create a logger with module name 'code-parser'
const logger = Logger('code-parser');

// Language to Tree-sitter grammar mapping
const languageMap: Record<string, string> = {
  // JavaScript/TypeScript ecosystem
  'js': 'javascript',
  'mjs': 'javascript',
  'cjs': 'javascript',
  'ts': 'typescript',
  'jsx': 'javascript',
  'tsx': 'tsx',

  // Python
  'py': 'python',
  'pyw': 'python',

  // Java ecosystem
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

  // Other programming languages
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

  // Configuration files (fallback processing)
  'json': 'json',
  'yaml': 'yaml',
  'yml': 'yaml',
  'toml': 'toml',
  'xml': 'xml',

  // Web related
  'html': 'html',
  'htm': 'html',
  'css': 'css',
  'scss': 'css',
  'sass': 'css',
  'vue': 'vue',

  // Emerging languages
  'zig': 'zig',
  'dart': 'dart',
};

// Promise for Tree-sitter initialization
let parserInitPromise: Promise<void> | null = null;
// Cache for language parsers
const parsers: Record<string, Parser> = {};

/**
 * Initialize Tree-sitter parser
 */
async function initParser(): Promise<void> {
  if (parserInitPromise) {
    return parserInitPromise;
  }

  parserInitPromise = (async () => {
    try {
      // Initialize tree parser
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
 * Get language parser based on file extension
 */
// Language fallback mapping: if primary parser is unavailable, try compatible parsers
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
  'vue': ['javascript'], // Vue files fallback to JavaScript parser
};

async function getLanguageParser(extension: string): Promise<Parser | null> {
  // Ensure Parser is initialized
  await initParser();

  const ext = extension.toLowerCase().substring(1);
  const lang = languageMap[ext];

  if (!lang) {
    logger.warn(`Unsupported file extension: ${extension}`);
    return null;
  }

  // If parser is already cached, return it directly
  if (parsers[lang]) {
    return parsers[lang];
  }

  // Try loading primary parser
  const parser = await tryLoadParser(lang);
  if (parser) {
    return parser;
  }

  // Try fallback parsers
  const fallbacks = fallbackMap[lang] || [];
  for (const fallbackLang of fallbacks) {
    logger.info(`Trying fallback parser ${fallbackLang} for ${lang}`);
    const fallbackParser = await tryLoadParser(fallbackLang);
    if (fallbackParser) {
      // Cache fallback parser
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

    // Multi-path lookup strategy
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
 * Extract <script> and <template> content from Vue files
 */
function extractVueContent(vueContent: string): {
  script: string;
  lang: string;
  template: string;
  hasTemplate: boolean;
} {
  // Match <script> tag, supporting lang attribute
  const scriptRegex = /<script(?:\s+lang=["'](\w+)["'])?[^>]*>([\s\S]*?)<\/script>/i;
  const scriptMatch = vueContent.match(scriptRegex);

  // Match <template> tag
  const templateRegex = /<template[^>]*>([\s\S]*?)<\/template>/i;
  const templateMatch = vueContent.match(templateRegex);

  const script = scriptMatch ? scriptMatch[2] || '' : '';
  const lang = scriptMatch ? scriptMatch[1] || 'javascript' : 'javascript';
  const template = templateMatch ? templateMatch[1] || '' : '';
  const hasTemplate = !!templateMatch && template.trim().length > 0;

  return { script, lang, template, hasTemplate };
}

/**
 * HTML element information
 */
interface HtmlElement {
  tagName: string;
  hasId: boolean;
  hasClass: boolean;
  children: HtmlElement[];
  depth: number;
}

/**
 * Extract important tag structure from HTML files
 */
function extractHtmlElements(root: Parser.SyntaxNode): CodeNodeInfoWithoutFilepath[] {
  const elements: CodeNodeInfoWithoutFilepath[] = [];

  // Important semantic tags
  const importantTags = new Set([
    'html', 'head', 'body', 'header', 'nav', 'main', 'section', 'article',
    'aside', 'footer', 'div', 'form', 'table', 'ul', 'ol', 'li'
  ]);

  // Build HTML hierarchy structure and record node information
  function buildHtmlStructure(node: Parser.SyntaxNode, depth: number = 0): { element: HtmlElement; node: Parser.SyntaxNode } | null {
    if (node.type !== 'element') {
      return null;
    }

    // Get tag name
    const startTag = node.child(0);
    if (!startTag || startTag.type !== 'start_tag') {
      return null;
    }

    const tagNameNode = startTag.child(1);
    if (!tagNameNode || tagNameNode.type !== 'tag_name') {
      return null;
    }

    const tagName = tagNameNode.text.toLowerCase();

    // Check for id or class attributes
    const hasId = hasAttribute(startTag, 'id');
    const hasClass = hasAttribute(startTag, 'class');

    // Only include important tags or elements with important attributes
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

    // Process child elements recursively
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === 'element') {
        const childResult = buildHtmlStructure(child, depth + 1);
        if (childResult) {
          element.children.push(childResult.element);
        }
      }
    }

    return { element, node };
  }

  // Convert HTML structure to signature string, using smart filtering strategy
  function convertToSignatures(element: HtmlElement, depth: number = 0, parentNode?: Parser.SyntaxNode): void {
    // Build tree indentation, using spaces and symbols to represent hierarchy
    const indent = '  '.repeat(depth); // 2 spaces per level
    const treeSymbol = depth === 0 ? '' : '├─ '; // Tree connection symbol
    const signature = `${indent}${treeSymbol}${element.tagName}`;

    // Add attribute information (if has id or class)
    let attributeInfo = '';
    if (element.hasId || element.hasClass) {
      const attrs = [];
      if (element.hasId) attrs.push('id');
      if (element.hasClass) attrs.push('class');
      attributeInfo = ` [${attrs.join(', ')}]`;
    }

    const fullSignature = signature + attributeInfo;

    // Simplified HTML filtering logic: show more levels, focus on tree structure
    const shouldInclude = shouldIncludeHtmlElement(element, depth);

    if (shouldInclude) {
      const elementInfo: CodeNodeInfoWithoutFilepath = {
        fullText: fullSignature,
        signature: fullSignature
      };

      // If there's a parent node, try to get line number information
      if (parentNode) {
        elementInfo.startLine = parentNode.startPosition.row + 1;
        elementInfo.endLine = parentNode.endPosition.row + 1;
      }

      elements.push(elementInfo);
    }

    // Process child elements recursively, increase indentation level
    for (const child of element.children) {
      convertToSignatures(child, depth + 1, parentNode);
    }
  }

  // Special filtering function for HTML - More relaxed strategy to show tree structure
  function shouldIncludeHtmlElement(element: HtmlElement, depth: number): boolean {
    const tagName = element.tagName;

    // Limit maximum depth to 6 layers, avoid too deep nesting
    if (depth > 6) {
      return false;
    }

    // 1. Always include top-level structure tags
    if (['html', 'head', 'body'].includes(tagName)) {
      return true;
    }

    // 2. Include important semantic tags (regardless of level)
    const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'];
    if (semanticTags.includes(tagName)) {
      return true;
    }

    // 3. Include elements with id (these are usually important)
    if (element.hasId) {
      return true;
    }

    // 4. Include elements with class (these are usually important)
    if (element.hasClass) {
      return true;
    }

    // 5. Form related elements
    if (['form', 'table', 'ul', 'ol', 'li'].includes(tagName)) {
      return true;
    }

    // 6. Common important tags
    const commonTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'input', 'select'];
    if (commonTags.includes(tagName)) {
      return true;
    }

    // 7. div element in shallow display
    if (tagName === 'div' && depth <= 4) {
      return true;
    }

    // 8. Default not included
    return false;
  }

  // Determine whether to include this element
  function shouldIncludeElement(element: HtmlElement, path: string[]): boolean {
    const depth = path.length;
    const tagName = element.tagName;

    // Limit maximum depth to 10 layers, avoid too deep nesting
    if (depth > 10) {
      return false;
    }

    // 1. Always include top-level structure tags
    if (['html', 'head', 'body'].includes(tagName)) {
      return true;
    }

    // 2. Include important semantic tags (regardless of level)
    const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'];
    if (semanticTags.includes(tagName)) {
      return true;
    }

    // 3. Include elements with id (these are usually important)
    if (element.hasId) {
      return true;
    }

    // 4. For div, relax restrictions
    if (tagName === 'div') {
      // div with class or id in depth 8 layers
      if (element.hasClass || element.hasId) {
        return depth <= 8;
      }
      // Normal div in depth 5 layers
      return depth <= 5;
    }

    // 5. Form related elements, relax restrictions
    if (['form', 'table', 'ul', 'ol', 'li'].includes(tagName)) {
      return depth <= 8;
    }

    // 6. Other elements with class in depth 7 layers
    if (element.hasClass) {
      return depth <= 7;
    }

    // 7. Common important tags
    const commonTags = ['a', 'button', 'input', 'select', 'textarea', 'img', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    if (commonTags.includes(tagName)) {
      return depth <= 6;
    }

    // 8. Default not included
    return false;
  }

  // Only process top-level document elements, avoid repetition
  function processTopLevelElements(node: Parser.SyntaxNode): void {
    // Directly find html element as root node
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === 'element') {
        const result = buildHtmlStructure(child);
        if (result) {
          convertToSignatures(result.element, 0, result.node);
          return; // Only process the first top-level element (usually html)
        }
      }
    }
  }

  processTopLevelElements(root);
  return elements;
}

/**
 * Check if tag has specified attribute
 */
function hasAttribute(startTag: Parser.SyntaxNode, attributeName: string): boolean {
  for (let i = 0; i < startTag.childCount; i++) {
    const child = startTag.child(i);
    if (child && child.type === 'attribute') {
      // HTML attribute structure is usually: attribute_name="attribute_value"
      const nameNode = child.child(0); // First child node is attribute name
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
 * Check if tag has important attributes (id or class)
 */
function hasImportantAttributes(startTag: Parser.SyntaxNode): boolean {
  return hasAttribute(startTag, 'id') || hasAttribute(startTag, 'class');
}

/**
 * Extract tag attributes
 */
function extractAttributes(startTag: Parser.SyntaxNode): { id?: string; class?: string;[key: string]: string | undefined } {
  const attributes: { id?: string; class?: string;[key: string]: string | undefined } = {};

  for (let i = 0; i < startTag.childCount; i++) {
    const child = startTag.child(i);
    if (child && child.type === 'attribute') {
      // HTML attribute structure: attribute_name="attribute_value" or attribute_name='attribute_value'
      const nameNode = child.child(0); // Attribute name
      const valueNode = child.child(2); // Attribute value (skip = symbol)

      if (nameNode && nameNode.type === 'attribute_name' && valueNode && valueNode.type === 'quoted_attribute_value') {
        const attrName = nameNode.text.toLowerCase();

        // Find actual attribute value in quoted_attribute_value
        const actualValueNode = valueNode.child(1); // Middle child node is attribute_value
        let attrValue = actualValueNode ? actualValueNode.text : valueNode.text;

        // If no child node is found, remove quotes
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
 * Extract methods from Vue component object
 */
function extractVueComponentMethods(objectNode: Parser.SyntaxNode, snippets: CodeNodeInfoWithoutFilepath[]): void {
  for (let i = 0; i < objectNode.childCount; i++) {
    const child = objectNode.child(i);
    if (!child) continue;

    // Process direct method definition (e.g., data(), mounted() etc.)
    if (child.type === 'method_definition') {
      const nameNode = child.childForFieldName('name');
      const paramsNode = child.childForFieldName('parameters');

      if (nameNode && paramsNode) {
        const methodName = nameNode.text;
        const signature = `${methodName}${paramsNode.text} { }`;
        const fullText = child.text;

        snippets.push({
          fullText,
          signature,
          startLine: child.startPosition.row + 1,
          endLine: child.endPosition.row + 1
        });
      }
      continue;
    }

    if (child.type !== 'pair') continue;

    // Check if it's methods property
    const keyNode = child.childForFieldName('key');
    const valueNode = child.childForFieldName('value');

    if (keyNode && valueNode &&
      (keyNode.text === 'methods' || keyNode.text === '"methods"' || keyNode.text === "'methods'")) {

      // Iterate through all methods in methods object
      if (valueNode.type === 'object') {
        for (let j = 0; j < valueNode.childCount; j++) {
          const methodChild = valueNode.child(j);
          if (!methodChild) continue;

          // Process direct method definition (methods in Vue methods)
          if (methodChild.type === 'method_definition') {
            const nameNode = methodChild.childForFieldName('name');
            const paramsNode = methodChild.childForFieldName('parameters');

            if (nameNode && paramsNode) {
              const methodName = nameNode.text;
              const signature = `${methodName}${paramsNode.text} { }`;
              const fullText = methodChild.text;

              snippets.push({
                fullText,
                signature,
                startLine: methodChild.startPosition.row + 1,
                endLine: methodChild.endPosition.row + 1
              });
            }
            continue;
          }

          // Process pair type methods (function expression form)
          if (methodChild.type === 'pair') {
            const methodKeyNode = methodChild.childForFieldName('key');
            const methodValueNode = methodChild.childForFieldName('value');

            if (methodKeyNode && methodValueNode &&
              (methodValueNode.type === 'function' || methodValueNode.type === 'arrow_function')) {

              // Extract method name
              const methodName = methodKeyNode.text.replace(/['"]/g, '');

              // Create method signature
              const paramsNode = methodValueNode.childForFieldName('parameters');
              const paramsText = paramsNode ? paramsNode.text : '()';

              const signature = `${methodName}${paramsText} { }`;
              const fullText = methodValueNode.text;

              snippets.push({
                fullText,
                signature,
                startLine: methodValueNode.startPosition.row + 1,
                endLine: methodValueNode.endPosition.row + 1
              });
            }
          }
        }
      }
    }

    // Check other lifecycle hooks and computed properties
    if (keyNode && valueNode) {
      const key = keyNode.text.replace(/['"]/g, '');

      // Vue lifecycle hooks
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
            signature,
            startLine: valueNode.startPosition.row + 1,
            endLine: valueNode.endPosition.row + 1
          });
        } else if (key === 'computed' && valueNode.type === 'object') {
          // Process computed properties
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
                signature,
                startLine: computedValueNode.startPosition.row + 1,
                endLine: computedValueNode.endPosition.row + 1
              });
            }
          }
        }
      }
    }
  }
}

/**
 * Extract methods and functions from class
 */
function extractMethodsFromClass(classNode: Parser.SyntaxNode, snippets: CodeNodeInfoWithoutFilepath[]): void {
  // Recursively search all child nodes of the class
  function searchNode(node: Parser.SyntaxNode): void {
    // Check if current node is method or function
    const isMethod = [
      // Java
      'method_declaration', 'constructor_declaration',
      // Kotlin
      'function_declaration', 'property_declaration',
      // C++
      'function_definition', 'function_declarator',
      // JavaScript/TypeScript (class methods)
      'method_definition',
      // Other common types
      'function_declaration'
    ].includes(node.type);

    if (isMethod) {
      processFunction(node, snippets);
    }

    // Recursively search child nodes, but do not enter nested class definitions
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type !== 'class_declaration' && child.type !== 'class_specifier') {
        searchNode(child);
      }
    }
  }

  // Find class body node
  const bodyNode = classNode.childForFieldName('body') || classNode.children.find(c => c.type === 'class_body');

  if (bodyNode) {
    // Directly iterate through method definitions in class body
    for (let i = 0; i < bodyNode.childCount; i++) {
      const child = bodyNode.child(i);
      if (!child) continue;

      if (child.type === 'method_definition') {
        processFunction(child, snippets);
      } else {
        // Recursively search other possible nodes containing methods
        searchNode(child);
      }
    }
  } else {
    // If no class body is found, use original recursive search
    searchNode(classNode);
  }
}

/**
 * Extract function/method declaration from syntax tree
 */
function extractCodeSnippets(root: Parser.SyntaxNode): CodeNodeInfoWithoutFilepath[] {
  const snippets: CodeNodeInfoWithoutFilepath[] = [];

  // Recursively process node - Support preprocessor block etc. nested structures
  function processNode(node: Parser.SyntaxNode): void {
    // Check if node type is related to function/method definition type
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

    // Check if it's preprocessor block or other container node
    const isContainer = [
      'preproc_ifdef', 'preproc_if', 'preproc_ifndef', 'namespace_definition', 'linkage_specifier'
    ].includes(node.type);

    // Check if it's export declaration (possibly containing function definition)
    const isExport = node.type === 'export_statement';

    if (isFunctionLike) {
      processFunction(node, snippets);

      // If it's class declaration, recursively search class internal methods
      if (node.type === 'class_declaration' || node.type === 'class_specifier') {
        extractMethodsFromClass(node, snippets);
      }
    } else if (isContainer) {
      // Recursively process nodes inside container
      for (let j = 0; j < node.childCount; j++) {
        const child = node.child(j);
        if (child) {
          processNode(child);
        }
      }
    } else if (isExport) {
      // Process exported function declaration
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

          // If it's exported class, also extract class methods
          if (exportedNode.type === 'class_declaration') {
            extractMethodsFromClass(exportedNode, snippets);
          }
        }

        // Directly check if it's object literal (Vue component)
        if (exportedNode.type === 'object') {
          extractVueComponentMethods(exportedNode, snippets);
        }

        // Process default declaration in export declaration
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

              // If it's default exported class, also extract class methods
              if (defaultNode.type === 'class_declaration') {
                extractMethodsFromClass(defaultNode, snippets);
              }
            } else if (defaultNode.type === 'object') {
              // Process Vue component export default {} syntax
              extractVueComponentMethods(defaultNode, snippets);
            }
          }
        }
      }
    } else if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
      // Process function expression declared through const/let/var
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

  // Iterate through all child nodes of syntax tree
  for (let i = 0; i < root.childCount; i++) {
    const node = root.child(i);
    if (node) {
      processNode(node);
    }
  }

  return snippets;
}

/**
 * Process function node, extract its text and signature
 */
function processFunction(node: Parser.SyntaxNode, snippets: CodeNodeInfoWithoutFilepath[], nameOverride?: string): void {
  // Get complete function/method text
  const fullText = node.text;

  // Extract function/method signature
  let signature = '';

  // Extract signature based on different node types
  if (node.type === 'function_declaration') {
    // Find function body start position
    const bodyNode = node.childForFieldName('body');
    if (bodyNode) {
      // Find function name and parameters
      const nameNode = node.childForFieldName('name');
      const paramsNode = node.childForFieldName('parameters');

      if (nameNode && paramsNode) {
        // Directly build signature, ensure including function name and parameters
        signature = `function ${nameNode.text}${paramsNode.text} { }`;
      } else {
        // If cannot get name or parameters, fall back to simple text extraction
        signature = fullText.substring(0, bodyNode.startPosition.column - node.startPosition.column) + ' { }';
      }
    }
  } else if (node.type === 'method_definition' || node.type === 'method_declaration') {
    // Find method body start position
    const bodyNode = node.childForFieldName('body');
    if (bodyNode) {
      // Find method name and parameters
      const nameNode = node.childForFieldName('name');
      const paramsNode = node.childForFieldName('parameters');
      if (nameNode && paramsNode) {
        // Directly build signature, ensure including method name and parameters
        signature = `${nameNode.text}${paramsNode.text} { }`;
      } else {
        // If cannot get name or parameters, fall back to simple text extraction
        signature = fullText.substring(0, bodyNode.startPosition.column - node.startPosition.column) + ' { }';
      }
    }
  } else if (node.type === 'arrow_function') {
    // For arrow function, use nameOverride if provided
    if (nameOverride) {
      const paramsText = node.childForFieldName('parameters')?.text || '()';
      signature = `${nameOverride} = ${paramsText} => { }`;
    } else {
      // Find arrow function parameters
      const paramsNode = node.childForFieldName('parameters');
      if (paramsNode) {
        signature = `${paramsNode.text} => { }`;
      } else {
        // If cannot get parameters, fall back to simple text extraction
        const arrowPos = fullText.indexOf('=>');
        if (arrowPos !== -1) {
          signature = fullText.substring(0, arrowPos + 2) + ' { }';
        }
      }
    }
  } else if (node.type === 'function') {
    // For function expression, use nameOverride if provided
    if (nameOverride) {
      const paramsText = node.childForFieldName('parameters')?.text || '()';
      signature = `${nameOverride} = function${paramsText} { }`;
    } else {
      // Find function name (if any) and parameters
      const nameNode = node.childForFieldName('name');
      const paramsNode = node.childForFieldName('parameters');

      if (paramsNode) {
        const nameText = nameNode ? nameNode.text : '';
        signature = `function ${nameText}${paramsNode.text} { }`;
      } else {
        // If cannot get parameters, fall back to simple text extraction
        const bodyNode = node.childForFieldName('body');
        if (bodyNode) {
          signature = fullText.substring(0, bodyNode.startPosition.column - node.startPosition.column) + ' { }';
        }
      }
    }
  } else if (node.type === 'class_declaration') {
    // For class declaration, extract class signature and its method signatures
    const bodyNode = node.childForFieldName('body');
    const nameNode = node.childForFieldName('name');

    if (nameNode && bodyNode) {
      // First create class basic signature
      let classSignature = `class ${nameNode.text} {`;

      // Iterate through all child nodes in class body, find method definitions
      const methodSignatures: string[] = [];
      for (let i = 0; i < bodyNode.childCount; i++) {
        const child = bodyNode.child(i);
        if (!child) continue;
        if (child.type === 'method_definition') {
          // For each method, extract its signature
          const methodNameNode = child.childForFieldName('name');
          const methodParamsNode = child.childForFieldName('parameters');

          if (methodNameNode && methodParamsNode) {
            // Build method signature
            methodSignatures.push(`  ${methodNameNode.text}${methodParamsNode.text} { }`);
          }
        } else if (child.type === 'public_field_definition') {
          // Process public fields in class
          const fieldNameNode = child.childForFieldName('name');
          if (fieldNameNode) {
            methodSignatures.push(`  ${fieldNameNode.text};`);
          }
        }
      }

      // Merge all method signatures into class signature
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

  // If cannot extract signature, use full text
  if (!signature) {
    signature = fullText;
  }

  snippets.push({
    fullText,
    signature,
    startLine: node.startPosition.row + 1, // Tree-sitter uses 0-based row numbers
    endLine: node.endPosition.row + 1
  });
}

/**
 * Parse code file into method snippets
 * 
 * @param filePath File path
 * @returns Array of code snippet information
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

    // Special handling for Vue files
    if (ext.toLowerCase() === '.vue') {
      const { script, lang, template, hasTemplate } = extractVueContent(fileContent);
      const snippets: CodeNodeInfo[] = [];

      // Process script section
      if (script.trim()) {
        // Determine actual language type based on script tag's lang attribute
        const scriptExt = lang === 'ts' || lang === 'typescript' ? '.ts' : '.js';
        const parser = await getLanguageParser(scriptExt);

        if (parser) {
          const tree = parser.parse(script);
          const scriptSnippets = extractCodeSnippets(tree.rootNode);
          snippets.push(...scriptSnippets.map(s => ({ ...s, filePath })));
          logger.info(`Extracted ${lang} script from Vue file: ${filePath}`);
        }
      }

      // Add separator between script and template
      if (script.trim() && hasTemplate) {
        snippets.push({
          fullText: '--- Template ---',
          signature: '--- Template ---',
          filePath,
          startLine: 1,
          endLine: 1
        });
      }

      // Process template section
      if (hasTemplate) {
        const htmlParser = await getLanguageParser('.html');
        if (htmlParser) {
          // Wrap template content in complete HTML document for parsing
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

    // Special handling for HTML files
    if (ext.toLowerCase() === '.html' || ext.toLowerCase() === '.htm') {
      const parser = await getLanguageParser(actualExt);
      if (!parser) {
        logger.warn(`No HTML parser available for file: ${filePath}`);
        return [];
      }

      // Parse HTML content
      const tree = parser.parse(fileContent);

      // Extract HTML element structure
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

    // Parse code content
    const tree = parser.parse(fileContent);

    // Extract code snippets
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
