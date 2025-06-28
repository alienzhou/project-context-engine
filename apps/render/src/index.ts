import { MarkdownRenderer } from './renderer';
import * as path from 'path';
import * as fs from 'fs';
// Parse command line arguments
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
        i++; // Skip next argument
      } else {
        console.warn(`Warning: Invalid theme "${theme}", using default theme "dark"`);
      }
    } else if (!arg.startsWith('-')) {
      // First non-option argument as filename
      if (!result.filename) {
        result.filename = arg;
      }
    }
  }

  return result;
}

// Show help information
function showHelp() {
  console.log(`
Markdown Renderer

Usage:
  node dist/index.js [filename] [options]

Arguments:
  filename            Markdown file to render (without extension)
                     Example: "1" will render "1.md"
                     If not specified, defaults to "1.md"

Options:
  -a, --all          Render all found Markdown files
  -t, --theme <theme> Specify theme (dark|light), default: dark
  -h, --help         Show this help information

Examples:
  node dist/index.js                    # Render 1.md with dark theme
  node dist/index.js 2                  # Render 2.md with dark theme
  node dist/index.js --all              # Render all .md files with dark theme
  node dist/index.js --all --theme light # Render all .md files with light theme
  node dist/index.js readme --theme light  # Render readme.md with light theme
  node dist/index.js doc -t dark        # Render doc.md with dark theme
`);
}

// Find Markdown file
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

// Find all Markdown files
function findAllMarkdownFiles(): string[] {
  const dataDir = path.join(__dirname, '../data');
  const currentDir = process.cwd();
  const allFiles: string[] = [];

  // Search in data directory
  if (fs.existsSync(dataDir)) {
    const dataFiles = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(dataDir, file));
    allFiles.push(...dataFiles);
  }

  // Search in current directory (excluding files already found in data directory)
  const currentFiles = fs.readdirSync(currentDir)
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(currentDir, file))
    .filter(file => !allFiles.some(existing => path.basename(existing) === path.basename(file)));

  allFiles.push(...currentFiles);

  return allFiles.sort();
}

// Render single file
async function renderSingleFile(filePath: string, theme: 'dark' | 'light', outputDir: string): Promise<void> {
  const renderer = new MarkdownRenderer({ theme });

  try {
    console.log(`⚡ Rendering: ${path.basename(filePath)}`);
    const html = await renderer.renderFile(filePath);

    // Generate output filename
    const baseName = path.basename(filePath, '.md');
    const outputFileName = `${baseName}-${theme}.html`;
    const outputPath = path.join(outputDir, outputFileName);

    // Save render result
    await fs.promises.writeFile(outputPath, html, 'utf-8');

    // Display file information
    const stats = await fs.promises.stat(filePath);
    const outputStats = await fs.promises.stat(outputPath);

    console.log(`   ✅ ${outputFileName}`);
    console.log(`   📊 ${(stats.size / 1024).toFixed(2)} KB → ${(outputStats.size / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error(`   ❌ Rendering failed: ${error}`);
    throw error;
  }
}

async function main() {
  const args = parseArgs();

  // Show help information
  if (args.help) {
    showHelp();
    return;
  }

  const theme = args.theme || 'dark';
  console.log(`🎨 Using theme: ${theme}`);

  // Ensure output directory exists
  const outputDir = path.join(__dirname, '../output');
  await fs.promises.mkdir(outputDir, { recursive: true });

  try {
    if (args.all) {
      // Render all files
      console.log(`🔍 Finding all Markdown files...`);
      const allFiles = findAllMarkdownFiles();

      if (allFiles.length === 0) {
        console.error(`❌ No .md files found`);
        console.error(`Please ensure Markdown files exist in:`);
        console.error(`  - apps/render/data/`);
        console.error(`  - ${process.cwd()}/`);
        process.exit(1);
      }

      console.log(`📄 Found ${allFiles.length} files:`);
      allFiles.forEach(file => {
        console.log(`   - ${path.relative(process.cwd(), file)}`);
      });
      console.log('');

      let successCount = 0;
      let errorCount = 0;

      // Render all files
      for (const filePath of allFiles) {
        try {
          await renderSingleFile(filePath, theme, outputDir);
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      // Show summary
      console.log(`\n📊 Render Summary:`);
      console.log(`   ✅ Success: ${successCount} files`);
      if (errorCount > 0) {
        console.log(`   ❌ Failed: ${errorCount} files`);
      }
      console.log(`   📁 Output directory: ${outputDir}`);
      console.log(`   🌐 Open HTML files in browser to view results`);

      // List generated files
      const outputFiles = fs.readdirSync(outputDir)
        .filter(file => file.endsWith(`-${theme}.html`))
        .sort();

      if (outputFiles.length > 0) {
        console.log(`\n🗂️ Generated files:`);
        outputFiles.forEach(file => {
          const filePath = path.join(outputDir, file);
          const stats = fs.statSync(filePath);
          console.log(`   - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
        });
      }

    } else {
      // Render single file
      const filename = args.filename || '1';
      console.log(`🔍 Finding file: ${filename}.md`);

      const mdPath = findMarkdownFile(filename);
      if (!mdPath) {
        console.error(`❌ Error: File "${filename}.md" not found`);
        console.error(`Please ensure the file exists in one of these locations:`);
        console.error(`  - apps/render/data/${filename}.md`);
        console.error(`  - ${process.cwd()}/${filename}.md`);
        console.error(`\nUse --help to see usage`);
        console.error(`Use --all to render all files`);
        process.exit(1);
      }

      console.log(`📄 Found file: ${mdPath}`);
      await renderSingleFile(mdPath, theme, outputDir);

      console.log(`\n✅ Rendering complete!`);
      console.log(`🌐 Open in browser to view results`);
    }

  } catch (error) {
    console.error('❌ Error during rendering:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  process.exit(1);
});

main().catch(console.error);