/**
 * Unit tests for Call Chain Builder
 */

/// <reference types="jest" />

import { CallChainBuilder } from '../builder/call-chain-builder';
import { 
  FunctionDefinition, 
  FunctionCall, 
  SymbolIndex,
  AnalysisOptions,
  FunctionType,
  CallType 
} from '../core/types';
import { DEFAULT_ANALYSIS_OPTIONS } from '../core/constants';

describe('CallChainBuilder', () => {
  let builder: CallChainBuilder;
  let mockSymbolIndex: SymbolIndex;
  let mockCalls: FunctionCall[];
  let mockOptions: AnalysisOptions;

  beforeEach(() => {
    // Create mock functions
    const functions: FunctionDefinition[] = [
      {
        id: 'root1',
        name: 'rootFunction',
        filePath: '/src/root.ts',
        startLine: 1,
        endLine: 10,
        type: FunctionType.FUNCTION,
        isExported: true,
        isAsync: false,
        isStatic: false,
        parameters: []
      },
      {
        id: 'child1',
        name: 'childFunction1',
        filePath: '/src/child.ts',
        startLine: 1,
        endLine: 5,
        type: FunctionType.FUNCTION,
        isExported: false,
        isAsync: false,
        isStatic: false,
        parameters: []
      },
      {
        id: 'child2',
        name: 'childFunction2',
        filePath: '/src/child.ts',
        startLine: 7,
        endLine: 12,
        type: FunctionType.FUNCTION,
        isExported: false,
        isAsync: false,
        isStatic: false,
        parameters: []
      },
      {
        id: 'leaf1',
        name: 'leafFunction',
        filePath: '/src/leaf.ts',
        startLine: 1,
        endLine: 3,
        type: FunctionType.FUNCTION,
        isExported: false,
        isAsync: false,
        isStatic: false,
        parameters: []
      }
    ];

    // Create mock symbol index
    mockSymbolIndex = {
      byName: new Map([
        ['rootFunction', [functions[0]]],
        ['childFunction1', [functions[1]]],
        ['childFunction2', [functions[2]]],
        ['leafFunction', [functions[3]]]
      ]),
      byFile: new Map([
        ['/src/root.ts', [functions[0]]],
        ['/src/child.ts', [functions[1], functions[2]]],
        ['/src/leaf.ts', [functions[3]]]
      ]),
      byId: new Map([
        ['root1', functions[0]],
        ['child1', functions[1]],
        ['child2', functions[2]],
        ['leaf1', functions[3]]
      ]),
      byClass: new Map()
    };

    // Create mock function calls
    mockCalls = [
      {
        id: 'call1',
        functionName: 'childFunction1',
        filePath: '/src/root.ts',
        line: 5,
        column: 10,
        callerFunctionId: 'root1',
        calledFunctionId: 'child1',
        callType: CallType.DIRECT,
        arguments: [],
        isChained: false
      },
      {
        id: 'call2',
        functionName: 'childFunction2',
        filePath: '/src/root.ts',
        line: 7,
        column: 10,
        callerFunctionId: 'root1',
        calledFunctionId: 'child2',
        callType: CallType.DIRECT,
        arguments: [],
        isChained: false
      },
      {
        id: 'call3',
        functionName: 'leafFunction',
        filePath: '/src/child.ts',
        line: 3,
        column: 5,
        callerFunctionId: 'child1',
        calledFunctionId: 'leaf1',
        callType: CallType.DIRECT,
        arguments: [],
        isChained: false
      }
    ];

    mockOptions = { ...DEFAULT_ANALYSIS_OPTIONS, maxDepth: 5 };
    builder = new CallChainBuilder(mockSymbolIndex, mockCalls, mockOptions);
  });

  describe('buildCallChains', () => {
    it('should build call chains from root functions', () => {
      const callChains = builder.buildCallChains();
      
      expect(callChains).toHaveLength(1);
      expect(callChains[0].rootFunction.name).toBe('rootFunction');
      expect(callChains[0].depth).toBeGreaterThan(0);
    });

    it('should respect maximum depth limit', () => {
      const shallowOptions = { ...mockOptions, maxDepth: 1 };
      const shallowBuilder = new CallChainBuilder(mockSymbolIndex, mockCalls, shallowOptions);
      
      const callChains = shallowBuilder.buildCallChains();
      
      expect(callChains[0].depth).toBeLessThanOrEqual(1);
    });

    it('should calculate correct call chain depth', () => {
      const callChains = builder.buildCallChains();
      
      // Root -> Child1 -> Leaf = depth 2
      expect(callChains[0].depth).toBe(2);
    });

    it('should count total calls correctly', () => {
      const callChains = builder.buildCallChains();
      
      // Root makes 2 calls, Child1 makes 1 call = 3 total
      expect(callChains[0].totalCalls).toBe(3);
    });

    it('should identify involved files', () => {
      const callChains = builder.buildCallChains();
      
      expect(callChains[0].involvedFiles).toContain('/src/root.ts');
      expect(callChains[0].involvedFiles).toContain('/src/child.ts');
      expect(callChains[0].involvedFiles).toContain('/src/leaf.ts');
    });

    it('should handle circular references', () => {
      // Add a circular call
      const circularCall: FunctionCall = {
        id: 'circular',
        functionName: 'rootFunction',
        filePath: '/src/leaf.ts',
        line: 2,
        column: 5,
        callerFunctionId: 'leaf1',
        calledFunctionId: 'root1',
        callType: CallType.DIRECT,
        arguments: [],
        isChained: false
      };
      
      const callsWithCircular = [...mockCalls, circularCall];
      const circularBuilder = new CallChainBuilder(mockSymbolIndex, callsWithCircular, mockOptions);
      
      const callChains = circularBuilder.buildCallChains();
      
      // Should still build chains without infinite recursion
      expect(callChains).toHaveLength(1);
      expect(callChains[0].depth).toBeLessThan(10);
    });
  });

  describe('findCallChainsContaining', () => {
    it('should find call chains containing a specific function', () => {
      const callChains = builder.buildCallChains();
      const chainsWithChild1 = builder.findCallChainsContaining('child1', callChains);
      
      expect(chainsWithChild1).toHaveLength(1);
      expect(chainsWithChild1[0].rootFunction.name).toBe('rootFunction');
    });

    it('should return empty array if function not found', () => {
      const callChains = builder.buildCallChains();
      const chainsWithNonExistent = builder.findCallChainsContaining('nonExistent', callChains);
      
      expect(chainsWithNonExistent).toHaveLength(0);
    });
  });

  describe('getCallChainStatistics', () => {
    it('should calculate correct statistics', () => {
      const callChains = builder.buildCallChains();
      const stats = builder.getCallChainStatistics(callChains);
      
      expect(stats.totalChains).toBe(1);
      expect(stats.maxDepth).toBe(2);
      expect(stats.maxCalls).toBe(3);
      expect(stats.averageDepth).toBe(2);
      expect(stats.averageCalls).toBe(3);
    });

    it('should handle empty call chains', () => {
      const stats = builder.getCallChainStatistics([]);
      
      expect(stats.totalChains).toBe(0);
      expect(stats.averageDepth).toBe(0);
      expect(stats.maxDepth).toBe(0);
    });
  });

  describe('filterCallChains', () => {
    let callChains: any[];

    beforeEach(() => {
      callChains = builder.buildCallChains();
    });

    it('should filter by minimum depth', () => {
      const filtered = builder.filterCallChains(callChains, { minDepth: 3 });
      expect(filtered).toHaveLength(0); // No chains with depth >= 3
    });

    it('should filter by maximum depth', () => {
      const filtered = builder.filterCallChains(callChains, { maxDepth: 1 });
      expect(filtered).toHaveLength(0); // No chains with depth <= 1
    });

    it('should filter by minimum calls', () => {
      const filtered = builder.filterCallChains(callChains, { minCalls: 5 });
      expect(filtered).toHaveLength(0); // No chains with >= 5 calls
    });

    it('should filter by maximum calls', () => {
      const filtered = builder.filterCallChains(callChains, { maxCalls: 2 });
      expect(filtered).toHaveLength(0); // No chains with <= 2 calls
    });

    it('should filter by containing file', () => {
      const filtered = builder.filterCallChains(callChains, { containsFile: '/src/root.ts' });
      expect(filtered).toHaveLength(1);
    });

    it('should filter by containing function', () => {
      const filtered = builder.filterCallChains(callChains, { containsFunction: 'child1' });
      expect(filtered).toHaveLength(1);
    });

    it('should return all chains when no criteria match', () => {
      const filtered = builder.filterCallChains(callChains, {});
      expect(filtered).toHaveLength(callChains.length);
    });
  });

  describe('edge cases', () => {
    it('should handle functions with no calls', () => {
      const isolatedFunction: FunctionDefinition = {
        id: 'isolated',
        name: 'isolatedFunction',
        filePath: '/src/isolated.ts',
        startLine: 1,
        endLine: 3,
        type: FunctionType.FUNCTION,
        isExported: true,
        isAsync: false,
        isStatic: false,
        parameters: []
      };

      mockSymbolIndex.byId.set('isolated', isolatedFunction);
      mockSymbolIndex.byName.set('isolatedFunction', [isolatedFunction]);

      const callChains = builder.buildCallChains();
      
      // Should not include isolated function as it makes no calls
      expect(callChains.every(chain => chain.rootFunction.id !== 'isolated')).toBe(true);
    });

    it('should handle empty symbol index', () => {
      const emptyIndex: SymbolIndex = {
        byName: new Map(),
        byFile: new Map(),
        byId: new Map(),
        byClass: new Map()
      };

      const emptyBuilder = new CallChainBuilder(emptyIndex, [], mockOptions);
      const callChains = emptyBuilder.buildCallChains();
      
      expect(callChains).toHaveLength(0);
    });
  });
});