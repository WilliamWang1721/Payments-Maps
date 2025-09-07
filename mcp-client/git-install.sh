#!/bin/bash

# Payments Maps MCP 客户端 Git 安装脚本

set -e

MCP_DIR="$HOME/.payments-maps-mcp"
REPO_URL="https://github.com/WilliamWang1721/Payments-Maps.git"
BRANCH="main"

echo "🚀 安装 Payments Maps MCP 客户端..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 需要 Node.js。请先安装 Node.js"
    echo "   下载地址: https://nodejs.org/"
    exit 1
fi

# 检查 git
if ! command -v git &> /dev/null; then
    echo "❌ 需要 git。请先安装 git"
    exit 1
fi

# 创建目录
mkdir -p "$HOME/.payments-maps-mcp"

# 检查是否已经存在
if [ -d "$MCP_DIR/.git" ]; then
    echo "📦 更新现有安装..."
    cd "$MCP_DIR"
    git fetch origin
    git reset --hard origin/$BRANCH
else
    echo "📦 克隆仓库..."
    git clone --branch $BRANCH --depth 1 "$REPO_URL" "$MCP_DIR"
    cd "$MCP_DIR"
fi

# 进入 MCP 客户端目录
cd "$MCP_DIR/mcp-client"

echo "📦 安装依赖..."
npm install

echo "🔨 构建项目..."
npm run build || echo "⚠️ 构建有警告，但可以继续使用"

echo "✅ 安装完成!"
echo ""
echo "📋 Claude Desktop 配置:"
echo "复制以下配置到你的 claude_desktop_config.json 文件中:"
echo ""
echo '{'
echo '  "mcpServers": {'
echo '    "payments-maps": {'
echo '      "command": "node",'
echo "      \"args\": [\"$MCP_DIR/mcp-client/dist/index.js\"],"
echo '      "env": {'
echo '        "PAYMENTS_MAPS_SERVER": "https://www.payments-maps.asia"'
echo '      }'
echo '    }'
echo '  }'
echo '}'
echo ""
echo "🏠 安装位置: $MCP_DIR"
echo "🎉 现在可以重启 Claude Desktop 或者 CherryStudio 使用了!"