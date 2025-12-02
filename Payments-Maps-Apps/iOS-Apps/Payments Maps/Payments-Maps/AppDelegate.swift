
//
//  AppDelegate.swift
//  Payments Maps
//
//  Created by William Wang on 1/12/2025.
//

import UIKit
import AMapFoundationKit

final class AppDelegate: NSObject, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil
    ) -> Bool {

        // 高德 SDK 推荐开启 HTTPS
        AMapServices.shared().enableHTTPS = true
        
        // 设置你自己的高德 iOS Key（确保是 iOS Key 而非 Web Key）
        AMapServices.shared().apiKey = "4b0ae065fe6d508a5b7833c42a5f3be6"

        // 如集成 AMapLocation，请按官方文档补充隐私合规代码：
        // AMapLocationManager.updatePrivacyShow(...)
        // AMapLocationManager.updatePrivacyAgree(...)
        // 可在接入定位时再添加。

        return true
    }
}
