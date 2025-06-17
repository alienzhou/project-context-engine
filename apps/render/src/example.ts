import { MarkdownRenderer } from './renderer';
import * as path from 'path';

async function example() {
  // 创建渲染器实例
  const renderer = new MarkdownRenderer({
    theme: 'dark'
  });

  // 示例 1: 渲染包含 Mermaid 的 Markdown 字符串
  const markdownContent = `
# 项目架构文档

## 系统流程
\`\`\`mermaid
graph TD
    A[用户请求] --> B{身份验证}
    B -->|成功| C[处理请求]
    B -->|失败| D[返回错误]
    C --> E[查询数据库]
    E --> F[生成响应]
    F --> G[返回结果]
\`\`\`

## API 时序图
\`\`\`mermaid
sequenceDiagram
    participant C as 客户端
    participant API as API服务
    participant DB as 数据库
    
    C->>API: POST /api/data
    API->>DB: 查询数据
    DB-->>API: 返回结果
    API-->>C: JSON响应
\`\`\`
`;

  try {
    const html = await renderer.render(markdownContent);
    console.log('✅ Markdown 渲染成功');
    
    // 示例 2: 从文件渲染
    const testFilePath = path.join(__dirname, '../data/1.md');
    const fileHtml = await renderer.renderFile(testFilePath);
    console.log('✅ 文件渲染成功');
    
    // 示例 3: 切换主题
    renderer.setTheme('light');
    const lightHtml = await renderer.render(markdownContent);
    console.log('✅ 浅色主题渲染成功');
    
    console.log('当前主题:', renderer.getTheme());
    
  } catch (error) {
    console.error('❌ 渲染失败:', error);
  }
}

// 导出示例函数
export { example };

// 如果直接运行此文件
if (require.main === module) {
  example();
}