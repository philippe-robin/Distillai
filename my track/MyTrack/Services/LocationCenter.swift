import Foundation
import CoreLocation

/// Point unique de contact avec Core Location : autorisations, position et
/// surveillance de proximité (géofences).
///
/// Choix d'API : `CLLocationManager.startMonitoring(for:)` avec des
/// `CLCircularRegion`. Cette API est marquée obsolète dans le SDK courant au
/// profit de `CLMonitor`, mais c'est la seule dont la livraison des
/// événements d'entrée après relance de l'app en arrière-plan est fiable.
/// Tout est isolé dans ce fichier pour pouvoir basculer sur `CLMonitor` plus
/// tard sans toucher au reste de l'app.
///
/// Limite système : 20 régions surveillées par application, d'où la rotation
/// permanente sur les lieux les plus proches (`refreshMonitoring`).
final class LocationCenter: NSObject, CLLocationManagerDelegate {

    static let shared = LocationCenter()

    private let manager = CLLocationManager()
    private var didBootstrap = false

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        #if os(iOS)
        manager.pausesLocationUpdatesAutomatically = true
        #endif
    }

    // MARK: - Démarrage

    /// À appeler au lancement, y compris quand l'app est relancée en
    /// arrière-plan par un événement de localisation.
    func bootstrap() {
        publishAuthorization()
        guard !didBootstrap else { return }
        didBootstrap = true

        guard isAuthorized else { return }
        manager.startMonitoringSignificantLocationChanges()
        manager.requestLocation()
        refreshMonitoring()
    }

    // MARK: - Autorisations

    var authorizationStatus: CLAuthorizationStatus { manager.authorizationStatus }

    var isAuthorized: Bool {
        switch manager.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse: return true
        default: return false
        }
    }

    /// `true` seulement si l'app peut être réveillée hors premier plan.
    var canMonitorInBackground: Bool {
        manager.authorizationStatus == .authorizedAlways
    }

    func requestWhenInUseAuthorization() {
        manager.requestWhenInUseAuthorization()
    }

    func requestAlwaysAuthorization() {
        manager.requestAlwaysAuthorization()
    }

    func requestOneShotLocation() {
        guard isAuthorized else { return }
        manager.requestLocation()
    }

    // MARK: - Surveillance de proximité

    /// Recalcule l'ensemble des régions surveillées.
    ///
    /// Sélectionne les lieux actifs les plus proches dans la limite autorisée,
    /// retire les régions devenues inutiles, ajoute les nouvelles et remplace
    /// celles dont le centre ou le rayon a changé.
    func refreshMonitoring() {
        let settings = PlaceStorage.loadSettings()
        let places = PlaceStorage.loadPlaces()

        guard settings.alertsEnabled, isAuthorized else {
            stopAllMonitoring()
            return
        }

        var candidates = places.filter { $0.alertEnabled && $0.hasValidCoordinate }
        if !settings.alertOnVisitedPlaces {
            candidates.removeAll { $0.isVisited }
        }

        if let origin = manager.location ?? lastKnownLocation {
            candidates.sort { origin.distance(from: $0.location) < origin.distance(from: $1.location) }
        }

        let limit = max(1, min(settings.maxMonitoredPlaces, PlaceStorage.systemRegionLimit))
        let selected = Array(candidates.prefix(limit))
        let wanted = Dictionary(selected.map { ($0.id.uuidString, $0) }, uniquingKeysWith: { first, _ in first })

        // Régions à retirer ou à remplacer.
        for region in manager.monitoredRegions {
            guard let place = wanted[region.identifier] else {
                manager.stopMonitoring(for: region)
                continue
            }
            if let circular = region as? CLCircularRegion, !matches(circular, place) {
                manager.stopMonitoring(for: region)
            }
        }

        let active = Set(manager.monitoredRegions.map { $0.identifier })
        for place in selected where !active.contains(place.id.uuidString) {
            let region = CLCircularRegion(
                center: place.coordinate,
                radius: max(50, place.alertRadius),
                identifier: place.id.uuidString
            )
            region.notifyOnEntry = true
            region.notifyOnExit = true
            manager.startMonitoring(for: region)
        }

        publishMonitored()
    }

    func stopAllMonitoring() {
        for region in manager.monitoredRegions {
            manager.stopMonitoring(for: region)
        }
        publishMonitored()
    }

    private func matches(_ region: CLCircularRegion, _ place: Place) -> Bool {
        let sameRadius = abs(region.radius - max(50, place.alertRadius)) < 1
        let sameCenter = abs(region.center.latitude - place.latitude) < 0.000_01
            && abs(region.center.longitude - place.longitude) < 0.000_01
        return sameRadius && sameCenter
    }

    /// Compare la position courante à tous les lieux actifs.
    ///
    /// Complète la surveillance système : couvre les lieux au-delà de la
    /// limite de 20 régions, et fonctionne sur Mac où le système ne relance
    /// pas l'app pour un franchissement de géofence.
    func checkProximityNow() {
        guard let origin = manager.location ?? lastKnownLocation else {
            requestOneShotLocation()
            return
        }
        checkProximity(from: origin)
    }

    private func checkProximity(from origin: CLLocation) {
        let settings = PlaceStorage.loadSettings()
        guard settings.alertsEnabled else { return }

        for place in PlaceStorage.loadPlaces() {
            guard place.alertEnabled, place.hasValidCoordinate else { continue }
            if place.isVisited && !settings.alertOnVisitedPlaces { continue }
            if origin.distance(from: place.location) <= max(50, place.alertRadius) {
                handleArrival(placeID: place.id)
            }
        }
    }

    // MARK: - Arrivée sur un lieu

    private func handleArrival(placeID: UUID) {
        var places = PlaceStorage.loadPlaces()
        guard let index = places.firstIndex(where: { $0.id == placeID }) else { return }
        let settings = PlaceStorage.loadSettings()

        // Délai anti-répétition.
        if let last = places[index].lastAlertAt,
           Date().timeIntervalSince(last) < settings.minimumHoursBetweenAlerts * 3600 {
            return
        }

        places[index].lastAlertAt = Date()
        if settings.autoMarkVisitedOnArrival && !places[index].isVisited {
            places[index].isVisited = true
            places[index].visitedAt = Date()
        }
        let place = places[index]
        PlaceStorage.savePlaces(places)

        NotificationService.shared.notifyArrival(at: place, from: manager.location)

        let summary = "\(place.displayName) — \(Self.eventFormatter.string(from: Date()))"
        Task { @MainActor in
            AppModel.shared.reload()
            AppModel.shared.lastProximityEvent = summary
        }

        refreshMonitoring()
    }

    private static let eventFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .short
        f.timeStyle = .short
        return f
    }()

    // MARK: - Délégué Core Location

    private var lastKnownLocation: CLLocation?

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        publishAuthorization()
        guard isAuthorized else {
            stopAllMonitoring()
            return
        }
        manager.startMonitoringSignificantLocationChanges()
        manager.requestLocation()
        refreshMonitoring()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        lastKnownLocation = location
        Task { @MainActor in
            AppModel.shared.currentLocation = location
        }
        refreshMonitoring()
        checkProximity(from: location)
    }

    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        guard let id = UUID(uuidString: region.identifier) else { return }
        handleArrival(placeID: id)
    }

    func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        // Sortie d'une zone : les lieux les plus proches ont changé.
        refreshMonitoring()
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        let message = error.localizedDescription
        Task { @MainActor in AppModel.shared.lastError = message }
    }

    func locationManager(
        _ manager: CLLocationManager,
        monitoringDidFailFor region: CLRegion?,
        withError error: Error
    ) {
        let message = "Surveillance impossible : \(error.localizedDescription)"
        Task { @MainActor in AppModel.shared.lastError = message }
    }

    // MARK: - Publication de l'état

    private func publishAuthorization() {
        let status = manager.authorizationStatus
        Task { @MainActor in AppModel.shared.authorizationStatus = status }
    }

    private func publishMonitored() {
        let ids = Set(manager.monitoredRegions.compactMap { UUID(uuidString: $0.identifier) })
        Task { @MainActor in AppModel.shared.monitoredPlaceIDs = ids }
    }
}
