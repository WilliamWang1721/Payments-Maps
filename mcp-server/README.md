# Payments Maps 公共 MCP Server

支付地图 POS 机管理的**公共 MCP 服务器**。所有用户都可以连接到同一个服务器实例，通过 Claude Desktop 管理 POS 机数据。

## 🏗️ 架构说明

这是一个**中心化的 MCP 服务器**，架构如下：

```
用户的 Claude Desktop → MCP 客户端 → 您的 MCP Server (云端) → Supabase 数据库
                                    ↓
                            多用户会话管理 + OAuth 认证
```

### 与传统本地部署的区别

- ❌ **传统方式**: 每个用户都需要自己部署 MCP 服务器
- ✅ **新架构**: 用户只需连接到您的公共服务器
- ✅ **优势**: 统一管理、无需用户部署、更好的安全性

## ✨ 功能特性

### 🔍 POS 机搜索
- 按关键词搜索（商户名称、地址）
- 地理位置搜索（指定坐标和半径）
- 高级筛选（支付方式、卡组织、状态等）
- 距离排序和计算

### 📍 POS 机管理
- **添加 POS 机**: 创建新的 POS 机记录
- **更新信息**: 修改自己添加的 POS 机
- **删除设备**: 删除自己添加的 POS 机
- **查看详情**: 获取完整的 POS 机信息

### 🔐 安全认证
- 支持多种 OAuth 提供商：
  - Google OAuth 2.0
  - GitHub OAuth
  - Microsoft OAuth
  - LinuxDO OAuth
- 基于用户权限的数据访问控制
- 用户只能修改自己添加的 POS 机

### 💾 数据集成
- 完整的 Supabase 集成
- 实时数据同步
- 支持复杂的筛选和查询
- 地理位置计算和搜索

## 🚀 部署服务器（管理员）

### 快速部署

1. **克隆和安装**:
   ```bash
   git clone <repository>
   cd mcp-server
   npm install
   npm run build
   ```

2. **配置环境变量**:
   ```bash
   cp .env.example .env
   # 编辑 .env，填入 Supabase 和 OAuth 配置
   ```

3. **启动服务器**:
   ```bash
   # 开发环境
   npm run dev
   
   # 生产环境
   npm start
   
   # 或使用 Docker
   docker-compose up -d
   ```

4. **验证部署**:
   ```bash
   curl http://localhost:3001/health
   ```

详细部署指南请参见 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 👥 用户接入流程

### 用户侧步骤

1. **OAuth 认证**:
   - 访问您的认证页面: `https://your-server.com`
   - 选择 OAuth 提供商（Google/GitHub/Microsoft/LinuxDO）
   - 完成授权，获得会话 ID

2. **配置 Claude Desktop**:
   在 `~/Library/Application Support/Claude/claude_desktop_config.json` 添加：
   ```json
   {
     "mcpServers": {
       "payments-maps": {
         "command": "npx",
         "args": [
           "@modelcontextprotocol/server-fetch",
           "https://your-server.com/mcp/[SESSION_ID]"
         ]
       }
     }
   }
   ```

3. **开始使用**:
   重启 Claude Desktop，即可通过自然语言管理 POS 机！

## 🔧 配置说明

### 环境变量

```bash
# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# OAuth 配置（至少配置一个）
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

GITHUB_CLIENT_ID=your_github_client_id  
GITHUB_CLIENT_SECRET=your_github_client_secret

MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

LINUXDO_CLIENT_ID=your_linuxdo_client_id
LINUXDO_CLIENT_SECRET=your_linuxdo_client_secret
```

### Supabase 配置

确保你的 Supabase 项目具有以下表结构：

