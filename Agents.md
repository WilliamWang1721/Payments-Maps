# Payments Maps 项目架构分析

## 项目概览

Payments Maps 是一个为信用卡和支付爱好者设计的智能地图平台，帮助用户发现和分享支持多种支付方式的商户。项目特别针对外国来华人士优化，提供多语言支持。

## 项目组成部分

### 1. Web 前端应用
**位置**: `/src`
**技术栈**:
- React 18 + TypeScript
- Vite 构建工具
- Tailwind CSS 样式框架
- React Router DOM 7 路由管理
- Zustand 状态管理
- Framer Motion 动画库
- React i18next 国际化（支持中/英/俄/德四语）
- Supabase JS SDK 后端集成

**核心功能模块**:
- 地图展示（高德地图集成）
- POS机管理（CRUD操作）
- 用户认证（多OAuth支持）
- 品牌管理系统
- 搜索和筛选系统
- 收藏和历史记录
- Beta激活系统
- 权限管理

### 2. Android 移动应用
**位置**: `/Payments-Maps-Apps/Android-Apps`
**技术栈**:
- Kotlin + Jetpack Compose
- MVVM架构模式
- Hilt 依赖注入
- 高德地图 SDK
- Supabase SDK

**应用架构**:
```
presentation/ (UI层)
├── auth/        # 登录、注册、忘记密码
├── map/         # 地图功能
├── pos/         # POS机管理
├── merchant/    # 商户管理
├── profile/     # 用户资料
├── search/      # 搜索功能
├── settings/    # 设置
└── usercenter/  # 用户中心

domain/ (业务逻辑层)
└── usecase/     # 用例实现

data/ (数据层)
├── api/         # API接口
├── database/    # 本地数据库
└── preferences/ # 用户偏好设置
```

### 3. MCP 服务器
**位置**: `/mcp-server`
**用途**: 为 Claude Desktop 提供 POS 机管理接口
**技术**: Node.js + Express + TypeScript

**提供的工具**:
- `search_pos_machines` - 搜索POS机
- `add_pos_machine` - 添加POS机
- `get_my_pos_machines` - 获取我的POS机
- `update_pos_machine` - 更新POS机
- `delete_pos_machine` - 删除POS机

**认证方式**:
- Google OAuth 2.0
- GitHub OAuth
- Microsoft OAuth
- Linux.do OAuth

### 4. MCP 客户端
**位置**: `/mcp-client`
**功能**:
- 一键安装到 Claude Desktop
- 自动OAuth认证流程
- 会话管理（24小时有效期）

### 5. iOS 应用（开发中）
**位置**: `/Payments-Maps-Apps/iOS-Apps`
**状态**: 项目结构已创建，开发进行中

## 数据库架构

### 核心数据表（PostgreSQL on Supabase）

#### 用户相关
- **users** - 用户基本信息
- **users_roles** - 用户角色（regular/beta/admin/super_admin）
- **user_favorites** - 用户收藏
- **user_history** - 搜索和访问历史

#### POS机相关
- **pos_machines** - POS机核心数据
  - 基本信息（位置、商户名称、品牌）
  - 支付配置（支持的卡组织、支付方式）
  - 验证模式（免密、PIN、签名）
  - 手续费配置
  - 状态和评价

#### 业务相关
- **brands** - 品牌信息（14个分类）
- **activation_codes** - Beta激活码
- **reviews/comments** - 评价系统
- **field_configs** - 动态字段配置

## 技术特点

### 前端架构特点
1. **代码分割优化**
   - 路由级别懒加载
   - 库级别分割（react-vendor、ui-vendor等）
   - 页面级别分割

2. **状态管理**
   - `useAuthStore` - 认证状态管理
   - `useMapStore` - 地图和POS机数据管理

3. **国际化体系**
   - 4种语言支持（中/英/俄/德）
   - 自动语言检测
   - localStorage持久化

### 安全性设计
1. **数据保护**
   - Row Level Security (RLS) 策略
   - 用户数据隔离
   - 输入验证

2. **认证体系**
   - 多OAuth提供商支持
   - 会话管理
   - 权限分级（普通/Beta/管理员）

