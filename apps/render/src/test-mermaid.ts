import { MarkdownRenderer } from './renderer';
import * as fs from 'fs';
import * as path from 'path';

async function testMermaidRendering() {
  const renderer = new MarkdownRenderer({ theme: 'dark' });
  
  const testMarkdown = `
# Mermaid 渲染测试

## 流程图
\`\`\`mermaid
graph TD
    A[main.ts 入口] --> B[app.once('ready')]
    B --> C[onReady函数]
    C --> D[resolveNlsConfiguration]
    C --> E[mkdirpIgnoreError]
    D --> F[startup函数]
    E --> F
    F --> G[bootstrapESM]
    G --> H[import('./vs/code/electron-main/main.js')]
    H --> I[CodeMain实例化和启动]
\`\`\`

## 时序图
\`\`\`mermaid
sequenceDiagram
    participant U as 用户
    participant A as 应用
    participant S as 服务器
    
    U->>A: 发起请求
    A->>S: 转发请求
    S-->>A: 返回响应
    A-->>U: 显示结果
\`\`\`

## 类图
\`\`\`mermaid
classDiagram
    class MarkdownRenderer {
        -options: RendererOptions
        +render(markdown: string): Promise<string>
        +renderFile(filePath: string): Promise<string>
        +setTheme(theme: string): void
        +getTheme(): string
    }
    
    class RendererOptions {
        +basePath?: string
        +theme?: string
    }
    
    MarkdownRenderer --> RendererOptions
\`\`\`

## 普通代码块（对比测试）
\`\`\`typescript
function hello(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`
`;

  try {
    const html = await renderer.render(testMarkdown);
    
    // 确保输出目录存在
    const outputDir = path.join(process.cwd(), 'apps/render/output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 写入测试文件
    const outputPath = path.join(outputDir, 'mermaid-test.html');
    await fs.promises.writeFile(outputPath, html, 'utf-8');
    
    console.log(`✅ Mermaid 渲染测试完成！`);
    console.log(`📁 输出文件: ${outputPath}`);
    console.log(`🌐 在浏览器中打开查看效果`);
    
    // 测试浅色主题
    renderer.setTheme('light');
    const lightHtml = await renderer.render(testMarkdown);
    const lightOutputPath = path.join(outputDir, 'mermaid-test-light.html');
    await fs.promises.writeFile(lightOutputPath, lightHtml, 'utf-8');
    console.log(`🌞 浅色主题版本: ${lightOutputPath}`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testMermaidRendering();
}

export { testMermaidRendering };