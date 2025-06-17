import { marked } from 'marked';
import highlight from 'highlight.js';
import * as path from 'path';
import * as fs from 'fs';

export interface RendererOptions {
  basePath?: string;
  theme?: 'dark' | 'light';
}

export class MarkdownRenderer {
  private options: RendererOptions;

  constructor(options: RendererOptions = {}) {
    this.options = {
      theme: 'dark',
      ...options
    };

    // 配置 marked
    const renderer = new marked.Renderer();
    renderer.code = (code: string, lang: string | undefined) => {
      if (lang === 'mermaid') {
        // 为每个 mermaid 图表生成唯一ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return `<div class="mermaid-wrapper">
          <div class="mermaid-toolbar">
            <button class="mermaid-zoom-btn" data-action="zoom-in" title="放大">🔍+</button>
            <button class="mermaid-zoom-btn" data-action="zoom-out" title="缩小">🔍-</button>
            <button class="mermaid-zoom-btn" data-action="zoom-reset" title="重置缩放">↻</button>
            <button class="mermaid-zoom-btn" data-action="fullscreen" title="全屏">⛶</button>
          </div>
          <div class="mermaid-container">
            <div id="${id}" class="mermaid" data-zoom="1">${code}</div>
          </div>
        </div>`;
      }
      const highlighted = lang
        ? highlight.highlight(code, { language: lang }).value
        : highlight.highlightAuto(code).value;
      return `<pre><code class="hljs">${highlighted}</code></pre>`;
    };

    marked.setOptions({
      renderer,
      breaks: true,
      gfm: true
    });
  }

  private getStyles(): string {
    const isDark = this.options.theme === 'dark';
    return `
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
          line-height: 1.6;
          padding: 20px;
          color: ${isDark ? '#e1e1e1' : '#333'};
          background: ${isDark ? '#1e1e1e' : '#ffffff'};
        }
        
        pre {
          background: ${isDark ? '#2d2d2d' : '#f6f8fa'};
          padding: 16px;
          border-radius: 6px;
          overflow: auto;
        }
        
        code {
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          font-size: 14px;
        }
        
        .hljs {
          background: transparent;
          color: ${isDark ? '#e1e1e1' : '#333'};
        }
        
        h1, h2, h3, h4, h5, h6 {
          color: ${isDark ? '#e1e1e1' : '#333'};
          border-bottom: 1px solid ${isDark ? '#333' : '#eaecef'};
          padding-bottom: 0.3em;
        }
        
        /* Mermaid 包装器 - 全宽度显示 */
        .mermaid-wrapper {
          margin: 24px 0;
          width: 100%;
          position: relative;
          border: 1px solid ${isDark ? '#4a4a4a' : '#dfe2e5'};
          border-radius: 8px;
          background: ${isDark ? '#2d2d2d' : '#ffffff'};
          overflow: hidden;
        }
        
        /* 工具栏 */
        .mermaid-toolbar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          padding: 8px 12px;
          background: ${isDark ? '#3a3a3a' : '#f6f8fa'};
          border-bottom: 1px solid ${isDark ? '#4a4a4a' : '#dfe2e5'};
          gap: 4px;
        }
        
        .mermaid-zoom-btn {
          background: ${isDark ? '#4a4a4a' : '#ffffff'};
          border: 1px solid ${isDark ? '#6a6a6a' : '#d0d7de'};
          color: ${isDark ? '#e1e1e1' : '#333'};
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
          min-width: 32px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .mermaid-zoom-btn:hover {
          background: ${isDark ? '#5a5a5a' : '#f3f4f6'};
          border-color: ${isDark ? '#7a7a7a' : '#a8a8a8'};
        }
        
        .mermaid-zoom-btn:active {
          transform: scale(0.95);
        }
        
        /* Mermaid 容器 - 全宽度 */
        .mermaid-container {
          width: 100%;
          overflow: auto;
          position: relative;
        }
        
        .mermaid {
          width: 100%;
          min-height: 200px;
          padding: 20px;
          transition: transform 0.3s ease;
          transform-origin: top left;
        }
        
        /* Mermaid SVG 样式 */
        .mermaid svg {
          width: 100% !important;
          height: auto !important;
          display: block;
          margin: 0 auto;
        }
        
        /* 全屏模式 */
        .mermaid-wrapper.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 9999;
          border-radius: 0;
          margin: 0;
        }
        
        .mermaid-wrapper.fullscreen .mermaid-container {
          height: calc(100vh - 48px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mermaid-wrapper.fullscreen .mermaid {
          width: auto;
          height: auto;
          max-width: 100%;
          max-height: 100%;
        }
        
        /* 全屏遮罩 */
        .fullscreen-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.8);
          z-index: 9998;
          display: none;
        }
        
        .fullscreen-overlay.active {
          display: block;
        }
        
        img {
          max-width: 100%;
        }
        
        blockquote {
          border-left: 4px solid ${isDark ? '#4a4a4a' : '#dfe2e5'};
          margin: 0;
          padding-left: 16px;
          color: ${isDark ? '#a1a1a1' : '#6a737d'};
        }
        
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
        }
        
