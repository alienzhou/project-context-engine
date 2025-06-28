# Repo Map 生成器技术手册

本手册详细介绍了 Repo Map 生成器的内部实现、核心算法和技术架构，旨在为希望深入理解、扩展或自定义此工具的开发者提供指导。

## 1. 技术架构

Repo Map 的生成过程由一系列协同工作的组件完成，确保了分析的准确性、高效性和可扩展性。

```mermaid
graph TD
    subgraph "输入 (Input)"
        A[代码仓库]
    end

    subgraph "分析流程 (Analysis Pipeline)"
        B[1. 文件扫描器] --> C[2. 符号提取器]
        C --> D[3. 依赖分析器]
        D --> E[4. 重要性计算]
        E --> F[5. 格式化输出]
    end

    subgraph "核心技术 (Core Technologies)"
        G[Tree-sitter 解析器] --> C
        H[语言配置] --> G
        I[PageRank 算法] --> E
        J[Token 控制器] --> F
    end

    subgraph "输出 (Output)"
        K[Repo Map (文本/JSON)]
    end

    A --> B
    F --> K
```

### 核心组件

1.  **文件扫描器 (File Scanner)**：递归遍历代码库，基于可配置的规则（如忽略 `node_modules`, `.git` 等）过滤文件，并识别支持的语言类型。
2.  **符号提取器 (Symbol Extractor)**：系统的核心。它利用 Tree-sitter 将源代码解析成抽象语法树（AST），然后遍历 AST 以提取所有相关的代码符号。
3.  **依赖分析器 (Dependency Analyzer)**：通过正则表达式和语法分析，解析文件中的 `import` 和 `export` 语句，构建文件间的依赖关系图。
4.  **重要性计算 (Importance Calculator)**：这是 Repo Map 智能化的关键。它分两步计算：
    - **文件重要性 (PageRank)**：将文件依赖图视为一个网络，运行 PageRank 算法计算每个文件的权重。
    - **符号重要性**：基于符号的类型、修饰符（如 `export`, `static`）、名称模式、被引用情况以及所在文件的 PageRank 权重，综合计算出每个符号的重要性分数。
5.  **格式化输出 (Formatter)**：根据计算出的重要性对文件和符号进行排序，并按照预设的格式（文本或JSON）生成最终的 Repo Map，同时通过 Token 控制器确保输出内容不超过指定长度。

## 2. 核心数据结构

为了清晰地表示代码结构，我们定义了以下核心数据结构：

```typescript
// 代表一个代码符号（函数、类、方法等）
export interface RepoMapSymbol {
  name: string;
  // 详细的符号类型
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
  signature: string; // 符号的完整签名
  line: number;
  importance: number; // 计算出的重要性分数
  modifiers?: string[]; // 如: ['static', 'async', 'export']
  returnType?: string;
  parameters?: string[];
}

// 代表一个代码文件
export interface RepoMapFile {
  filepath: string; // 绝对路径
  relativePath: string; // 相对路径
  symbols: RepoMapSymbol[]; // 文件中包含的符号
  imports: string[]; // 导入的模块
  exports: string[]; // 导出的符号名
}

// 生成器的配置选项
export interface RepoMapOptions {
  maxTokens?: number;
  includeTypes?: boolean;
  includeVariables?: boolean;
  minImportance?: number;
  rootPath: string;
}

// 最终返回结果
export interface RepoMapResult {
  files: RepoMapFile[];
  totalSymbols: number;
  estimatedTokens: number;
  map: string; // 格式化后的地图字符串
}
```

## 3. 算法详解

### 3.1 符号类型检测 (`detectSymbolType`)

为了实现精细化的输出和重要性计算，我们使用了一套基于关键字和代码模式的规则来检测符号类型。

```typescript
function detectSymbolType(signature: string): RepoMapSymbol['type'] {
  const sig = signature.trim().toLowerCase();

  // 规则示例
  if (sig.includes('class ')) return 'class';
  if (sig.includes('interface ')) return 'interface';
  if (sig.includes('enum ')) return 'enum';
  if (sig.includes('constructor')) return 'constructor';
  if (sig.includes('static ') && sig.includes('function')) return 'static_method';
  if (sig.includes('async ') && sig.includes('function')) return 'async_function';
  if (sig.includes('get ') && sig.includes('(')) return 'getter';
  if (sig.includes('function ') || sig.includes('func ')) return 'function';
  if (sig.match(/^[A-Z_][A-Z0-9_]*$/)) return 'constant'; // 全大写命名 -> 常量

  return 'variable'; // 默认类型
}
```

