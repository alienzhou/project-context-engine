# Repo Map: Intelligent Code Repository Map Generator

`Repo Map` is a powerful static code analysis tool designed to generate a concise, intelligent "map" of code repositories. It extracts the most important classes, functions, and interfaces from projects and displays their relationships in a clear structure, helping developers and AI quickly understand the core structure of codebases.

Its design is inspired by [aider.chat](https://aider.chat/docs/repomap.html) and enhanced with more advanced analysis and formatting capabilities.

## Core Features

- 🧠 **Intelligent Analysis**: Uses Tree-sitter for precise code parsing, extracting over 14 different types of symbols (classes, functions, enums, interfaces, etc.).
- 📊 **Importance Ranking**: Combines PageRank algorithm with multiple heuristic rules to intelligently assess the importance of files and symbols, prioritizing core code display.
- 🌍 **Multi-language Support**: Comprehensive support for JavaScript, TypeScript, Python, Java, Go, C++, React, and other mainstream programming languages and frameworks.
- 🎯 **Language Filtering**: Support for specifying particular languages for analysis, improving analysis efficiency and precision in large multi-language projects.
- 🎯 **Token Control**: Intelligently controls output content length, ensuring it easily fits within various Large Language Model (LLM) context windows.
- 🎨 **Visual Output**: Uses icons (like 🏛️, ⚡, 🔧) and modifiers (like `[export]`, `[async]`) to enhance output readability.
- ⚙️ **Flexible Configuration**: Provides rich configuration options to customize output detail level and format.
- 🖥️ **CLI & API**: Supports both command-line interface (CLI) and programmatic interface (API) for easy integration into various workflows.

## Supported Languages

| Language              | Extensions                       | Support Status |
| :-------------------- | :------------------------------- | :------------- |
| JavaScript/TypeScript | .js, .ts, .jsx, .tsx, .mjs, .cjs | ✅ Full Support |
| Java                  | .java                            | ✅ Full Support |
| Kotlin                | .kt, .kts                        | ✅ Full Support |
| Go                    | .go                              | ✅ Full Support |
| C/C++                 | .c, .cpp, .h, .hpp, .cc, .cxx    | ✅ Full Support |
| Python                | .py, .pyw                        | ✅ Full Support |
| React                 | .jsx, .tsx                       | ✅ Full Support |
| Rust                  | .rs                              | ✅ Full Support |
| Swift                 | .swift                           | ✅ Full Support |
| C#                    | .cs                              | ✅ Full Support |
| Shell                 | .sh, .bash                       | ✅ Basic Support |
| Configuration         | .json, .yaml                     | ✅ Basic Support |

## Quick Start

### 1. Installation & Build

First, ensure you have `pnpm` installed.

```bash
# Install dependencies in project root
pnpm install

# Build project
pnpm build
```

### 2. Usage

#### Command Line Interface (CLI)

You can quickly generate a Repo Map for any project using the CLI.

##### Basic Usage

```bash
# Basic usage: Generate repo map for specified directory and print to console
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo>

# Show help information
node apps/analyzer/dist/code-analyzer/repomap/cli.js --help
```

##### New Feature: Language Filtering 🎯

Now supports specifying particular languages for analysis, greatly improving analysis efficiency for large multi-language projects:

```bash
# Analyze only Python files
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo> --language python

# Analyze only TypeScript files (using shorthand parameter)
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo> -l typescript

# Analyze only Java files and save to file
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo> -l java -o java-map.md

# Analyze Go files, set larger token limit, output JSON format
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo> -l go -t 4096 -f json
```

##### Supported Language Parameters

```
javascript, typescript, python, java, kotlin, cpp, c, go, rust, swift,
scala, csharp, ruby, php, lua, bash, html, css, vue, json, yaml, xml
```

##### Complete Parameter List

```bash
# Complete parameter format
node apps/analyzer/dist/code-analyzer/repomap/cli.js <input-dir> [options]

Options:
  -l, --language <lang>     Specify language to analyze (optional)
  -o, --output <file>       Output file path (optional)
  -t, --max-tokens <num>    Maximum token count (default: 1024)
  -f, --format <format>     Output format: text | json (default: text)
  -h, --help                Show help information
```

##### Legacy Usage (Backward Compatible)

```bash
# Save to file
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo> repomap.md

# Control token count
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo> repomap.md 2048

# Generate JSON format output
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo> repomap.json 4096 json
```

#### Programmatic Interface (API)

Integrating Repo Map functionality into your own tools or services is also very simple.

```typescript
import { generateRepoMap } from './apps/analyzer/src/code-analyzer/repomap';
// Note: Please adjust the import path according to your project structure

async function main() {
  // Basic usage
  const result = await generateRepoMap('./path/to/your/repo', {
    maxTokens: 2048,
  });

  console.log(result.map);

  // Using language filtering - analyze only Python files
  const pythonResult = await generateRepoMap('./path/to/your/repo', {
    maxTokens: 2048,
    language: 'python',
  });

  console.log('Python file analysis result:');
  console.log(pythonResult.map);

  // You can also access detailed structured data
  // console.log(JSON.stringify(result.files, null, 2));
}

main();
```

## Output Example (Text Format)

```
📁 test-multilang/typescript/
│🏛️ interface IUser { } [L1-7]
│🏛️ type UserStatus = "active" | "inactive" | "pending" [L9]
│🏛️ enum UserRole { } [L11-15]
│🏛️ class User { { } [L26-70]
│  ⚡ createGuest() { } [L41-43]
│  ⚡ isValidEmail() { } [L45-47]
│  ⚡ getDisplayName() { } [L49-51]
│  ⚡ activate() { } [L53-55]
│  ⚡ deactivate() { } [L57-59]
│  ⚡ toJSON() { } [L61-69]
⋮...
│⚡ function createUserFromData(data: Partial<IUser>) { } [L84-94]
```

### Symbol Icon Meanings

- 🏛️ **Classes/Interfaces** - Core business objects
- ⚡ **Functions/Methods** - Functionality implementation
- 🏗️ **Constructors** - Object initialization
- 🔧 **Utility Functions** - Helper functionality
- 📋 **Type Definitions** - Data structures
- 🏷️ **Tags/Enums** - Constant definitions
- 📦 **Template Elements** - UI components
- 🔄 **Async Functions** - Asynchronous operations
- `[export]` - Exported symbols
- `[static]` - Static members
- `[async]` - Async markers
- `[L26-38]` - Line number ranges

## Configuration Options

You can customize the generation process through the `RepoMapOptions` object.

```typescript
interface RepoMapOptions {
  maxTokens?: number; // Maximum token count, default 1024
  includeTypes?: boolean; // Whether to include type definitions, default true
  includeVariables?: boolean; // Whether to include variables, default false
  minImportance?: number; // Minimum importance threshold for displaying symbols, default 0.5
  language?: string; // 🆕 Specify language to analyze, analyze all supported languages if not specified
  rootPath: string; // Root directory path of repository to analyze
}
```

### Language Filtering Configuration Details

The `language` parameter supports the following values:

| Language   | Parameter Value | Supported File Extensions                           |
| ---------- | --------------- | --------------------------------------------------- |
| JavaScript | `javascript`    | `.js`, `.mjs`, `.cjs`, `.jsx`                       |
| TypeScript | `typescript`    | `.ts`, `.tsx`                                       |
| Python     | `python`        | `.py`, `.pyw`                                       |
| Java       | `java`          | `.java`                                             |
| Kotlin     | `kotlin`        | `.kt`, `.kts`                                       |
| Go         | `go`            | `.go`                                               |
| C/C++      | `cpp`           | `.c`, `.cpp`, `.h`, `.hpp`, `.cc`, `.cxx`           |
| Rust       | `rust`          | `.rs`                                               |
| Swift      | `swift`         | `.swift`                                            |
| C#         | `csharp`        | `.cs`                                               |
| HTML       | `html`          | `.html`, `.htm`                                     |
| CSS        | `css`           | `.css`                                              |
| Vue        | `vue`           | `.vue`                                              |
| JSON       | `json`          | `.json`                                             |
| YAML       | `yaml`          | `.yaml`, `.yml`                                     |
| XML        | `xml`           | `.xml`                                              |

## Use Cases

### Large Multi-language Projects

When working with large projects containing multiple programming languages:

```bash
# Analyze only frontend TypeScript code
node apps/analyzer/dist/code-analyzer/repomap/cli.js ./project -l typescript -t 4096

# Analyze only backend Python code
node apps/analyzer/dist/code-analyzer/repomap/cli.js ./project -l python -t 4096

# Analyze only configuration files
node apps/analyzer/dist/code-analyzer/repomap/cli.js ./project -l json -t 2048
```

### Practical Applications

- **Code Reviews**: Analyze only languages related to changes, improving review efficiency.
- **Documentation Generation**: Generate specialized project maps for developers of different languages.

### Filter Symbols

- `minImportance`: Increase this threshold to filter out less important symbols, focusing only on core logic.
- `includeVariables`: If you care about constant or global variable definitions, set this to `true`.

### CI/CD Integration

You can add Repo Map generation steps to your CI/CD pipeline to automatically update project maps whenever code changes.

```yaml
# .github/workflows/repomap.yml
name: Generate Repo Map
on: [push]

jobs:
  repomap:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build

      - name: Generate repo map
        run: |
          # Generate complete repo map
          node apps/analyzer/dist/code-analyzer/repomap/cli.js . repomap.md 4096

          # Generate language-specific repo maps
          node apps/analyzer/dist/code-analyzer/repomap/cli.js . typescript-map.md 4096 text typescript
          node apps/analyzer/dist/code-analyzer/repomap/cli.js . python-map.md 4096 text python

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: repomap
          path: |
            repomap.md
            typescript-map.md
            python-map.md
```

## Frequently Asked Questions (FAQ)

- **Q: Why aren't some functions or classes shown in the map?**
  A: Repo Map ranks and filters symbols based on importance. If a symbol is not exported, not referenced by other files, and has low type weight, it may be considered secondary and not displayed. You can try lowering the `minImportance` threshold.

- **Q: Why is the output truncated?**
  A: This is controlled by the `maxTokens` parameter. To ensure output conciseness, new content stops being added when the token limit is reached. If you need a more complete map, please increase the `maxTokens` value or use `json` format output.

- **Q: Can I add support for new languages?**
  A: Absolutely. This requires updating the internal language mapping configuration and ensuring the corresponding Tree-sitter WASM parser is available. For details, please refer to the [Technical Guide](./repo-map-technical.md).

- **Q: How does the language filtering feature work?**
  A: When the `--language` parameter is specified, the tool only scans and analyzes files matching that language's file extensions. For example, `--language python` only processes `.py` and `.pyw` files. This greatly improves analysis efficiency for large multi-language projects.

- **Q: Can I specify multiple languages simultaneously?**
  A: The current version doesn't support specifying multiple languages simultaneously. If you need to analyze multiple languages, you can run the command multiple times separately, or omit the language parameter to analyze all supported languages.

---

Want to dive deeper into implementation details? Please read our [**Technical Guide (repo-map-technical.md)**](./repo-map-technical.md). 