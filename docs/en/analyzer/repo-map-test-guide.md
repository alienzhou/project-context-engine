# Repo Map Test Guide

This guide introduces how to use the testing functionality of Repo Map, especially the newly added language filtering feature.

## 🧪 Test Tool Overview

The test tool `test-repomap.js` provides flexible testing options, supporting:

- ✅ Full language testing (default behavior)
- ✅ Specific language testing (language filtering)
- ✅ Custom token limits
- ✅ File extension validation
- ✅ Batch testing for multiple languages

## 🚀 Quick Start

### Build Project

```bash
# In the apps/analyzer directory
pnpm build
```

### Basic Testing

```bash
# Test all supported languages
node test-repomap.js

# Show help information
node test-repomap.js --help
```

## 🎯 Language Filtering Tests

### Single Language Testing

```bash
# Test Python files
node test-repomap.js --language python
node test-repomap.js -l python

# Test TypeScript files
node test-repomap.js --language typescript
node test-repomap.js -l typescript

# Test Java files
node test-repomap.js --language java
node test-repomap.js -l java

# Test Go files
node test-repomap.js --language go
node test-repomap.js -l go
```

### Custom Token Limits

```bash
# Test Python with larger token limit
node test-repomap.js -l python -t 4096

# Test JavaScript with smaller token limit
node test-repomap.js -l javascript -t 512
```

## 📊 Test Output Interpretation

### Statistical Information

Each test displays the following statistical information:

```
📊 Statistics:
  - File count: 3              # Number of matching files found
  - Total symbols: 16          # Total number of extracted symbols
  - Estimated tokens: 185      # Estimated token count
  - Filter language: python    # Specified language (if any)
  - File extensions: .py       # Actual processed file extensions
```

### Validation Features

The test tool automatically validates:

1. **File filtering correctness**: Checks if only files of the specified language were processed
2. **Extension matching**: Verifies file extensions match the specified language mapping
3. **Symbol extraction**: Ensures code symbols were correctly extracted

## 🔧 Supported Test Languages

| Language   | Parameter Value | Test File Location                                |
| ---------- | --------------- | ------------------------------------------------- |
| JavaScript | `javascript`    | `test-multilang/javascript/`                      |
| TypeScript | `typescript`    | `test-multilang/typescript/`, `test-multilang/react/` |
| Python     | `python`        | `test-multilang/python/`                          |
| Java       | `java`          | `test-multilang/java/`                            |
| Kotlin     | `kotlin`        | `test-multilang/kotlin/`                          |
| Go         | `go`            | `test-multilang/go/`                              |
| C++        | `cpp`           | `test-multilang/cpp/`                             |
| HTML       | `html`          | `test-multilang/html/`                            |
| Vue        | `vue`           | `test-multilang/vue/`                             |

## 📋 Test Scenario Examples

### Scenario 1: Verify New Language Support

```bash
# Test newly added language support
node test-repomap.js -l rust
node test-repomap.js -l swift
```

### Scenario 2: Performance Testing

```bash
# Test different languages for large projects
node test-repomap.js -l typescript -t 8192
node test-repomap.js -l java -t 8192
```

### Scenario 3: Regression Testing

```bash
# Verify all languages still work properly
node test-repomap.js  # Run default multi-language test suite
```

## 🐛 Troubleshooting

### Common Issues

1. **No files found**

   ```
   - File count: 0
   ```

   - Check if the specified language parameter is correct
   - Confirm corresponding language test files exist in `test-multilang` directory

2. **Zero symbol count**

   ```
   - Total symbols: 0
   ```

   - Check if parser loaded correctly
   - Confirm file contents are not empty

3. **File extension mismatch**
   - Check if language mapping configuration is correct
   - Confirm test files use correct extensions

### Debugging Tips

```bash
# Enable verbose log output
DEBUG=* node test-repomap.js -l python

# Test specific directory
node test-repomap.js -l python -t 1024 > python-test.log 2>&1
```

## 🔄 Continuous Integration

### GitHub Actions Example

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