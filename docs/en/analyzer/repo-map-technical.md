# Repo Map Generator Technical Manual

This manual provides detailed information about the internal implementation, core algorithms, and technical architecture of the Repo Map generator, aimed at providing guidance for developers who wish to deeply understand, extend, or customize this tool.

## 1. Technical Architecture

The Repo Map generation process is completed by a series of collaborating components, ensuring analysis accuracy, efficiency, and scalability.

```mermaid
graph TD
    subgraph "Input"
        A[Code Repository]
    end

    subgraph "Analysis Pipeline"
        B[1. File Scanner] --> C[2. Symbol Extractor]
        C --> D[3. Dependency Analyzer]
        D --> E[4. Importance Calculator]
        E --> F[5. Format Output]
    end

    subgraph "Core Technologies"
        G[Tree-sitter Parser] --> C
        H[Language Configuration] --> G
        I[PageRank Algorithm] --> E
        J[Token Controller] --> F
    end

    subgraph "Output"
        K[Repo Map (Text/JSON)]
    end

    A --> B
    F --> K
```

### Core Components

1. **File Scanner**: Recursively traverses the codebase, filters files based on configurable rules (such as ignoring `node_modules`, `.git`, etc.), and identifies supported language types.
2. **Symbol Extractor**: The core of the system. It uses Tree-sitter to parse source code into Abstract Syntax Trees (AST), then traverses the AST to extract all relevant code symbols.
3. **Dependency Analyzer**: Parses `import` and `export` statements in files through regular expressions and syntax analysis, building dependency relationship graphs between files.
4. **Importance Calculator**: This is the key to Repo Map's intelligence. It calculates in two steps:
   - **File Importance (PageRank)**: Treats the file dependency graph as a network and runs the PageRank algorithm to calculate the weight of each file.
   - **Symbol Importance**: Comprehensively calculates each symbol's importance score based on symbol type, modifiers (such as `export`, `static`), naming patterns, reference status, and the PageRank weight of the containing file.
5. **Format Output (Formatter)**: Sorts files and symbols according to calculated importance, generates the final Repo Map in preset formats (text or JSON), while ensuring output content doesn't exceed specified length through the Token Controller.

## 2. Core Data Structures

To clearly represent code structure, we define the following core data structures:

```typescript
// Represents a code symbol (function, class, method, etc.)
export interface RepoMapSymbol {
  name: string;
  // Detailed symbol type
  type:
    | 'class'
    | 'function'
    | 'interface'
    | 'method'
    | 'variable'
    | 'type'
    | 'constructor'
    | 'property'
    | 'enum'
    | 'constant'
    | 'static_method'
    | 'async_function'
    | 'getter'
    | 'setter';
  signature: string; // Complete signature of the symbol
  line: number;
  importance: number; // Calculated importance score
  modifiers?: string[]; // Such as: ['static', 'async', 'export']
  returnType?: string;
  parameters?: string[];
}

// Represents a code file
export interface RepoMapFile {
  filepath: string; // Absolute path
  relativePath: string; // Relative path
  symbols: RepoMapSymbol[]; // Symbols contained in the file
  imports: string[]; // Imported modules
  exports: string[]; // Exported symbol names
}

// Generator configuration options
export interface RepoMapOptions {
  maxTokens?: number;
  includeTypes?: boolean;
  includeVariables?: boolean;
  minImportance?: number;
  rootPath: string;
}

// Final return result
export interface RepoMapResult {
  files: RepoMapFile[];
  totalSymbols: number;
  estimatedTokens: number;
  map: string; // Formatted map string
}
```

## 3. Algorithm Details

### 3.1 Symbol Type Detection (`detectSymbolType`)

To achieve fine-grained output and importance calculation, we use a set of rules based on keywords and code patterns to detect symbol types.

```typescript
function detectSymbolType(signature: string): RepoMapSymbol['type'] {
  const sig = signature.trim().toLowerCase();

  // Rule examples
  if (sig.includes('class ')) return 'class';
  if (sig.includes('interface ')) return 'interface';
  if (sig.includes('enum ')) return 'enum';
  if (sig.includes('constructor')) return 'constructor';
  if (sig.includes('static ') && sig.includes('function')) return 'static_method';
  if (sig.includes('async ') && sig.includes('function')) return 'async_function';
  if (sig.includes('get ') && sig.includes('(')) return 'getter';
  if (sig.includes('function ') || sig.includes('func ')) return 'function';
  if (sig.match(/^[A-Z_][A-Z0-9_]*$/)) return 'constant'; // All uppercase naming -> constant

  return 'variable'; // Default type
}
```

### 3.2 File Priority Calculation (`calculateFilePriority`)

