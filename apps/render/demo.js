const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
console.log('🎯 Markdown 渲染器命令行功能演示');
console.log('=====================================\n');

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

async function demo() {
  try {
    // 显示帮助信息
    await runCommand('node', ['dist/index.js', '--help'], 
      '1. 显示帮助信息');
    
    console.log('⏳ 等待 2 秒...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 渲染默认文件
    await runCommand('node', ['dist/index.js'], 
      '2. 渲染默认文件 (1.md) 使用暗色主题');
    
    console.log('⏳ 等待 2 秒...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    // 渲染指定文件
    await runCommand('node', ['dist/index.js', '2'], 
      '3. 渲染指定文件 (2.md) 使用暗色主题');
    
    console.log('⏳ 等待 2 秒...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 使用浅色主题
    await runCommand('node', ['dist/index.js', '1', '--theme', 'light'], 
      '4. 渲染文件使用浅色主题');
    
    console.log('🎉 演示完成！');
    console.log('📁 查看 apps/render/output/ 目录中的生成文件');
    
  } catch (error) {
    console.error('❌ 演示过程中出现错误:', error.message);
  }
}

// 检查是否已编译
const distExists = fs.existsSync('./dist/index.js');

if (!distExists) {
  console.log('⚠️  检测到项目未编译，请先运行:');
  console.log('   npm run build');
  console.log('   然后再运行: node demo.js');
  process.exit(1);
}

demo();