/**
 * Unit tests for TypeScript Parser
 */

/// <reference types="jest" />

import * as fs from 'fs';
import * as path from 'path';
import { TypeScriptParser } from '../parser/typescript-parser';
import { FunctionType, CallType } from '../core/types';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('TypeScriptParser', () => {
  let parser: TypeScriptParser;

  beforeEach(() => {
    parser = new TypeScriptParser();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      // Mock Tree-sitter initialization
      await expect(parser.initialize()).resolves.not.toThrow();
    });
  });

  describe('parseFile', () => {
    const mockFilePath = '/test/file.ts';

    beforeEach(() => {
      mockFs.statSync.mockReturnValue({ size: 1000 } as fs.Stats);
    });

    it('should parse a simple function declaration', async () => {
      const mockContent = `
        function testFunction(param1: string, param2: number): void {
          console.log(param1, param2);
        }
      `;
      
      mockFs.readFileSync.mockReturnValue(mockContent);
      
      const result = await parser.parseFile(mockFilePath);
      
      expect(result.filePath).toBe(mockFilePath);
      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].name).toBe('testFunction');
      expect(result.functions[0].type).toBe(FunctionType.FUNCTION);
      expect(result.functions[0].parameters).toHaveLength(2);
    });

    it('should parse arrow functions', async () => {
      const mockContent = `
        const arrowFunc = (x: number) => {
          return x * 2;
        };
      `;
      
      mockFs.readFileSync.mockReturnValue(mockContent);
      
      const result = await parser.parseFile(mockFilePath);
      
      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].name).toBe('arrowFunc');
      expect(result.functions[0].type).toBe(FunctionType.ARROW_FUNCTION);
    });

    it('should parse class methods', async () => {
      const mockContent = `
        class TestClass {
          public method1(): void {
            this.method2();
          }
          
          private method2(): string {
            return "test";
          }
        }
      `;
      
      mockFs.readFileSync.mockReturnValue(mockContent);
      
      const result = await parser.parseFile(mockFilePath);
      
      expect(result.functions).toHaveLength(2);
      expect(result.functions[0].type).toBe(FunctionType.METHOD);
      expect(result.functions[0].className).toBe('TestClass');
    });

    it('should parse function calls', async () => {
      const mockContent = `
        function caller() {
          callee();
          obj.method();
          new Constructor();
        }
        
        function callee() {
          return true;
        }
      `;
      
      mockFs.readFileSync.mockReturnValue(mockContent);
      
      const result = await parser.parseFile(mockFilePath);
      
      expect(result.calls).toHaveLength(3);
      expect(result.calls[0].functionName).toBe('callee');
      expect(result.calls[0].callType).toBe(CallType.DIRECT);
      expect(result.calls[1].callType).toBe(CallType.METHOD);
      expect(result.calls[2].callType).toBe(CallType.CONSTRUCTOR);
    });

    it('should handle async functions', async () => {
      const mockContent = `
        async function asyncFunc(): Promise<void> {
          await someAsyncCall();
        }
      `;
      
      mockFs.readFileSync.mockReturnValue(mockContent);
      
      const result = await parser.parseFile(mockFilePath);
      
      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].isAsync).toBe(true);
      expect(result.functions[0].type).toBe(FunctionType.ASYNC_FUNCTION);
    });

    it('should handle exported functions', async () => {
      const mockContent = `
        export function exportedFunc(): void {
          // implementation
        }
        
        export default function defaultFunc(): void {
          // implementation
        }
      `;
      
      mockFs.readFileSync.mockReturnValue(mockContent);
      
      const result = await parser.parseFile(mockFilePath);
      
      expect(result.functions).toHaveLength(2);
      expect(result.functions[0].isExported).toBe(true);
      expect(result.functions[1].isExported).toBe(true);
    });

    it('should handle file size limit', async () => {
      mockFs.statSync.mockReturnValue({ size: 2000000 } as fs.Stats); // 2MB
      
      const result = await parser.parseFile(mockFilePath);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('exceeds maximum limit');
    });

    it('should handle parse errors gracefully', async () => {
      const mockContent = `
        function invalidSyntax( {
          // missing closing parenthesis
        }
      `;
      
      mockFs.readFileSync.mockReturnValue(mockContent);
      
      const result = await parser.parseFile(mockFilePath);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe('warning');
    });

    it('should filter out built-in function calls', async () => {
      const mockContent = `
        function testFunc() {
          console.log("test");
          parseInt("123");
          JSON.stringify({});
        }
      `;
      
      mockFs.readFileSync.mockReturnValue(mockContent);
      
      const result = await parser.parseFile(mockFilePath);
      
      // Should not include built-in function calls
      expect(result.calls).toHaveLength(0);
    });
  });

  describe('isSupportedFile', () => {
    it('should support TypeScript files', () => {
      expect(TypeScriptParser.isSupportedFile('test.ts')).toBe(true);
      expect(TypeScriptParser.isSupportedFile('test.tsx')).toBe(true);
    });

    it('should support JavaScript files', () => {
      expect(TypeScriptParser.isSupportedFile('test.js')).toBe(true);
      expect(TypeScriptParser.isSupportedFile('test.jsx')).toBe(true);
    });

    it('should not support other file types', () => {
      expect(TypeScriptParser.isSupportedFile('test.py')).toBe(false);
      expect(TypeScriptParser.isSupportedFile('test.java')).toBe(false);
      expect(TypeScriptParser.isSupportedFile('test.txt')).toBe(false);
    });
  });

  describe('parameter extraction', () => {
    it('should extract function parameters correctly', async () => {
      const mockContent = `
        function testFunc(
          param1: string,
          param2?: number,
          param3: boolean = true
        ): void {
          // implementation
        }
      `;
      
      mockFs.readFileSync.mockReturnValue(mockContent);
      mockFs.statSync.mockReturnValue({ size: 1000 } as fs.Stats);
      
      const result = await parser.parseFile('/test/file.ts');
      
      expect(result.functions[0].parameters).toHaveLength(3);
      expect(result.functions[0].parameters[0].name).toBe('param1');
      expect(result.functions[0].parameters[0].type).toBe('string');
      expect(result.functions[0].parameters[0].isOptional).toBe(false);
      
      expect(result.functions[0].parameters[1].name).toBe('param2');
      expect(result.functions[0].parameters[1].isOptional).toBe(true);
      
      expect(result.functions[0].parameters[2].name).toBe('param3');
      expect(result.functions[0].parameters[2].defaultValue).toBe('true');
    });
  });

  describe('chained calls', () => {
    it('should detect chained method calls', async () => {
      const mockContent = `
        function testFunc() {
          obj.method1().method2().method3();
        }
      `;
      
      mockFs.readFileSync.mockReturnValue(mockContent);
      mockFs.statSync.mockReturnValue({ size: 1000 } as fs.Stats);
      
      const result = await parser.parseFile('/test/file.ts');
      
      const chainedCalls = result.calls.filter(call => call.isChained);
      expect(chainedCalls.length).toBeGreaterThan(0);
    });
  });
});