When formatting output, we first sort files to ensure the most important files appear first.

```typescript
function calculateFilePriority(file: RepoMapFile): number {
  let priority = 0;
  const path = file.relativePath.toLowerCase();

  // Path rules
  if (path.includes('test') || path.includes('spec')) priority -= 10;
  if (path.includes('config')) priority -= 5;
  if (path.includes('src/') || path.includes('lib/')) priority += 5;
  if (path.includes('index') || path.includes('main')) priority += 8;

  // Content rules
  const totalImportance = file.symbols.reduce((sum, s) => sum + s.importance, 0);
  priority += Math.min(totalImportance / 10, 20); // Based on total symbol importance
  priority += Math.min(file.exports.length * 2, 10); // Based on export count

  return priority;
}
```

### 3.3 Symbol Importance Calculation (`calculateImportance`)

This is the core algorithm that ensures Repo Map's "intelligence", comprehensively considering multiple factors.

```typescript
function calculateImportance(
  symbol: RepoMapSymbol,
  fileInfo: RepoMapFile,
  allFiles: RepoMapFile[]
): number {
  let score = 0;

  // 1. Base type weights
  const typeScores = { class: 25, interface: 20, enum: 18 /* ... */ };
  score += typeScores[symbol.type] || 4;

  // 2. Modifier bonuses
  if (symbol.modifiers) {
    if (symbol.modifiers.includes('export')) score += 5;
    if (symbol.modifiers.includes('static')) score += 3;
    if (symbol.modifiers.includes('async')) score += 2;
  }

  // 3. Export status bonus (fallback)
  if (fileInfo.exports.includes(symbol.name)) {
    score += 8;
  }

  // 4. Reference bonus
  const referencedByCount = allFiles.filter(f =>
    f.imports.some(imp => imp.includes(fileInfo.relativePath.replace(/\.[^.]+$/, '')))
  ).length;
  score += referencedByCount * 2;

  // 5. Name pattern matching
  const name = symbol.name.toLowerCase();
  if (name.includes('init') || name.includes('setup')) score += 3;
  if (name.includes('test') || name.includes('spec')) score -= 2; // Downgrade test code

  // 6. Parameter count bonus
  if (symbol.parameters) {
    score += Math.min(symbol.parameters.length * 0.5, 3);
  }

  return Math.max(score, 0); // Ensure score is not negative
}
```

_Note: The file weights calculated by PageRank will be applied as multipliers to the final symbol importance scores._

## 4. Extension & Customization

### Adding New Language Support

1. **Update Language Mapping**: Add new file extensions and corresponding Tree-sitter language names to the `languageMap` object in `apps/analyzer/src/code-analyzer/parser/index.ts`.
   ```typescript
   const languageMap: Record<string, string> = {
     // ...
     rb: 'ruby',
     ex: 'elixir', // New addition
   };
   ```
2. **Add WASM Parser**: Ensure the `tree-sitter-wasms` package supports the language, or manually provide the corresponding `.wasm` parser file.
3. **Optimize Symbol Extraction**: If necessary, add specific node type processing logic for the new language in `extractCodeSnippets` or `processFunction` to improve parsing precision.

### Custom Output Format

You can modify the `formatRepoMap` function to change the output structure and style. For example, you can implement a formatter that outputs Mermaid `graph` format.

```typescript
function formatAsMermaid(files: RepoMapFile[]): string {
  let mermaidStr = 'graph TD;\n';
  files.forEach(file => {
    mermaidStr += `  subgraph ${file.relativePath}\n`;
    file.symbols.forEach(symbol => {
      // A["⚡️ functionName"]
      mermaidStr += `    ${symbol.name}["${getSymbolIcon(symbol.type)} ${symbol.name}"];\n`;
    });
    mermaidStr += '  end\n';
  });
  // ... add dependency connections ...
  return mermaidStr;
}
```

## 5. Performance Optimization Strategies

- **Concurrent Parsing**: File parsing is I/O and CPU intensive. Implementing parallel processing through `Promise.all` can significantly improve analysis speed for large-scale codebases.
- **Parser Caching**: Loaded Tree-sitter language parsers are cached to avoid repeatedly loading and initializing WASM files for the same language.
- **Fallback Parsing**: When parsers for specific languages (like `tsx`) are unavailable, the system attempts to use parsers from parent languages (like `javascript`) for fallback processing, improving compatibility.
- **Smart Truncation**: During format output, the system calculates generated token count in real-time. Once the budget is exceeded, it immediately stops adding new content, avoiding unnecessary computation.

---

Return to [**User Guide (repo-map.md)**](./repo-map.md). 