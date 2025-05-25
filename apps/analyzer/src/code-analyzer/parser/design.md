# 代码文件解析模块

## 导出的功能函数

```ts
async function parseCodeFile(filePath: string): Promise<CodeNodeInfo[]>
```

方法功能：

1. 异步读取并解析指定路径的TypeScript代码文件。
2. 提取文件中的所有方法、构造函数和类字段信息。
3. 将每个方法和构造函数解析为`CodeNodeInfo`对象，包含完整代码和方法签名。
4. 返回一个`CodeNodeInfo`对象数组，表示文件中的所有代码节点。
### 设计细节

- **输入**: 文件路径（`filePath`），字符串类型。
- **输出**: `CodeNodeInfo`对象数组，每个对象包含两个属性：
  - `fullText`: 方法或构造函数的完整代码，包括实现细节。
  - `signature`: 方法或构造函数的签名，不包含实现细节。

- **支持的代码结构**:
  - 函数声明：`function functionName(param1: type1, param2: type2): returnType { }`
  - 方法声明：`methodName(param1: type1, param2: type2): returnType { }`
  - 箭头函数：`variableName = (param1: type1, param2: type2) => { }`
  - 函数表达式：`variableName = function(param1: type1, param2: type2): returnType { }`
  - 类定义：`class ClassName { ... }`，包括字段和方法。

- **示例**:

```ts
class ExampleClass {
  field1: number;
  field2: string;
  constructor(param1: number) { }

  methodOne(param1: number): boolean { return true; }
  methodTwo(): string { return 'example'; }
}
function exampleFunction(param1: string, param2: number):void { }
```

解析结果：

```ts
[
  { fullText: 'constructor(param1: number) { }', signature:'constructor(param1: number)' },
  { fullText: 'methodOne(param1: number): boolean { returntrue; }', signature: 'methodOne(param1: number):boolean' },
  { fullText: 'methodTwo(): string { return \'example\'; ', signature: 'methodTwo(): string' },
  { fullText: 'function exampleFunction(param1: string,param2: number): void { }', signature: 'exampleFunctio(param1: string, param2: number): void' }
]
```

```ts
type CodeNodeInfo = {
  fullText: string;  // 方法的完整代码，包括实现细节
  signature: string; // 方法的签名，不包含实现细节
}

async function parseCodeFile(filePath: string): Promise<CodeNodeInfo[]> {
  // 实现代码解析逻辑
  // 读取文件内容
  // 使用正则表达式或AST解析器提取方法和构造函数信息
  // 返回CodeNodeInfo对象数组
  return [];
}

// 示例用法
(async () => {
  // 解析一个TypeScript文件
  const snippets = await parseCodeFile('/path/to/file.ts');

  // 输出结果
  snippets.forEach(snippet => {
    console.log('Full method:', snippet.fullText);
    console.log('Method signature:', snippet.signature);
    console.log('-------------------');
  });
})();
```