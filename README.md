# Project Context Engine

An AI-powered project context analysis engine for codebase analysis, documentation generation, and Markdown rendering.

> 🎨 **Special Note**: This project is entirely built using the **Vibe Coding** approach

## 🌐 Languages / 语言支持

- **English** (Default): This README
- **中文**: [README.zh.md](README.zh.md)

## 🚀 Features

### 📊 Code Analyzer

- **Intelligent Code Analysis**: Analyze codebase structure and functionality using AI technology
- **Automatic Documentation Generation**: Generate project summaries, API documentation, and code explanations
- **Repository Map**: Create symbol mapping diagrams of codebases for easy project structure understanding
- **Language Filtering**: Support specifying particular languages for analysis, improving analysis efficiency and precision
- **Multi-language Support**: Support TypeScript, JavaScript, Python, Java, Go, C++, and other programming languages
- **Tree-sitter Parsing**: Use Tree-sitter for precise syntax analysis

### 🎨 Markdown Renderer

- **High-quality Rendering**: Render Markdown files into beautiful HTML
- **Mermaid Chart Support**: Support flowcharts, sequence diagrams, class diagrams, and other chart types
- **Theme Switching**: Support both dark and light theme modes
- **Batch Processing**: Support batch rendering of multiple files
- **Code Highlighting**: Built-in syntax highlighting functionality

## 🛠 Tech Stack

- **TypeScript**: Type-safe JavaScript development
- **pnpm**: Efficient package management and monorepo support
- **Tree-sitter**: Precise code syntax analysis
- **AI SDK**: Integration with multiple AI services (Amazon Bedrock, Azure)
- **Mermaid**: Chart and flowchart rendering
- **Winston**: Logging management

## 📦 Project Structure

```
project-context-engine/
├── apps/
│   ├── analyzer/           # 🔍 Code Analyzer
│   │   ├── src/
│   │   │   ├── code-analyzer/
│   │   │   │   ├── agent/     # AI agent functionality
│   │   │   │   ├── parser/    # Code parser
│   │   │   │   ├── reading/   # Code reading analysis
│   │   │   │   ├── repomap/   # Repository mapping generation
│   │   │   │   ├── structure/ # Project structure analysis
│   │   │   │   └── summary/   # Code summarization functionality
│   │   │   └── utils/         # Utility functions
│   │   └── processed/         # Analysis result output
│   └── render/             # 🎨 Markdown Renderer
│       ├── src/
│       ├── data/              # Markdown source files
│       └── scripts/           # Rendering scripts
├── packages/
│   └── common/             # 📚 Shared codebase
├── test-multilang/         # 🧪 Multi-language test cases
├── docs/                   # 📖 Documentation
│   ├── en/                 # English documentation
│   └── zh/                 # Chinese documentation
└── ...
```

## 🚀 Quick Start

### Install Dependencies

```bash
pnpm install
```

### Build Project

```bash
# Build entire project
pnpm build

# Build specific packages separately
pnpm build:common    # Build shared package
pnpm build:analyzer  # Build code analyzer
```

### Run Code Analyzer

```bash
# Start code analyzer
pnpm start

# Development mode
pnpm dev
```

### Use Markdown Renderer

```bash
# Enter renderer directory
cd apps/render

# Render single file
npm run render

# Render all files
npm run render:all

# Render with light theme
npm run render:all:light
```

## 📋 Available Scripts

### Global Scripts

```bash
pnpm build          # Build all packages
pnpm dev            # Development mode
pnpm test           # Run tests
pnpm typecheck      # TypeScript type checking
pnpm lint           # Code linting
pnpm format         # Code formatting
pnpm clean          # Clean build files
```

### Code Analyzer Specific

```bash
pnpm start                              # Start analyzer
cd apps/analyzer && pnpm test-repomap  # Test repository mapping functionality

# Repository Map language filtering functionality
cd apps/analyzer
node dist/code-analyzer/repomap/cli.js <directory> --language python    # Analyze only Python files
node dist/code-analyzer/repomap/cli.js <directory> -l typescript        # Analyze only TypeScript files
node test-repomap.js --language java                                    # Test specific language
```

## 🔧 Development Guide

### Add Dependencies

Use pnpm workspace to add dependencies for specific packages:

```bash
# Add dependency for analyzer
pnpm --filter @project-context-engine/analyzer add <dependency>

# Add dependency for renderer
pnpm --filter @project/render add <dependency>

# Add dependency for shared package
pnpm --filter @project-context-engine/common add <dependency>
```

### Run Package-specific Scripts

```bash
pnpm --filter <package-name> <script>
```

### Dependencies

The project uses workspace protocol to manage internal dependencies:

```json
{
  "dependencies": {
    "@project-context-engine/common": "workspace:*"
  }
}
```

## 🌟 Key Features

### Intelligent Code Analysis

- Automatically identify project architecture and design patterns
- Generate detailed code documentation and explanations
- Create project structure trees and dependency relationship diagrams

### AI-driven Documentation Generation

- Leverage large language models to understand code logic
- Automatically generate README, API documentation
- Provide code improvement suggestions

### Multi-format Output

- Markdown format analysis reports
- HTML format visualization documentation
- JSON format structured data

## 📚 Documentation

The project supports bilingual documentation in Chinese and English:

- **English Documentation**: [docs/en/README.md](docs/en/README.md)
- **中文文档**: [docs/zh/README.md](docs/zh/README.md)

### Detailed Documentation

- **Code Analyzer Documentation**: [docs/en/analyzer/](docs/en/analyzer/)
  - [Repo Map User Guide](docs/en/analyzer/repo-map.md)
  - [Technical Manual](docs/en/analyzer/repo-map-technical.md)
  - [Test Guide](docs/en/analyzer/repo-map-test-guide.md)

- **Markdown Renderer Documentation**: [docs/en/render/README.md](docs/en/render/README.md)

- **Multi-language Test Cases**: [docs/en/test-multilang/README.md](docs/en/test-multilang/README.md)

## 📄 License

ISC License

## 🤝 Contributing

Welcome to submit Issues and Pull Requests to help improve the project.

---

**Project Context Engine** - Making code analysis and documentation generation simple and efficient 🚀
