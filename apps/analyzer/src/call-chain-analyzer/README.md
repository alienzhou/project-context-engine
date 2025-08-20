# TypeScript Call Chain Analyzer

A powerful tool for analyzing function call chains in TypeScript and JavaScript codebases. This analyzer can trace function calls across multiple files, build complete call chains, and export the results in JSON format for further analysis.

## Features

- 🔍 **Cross-file Analysis**: Analyze function calls across multiple TypeScript/JavaScript files
- 📊 **Call Chain Construction**: Build complete call chains with configurable depth limits
- 🎯 **Smart Symbol Resolution**: Resolve function calls to their definitions using imports/exports
- 📈 **Dependency Analysis**: Detect file dependencies and circular references
- 🚀 **Performance Monitoring**: Built-in performance tracking and memory management
- 📄 **JSON Output**: Export results in structured JSON format
- 🛠️ **CLI Interface**: Easy-to-use command line interface
- ⚡ **Configurable Options**: Flexible analysis options and presets

## Installation

```bash
# Install dependencies
pnpm install

# Build the analyzer
pnpm build
```

## Quick Start

### Programmatic Usage

```typescript
import { CallChainAnalyzer } from './call-chain-analyzer';

// Create analyzer with default options
const analyzer = new CallChainAnalyzer();

// Analyze a directory
const result = await analyzer.analyze('./src');

// Save results to JSON file
await analyzer.analyzeAndSave('./src', 'call-chains.json');

// Get only call chains (lighter output)
await analyzer.analyzeAndSaveCallChains('./src', 'chains-only.json');
```

### CLI Usage

```bash
# Analyze current directory
node dist/call-chain-analyzer/cli/cli.js

# Analyze specific directory
node dist/call-chain-analyzer/cli/cli.js ./src

# Custom output file and depth
node dist/call-chain-analyzer/cli/cli.js ./src --output chains.json --max-depth 5

# Use preset configurations
node dist/call-chain-analyzer/cli/cli.js ./src --preset strict

# Get only call chains
node dist/call-chain-analyzer/cli/cli.js ./src --chains-only

# Generate summary report
node dist/call-chain-analyzer/cli/cli.js ./src --summary
```

## Configuration Options

### Analysis Options

```typescript
interface AnalysisOptions {
  maxDepth: number;              // Maximum call chain depth (default: 10)
  includePatterns: string[];     // File patterns to include
  excludePatterns: string[];     // File patterns to exclude
  includeExternalCalls: boolean; // Include external library calls
  exportedOnly: boolean;         // Analyze only exported functions
  includeAsync: boolean;         // Include async functions
  includeMethods: boolean;       // Include class methods
  includeArrowFunctions: boolean; // Include arrow functions
  rootDirectory: string;         // Root directory for analysis
}
```

### Presets

- **default**: Standard analysis with reasonable defaults
- **strict**: Only exported functions, no external calls, depth 5
- **comprehensive**: Include everything, depth 15, external calls

## CLI Options

```
Usage: ts-call-chain [directory] [options]

Arguments:
  directory                 Target directory to analyze (default: current directory)

Options:
  -o, --output <file>       Output file path (default: call-chains.json)
  --max-depth <number>      Maximum call chain depth (default: 10)
  --include <patterns>      Include file patterns (comma-separated)
  --exclude <patterns>      Exclude file patterns (comma-separated)
  --preset <preset>         Use preset configuration (default|strict|comprehensive)
  
  --exported-only           Analyze only exported functions
  --include-async           Include async functions
  --include-methods         Include class methods
  --include-arrow-functions Include arrow functions
  --include-external-calls  Include external library calls
  
  --chains-only             Output only call chains (lighter output)
  --summary                 Generate summary report only
  
  -v, --verbose             Enable verbose logging
  -h, --help                Show help message
  --version                 Show version information
```

## Output Format

### Full Analysis Result

