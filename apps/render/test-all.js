const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🎯 测试批量渲染功能 (--all 参数)');
console.log('===================================\n');

function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    console.log(`📝 ${description}`);
    console.log(`💻 执行: ${command} ${args.join(' ')}\n`);
    
    const child = spawn(command, args, { 
      stdio: 'inherit',
      cwd: path.join(__dirname)
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ 完成\n`);
        resolve();
      } else {
        console.log(`❌ 执行失败 (退出码: ${code})\n`);
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

function listFiles(directory, extension = '.md') {
  try {
    const files = fs.readdirSync(directory)
      .filter(file => file.endsWith(extension))
      .sort();
    return files;
  } catch (error) {
    return [];
  }
}

async function demo() {
  try {
    // 检查可用的 Markdown 文件
    console.log('📋 检查可用的 Markdown 文件:');
    const dataDir = path.join(__dirname, 'data');
    const currentDir = __dirname;
    const dataFiles = listFiles(dataDir);
    const currentFiles = listFiles(currentDir);
    
    console.log(`   data/ 目录: ${dataFiles.length} 个文件`);
    dataFiles.forEach(file => console.log(`     - ${file}`));
    
    console.log(`   当前目录: ${currentFiles.length} 个文件`);
    currentFiles.forEach(file => console.log(`     - ${file}`));
    
    console.log('');
    
    if (dataFiles.length === 0 && currentFiles.length === 0) {
      console.log('⚠️  没有找到 Markdown 文件，创建一个测试文件...');
      const testContent = `# 测试文件

这是一个自动生成的测试文件。

## Mermaid 图表测试

\`\`\`mermaid
graph LR
    A[开始] --> B[处理]
    B --> C[结束]
\`\`\`

## 代码测试

\`\`\`javascript
console.log('Hello, World!');
\`\`\`
`;
      
      fs.writeFileSync(path.join(dataDir, 'test.md'), testContent, 'utf-8');
      console.log('✅ 创建了测试文件: data/test.md\n');
    }
    
    // 演示 --all 参数
    await runCommand('node', ['dist/index.js', '--all'], 
      '1. 渲染所有文件 (暗色主题)');
    
    console.log('⏳ 等待 2 秒...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await runCommand('node', ['dist/index.js', '--all', '--theme', 'light'], 
      '2. 渲染所有文件 (浅色主题)');
    
    console.log('⏳ 等待 2 秒...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 显示输出文件
    console.log('📁 检查输出目录:');
    const outputDir = path.join(__dirname, 'output');
    try {
      const outputFiles = fs.readdirSync(outputDir)
        .filter(file => file.endsWith('.html'))
        .sort();
      
      if (outputFiles.length > 0) {
        console.log(`   找到 ${outputFiles.length} 个输出文件:`);
        outputFiles.forEach(file => {
          const filePath = path.join(outputDir, file);
          const stats = fs.statSync(filePath);
          console.log(`     - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
        });
      } else {
        console.log('   输出目录为空');
      }
    } catch (error) {
      console.log('   输出目录不存在');
    }
    
    console.log('\n🎉 批量渲染演示完成！');
    console.log('📁 查看 apps/render/output/ 目录中的生成文件');
    console.log('💡 提示: 可以使用 npm run render:all 快速批量渲染');
    
  } catch (error) {
    console.error('❌ 演示过程中出现错误:', error.message);
  }
}

// 检查是否已编译
const distExists = fs.existsSync('./dist/index.js');

if (!distExists) {
  console.log('⚠️  检测到项目未编译，请先运行:');
  console.log('   npm run build');
  console.log('   然后再运行: node test-all.js');
  process.exit(1);
}

// 确保 data 目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

demo();