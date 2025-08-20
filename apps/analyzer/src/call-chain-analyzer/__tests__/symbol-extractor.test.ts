/**
 * Unit tests for Symbol Extractor
 */

/// <reference types="jest" />

import { SymbolExtractor } from '../resolver/symbol-extractor';
import { 
  FunctionDefinition, 
  FunctionCall, 
  FileAnalysisResult,
  FunctionType,
  CallType 
} from '../core/types';

describe('SymbolExtractor', () => {
  let extractor: SymbolExtractor;
  let mockFileResults: FileAnalysisResult[];

  beforeEach(() => {
    extractor = new SymbolExtractor();
    
    // Create mock file analysis results
    mockFileResults = [
      {
        filePath: '/src/file1.ts',
        functions: [
          {
            id: 'func1',
            name: 'function1',
            filePath: '/src/file1.ts',
            startLine: 1,
            endLine: 5,
            type: FunctionType.FUNCTION,
            isExported: true,
            isAsync: false,
            isStatic: false,
            parameters: []
          },
          {
            id: 'func2',
            name: 'function2',
            filePath: '/src/file1.ts',
            startLine: 7,
            endLine: 12,
            type: FunctionType.FUNCTION,
            isExported: false,
            isAsync: false,
            isStatic: false,
            parameters: []
          }
        ],
        calls: [
          {
            id: 'call1',
            functionName: 'function2',
            filePath: '/src/file1.ts',
            line: 3,
            column: 5,
            callerFunctionId: 'func1',
            callType: CallType.DIRECT,
            arguments: [],
            isChained: false
          }
        ],
        imports: [],
        exports: [],
        errors: []
      },
      {
        filePath: '/src/file2.ts',
        functions: [
          {
            id: 'func3',
            name: 'ClassA',
            filePath: '/src/file2.ts',
            startLine: 1,
            endLine: 10,
            type: FunctionType.METHOD,
            isExported: true,
            isAsync: false,
            isStatic: false,
            parameters: [],
            className: 'ClassA'
          }
        ],
        calls: [],
        imports: [],
        exports: [],
        errors: []
      }
    ];
  });

  describe('extractSymbols', () => {
    it('should extract symbols from file results', () => {
      const symbolIndex = extractor.extractSymbols(mockFileResults);
      
      expect(symbolIndex.byId.size).toBe(3);
      expect(symbolIndex.byFile.size).toBe(2);
      expect(symbolIndex.byName.size).toBe(3);
      expect(symbolIndex.byClass.size).toBe(1);
    });

    it('should index functions by name correctly', () => {
      const symbolIndex = extractor.extractSymbols(mockFileResults);
      
      const function1Defs = symbolIndex.byName.get('function1');
      expect(function1Defs).toHaveLength(1);
      expect(function1Defs![0].id).toBe('func1');
    });

    it('should index functions by file correctly', () => {
      const symbolIndex = extractor.extractSymbols(mockFileResults);
      
      const file1Functions = symbolIndex.byFile.get('/src/file1.ts');
      expect(file1Functions).toHaveLength(2);
      expect(file1Functions![0].name).toBe('function1');
      expect(file1Functions![1].name).toBe('function2');
    });

    it('should index methods by class correctly', () => {
      const symbolIndex = extractor.extractSymbols(mockFileResults);
      
      const classAMethods = symbolIndex.byClass.get('ClassA');
      expect(classAMethods).toHaveLength(1);
      expect(classAMethods![0].id).toBe('func3');
    });
  });

  describe('findFunctionsByName', () => {
    beforeEach(() => {
      extractor.extractSymbols(mockFileResults);
    });

    it('should find functions by name', () => {
      const functions = extractor.findFunctionsByName('function1');
      expect(functions).toHaveLength(1);
      expect(functions[0].id).toBe('func1');
    });

    it('should return empty array for non-existent function', () => {
      const functions = extractor.findFunctionsByName('nonExistent');
      expect(functions).toHaveLength(0);
    });
  });

  describe('findFunctionById', () => {
    beforeEach(() => {
      extractor.extractSymbols(mockFileResults);
    });

    it('should find function by ID', () => {
      const func = extractor.findFunctionById('func1');
      expect(func).toBeDefined();
      expect(func!.name).toBe('function1');
    });

    it('should return undefined for non-existent ID', () => {
      const func = extractor.findFunctionById('nonExistent');
      expect(func).toBeUndefined();
    });
  });

  describe('findFunctionsByFile', () => {
    beforeEach(() => {
      extractor.extractSymbols(mockFileResults);
    });

    it('should find functions by file path', () => {
      const functions = extractor.findFunctionsByFile('/src/file1.ts');
      expect(functions).toHaveLength(2);
    });

    it('should return empty array for non-existent file', () => {
      const functions = extractor.findFunctionsByFile('/src/nonExistent.ts');
      expect(functions).toHaveLength(0);
    });
  });

  describe('resolveFunctionCall', () => {
    beforeEach(() => {
      extractor.extractSymbols(mockFileResults);
    });

    it('should resolve function call to local function', () => {
      const call: FunctionCall = {
        id: 'call1',
        functionName: 'function2',
        filePath: '/src/file1.ts',
        line: 3,
        column: 5,
        callerFunctionId: 'func1',
        callType: CallType.DIRECT,
        arguments: [],
        isChained: false
      };

      const resolved = extractor.resolveFunctionCall(call, mockFileResults);
      expect(resolved).toBeDefined();
      expect(resolved!.name).toBe('function2');
    });

    it('should return null for unresolvable call', () => {
      const call: FunctionCall = {
        id: 'call2',
        functionName: 'nonExistentFunction',
        filePath: '/src/file1.ts',
        line: 3,
        column: 5,
        callerFunctionId: 'func1',
        callType: CallType.DIRECT,
        arguments: [],
        isChained: false
      };

      const resolved = extractor.resolveFunctionCall(call, mockFileResults);
      expect(resolved).toBeNull();
    });
  });

  describe('getExportedFunctions', () => {
    beforeEach(() => {
      extractor.extractSymbols(mockFileResults);
    });

    it('should return only exported functions', () => {
      const exported = extractor.getExportedFunctions('/src/file1.ts');
      expect(exported).toHaveLength(1);
      expect(exported[0].name).toBe('function1');
      expect(exported[0].isExported).toBe(true);
    });
  });

  describe('getStatistics', () => {
    beforeEach(() => {
      extractor.extractSymbols(mockFileResults);
    });

    it('should return correct statistics', () => {
      const stats = extractor.getStatistics();
      
      expect(stats.totalFunctions).toBe(3);
      expect(stats.totalFiles).toBe(2);
      expect(stats.functionsPerFile).toBe(1.5);
      expect(stats.exportedFunctions).toBe(2);
      expect(stats.classesWithMethods).toBe(1);
    });
  });

  describe('findCallers and findCallees', () => {
    let allCalls: FunctionCall[];

    beforeEach(() => {
      extractor.extractSymbols(mockFileResults);
      allCalls = mockFileResults.flatMap(result => result.calls);
    });

    it('should find callers of a function', () => {
      // Set up a call where func2 is called
      allCalls[0].calledFunctionId = 'func2';
      
      const callers = extractor.findCallers('func2', allCalls);
      expect(callers).toHaveLength(1);
      expect(callers[0].callerFunctionId).toBe('func1');
    });

    it('should find callees of a function', () => {
      const callees = extractor.findCallees('func1', allCalls);
      expect(callees).toHaveLength(1);
      expect(callees[0].functionName).toBe('function2');
    });
  });

  describe('isLeafFunction and isRootFunction', () => {
    let allCalls: FunctionCall[];

    beforeEach(() => {
      extractor.extractSymbols(mockFileResults);
      allCalls = mockFileResults.flatMap(result => result.calls);
      allCalls[0].calledFunctionId = 'func2';
    });

    it('should identify leaf functions', () => {
      const isLeaf = extractor.isLeafFunction('func2', allCalls);
      expect(isLeaf).toBe(true);
    });

    it('should identify root functions', () => {
      const isRoot = extractor.isRootFunction('func1', allCalls);
      expect(isRoot).toBe(true);
    });

    it('should identify non-leaf functions', () => {
      const isLeaf = extractor.isLeafFunction('func1', allCalls);
      expect(isLeaf).toBe(false);
    });

    it('should identify non-root functions', () => {
      const isRoot = extractor.isRootFunction('func2', allCalls);
      expect(isRoot).toBe(false);
    });
  });
});