```json
{
  "functions": [
    {
      "id": "func_123",
      "name": "myFunction",
      "filePath": "/src/module.ts",
      "startLine": 10,
      "endLine": 20,
      "type": "function",
      "isExported": true,
      "isAsync": false,
      "parameters": [
        {
          "name": "param1",
          "type": "string",
          "isOptional": false
        }
      ]
    }
  ],
  "calls": [
    {
      "id": "call_456",
      "functionName": "helperFunction",
      "filePath": "/src/module.ts",
      "line": 15,
      "column": 5,
      "callerFunctionId": "func_123",
      "calledFunctionId": "func_789",
      "callType": "direct"
    }
  ],
  "callChains": [
    {
      "id": "chain_001",
      "rootFunction": { /* function definition */ },
      "nodes": [
        {
          "function": { /* function definition */ },
          "calls": [ /* function calls */ ],
          "children": [ /* child nodes */ ],
          "depth": 0
        }
      ],
      "depth": 3,
      "totalCalls": 5,
      "involvedFiles": ["/src/module.ts", "/src/helper.ts"]
    }
  ],
  "dependencyGraph": {
    "dependencies": {
      "/src/module.ts": ["/src/helper.ts"]
    },
    "circularDependencies": []
  },
  "metadata": {
    "totalFiles": 10,
    "totalFunctions": 50,
    "totalCalls": 120,
    "duration": 1500,
    "analyzerVersion": "1.0.0"
  }
}
```

### Call Chains Only

```json
{
  "callChains": [ /* call chain objects */ ],
  "metadata": { /* analysis metadata */ },
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## Examples

### Example 1: Basic Analysis

```typescript
// main.ts
import { helper } from './utils';

export function main(): void {
  helper();
  processData();
}

function processData(): void {
  console.log('Processing...');
}

// utils.ts
export function helper(): void {
  validate();
}

function validate(): boolean {
  return true;
}
```

**Analysis Result**: Will detect the call chain `main -> helper -> validate` and `main -> processData`.

### Example 2: Class Methods

```typescript
// service.ts
export class DataService {
  public async fetchData(): Promise<Data> {
    const validated = this.validateInput();
    return this.processData(validated);
  }
  
  private validateInput(): boolean {
    return true;
  }
  
  private async processData(input: boolean): Promise<Data> {
    // implementation
  }
}
```

**Analysis Result**: Will detect method calls within the class and async function patterns.

### Example 3: Cross-file Dependencies

```typescript
// moduleA.ts
import { functionB } from './moduleB';

export function functionA(): void {
  functionB();
}

// moduleB.ts
import { functionC } from './moduleC';

export function functionB(): void {
  functionC();
}

// moduleC.ts
export function functionC(): void {
  // leaf function
}
```

**Analysis Result**: Will build the complete call chain `functionA -> functionB -> functionC` across three files.

## Performance Considerations

- **File Limits**: Analyzer can handle up to 1000 files by default
- **Memory Usage**: Monitor memory usage for large codebases
- **Depth Limits**: Use appropriate depth limits to prevent excessive analysis
- **Filtering**: Use include/exclude patterns to focus analysis on relevant files

## Error Handling

The analyzer includes comprehensive error handling:

- **Parse Errors**: Continues analysis even if some files have syntax errors
- **Missing Dependencies**: Handles unresolved imports gracefully
- **Circular Dependencies**: Detects and reports circular dependencies
- **Performance Issues**: Monitors and reports performance bottlenecks

## Troubleshooting

### Common Issues

1. **Out of Memory**: Reduce file count or increase Node.js memory limit
2. **Slow Analysis**: Use stricter include/exclude patterns
3. **Missing Call Chains**: Check if functions are properly exported/imported
4. **Parse Errors**: Fix TypeScript/JavaScript syntax errors

### Debug Mode

Enable verbose logging for detailed analysis information:

```bash
node dist/call-chain-analyzer/cli/cli.js ./src --verbose
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.