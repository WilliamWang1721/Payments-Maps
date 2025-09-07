# 部署指南

本指南介绍如何将 Payments Maps MCP Server 部署到生产环境。

## 🏗️ 架构概览

```
用户 Claude Desktop → MCP Client → 您的 MCP Server (云端) → Supabase
```

## 🚀 部署选项

### 方式 1: Docker 部署（推荐）

1. **准备环境变量**：
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，填入生产环境配置
   ```

2. **构建和启动**：
   ```bash
   docker-compose up -d
   ```

3. **验证部署**：
   ```bash
   curl https://your-domain.com/health
   ```

### 方式 2: 云平台部署

#### Vercel 部署
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

#### Heroku 部署
```bash
# 创建 Heroku 应用
heroku create payments-maps-mcp

# 设置环境变量
heroku config:set SUPABASE_URL=your_url
heroku config:set SUPABASE_SERVICE_KEY=your_key

# 部署
git push heroku main
```

#### Railway 部署
1. 连接 GitHub 仓库到 Railway
2. 在 Railway Dashboard 设置环境变量
3. 自动部署

## 🔧 环境变量配置

### 必需变量
```bash
# 服务配置
NODE_ENV=production
PORT=3001
BASE_URL=https://your-domain.com

# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# OAuth 配置（至少配置一个）
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### OAuth 应用设置

#### Google OAuth
1. 访问 [Google Cloud Console](https://console.cloud.google.com)
2. 创建 OAuth 2.0 客户端 ID
3. 添加重定向 URI: `https://your-domain.com/auth/callback`

#### GitHub OAuth
1. 访问 GitHub Settings → Developer settings → OAuth Apps
2. 创建新的 OAuth App
3. Authorization callback URL: `https://your-domain.com/auth/callback`

## 🌐 Nginx 配置（可选）

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # HTTPS 重定向
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 证书配置
    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;
    
    # 代理到 MCP Server
    location / {
        proxy_pass http://payments-maps-mcp:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # MCP 连接特殊处理
    location /mcp/ {
        proxy_pass http://payments-maps-mcp:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

## 👥 用户接入指南

### 步骤 1: 用户认证
用户需要先访问您的认证页面进行 OAuth 登录：
1. 访问 `https://your-domain.com/auth/url`
2. 选择 OAuth 提供商
3. 完成授权流程
4. 获得会话 ID

### 步骤 2: Claude Desktop 配置
用户需要在 Claude Desktop 配置文件中添加：

```json
{
  "mcpServers": {
    "payments-maps": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-fetch",
        "https://your-domain.com/mcp/[SESSION_ID]"
      ]
    }
  }
}
```

## 🔐 安全配置

### HTTPS 强制
```javascript
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

### CORS 配置
```javascript
app.use(cors({
  origin: [
    'https://claude.ai',
    'https://your-domain.com'
  ],
  credentials: true
}));
```

### 速率限制
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 限制每个 IP 100 次请求
  message: '请求过于频繁，请稍后再试'
});

app.use(limiter);
```

## 📊 监控和日志

### 健康检查
```bash
# 检查服务状态
curl https://your-domain.com/health

# 预期响应
{
  "status": "ok",
  "service": "Payments Maps MCP Server",
  "version": "1.0.0",
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

### 日志监控
```bash
# Docker 日志
docker-compose logs -f payments-maps-mcp

# 系统资源监控
docker stats
```

### 性能监控
推荐集成监控服务：
- **Sentry**: 错误追踪
- **DataDog**: 性能监控
- **New Relic**: APM 监控

## 🔧 故障排除

### 常见问题

1. **OAuth 回调失败**
   - 检查重定向 URI 配置
   - 验证客户端 ID 和密钥
   - 确认 BASE_URL 设置正确

2. **会话管理问题**
   - 检查会话存储（内存/Redis）
   - 验证会话过期时间
   - 确认用户认证状态

3. **数据库连接错误**
   - 检查 Supabase 配置
   - 验证网络连接
   - 确认数据库权限

### 性能优化

1. **启用 gzip 压缩**
2. **配置缓存策略**
3. **数据库连接池**
4. **负载均衡（多实例）**

## 📈 扩展配置

### 多实例部署
```yaml
version: '3.8'
services:
  payments-maps-mcp:
    build: .
    ports:
      - "3001-3003:3001"
    deploy:
      replicas: 3
    environment:
      # ... 环境变量
```

### Redis 会话存储
```javascript
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// 使用 Redis 存储会话
// 替换内存会话管理器
```

## 🚨 安全检查清单

- [ ] HTTPS 证书配置
- [ ] 环境变量保护
- [ ] OAuth 应用安全配置
- [ ] 数据库权限最小化
- [ ] API 速率限制
- [ ] 日志记录（不含敏感信息）
- [ ] 定期安全更新
- [ ] 备份策略

部署完成后，您的用户就可以通过 Claude Desktop 连接到您的 MCP 服务器进行 POS 机管理了！