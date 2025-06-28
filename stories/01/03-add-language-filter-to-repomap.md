- User: alienzhou
- Date: 2025-06-29 01:39:27

# Story: Allow specifying language for repomap parsing

## 1. Story Description

As a user of `repomap`, I want to be able to specify a target language when running the analysis. This will allow me to focus the analysis on a specific part of a multi-language repository, making the process faster and the output cleaner. If no language is specified, it should default to analyzing all supported languages.

## 2. Acceptance Criteria

- A new optional command-line argument (e.g., `--language` or `-l`) is added to the `repomap` command.
- When the `--language` argument is provided with a supported language (e.g., `python`, `typescript`), `repomap` only analyzes files of that language.
- When the `--language` argument is not provided, `repomap` analyzes all supported languages in the target directory (current behavior).
- If an unsupported language is specified, the tool should show an informative error message and exit gracefully.
- The test script (`apps/analyzer/test-repomap.js`) is updated to allow passing the language parameter during tests.
- New test cases are added to verify the language filtering functionality.

## 3. Technical Design

### 3.1. Update CLI

The CLI entry point is `apps/analyzer/src/code-analyzer/repomap/cli.ts`. We will use a library like `yargs` (if not already used) or manually parse `process.argv` to add the `--language` option.

1.  **Modify `cli.ts`:**
    - Add logic to parse the `--language` command-line argument.
    - The argument should be optional.
    - The value of the argument will be passed to the main `run` function.

### 3.2. Update `repomap` Core Logic

The core logic resides in `apps/analyzer/src/code-analyzer/repomap/index.ts`. The `run` function will need to be updated to accept the new `language` parameter.

1.  **Update `run` function signature in `repomap/index.ts`:**

    - Add an optional `language` parameter to the `run` function signature.

2.  **Filter files by language:**
    - The file traversal logic (likely in `directoryTraverser.ts` or similar) currently collects all files. We need to filter this list based on the provided language.
    - The language-to-extension mapping is already present in the parser logic. We can use this to determine which files to process.
    - If the `language` parameter is present, only files with extensions corresponding to that language will be parsed.
    - If the `language` parameter is absent, all supported files will be processed as before.

### 3.3. Update Test Files

The test script `apps/analyzer/test-repomap.js` needs to be updated to test the new functionality.

1.  **Parameterize the test runner:**

    - Modify the test script to accept a language parameter, possibly from the command line.
    - This will allow running tests like `node test-repomap.js --language python`.

2.  **Add new test cases:**
    - A test case that runs `repomap` on the `test-multilang` directory with `--language python` and verifies that only Python files are in the output.
    - A test case that runs `repomap` with `--language typescript` and verifies only TypeScript files are in the output.
    - A test case that runs without a language parameter and verifies that files from multiple languages are present.
    - A test case for an unsupported language, verifying the error message.

## 4. Tasks

- [x] Modify `apps/analyzer/src/code-analyzer/repomap/cli.ts` to accept a `--language` argument. ✅
- [x] Update the `run` function in `apps/analyzer/src/code-analyzer/repomap/index.ts` to accept an optional `language` parameter. ✅
- [x] Implement file filtering logic based on the provided language. ✅
- [x] Update `apps/analyzer/src/code-analyzer/parser/index.ts` to handle the language filter if needed. ✅ (Not needed, filtering handled at file level)
- [x] Update `apps/analyzer/test-repomap.js` to pass language parameters for testing. ✅
- [x] Add test cases to `test-repomap.js` for language filtering. ✅
- [x] Manually test the functionality on a multi-language project. ✅

## 5. Implementation Results

✅ **Language filtering functionality successfully implemented!**

The implementation provides comprehensive language filtering capabilities for the repomap tool:

### What was implemented:

1. **CLI Enhancement**:

   - Added `--language` / `-l` parameter to CLI
   - Enhanced argument parsing with proper validation
   - Added comprehensive help system showing supported languages
   - Proper error handling for unsupported languages

2. **Core Logic Updates**:

   - Extended `RepoMapOptions` interface to include `language` parameter
   - Added `getLanguageExtensions()` function mapping languages to file extensions
   - Added `matchesLanguage()` function for file filtering
   - Updated `scanDirectory()` to filter files based on specified language

3. **Test Infrastructure**:
   - Enhanced `test-repomap.js` with language parameter support
   - Added multiple test cases for different languages
   - Added validation to verify only specified language files are processed
   - Comprehensive test suite covering all major languages

### Supported Languages:

- **JavaScript/TypeScript**: `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.tsx`
- **Python**: `.py`, `.pyw`
- **Java/Kotlin**: `.java`, `.kt`, `.kts`
- **C/C++**: `.c`, `.cpp`, `.cc`, `.cxx`, `.c++`, `.h`, `.hpp`, `.hxx`
- **Go**: `.go`
- **Rust**: `.rs`
- **Swift**: `.swift`
- **Other**: Scala, C#, Ruby, PHP, Lua, Bash, HTML, CSS, Vue, JSON, YAML, XML

### Usage Examples:

```bash
# Analyze all supported languages (default behavior)
node cli.js ./src

# Analyze only Python files
node cli.js ./src --language python

# Analyze TypeScript files and save to file
node cli.js ./src -l typescript -o repo-map.md

# Show help
node cli.js --help
```

### Test Results:

- ✅ All language filters work correctly
- ✅ File extension validation works properly
- ✅ Error handling for unsupported languages
- ✅ CLI help system functional
- ✅ Backward compatibility maintained (no language = all languages)
- ✅ Test suite covers multiple scenarios

The feature is production-ready and maintains full backward compatibility while providing powerful language-specific analysis capabilities.

## 6. Affected Files & Final Documentation

### Source Code Modified

- `apps/analyzer/src/code-analyzer/repomap/cli.ts`: Updated to parse and handle the `--language` command-line argument, including validation and help messages.
- `apps/analyzer/src/code-analyzer/repomap/index.ts`: Modified the core logic to filter files based on the specified language. Updated `RepoMapOptions` to include the `language` parameter.
- `apps/analyzer/test-repomap.js`: Enhanced the test script to support language-specific testing via command-line arguments.

### Documentation Updated

- `README.md`: Added a brief mention of the new language filtering feature and CLI usage examples.
- `apps/analyzer/REPO-MAP.md`: Significantly updated to reflect the new functionality and improve clarity.
  - The "Output Example" section was completely rewritten with real-world examples from the `test-multilang` directory.
  - Added separate examples for a full project scan and language-specific scans (Python, TypeScript) to showcase the filtering capability.
  - A "Symbol Icon Legend" was added to explain the meaning of each icon (`🏛️`, `⚡`, `🔧`, etc.) and modifier (`[export]`, `[L26-38]`), enhancing the readability of the generated map.
- `apps/analyzer/TEST-GUIDE.md`: A new document created to provide a comprehensive guide for testing the language filtering functionality. (Archived)
