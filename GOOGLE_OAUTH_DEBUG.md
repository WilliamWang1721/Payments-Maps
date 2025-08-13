# Google OAuth 404 错误调试指南

## 当前问题
用户点击Google登录后跳转到404错误页面。

## 调试步骤

### 1. 访问测试页面
打开浏览器访问：`http://localhost:5173/google-test`

### 2. 检查环境变量配置
点击"测试Google登录配置"按钮，查看浏览器控制台输出：
- 检查CLIENT_ID是否正确加载
- 检查生成的授权URL是否包含正确的客户端ID
- 确认重定向URI为：`http://localhost:5173/auth/google/callback`

### 3. Google Cloud Console配置检查

#### 3.1 访问Google Cloud Console
1. 打开 https://console.cloud.google.com/
2. 选择您的项目
3. 导航到 "APIs & Services" > "Credentials"

#### 3.2 检查OAuth 2.0客户端ID配置
找到您的OAuth 2.0客户端ID：`514516412086-ujcgjvjse1gpg8sts5dhlq2os8jgj27u.apps.googleusercontent.com`

**重要检查项：**

1. **已授权的JavaScript来源**
   - 必须包含：`http://localhost:5173`
   - 必须包含：`http://127.0.0.1:5173`（可选但推荐）

2. **已授权的重定向URI**
   - 必须包含：`http://localhost:5173/auth/google/callback`
   - 必须包含：`http://127.0.0.1:5173/auth/google/callback`（可选但推荐）

#### 3.3 常见配置错误
- ❌ 缺少`http://localhost:5173`作为已授权的JavaScript来源
- ❌ 缺少`http://localhost:5173/auth/google/callback`作为重定向URI
- ❌ 使用了`https`而不是`http`（本地开发环境）
- ❌ 端口号不匹配（确保是5173）

### 4. 测试OAuth流程

1. 在测试页面点击"测试Google登录配置"
2. 查看控制台日志，确认：
   - 环境变量正确加载
   - 授权URL生成正确
   - 没有占位符错误

3. 如果配置正确，会跳转到Google授权页面
4. 授权后应该跳转回：`http://localhost:5173/auth/google/callback`

### 5. 常见错误和解决方案

#### 错误1："redirect_uri_mismatch"
**原因：** Google Cloud Console中的重定向URI配置不匹配
**解决：** 在Google Cloud Console中添加正确的重定向URI

#### 错误2："unauthorized_client"
**原因：** JavaScript来源未授权
**解决：** 在Google Cloud Console中添加`http://localhost:5173`作为已授权的JavaScript来源

#### 错误3：404页面
**原因：** 可能的原因包括：
- 路由配置问题
- 重定向URI配置错误
- 客户端ID配置错误

### 6. 验证步骤

1. ✅ 环境变量正确配置（.env文件）
2. ✅ 路由配置正确（/auth/google/callback）
3. ✅ Google Cloud Console配置正确
4. ✅ 开发服务器运行在正确端口（5173）

## 当前配置状态

- **客户端ID：** `514516412086-ujcgjvjse1gpg8sts5dhlq2os8jgj27u.apps.googleusercontent.com`
- **重定向URI：** `http://localhost:5173/auth/google/callback`
- **开发服务器：** `http://localhost:5173`
- **测试页面：** `http://localhost:5173/google-test`

## 下一步操作

1. 访问测试页面并查看控制台日志
2. 检查Google Cloud Console配置
3. 根据错误信息进行相应修复
4. 重新测试Google登录流程