/**
 * Integration tests for Call Chain Analyzer
 * 
 * These tests verify the end-to-end functionality of the call chain analyzer
 * by testing the complete analysis workflow.
 */

/// <reference types="jest" />

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CallChainAnalyzer } from '../core/analyzer';
import { runCallChainAnalysis } from '../cli/cli';

// Mock fs for controlled testing
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Call Chain Analyzer Integration Tests', () => {
  let tempDir: string;
  let analyzer: CallChainAnalyzer;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), 'call-chain-test');
    analyzer = new CallChainAnalyzer({
      rootDirectory: tempDir,
      maxDepth: 5
    });

    // Mock file system
    mockFs.existsSync.mockImplementation((filePath: string) => {
      return typeof filePath === 'string' && filePath.startsWith(tempDir);
    });

    mockFs.statSync.mockReturnValue({ size: 1000 } as fs.Stats);
    mockFs.mkdirSync.mockImplementation(() => undefined);
    mockFs.writeFileSync.mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should create analyzer instance', () => {
      expect(analyzer).toBeDefined();
      expect(analyzer.getOptions()).toBeDefined();
    });

    it('should handle invalid directory', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      await expect(analyzer.analyze('/invalid/path')).rejects.toThrow();
    });

    it('should handle empty directory', async () => {
      // Mock empty directory
      mockFs.existsSync.mockReturnValue(true);
      
      // Mock glob to return empty array
      const mockGlob = require('glob');
      if (mockGlob && mockGlob.glob) {
        mockGlob.glob.mockResolvedValue([]);
      }
      
      await expect(analyzer.analyze(tempDir)).rejects.toThrow();
    });
  });

  describe('Configuration Tests', () => {
    it('should use default options', () => {
      const options = analyzer.getOptions();
      expect(options.maxDepth).toBe(5);
      expect(options.rootDirectory).toBe(tempDir);
    });

    it('should update options', () => {
      analyzer.updateOptions({ maxDepth: 8 });
      const options = analyzer.getOptions();
      expect(options.maxDepth).toBe(8);
    });

    it('should create preset analyzers', () => {
      const strictAnalyzer = CallChainAnalyzer.createWithPreset('strict');
      const comprehensiveAnalyzer = CallChainAnalyzer.createWithPreset('comprehensive');
      
      expect(strictAnalyzer).toBeDefined();
      expect(comprehensiveAnalyzer).toBeDefined();
    });
  });

  describe('CLI Integration', () => {
    it('should handle help command', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await runCallChainAnalysis(['--help']);
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle version command', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await runCallChainAnalysis(['--version']);
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle invalid directory in CLI', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
      
      mockFs.existsSync.mockReturnValue(false);
      
      await runCallChainAnalysis(['/invalid/directory']);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle file read errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });
      
      // Mock glob to return some files
      const mockGlob = require('glob');
      if (mockGlob && mockGlob.glob) {
        mockGlob.glob.mockResolvedValue([path.join(tempDir, 'test.ts')]);
      }
      
      // Should not throw, but handle errors gracefully
      const result = await analyzer.analyze(tempDir);
      expect(result).toBeDefined();
    });

    it('should handle large files', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ size: 2000000 } as fs.Stats); // 2MB
      
      const mockGlob = require('glob');
      if (mockGlob && mockGlob.glob) {
        mockGlob.glob.mockResolvedValue([path.join(tempDir, 'large.ts')]);
      }
      
      const result = await analyzer.analyze(tempDir);
      expect(result).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should complete analysis within reasonable time', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('export function test() {}');
      
      const mockGlob = require('glob');
      if (mockGlob && mockGlob.glob) {
        mockGlob.glob.mockResolvedValue([path.join(tempDir, 'test.ts')]);
      }
      
      const startTime = Date.now();
      const result = await analyzer.analyze(tempDir);
      const duration = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Output Generation', () => {
    it('should generate JSON output', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('export function test() {}');
      
      const mockGlob = require('glob');
      if (mockGlob && mockGlob.glob) {
        mockGlob.glob.mockResolvedValue([path.join(tempDir, 'test.ts')]);
      }
      
      const outputPath = path.join(tempDir, 'output.json');
      await analyzer.analyzeAndSave(tempDir, outputPath);
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        outputPath,
        expect.any(String),
        'utf-8'
      );
    });
  });
});