3. **API安全**
   - 环境变量管理密钥
   - 前端使用匿名密钥
   - 后端使用服务角色密钥

## 核心功能流程

### 用户认证流程
1. 用户访问应用
2. 选择OAuth登录方式（Google/GitHub/Microsoft/LinuxDO）
3. OAuth提供商认证
4. Supabase创建/更新会话
5. 加载用户数据
6. 进入应用主界面

### POS机管理流程
1. **查询**: 关键词搜索 → 位置筛选 → 支付方式筛选 → 结果展示
2. **添加**: 填写表单 → 验证数据 → 提交到数据库 → 实时更新
3. **编辑**: 权限验证 → 加载数据 → 修改提交 → 更新推送
4. **删除**: 权限验证 → 确认操作 → 删除记录

### 地图功能流程
1. 加载高德地图SDK
2. 获取用户位置（带重试机制）
3. 加载附近POS机
4. 显示地图标记
5. 支持交互（点击查看详情）

## 部署架构

```
┌─────────────────────────────────────────────┐
│         用户端（浏览器/移动应用）              │
├─────────────────────────────────────────────┤
│ Web前端 │ Android App │ iOS App │ MCP客户端 │
├─────────────────────────────────────────────┤
│              API Gateway                     │
├─────────────────────────────────────────────┤
│           Supabase (BaaS)                    │
│  ├── PostgreSQL 数据库                       │
│  ├── Auth 认证服务                           │
│  ├── Realtime 实时订阅                       │
│  └── Storage 文件存储                        │
├─────────────────────────────────────────────┤
│  MCP Server (Node.js)  │  高德地图 API       │
└─────────────────────────────────────────────┘
```

## 开发命令

```bash
# Web前端开发
pnpm dev          # 启动开发服务器 (localhost:5173)
pnpm build        # 生产构建
pnpm preview      # 预览构建结果
pnpm check        # TypeScript类型检查
pnpm lint         # ESLint代码检查

# Android应用
./gradlew build   # 构建APK
./gradlew run     # 运行应用

# MCP服务器
npm run dev       # 开发模式
npm run build     # 构建
npm start         # 生产模式
```

## 项目统计

- **代码规模**: 主源代码 1.3MB，总项目 776MB
- **数据库迁移**: 30+ 个迁移文件
- **UI组件**: 20+ 个可复用组件
- **支持语言**: 4种（中/英/俄/德）
- **OAuth提供商**: 4个（Google/GitHub/Microsoft/LinuxDO）
- **卡组织支持**: 12种
- **商户分类**: 14种

## 已实现功能

✅ 地图展示和POS机标记
✅ 用户认证（多OAuth）
✅ POS机CRUD操作
✅ 4语言支持
✅ 品牌管理和筛选
✅ 用户收藏系统
✅ 搜索历史记录
✅ Beta激活系统
✅ 响应式设计
✅ 权限管理系统
✅ MCP Claude集成
✅ Android原生应用

## 开发中功能

🚧 iOS应用开发
🚧 新手引导系统
🚧 外国用户体验优化

## 技术栈总结

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 前端框架 | React | 18.3.1 | UI框架 |
| 语言 | TypeScript | 5.8.3 | 类型安全 |
| 构建工具 | Vite | 6.3.5 | 快速构建 |
| 样式 | Tailwind CSS | 3.4.17 | CSS框架 |
| 路由 | React Router | 7.3.0 | 客户端路由 |
| 状态管理 | Zustand | 5.0.3 | 全局状态 |
| 动画 | Framer Motion | 12.23 | 交互动画 |
| 国际化 | React i18next | 15.7 | 多语言支持 |
| 后端 | Supabase | - | BaaS服务 |
| 数据库 | PostgreSQL | - | 关系数据库 |
| 地图 | 高德地图 | - | 地理服务 |
| 认证 | Supabase Auth | - | OAuth集成 |
| Android | Jetpack Compose | - | 现代Android UI |
| Android | Kotlin | - | Android开发语言 |
| MCP | Node.js + Express | - | Claude集成 |
| 包管理 | pnpm | 10.12.1 | 依赖管理 |