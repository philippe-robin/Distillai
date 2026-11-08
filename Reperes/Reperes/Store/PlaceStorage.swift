import Foundation

/// Accès fichier aux données, utilisable depuis n'importe quel contexte.
///
/// Volontairement indépendant de l'interface : quand iOS relance l'app en
/// arrière-plan à la suite d'un franchissement de géofence, le code de
/// notification lit et écrit ici sans dépendre du `MainActor`.
enum PlaceStorage {

    /// Plafond imposé par iOS au nombre de régions surveillées par application.
    static let systemRegionLimit = 20

    static var directory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        let dir = base.appendingPathComponent("Reperes", isDirectory: true)
        if !FileManager.default.fileExists(atPath: dir.path) {
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        }
        return dir
    }

    static var placesURL: URL { directory.appendingPathComponent("places.json") }
    static var settingsURL: URL { directory.appendingPathComponent("settings.json") }

    // MARK: - Lieux

    static func loadPlaces() -> [Place] {
        guard let data = try? Data(contentsOf: placesURL) else { return [] }
        do {
            return try decoder.decode([Place].self, from: data)
        } catch {
            NSLog("Repères: lecture de places.json impossible (%@)", String(describing: error))
            return []
        }
    }

    static func savePlaces(_ places: [Place]) {
        do {
            let data = try encoder.encode(places)
            try data.write(to: placesURL, options: .atomic)
        } catch {
            NSLog("Repères: écriture de places.json impossible (%@)", String(describing: error))
        }
    }

    // MARK: - Réglages

    static func loadSettings() -> AppSettings {
        guard let data = try? Data(contentsOf: settingsURL),
              let settings = try? decoder.decode(AppSettings.self, from: data)
        else { return AppSettings() }
        return settings
    }

    static func saveSettings(_ settings: AppSettings) {
        guard let data = try? encoder.encode(settings) else { return }
        try? data.write(to: settingsURL, options: .atomic)
    }

    // MARK: - Codage

    static var encoder: JSONEncoder {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        e.outputFormatting = [.prettyPrinted, .sortedKeys]
        return e
    }

    static var decoder: JSONDecoder {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }
}
