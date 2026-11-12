import SwiftUI
import MapKit
import CoreLocation

struct MapScreen: View {

    @Environment(AppModel.self) private var model
    @Binding var selection: UUID?

    @State private var camera: MapCameraPosition = .userLocation(fallback: .automatic)
    @State private var filter: PlaceFilter = .all
    @State private var styleChoice: MapStyleChoice = .standard

    @State private var visibleCenter: CLLocationCoordinate2D?
    @State private var isPlacingPin = false

    @State private var editingPlace: Place?
    @State private var newPlaceDraft: Place?
    @State private var showSearchSheet = false
    @State private var showImportSheet = false

    private var visiblePlaces: [Place] {
        model.filteredPlaces(filter: filter, search: "", sort: .dateAdded)
    }

    /// Centre visé pour un ajout : centre de la carte, sinon position courante.
    private var targetCoordinate: CLLocationCoordinate2D? {
        visibleCenter ?? model.currentLocation?.coordinate
    }

    var body: some View {
        mapContainer
            .overlay(alignment: .top) { header }
            .overlay(alignment: .center) { crosshair }
            .overlay(alignment: .bottom) { placementBar }
            .toolbar { toolbarContent }
            .sheet(item: $editingPlace) { place in
                detailSheet(place)
            }
            .sheet(item: $newPlaceDraft) { draft in
                NavigationStack {
                    PlaceEditor(place: draft, isNew: true)
                }
                #if os(macOS)
                .frame(width: 520, height: 560)
                #endif
            }
            .sheet(isPresented: $showSearchSheet) {
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
            .onChange(of: selection) { _, newValue in
                guard let id = newValue, let place = model.place(id: id) else { return }
                withAnimation {
                    camera = .region(
                        MKCoordinateRegion(
                            center: place.coordinate,
                            latitudinalMeters: 1200,
                            longitudinalMeters: 1200
                        )
                    )
                }
            }
    }

    // MARK: - Carte

    @ViewBuilder
    private var mapContainer: some View {
        switch styleChoice {
        case .standard: mapView.mapStyle(.standard)
        case .hybrid: mapView.mapStyle(.hybrid)
        case .imagery: mapView.mapStyle(.imagery)
        }
    }

    private var mapView: some View {
        Map(position: $camera) {
            ForEach(visiblePlaces) { place in
                Annotation(place.displayName, coordinate: place.coordinate) {
                    PlacePin(place: place, isSelected: place.id == selection)
                        .onTapGesture { selection = place.id }
                }
            }

            if let id = selection, let place = model.place(id: id), place.alertEnabled {
                MapCircle(center: place.coordinate, radius: max(50, place.alertRadius))
                    .foregroundStyle(Color.accentColor.opacity(0.12))
                    .stroke(Color.accentColor.opacity(0.6), lineWidth: 1)
            }

            UserAnnotation()
        }
        .mapControls {
            MapUserLocationButton()
            MapCompass()
            MapScaleView()
        }
        .onMapCameraChange(frequency: .onEnd) { context in
            visibleCenter = context.region.center
        }
    }

    // MARK: - Surcouches

    private var header: some View {
        HStack(spacing: 8) {
            Picker("Filtre", selection: $filter) {
                ForEach(PlaceFilter.allCases) { Text($0.label).tag($0) }
            }
            .pickerStyle(.segmented)
            .frame(maxWidth: 320)

            if let id = selection, let place = model.place(id: id) {
                Button {
                    editingPlace = place
                } label: {
                    Label(place.displayName, systemImage: "info.circle")
                        .lineLimit(1)
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding(10)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal, 12)
        .padding(.top, 8)
    }

    @ViewBuilder
    private var crosshair: some View {
        if isPlacingPin {
            Image(systemName: "plus.viewfinder")
                .font(.system(size: 36, weight: .light))
                .foregroundStyle(Color.accentColor)
                .shadow(radius: 2)
                .allowsHitTesting(false)
        }
    }

    @ViewBuilder
    private var placementBar: some View {
        if isPlacingPin {
            VStack(spacing: 8) {
                Text("Déplacez la carte pour viser le lieu")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                HStack {
                    Button("Annuler") { isPlacingPin = false }
                    Button("Ajouter ici") { addAtCenter() }
                        .buttonStyle(.borderedProminent)
                        .disabled(targetCoordinate == nil)
                }
            }
            .padding(12)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
            .padding(.bottom, 24)
        }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .primaryAction) {
            Picker("Style", selection: $styleChoice) {
                ForEach(MapStyleChoice.allCases) { Text($0.label).tag($0) }
            }
            .pickerStyle(.menu)
        }

        ToolbarItem(placement: .primaryAction) {
            Menu {
                Button {
                    showSearchSheet = true
                } label: {
                    Label("Rechercher une adresse…", systemImage: "magnifyingglass")
                }
                Button {
                    isPlacingPin = true
                } label: {
                    Label("Pointer sur la carte", systemImage: "mappin.and.ellipse")
                }
                Button {
                    addAtCurrentLocation()
                } label: {
                    Label("Ma position actuelle", systemImage: "location")
                }
                .disabled(model.currentLocation == nil)
                Divider()
                Button {
                    showImportSheet = true
                } label: {
                    Label("Importer une liste…", systemImage: "square.and.arrow.down")
                }
            } label: {
                Label("Ajouter", systemImage: "plus")
            }
        }
    }

    @ViewBuilder
    private func detailSheet(_ place: Place) -> some View {
        NavigationStack {
            PlaceEditor(place: place, isNew: false)
        }
        #if os(macOS)
        .frame(width: 520, height: 600)
        #endif
    }

    // MARK: - Actions

    private func addAtCenter() {
        guard let center = targetCoordinate else { return }
        isPlacingPin = false
        newPlaceDraft = Place(
            name: "",
            latitude: center.latitude,
            longitude: center.longitude,
            alertRadius: model.settings.defaultRadius
        )
    }

    private func addAtCurrentLocation() {
        guard let location = model.currentLocation else { return }
        newPlaceDraft = Place(
            name: "",
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude,
            alertRadius: model.settings.defaultRadius
        )
    }
}

enum MapStyleChoice: String, CaseIterable, Identifiable {
    case standard, hybrid, imagery
    var id: String { rawValue }
    var label: String {
        switch self {
        case .standard: return "Plan"
        case .hybrid: return "Satellite + plan"
        case .imagery: return "Satellite"
        }
    }
}

struct PlacePin: View {
    let place: Place
    let isSelected: Bool

    private var size: CGFloat { isSelected ? 30 : 22 }

    var body: some View {
        ZStack {
            Circle()
                .fill(place.isVisited ? Color.green : Color.red)
                .overlay(Circle().stroke(.white, lineWidth: 2))
                .shadow(radius: 2)
            Image(systemName: place.isVisited ? "checkmark" : "mappin")
                .font(.system(size: isSelected ? 14 : 11, weight: .bold))
                .foregroundStyle(.white)
        }
        .frame(width: size, height: size)
        .opacity(place.alertEnabled ? 1 : 0.55)
    }
}
