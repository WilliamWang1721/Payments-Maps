#!/bin/bash

# Payments Maps MCP 一键启动脚本
# 用法: bash <(curl -fsSL https://raw.githubusercontent.com/WilliamWang1721/Payments-Maps/main/mcp-client/start.sh)

set -e

REPO_URL="https://github.com/WilliamWang1721/Payments-Maps.git"
MCP_DIR="$HOME/.payments-maps-mcp"
BRANCH="main"
LOG_FILE="/tmp/payments-maps-mcp.log"

# 重定向错误输出到日志文件
exec 2>"$LOG_FILE"

echo "🚀 Payments Maps MCP Starting..." >&2

# 检查依赖
check_dependencies() {
    local missing=()
    
    command -v git >/dev/null 2>&1 || missing+=("git")
    command -v node >/dev/null 2>&1 || missing+=("node")
    command -v npm >/dev/null 2>&1 || missing+=("npm")
    
    if [ ${#missing[@]} -ne 0 ]; then
        echo "❌ Missing dependencies: ${missing[*]}" >&2
        echo "Please install: ${missing[*]}" >&2
        exit 1
    fi
}

# 安装或更新
install_or_update() {
    if [ ! -d "$MCP_DIR/.git" ]; then
        echo "📦 First run - cloning repository..." >&2
        mkdir -p "$MCP_DIR"
        git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$MCP_DIR" >/dev/null 2>&1
        
        echo "📦 Installing dependencies..." >&2
        cd "$MCP_DIR/mcp-client"
        npm install --silent >/dev/null 2>&1
        
        echo "🔨 Building project..." >&2
        npm run build >/dev/null 2>&1 || {
            echo "⚠️ Build warnings, but continuing..." >&2
        }
        
        echo "✅ Installation completed!" >&2
    else
        echo "🔍 Checking for updates..." >&2
        cd "$MCP_DIR"
        
        # 静默获取更新
        git fetch origin --quiet >/dev/null 2>&1 || true
        
        LOCAL=$(git rev-parse HEAD 2>/dev/null)
        REMOTE=$(git rev-parse origin/$BRANCH 2>/dev/null)
        
        if [ "$LOCAL" != "$REMOTE" ]; then
            echo "📦 Updating to latest version..." >&2
            git reset --hard origin/$BRANCH >/dev/null 2>&1
            
            cd "$MCP_DIR/mcp-client"
            npm install --silent >/dev/null 2>&1
            npm run build >/dev/null 2>&1 || {
                echo "⚠️ Build warnings, but continuing..." >&2
            }
            
            echo "✅ Update completed!" >&2
        fi
    fi
}

# 启动 MCP 服务
start_mcp() {
    cd "$MCP_DIR/mcp-client"
    
    # 确保构建文件存在
    if [ ! -f "dist/index.js" ]; then
        echo "🔨 Rebuilding..." >&2
        npm run build >/dev/null 2>&1 || true
    fi
    
    echo "🌟 Starting Payments Maps MCP Client..." >&2
    echo "📱 Server: ${PAYMENTS_MAPS_SERVER:-https://www.payments-maps.asia}" >&2
    echo "🛠️ Available tools: search_pos_machines, get_pos_details, add_pos_machine" >&2
    echo "✨ Ready for Claude Desktop connection!" >&2
    
    # 启动 MCP 客户端
    exec node dist/simple-client.js
}

# 主流程
main() {
    check_dependencies
    install_or_update
    start_mcp
}

# 执行主流程
main "$@"