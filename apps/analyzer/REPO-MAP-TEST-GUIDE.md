# Repo Map 测试指南

本指南介绍如何使用 Repo Map 的测试功能，特别是新增的语言过滤功能。

## 🧪 测试工具概览

测试工具 `test-repomap.js` 提供了灵活的测试选项，支持：

- ✅ 全语言测试（默认行为）
- ✅ 特定语言测试（语言过滤）
- ✅ 自定义 token 限制
- ✅ 文件扩展名验证
- ✅ 批量测试多种语言

## 🚀 快速开始

### 构建项目

```bash
# 在 apps/analyzer 目录下
pnpm build
```

### 基本测试

```bash
# 测试所有支持的语言
node test-repomap.js

# 显示帮助信息
node test-repomap.js --help
```

## 🎯 语言过滤测试

### 单语言测试

```bash
# 测试 Python 文件
node test-repomap.js --language python
node test-repomap.js -l python

# 测试 TypeScript 文件
node test-repomap.js --language typescript
node test-repomap.js -l typescript

# 测试 Java 文件
node test-repomap.js --language java
node test-repomap.js -l java

# 测试 Go 文件
node test-repomap.js --language go
node test-repomap.js -l go
```

### 自定义 Token 限制

```bash
# 使用更大的 token 限制测试 Python
node test-repomap.js -l python -t 4096

# 使用较小的 token 限制测试 JavaScript
node test-repomap.js -l javascript -t 512
```

## 📊 测试输出解读

### 统计信息

每次测试都会显示以下统计信息：

```
📊 统计信息:
  - 文件数量: 3              # 找到的符合条件的文件数
  - 符号总数: 16             # 提取的符号总数
  - 预估 tokens: 185         # 预估的 token 数量
  - 过滤语言: python         # 指定的语言（如果有）
  - 文件扩展名: .py          # 实际处理的文件扩展名
```

### 验证功能

测试工具会自动验证：

1. **文件过滤正确性**: 检查是否只处理了指定语言的文件
2. **扩展名匹配**: 验证文件扩展名与指定语言的映射关系
3. **符号提取**: 确保正确提取了代码符号

## 🔧 支持的测试语言

| 语言       | 参数值       | 测试文件位置                                          |
| ---------- | ------------ | ----------------------------------------------------- |
| JavaScript | `javascript` | `test-multilang/javascript/`                          |
| TypeScript | `typescript` | `test-multilang/typescript/`, `test-multilang/react/` |
| Python     | `python`     | `test-multilang/python/`                              |
| Java       | `java`       | `test-multilang/java/`                                |
| Kotlin     | `kotlin`     | `test-multilang/kotlin/`                              |
| Go         | `go`         | `test-multilang/go/`                                  |
| C++        | `cpp`        | `test-multilang/cpp/`                                 |
| HTML       | `html`       | `test-multilang/html/`                                |
| Vue        | `vue`        | `test-multilang/vue/`                                 |

## 📋 测试场景示例

### 场景1: 验证新语言支持

```bash
# 测试新添加的语言支持
node test-repomap.js -l rust
node test-repomap.js -l swift
```

### 场景2: 性能测试

```bash
# 测试大型项目的不同语言
node test-repomap.js -l typescript -t 8192
node test-repomap.js -l java -t 8192
```

### 场景3: 回归测试

```bash
# 验证所有语言仍然正常工作
node test-repomap.js  # 运行默认的多语言测试套件
```

## 🐛 故障排除

### 常见问题

1. **找不到文件**

   ```
   - 文件数量: 0
   ```

   - 检查指定的语言参数是否正确
   - 确认 `test-multilang` 目录中有对应语言的测试文件

2. **符号数量为0**

   ```
   - 符号总数: 0
   ```

   - 检查解析器是否正确加载
   - 确认文件内容不为空

3. **文件扩展名不匹配**
   - 检查语言映射配置是否正确
   - 确认测试文件使用了正确的扩展名

### 调试技巧

```bash
# 启用详细日志输出
DEBUG=* node test-repomap.js -l python

# 测试特定目录
node test-repomap.js -l python -t 1024 > python-test.log 2>&1
```

## 🔄 持续集成

### GitHub Actions 示例

```yaml
name: Test Repo Map Language Filtering
on: [push, pull_request]

jobs:
  test-languages:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        language: [python, typescript, java, go, javascript]

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: |
          cd apps/analyzer
          pnpm build

      - name: Test language filtering
        run: |
          cd apps/analyzer
          node test-repomap.js -l ${{ matrix.language }}
```

## 📈 测试最佳实践

1. **定期测试**: 在添加新语言支持后运行完整测试套件
2. **性能基准**: 记录不同语言的处理时间和内存使用
3. **边界测试**: 测试空文件、大文件、特殊字符等边界情况
4. **回归测试**: 确保新功能不会破坏现有语言支持

---

💡 **提示**: 如果你在测试过程中发现问题，请查看日志输出或提交 Issue 报告。
