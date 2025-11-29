# Payments Maps Wiki

一个为信用卡和支付爱好者打造的智能支付地图平台。这里收录项目概览、安装部署、使用教程和 MCP/移动端指南，便于快速上手与协同。

## 目录
- [快速开始（Web）](./Quickstart-Web.md)
- [用户使用教程](./User-Guide.md)
- [MCP 集成与测试](./MCP-Integration.md)
- [Android 客户端](./Android-App.md)

## 项目概要
- **核心功能**：高德地图标记、POS 机 CRUD、搜索与筛选、收藏/历史、品牌管理、权限与 Beta 激活、MCP Claude 集成。
- **技术栈**：React 18 + TypeScript + Vite + Tailwind CSS + React Router 7 + Zustand + Framer Motion + React i18next；后端基于 Supabase（PostgreSQL、Auth、Storage、Realtime）。
- **多语言**：中/英/俄/德，自动检测 + 本地存储偏好。
- **客户端**：Web 前端；Android（Jetpack Compose）；iOS（进行中）；MCP 服务器与客户端为 Claude/Desktop 提供 POS 工具。

## 快速了解
- Web 前端源码：`/src`
- Android App：`/Payments-Maps-Apps/Android-Apps`
- MCP 服务器：`/mcp-server`
- MCP 客户端：`/mcp-client`
- 典型命令：`pnpm dev`（开发）、`pnpm build`（生产）、`pnpm check`/`pnpm lint`（质量）

需要直接开始开发，请跳转：[快速开始（Web）](./Quickstart-Web.md)。想直接使用和体验功能，请看：[用户使用教程](./User-Guide.md)。
