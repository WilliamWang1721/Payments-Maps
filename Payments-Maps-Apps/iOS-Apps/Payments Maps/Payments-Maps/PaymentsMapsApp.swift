import SwiftUI
import UIKit

@main
struct PaymentsMapsApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    var body: some Scene {
        WindowGroup {
            MapsView()
        }
    }
}
