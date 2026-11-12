import Foundation

/// Réglages de l'application, persistés dans settings.json.
struct AppSettings: Codable, Equatable {

    /// Rayon proposé par défaut pour un nouveau lieu, en mètres.
    var defaultRadius: Double
    /// Interrupteur général des alertes de proximité.
    var alertsEnabled: Bool
    /// Alerter aussi pour les lieux déjà marqués comme visités.
    var alertOnVisitedPlaces: Bool
    /// Marquer automatiquement un lieu comme visité à l'arrivée.
    var autoMarkVisitedOnArrival: Bool
    /// Délai minimum entre deux alertes pour un même lieu, en heures.
    var minimumHoursBetweenAlerts: Double
    /// Nombre de lieux surveillés simultanément (plafonné par iOS à 20).
    var maxMonitoredPlaces: Int

    init(
        defaultRadius: Double = 250,
        alertsEnabled: Bool = true,
        alertOnVisitedPlaces: Bool = false,
        autoMarkVisitedOnArrival: Bool = false,
        minimumHoursBetweenAlerts: Double = 6,
        maxMonitoredPlaces: Int = 20
    ) {
        self.defaultRadius = defaultRadius
        self.alertsEnabled = alertsEnabled
        self.alertOnVisitedPlaces = alertOnVisitedPlaces
        self.autoMarkVisitedOnArrival = autoMarkVisitedOnArrival
        self.minimumHoursBetweenAlerts = minimumHoursBetweenAlerts
        self.maxMonitoredPlaces = maxMonitoredPlaces
    }

    enum CodingKeys: String, CodingKey {
        case defaultRadius, alertsEnabled, alertOnVisitedPlaces
        case autoMarkVisitedOnArrival, minimumHoursBetweenAlerts, maxMonitoredPlaces
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        defaultRadius = try c.decodeIfPresent(Double.self, forKey: .defaultRadius) ?? 250
        alertsEnabled = try c.decodeIfPresent(Bool.self, forKey: .alertsEnabled) ?? true
        alertOnVisitedPlaces = try c.decodeIfPresent(Bool.self, forKey: .alertOnVisitedPlaces) ?? false
        autoMarkVisitedOnArrival = try c.decodeIfPresent(Bool.self, forKey: .autoMarkVisitedOnArrival) ?? false
        minimumHoursBetweenAlerts = try c.decodeIfPresent(Double.self, forKey: .minimumHoursBetweenAlerts) ?? 6
        maxMonitoredPlaces = try c.decodeIfPresent(Int.self, forKey: .maxMonitoredPlaces) ?? 20
    }
}
