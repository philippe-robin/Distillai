import SwiftUI

@main
struct ReperesApp: App {

    #if os(iOS)
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    #endif

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(AppModel.shared)
                .task { Bootstrap.run() }
        }
        #if os(macOS)
        .defaultSize(width: 1180, height: 760)

        Settings {
            SettingsScreen()
                .environment(AppModel.shared)
                .frame(width: 520, height: 620)
        }
        #endif
    }
}

/// Initialisation commune aux deux plateformes, idempotente.
enum Bootstrap {
    @MainActor
    static func run() {
        LocationCenter.shared.bootstrap()
        NotificationService.shared.configure()
        NotificationService.shared.refreshAuthorizationStatus()
        AppModel.shared.reload()
    }
}

#if os(iOS)
import UIKit

/// Sur iOS, le système relance l'app en arrière-plan lors d'un franchissement
/// de géofence. Core Location doit être reconfiguré dès ce lancement, avant
/// toute interface : c'est le rôle de ce délégué.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        LocationCenter.shared.bootstrap()
        NotificationService.shared.configure()
        return true
    }
}
#endif