```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_metadata JSONB
);

-- POS 机表
CREATE TABLE pos_machines (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  latitude DECIMAL NOT NULL,
  longitude DECIMAL NOT NULL,
  merchant_name TEXT NOT NULL,
  basic_info JSONB,
  verification_modes JSONB,
  attempts JSONB[],
  remarks TEXT,
  extended_fields JSONB,
  status TEXT DEFAULT 'active',
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  review_count INTEGER DEFAULT 0
);

-- 创建索引
CREATE INDEX idx_pos_machines_location ON pos_machines (latitude, longitude);
CREATE INDEX idx_pos_machines_created_by ON pos_machines (created_by);
CREATE INDEX idx_pos_machines_status ON pos_machines (status);
```

## 📚 工具使用指南

### 1. 认证

在使用其他工具前，需要先进行认证：

```json
{
  "tool": "authenticate",
  "parameters": {
    "provider": "google",
    "access_token": "your_oauth_access_token"
  }
}
```

支持的 providers：`google`, `github`, `microsoft`, `linuxdo`

### 2. 搜索 POS 机

```json
{
  "tool": "search_pos_machines",
  "parameters": {
    "query": "星巴克",
    "latitude": 39.9042,
    "longitude": 116.4074,
    "radius": 5,
    "filters": {
      "supportsApplePay": true,
      "supportsContactless": true,
      "status": "active"
    },
    "limit": 20
  }
}
```

### 3. 添加 POS 机

```json
{
  "tool": "add_pos_machine",
  "parameters": {
    "address": "北京市朝阳区三里屯太古里",
    "latitude": 39.9369,
    "longitude": 116.4466,
    "merchant_name": "星巴克咖啡",
    "basic_info": {
      "model": "Ingenico iCT250",
      "acquiring_institution": "中国银联",
      "checkout_location": "人工收银",
      "supports_apple_pay": true,
      "supports_google_pay": true,
      "supports_contactless": true,
      "supported_card_networks": ["Visa", "Mastercard", "UnionPay"]
    },
    "remarks": "支持多种支付方式"
  }
}
```

### 4. 管理自己的 POS 机

```json
// 获取我的 POS 机列表
{
  "tool": "get_my_pos_machines",
  "parameters": {
    "status": "all",
    "limit": 50
  }
}

// 更新 POS 机信息
{
  "tool": "update_pos_machine", 
  "parameters": {
    "pos_id": "pos_123456789_abcdefghi",
    "updates": {
      "merchant_name": "新商户名称",
      "status": "maintenance"
    }
  }
}

// 删除 POS 机
{
  "tool": "delete_pos_machine",
  "parameters": {
    "pos_id": "pos_123456789_abcdefghi"
  }
}
```

## 🔍 筛选选项

### 支付方式筛选
- `supportsApplePay`: Apple Pay 支持
- `supportsGooglePay`: Google Pay 支持  
- `supportsContactless`: NFC 非接触支付

### 卡组织筛选
- `supportsVisa`: Visa 卡支持
- `supportsMastercard`: Mastercard 支持
- `supportsUnionPay`: 银联卡支持
- `supportsAmex`: American Express 支持
- `supportsJCB`: JCB 卡支持
- `supportsDiners`: Diners Club 支持
- `supportsDiscover`: Discover 卡支持

### 状态筛选
- `active`: 正常运行
- `inactive`: 暂停使用
- `maintenance`: 维护中
- `disabled`: 已禁用

## 🛡️ 安全性

- **权限控制**: 用户只能修改自己添加的 POS 机
- **OAuth 认证**: 支持多种主流 OAuth 提供商
- **数据验证**: 所有输入数据都经过严格验证
- **错误处理**: 完善的错误处理和日志记录

## 🚨 故障排除

### 常见问题

1. **认证失败**
   - 检查 OAuth 配置是否正确
   - 确认访问令牌是否有效
   - 验证提供商 API 是否可访问

2. **数据库连接错误**
   - 检查 Supabase URL 和密钥
   - 确认网络连接
   - 验证数据库表结构

3. **搜索结果为空**
   - 检查搜索参数是否正确
   - 确认数据库中有相关数据
   - 验证地理位置坐标

### 调试模式

启动服务器时添加调试信息：
```bash
DEBUG=* node build/index.js
```

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请提交 GitHub Issue 或联系开发团队。