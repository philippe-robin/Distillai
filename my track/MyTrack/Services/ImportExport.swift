import Foundation
import CoreLocation
import MapKit
import Observation

// MARK: - Import en lot

/// Une ligne en cours d'import.
struct ImportCandidate: Identifiable {
    enum State {
        case pending
        case resolved
        case notFound
    }

    let id = UUID()
    /// Ligne saisie à l'origine.
    let query: String
    var name: String = ""
    var address: String = ""
    var latitude: Double?
    var longitude: Double?
    var state: State = .pending
    var include: Bool = true

    var coordinate: CLLocationCoordinate2D? {
        guard let latitude, let longitude else { return nil }
        return CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}

/// Analyse d'une liste collée ou d'un fichier, puis géocodage ligne par ligne.
@MainActor
@Observable
final class BulkImporter {

    var candidates: [ImportCandidate] = []
    var isRunning = false
    var processed = 0

    var resolvedCount: Int { candidates.filter { $0.state == .resolved }.count }
    var notFoundCount: Int { candidates.filter { $0.state == .notFound }.count }
    var selectedCount: Int { candidates.filter { $0.include && $0.state == .resolved }.count }

    /// Découpe un texte collé en candidats, en reconnaissant au passage les
    /// lignes qui contiennent déjà des coordonnées.
    func prepare(text: String) {
        candidates = ImportParser.parse(text: text)
        processed = 0
    }

    /// Géocode les lignes sans coordonnées.
    ///
    /// Séquentiel et espacé : MapKit limite le débit des requêtes et renvoie
    /// des erreurs quand on l'interroge en rafale.
    func resolveAll(near location: CLLocation?) async {
        guard !isRunning else { return }
        isRunning = true
        processed = 0

        for index in candidates.indices {
            if candidates[index].coordinate != nil {
                candidates[index].state = .resolved
                processed += 1
                continue
            }

            let items = await AddressSearch.search(candidates[index].query, near: location)
            if let item = items.first {
                let coordinate = item.placemark.coordinate
                candidates[index].latitude = coordinate.latitude
                candidates[index].longitude = coordinate.longitude
                if candidates[index].name.isEmpty {
                    candidates[index].name = item.name ?? candidates[index].query
                }
                candidates[index].address = AddressSearch.formattedAddress(item.placemark)
                candidates[index].state = .resolved
            } else {
                candidates[index].state = .notFound
                candidates[index].include = false
            }

            processed += 1
            try? await Task.sleep(nanoseconds: 350_000_000)
        }

        isRunning = false
    }

    /// Lieux prêts à être ajoutés.
    func places(defaultRadius: Double) -> [Place] {
        candidates.compactMap { candidate in
            guard candidate.include, let coordinate = candidate.coordinate else { return nil }
            let name = candidate.name.isEmpty ? candidate.query : candidate.name
            return Place(
                name: name,
                address: candidate.address,
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
                alertRadius: defaultRadius
            )
        }
    }

    func reset() {
        candidates = []
        processed = 0
        isRunning = false
    }
}

// MARK: - Analyse de texte et de fichiers

enum ImportParser {

    /// Une ligne peut être :
    /// - une adresse libre : « 12 rue de la Paix, Paris »
    /// - un nom et une adresse : « Chez Paul; 12 rue de la Paix, Paris »
    /// - un nom et des coordonnées : « Chez Paul; 48.8698; 2.3312 »
    static func parse(text: String) -> [ImportCandidate] {
        text
            .components(separatedBy: .newlines)
            .map { cleanLine($0) }
            .filter { !$0.isEmpty }
            .map { candidate(from: $0) }
    }

