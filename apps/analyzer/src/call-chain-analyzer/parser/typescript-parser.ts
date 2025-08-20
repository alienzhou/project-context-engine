/**
 * TypeScript Parser for Call Chain Analysis
 * 
 * This module provides specialized parsing functionality for extracting
 * function definitions and calls from TypeScript/JavaScript files.
 */

import * as fs from 'fs';
import * as path from 'path';
import Parser from 'web-tree-sitter';
import { nanoid } from 'nanoid';

import Logger from '../../utils/log';
import {
  FunctionDefinition,
  FunctionCall,
  FileAnalysisResult,
  FunctionType,
  CallType,
  Parameter,
  ImportStatement,
  ExportStatement,
  ImportType,
  ExportType,
  ParseError
} from '../core/types';
import {
  FUNCTION_NODE_TYPES,
  CALL_NODE_TYPES,
  IMPORT_NODE_TYPES,
  EXPORT_NODE_TYPES,
  TYPESCRIPT_EXTENSIONS,
  JAVASCRIPT_EXTENSIONS,
  EXCLUDED_FUNCTION_PATTERNS,
  BUILTIN_FUNCTIONS,
  MAX_FILE_SIZE
} from '../core/constants';

const logger = Logger('typescript-parser');

/**
 * TypeScript Parser class for call chain analysis
 */
export class TypeScriptParser {
  private parser: Parser | null = null;
  private initialized = false;

  /**
   * Initialize the parser with Tree-sitter
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await Parser.init();
      this.parser = new Parser();

      // Try to load TypeScript parser first, fallback to JavaScript
      const language = await this.loadLanguage();
      this.parser.setLanguage(language);
      
      this.initialized = true;
      logger.info('TypeScript parser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize TypeScript parser', { error });
      throw error;
    }
  }

  /**
   * Load Tree-sitter language for TypeScript/JavaScript
   */
  private async loadLanguage(): Promise<Parser.Language> {
    const possiblePaths = [
      path.resolve(__dirname, '../../../node_modules/tree-sitter-wasms/out/tree-sitter-typescript.wasm'),
      path.resolve(__dirname, '../../../../node_modules/tree-sitter-wasms/out/tree-sitter-typescript.wasm'),
      path.resolve(process.cwd(), 'node_modules/tree-sitter-wasms/out/tree-sitter-typescript.wasm'),
    ];

    // Try TypeScript parser first
    for (const wasmPath of possiblePaths) {
      if (fs.existsSync(wasmPath)) {
        try {
          const language = await Parser.Language.load(wasmPath);
          logger.info(`Loaded TypeScript parser from ${wasmPath}`);
          return language;
        } catch (error) {
          logger.warn(`Failed to load TypeScript parser from ${wasmPath}`, { error });
        }
      }
    }

    // Fallback to JavaScript parser
    const jsPaths = possiblePaths.map(p => p.replace('typescript', 'javascript'));
    for (const wasmPath of jsPaths) {
      if (fs.existsSync(wasmPath)) {
        try {
          const language = await Parser.Language.load(wasmPath);
          logger.info(`Loaded JavaScript parser as fallback from ${wasmPath}`);
          return language;
        } catch (error) {
          logger.warn(`Failed to load JavaScript parser from ${wasmPath}`, { error });
        }
      }
    }

    throw new Error('No TypeScript or JavaScript parser available');
  }

