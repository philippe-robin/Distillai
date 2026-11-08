import Foundation
import MapKit

/// Ouverture d'un lieu dans l'app Plans d'Apple.
///
/// Une app tierce ne peut pas ajouter ses propres épingles dans Plans : elle
/// peut seulement lui demander d'afficher un point ou un itinéraire. L'affichage
/// de la liste complète se fait donc dans la carte de cette app, qui utilise
/// les mêmes fonds de carte Apple.
enum MapsLauncher {

    static func mapItem(for place: Place) -> MKMapItem {
        let placemark = MKPlacemark(coordinate: place.coordinate)
        let item = MKMapItem(placemark: placemark)
        item.name = place.displayName
        return item
    }

    static func open(_ place: Place, directions: Bool = false) {
        let item = mapItem(for: place)
        var options: [String: Any] = [:]
        if directions {
            options[MKLaunchOptionsDirectionsModeKey] = MKLaunchOptionsDirectionsModeDefault
        }
        item.openInMaps(launchOptions: options)
    }

    /// Itinéraire passant par plusieurs lieux (Plans conserve les deux premiers).
    static func openRoute(_ places: [Place]) {
        guard !places.isEmpty else { return }
        let items = places.map { mapItem(for: $0) }
        MKMapItem.openMaps(
            with: items,
            launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDefault]
        )
    }
}
