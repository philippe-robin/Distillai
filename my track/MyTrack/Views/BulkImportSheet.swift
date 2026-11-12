import SwiftUI
import UniformTypeIdentifiers

/// Import d'une liste de lieux : texte collé ou fichier.
struct BulkImportSheet: View {

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    @State private var importer = BulkImporter()
    @State private var text = ""
    @State private var showFileImporter = false
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if importer.candidates.isEmpty {
                inputPhase
            } else {
                reviewPhase
            }
        }
        .navigationTitle("Importer des lieux")
        .toolbar { toolbarContent }
        .fileImporter(
            isPresented: $showFileImporter,
            allowedContentTypes: [.json, .commaSeparatedText, .plainText, .xml, .text]
        ) { result in
            handleFile(result)
        }
    }

    // MARK: - Saisie

    private var inputPhase: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Collez votre liste : une ligne par lieu.")
                .font(.subheadline)

            TextEditor(text: $text)
                .font(.body.monospaced())
                .frame(minHeight: 220)
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(Color.secondary.opacity(0.3))
                )

            VStack(alignment: .leading, spacing: 4) {
                Text("Formats reconnus")
                    .font(.caption.weight(.semibold))
                Text("12 rue de la Paix, Paris")
                Text("Chez Paul; 12 rue de la Paix, Paris")
                Text("Chez Paul; 48.8698; 2.3312")
                Text("48.8698, 2.3312")
            }
            .font(.caption)
            .foregroundStyle(.secondary)

            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            Spacer()
        }
        .padding()
    }

    // MARK: - Relecture

    private var reviewPhase: some View {
        VStack(spacing: 0) {
            if importer.isRunning {
                VStack(spacing: 4) {
                    ProgressView(
                        value: Double(importer.processed),
                        total: Double(max(1, importer.candidates.count))
                    )
                    Text("Recherche des adresses : \(importer.processed) / \(importer.candidates.count)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding()
            } else {
                HStack {
                    Text("\(importer.resolvedCount) trouvés · \(importer.notFoundCount) introuvables")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.top, 8)
            }

            List {
                ForEach($importer.candidates) { $candidate in
                    HStack(spacing: 10) {
                        Toggle("", isOn: $candidate.include)
                            .labelsHidden()
                            .disabled(candidate.state != .resolved)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(candidate.name.isEmpty ? candidate.query : candidate.name)
                                .lineLimit(1)
                            Text(statusText(candidate))
                                .font(.caption)
                                .foregroundStyle(candidate.state == .notFound ? .red : .secondary)
                                .lineLimit(1)
                        }
                        Spacer()
                    }
                }
            }
            .listStyle(.inset)
        }
    }

    private func statusText(_ candidate: ImportCandidate) -> String {
        switch candidate.state {
        case .pending:
            return "en attente…"
        case .notFound:
            return "introuvable : \(candidate.query)"
        case .resolved:
            if !candidate.address.isEmpty { return candidate.address }
            guard let coordinate = candidate.coordinate else { return "" }
            return Formatters.coordinate(
                latitude: coordinate.latitude,
                longitude: coordinate.longitude
            )
        }
    }

    // MARK: - Barre d'outils

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .cancellationAction) {
            Button(importer.candidates.isEmpty ? "Fermer" : "Recommencer") {
                if importer.candidates.isEmpty {
                    dismiss()
                } else {
                    importer.reset()
                }
            }
            .disabled(importer.isRunning)
        }

        ToolbarItem(placement: .primaryAction) {
            if importer.candidates.isEmpty {
                HStack {
                    Button {
                        showFileImporter = true
                    } label: {
                        Label("Fichier…", systemImage: "doc")
                    }
                    Button("Analyser") { analyze() }
                        .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            } else {
                Button("Ajouter \(importer.selectedCount) lieux") { commit() }
                    .disabled(importer.isRunning || importer.selectedCount == 0)
            }
        }
    }

    // MARK: - Actions

    private func analyze() {
        errorMessage = nil
        importer.prepare(text: text)
        Task { await importer.resolveAll(near: model.currentLocation) }
    }

    private func commit() {
        model.add(contentsOf: importer.places(defaultRadius: model.settings.defaultRadius))
        dismiss()
    }

    private func handleFile(_ result: Result<URL, Error>) {
        switch result {
        case .failure(let error):
            errorMessage = error.localizedDescription

        case .success(let url):
            let needsScope = url.startAccessingSecurityScopedResource()
            defer { if needsScope { url.stopAccessingSecurityScopedResource() } }
            do {
                let candidates = try ImportParser.candidates(fromFileAt: url)
                guard !candidates.isEmpty else {
                    errorMessage = "Aucun lieu reconnu dans ce fichier."
                    return
                }
                importer.candidates = candidates
                Task { await importer.resolveAll(near: model.currentLocation) }
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}