  /**
   * Parse a TypeScript/JavaScript file and extract function definitions and calls
   */
  async parseFile(filePath: string): Promise<FileAnalysisResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.parser) {
      throw new Error('Parser not initialized');
    }

    const result: FileAnalysisResult = {
      filePath,
      functions: [],
      calls: [],
      imports: [],
      exports: [],
      errors: []
    };

    try {
      // Check file size
      const stats = fs.statSync(filePath);
      if (stats.size > MAX_FILE_SIZE) {
        result.errors.push({
          message: `File size ${stats.size} exceeds maximum limit ${MAX_FILE_SIZE}`,
          line: 0,
          column: 0,
          severity: 'error'
        });
        return result;
      }

      // Read file content
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Parse with Tree-sitter
      const tree = this.parser.parse(content);
      
      if (tree.rootNode.hasError) {
        result.errors.push({
          message: 'Syntax errors found in file',
          line: 0,
          column: 0,
          severity: 'warning'
        });
      }

      // Extract different types of nodes
      this.extractFunctions(tree.rootNode, result);
      this.extractCalls(tree.rootNode, result);
      this.extractImports(tree.rootNode, result);
      this.extractExports(tree.rootNode, result);

      logger.info(`Parsed ${filePath}: ${result.functions.length} functions, ${result.calls.length} calls`);
      
    } catch (error) {
      logger.error(`Error parsing file ${filePath}`, { error });
      result.errors.push({
        message: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        line: 0,
        column: 0,
        severity: 'error'
      });
    }

    return result;
  }

  /**
   * Extract function definitions from AST
   */
  private extractFunctions(node: Parser.SyntaxNode, result: FileAnalysisResult): void {
    this.traverseNode(node, (currentNode) => {
      if (FUNCTION_NODE_TYPES.includes(currentNode.type)) {
        const functionDef = this.parseFunctionDefinition(currentNode);
        if (functionDef) {
          result.functions.push(functionDef);
        }
      }
    });
  }

  /**
   * Extract function calls from AST
   */
  private extractCalls(node: Parser.SyntaxNode, result: FileAnalysisResult): void {
    this.traverseNode(node, (currentNode) => {
      if (CALL_NODE_TYPES.includes(currentNode.type)) {
        const call = this.parseFunctionCall(currentNode, result.functions);
        if (call) {
          result.calls.push(call);
        }
      }
    });
  }

  /**
   * Extract import statements from AST
   */
  private extractImports(node: Parser.SyntaxNode, result: FileAnalysisResult): void {
    this.traverseNode(node, (currentNode) => {
      if (IMPORT_NODE_TYPES.includes(currentNode.type)) {
        const importStmt = this.parseImportStatement(currentNode);
        if (importStmt) {
          result.imports.push(importStmt);
        }
      }
    });
  }

  /**
   * Extract export statements from AST
   */
  private extractExports(node: Parser.SyntaxNode, result: FileAnalysisResult): void {
    this.traverseNode(node, (currentNode) => {
      if (EXPORT_NODE_TYPES.includes(currentNode.type)) {
        const exportStmt = this.parseExportStatement(currentNode);
        if (exportStmt) {
          result.exports.push(exportStmt);
        }
      }
    });
  }

  /**
   * Parse function definition from AST node
   */
  private parseFunctionDefinition(node: Parser.SyntaxNode): FunctionDefinition | null {
    try {
      const nameNode = node.childForFieldName('name');
      const parametersNode = node.childForFieldName('parameters');
      
      // Handle different function types
      let name = '';
      let type = FunctionType.FUNCTION;
      let isAsync = false;
      let isStatic = false;
      let isExported = false;

      // Extract function name
      if (nameNode) {
        name = nameNode.text;
      } else if (node.type === 'arrow_function') {
        // For arrow functions, try to get name from parent assignment
        const parent = node.parent;
        if (parent && parent.type === 'variable_declarator') {
          const idNode = parent.childForFieldName('name');
          if (idNode) {
            name = idNode.text;
          }
        }
        type = FunctionType.ARROW_FUNCTION;
      }

      // Skip if no name found
      if (!name) {
        return null;
      }

      // Check for async modifier
      if (node.text.includes('async ')) {
        isAsync = true;
        type = FunctionType.ASYNC_FUNCTION;
      }

      // Check for static modifier (for class methods)
      if (node.text.includes('static ')) {
        isStatic = true;
      }

      // Determine function type based on node type
      switch (node.type) {
        case 'method_definition':
          type = FunctionType.METHOD;
          break;
        case 'arrow_function':
          type = FunctionType.ARROW_FUNCTION;
          break;
        case 'constructor_definition':
          type = FunctionType.CONSTRUCTOR;
          break;
        case 'get_method_definition':
          type = FunctionType.GETTER;
          break;
        case 'set_method_definition':
          type = FunctionType.SETTER;
          break;
        case 'generator_function_declaration':
          type = FunctionType.GENERATOR;
          break;
      }

      // Extract parameters
      const parameters = this.extractParameters(parametersNode);

      // Check if function is exported
      let current = node.parent;
      while (current) {
        if (current.type === 'export_statement' || current.type === 'export_declaration') {
          isExported = true;
          break;
        }
        current = current.parent;
      }

      return {
        id: nanoid(),
        name,
        filePath: '', // Will be set by caller
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        type,
        isExported,
        isAsync,
        isStatic,
        parameters
      };

    } catch (error) {
      logger.warn(`Error parsing function definition`, { error, nodeType: node.type });
      return null;
    }
  }

  /**
   * Parse function call from AST node
   */
  private parseFunctionCall(node: Parser.SyntaxNode, functions: FunctionDefinition[]): FunctionCall | null {
    try {
      let functionName = '';
      let callType = CallType.DIRECT;
      const args: string[] = [];

      // Extract function name based on call type
      if (node.type === 'call_expression') {
        const functionNode = node.childForFieldName('function');
        if (functionNode) {
          if (functionNode.type === 'member_expression') {
            // Method call: obj.method()
            const propertyNode = functionNode.childForFieldName('property');
            if (propertyNode) {
              functionName = propertyNode.text;
              callType = CallType.METHOD;
            }
          } else if (functionNode.type === 'identifier') {
            // Direct function call: func()
            functionName = functionNode.text;
            callType = CallType.DIRECT;
          }
        }
      } else if (node.type === 'new_expression') {
        // Constructor call: new Class()
        const constructorNode = node.childForFieldName('constructor');
        if (constructorNode) {
          functionName = constructorNode.text;
          callType = CallType.CONSTRUCTOR;
        }
      }

      // Skip if no function name or if it's a built-in function
      if (!functionName || BUILTIN_FUNCTIONS.has(functionName)) {
        return null;
      }

      // Skip if function name matches excluded patterns
      if (EXCLUDED_FUNCTION_PATTERNS.some(pattern => pattern.test(functionName))) {
        return null;
      }

      // Extract arguments
      const argumentsNode = node.childForFieldName('arguments');
      if (argumentsNode) {
        for (let i = 0; i < argumentsNode.childCount; i++) {
          const arg = argumentsNode.child(i);
          if (arg && arg.type !== ',' && arg.type !== '(' && arg.type !== ')') {
            args.push(arg.text);
          }
        }
      }

      // Find the containing function
      let callerFunctionId = '';
      let current = node.parent;
      while (current) {
        if (FUNCTION_NODE_TYPES.includes(current.type)) {
          // Find matching function definition
          const matchingFunc = functions.find(f => 
            f.startLine <= current!.startPosition.row + 1 && 
            f.endLine >= current!.endPosition.row + 1
          );
          if (matchingFunc) {
            callerFunctionId = matchingFunc.id;
          }
          break;
        }
        current = current.parent;
      }

      return {
        id: nanoid(),
        functionName,
        filePath: '', // Will be set by caller
        line: node.startPosition.row + 1,
        column: node.startPosition.column,
        callerFunctionId,
        callType,
        arguments: args,
        isChained: this.isChainedCall(node)
      };

    } catch (error) {
      logger.warn(`Error parsing function call`, { error, nodeType: node.type });
      return null;
    }
  }

  /**
   * Extract parameters from parameters node
   */
  private extractParameters(parametersNode: Parser.SyntaxNode | null): Parameter[] {
    if (!parametersNode) {
      return [];
    }

    const parameters: Parameter[] = [];
    
    for (let i = 0; i < parametersNode.childCount; i++) {
      const param = parametersNode.child(i);
      if (!param || param.type === ',' || param.type === '(' || param.type === ')') {
        continue;
      }

      let name = '';
      let type = '';
      let isOptional = false;
      let defaultValue = '';

      if (param.type === 'identifier') {
        name = param.text;
      } else if (param.type === 'required_parameter' || param.type === 'optional_parameter') {
        const nameNode = param.childForFieldName('pattern') || param.child(0);
        if (nameNode) {
          name = nameNode.text;
        }
        
        const typeNode = param.childForFieldName('type');
        if (typeNode) {
          type = typeNode.text;
        }

        isOptional = param.type === 'optional_parameter' || param.text.includes('?');
      }

      if (name) {
        parameters.push({
          name,
          type,
          isOptional,
          defaultValue
        });
      }
    }

    return parameters;
  }

  /**
   * Parse import statement
   */
  private parseImportStatement(node: Parser.SyntaxNode): ImportStatement | null {
    // Implementation for import parsing
    return null; // Placeholder
  }

  /**
   * Parse export statement
   */
  private parseExportStatement(node: Parser.SyntaxNode): ExportStatement | null {
    // Implementation for export parsing
    return null; // Placeholder
  }

  /**
   * Check if a call is part of a method chain
   */
  private isChainedCall(node: Parser.SyntaxNode): boolean {
    const parent = node.parent;
    return parent?.type === 'member_expression' || false;
  }

  /**
   * Traverse AST nodes recursively
   */
  private traverseNode(node: Parser.SyntaxNode, callback: (node: Parser.SyntaxNode) => void): void {
    callback(node);
    
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        this.traverseNode(child, callback);
      }
    }
  }

  /**
   * Check if file is supported
   */
  static isSupportedFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return [...TYPESCRIPT_EXTENSIONS, ...JAVASCRIPT_EXTENSIONS].includes(ext);
  }
}