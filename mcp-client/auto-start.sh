#!/bin/bash

# Payments Maps MCP 自动启动脚本
# 自动下载、安装并启动 MCP 客户端

set -e

REPO_URL="https://github.com/WilliamWang1721/Payments-Maps.git"
MCP_DIR="$HOME/.payments-maps-mcp"
BRANCH="main"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# 确保目录存在
mkdir -p "$HOME/.payments-maps-mcp"

echo "🚀 Payments Maps MCP 启动中..." >&2

# 检查是否已安装
if [ ! -d "$MCP_DIR/.git" ]; then
    echo "📦 首次运行，正在下载 MCP 客户端..." >&2
    
    # 检查依赖
    if ! command -v git &> /dev/null; then
        echo "❌ 需要安装 git" >&2
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo "❌ 需要安装 Node.js" >&2
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ 需要安装 npm" >&2
        exit 1
    fi
    
    # 克隆仓库
    echo "📦 克隆仓库..." >&2
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$MCP_DIR" >&2
    
    # 安装依赖
    echo "📦 安装依赖..." >&2
    cd "$MCP_DIR/mcp-client"
    npm install --silent >&2 2>/dev/null || npm install >&2
    
    # 构建
    echo "🔨 构建项目..." >&2
    npm run build >&2 2>/dev/null || echo "⚠️ 构建有警告，继续运行..." >&2
    
    echo "✅ MCP 客户端安装完成" >&2
    
else
    # 更新检查（可选）
    echo "🔄 检查更新..." >&2
    cd "$MCP_DIR"
    
    # 获取远程更新（静默）
    git fetch origin --quiet 2>/dev/null || true
    
    # 检查是否有更新
    LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "")
    REMOTE=$(git rev-parse origin/$BRANCH 2>/dev/null || echo "")
    
    if [ "$LOCAL" != "$REMOTE" ] && [ -n "$REMOTE" ]; then
        echo "📦 发现更新，正在更新..." >&2
        git reset --hard origin/$BRANCH >&2 2>/dev/null || true
        
        cd "$MCP_DIR/mcp-client"
        npm install --silent >&2 2>/dev/null || npm install >&2
        npm run build >&2 2>/dev/null || echo "⚠️ 构建有警告，继续运行..." >&2
        
        echo "✅ 更新完成" >&2
    fi
fi

# 启动 MCP 客户端
echo "🌟 启动 Payments Maps MCP 客户端..." >&2
cd "$MCP_DIR/mcp-client"

# 检查构建文件是否存在
if [ ! -f "dist/index.js" ]; then
    echo "🔨 构建文件不存在，重新构建..." >&2
    npm run build >&2 2>/dev/null || echo "⚠️ 构建有警告，尝试启动..." >&2
fi

# 启动
exec node dist/index.js