# 架构总览

本文概述 Payments Maps 的技术选型、关键模块与数据流，方便贡献者快速定位代码。

## 技术栈
- **前端**：React 18、TypeScript 5、Vite 6、Tailwind CSS，使用 React Router 7 进行路由、Framer Motion 做动画、Lucide React 提供图标。
- **状态管理**：Zustand（`src/stores`）存储认证信息、地图状态、用户偏好。
- **后端服务**：Supabase（PostgreSQL + Auth + Storage + Real-time）负责数据存储与认证；高德地图 API 提供地图底层能力；第三方 OAuth（GitHub、Google、Microsoft、LinuxDo 等）做账号登录。

## 路由与页面
- 路由定义位于 `src/router/index.tsx`：`/` 为落地页，受保护的应用入口在 `/app`，其子路由覆盖地图、列表、品牌、收藏、历史、设置等页面，支持懒加载与 `Suspense` 占位。
- 认证回调路径 `/auth/*` 对应不同平台的登录成功处理；`/onboarding` 复用新手引导组件。
- `ProtectedRoute` 负责在未登录时拦截 `/app` 子路由并重定向到登录页。

## 状态与权限
- `useAuthStore`：初始化 Supabase 客户端，监听 `onAuthStateChange` 事件并将用户写入 Zustand；供路由和界面判断登录态。
- `useMapStore`：管理地图实例、定位、POS 列表、筛选条件、选中标记等；`loadPOSMachines`、`addPOSMachine`、`selectPOSMachine` 等函数负责数据同步和 UI 状态。
- `usePermissions`：封装角色/权限判定，用于控制某些按钮和管理入口（如角色管理、MCP 设置）。

## 地图与交互
- 地图页面 (`src/pages/Map.tsx`) 通过 `loadAMap` 和 `DEFAULT_MAP_CONFIG` 创建高德地图实例，并调用 `getCurrentLocation` 获取用户定位；加载完成后添加比例尺、工具栏等控件。
- 搜索与历史：`useSearchHistory` 维护输入记录，`SearchSuggestions` 提供联想，查询结果与 `posMachines` 同步。
- 新手引导：`OnboardingTour` 根据 `useOnboardingTour` 状态向用户展示分步提示，帮助理解地图与过滤器。

## 数据结构与表单
- 添加/编辑 POS 页 (`src/pages/AddPOS.tsx`, `src/pages/EditPOS.tsx`) 使用结构化表单收集 POS 设备信息、支付能力（Apple/Google Pay、闪付、HCE 等）、验证模式（免密、密码、签名）、收单模式与费用配置。
- 表单会校验商户名称、地址与坐标等必填字段，并支持附加自定义链接、尝试记录、备注和扩展字段。

## 配置与环境变量
- `.env` 中需要配置：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`、`VITE_AMAP_KEY`、`VITE_AMAP_SECURITY_KEY` 以及可选的第三方登录 Client ID。缺失地图密钥会导致地图初始化失败并弹出错误提示。
- 构建/预览命令：`pnpm build` 与 `pnpm preview`；部署到 Vercel 或其他静态托管需同时配置上述变量与高德安全域名。
