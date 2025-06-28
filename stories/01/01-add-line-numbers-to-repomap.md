<!--
User: alienzhou
Date: 2025年 6月29日 星期日 00时57分15秒 CST
-->

# Story: 在仓库地图（RepoMap）中显示代码符号的行号范围

**作为** 一名开发者，
**我希望** `repomap` 的输出能够包含每个符号（如类、函数、方法等）的行号范围，
**以便于** 我可以快速定位到源代码中的相应位置，并更好地理解代码结构的布局。

---

## 功能与技术设计

### 目标

增强 `repomap` 生成器，使其能够为代码仓库中的每个符号（例如类、函数、接口等）显示其在源文件中的起始和结束行号。

### 实现方案

本次功能开发主要涉及对 `project-context-engine` 项目中 `analyzer` 应用的修改。核心改动分为三个部分：更新类型定义、增强代码解析器以提取行号、修改 `repomap` 生成器以格式化并展示行号。

#### 1. 类型定义扩展

为了在整个处理流程中传递行号信息，我们扩展了核心的数据结构：

- **`apps/analyzer/src/code-analyzer/type.ts`**:
  - `CodeNodeInfo` 类型被扩展，增加了可选的 `startLine` 和 `endLine` 属性，用于存储从代码文件中解析出的每个代码节点的起止行号。

- **`apps/analyzer/src/code-analyzer/repomap/index.ts`**:
  - `RepoMapSymbol` 接口同样增加了可选的 `endLine` 属性，以存储符号的结束行号（`line` 属性已存在，用于表示起始行号）。

#### 2. 代码解析器增强 (`parser`)

解析器是获取行号信息的关键。我们利用 `tree-sitter` 提供的AST（抽象语法树）中的节点位置信息。

- **`apps/analyzer/src/code-analyzer/parser/index.ts`**:
  - 在 `processFunction` 函数中，通过访问 `node.startPosition.row` 和 `node.endPosition.row` 来获取AST节点的起始和结束行。Tree-sitter 使用从0开始的行号，我们将其转换为从1开始的行号。
  - 此逻辑被应用于所有代码片段的创建环节，确保无论是普通函数、类方法还是Vue组件中的方法，都能正确提取行号范围。
  - 对 `extractHtmlElements` 及相关函数进行了修改，以便在解析HTML时也能传递行号信息，虽然最终输出格式未包含HTML行号，但数据链路已经打通。
  - 最终，`parseCodeFile` 函数返回的 `CodeNodeInfo[]` 数组中的每个对象都包含了准确的行号范围。

#### 3. RepoMap 输出格式化

最后一步是修改 `repomap` 的最终输出，将行号信息友好地展示出来。

- **`apps/analyzer/src/code-analyzer/repomap/index.ts`**:
  - `generateRepoMap` 函数在将 `codeNodes` 转换为 `RepoMapSymbol` 对象时，将解析出的 `startLine` 和 `endLine` 赋值给 `symbol` 对象。这修正了之前 `line` 属性被硬编码为 `1` 的问题。
  - `generateCleanSignature` 函数被更新，增加了行号格式化逻辑：
    - **单行符号**: 在签名后附加 `[L<line>]`，例如 `[L9]`。
    - **多行符号**: 在签名后附加 `[L<startLine>-<endLine>]`，例如 `[L24-65]`。
  - 这个行号范围字符串被添加到每个符号签名的末尾，使其在最终的 `repomap` 输出中清晰可见。

### 测试验证

我们通过在多种类型的示例项目上运行 `repomap` 生成器来验证功能：
- **Kotlin & TypeScript**: 测试结果显示，类、接口、函数和方法的行号范围都已成功并准确地显示在输出中。
- **HTML**: HTML元素的行号提取逻辑已添加，但在最终输出中暂未展示。这可以作为未来的一个优化点。

### 结论

通过以上修改，`repomap` 生成器现在可以提供精确到代码行的符号位置信息，极大地提升了开发者在大型代码库中定位和理解代码的效率。 