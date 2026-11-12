import Foundation
import CoreLocation
import UserNotifications

/// Notifications locales de proximité.
final class NotificationService: NSObject, UNUserNotificationCenterDelegate {

    static let shared = NotificationService()

    static let arrivalCategory = "PLACE_PROXIMITY"
    static let markVisitedAction = "MARK_VISITED"
    static let directionsAction = "DIRECTIONS"

    /// À appeler au lancement : délégué et actions des notifications.
    func configure() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self

        let markVisited = UNNotificationAction(
            identifier: Self.markVisitedAction,
            title: "Marquer comme visité",
            options: []
        )
        let directions = UNNotificationAction(
            identifier: Self.directionsAction,
            title: "Itinéraire",
            options: [.foreground]
        )
        let category = UNNotificationCategory(
            identifier: Self.arrivalCategory,
            actions: [markVisited, directions],
            intentIdentifiers: [],
            options: []
        )
        center.setNotificationCategories([category])
    }

    func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error {
                let message = error.localizedDescription
                Task { @MainActor in AppModel.shared.lastError = message }
            }
            if granted {
                Task { @MainActor in AppModel.shared.notificationsAuthorized = true }
            }
        }
    }

    func refreshAuthorizationStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let authorized = settings.authorizationStatus == .authorized
                || settings.authorizationStatus == .provisional
            Task { @MainActor in AppModel.shared.notificationsAuthorized = authorized }
        }
    }

    // MARK: - Émission

    func notifyArrival(at place: Place, from location: CLLocation?) {
        let content = UNMutableNotificationContent()
        content.title = "À proximité : \(place.displayName)"

        var lines: [String] = []
        if !place.address.isEmpty { lines.append(place.address) }
        if let location {
            let distance = location.distance(from: place.location)
            lines.append("à environ \(Formatters.distance(distance))")
        }
        if !place.notes.isEmpty { lines.append(place.notes) }
        content.body = lines.joined(separator: " · ")

        content.sound = .default
        content.categoryIdentifier = Self.arrivalCategory
        content.userInfo = ["placeID": place.id.uuidString]
        content.threadIdentifier = place.id.uuidString

        let request = UNNotificationRequest(
            identifier: "arrival-\(place.id.uuidString)-\(Int(Date().timeIntervalSince1970))",
            content: content,
            trigger: nil
        )
        UNUserNotificationCenter.current().add(request) { error in
            if let error {
                NSLog("My Track: notification impossible (%@)", error.localizedDescription)
            }
        }
    }

    /// Notification de test, pour vérifier la chaîne d'autorisations.
    func sendTestNotification() {
        let content = UNMutableNotificationContent()
        content.title = "My Track"
        content.body = "Les alertes de proximité fonctionnent."
        content.sound = .default
        let request = UNNotificationRequest(
            identifier: "test-\(UUID().uuidString)",
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 2, repeats: false)
        )
        UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
    }

    // MARK: - Délégué

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .list])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        defer { completionHandler() }

        guard
            let raw = response.notification.request.content.userInfo["placeID"] as? String,
            let id = UUID(uuidString: raw)
        else { return }

        switch response.actionIdentifier {
        case Self.markVisitedAction:
            var places = PlaceStorage.loadPlaces()
            guard let index = places.firstIndex(where: { $0.id == id }) else { return }
            places[index].isVisited = true
            places[index].visitedAt = Date()
            PlaceStorage.savePlaces(places)
            Task { @MainActor in AppModel.shared.reload() }
            LocationCenter.shared.refreshMonitoring()

        case Self.directionsAction, UNNotificationDefaultActionIdentifier:
            guard let place = PlaceStorage.loadPlaces().first(where: { $0.id == id }) else { return }
            if response.actionIdentifier == Self.directionsAction {
                Task { @MainActor in MapsLauncher.open(place, directions: true) }
            } else {
                Task { @MainActor in AppModel.shared.pendingPlaceToShow = place.id }
            }

        default:
            break
        }
    }
}
