import Foundation
import MapKit
import CoreLocation
import Observation

/// Autocomplétion d'adresses et de points d'intérêt via MapKit.
@MainActor
@Observable
final class AddressSearch {

    var suggestions: [AddressSuggestion] = []
    var errorMessage: String?

    private let completer = MKLocalSearchCompleter()
    private let box = CompleterBox()

    init() {
        completer.resultTypes = [.address, .pointOfInterest]
        completer.delegate = box
        box.onResults = { [weak self] results in
            let suggestions = results.enumerated().map { index, completion in
                AddressSuggestion(
                    id: "\(index)-\(completion.title)|\(completion.subtitle)",
                    title: completion.title,
                    subtitle: completion.subtitle,
                    completion: completion
                )
            }
            Task { @MainActor in
                self?.suggestions = suggestions
                self?.errorMessage = nil
            }
        }
        box.onFailure = { [weak self] message in
            Task { @MainActor in
                self?.suggestions = []
                self?.errorMessage = message
            }
        }
    }

    /// Met à jour la requête ; privilégie les résultats autour d'une position.
    func update(query: String, near location: CLLocation?) {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 3 else {
            suggestions = []
            return
        }
        if let location {
            completer.region = MKCoordinateRegion(
                center: location.coordinate,
                latitudinalMeters: 100_000,
                longitudinalMeters: 100_000
            )
        }
        completer.queryFragment = trimmed
    }

    func clear() {
        suggestions = []
        completer.queryFragment = ""
    }

    // MARK: - Résolution en coordonnées

    /// Transforme une suggestion en lieu géolocalisé.
    static func resolve(_ completion: MKLocalSearchCompletion) async -> MKMapItem? {
        let request = MKLocalSearch.Request(completion: completion)
        do {
            let response = try await MKLocalSearch(request: request).start()
            return response.mapItems.first
        } catch {
            return nil
        }
    }

    /// Recherche libre, utilisée pour l'import en lot.
    static func search(_ text: String, near location: CLLocation?) async -> [MKMapItem] {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return [] }

        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = trimmed
        if let location {
            request.region = MKCoordinateRegion(
                center: location.coordinate,
                latitudinalMeters: 200_000,
                longitudinalMeters: 200_000
            )
        }
        do {
            let response = try await MKLocalSearch(request: request).start()
            return response.mapItems
        } catch {
            return []
        }
    }

    // MARK: - Conversion

    static func place(from item: MKMapItem, defaultRadius: Double, fallbackName: String = "") -> Place? {
        let coordinate = item.placemark.coordinate
        guard CLLocationCoordinate2DIsValid(coordinate) else { return nil }
        let name = item.name ?? fallbackName
        return Place(
            name: name,
            address: formattedAddress(item.placemark),
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            alertRadius: defaultRadius
        )
    }

    static func formattedAddress(_ placemark: CLPlacemark) -> String {
        let street = [placemark.subThoroughfare, placemark.thoroughfare]
            .compactMap { $0 }
            .joined(separator: " ")
        let city = [placemark.postalCode, placemark.locality]
            .compactMap { $0 }
            .joined(separator: " ")
        return [street, city, placemark.country]
            .compactMap { $0 }
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .joined(separator: ", ")
    }
}

/// Enveloppe identifiable d'une suggestion MapKit, pour l'affichage en liste.
struct AddressSuggestion: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let completion: MKLocalSearchCompletion
}

/// Relais du délégué MapKit, hors `MainActor`.
private final class CompleterBox: NSObject, MKLocalSearchCompleterDelegate {

    var onResults: (([MKLocalSearchCompletion]) -> Void)?
    var onFailure: ((String) -> Void)?

    func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        onResults?(completer.results)
    }

    func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        let nsError = error as NSError
        // Une requête annulée pendant la saisie n'est pas une erreur utile.
        if nsError.domain == MKErrorDomain, nsError.code == Int(MKError.loadingThrottled.rawValue) { return }
        onFailure?(error.localizedDescription)
    }
}