    private static func cleanLine(_ line: String) -> String {
        var value = line.trimmingCharacters(in: .whitespacesAndNewlines)
        // Puces et numérotations courantes.
        for prefix in ["- ", "* ", "• ", "— "] where value.hasPrefix(prefix) {
            value = String(value.dropFirst(prefix.count))
        }
        if let range = value.range(of: #"^\d+[\.\)]\s+"#, options: .regularExpression) {
            value = String(value[range.upperBound...])
        }
        return value.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func candidate(from line: String) -> ImportCandidate {
        let separator: Character = line.contains(";") ? ";" : (line.contains("\t") ? "\t" : ";")
        let fields = line.split(separator: separator, omittingEmptySubsequences: false)
            .map { $0.trimmingCharacters(in: .whitespaces) }

        // Coordonnées en fin de ligne ?
        if fields.count >= 3,
           let lat = coordinateValue(fields[fields.count - 2], range: 90),
           let lon = coordinateValue(fields[fields.count - 1], range: 180) {
            var candidate = ImportCandidate(query: fields[0])
            candidate.name = fields[0]
            candidate.address = fields.count >= 4 ? fields[1] : ""
            candidate.latitude = lat
            candidate.longitude = lon
            candidate.state = .resolved
            return candidate
        }

        // Latitude et longitude seules, séparées par une virgule.
        let commaFields = line.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        if commaFields.count == 2,
           let lat = coordinateValue(commaFields[0], range: 90),
           let lon = coordinateValue(commaFields[1], range: 180) {
            var candidate = ImportCandidate(query: line)
            candidate.name = Formatters.coordinate(latitude: lat, longitude: lon)
            candidate.latitude = lat
            candidate.longitude = lon
            candidate.state = .resolved
            return candidate
        }

        if fields.count >= 2, !fields[1].isEmpty {
            var candidate = ImportCandidate(query: fields[1])
            candidate.name = fields[0]
            return candidate
        }

        return ImportCandidate(query: line)
    }

    private static func coordinateValue(_ text: String, range: Double) -> Double? {
        let normalized = text.replacingOccurrences(of: ",", with: ".")
        guard let value = Double(normalized), abs(value) <= range else { return nil }
        return value
    }

    // MARK: Fichiers

    /// Import d'un fichier .json (export de l'app), .csv, .txt ou .gpx.
    static func candidates(fromFileAt url: URL) throws -> [ImportCandidate] {
        let data = try Data(contentsOf: url)
        let extensionName = url.pathExtension.lowercased()

        if extensionName == "json" {
            let places = try PlaceStorage.decoder.decode([Place].self, from: data)
            return places.map { place in
                var candidate = ImportCandidate(query: place.displayName)
                candidate.name = place.name
                candidate.address = place.address
                candidate.latitude = place.latitude
                candidate.longitude = place.longitude
                candidate.state = .resolved
                return candidate
            }
        }

        guard let text = String(data: data, encoding: .utf8) ?? String(data: data, encoding: .isoLatin1) else {
            return []
        }

        if extensionName == "gpx" {
            return gpxCandidates(from: text)
        }

        // CSV ou texte : on retire un éventuel en-tête.
        var lines = text.components(separatedBy: .newlines)
        if let first = lines.first?.lowercased(),
           first.contains("latitude") || first.contains("nom;") || first.contains("name,") {
            lines.removeFirst()
        }
        return parse(text: lines.joined(separator: "\n"))
    }

    /// Extraction simple des `<wpt>` d'un fichier GPX.
    private static func gpxCandidates(from text: String) -> [ImportCandidate] {
        var result: [ImportCandidate] = []
        let pattern = #"<wpt[^>]*lat="([-0-9.]+)"[^>]*lon="([-0-9.]+)"[^>]*>(.*?)</wpt>"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.dotMatchesLineSeparators]) else {
            return []
        }
        let nsText = text as NSString
        let matches = regex.matches(in: text, range: NSRange(location: 0, length: nsText.length))

        for match in matches where match.numberOfRanges >= 4 {
            let lat = Double(nsText.substring(with: match.range(at: 1)))
            let lon = Double(nsText.substring(with: match.range(at: 2)))
            let body = nsText.substring(with: match.range(at: 3))
            guard let lat, let lon else { continue }

            var candidate = ImportCandidate(query: body)
            candidate.name = tagValue("name", in: body) ?? Formatters.coordinate(latitude: lat, longitude: lon)
            candidate.address = tagValue("desc", in: body) ?? ""
            candidate.latitude = lat
            candidate.longitude = lon
            candidate.state = .resolved
            result.append(candidate)
        }
        return result
    }

