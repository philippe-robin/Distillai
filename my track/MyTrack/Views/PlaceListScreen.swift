import SwiftUI
import UniformTypeIdentifiers

struct PlaceListScreen: View {

    @Environment(AppModel.self) private var model
    @Binding var selection: UUID?

    @State private var search = ""
    @State private var filter: PlaceFilter = .toVisit
    @State private var sort: PlaceSort = .distance

    @State private var editingPlace: Place?
    @State private var showAddSheet = false
    @State private var showImportSheet = false

    @State private var exportFormat: Exporter.Format = .json
    @State private var exportDocument: ExportDocument?
    @State private var showExporter = false

    private var rows: [Place] {
        model.filteredPlaces(filter: filter, search: search, sort: sort)
    }

    var body: some View {
        List {
            if rows.isEmpty {
                emptyState
            }
            ForEach(rows) { place in
                row(for: place)
            }
        }
        .listStyle(.inset)
        .searchable(text: $search, prompt: "Nom, adresse, étiquette")
        .navigationTitle("Lieux")
        .safeAreaInset(edge: .top) { filterBar }
        .toolbar { toolbarContent }
        .sheet(item: $editingPlace) { place in
            NavigationStack { PlaceEditor(place: place, isNew: false) }
                #if os(macOS)
                .frame(width: 520, height: 600)
                #endif
        }
        .sheet(isPresented: $showAddSheet) {
            NavigationStack { AddPlaceSheet() }
                #if os(macOS)
                .frame(width: 560, height: 620)
                #endif
        }
        .sheet(isPresented: $showImportSheet) {
            NavigationStack { BulkImportSheet() }
                #if os(macOS)
                .frame(width: 640, height: 680)
                #endif
        }
        .fileExporter(
            isPresented: $showExporter,
            document: exportDocument,
            contentType: exportFormat.contentType,
            defaultFilename: "mytrack.\(exportFormat.fileExtension)"
        ) { _ in
            exportDocument = nil
        }
    }

    // MARK: - Lignes

    @ViewBuilder
    private func row(for place: Place) -> some View {
        let content = PlaceRow(
            place: place,
            distance: model.distance(to: place),
            isMonitored: model.monitoredPlaceIDs.contains(place.id),
            isSelected: place.id == selection,
            onToggleVisited: { model.toggleVisited(place) },
            onShowDetail: { editingPlace = place }
        )

        content
            .contentShape(Rectangle())
            .onTapGesture {
                selection = place.id
                #if os(iOS)
                editingPlace = place
                #endif
            }
            .swipeActions(edge: .leading) {
                Button {
                    model.toggleVisited(place)
                } label: {
                    Label(
                        place.isVisited ? "À visiter" : "Visité",
                        systemImage: place.isVisited ? "arrow.uturn.backward" : "checkmark"
                    )
                }
                .tint(place.isVisited ? .orange : .green)
            }
            .swipeActions(edge: .trailing) {
                Button(role: .destructive) {
                    model.delete(place)
                } label: {
                    Label("Supprimer", systemImage: "trash")
                }
            }
            .contextMenu {
                Button { editingPlace = place } label: { Label("Modifier…", systemImage: "pencil") }
                Button { model.toggleVisited(place) } label: {
                    Label(place.isVisited ? "Marquer à visiter" : "Marquer visité",
                          systemImage: place.isVisited ? "arrow.uturn.backward" : "checkmark")
                }
                Divider()
                Button { MapsLauncher.open(place) } label: { Label("Ouvrir dans Plans", systemImage: "map") }
                Button { MapsLauncher.open(place, directions: true) } label: { Label("Itinéraire", systemImage: "arrow.triangle.turn.up.right.diamond") }
                Divider()
                Button(role: .destructive) { model.delete(place) } label: { Label("Supprimer", systemImage: "trash") }
            }
    }

    private var emptyState: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Aucun lieu")
                .font(.headline)
            Text("Ajoutez une adresse, pointez un endroit sur la carte, ou importez une liste.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 12)
    }

    // MARK: - Barres

    private var filterBar: some View {
        VStack(spacing: 8) {
            Picker("Filtre", selection: $filter) {
                ForEach(PlaceFilter.allCases) { Text($0.label).tag($0) }
            }
            .pickerStyle(.segmented)

            HStack {
                Picker("Tri", selection: $sort) {
                    ForEach(PlaceSort.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.menu)
                .labelsHidden()

                Spacer()

                Text("\(model.toVisitCount) à visiter · \(model.visitedCount) visités")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(.bar)
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .primaryAction) {
            Menu {
                Button { showAddSheet = true } label: { Label("Rechercher une adresse…", systemImage: "magnifyingglass") }
                Button { showImportSheet = true } label: { Label("Importer une liste…", systemImage: "square.and.arrow.down") }
                Divider()
                Menu("Exporter") {
                    ForEach(Exporter.Format.allCases) { format in
                        Button(format.label) { startExport(format) }
                    }
                }
            } label: {
                Label("Ajouter", systemImage: "plus")
            }
        }

        #if os(macOS)
        ToolbarItem(placement: .primaryAction) {
            SettingsLink {
                Label("Réglages", systemImage: "gearshape")
            }
        }
        #endif
    }

    private func startExport(_ format: Exporter.Format) {
        exportFormat = format
        exportDocument = ExportDocument(text: Exporter.data(for: model.places, format: format))
        showExporter = true
    }
}

// MARK: - Ligne de liste

struct PlaceRow: View {

    let place: Place
    let distance: Double?
    let isMonitored: Bool
    let isSelected: Bool
    let onToggleVisited: () -> Void
    let onShowDetail: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onToggleVisited) {
                Image(systemName: place.isVisited ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(place.isVisited ? Color.green : Color.secondary)
            }
            .buttonStyle(.plain)
            .help(place.isVisited ? "Marquer comme à visiter" : "Marquer comme visité")

            VStack(alignment: .leading, spacing: 2) {
                Text(place.displayName)
                    .font(.body)
                    .fontWeight(isSelected ? .semibold : .regular)
                    .lineLimit(1)
                    .strikethrough(place.isVisited, color: .secondary)

                if !place.address.isEmpty {
                    Text(place.address)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                HStack(spacing: 6) {
                    if let distance {
                        Text(Formatters.distance(distance))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    if !place.tag.isEmpty {
                        Text(place.tag)
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 1)
                            .background(Color.accentColor.opacity(0.15), in: Capsule())
                    }
                    if let visitedAt = place.visitedAt {
                        Text("visité le \(Formatters.shortDate(visitedAt))")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer(minLength: 4)

            if isMonitored {
                Image(systemName: "dot.radiowaves.left.and.right")
                    .font(.caption)
                    .foregroundStyle(Color.accentColor)
                    .help("Alerte de proximité active")
            } else if place.alertEnabled {
                Image(systemName: "bell.slash")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    .help("Hors des lieux surveillés actuellement")
            }

            Button(action: onShowDetail) {
                Image(systemName: "info.circle")
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Export

struct ExportDocument: FileDocument {

    static var readableContentTypes: [UTType] { [.json, .commaSeparatedText, .xml, .plainText] }

    var text: String

    init(text: String) { self.text = text }

    init(configuration: ReadConfiguration) throws {
        guard
            let data = configuration.file.regularFileContents,
            let string = String(data: data, encoding: .utf8)
        else {
            throw CocoaError(.fileReadCorruptFile)
        }
        text = string
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: Data(text.utf8))
    }
}

extension Exporter.Format {
    var contentType: UTType {
        switch self {
        case .json: return .json
        case .csv: return .commaSeparatedText
        case .gpx: return .xml
        }
    }
}
