#!/bin/bash
# Markdown 渲染器示例脚本

echo "🚀 Markdown 渲染器演示"
echo "======================"

# 确保项目已构建
echo "📦 构建项目..."
npm run build

echo ""
echo "📄 渲染示例文件..."

# 渲染默认文件 (1.md) - 暗色主题
echo "1️⃣ 渲染 1.md (暗色主题)"
node dist/index.js 1

echo ""

# 渲染默认文件 (1.md) - 浅色主题  
echo "2️⃣ 渲染 1.md (浅色主题)"
node dist/index.js 1 --theme light

echo ""

# 如果存在其他测试文件，也渲染它们
if [ -f "data/2.md" ]; then
    echo "3️⃣ 渲染 2.md (暗色主题)"
    node dist/index.js 2
    echo ""
fi

if [ -f "data/readme.md" ]; then
    echo "4️⃣ 渲染 readme.md (浅色主题)"
    node dist/index.js readme --theme light
    echo ""
fi

echo "🔥 批量渲染演示"
echo "=================="

# 批量渲染所有文件 - 暗色主题
echo "5️⃣ 批量渲染所有文件 (暗色主题)"
node dist/index.js --all

echo ""

# 批量渲染所有文件 - 浅色主题
echo "6️⃣ 批量渲染所有文件 (浅色主题)"
node dist/index.js --all --theme light

echo ""

echo "✅ 渲染完成！"
echo "📁 查看输出文件在 output/ 目录中"
echo "🌐 在浏览器中打开 HTML 文件查看效果"

# 列出生成的文件
echo ""
echo "🗂️ 生成的文件："
if [ -d "output" ]; then
    echo "   暗色主题文件："
    ls -la output/*-dark.html 2>/dev/null | while read line; do
        filename=$(echo $line | awk '{print $9}')
        size=$(echo $line | awk '{print $5}')
        echo "     - $(basename $filename) ($(echo "scale=2; $size/1024" | bc -l) KB)"
    done
    
    echo "   浅色主题文件："
    ls -la output/*-light.html 2>/dev/null | while read line; do
        filename=$(echo $line | awk '{print $9}')
        size=$(echo $line | awk '{print $5}')
        echo "     - $(basename $filename) ($(echo "scale=2; $size/1024" | bc -l) KB)"
    done
else
    echo "   暗色主题文件："
    ls -la output/*-dark.html 2>/dev/null || echo "     - 暂无暗色主题文件"
    echo "   浅色主题文件："
    ls -la output/*-light.html 2>/dev/null || echo "     - 暂无浅色主题文件"
fi

echo ""
echo "💡 便捷命令提示："
echo "   npm run render:all        # 批量渲染 (暗色主题)"
echo "   npm run render:all:light   # 批量渲染 (浅色主题)"
echo "   npm run render:all:dark    # 批量渲染 (暗色主题)"
echo "   npm run render:help        # 显示帮助信息"

# 统计信息
if [ -d "data" ]; then
    md_count=$(find data -name "*.md" | wc -l)
    echo ""
    echo "📊 统计信息："
    echo "   源文件数量: $md_count 个 .md 文件"
fi

if [ -d "output" ]; then
    html_count=$(find output -name "*.html" | wc -l)
    total_size=$(find output -name "*.html" -exec stat -f%z {} \; | awk '{sum+=$1} END {print sum}')
    echo "   输出文件数量: $html_count 个 .html 文件"
    if [ -n "$total_size" ]; then
        echo "   总输出大小: $(echo "scale=2; $total_size/1024" | bc -l) KB"
    fi
fi