# Payments Maps - Android App

一个基于Android原生开发的支付地图应用，使用Jetpack Compose + Material 3 Expressive设计，集成Supabase后端服务。

## 功能特性

### 🗺️ 地图功能
- 实时显示POS机位置
- 支持地图搜索和筛选
- POS机详情查看
- 位置导航功能

### 👤 用户管理
- 用户注册和登录
- 个人信息管理
- 偏好设置

### 🏪 商户管理
- 商户信息管理
- POS机设备管理w
- 交易记录查看

### ⚙️ 系统设置
- 主题切换（浅色/深色）
- 多语言支持         
- 通知设置
- 隐私设置

## 技术架构

### 架构模式
- **Clean Architecture**: 分层架构，职责分离
- **MVVM**: Model-View-ViewModel模式
- **Repository Pattern**: 数据访问抽象

### 技术栈
- **UI**: Jetpack Compose + Material 3 Expressive
- **依赖注入**: Hilt
- **网络**: Retrofit + OkHttp
- **数据库**: Room + Supabase
- **地图**: Google Maps SDK
- **异步**: Kotlin Coroutines + Flow
- **导航**: Navigation Compose
- **图片加载**: Coil

### 项目结构

```
app/
├── src/main/
│   ├── java/com/paymentsmaps/
│   │   ├── data/           # 数据层
│   │   │   ├── local/      # 本地数据源
│   │   │   ├── remote/     # 远程数据源
│   │   │   ├── repository/ # 仓库实现
│   │   │   └── model/      # 数据模型
│   │   ├── domain/         # 业务逻辑层
│   │   │   ├── model/      # 业务模型
│   │   │   ├── repository/ # 仓库接口
│   │   │   └── usecase/    # 用例
│   │   ├── presentation/   # 表现层
│   │   │   ├── ui/         # UI组件
│   │   │   ├── viewmodel/  # ViewModel
│   │   │   ├── navigation/ # 导航
│   │   │   └── theme/      # 主题
│   │   └── di/             # 依赖注入
│   ├── res/                # 资源文件
│   └── AndroidManifest.xml
└── build.gradle.kts
```

## 开发环境设置

### 前置要求
- Android Studio Hedgehog | 2023.1.1 或更高版本
- JDK 17 或更高版本
- Android SDK API 34
- Kotlin 1.9.0 或更高版本

### 配置步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd Payments-Maps-Apps/Android-Apps
   ```

2. **配置API密钥**
   
   复制 `local.properties.example` 为 `local.properties`：
   ```bash
   cp local.properties.example local.properties
   ```
   
   编辑 `local.properties` 文件，填入实际的API密钥：
   ```properties
   sdk.dir=/path/to/your/android/sdk
   
   # Supabase配置
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # Google Maps API密钥
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

3. **同步项目**
   
   在Android Studio中打开项目，等待Gradle同步完成。

4. **运行应用**
   
   连接Android设备或启动模拟器，点击运行按钮。

## API配置指南

### Supabase设置

1. 访问 [Supabase](https://supabase.com) 创建新项目
2. 在项目设置中获取URL和API密钥
3. 配置数据库表结构（参考 `supabase/migrations/`）
4. 设置行级安全策略（RLS）

### Google Maps设置

1. 访问 [Google Cloud Console](https://console.cloud.google.com)
2. 创建新项目或选择现有项目
3. 启用Maps SDK for Android
4. 创建API密钥并设置应用限制

## 构建和部署

### Debug构建
```bash
./gradlew assembleDebug
```

### Release构建
```bash
./gradlew assembleRelease
```

### 运行测试
```bash
./gradlew test
./gradlew connectedAndroidTest
```

### 代码检查
```bash
./gradlew lint
./gradlew detekt
```

## 开发规范

### 代码风格
- 遵循 [Kotlin编码规范](https://kotlinlang.org/docs/coding-conventions.html)
- 使用 [Android Kotlin风格指南](https://developer.android.com/kotlin/style-guide)
- 配置ktlint进行代码格式化

### Git提交规范
- 使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式
- 示例：`feat: add user authentication`

### 分支策略
- `main`: 主分支，稳定版本
- `develop`: 开发分支
- `feature/*`: 功能分支
- `hotfix/*`: 热修复分支

## 常见问题

### Q: 编译失败，提示找不到API密钥
A: 确保已正确配置 `local.properties` 文件中的API密钥。

### Q: 地图无法显示
A: 检查Google Maps API密钥是否正确，并确保已启用Maps SDK for Android。

### Q: 网络请求失败
A: 检查Supabase配置是否正确，确保网络连接正常。

### Q: 应用崩溃
A: 查看Logcat日志，检查是否有未处理的异常。

## 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请通过以下方式联系：

- 邮箱: support@paymentsmaps.com
- 问题反馈: [GitHub Issues](https://github.com/your-repo/issues)

## 更新日志

### v1.0.0 (2024-01-XX)
- 初始版本发布
- 实现基础地图功能
- 用户认证系统
- 商户管理功能
- Material 3 Expressive设计