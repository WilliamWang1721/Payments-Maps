# Payments Maps

这是一个 Web 应用，用于查找和显示支持多种支付方式（如 Apple Pay、Google Pay 等）的 POS 机信息。它通过地图和列表两种形式，直观地展示 POS 机的位置和详细信息，方便用户快速找到满足其支付需求的商家。

## ✨ 主要功能

- **地图展示**: 在高德地图上以标记点的形式，清晰地展示所有 POS 机的位置。
- **列表视图**: 以卡片列表的形式，展示所有 POS 机的详细信息。
- **支付方式图标**: 使用 `react-icons` 为不同的支付方式（Apple Pay, Google Pay, NFC 等）添加了清晰的图标，提升了用户体验。
- **信息筛选**: 用户可以根据支付方式筛选 POS 机。
- **用户系统**: 集成了 Supabase 实现用户认证和数据管理。
- **信息管理**: 登录用户可以添加、编辑自己的 POS 机信息。

## 🛠️ 技术栈

- **前端**: React, Vite, TypeScript
- **UI 框架**: Tailwind CSS
- **地图服务**: 高德地图 (AMap)
- **后端 & 数据库**: Supabase
- **图标**: React Icons
- **包管理器**: pnpm

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/WilliamWang1721/Payments-Maps.git
cd Payments-Maps
```

### 2. 环境配置

在项目根目录下，复制 `.env.example` 文件并重命名为 `.env`：

```bash
cp .env.example .env
```

然后，编辑 `.env` 文件，填入您的 Supabase 和高德地图的密钥：

```
# Supabase
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# 高德地图
VITE_AMAP_KEY=YOUR_AMAP_KEY
VITE_AMAP_SECURITY_KEY=YOUR_AMAP_SECURITY_KEY
```

### 3. 安装依赖

推荐使用 `pnpm` 进行依赖管理。

```bash
pnpm install
```

### 4. 运行项目

```bash
pnpm dev
```

项目将在 `http://localhost:5173` (或指定的端口) 上运行。

## 🤝 贡献

欢迎提交 Pull Request 或 Issue 来为项目做出贡献。
