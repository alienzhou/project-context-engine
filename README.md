# Project Context Engine

一个基于 AI 的项目上下文分析引擎，用于代码库分析、文档生成和 Markdown 渲染。

> 🎨 **特别说明**: 本项目完全采用 **Vibe Coding** 开发方式构建

## 🚀 功能特性

### 📊 代码分析器 (Analyzer)
- **智能代码分析**: 使用 AI 技术分析代码库结构和功能
- **自动文档生成**: 生成项目总结、API 文档和代码说明
- **Repository Map**: 创建代码库的符号映射图，便于理解项目结构
- **多语言支持**: 支持 TypeScript、JavaScript、Python、Java、Go、C++ 等多种编程语言
- **Tree-sitter 解析**: 使用 Tree-sitter 进行精确的语法分析

### 🎨 Markdown 渲染器 (Render)
- **高质量渲染**: 将 Markdown 文件渲染为美观的 HTML
- **Mermaid 图表支持**: 支持流程图、序列图、类图等多种图表类型
- **主题切换**: 支持明暗两种主题模式
- **批量处理**: 支持批量渲染多个文件
- **代码高亮**: 内置语法高亮功能

## 🛠 技术栈

- **TypeScript**: 类型安全的 JavaScript 开发
- **pnpm**: 高效的包管理和 monorepo 支持
- **Tree-sitter**: 精确的代码语法分析
- **AI SDK**: 集成多种 AI 服务 (Amazon Bedrock, Azure)
- **Mermaid**: 图表和流程图渲染
- **Winston**: 日志管理

## 📦 项目结构

```
project-context-engine/
├── apps/
│   ├── analyzer/           # 🔍 代码分析器
│   │   ├── src/
│   │   │   ├── code-analyzer/
│   │   │   │   ├── agent/     # AI 代理功能
│   │   │   │   ├── parser/    # 代码解析器
│   │   │   │   ├── reading/   # 代码阅读分析
│   │   │   │   ├── repomap/   # 仓库映射生成
│   │   │   │   ├── structure/ # 项目结构分析
│   │   │   │   └── summary/   # 代码总结功能
│   │   │   └── utils/         # 工具函数
│   │   └── processed/         # 分析结果输出
│   └── render/             # 🎨 Markdown 渲染器
│       ├── src/
│       ├── data/              # Markdown 源文件
│       └── scripts/           # 渲染脚本
├── packages/
│   └── common/             # 📚 共享代码库
├── test-multilang/         # 🧪 多语言测试用例
└── ...
```

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 构建项目

```bash
# 构建整个项目
pnpm build

# 单独构建特定包
pnpm build:common    # 构建共享包
pnpm build:analyzer  # 构建代码分析器
```

### 运行代码分析器

```bash
# 启动代码分析器
pnpm start

# 开发模式
pnpm dev
```

### 使用 Markdown 渲染器

```bash
# 进入渲染器目录
cd apps/render

# 渲染单个文件
npm run render

# 渲染所有文件
npm run render:all

# 使用浅色主题渲染
npm run render:all:light
```

## 📋 可用脚本

### 全局脚本

```bash
pnpm build          # 构建所有包
pnpm dev            # 开发模式
pnpm test           # 运行测试
pnpm typecheck      # TypeScript 类型检查
pnpm lint           # 代码检查
pnpm format         # 代码格式化
pnpm clean          # 清理构建文件
```

### 代码分析器专用

```bash
pnpm start                    # 启动分析器
cd apps/analyzer && pnpm test-repomap  # 测试仓库映射功能
```

## 🔧 开发指南

### 添加依赖

使用 pnpm workspace 为特定包添加依赖：

```bash
# 为分析器添加依赖
pnpm --filter @project-context-engine/analyzer add <dependency>

# 为渲染器添加依赖  
pnpm --filter @project/render add <dependency>

# 为共享包添加依赖
pnpm --filter @project-context-engine/common add <dependency>
```

### 运行特定包的脚本

```bash
pnpm --filter <package-name> <script>
```

### 依赖关系

项目使用 workspace 协议管理内部依赖：

```json
{
  "dependencies": {
    "@project-context-engine/common": "workspace:*"
  }
}
```

## 🌟 主要特性

### 智能代码分析
- 自动识别项目架构和设计模式
- 生成详细的代码文档和说明
- 创建项目结构树和依赖关系图

### AI 驱动的文档生成
- 利用大语言模型理解代码逻辑
- 自动生成 README、API 文档
- 提供代码改进建议

### 多格式输出
- Markdown 格式的分析报告
- HTML 格式的可视化文档
- JSON 格式的结构化数据

## 📄 许可证

ISC License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进项目。

---

**Project Context Engine** - 让代码分析和文档生成变得简单高效 🚀

