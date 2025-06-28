# Repo Map: 智能代码仓库地图生成器

`Repo Map` 是一个强大的静态代码分析工具，旨在为代码仓库生成一个简洁、智能的"地图"。它能提取出项目中最重要的类、函数和接口等符号，并以清晰的结构展示它们之间的关系，帮助开发者和AI快速理解代码库的核心结构。

其设计灵感来源于 [aider.chat](https://aider.chat/docs/repomap.html) 的理念，并通过更先进的分析和格式化功能进行了增强。

## 核心特性

- 🧠 **智能分析**：使用 Tree-sitter 精确解析代码，提取超过14种不同类型的符号（类、函数、枚举、接口等）。
- 📊 **重要性排序**：结合 PageRank 算法和多种启发式规则，智能评估文件和符号的重要性，优先展示核心代码。
- 🌍 **多语言支持**：全面支持 JavaScript, TypeScript, Python, Java, Go, C++, React 等多种主流编程语言和框架。
- 🎯 **语言过滤**：支持指定特定语言进行分析，提高大型多语言项目的分析效率和精度。
- 🎯 **Token 控制**：智能控制输出内容的长度，确保其能轻松适配各类大语言模型（LLM）的上下文窗口。
- 🎨 **可视化输出**：使用图标（如 🏛️, ⚡, 🔧）和修饰符（如 `[export]`, `[async]`）增强输出的可读性。
- ⚙️ **灵活配置**：提供丰富的配置选项，可自定义输出的详细程度和格式。
- 🖥️ **命令行与API**：支持通过命令行（CLI）和程序化接口（API）两种方式使用，方便集成到各种工作流中。

## 支持的语言

| 语言                  | 扩展名                           | 支持状态    |
| :-------------------- | :------------------------------- | :---------- |
| JavaScript/TypeScript | .js, .ts, .jsx, .tsx, .mjs, .cjs | ✅ 完全支持 |
| Java                  | .java                            | ✅ 完全支持 |
| Kotlin                | .kt, .kts                        | ✅ 完全支持 |
| Go                    | .go                              | ✅ 完全支持 |
| C/C++                 | .c, .cpp, .h, .hpp, .cc, .cxx    | ✅ 完全支持 |
| Python                | .py, .pyw                        | ✅ 完全支持 |
| React                 | .jsx, .tsx                       | ✅ 完全支持 |
| Rust                  | .rs                              | ✅ 完全支持 |
| Swift                 | .swift                           | ✅ 完全支持 |
| C#                    | .cs                              | ✅ 完全支持 |
| Shell                 | .sh, .bash                       | ✅ 基本支持 |
| 配置                  | .json, .yaml                     | ✅ 基本支持 |

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

##### 基本用法

```bash
# 基本用法：为指定目录生成 repo map，并打印到控制台
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo>

# 显示帮助信息
node apps/analyzer/dist/code-analyzer/repomap/cli.js --help
```

##### 新功能：语言过滤 🎯

现在支持指定特定语言进行分析，大大提高了大型多语言项目的分析效率：

```bash
# 只分析 Python 文件
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo> --language python

# 只分析 TypeScript 文件（使用简写参数）
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo> -l typescript

# 只分析 Java 文件并保存到文件
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo> -l java -o java-map.md

# 分析 Go 文件，设置更大的 token 限制，输出 JSON 格式
node apps/analyzer/dist/code-analyzer/repomap/cli.js <path/to/your/repo> -l go -t 4096 -f json
```

##### 支持的语言参数

```
javascript, typescript, python, java, kotlin, cpp, c, go, rust, swift,
scala, csharp, ruby, php, lua, bash, html, css, vue, json, yaml, xml
```

##### 完整参数列表

```bash
# 完整的参数格式
node apps/analyzer/dist/code-analyzer/repomap/cli.js <input-dir> [选项]

选项:
  -l, --language <lang>     指定要分析的语言 (可选)
  -o, --output <file>       输出文件路径 (可选)
  -t, --max-tokens <num>    最大 token 数量 (默认: 1024)
  -f, --format <format>     输出格式: text | json (默认: text)
  -h, --help                显示帮助信息
```

##### 传统用法（向后兼容）

```bash
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
  // 基本用法
  const result = await generateRepoMap('./path/to/your/repo', {
    maxTokens: 2048,
  });

  console.log(result.map);

  // 使用语言过滤 - 只分析 Python 文件
  const pythonResult = await generateRepoMap('./path/to/your/repo', {
    maxTokens: 2048,
    language: 'python',
  });

  console.log('Python 文件分析结果:');
  console.log(pythonResult.map);

  // 也可以访问详细的结构化数据
  // console.log(JSON.stringify(result.files, null, 2));
}

main();
```

## 输出示例 (文本格式)

以下是基于 `test-multilang` 目录生成的 Repo Map 示例，展示了其丰富的可视化输出：

### 完整项目分析 (所有语言)

```
react/UserCard.tsx:
⋮...
│⚡ function useUserActions(user: User, onEdit?: (user: User) => void, onDelete?: (userId: number) => void)
 { } [L26-38]
⋮...
│⚡ StatusBadge: React.FC< { } [L41-55]

javascript/user.js:
⋮...
│🏛️ class User { { } [L17-112]
    │  ⚡ fromJSON(data) { } [L34-43]
    │  ⚡ hasRole(role) { } [L68-70]
    │  ⚡ userRole(role) { } [L101-107]
    │  ⚡ createGuest() { } [L28-32]
    │  ⚡ isValidEmail() { } [L45-47]
    │  ⚡ getDisplayName() { } [L49-51]
    │  ⚡ activate() { } [L53-56]
    │  ⚡ deactivate() { } [L58-61]
⋮...
│⚡ function createUser(userData) { } [L115-126]
⋮...
│⚡ function loadUserData(userId) { } [L179-195]

javascript/userService.js:
⋮...
│🏛️ class UserService { { } [export] [L28-301]
    │  ⚡ exportData() { } [export] [L247-254]
    │  ⚡ _log(message, data = null) { } [L46-50]
    │  ⚡ update(id, updates) { } [L147-172]
    │  ⚡ _validateUser(user) { } [L52-56]
    │  ⚡ create(userData) { } [L58-93]
    │  ⚡ findById(id) { } [L95-104]
    │  ⚡ findAll(filter = { } [L106-145]
    │  ⚡ delete(id) { } [L174-196]
⋮...
│🏛️ class EventEmitter { { } [L4-26]
    │  ⚡ on(event, listener) { } [L9-14]
    │  ⚡ emit(event, ...args) { } [L16-20]
    │  ⚡ off(event, listenerToRemove) { } [L22-25]
⋮...
│⚡ function withRetry(fn, maxRetries = 3, delay = 1000) { } [L319-336]

typescript/UserService.ts:
⋮...
│🏛️ class UserService { { } [L28-138]
    │  ⚡ findById(id: number) { } [L38-48]
    │  ⚡ save(user: User) { } [L51-67]
    │  ⚡ delete(id: number) { } [L70-76]
    │  ⚡ findByFilter(filter: UserFilter) { } [L82-100]
    │  ⚡ bulkCreate(userData: Partial<IUser>[]) { } [L106-124]
⋮...
│⚡ function withRetry(
  fn: T,
  maxRetries: number = 3
) { } [L152-171]
```

### 语言过滤示例

#### Python 专项分析 (`--language python`)

```
python/utils.py:
⋮...
│🏛️ class ConfigManager: { } [L124-182]
⋮...
│🔧 def parse_config_file(file_path: str) -> Dict: { } [L45-61]
⋮...
│🔧 batch_process(items: List, batch_size: int = 100, 
                 processor: Callable = None) { } [L64-76]

python/user_service.py:
⋮...
│🏛️ class UserService: { } [L21-103]
⋮...
│⚡🔄 async def async_process_users(users: List[User]) -> Dict[str, int]: { } [async] [L114-129]
⋮...
│🔧 def initialize_service(db_config: Dict[str, Any]) -> UserService: { } [L107-111]

python/user.py:
⋮...
│🏛️ class User: { } [static] [L8-45]
⋮...
│🔧 def get_users_by_status(users: List[User], is_active: bool = True) -> List[User]: { } [L57-59]
⋮...
│🔧 def create_admin_user(username: str) -> User: { } [L48-54]
```

#### TypeScript 专项分析 (`--language typescript`)

```
react/UserCard.tsx:
⋮...
│⚡ function useUserActions(user: User, onEdit?: (user: User) => void, onDelete?: (userId: number) => void)
 { } [L26-38]
⋮...
│⚡ StatusBadge: React.FC< { } [L41-55]

typescript/UserService.ts:
⋮...
│🏛️ class UserService { { } [L28-138]
    │  ⚡ findById(id: number) { } [L38-48]
    │  ⚡ save(user: User) { } [L51-67]
    │  ⚡ delete(id: number) { } [L70-76]
    │  ⚡ findByFilter(filter: UserFilter) { } [L82-100]
    │  ⚡ bulkCreate(userData: Partial<IUser>[]) { } [L106-124]
    │  ⚡ findAll() { } [L78-80]
    │  ⚡ count() { } [L102-104]
    │  ⚡ clearCache() { } [L126-128]
⋮...
│⚡ function withRetry(
  fn: T,
  maxRetries: number = 3
) { } [L152-171]
⋮...
│⚡ function createUserService(options?: Partial<UserServiceConfig>) { } [L141-149]

typescript/User.ts:
⋮...
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

### 符号图标含义

- 🏛️ **类/接口** - 核心业务对象
- ⚡ **函数/方法** - 功能实现
- 🏗️ **构造函数** - 对象初始化
- 🔧 **工具函数** - 辅助功能
- 📋 **类型定义** - 数据结构
- 🏷️ **标签/枚举** - 常量定义
- 📦 **模板元素** - UI 组件
- 🔄 **异步函数** - 异步操作
- `[export]` - 导出符号
- `[static]` - 静态成员
- `[async]` - 异步标记
- `[L26-38]` - 行号范围

## 配置选项

你可以通过 `RepoMapOptions` 对象自定义生成过程。

```typescript
interface RepoMapOptions {
  maxTokens?: number; // 最大token数，默认1024
  includeTypes?: boolean; // 是否包含类型定义，默认true
  includeVariables?: boolean; // 是否包含变量，默认false
  minImportance?: number; // 显示符号的最小重要性阈值，默认0.5
  language?: string; // 🆕 指定要分析的语言，不指定则分析所有支持的语言
  rootPath: string; // 要分析的仓库根目录路径
}
```

### 语言过滤配置详解

`language` 参数支持以下值：

| 语言       | 参数值       | 支持的文件扩展名                                    |
| ---------- | ------------ | --------------------------------------------------- |
| JavaScript | `javascript` | `.js`, `.mjs`, `.cjs`, `.jsx`                       |
| TypeScript | `typescript` | `.ts`, `.tsx`                                       |
| Python     | `python`     | `.py`, `.pyw`                                       |
| Java       | `java`       | `.java`                                             |
| Kotlin     | `kotlin`     | `.kt`, `.kts`                                       |
| C++        | `cpp`        | `.cpp`, `.cc`, `.cxx`, `.c++`, `.h`, `.hpp`, `.hxx` |
| C          | `c`          | `.c`, `.h`                                          |
| Go         | `go`         | `.go`                                               |
| Rust       | `rust`       | `.rs`                                               |
| Swift      | `swift`      | `.swift`                                            |
| Scala      | `scala`      | `.scala`                                            |
| C#         | `csharp`     | `.cs`                                               |
| Ruby       | `ruby`       | `.rb`                                               |
| PHP        | `php`        | `.php`                                              |
| Lua        | `lua`        | `.lua`                                              |
| Bash       | `bash`       | `.sh`, `.bash`, `.zsh`                              |
| HTML       | `html`       | `.html`, `.htm`                                     |
| CSS        | `css`        | `.css`, `.scss`, `.sass`                            |
| Vue        | `vue`        | `.vue`                                              |
| JSON       | `json`       | `.json`                                             |
| YAML       | `yaml`       | `.yaml`, `.yml`                                     |
| XML        | `xml`        | `.xml`                                              |

## 最佳实践

### 控制输出大小

- 对于大型项目，适当增加 `maxTokens` 以获取更完整的视图。
- 对于快速概览或小型项目，可以使用较小的 `maxTokens` (如 512 或 1024)。

### 语言过滤策略 🎯

- **大型多语言项目**: 使用 `--language` 参数专注于特定技术栈，避免信息过载。
- **微服务架构**: 为每个服务的主要语言生成独立的 repo map。
- **代码审查**: 只分析变更相关的语言，提高审查效率。
- **文档生成**: 为不同语言的开发者生成专门的项目地图。

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
        run: |
          # 生成完整的 repo map
          node apps/analyzer/dist/code-analyzer/repomap/cli.js . repomap.md 4096

          # 生成特定语言的 repo map
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

## 常见问题 (FAQ)

- **Q: 为什么某些函数或类没有在地图中显示?**
  A: Repo Map 会基于重要性对符号进行排序和过滤。如果一个符号没有被导出，没有被其他文件引用，且本身类型权重不高，它可能被认为是次要的而不显示。你可以尝试调低 `minImportance` 阈值。

- **Q: 输出结果为什么被截断了?**
  A: 这是由 `maxTokens` 参数控制的。为了保证输出的简洁性，当达到 token 限制时会停止添加新内容。如果需要更完整的地图，请增大 `maxTokens` 的值或使用 `json` 格式输出。

- **Q: 我可以添加对新语言的支持吗?**
  A: 当然可以。这需要更新内部的语言映射配置，并确保相应的 Tree-sitter WASM 解析器可用。详情请参考[技术指南](./REPO-MAP-TECHNICAL.md)。

- **Q: 语言过滤功能如何工作？**
  A: 当指定 `--language` 参数时，工具只会扫描和分析匹配该语言的文件扩展名。例如，`--language python` 只会处理 `.py` 和 `.pyw` 文件。这大大提高了大型多语言项目的分析效率。

- **Q: 可以同时指定多个语言吗？**
  A: 目前版本不支持同时指定多个语言。如果需要分析多个语言，可以分别运行多次命令，或者不指定语言参数来分析所有支持的语言。

---

想深入了解实现细节？请阅读我们的 [**技术指南 (REPO-MAP-TECHNICAL.md)**](./REPO-MAP-TECHNICAL.md)。
