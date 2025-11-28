# Payments Maps Wiki

欢迎来到 Payments Maps 项目的 GitHub 维基首页。本维基聚焦：
- 帮助新贡献者和体验者快速搭建并熟悉产品使用
- 解释前后端架构与关键模块
- 汇总常用的运维与配置步骤

## 项目概览
Payments Maps 是一个为信用卡和移动支付爱好者打造的智能地图平台，帮助用户发现、提交、验证支持多种支付方式的商户信息。前端采用 React + TypeScript + Vite，后端使用 Supabase（PostgreSQL、Auth、Storage、实时同步）并整合高德地图 API。

核心特性：
- 多语言界面（中文、英文、俄语、德语）与即时切换
- 高德地图定位、搜索、聚合与标记浏览
- POS 设备与支付能力的结构化描述与筛选
- Supabase 认证（GitHub、Google、Microsoft、LinuxDo 等）与权限控制
- 用户历史、收藏、品牌管理与新手引导

## 快速使用入口
- [使用教程](./Usage-Guide.md)：本地运行、登录、地图操作、提交 POS、验证信息
- [架构总览](./Architecture.md)：前端路由、状态管理、后端依赖、环境变量
- [部署与运维提示](./Usage-Guide.md#部署预览生产)（与使用教程合并）

## 适用人群
- 想快速体验或验证功能的用户
- 需要本地或云端部署的工程师
- 希望了解数据模型与地图交互的贡献者

## 如何贡献
1. 按照 [使用教程](./Usage-Guide.md) 完成本地运行与账号登录。
2. 在 `src` 中找到对应模块：页面位于 `src/pages`，复用组件在 `src/components`，状态存储在 `src/stores`，工具和配置在 `src/lib` 与 `src/utils`。
3. 通过 GitHub Issues/Discussions 提交问题或建议，提交代码遵循 README 中的 commit 规范与 lint/build 流程。
