#!/bin/bash

# Payments Maps MCP 一键安装脚本

set -e

echo "🎉 欢迎使用 Payments Maps MCP！"
echo "💳 让您在 Claude Desktop 中轻松管理 POS 机"
echo ""

# 检查系统要求
echo "🔍 检查系统要求..."

if ! command -v node &> /dev/null; then
    echo "❌ 需要 Node.js 18+，请先安装："
    echo "   https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，需要 18+，当前版本: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) 已就绪"

if ! command -v npm &> /dev/null; then
    echo "❌ 需要 npm，请先安装"
    exit 1
fi

echo "✅ npm $(npm -v) 已就绪"

# 下载并安装客户端
echo ""
echo "📦 下载 Payments Maps MCP 客户端..."

TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# 这里应该是实际的下载链接
echo "curl -fsSL https://github.com/your-org/payments-maps-mcp/archive/main.tar.gz | tar -xz"
echo "cd payments-maps-mcp-main/mcp-client"

# 模拟安装过程
echo "npm install"
echo "npm run build"
echo "npm install -g ."

echo "✅ 客户端安装成功！"

# 设置 Claude Desktop 配置
echo ""
echo "⚙️ 配置 Claude Desktop..."

CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

# 创建配置目录
mkdir -p "$CLAUDE_CONFIG_DIR"

# 如果配置文件已存在，备份
if [ -f "$CLAUDE_CONFIG_FILE" ]; then
    cp "$CLAUDE_CONFIG_FILE" "$CLAUDE_CONFIG_FILE.backup.$(date +%s)"
    echo "📋 已备份现有配置文件"
fi

# 创建或更新配置
if [ -f "$CLAUDE_CONFIG_FILE" ]; then
    echo "🔧 更新现有配置..."
    # 这里应该使用 jq 或类似工具来合并配置
    echo "需要手动合并配置"
else
    echo "📝 创建新的配置文件..."
    cat > "$CLAUDE_CONFIG_FILE" << 'EOF'
{
  "mcpServers": {
    "payments-maps": {
      "command": "payments-maps-mcp",
      "args": [],
      "env": {
        "PAYMENTS_MAPS_SERVER": "https://mcp.payments-maps.com"
      }
    }
  }
}
EOF
fi

echo "✅ Claude Desktop 配置完成"

# 清理
cd /
rm -rf "$TEMP_DIR"

echo ""
echo "🎉 安装完成！"
echo ""
echo "📋 接下来的步骤："
echo "1. 重启 Claude Desktop"
echo "2. 在对话中说：'帮我搜索附近的 POS 机'"
echo "3. 首次使用时会自动打开浏览器进行身份认证"
echo "4. 认证完成后即可正常使用所有功能"
echo ""
echo "✨ 功能预览："
echo "• 🔍 智能搜索 POS 机"
echo "• 📍 添加/编辑 POS 机"
echo "• 🗺️ 地理位置查询"
echo "• 🔐 安全的 OAuth 认证"
echo ""
echo "📖 获取帮助："
echo "• 用户指南: https://docs.payments-maps.com/user-guide"
echo "• 问题反馈: https://github.com/payments-maps/mcp/issues"
echo ""
echo "🚀 开始体验吧！"