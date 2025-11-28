# 使用教程

本指南覆盖从环境准备到核心功能操作的全流程，帮助你快速体验 Payments Maps。

## 环境准备
- Node.js ≥ 18，建议配合 pnpm ≥ 8（项目使用 Vite 6 + React 18 + TypeScript 5）。
- 注册并获取：Supabase 项目 URL/anon key、高德地图 API Key 与安全密钥。
- 克隆仓库后复制 `.env.example` 为 `.env`，填入以上密钥。

```bash
pnpm install
cp .env.example .env
pnpm dev
```
开发环境默认运行在 `http://localhost:5173`。

## 账户与登录
- Supabase 认证集成了 GitHub、Google、Microsoft、LinuxDo 等第三方登录，完成授权后会在 `useAuthStore` 中写入用户会话信息并驱动受保护路由。未登录访问 `/app` 会被 `ProtectedRoute` 重定向到登录页。
- 登录成功后可在头像菜单进入「个人资料」「收藏」「历史记录」等页面。

## 地图与查找（/app/map）
- 首次进入地图会自动加载高德地图并尝试定位当前位置，失败时会回退到默认城市并提示错误。
- 顶部搜索框支持商户名称/地址搜索并提供历史记录与联想（`useSearchHistory` + `SearchSuggestions`）。
- 点击标记可查看 POS 详情卡片，若拥有权限可跳转到编辑页。
- 侧边栏/浮层提供支付方式、卡网络、收单模式等过滤；地图控件包含比例尺与工具栏；新用户会触发 `OnboardingTour` 引导。

## 提交与编辑 POS
- 在「添加 POS」页需要填写商户名、地址、准确坐标（地图拾取器）、POS 基本信息（型号、收单机构）、支付方式与验证模式等字段。
- 表单校验要求：商户名、地址、经纬度必填；推荐补充设备型号与收单机构；支持添加自定义链接、费用配置与备注。
- 提交后 `useMapStore.addPOSMachine` 会写入状态并触发 Supabase API 调用，成功后返回列表/地图。

## 品牌、收藏与历史
- 「品牌」页用于按品牌筛选或管理商户标签；「收藏」和「历史记录」页基于 `useMapStore` 与 Supabase 存储用户偏好。
- 部分管理页（角色管理、MCP 设置等）需要更高权限，受 `usePermissions` 控制。

## 部署（预览/生产）
- 构建：`pnpm build`；本地预览：`pnpm preview`。
- Vercel：连接仓库后在环境变量中配置 Supabase 与高德密钥，可自动部署。
- 传统部署：将 `dist/` 部署到任意静态服务器或 CDN，需确保接口域名与高德安全域名配置匹配。
