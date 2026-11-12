import Foundation
import CoreLocation

/// Un lieu à visiter ou déjà visité.
///
/// Le décodage est tolérant : chaque champ ajouté dans une version ultérieure
/// peut manquer dans un fichier existant sans invalider tout le fichier.
struct Place: Identifiable, Codable, Hashable {

    var id: UUID
    var name: String
    var address: String
    var latitude: Double
    var longitude: Double
    var notes: String
    var tag: String

    /// Lieu déjà visité.
    var isVisited: Bool
    var visitedAt: Date?

    /// Alerte de proximité active pour ce lieu.
    var alertEnabled: Bool
    /// Rayon de déclenchement, en mètres.
    var alertRadius: Double

    var createdAt: Date
    /// Dernière alerte émise, utilisée pour le délai anti-répétition.
    var lastAlertAt: Date?

    init(
        id: UUID = UUID(),
        name: String,
        address: String = "",
        latitude: Double,
        longitude: Double,
        notes: String = "",
        tag: String = "",
        isVisited: Bool = false,
        visitedAt: Date? = nil,
        alertEnabled: Bool = true,
        alertRadius: Double = 250,
        createdAt: Date = Date(),
        lastAlertAt: Date? = nil
    ) {
        self.id = id
        self.name = name
        self.address = address
        self.latitude = latitude
        self.longitude = longitude
        self.notes = notes
        self.tag = tag
        self.isVisited = isVisited
        self.visitedAt = visitedAt
        self.alertEnabled = alertEnabled
        self.alertRadius = alertRadius
        self.createdAt = createdAt
        self.lastAlertAt = lastAlertAt
    }

    // MARK: - Décodage tolérant

    enum CodingKeys: String, CodingKey {
        case id, name, address, latitude, longitude, notes, tag
        case isVisited, visitedAt, alertEnabled, alertRadius, createdAt, lastAlertAt
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? ""
        address = try c.decodeIfPresent(String.self, forKey: .address) ?? ""
        latitude = try c.decode(Double.self, forKey: .latitude)
        longitude = try c.decode(Double.self, forKey: .longitude)
        notes = try c.decodeIfPresent(String.self, forKey: .notes) ?? ""
        tag = try c.decodeIfPresent(String.self, forKey: .tag) ?? ""
        isVisited = try c.decodeIfPresent(Bool.self, forKey: .isVisited) ?? false
        visitedAt = try c.decodeIfPresent(Date.self, forKey: .visitedAt)
        alertEnabled = try c.decodeIfPresent(Bool.self, forKey: .alertEnabled) ?? true
        alertRadius = try c.decodeIfPresent(Double.self, forKey: .alertRadius) ?? 250
        createdAt = try c.decodeIfPresent(Date.self, forKey: .createdAt) ?? Date()
        lastAlertAt = try c.decodeIfPresent(Date.self, forKey: .lastAlertAt)
    }

    // MARK: - Dérivés

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    var location: CLLocation {
        CLLocation(latitude: latitude, longitude: longitude)
    }

    var displayName: String {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty { return trimmed }
        let fallback = address.trimmingCharacters(in: .whitespacesAndNewlines)
        return fallback.isEmpty ? "Lieu sans nom" : fallback
    }

    var hasValidCoordinate: Bool {
        latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
            && !(latitude == 0 && longitude == 0)
    }

    func distance(from location: CLLocation?) -> CLLocationDistance? {
        guard let location else { return nil }
        return location.distance(from: self.location)
    }
}
