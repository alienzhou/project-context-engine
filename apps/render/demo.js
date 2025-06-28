const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
console.log('🎯 Markdown Renderer CLI Feature Demo');
console.log('=====================================\n');

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

async function demo() {
  try {
    // Show help information
    await runCommand('node', ['dist/index.js', '--help'], '1. Show help information');

    console.log('⏳ Wait for 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Render default file
    await runCommand('node', ['dist/index.js'], '2. Render default file (1.md) with dark theme');

    console.log('⏳ Wait for 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Render specified file
    await runCommand(
      'node',
      ['dist/index.js', '2'],
      '3. Render specified file (2.md) with dark theme'
    );

    console.log('⏳ Wait for 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Use light theme
    await runCommand(
      'node',
      ['dist/index.js', '1', '--theme', 'light'],
      '4. Render file with light theme'
    );

    console.log('🎉 Demo completed!');
    console.log('📁 Check the generated files in apps/render/output/ directory');
  } catch (error) {
    console.error('❌ Error during demo:', error.message);
  }
}

// Check if compiled
const distExists = fs.existsSync('./dist/index.js');

if (!distExists) {
  console.log('⚠️  Project not compiled, please run first:');
  console.log('   npm run build');
  console.log('   then run: node demo.js');
  process.exit(1);
}

demo();
