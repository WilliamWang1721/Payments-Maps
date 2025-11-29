# Android 客户端

Android 版本位于 `Payments-Maps-Apps/Android-Apps`，基于 Kotlin + Jetpack Compose + MVVM + Hilt + 高德地图 SDK + Supabase SDK。

## 目录结构
```
presentation/   # UI 层（auth/map/pos/merchant/profile/search/settings/usercenter）
domain/usecase/ # 业务用例
data/api/       # 远程接口
data/database/  # 本地数据库
data/preferences/ # 偏好存储
```

## 构建与运行
```bash
cd Payments-Maps-Apps/Android-Apps
./gradlew build   # 构建 APK
./gradlew run     # 连接设备/模拟器运行
```

## 配置要点
- 高德地图与 Supabase Key 需在本地 `local.properties` 或对应的 config 中填写。
- 确保 Android 端的 OAuth 回调与后端配置一致（与 Web 共用 Supabase 项目时，需在 Supabase Auth 中添加移动端重定向 URI）。
- 如需调试网络，请开启设备代理或使用 `adb reverse`。

## 使用流程（与 Web 功能对应）
- 登录：支持同样的 OAuth 流程，进入地图页后自动定位。
- 地图与列表：展示附近 POS，支持搜索/筛选，与 Web 侧字段保持一致。
- POS 管理：可添加/编辑/删除 POS（取决于权限）；“我的 POS”列表用于个人管理。
- 收藏/历史：与 Web 同步数据，需确保 Supabase Realtime 已开启。

## 常见问题
- 无法加载地图：确认高德 Key 与签名包名匹配；网络可访问高德服务。
- 登录失败：检查 Supabase 回调 URI、包名签名、时间同步。
- 数据不同步：确认 Supabase 表/迁移一致，且开启 RLS 与正确的策略。
