# Multi-Language User Service Demo

This repository demonstrates a user service implementation across multiple programming languages:

## Languages Included

### Java (`java/`)
- **UserService.java** - Main service class with business logic
- **User.java** - Entity class with getters/setters
- **UserRepository.java** - Repository interface  
- **UserController.java** - REST controller

### Kotlin (`kotlin/`)
- **UserService.kt** - Service class with suspend functions
- **User.kt** - Data class with companion objects and enums
- **UserRepository.kt** - Repository interface and implementation

### Go (`go/`)
- **user_service.go** - Service struct with methods
- **user.go** - User struct with methods and filter
- **repository.go** - Repository interface and in-memory implementation

### C++ (`cpp/`)
- **UserService.cpp** - Service class implementation
- **User.h** - User class header with modern C++ features
- **UserRepository.h** - Repository interface with templates

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
- **UserCard.tsx** - React TypeScript component, demonstrating:
  - Function components and Hooks
  - Custom Hook
  - Type definitions and Props
  - Event handling
  - Conditional rendering
  - Component composition
- **UserForm.jsx** - React JSX form component, demonstrating:
  - useReducer state management
  - Context API
  - Form validation
  - File upload
  - Event handling
  - Component splitting

## Architecture

Each language implementation follows similar patterns:
- **Entity/Model**: User data structure
- **Repository**: Data access layer (interface + implementation)
- **Service**: Business logic layer
- **Controller** (where applicable): API layer

## Features Demonstrated

- Object-oriented design
- Interface/abstract base classes
- Generic programming (templates/generics)
- Modern language features (async/await, data classes, etc.)
- Error handling patterns
- Factory patterns
- CRUD operations

## Building and Running

See individual language directories for specific build instructions.

Use `docker-compose up` to run all services together.

# 多语言测试文件集合

这个目录包含了用于测试 repo map 生成器的多种编程语言示例文件，展示了不同语言的典型代码结构和特性。

## 目录结构

### Java (`java/`)
- `User.java` - 用户实体类，包含构造函数、getter/setter、toString 方法
- `UserController.java` - REST API 控制器，展示 Spring Boot 风格的注解和方法
- `UserRepository.java` - JPA 仓库接口，展示数据访问层
- `UserService.java` - 业务逻辑服务类，包含各种业务方法

### Kotlin (`kotlin/`)
- `User.kt` - 数据类、枚举、companion object，展示 Kotlin 现代特性
- `UserRepository.kt` - 接口和内存实现类，展示 Kotlin 的简洁语法
- `UserService.kt` - 服务类，包含 suspend 函数和协程特性

### Go (`go/`)
- `user.go` - 用户结构体和方法，展示 Go 的结构体定义和方法
- `user_service.go` - 服务结构体，包含业务逻辑方法
- `repository.go` - 仓库接口和内存实现，展示 Go 的接口设计

### C++ (`cpp/`)
- `User.h` - 用户类头文件，展示现代 C++ 特性（C++11/14/17）
- `UserRepository.h` - 仓库接口头文件，包含模板和智能指针
- `UserService.cpp` - 服务类实现，展示类的完整实现

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
- **UserCard.tsx** - React TypeScript component, demonstrating:
  - Function components and Hooks
  - Custom Hook
  - Type definitions and Props
  - Event handling
  - Conditional rendering
  - Component composition
- **UserForm.jsx** - React JSX form component, demonstrating:
  - useReducer state management
  - Context API
  - Form validation
  - File upload
  - Event handling
  - Component splitting

### 配置文件
- `docker-compose.yml` - Docker container orchestration configuration
- `README.md` - Project description document

## 代码特性展示

### Modern language features
- **TypeScript**: Interface, generic, decorator, type alias, enum
- **JavaScript**: ES6+ syntax, class, module, arrow function, destructuring, spread operator
- **React**: Hooks, Context, function component, custom Hook
- **Java**: Annotations, generic, Lambda expression, Stream API
- **Kotlin**: Data class, extension function, coroutine, null safety
- **Go**: Struct, interface, goroutine, defer
- **C++**: Modern C++ features, smart pointers, RAII, template

### Design patterns
- **Factory pattern**: Object creation in each language
- **Repository pattern**: Data access layer abstraction
- **Service pattern**: Business logic encapsulation
- **Observer pattern**: JavaScript event emitter
- **Singleton pattern**: JavaScript default service instance
- **Decorator pattern**: TypeScript decorator and JavaScript higher-order function

### Architectural concepts
- **Layered architecture**: Controller -> Service -> Repository
- **Dependency injection**: Dependency management between services
- **Interface segregation**: Abstract and implementation separation
- **Generic programming**: Type-safe generic code
- **Functional programming**: Higher-order functions, pure functions, immutability

## Test purposes

These files are used to test the following capabilities of the repo map generator:

1. **Multi-language support**: Verify the parser's ability to parse different programming languages
2. **Symbol recognition**: Test the parser's ability to recognize classes, interfaces, functions, and methods
3. **Dependency analysis**: Verify the parser's ability to analyze import/export relationships
4. **Importance evaluation**: Test the effectiveness of the symbol importance algorithm
5. **Formatted output**: Verify the correctness of aider.chat style output

## Running tests

```bash
# Run tests in the analyzer directory
cd apps/analyzer

# Test multi-language parsing
node test-repomap.js

# Or use CLI tool
node src/code-analyzer/repomap/cli.js ../../test-multilang output.md 2048 text
```

## Expected output

repo map should be able to:
- Recognize all languages' main symbols
- Display correct class and method hierarchy
- Sort symbols by importance
- Generate concise signature format
- Control output within specified token limit
