import Foundation
import CoreLocation
import Observation

/// État observable de l'application : liste des lieux, réglages, position.
@MainActor
@Observable
final class AppModel {

    static let shared = AppModel()

    private(set) var places: [Place] = []
    var settings: AppSettings = AppSettings() {
        didSet {
            guard settings != oldValue else { return }
            PlaceStorage.saveSettings(settings)
            LocationCenter.shared.refreshMonitoring()
        }
    }

    /// Position courante, alimentée par `LocationCenter`.
    var currentLocation: CLLocation?
    var authorizationStatus: CLAuthorizationStatus = .notDetermined
    /// Lieux effectivement surveillés par Core Location.
    var monitoredPlaceIDs: Set<UUID> = []
    /// Dernier événement de proximité, affiché dans Réglages.
    var lastProximityEvent: String?
    var lastError: String?
    /// Autorisation des notifications locales.
    var notificationsAuthorized = false
    /// Lieu à afficher après l'ouverture d'une notification.
    var pendingPlaceToShow: UUID?

    private init() {
        places = PlaceStorage.loadPlaces()
        settings = PlaceStorage.loadSettings()
    }

    // MARK: - Lecture

    func reload() {
        places = PlaceStorage.loadPlaces()
        settings = PlaceStorage.loadSettings()
    }

    func place(id: UUID) -> Place? {
        places.first { $0.id == id }
    }

    func distance(to place: Place) -> CLLocationDistance? {
        place.distance(from: currentLocation)
    }

    /// Lieux filtrés et triés pour l'affichage.
    func filteredPlaces(filter: PlaceFilter, search: String, sort: PlaceSort) -> [Place] {
        var result = places

        switch filter {
        case .all: break
        case .toVisit: result = result.filter { !$0.isVisited }
        case .visited: result = result.filter { $0.isVisited }
        }

        let needle = search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !needle.isEmpty {
            result = result.filter {
                $0.name.lowercased().contains(needle)
                    || $0.address.lowercased().contains(needle)
                    || $0.tag.lowercased().contains(needle)
                    || $0.notes.lowercased().contains(needle)
            }
        }

        switch sort {
        case .distance:
            if let origin = currentLocation {
                result.sort { origin.distance(from: $0.location) < origin.distance(from: $1.location) }
            } else {
                result.sort { $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending }
            }
        case .name:
            result.sort { $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending }
        case .dateAdded:
            result.sort { $0.createdAt > $1.createdAt }
        }

        return result
    }

    var visitedCount: Int { places.filter { $0.isVisited }.count }
    var toVisitCount: Int { places.filter { !$0.isVisited }.count }

    var allTags: [String] {
        Array(Set(places.map { $0.tag }.filter { !$0.isEmpty })).sorted()
    }

    // MARK: - Écriture

    func add(_ place: Place) {
        places.append(place)
        persist()
    }

    func add(contentsOf newPlaces: [Place]) {
        places.append(contentsOf: newPlaces)
        persist()
    }

    func update(_ place: Place) {
        guard let index = places.firstIndex(where: { $0.id == place.id }) else { return }
        places[index] = place
        persist()
    }

    func delete(ids: Set<UUID>) {
        places.removeAll { ids.contains($0.id) }
        persist()
    }

    func delete(_ place: Place) {
        delete(ids: [place.id])
    }

    func setVisited(_ place: Place, _ visited: Bool) {
        guard let index = places.firstIndex(where: { $0.id == place.id }) else { return }
        places[index].isVisited = visited
        places[index].visitedAt = visited ? Date() : nil
        persist()
    }

    func toggleVisited(_ place: Place) {
        setVisited(place, !place.isVisited)
    }

    func deleteAll() {
        places.removeAll()
        persist()
    }

    private func persist() {
        PlaceStorage.savePlaces(places)
        LocationCenter.shared.refreshMonitoring()
    }
}

enum PlaceFilter: String, CaseIterable, Identifiable {
    case toVisit, visited, all
    var id: String { rawValue }
    var label: String {
        switch self {
        case .toVisit: return "À visiter"
        case .visited: return "Visités"
        case .all: return "Tous"
        }
    }
}

enum PlaceSort: String, CaseIterable, Identifiable {
    case distance, name, dateAdded
    var id: String { rawValue }
    var label: String {
        switch self {
        case .distance: return "Distance"
        case .name: return "Nom"
        case .dateAdded: return "Ajout"
        }
    }
}
