import { MarkdownRenderer } from './renderer';
import * as path from 'path';

async function example() {
  // Create renderer instance
  const renderer = new MarkdownRenderer({
    theme: 'dark'
  });

  // Example 1: Render Markdown string containing Mermaid
  const markdownContent = `
# Project Architecture Documentation

## System Flow
\`\`\`mermaid
graph TD
    A[User Request] --> B{Authentication}
    B -->|Success| C[Process Request]
    B -->|Failure| D[Return Error]
    C --> E[Query Database]
    E --> F[Generate Response]
    F --> G[Return Result]
\`\`\`

## API Sequence Diagram
\`\`\`mermaid
sequenceDiagram
    participant C as Client
    participant API as API Service
    participant DB as Database
    
    C->>API: POST /api/data
    API->>DB: Query Data
    DB-->>API: Return Result
    API-->>C: JSON Response
\`\`\`
`;

  try {
    const html = await renderer.render(markdownContent);
    console.log('✅ Markdown rendering successful');
    
    // Example 2: Render from file
    const testFilePath = path.join(__dirname, '../data/1.md');
    const fileHtml = await renderer.renderFile(testFilePath);
    console.log('✅ File rendering successful');
    
    // Example 3: Switch theme
    renderer.setTheme('light');
    const lightHtml = await renderer.render(markdownContent);
    console.log('✅ Light theme rendering successful');
    
    console.log('Current theme:', renderer.getTheme());
    
  } catch (error) {
    console.error('❌ Rendering failed:', error);
  }
}

// Export example function
export { example };

// If running this file directly
if (require.main === module) {
  example();
}