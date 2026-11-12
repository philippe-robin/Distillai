import SwiftUI
import MapKit

/// Fiche d'un lieu, en création ou en modification.
struct PlaceEditor: View {

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    @State private var draft: Place
    @State private var showDeleteConfirmation = false

    private let isNew: Bool

    init(place: Place, isNew: Bool) {
        _draft = State(initialValue: place)
        self.isNew = isNew
    }

    var body: some View {
        Form {
            Section("Lieu") {
                TextField("Nom", text: $draft.name)
                TextField("Adresse", text: $draft.address, axis: .vertical)
                TextField("Étiquette (optionnel)", text: $draft.tag)
            }

            Section("Alerte de proximité") {
                Toggle("M'alerter quand je passe près d'ici", isOn: $draft.alertEnabled)

                VStack(alignment: .leading) {
                    HStack {
                        Text("Rayon de déclenchement")
                        Spacer()
                        Text(Formatters.distance(draft.alertRadius))
                            .foregroundStyle(.secondary)
                            .monospacedDigit()
                    }
                    Slider(value: $draft.alertRadius, in: 50...3000, step: 50)
                }
                .disabled(!draft.alertEnabled)

                if draft.alertRadius < 150 {
                    Text("En dessous d'environ 150 m, le système déclenche l'alerte de façon moins fiable, surtout en voiture.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Section("Visite") {
                Toggle("Déjà visité", isOn: visitedBinding)
                if let visitedAt = draft.visitedAt {
                    LabeledContent("Visité le", value: Formatters.date(visitedAt))
                }
                if let lastAlertAt = draft.lastAlertAt {
                    LabeledContent("Dernière alerte", value: Formatters.date(lastAlertAt))
                }
            }

            Section("Notes") {
                TextField("Notes", text: $draft.notes, axis: .vertical)
                    .lineLimit(3...8)
            }

            Section("Position") {
                LabeledContent(
                    "Coordonnées",
                    value: Formatters.coordinate(latitude: draft.latitude, longitude: draft.longitude)
                )

                Map(initialPosition: .region(
                    MKCoordinateRegion(
                        center: draft.coordinate,
                        latitudinalMeters: 600,
                        longitudinalMeters: 600
                    )
                )) {
                    Marker(draft.displayName, coordinate: draft.coordinate)
                        .tint(draft.isVisited ? .green : .red)
                }
                .frame(height: 160)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .allowsHitTesting(false)

                HStack {
                    Button {
                        MapsLauncher.open(draft)
                    } label: {
                        Label("Ouvrir dans Plans", systemImage: "map")
                    }
                    Button {
                        MapsLauncher.open(draft, directions: true)
                    } label: {
                        Label("Itinéraire", systemImage: "arrow.triangle.turn.up.right.diamond")
                    }
                }
            }

            if !isNew {
                Section {
                    Button(role: .destructive) {
                        showDeleteConfirmation = true
                    } label: {
                        Label("Supprimer ce lieu", systemImage: "trash")
                    }
                }
            }
        }
        .formStyle(.grouped)
        .navigationTitle(isNew ? "Nouveau lieu" : draft.displayName)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Annuler") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button(isNew ? "Ajouter" : "Enregistrer") { save() }
                    .disabled(!draft.hasValidCoordinate)
            }
        }
        .confirmationDialog(
            "Supprimer ce lieu ?",
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Supprimer", role: .destructive) {
                model.delete(draft)
                dismiss()
            }
            Button("Annuler", role: .cancel) {}
        }
    }

    private var visitedBinding: Binding<Bool> {
        Binding(
            get: { draft.isVisited },
            set: { newValue in
                draft.isVisited = newValue
                draft.visitedAt = newValue ? (draft.visitedAt ?? Date()) : nil
            }
        )
    }

    private func save() {
        if draft.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            draft.name = draft.address.isEmpty
                ? Formatters.coordinate(latitude: draft.latitude, longitude: draft.longitude)
                : draft.address
        }
        if isNew {
            model.add(draft)
        } else {
            model.update(draft)
        }
        dismiss()
    }
}
