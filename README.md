# Project Context Engine

## 技术栈
- **TypeScript**: 用于编写类型安全的 JavaScript 代码。
- **pnpm**: 用于管理项目的依赖和脚本执行。

## 安装依赖

```bash
pnpm install
```

## 构建项目
构建整个项目：

```bash
pnpm build
```
单独构建 `common` 包或 `web-app`:

```bash
pnpm build:common    # 仅构建 common 包
pnpm build:web-app   # 仅构建 web-app
```
## 开发模式

启动开发服务器：

```bash
pnpm dev
```
## 启动应用

启动生产环境应用：

```bash
pnpm start
```
## 类型检查

运行 TypeScript 类型检查：

```bash
pnpm typecheck
## 代码格式化

格式化代码：

```bash
pnpm format
## 代码 linting

检查代码风格：

```bash
pnpm lint
## 添加依赖
使用以下命令为特定包添加依赖：

```bash
pnpm --filter <package-name> add <dependency>
```
例如，为 `web-app` 添加 `express` 依赖：

```bash
pnpm --filter @project-context-engine/web-app add express
```

## 依赖关系
在 `web-app` 的 `package.json` 中，你可以看到对 `common` 包的依赖：

```json
"dependencies": {
  "@project-context-engine/common": "workspace:*"
}
```

## 运行脚本

使用以下命令运行特定包的脚本：

```bash
pnpm --filter <package-name> <script>
```

例如，启动 `web-app`：

```bash
pnpm --filter @project-context-engine/web-app start

