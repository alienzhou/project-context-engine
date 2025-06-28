# Multi-language Test Cases

This directory contains test code examples in various programming languages for testing the Repo Map generator's multi-language support and language filtering functionality.

## 📁 Directory Structure

```
test-multilang/
├── cpp/                    # C++ test files
├── docker-compose.yml      # Container orchestration
├── go/                     # Go test files
├── html/                   # HTML test files
├── java/                   # Java test files
├── javascript/             # JavaScript test files
├── kotlin/                 # Kotlin test files
├── python/                 # Python test files
├── react/                  # React component test files
├── typescript/             # TypeScript test files
├── vue/                    # Vue component test files
└── README.md              # This file
```

## 🎯 Purpose

These test files serve multiple purposes:

1. **Language Support Validation**: Verify that the Repo Map generator correctly recognizes and parses different programming languages
2. **Symbol Extraction Testing**: Ensure that classes, functions, interfaces, and other code symbols are properly extracted
3. **Language Filtering Testing**: Test the new language filtering feature that allows analyzing only specific languages
4. **Output Format Verification**: Validate the formatting and display of analysis results

## 📋 Language Coverage

### TypeScript (`typescript/`)
- **User.ts** - Complete user model file, including:
  - Interface definitions (`IUser`, `UserProfile`)
  - Type aliases (`UserStatus`)
  - Enums (`UserRole`)
  - Class implementation (`User`)
  - Abstract class (`BaseUserService`)
  - Utility functions and constants
- **UserService.ts** - User service class, demonstrating:
  - Decorator usage
  - Generic and advanced types
  - Asynchronous methods
  - Configuration interface
  - Higher-order functions

### JavaScript (`javascript/`)
- **user.js** - ES6+ user model, demonstrating:
  - Class definition and static methods
  - Getter/Setter
  - Factory functions
  - Higher-order functions and functional programming
  - Asynchronous functions
- **userService.js** - User service, demonstrating:
  - Event emitter pattern
  - Class inheritance
  - Promise and async/await
  - Modular design
  - Decorator functions (Higher-order function implementation)
- **utils.js** - Utility functions collection, including:
  - Debounce and throttle functions
  - Deep copy implementation
  - Array, object, string utility functions
  - Date and math utility functions
  - Validation functions
  - Storage and asynchronous utility functions

### React (`react/`)
- **UserCard.tsx** - User card component (TypeScript + JSX)
- **UserForm.jsx** - User form component (JavaScript + JSX)

### Vue (`vue/`)
- **HelloWorld.vue** - Basic Vue component
- **UserCard.vue** - User display component
- **UserList.vue** - User list component

### Python (`python/`)
- **user.py** - User class and data structures, demonstrating modern Python features
- **user_service.py** - User service class with async support
- **utils.py** - Utility functions collection

### Java (`java/`)
- **User.java** - User entity class with modern Java features
- **UserController.java** - REST controller with Spring annotations
- **UserRepository.java** - Repository interface with JPA annotations
- **UserService.java** - Service layer with business logic

### Kotlin (`kotlin/`)
- **User.kt** - Data class, enum, companion object, showcasing Kotlin modern features
- **UserRepository.kt** - Interface and in-memory implementation, demonstrating Kotlin's concise syntax
- **UserService.kt** - Service class with suspend functions and coroutine features

### Go (`go/`)
- **user.go** - User struct and methods, demonstrating Go struct definition and methods
- **user_service.go** - Service struct with business logic methods
- **repository.go** - Repository interface and in-memory implementation, showcasing Go interface design

### C++ (`cpp/`)
- **User.h** - User class header file, showcasing modern C++ features (C++11/14/17)
- **UserRepository.h** - Repository interface header file with templates and smart pointers
- **UserService.cpp** - Service class implementation, demonstrating complete class implementation

### HTML (`html/`)
- **index.html** - Main page with semantic HTML structure
- **dashboard.html** - Dashboard interface with data visualization elements

## 🧪 Testing Usage

### Language-specific Testing

```bash
# Test only Python files
node apps/analyzer/dist/code-analyzer/repomap/cli.js test-multilang --language python

# Test only TypeScript files
node apps/analyzer/dist/code-analyzer/repomap/cli.js test-multilang --language typescript

# Test only Java files
node apps/analyzer/dist/code-analyzer/repomap/cli.js test-multilang --language java
```

### Automated Testing

```bash
# Run test suite in analyzer directory
cd apps/analyzer
node test-repomap.js --language python
node test-repomap.js --language typescript
node test-repomap.js --language java
```

### Batch Testing

```bash
# Test all languages
node test-repomap.js

# Test with different token limits
node test-repomap.js --language typescript --max-tokens 4096
```

## 📊 Expected Output

When running language filtering tests, you should see output similar to:

```
📊 Statistics:
  - File count: 3
  - Total symbols: 15
  - Estimated tokens: 245
  - Filter language: typescript
  - File extensions: .ts, .tsx
```

## 🔧 Maintenance

When adding new language support to the Repo Map generator:

1. Add corresponding test files to a new directory
2. Include examples of common language constructs (classes, functions, interfaces, etc.)
3. Update this README with the new language section
4. Add the language to the automated test suite

## 🎯 Quality Assurance

These test files help ensure:

- **Parser Accuracy**: All symbols are correctly identified and extracted
- **Language Recognition**: File extensions are properly mapped to languages
- **Output Consistency**: Results are formatted consistently across languages
- **Feature Completeness**: All language-specific features are properly supported 