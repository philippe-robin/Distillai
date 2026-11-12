import SwiftUI
import CoreLocation
#if os(macOS)
import AppKit
#endif

struct SettingsScreen: View {

    @Environment(AppModel.self) private var model
    @State private var showDeleteAll = false

    var body: some View {
        @Bindable var model = model

        Form {
            Section("Alertes de proximité") {
                Toggle("Activer les alertes", isOn: $model.settings.alertsEnabled)

                VStack(alignment: .leading) {
                    HStack {
                        Text("Rayon par défaut")
                        Spacer()
                        Text(Formatters.distance(model.settings.defaultRadius))
                            .foregroundStyle(.secondary)
                            .monospacedDigit()
                    }
                    Slider(value: $model.settings.defaultRadius, in: 50...3000, step: 50)
                }

                Toggle("Marquer visité automatiquement à l'arrivée",
                       isOn: $model.settings.autoMarkVisitedOnArrival)
                Toggle("Alerter aussi pour les lieux déjà visités",
                       isOn: $model.settings.alertOnVisitedPlaces)

                Stepper(
                    value: $model.settings.minimumHoursBetweenAlerts,
                    in: 1...72,
                    step: 1
                ) {
                    Text("Délai minimum entre deux alertes : \(Int(model.settings.minimumHoursBetweenAlerts)) h")
                }

                Stepper(
                    value: $model.settings.maxMonitoredPlaces,
                    in: 1...PlaceStorage.systemRegionLimit
                ) {
                    Text("Lieux surveillés simultanément : \(model.settings.maxMonitoredPlaces)")
                }

                Text("Le système limite la surveillance à \(PlaceStorage.systemRegionLimit) zones par app. L'app surveille donc en permanence les lieux les plus proches et fait tourner la sélection au fil de vos déplacements.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Section("Autorisations") {
                LabeledContent("Localisation", value: locationStatusText)

                if model.authorizationStatus == .notDetermined {
                    Button("Autoriser la localisation") {
                        LocationCenter.shared.requestWhenInUseAuthorization()
                    }
                }

                #if os(iOS)
                if model.authorizationStatus == .authorizedWhenInUse {
                    Button("Passer à « Toujours »") {
                        LocationCenter.shared.requestAlwaysAuthorization()
                    }
                    Text("Sans l'autorisation « Toujours », aucune alerte n'arrive quand l'app est fermée.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                #endif

                LabeledContent(
                    "Notifications",
                    value: model.notificationsAuthorized ? "autorisées" : "non autorisées"
                )
                if !model.notificationsAuthorized {
                    Button("Autoriser les notifications") {
                        NotificationService.shared.requestAuthorization()
                    }
                }
                Button("Envoyer une notification de test") {
                    NotificationService.shared.sendTestNotification()
                }
            }

            Section("Diagnostic") {
                LabeledContent("Lieux enregistrés", value: "\(model.places.count)")
                LabeledContent("Zones surveillées", value: "\(model.monitoredPlaceIDs.count)")

                if let location = model.currentLocation {
                    LabeledContent(
                        "Position",
                        value: Formatters.coordinate(
                            latitude: location.coordinate.latitude,
                            longitude: location.coordinate.longitude
                        )
                    )
                } else {
                    LabeledContent("Position", value: "inconnue")
                }

                if let event = model.lastProximityEvent {
                    LabeledContent("Dernière alerte", value: event)
                }
                if let error = model.lastError {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                }

                Button("Vérifier la proximité maintenant") {
                    LocationCenter.shared.checkProximityNow()
                }

                #if os(macOS)
                Text("Sur Mac, la surveillance ne fonctionne que lorsque l'app est ouverte : macOS ne relance pas une app pour un franchissement de zone. Les alertes en déplacement se font sur iPhone.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                #endif
            }

            Section("Données") {
                LabeledContent("Fichier", value: PlaceStorage.placesURL.path)
                    .font(.caption)
                    .textSelection(.enabled)

                #if os(macOS)
                Button("Révéler dans le Finder") {
                    NSWorkspace.shared.activateFileViewerSelecting([PlaceStorage.placesURL])
                }
                #endif

                Button(role: .destructive) {
                    showDeleteAll = true
                } label: {
                    Text("Supprimer tous les lieux")
                }
            }
        }
        .formStyle(.grouped)
        .navigationTitle("Réglages")
        .confirmationDialog(
            "Supprimer les \(model.places.count) lieux enregistrés ?",
            isPresented: $showDeleteAll,
            titleVisibility: .visible
        ) {
            Button("Tout supprimer", role: .destructive) { model.deleteAll() }
            Button("Annuler", role: .cancel) {}
        }
        .task { NotificationService.shared.refreshAuthorizationStatus() }
    }

    private var locationStatusText: String {
        switch model.authorizationStatus {
        case .notDetermined: return "non demandée"
        case .restricted: return "restreinte"
        case .denied: return "refusée"
        case .authorizedAlways: return "toujours"
        case .authorizedWhenInUse: return "à l'utilisation"
        @unknown default: return "inconnue"
        }
    }
}