### 3.2 文件优先级计算 (`calculateFilePriority`)

在格式化输出时，我们首先对文件进行排序，确保最重要的文件出现在最前面。

```typescript
function calculateFilePriority(file: RepoMapFile): number {
  let priority = 0;
  const path = file.relativePath.toLowerCase();

  // 路径规则
  if (path.includes('test') || path.includes('spec')) priority -= 10;
  if (path.includes('config')) priority -= 5;
  if (path.includes('src/') || path.includes('lib/')) priority += 5;
  if (path.includes('index') || path.includes('main')) priority += 8;

  // 内容规则
  const totalImportance = file.symbols.reduce((sum, s) => sum + s.importance, 0);
  priority += Math.min(totalImportance / 10, 20); // 基于符号总重要性
  priority += Math.min(file.exports.length * 2, 10); // 基于导出数量

  return priority;
}
```

### 3.3 符号重要性计算 (`calculateImportance`)

这是确保 Repo Map "智能"的核心算法，它综合了多种因素。

```typescript
function calculateImportance(
  symbol: RepoMapSymbol,
  fileInfo: RepoMapFile,
  allFiles: RepoMapFile[]
): number {
  let score = 0;

  // 1. 基础类型权重
  const typeScores = { class: 25, interface: 20, enum: 18 /* ... */ };
  score += typeScores[symbol.type] || 4;

  // 2. 修饰符加分
  if (symbol.modifiers) {
    if (symbol.modifiers.includes('export')) score += 5;
    if (symbol.modifiers.includes('static')) score += 3;
    if (symbol.modifiers.includes('async')) score += 2;
  }

  // 3. 导出状态加分（兜底）
  if (fileInfo.exports.includes(symbol.name)) {
    score += 8;
  }

  // 4. 被引用加分
  const referencedByCount = allFiles.filter(f =>
    f.imports.some(imp => imp.includes(fileInfo.relativePath.replace(/\.[^.]+$/, '')))
  ).length;
  score += referencedByCount * 2;

  // 5. 名称模式匹配
  const name = symbol.name.toLowerCase();
  if (name.includes('init') || name.includes('setup')) score += 3;
  if (name.includes('test') || name.includes('spec')) score -= 2; // 测试代码降权

  // 6. 参数数量加分
  if (symbol.parameters) {
    score += Math.min(symbol.parameters.length * 0.5, 3);
  }

  return Math.max(score, 0); // 确保分数不为负
}
```

_注意：上述 PageRank 计算的文件权重会作为乘数应用在最终的符号重要性分数上。_

## 4. 扩展与自定义

### 添加新语言支持

1.  **更新语言映射**：在 `apps/analyzer/src/code-analyzer/parser/index.ts` 的 `languageMap` 对象中添加新的文件扩展名和对应的 Tree-sitter 语言名称。
    ```typescript
    const languageMap: Record<string, string> = {
      // ...
      rb: 'ruby',
      ex: 'elixir', // 新增
    };
    ```
2.  **添加WASM解析器**：确保 `tree-sitter-wasms` 包支持该语言，或者手动提供对应的 `.wasm` 解析文件。
3.  **优化符号提取**：如有必要，在 `extractCodeSnippets` 或 `processFunction` 中为新语言添加特定的节点类型处理逻辑，以提高解析精度。

### 自定义输出格式

你可以通过修改 `formatRepoMap` 函数来改变输出的结构和风格。例如，可以实现一个输出 Mermaid `graph` 图的格式化器。

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
  // ... 添加依赖连线 ...
  return mermaidStr;
}
```

## 5. 性能优化策略

- **并发解析**：文件解析是I/O和CPU密集型操作，通过 `Promise.all` 实现并行处理可以显著提升大规模代码库的分析速度。
- **解析器缓存**：已加载的 Tree-sitter 语言解析器会被缓存，避免对同一语言重复加载和初始化 WASM 文件。
- **降级解析**：当特定语言（如 `tsx`）的解析器不可用时，系统会尝试使用其父语言（如 `javascript`）的解析器进行降级处理，以提高兼容性。
- **智能截断**：在格式化输出时，会实时计算已生成的 token 数量，一旦超出预算，将立即停止添加新内容，避免不必要的计算。

---

返回 [**用户指南 (repo-map.md)**](./repo-map.md)。
