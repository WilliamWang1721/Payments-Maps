#!/bin/bash

# Payments Maps MCP 一键启动脚本
# 用于 Claude Desktop / CherryStudio 配置

REPO_URL="https://github.com/WilliamWang1721/Payments-Maps.git"
MCP_DIR="$HOME/.payments-maps-mcp"
BRANCH="main"

# 静默模式 - 只在出错时输出
exec 2>/tmp/mcp-payments-maps.log

mkdir -p "$HOME/.payments-maps-mcp"

# 检查是否已安装
if [ ! -d "$MCP_DIR/.git" ]; then
    # 首次安装
    if ! command -v git &> /dev/null || ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        echo "Error: Missing dependencies (git, node, npm)" >&2
        exit 1
    fi
    
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$MCP_DIR" &>/dev/null
    cd "$MCP_DIR/mcp-client"
    npm install --silent &>/dev/null
    npm run build &>/dev/null || true
else
    # 检查更新
    cd "$MCP_DIR"
    git fetch origin --quiet &>/dev/null || true
    
    LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "")
    REMOTE=$(git rev-parse origin/$BRANCH 2>/dev/null || echo "")
    
    if [ "$LOCAL" != "$REMOTE" ] && [ -n "$REMOTE" ]; then
        git reset --hard origin/$BRANCH &>/dev/null
        cd "$MCP_DIR/mcp-client"
        npm install --silent &>/dev/null
        npm run build &>/dev/null || true
    fi
fi

# 启动
cd "$MCP_DIR/mcp-client"
[ ! -f "dist/index.js" ] && npm run build &>/dev/null
exec node dist/index.js