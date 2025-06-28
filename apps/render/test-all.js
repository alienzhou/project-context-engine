const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🎯 Testing Batch Rendering (--all parameter)');
console.log('===================================\n');

function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    console.log(`📝 ${description}`);
    console.log(`💻 Execute: ${command} ${args.join(' ')}\n`);

    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: path.join(__dirname),
    });

    child.on('close', code => {
      if (code === 0) {
        console.log(`✅ Complete\n`);
        resolve();
      } else {
        console.log(`❌ Execution failed (exit code: ${code})\n`);
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

function listFiles(directory, extension = '.md') {
  try {
    const files = fs
      .readdirSync(directory)
      .filter(file => file.endsWith(extension))
      .sort();
    return files;
  } catch (error) {
    return [];
  }
}

async function demo() {
  try {
    // Check available Markdown files
    console.log('📋 Checking available Markdown files:');
    const dataDir = path.join(__dirname, 'data');
    const currentDir = __dirname;
    const dataFiles = listFiles(dataDir);
    const currentFiles = listFiles(currentDir);

    console.log(`   data/ directory: ${dataFiles.length} files`);
    dataFiles.forEach(file => console.log(`     - ${file}`));

    console.log(`   Current directory: ${currentFiles.length} files`);
    currentFiles.forEach(file => console.log(`     - ${file}`));

    console.log('');

    if (dataFiles.length === 0 && currentFiles.length === 0) {
      console.log('⚠️  No Markdown files found, creating a test file...');
      const testContent = `# Test File

This is an automatically generated test file.

## Mermaid Diagram Test

\`\`\`mermaid
graph LR
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`

## Code Test

\`\`\`javascript
console.log('Hello, World!');
\`\`\`
`;

      fs.writeFileSync(path.join(dataDir, 'test.md'), testContent, 'utf-8');
      console.log('✅ Created test file: data/test.md\n');
    }

    // Demo --all parameter
    await runCommand('node', ['dist/index.js', '--all'], '1. Render all files (dark theme)');

    console.log('⏳ Wait for 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    await runCommand(
      'node',
      ['dist/index.js', '--all', '--theme', 'light'],
      '2. Render all files (light theme)'
    );

    console.log('⏳ Wait for 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Show output files
    console.log('📁 Checking output directory:');
    const outputDir = path.join(__dirname, 'output');
    try {
      const outputFiles = fs
        .readdirSync(outputDir)
        .filter(file => file.endsWith('.html'))
        .sort();

      if (outputFiles.length > 0) {
        console.log(`   Found ${outputFiles.length} output files:`);
        outputFiles.forEach(file => {
          const filePath = path.join(outputDir, file);
          const stats = fs.statSync(filePath);
          console.log(`     - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
        });
      } else {
        console.log('   Output directory is empty');
      }
    } catch (error) {
      console.log('   Output directory does not exist');
    }

    console.log('\n🎉 Batch rendering demo completed!');
    console.log('📁 Check the generated files in apps/render/output/ directory');
    console.log('💡 Tip: Use npm run render:all for quick batch rendering');
  } catch (error) {
    console.error('❌ Error during demo:', error.message);
  }
}

// Check if compiled
const distExists = fs.existsSync('./dist/index.js');

if (!distExists) {
  console.log('⚠️  Project not compiled, please run first:');
  console.log('   npm run build');
  console.log('   then run: node test-all.js');
  process.exit(1);
}

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

demo();
