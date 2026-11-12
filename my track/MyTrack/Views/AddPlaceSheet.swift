import SwiftUI
import MapKit

/// Recherche d'une adresse ou d'un commerce, puis ajout du lieu.
struct AddPlaceSheet: View {

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    @State private var search = AddressSearch()
    @State private var query = ""
    @State private var resolving = false
    @State private var draft: Place?

    var body: some View {
        VStack(spacing: 0) {
            if let errorMessage = search.errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)
                    .padding(.top, 8)
            }

            List {
                ForEach(search.suggestions) { suggestion in
                    Button {
                        select(suggestion)
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(suggestion.title)
                            if !suggestion.subtitle.isEmpty {
                                Text(suggestion.subtitle)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                    .contentShape(Rectangle())
                }

                if search.suggestions.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Saisissez une adresse, un nom de commerce ou un lieu.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Text("Exemples : « 12 rue de la Paix, Paris », « Musée Unterlinden », « 48.8698, 2.3312 ».")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 8)
                }
            }
            .listStyle(.inset)
            .overlay {
                if resolving { ProgressView().controlSize(.large) }
            }
        }
        .searchable(text: $query, placement: .toolbar, prompt: "Adresse ou lieu")
        .onChange(of: query) { _, newValue in
            search.update(query: newValue, near: model.currentLocation)
        }
        .onSubmit(of: .search) { resolveFreeText() }
        .navigationTitle("Ajouter un lieu")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Fermer") { dismiss() }
            }
        }
        .sheet(item: $draft) { place in
            NavigationStack { PlaceEditor(place: place, isNew: true) }
                #if os(macOS)
                .frame(width: 520, height: 600)
                #endif
        }
    }

    // MARK: - Actions

    private func select(_ suggestion: AddressSuggestion) {
        resolving = true
        Task {
            let item = await AddressSearch.resolve(suggestion.completion)
            resolving = false
            guard
                let item,
                var place = AddressSearch.place(
                    from: item,
                    defaultRadius: model.settings.defaultRadius,
                    fallbackName: suggestion.title
                )
            else { return }
            if place.name.isEmpty { place.name = suggestion.title }
            if place.address.isEmpty { place.address = suggestion.subtitle }
            draft = place
        }
    }

    /// Saisie directe : adresse libre ou couple de coordonnées.
    private func resolveFreeText() {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        if let candidate = ImportParser.parse(text: trimmed).first,
           let coordinate = candidate.coordinate {
            draft = Place(
                name: candidate.name,
                address: candidate.address,
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
                alertRadius: model.settings.defaultRadius
            )
            return
        }

        resolving = true
        Task {
            let items = await AddressSearch.search(trimmed, near: model.currentLocation)
            resolving = false
            guard
                let item = items.first,
                let place = AddressSearch.place(
                    from: item,
                    defaultRadius: model.settings.defaultRadius,
                    fallbackName: trimmed
                )
            else { return }
            draft = place
        }
    }
}
