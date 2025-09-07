# Payments Maps MCP 用户指南

体验极致简单的 POS 机管理！只需几个步骤就能在 Claude Desktop 中使用。

## 🎯 用户体验流程

```
导入 MCP 配置 → 启动服务 → 自动打开浏览器认证 → AI 正常使用所有功能
```

## 📥 安装步骤

### 方法 1: 一键安装（推荐）
```bash
# 下载并安装
curl -fsSL https://your-domain.com/install.sh | bash
```

### 方法 2: 手动安装
```bash
# 1. 下载客户端
git clone <repository>
cd mcp-client

# 2. 安装
./install.sh
```

## ⚙️ 配置 Claude Desktop

### 1. 复制配置文件
```bash
cp claude-config-template.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### 2. 编辑配置（可选）
如果您的服务器不是默认地址，请修改：
```json
{
  "mcpServers": {
    "payments-maps": {
      "command": "payments-maps-mcp",
      "args": [],
      "env": {
        "PAYMENTS_MAPS_SERVER": "https://your-actual-server.com"
      }
    }
  }
}
```

### 3. 重启 Claude Desktop

## 🚀 开始使用

### 首次使用体验

1. **在 Claude Desktop 中说**：
   ```
   "帮我搜索附近的 POS 机"
   ```

2. **自动认证流程**：
   - 🖥️ 系统自动打开浏览器
   - 🌐 显示漂亮的登录页面
   - 🔐 选择您的登录方式（Google/GitHub/Microsoft/LinuxDO）
   - ✅ 完成 OAuth 授权
   - 🎉 认证成功，浏览器自动关闭

3. **开始使用**：
   - Claude Desktop 中立即可用所有功能
   - 无需重新认证（24小时有效期）

### 实际对话示例

**用户**：帮我找找北京三里屯附近支持 Apple Pay 的咖啡店

**Claude**：我来帮您搜索北京三里屯附近支持 Apple Pay 的咖啡店...
*[首次使用会自动打开浏览器认证]*
*[认证完成后立即返回结果]*

找到 3 家符合条件的咖啡店：
1. 星巴克（三里屯太古里店）- 0.2km
2. 瑞幸咖啡（三里屯SOHO店）- 0.5km  
3. Costa Coffee（世贸天阶店）- 0.8km

**用户**：帮我添加一个新的 POS 机

**Claude**：好的！我来帮您添加新的 POS 机。请提供以下信息...
*[无需重新认证，直接使用]*

## ✨ 功能特性

### 🔍 智能搜索
- 地理位置搜索
- 关键词搜索
- 多维度筛选
- 距离排序

### 📍 POS 机管理  
- 添加新设备
- 更新设备信息
- 删除自己的设备
- 查看设备详情

### 🔐 安全认证
- OAuth 2.0 标准
- 多提供商支持
- 自动会话管理
- 24小时免认证

## 🎨 认证界面预览

用户首次使用时会看到：

```
💳 Payments Maps
   POS 机管理助手

🌟 使用 Google 账户登录
🐱 使用 GitHub 账户登录  
🏢 使用 Microsoft 账户登录
🐧 使用 Linux.do 账户登录

登录后，您可以在 Claude Desktop 中管理 POS 机数据
```

## 🔧 故障排除

### 认证相关

**Q: 浏览器没有自动打开**  
A: 请手动访问终端中显示的认证链接

**Q: 认证后显示错误**  
A: 请检查网络连接，或联系管理员

**Q: 会话过期怎么办**  
A: 再次使用任何工具时会自动重新认证

### 配置相关

**Q: Claude Desktop 找不到 MCP 服务**  
A: 检查配置文件路径和格式是否正确

**Q: 命令无法执行**  
A: 确认是否已全局安装：`which payments-maps-mcp`

## 📱 支持的平台

- ✅ macOS (推荐)
- ✅ Linux  
- ✅ Windows (WSL)

## 🔄 更新

保持客户端最新版本：
```bash
npm update -g payments-maps-mcp-client
```

## 🤝 获取帮助

- 📖 详细文档：[完整指南](./README.md)
- 🐛 问题反馈：GitHub Issues
- 💬 社区支持：Discord/Telegram

---

**🎉 就是这么简单！**  
导入配置 → 重启 Claude → 开始使用 → 自动认证 → 尽情享受！