        th, td {
          border: 1px solid ${isDark ? '#4a4a4a' : '#dfe2e5'};
          padding: 8px;
        }
        
        th {
          background: ${isDark ? '#2d2d2d' : '#f6f8fa'};
        }
        
        /* 加载状态样式 */
        .mermaid.loading {
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${isDark ? '#a1a1a1' : '#6a737d'};
        }
        
        .mermaid.loading::before {
          content: "渲染 Mermaid 图表中...";
        }
        
        /* 响应式设计 */
        @media (max-width: 768px) {
          .mermaid-toolbar {
            padding: 6px 8px;
          }
          
          .mermaid-zoom-btn {
            min-width: 28px;
            height: 24px;
            font-size: 11px;
            padding: 2px 6px;
          }
          .mermaid {
            padding: 16px;
          }
        }
        
        /* 滚动条样式 */
        .mermaid-container::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .mermaid-container::-webkit-scrollbar-track {
          background: ${isDark ? '#2d2d2d' : '#f1f1f1'};
        }
        
        .mermaid-container::-webkit-scrollbar-thumb {
          background: ${isDark ? '#555' : '#888'};
          border-radius: 4px;
        }
        
        .mermaid-container::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? '#777' : '#555'};
        }
      </style>
    `;
  }

  private getScripts(): string {
    const mermaidTheme = this.options.theme === 'dark' ? 'dark' : 'default';
    
    return `
      <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        
        // 配置 Mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: '${mermaidTheme}',
          securityLevel: 'loose',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif',
          flowchart: {
            useMaxWidth: false,
            htmlLabels: true,
            curve: 'basis'
          },
          sequence: {
            useMaxWidth: false,
            wrap: true
          },
          gantt: {
            useMaxWidth: false
          },
          er: {
            useMaxWidth: false
          },
          journey: {
            useMaxWidth: false
          },
          gitgraph: {
            useMaxWidth: false
          }
        });

        // 缩放控制功能
        function setupZoomControls() {
          document.addEventListener('click', function(e) {
            if (!e.target.classList.contains('mermaid-zoom-btn')) return;
            
            const action = e.target.dataset.action;
            const wrapper = e.target.closest('.mermaid-wrapper');
            const mermaidElement = wrapper.querySelector('.mermaid');
            
            let currentZoom = parseFloat(mermaidElement.dataset.zoom) || 1;
            
            switch(action) {
              case 'zoom-in':
                currentZoom = Math.min(currentZoom * 1.2, 3);
                break;
              case 'zoom-out':
                currentZoom = Math.max(currentZoom / 1.2, 0.3);
                break;
              case 'zoom-reset':
                currentZoom = 1;
                break;
              case 'fullscreen':
                toggleFullscreen(wrapper);
                return;
            }
            
            mermaidElement.style.transform = \`scale(\${currentZoom})\`;
            mermaidElement.dataset.zoom = currentZoom;
          });
          
          // ESC 键退出全屏
          document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
              const fullscreenWrapper = document.querySelector('.mermaid-wrapper.fullscreen');
              if (fullscreenWrapper) {
                toggleFullscreen(fullscreenWrapper);
              }
            }
          });
        }
        
        function toggleFullscreen(wrapper) {
          const isFullscreen = wrapper.classList.contains('fullscreen');
          
          if (isFullscreen) {
            wrapper.classList.remove('fullscreen');
            document.body.style.overflow = '';
            
            // 移除遮罩
            const overlay = document.querySelector('.fullscreen-overlay');
            if (overlay) {
              overlay.remove();
            }
            
            // 更新按钮文本
            const fullscreenBtn = wrapper.querySelector('[data-action="fullscreen"]');
            fullscreenBtn.textContent = '⛶';
            fullscreenBtn.title = '全屏';
          } else {
            // 创建遮罩
            const overlay = document.createElement('div');
            overlay.className = 'fullscreen-overlay active';
            document.body.appendChild(overlay);
            
            wrapper.classList.add('fullscreen');
            document.body.style.overflow = 'hidden';
            
            // 更新按钮文本
            const fullscreenBtn = wrapper.querySelector('[data-action="fullscreen"]');
            fullscreenBtn.textContent = '✕';
            fullscreenBtn.title = '退出全屏';
            
            // 点击遮罩退出全屏
            overlay.addEventListener('click', () => {
              toggleFullscreen(wrapper);
            });
          }
        }
        // 渲染所有 Mermaid 图表
        async function renderMermaidCharts() {
          const mermaidElements = document.querySelectorAll('.mermaid');
          
          for (let i = 0; i < mermaidElements.length; i++) {
            const element = mermaidElements[i];
            const graphDefinition = element.textContent;
            
            try {
              // 添加加载状态
              element.classList.add('loading');
              
              // 渲染图表
              const { svg } = await mermaid.render(\`mermaid-chart-\${i}\`, graphDefinition);
              
              // 移除加载状态并插入 SVG
              element.classList.remove('loading');
              element.innerHTML = svg;
              
              // 确保 SVG 响应式
              const svgElement = element.querySelector('svg');
              if (svgElement) {
                svgElement.removeAttribute('height');
                svgElement.style.width = '100%';
                svgElement.style.height = 'auto';
              }
            } catch (error) {
              console.error('Mermaid 渲染错误:', error);
              element.classList.remove('loading');
              element.innerHTML = \`
                <div style="color: #f56565; padding: 16px; text-align: center;">
                  <strong>Mermaid 图表渲染失败</strong><br>
                  <small>\${error.message}</small>
                </div>
              \`;
            }
          }
          
          // 设置缩放控制
          setupZoomControls();
        }

        // 等待 DOM 加载完成后渲染图表
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', renderMermaidCharts);
        } else {
          renderMermaidCharts();
        }
      </script>
    `;
  }

  public async render(markdown: string): Promise<string> {
    const content = marked.parse(markdown);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/${this.options.theme === 'dark' ? 'github-dark' : 'github'}.css">
          ${this.getStyles()}
        </head>
        <body>
          ${content}
          ${this.getScripts()}
        </body>
      </html>
    `;
  }

  public async renderFile(filePath: string): Promise<string> {
    const markdown = await fs.promises.readFile(filePath, 'utf-8');
    return this.render(markdown);
  }

  // 新增：设置主题的方法
  public setTheme(theme: 'dark' | 'light'): void {
    this.options.theme = theme;
  }

  // 新增：获取当前主题
  public getTheme(): 'dark' | 'light' {
    return this.options.theme || 'dark';
  }
}