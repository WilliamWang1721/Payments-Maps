# Google OAuth 设置指南

## 问题描述
当前Google登录功能跳转到404页面，原因是`.env`文件中的`VITE_GOOGLE_CLIENT_ID`仍然是占位符，需要配置真实的Google OAuth客户端ID。

## 解决步骤

### 1. 访问Google Cloud Console
打开浏览器，访问：https://console.cloud.google.com/

### 2. 创建或选择项目
- 如果没有项目，点击"创建项目"
- 如果已有项目，从顶部下拉菜单选择项目

### 3. 启用必要的API
在左侧导航栏中：
1. 点击"API和服务" > "库"
2. 搜索并启用以下API：
   - **Google+ API**（用于基础OAuth）
   - **People API**（用于获取详细用户信息）

### 4. 创建OAuth 2.0凭据
1. 在左侧导航栏中，点击"API和服务" > "凭据"
2. 点击"+ 创建凭据" > "OAuth 2.0客户端ID"
3. 如果首次创建，需要先配置"OAuth同意屏幕"：
   - 选择"外部"用户类型
   - 填写应用名称：`Payments Maps`
   - 填写用户支持电子邮件
   - 添加授权域（可选）：`localhost`
   - 填写开发者联系信息

### 5. 配置OAuth客户端
1. 选择应用类型：**Web应用程序**
2. 名称：`Payments Maps Web Client`
3. 已获授权的JavaScript来源：
   ```
   http://localhost:5173
   ```
4. 已获授权的重定向URI：
   ```
   http://localhost:5173/auth/google/callback
   ```

### 6. 获取凭据信息
创建完成后，会显示：
- **客户端ID**（类似：`123456789-abcdefg.apps.googleusercontent.com`）
- **客户端密钥**（类似：`GOCSPX-abcdefghijklmnop`）

### 7. 更新环境变量
将获取的凭据信息更新到`.env`文件中：

```env
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=你的真实客户端ID.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=你的真实客户端密钥
VITE_GOOGLE_API_KEY=AIzaSyAnIznwe2grePNXQw8amIJ2cWdRB96o2IM
```

### 8. 重启开发服务器
更新环境变量后，需要重启开发服务器：
```bash
npm run dev
```

## 测试Google登录
1. 打开浏览器访问：http://localhost:5173
2. 点击"Google登录"按钮
3. 应该会正确跳转到Google OAuth授权页面
4. 授权后会返回到应用并完成登录

## 注意事项
- 确保重定向URI完全匹配（包括协议、域名、端口、路径）
- 开发环境使用`http://localhost:5173`
- 生产环境需要使用实际的域名和HTTPS
- API密钥已经正确配置为：`AIzaSyAnIznwe2grePNXQw8amIJ2cWdRB96o2IM`

## 常见问题

### Q: 仍然跳转到404页面
**A:** 检查以下几点：
1. 客户端ID是否正确复制（不包含多余空格）
2. 重定向URI是否完全匹配
3. 是否重启了开发服务器

### Q: "redirect_uri_mismatch"错误
**A:** 在Google Cloud Console中检查重定向URI配置，确保与代码中的URI完全一致。

### Q: "access_denied"错误
**A:** 用户拒绝了授权，或者OAuth同意屏幕配置有问题。

---

完成以上步骤后，Google登录功能应该可以正常工作。如有问题，请检查浏览器控制台的错误信息。