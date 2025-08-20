/**
 * Call Chain Builder for TypeScript Call Chain Analysis
 * 
 * This module builds complete call chains from function definitions and calls,
 * respecting the maximum depth limit and handling circular references.
 */

import { nanoid } from 'nanoid';
import Logger from '../../utils/log';
import {
  FunctionDefinition,
  FunctionCall,
  CallChain,
  CallChainNode,
  SymbolIndex,
  AnalysisOptions
} from '../core/types';
import { MAX_CALL_DEPTH } from '../core/constants';

const logger = Logger('call-chain-builder');

/**
 * Call Chain Builder class for constructing function call chains
 */
export class CallChainBuilder {
  private symbolIndex: SymbolIndex;
  private allCalls: FunctionCall[];
  private options: AnalysisOptions;
  private visitedFunctions: Set<string>;

  constructor(symbolIndex: SymbolIndex, allCalls: FunctionCall[], options: AnalysisOptions) {
    this.symbolIndex = symbolIndex;
    this.allCalls = allCalls;
    this.options = options;
    this.visitedFunctions = new Set();
  }

  /**
   * Build all call chains starting from root functions
   */
  buildCallChains(): CallChain[] {
    logger.info('Building call chains...');

    const callChains: CallChain[] = [];
    const rootFunctions = this.findRootFunctions();

    logger.info(`Found ${rootFunctions.length} root functions`);

    for (const rootFunction of rootFunctions) {
      this.visitedFunctions.clear();
      const callChain = this.buildCallChainFromRoot(rootFunction);
      if (callChain) {
        callChains.push(callChain);
      }
    }

    // Sort call chains by depth and total calls
    callChains.sort((a, b) => {
      if (a.depth !== b.depth) {
        return b.depth - a.depth; // Deeper chains first
      }
      return b.totalCalls - a.totalCalls; // More calls first
    });

    logger.info(`Built ${callChains.length} call chains`);
    return callChains;
  }

  /**
   * Build a call chain starting from a specific root function
   */
  private buildCallChainFromRoot(rootFunction: FunctionDefinition): CallChain | null {
    try {
      const rootNode = this.buildCallChainNode(rootFunction, 0);
      if (!rootNode) {
        return null;
      }

      const involvedFiles = this.collectInvolvedFiles(rootNode);
      const totalCalls = this.countTotalCalls(rootNode);

      return {
        id: nanoid(),
        rootFunction,
        nodes: [rootNode],
        depth: this.calculateMaxDepth(rootNode),
        totalCalls,
        involvedFiles
      };
    } catch (error) {
      logger.warn(`Error building call chain for ${rootFunction.name}`, { error });
      return null;
    }
  }

  /**
   * Build a call chain node recursively
   */
  private buildCallChainNode(
    func: FunctionDefinition,
    depth: number,
    parentId?: string
  ): CallChainNode | null {
    // Check depth limit
    if (depth >= this.options.maxDepth) {
      logger.debug(`Reached maximum depth ${this.options.maxDepth} for function ${func.name}`);
      return null;
    }

    // Check for circular references
    if (this.visitedFunctions.has(func.id)) {
      logger.debug(`Circular reference detected for function ${func.name}`);
      return null;
    }

    this.visitedFunctions.add(func.id);

    // Find all calls made by this function
    const functionCalls = this.allCalls.filter(call => call.callerFunctionId === func.id);

    // Build child nodes for each call
    const children: CallChainNode[] = [];
    for (const call of functionCalls) {
      if (call.calledFunctionId) {
        const calledFunction = this.symbolIndex.byId.get(call.calledFunctionId);
        if (calledFunction) {
          const childNode = this.buildCallChainNode(calledFunction, depth + 1, func.id);
          if (childNode) {
            children.push(childNode);
          }
        }
      }
    }

    // Remove function from visited set to allow it in other branches
    this.visitedFunctions.delete(func.id);

    return {
      function: func,
      calls: functionCalls,
      children,
      depth,
      parentId
    };
  }

  /**
   * Find root functions (functions that are not called by others or are entry points)
   */
  private findRootFunctions(): FunctionDefinition[] {
    const calledFunctionIds = new Set(
      this.allCalls
        .filter(call => call.calledFunctionId)
        .map(call => call.calledFunctionId!)
    );

    const rootFunctions: FunctionDefinition[] = [];

    for (const func of this.symbolIndex.byId.values()) {
      // Skip if function is called by others (not a root)
      if (calledFunctionIds.has(func.id)) {
        continue;
      }

      // Skip if function doesn't make any calls (leaf function)
      const makesCalls = this.allCalls.some(call => call.callerFunctionId === func.id);
      if (!makesCalls) {
        continue;
      }

      // Include if it's exported (potential entry point)
      if (func.isExported) {
        rootFunctions.push(func);
        continue;
      }

      // Include if it matches common entry point patterns
      if (this.isLikelyEntryPoint(func)) {
        rootFunctions.push(func);
        continue;
      }

      // Include if it's not called by any function in the same file
      const sameFileFunctions = this.symbolIndex.byFile.get(func.filePath) || [];
      const calledBySameFile = this.allCalls.some(call => 
        call.calledFunctionId === func.id &&
        sameFileFunctions.some(f => f.id === call.callerFunctionId)
      );

      if (!calledBySameFile) {
        rootFunctions.push(func);
      }
    }

    return rootFunctions;
  }

