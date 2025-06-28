# Repo Map: 智能代码仓库地图生成器

`Repo Map` 是一个强大的静态代码分析工具，旨在为代码仓库生成一个简洁、智能的"地图"。它能提取出项目中最重要的类、函数和接口等符号，并以清晰的结构展示它们之间的关系，帮助开发者和AI快速理解代码库的核心结构。

其设计灵感来源于 [aider.chat](https://aider.chat/docs/repomap.html) 的理念，并通过更先进的分析和格式化功能进行了增强。

## 核心特性

- 🧠 **智能分析**：使用 Tree-sitter 精确解析代码，提取超过14种不同类型的符号（类、函数、枚举、接口等）。
- 📊 **重要性排序**：结合 PageRank 算法和多种启发式规则，智能评估文件和符号的重要性，优先展示核心代码。
- 🌍 **多语言支持**：全面支持 JavaScript, TypeScript, Python, Java, Go, C++, React 等多种主流编程语言和框架。
- 🎯 **Token 控制**：智能控制输出内容的长度，确保其能轻松适配各类大语言模型（LLM）的上下文窗口。
- 🎨 **可视化输出**：使用图标（如 🏛️, ⚡, 🔧）和修饰符（如 `[export]`, `[async]`）增强输出的可读性。
- ⚙️ **灵活配置**：提供丰富的配置选项，可自定义输出的详细程度和格式。
- 命令行与API：支持通过命令行（CLI）和程序化接口（API）两种方式使用，方便集成到各种工作流中。

## 支持的语言

| 语言 | 扩展名 | 支持状态 |
| :--- | :--- | :--- |
| JavaScript/TypeScript | .js, .ts, .jsx, .tsx, .mjs, .cjs | ✅ 完全支持 |
| Java | .java | ✅ 完全支持 |
| Kotlin | .kt, .kts | ✅ 完全支持 |
| Go | .go | ✅ 完全支持 |
| C/C++ | .c, .cpp, .h, .hpp, .cc, .cxx | ✅ 完全支持 |
| Python | .py, .pyw | ✅ 完全支持 |
| React | .jsx, .tsx | ✅ 完全支持 |
| Rust | .rs | ✅ 完全支持 |
| Swift | .swift | ✅ 完全支持 |
| C# | .cs | ✅ 完全支持 |
| Shell | .sh, .bash | ✅ 基本支持 |
| 配置 | .json, .yaml | ✅ 基本支持 |

## 快速上手

### 1. 安装与构建

首先，请确保您已安装 `pnpm`。

```bash
# 在项目根目录安装依赖
pnpm install

# 构建项目
pnpm build
```

### 2. 使用方法

#### 命令行 (CLI)

你可以通过 CLI 快速为任何项目生成 Repo Map。

```bash
# 基本用法：为指定目录生成 repo map，并打印到控制台
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo>

# 保存到文件
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo> repomap.md

# 控制 token 数量
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo> repomap.md 2048

# 生成 JSON 格式输出
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo> repomap.json 4096 json
```

#### 程序化接口 (API)

将 Repo Map 功能集成到你自己的工具或服务中也非常简单。

```typescript
import { generateRepoMap } from './apps/analyzer/src/code-analyzer/repomap';
// 注意：请根据你的项目结构调整导入路径

async function main() {
  const result = await generateRepoMap('./path/to/your/repo', {
    maxTokens: 2048,
  });

  console.log(result.map);

  // 也可以访问详细的结构化数据
  // console.log(JSON.stringify(result.files, null, 2));
}

main();
```

## 输出示例 (文本格式)

以下是我们刚刚生成的 `test-multilang` 目录的 Repo Map 示例，展示了其丰富的可视化输出：

```
javascript/userService.js:
⋮...
│🏛️ class UserService { } [export]
│  🔧 update(id, updates) { }
│  🔧 _validateUser(user) { }
│  🔧 create(userData) { }
│  🔧 findById(id) { }
│  🔧 delete(id) { }
⋮...
│🏛️ class EventEmitter { }
│  🔧 on(event, listener) { }
│  🔧 emit(event, ...args) { }
│  🔧 off(event, listenerToRemove) { }
⋮...
│⚡ function withRetry(fn, maxRetries = 3, delay = 1000) { }

typescript/UserService.ts:
⋮...
│🏛️ class UserService { }
│  🔧 findById(id: number) { }
│  🔧 save(user: User) { }
│  🔧 delete(id: number) { }
⋮...
│⚡🔄 async function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  maxRetries: number = 3
) { } [export]

react/UserCard.tsx:
⋮...
│⚡ function useUserActions(user: User, onEdit?: (user: User) => void, onDelete?: (userId: number) => void) { }
⋮...
│⚡ StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => { }
```

## 配置选项

你可以通过 `RepoMapOptions` 对象自定义生成过程。

```typescript
interface RepoMapOptions {
  maxTokens?: number;        // 最大token数，默认1024
  includeTypes?: boolean;    // 是否包含类型定义，默认true
  includeVariables?: boolean; // 是否包含变量，默认false
  minImportance?: number;    // 显示符号的最小重要性阈值，默认0.5
  rootPath: string;         // 要分析的仓库根目录路径
}
```

## 最佳实践

### 控制输出大小

- 对于大型项目，适当增加 `maxTokens` 以获取更完整的视图。
- 对于快速概览或小型项目，可以使用较小的 `maxTokens` (如 512 或 1024)。

### 过滤符号

- `minImportance`: 提高此阈值可以过滤掉不那么重要的符号，只关注核心逻辑。
- `includeVariables`: 如果你关心常量或全局变量的定义，可以将其设为 `true`。

### 集成到 CI/CD

你可以将 Repo Map 生成步骤添加到你的 CI/CD 流程中，以便每次代码变更时自动更新项目的地图。

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
        run: node apps/analyzer/dist/code-analyzer/repomap/cli.js . repomap.md 4096

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: repomap
          path: repomap.md
```

## 常见问题 (FAQ)

- **Q: 为什么某些函数或类没有在地图中显示?**
  A: Repo Map 会基于重要性对符号进行排序和过滤。如果一个符号没有被导出，没有被其他文件引用，且本身类型权重不高，它可能被认为是次要的而不显示。你可以尝试调低 `minImportance` 阈值。

- **Q: 输出结果为什么被截断了?**
  A: 这是由 `maxTokens` 参数控制的。为了保证输出的简洁性，当达到 token 限制时会停止添加新内容。如果需要更完整的地图，请增大 `maxTokens` 的值或使用 `json` 格式输出。

- **Q: 我可以添加对新语言的支持吗?**
  A: 当然可以。这需要更新内部的语言映射配置，并确保相应的 Tree-sitter WASM 解析器可用。详情请参考[技术指南](./REPO-MAP-TECHNICAL.md)。

---
想深入了解实现细节？请阅读我们的 [**技术指南 (REPO-MAP-TECHNICAL.md)**](./REPO-MAP-TECHNICAL.md)。 