    private static func tagValue(_ tag: String, in body: String) -> String? {
        guard
            let open = body.range(of: "<\(tag)>"),
            let close = body.range(of: "</\(tag)>"),
            open.upperBound <= close.lowerBound
        else { return nil }
        let value = String(body[open.upperBound..<close.lowerBound])
        return value.isEmpty ? nil : unescapeXML(value)
    }

    private static func unescapeXML(_ text: String) -> String {
        text
            .replacingOccurrences(of: "&amp;", with: "&")
            .replacingOccurrences(of: "&lt;", with: "<")
            .replacingOccurrences(of: "&gt;", with: ">")
            .replacingOccurrences(of: "&quot;", with: "\"")
            .replacingOccurrences(of: "&apos;", with: "'")
    }
}

// MARK: - Export

enum Exporter {

    enum Format: String, CaseIterable, Identifiable {
        case json, csv, gpx
        var id: String { rawValue }
        var label: String { rawValue.uppercased() }
        var fileExtension: String { rawValue }
    }

    static func data(for places: [Place], format: Format) -> String {
        switch format {
        case .json:
            let data = (try? PlaceStorage.encoder.encode(places)) ?? Data()
            return String(data: data, encoding: .utf8) ?? "[]"
        case .csv:
            return csv(places)
        case .gpx:
            return gpx(places)
        }
    }

    /// Écrit l'export dans un fichier temporaire partageable.
    static func writeFile(places: [Place], format: Format) -> URL? {
        let contents = data(for: places, format: format)
        let name = "mytrack-\(Int(Date().timeIntervalSince1970)).\(format.fileExtension)"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        do {
            try contents.write(to: url, atomically: true, encoding: .utf8)
            return url
        } catch {
            return nil
        }
    }

    private static func csv(_ places: [Place]) -> String {
        var lines = ["nom;adresse;latitude;longitude;tag;visite;visite_le;rayon_m;notes"]
        for place in places {
            let fields = [
                place.name,
                place.address,
                String(place.latitude),
                String(place.longitude),
                place.tag,
                place.isVisited ? "oui" : "non",
                place.visitedAt.map { Formatters.shortDate($0) } ?? "",
                String(Int(place.alertRadius)),
                place.notes.replacingOccurrences(of: "\n", with: " ")
            ]
            lines.append(fields.map { escapeCSV($0) }.joined(separator: ";"))
        }
        return lines.joined(separator: "\n")
    }

    private static func escapeCSV(_ field: String) -> String {
        guard field.contains(";") || field.contains("\"") || field.contains("\n") else { return field }
        return "\"" + field.replacingOccurrences(of: "\"", with: "\"\"") + "\""
    }

    private static func gpx(_ places: [Place]) -> String {
        var lines = [
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
            "<gpx version=\"1.1\" creator=\"MyTrack\" xmlns=\"http://www.topografix.com/GPX/1/1\">"
        ]
        for place in places {
            lines.append("  <wpt lat=\"\(place.latitude)\" lon=\"\(place.longitude)\">")
            lines.append("    <name>\(escapeXML(place.displayName))</name>")
            if !place.address.isEmpty {
                lines.append("    <desc>\(escapeXML(place.address))</desc>")
            }
            lines.append("  </wpt>")
        }
        lines.append("</gpx>")
        return lines.joined(separator: "\n")
    }

    private static func escapeXML(_ text: String) -> String {
        text
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "'", with: "&apos;")
    }
}
