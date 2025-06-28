import { MarkdownRenderer } from './renderer';
import * as fs from 'fs';
import * as path from 'path';

async function testMermaidRendering() {
  const renderer = new MarkdownRenderer({ theme: 'dark' });

  const testMarkdown = `
# Mermaid Rendering Test

## Flow Chart
\`\`\`mermaid
graph TD
    A[main.ts Entry] --> B[app.once('ready')]
    B --> C[onReady Function]
    C --> D[resolveNlsConfiguration]
    C --> E[mkdirpIgnoreError]
    D --> F[startup Function]
    E --> F
    F --> G[bootstrapESM]
    G --> H[import('./vs/code/electron-main/main.js')]
    H --> I[CodeMain Instantiation and Start]
\`\`\`

## Sequence Diagram
\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant A as Application
    participant S as Server
    
    U->>A: Send Request
    A->>S: Forward Request
    S-->>A: Return Response
    A-->>U: Display Result
\`\`\`

## Class Diagram
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

## Regular Code Block (For Comparison)
\`\`\`typescript
function hello(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`
`;

  try {
    const html = await renderer.render(testMarkdown);

    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), 'apps/render/output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write test file
    const outputPath = path.join(outputDir, 'mermaid-test.html');
    await fs.promises.writeFile(outputPath, html, 'utf-8');

    console.log(`✅ Mermaid rendering test completed!`);
    console.log(`📁 Output file: ${outputPath}`);
    console.log(`🌐 Open in browser to view results`);

    // Test light theme
    renderer.setTheme('light');
    const lightHtml = await renderer.render(testMarkdown);
    const lightOutputPath = path.join(outputDir, 'mermaid-test-light.html');
    await fs.promises.writeFile(lightOutputPath, lightHtml, 'utf-8');
    console.log(`🌞 Light theme version: ${lightOutputPath}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// If running this file directly
if (require.main === module) {
  testMermaidRendering();
}

export { testMermaidRendering };