#!/bin/bash
# Markdown Renderer Example Script

echo "🚀 Markdown Renderer Demo"
echo "======================"

# Ensure project is built
echo "📦 Building project..."
npm run build

echo ""
echo "📄 Rendering example files..."

# Render default file (1.md) - dark theme
echo "1️⃣ Rendering 1.md (dark theme)"
node dist/index.js 1

echo ""

# Render default file (1.md) - light theme
echo "2️⃣ Rendering 1.md (light theme)"
node dist/index.js 1 --theme light

echo ""

# If other test files exist, render them too
if [ -f "data/2.md" ]; then
    echo "3️⃣ Rendering 2.md (dark theme)"
    node dist/index.js 2
    echo ""
fi

if [ -f "data/readme.md" ]; then
    echo "4️⃣ Rendering readme.md (light theme)"
    node dist/index.js readme --theme light
    echo ""
fi

echo "🔥 Batch Rendering Demo"
echo "=================="

# Batch render all files - dark theme
echo "5️⃣ Batch rendering all files (dark theme)"
node dist/index.js --all

echo ""

# Batch render all files - light theme
echo "6️⃣ Batch rendering all files (light theme)"
node dist/index.js --all --theme light

echo ""

echo "✅ Rendering complete!"
echo "📁 Check output files in output/ directory"
echo "🌐 Open HTML files in browser to view results"

# List generated files
echo ""
echo "🗂️ Generated files:"
if [ -d "output" ]; then
    echo "   Dark theme files:"
    ls -la output/*-dark.html 2>/dev/null | while read line; do
        filename=$(echo $line | awk '{print $9}')
        size=$(echo $line | awk '{print $5}')
        echo "     - $(basename $filename) ($(echo "scale=2; $size/1024" | bc -l) KB)"
    done

    echo "   Light theme files:"
    ls -la output/*-light.html 2>/dev/null | while read line; do
        filename=$(echo $line | awk '{print $9}')
        size=$(echo $line | awk '{print $5}')
        echo "     - $(basename $filename) ($(echo "scale=2; $size/1024" | bc -l) KB)"
    done
else
    echo "   Dark theme files:"
    ls -la output/*-dark.html 2>/dev/null || echo "     - No dark theme files yet"
    echo "   Light theme files:"
    ls -la output/*-light.html 2>/dev/null || echo "     - No light theme files yet"
fi

echo ""
echo "💡 Quick commands:"
echo "   npm run render:all        # Batch render (dark theme)"
echo "   npm run render:all:light   # Batch render (light theme)"
echo "   npm run render:all:dark    # Batch render (dark theme)"
echo "   npm run render:help        # Show help information"

# Statistics
if [ -d "data" ]; then
    md_count=$(find data -name "*.md" | wc -l)
    echo ""
    echo "📊 Statistics:"
    echo "   Source files: $md_count .md files"
fi

if [ -d "output" ]; then
    html_count=$(find output -name "*.html" | wc -l)
    total_size=$(find output -name "*.html" -exec stat -f%z {} \; | awk '{sum+=$1} END {print sum}')
    echo "   Output files: $html_count .html files"
    if [ -n "$total_size" ]; then
        echo "   Total output size: $(echo "scale=2; $total_size/1024" | bc -l) KB"
    fi
fi
