# Payments Maps for iOS (SwiftUI Prototype)

基于现有 Web Maps 界面设计的 SwiftUI 版起步项目，重点展示 **Maps** 页面和「Liquid Glass」液态玻璃视觉。

## 结构
- `PaymentsMapsApp.swift` – SwiftUI 入口，直接加载 Maps 页。
- `DesignSystem/Glass.swift` – 液态玻璃背景、按钮与标签样式。
- `Features/Maps/MapsView.swift` – 地图界面实现（MapKit）。
- `Features/Maps/MapViewModel.swift` – Map 页状态与示例数据。

## 如何预览
1. 打开 Xcode 15+，创建一个新的 **App (SwiftUI)** 项目，iOS 17+。
2. 将本文件夹下的 Swift 源文件拖入项目（保持分组结构）。
3. 选择 `MapsView` 的预览或直接运行 App，即可看到 Maps 页。

> 本版本仅包含 UI/交互原型，尚未接入真实接口或定位权限。地图使用苹果 MapKit，底部标签/搜索/定位/顶栏均使用液态玻璃材质。
