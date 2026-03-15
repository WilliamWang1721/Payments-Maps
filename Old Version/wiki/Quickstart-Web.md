# 快速开始（Web）

适用于本地开发与部署。默认使用 pnpm，可按需改用 npm/yarn。

## 前置要求
- Node.js ≥ 18
- pnpm ≥ 8（推荐）
- 浏览器可访问高德地图域名
- Supabase 项目（PostgreSQL + Auth 已启用）

## 1. 克隆与安装
```bash
git clone https://github.com/WilliamWang1721/Payments-Maps.git
cd Payments-Maps
pnpm install
```

## 2. 环境变量
复制模板后填写：
```bash
cp .env.example .env
```
关键项（示例）：
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

VITE_AMAP_KEY=your_amap_api_key
VITE_AMAP_SECURITY_JS_CODE=your_amap_security_js_code

VITE_GOOGLE_CLIENT_ID=your_google_client_id        # 可选
VITE_GITHUB_CLIENT_ID=your_github_client_id        # 可选
VITE_MICROSOFT_CLIENT_ID=your_microsoft_client_id  # 可选
VITE_LINUXDO_CLIENT_ID=your_linuxdo_client_id      # 可选
LINUXDO_CLIENT_ID=your_linuxdo_client_id           # 服务端必填（LinuxDO 登录）
LINUXDO_CLIENT_SECRET=your_linuxdo_client_secret   # 服务端必填（LinuxDO 登录）
APP_ORIGIN=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com
PASSKEY_ORIGIN=https://your-domain.com
```
- Supabase service key 与 OAuth client secret 仅在服务器侧使用，严禁使用 `VITE_` 前缀暴露到浏览器。
- 高德需配置安全密钥与白名单。

## 3. 运行与调试
```bash
pnpm dev           # 本地开发，默认 http://localhost:5173
pnpm check         # TypeScript 检查
pnpm lint          # ESLint 检查
pnpm build         # 生产构建
pnpm preview       # 本地预览 dist
```

## 4. Supabase 与数据库
- 运行迁移：在 Supabase SQL Editor 中执行 `supabase/migrations/` 下的迁移或使用 CI/CD 迁移脚本。
- MCP 需要额外表/函数：在 SQL Editor 执行 `sql/mcp_sessions.sql`（参考 [MCP 集成与测试](./MCP-Integration.md)）。
- 确认 Row Level Security（RLS）已开启，并确保 policies 覆盖 `pos_machines`、`users` 等表。

## 5. 构建产物部署
- 静态站点部署：将 `dist/` 上传到 Vercel/Netlify/静态服务器，或配合 Nginx。
- 环境变量在托管平台配置（与 `.env` 同名）。

## 6. 常见问题
- **无法加载地图**：检查 `VITE_AMAP_KEY` 和域名白名单；确认网络可访问高德域名。
- **登录回调失败**：OAuth 回调域名需与提供商配置一致，前端回调路径为 `/auth/<provider>/callback`。
- **POS 查询无数据**：确认 Supabase RLS 与 anon key 权限，数据库表/字段与迁移一致。
