#!/bin/bash

echo "🚀 Installing Payments Maps MCP Client..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Please install Node.js first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is required. Please install npm first."
    exit 1
fi

# 安装依赖
echo "📦 Installing dependencies..."
npm install

# 构建项目
echo "🔨 Building project..."
npm run build

# 全局安装
echo "🌍 Installing globally..."
npm install -g .

# 检查安装
if command -v payments-maps-mcp &> /dev/null; then
    echo "✅ Installation successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Copy the Claude Desktop configuration:"
    echo "   cp claude-config-template.json ~/Library/Application\ Support/Claude/claude_desktop_config.json"
    echo ""
    echo "2. Edit the config file and update the server URL:"
    echo "   Update PAYMENTS_MAPS_SERVER to your server's URL"
    echo ""
    echo "3. Restart Claude Desktop"
    echo ""
    echo "4. When you first use any Payments Maps tool, a browser will open for authentication"
    echo ""
    echo "🎉 Ready to use!"
else
    echo "❌ Installation failed. Please check the errors above."
    exit 1
fi