#!/bin/bash

echo "🚀 Installing Payments Maps MCP Server..."

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# 进入 MCP 服务器目录
cd mcp-server

# 安装依赖
echo "📦 Installing dependencies..."
npm install

# 编译 TypeScript
echo "🔨 Building TypeScript..."
npm run build

# 检查构建是否成功
if [ ! -f "build/index.js" ]; then
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

echo "✅ MCP Server built successfully!"

# 创建环境变量文件
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your actual configuration values."
else
    echo "📝 .env file already exists."
fi

# 测试服务器
echo "🧪 Testing server startup..."
timeout 5s node build/index.js > /dev/null 2>&1
if [ $? -eq 124 ]; then
    echo "✅ Server starts successfully (timeout is expected for test)."
else
    echo "❌ Server test failed. Please check your configuration."
    exit 1
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update the .env file with your Supabase and OAuth credentials"
echo "2. Add this server to your Claude Desktop config:"
echo "   Location: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "3. Copy the configuration from claude_desktop_config.json"
echo "4. Restart Claude Desktop"
echo ""
echo "📖 For detailed setup instructions, see README.md"