  /**
   * Check if a function is likely an entry point based on naming patterns
   */
  private isLikelyEntryPoint(func: FunctionDefinition): boolean {
    const entryPointPatterns = [
      /^main$/i,
      /^init$/i,
      /^start$/i,
      /^run$/i,
      /^execute$/i,
      /^bootstrap$/i,
      /^setup$/i,
      /^launch$/i,
      /^begin$/i,
      /^handle/i,
      /^process/i,
      /^on[A-Z]/,  // Event handlers like onClick, onLoad
      /Handler$/,  // Functions ending with Handler
      /^test/i,    // Test functions
      /^it$/i,     // Jest/Mocha test functions
      /^describe$/i // Jest/Mocha describe functions
    ];

    return entryPointPatterns.some(pattern => pattern.test(func.name));
  }

  /**
   * Collect all files involved in a call chain
   */
  private collectInvolvedFiles(node: CallChainNode): string[] {
    const files = new Set<string>();
    
    const traverse = (currentNode: CallChainNode): void => {
      files.add(currentNode.function.filePath);
      
      for (const call of currentNode.calls) {
        files.add(call.filePath);
      }
      
      for (const child of currentNode.children) {
        traverse(child);
      }
    };

    traverse(node);
    return Array.from(files);
  }

  /**
   * Count total number of function calls in a call chain
   */
  private countTotalCalls(node: CallChainNode): number {
    let count = node.calls.length;
    
    for (const child of node.children) {
      count += this.countTotalCalls(child);
    }
    
    return count;
  }

  /**
   * Calculate the maximum depth of a call chain
   */
  private calculateMaxDepth(node: CallChainNode): number {
    if (node.children.length === 0) {
      return node.depth;
    }

    let maxChildDepth = node.depth;
    for (const child of node.children) {
      const childDepth = this.calculateMaxDepth(child);
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    }

    return maxChildDepth;
  }

  /**
   * Find all call chains that contain a specific function
   */
  findCallChainsContaining(functionId: string, callChains: CallChain[]): CallChain[] {
    return callChains.filter(chain => this.containsFunction(chain.nodes[0], functionId));
  }

  /**
   * Check if a call chain node contains a specific function
   */
  private containsFunction(node: CallChainNode, functionId: string): boolean {
    if (node.function.id === functionId) {
      return true;
    }

    return node.children.some(child => this.containsFunction(child, functionId));
  }

  /**
   * Get call chain statistics
   */
  getCallChainStatistics(callChains: CallChain[]): {
    totalChains: number;
    averageDepth: number;
    maxDepth: number;
    averageCalls: number;
    maxCalls: number;
    averageFiles: number;
    maxFiles: number;
  } {
    if (callChains.length === 0) {
      return {
        totalChains: 0,
        averageDepth: 0,
        maxDepth: 0,
        averageCalls: 0,
        maxCalls: 0,
        averageFiles: 0,
        maxFiles: 0
      };
    }

    const depths = callChains.map(chain => chain.depth);
    const calls = callChains.map(chain => chain.totalCalls);
    const files = callChains.map(chain => chain.involvedFiles.length);

    return {
      totalChains: callChains.length,
      averageDepth: Math.round((depths.reduce((a, b) => a + b, 0) / depths.length) * 100) / 100,
      maxDepth: Math.max(...depths),
      averageCalls: Math.round((calls.reduce((a, b) => a + b, 0) / calls.length) * 100) / 100,
      maxCalls: Math.max(...calls),
      averageFiles: Math.round((files.reduce((a, b) => a + b, 0) / files.length) * 100) / 100,
      maxFiles: Math.max(...files)
    };
  }

  /**
   * Filter call chains based on criteria
   */
  filterCallChains(
    callChains: CallChain[],
    criteria: {
      minDepth?: number;
      maxDepth?: number;
      minCalls?: number;
      maxCalls?: number;
      containsFile?: string;
      containsFunction?: string;
    }
  ): CallChain[] {
    return callChains.filter(chain => {
      if (criteria.minDepth !== undefined && chain.depth < criteria.minDepth) {
        return false;
      }
      
      if (criteria.maxDepth !== undefined && chain.depth > criteria.maxDepth) {
        return false;
      }
      
      if (criteria.minCalls !== undefined && chain.totalCalls < criteria.minCalls) {
        return false;
      }
      
      if (criteria.maxCalls !== undefined && chain.totalCalls > criteria.maxCalls) {
        return false;
      }
      
      if (criteria.containsFile && !chain.involvedFiles.includes(criteria.containsFile)) {
        return false;
      }
      
      if (criteria.containsFunction && !this.containsFunction(chain.nodes[0], criteria.containsFunction)) {
        return false;
      }
      
      return true;
    });
  }
}