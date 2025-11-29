# MCP 集成与测试

本指南覆盖 Claude Desktop / CherryStudio 一键配置、数据库准备及前端功能验证。

## 1. 一键配置（Claude Desktop）
将以下片段添加到 `claude_desktop_config.json`（macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`）：
```json
{
  "mcpServers": {
    "payments-maps": {
      "command": "bash",
      "args": [
        "-c",
        "curl -fsSL https://raw.githubusercontent.com/WilliamWang1721/Payments-Maps/main/mcp-client/start.sh | bash"
      ],
      "env": {
        "PAYMENTS_MAPS_SERVER": "https://www.payments-maps.asia"
      }
    }
  }
}
```
重启 Claude Desktop 后，首次调用工具会自动安装/更新客户端并发起 OAuth。

### CherryStudio
- 命令：`bash`
- 参数：
  ```
  -c
  curl -fsSL https://raw.githubusercontent.com/WilliamWang1721/Payments-Maps/main/mcp-client/start.sh | bash
  ```
- 环境变量：`PAYMENTS_MAPS_SERVER=https://www.payments-maps.asia`

## 2. 数据库准备（Supabase）
MCP 需要额外的表与函数（会话管理）。在 Supabase SQL Editor 执行 `sql/mcp_sessions.sql`，或运行自动化脚本：
```bash
node scripts/migrate-mcp-sessions.js   # 需正确配置服务端密钥
```
完成后可用以下查询验证：
```sql
SELECT * FROM information_schema.tables WHERE table_name='mcp_sessions';
SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%mcp%';
```

## 3. 前端使用
- 打开 `/app/mcp-settings`，点击“生成配置文件”弹出配置并支持一键复制。
- 查看“已连接客户端”以确认会话状态。
- 若页面提示缺少表/函数，回到步骤 2 创建后刷新。

## 4. 可用工具（MCP）
- `search_pos_machines`：按位置/支付方式搜索 POS
- `add_pos_machine`：添加 POS 记录
- `get_my_pos_machines`：读取当前用户 POS
- `update_pos_machine`：更新 POS
- `delete_pos_machine`：删除 POS

## 5. 功能测试清单
- UI：在个人信息页入口看到 MCP 设置按钮；设置页有介绍卡片、快速操作、客户端列表。
- 配置：点击“生成配置文件”可显示/隐藏内容并复制成功。
- 数据：执行 `generate_mcp_session` 后，会话列表显示最新记录且权限正确。
- 构建：`pnpm check`、`pnpm build` 通过。

更多细节参考根目录的 `MCP_ONE_CLICK_SETUP.md`、`MCP_DATABASE_SETUP.md` 与 `MCP_TESTING_GUIDE.md`。
