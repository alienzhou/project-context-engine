import { MarkdownRenderer } from './renderer';
import * as path from 'path';
import * as fs from 'fs';
// 解析命令行参数
function parseArgs(): { filename?: string; theme?: 'dark' | 'light'; help?: boolean; all?: boolean } {
  const args = process.argv.slice(2);
  const result: { filename?: string; theme?: 'dark' | 'light'; help?: boolean; all?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--all' || arg === '-a') {
      result.all = true;
    } else if (arg === '--theme' || arg === '-t') {
      const theme = args[i + 1];
      if (theme === 'dark' || theme === 'light') {
        result.theme = theme;
        i++; // 跳过下一个参数
      } else {
        console.warn(`警告: 无效的主题 "${theme}"，使用默认主题 "dark"`);
      }
    } else if (!arg.startsWith('-')) {
      // 第一个非选项参数作为文件名
      if (!result.filename) {
        result.filename = arg;
      }
    }
  }

  return result;
}

// 显示帮助信息
function showHelp() {
  console.log(`
Markdown 渲染器

用法:
  node dist/index.js [文件名] [选项]

参数:
  文件名              要渲染的 Markdown 文件名（不包含扩展名）
                     例如: "1" 将渲染 "1.md"
                     如果不指定，默认渲染 "1.md"

选项:
  -a, --all          渲染所有找到的 Markdown 文件
  -t, --theme <主题>  指定主题 (dark|light)，默认: dark
  -h, --help         显示此帮助信息

示例:
  node dist/index.js                    # 渲染 1.md，使用暗色主题
  node dist/index.js 2                  # 渲染 2.md，使用暗色主题
  node dist/index.js --all              # 渲染所有 .md 文件，使用暗色主题
  node dist/index.js --all --theme light # 渲染所有 .md 文件，使用浅色主题
  node dist/index.js readme --theme light  # 渲染 readme.md，使用浅色主题
  node dist/index.js doc -t dark        # 渲染 doc.md，使用暗色主题
`);
}

// 查找 Markdown 文件
function findMarkdownFile(filename: string): string | null {
  const dataDir = path.join(__dirname, '../data');
  const possiblePaths = [
    path.join(dataDir, `${filename}.md`),
    path.join(dataDir, filename),
    path.join(process.cwd(), `${filename}.md`),
    path.join(process.cwd(), filename)
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

// 查找所有 Markdown 文件
function findAllMarkdownFiles(): string[] {
  const dataDir = path.join(__dirname, '../data');
  const currentDir = process.cwd();
  const allFiles: string[] = [];

  // 在 data 目录中查找
  if (fs.existsSync(dataDir)) {
    const dataFiles = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(dataDir, file));
    allFiles.push(...dataFiles);
  }

  // 在当前目录中查找（排除已经在 data 目录中的文件）
  const currentFiles = fs.readdirSync(currentDir)
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(currentDir, file))
    .filter(file => !allFiles.some(existing => path.basename(existing) === path.basename(file)));
  
  allFiles.push(...currentFiles);

  return allFiles.sort();
}

// 渲染单个文件
async function renderSingleFile(filePath: string, theme: 'dark' | 'light', outputDir: string): Promise<void> {
  const renderer = new MarkdownRenderer({ theme });
  
  try {
    console.log(`⚡ 渲染: ${path.basename(filePath)}`);
    const html = await renderer.renderFile(filePath);
    
    // 生成输出文件名
    const baseName = path.basename(filePath, '.md');
    const outputFileName = `${baseName}-${theme}.html`;
    const outputPath = path.join(outputDir, outputFileName);
    
    // 保存渲染结果
    await fs.promises.writeFile(outputPath, html, 'utf-8');
    
    // 显示文件信息
    const stats = await fs.promises.stat(filePath);
    const outputStats = await fs.promises.stat(outputPath);
    
    console.log(`   ✅ ${outputFileName}`);
    console.log(`   📊 ${(stats.size / 1024).toFixed(2)} KB → ${(outputStats.size / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error(`   ❌ 渲染失败: ${error}`);
    throw error;
  }
}

async function main() {
  const args = parseArgs();

  // 显示帮助信息
  if (args.help) {
    showHelp();
    return;
  }

  const theme = args.theme || 'dark';
  console.log(`🎨 使用主题: ${theme}`);

  // 确保输出目录存在
  const outputDir = path.join(__dirname, '../output');
  await fs.promises.mkdir(outputDir, { recursive: true });

  try {
    if (args.all) {
      // 渲染所有文件
      console.log(`🔍 查找所有 Markdown 文件...`);
      const allFiles = findAllMarkdownFiles();
      
      if (allFiles.length === 0) {
        console.error(`❌ 未找到任何 .md 文件`);
        console.error(`请确保以下位置存在 Markdown 文件:`);
        console.error(`  - apps/render/data/`);
        console.error(`  - ${process.cwd()}/`);
        process.exit(1);
      }

      console.log(`📄 找到 ${allFiles.length} 个文件:`);
      allFiles.forEach(file => {
        console.log(`   - ${path.relative(process.cwd(), file)}`);
      });
      console.log('');

      let successCount = 0;
      let errorCount = 0;

      // 渲染所有文件
      for (const filePath of allFiles) {
        try {
          await renderSingleFile(filePath, theme, outputDir);
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      // 显示汇总结果
      console.log(`\n📊 渲染汇总:`);
      console.log(`   ✅ 成功: ${successCount} 个文件`);
      if (errorCount > 0) {
        console.log(`   ❌ 失败: ${errorCount} 个文件`);
      }
      console.log(`   📁 输出目录: ${outputDir}`);
      console.log(`   🌐 在浏览器中打开 HTML 文件查看效果`);

      // 列出生成的文件
      const outputFiles = fs.readdirSync(outputDir)
        .filter(file => file.endsWith(`-${theme}.html`))
        .sort();
      
      if (outputFiles.length > 0) {
        console.log(`\n🗂️ 生成的文件:`);
        outputFiles.forEach(file => {
          const filePath = path.join(outputDir, file);
          const stats = fs.statSync(filePath);
          console.log(`   - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
        });
      }

    } else {
      // 渲染单个文件
      const filename = args.filename || '1';
      console.log(`🔍 查找文件: ${filename}.md`);

      const mdPath = findMarkdownFile(filename);
      if (!mdPath) {
        console.error(`❌ 错误: 找不到文件 "${filename}.md"`);
        console.error(`请确保文件存在于以下位置之一:`);
        console.error(`  - apps/render/data/${filename}.md`);
        console.error(`  - ${process.cwd()}/${filename}.md`);
        console.error(`\n使用 --help 查看使用方法`);
        console.error(`使用 --all 渲染所有文件`);
        process.exit(1);
      }

      console.log(`📄 找到文件: ${mdPath}`);
      await renderSingleFile(mdPath, theme, outputDir);
      
      console.log(`\n✅ 渲染完成!`);
      console.log(`🌐 在浏览器中打开查看效果`);
    }

  } catch (error) {
    console.error('❌ 渲染过程中发生错误:', error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

main().catch(console.error);