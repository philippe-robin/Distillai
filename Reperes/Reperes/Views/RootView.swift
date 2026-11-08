import SwiftUI

struct RootView: View {

    @Environment(AppModel.self) private var model
    @State private var selection: UUID?

    var body: some View {
        #if os(macOS)
        NavigationSplitView {
            PlaceListScreen(selection: $selection)
                .navigationSplitViewColumnWidth(min: 300, ideal: 360, max: 460)
        } detail: {
            MapScreen(selection: $selection)
        }
        .onChange(of: model.pendingPlaceToShow) { _, newValue in
            if let newValue {
                selection = newValue
                model.pendingPlaceToShow = nil
            }
        }
        #else
        TabView {
            NavigationStack {
                MapScreen(selection: $selection)
                    .navigationTitle("Carte")
                    .navigationBarTitleDisplayMode(.inline)
            }
            .tabItem { Label("Carte", systemImage: "map") }

            NavigationStack {
                PlaceListScreen(selection: $selection)
            }
            .tabItem { Label("Lieux", systemImage: "list.bullet") }

            NavigationStack {
                SettingsScreen()
            }
            .tabItem { Label("Réglages", systemImage: "gearshape") }
        }
        .onChange(of: model.pendingPlaceToShow) { _, newValue in
            if let newValue {
                selection = newValue
                model.pendingPlaceToShow = nil
            }
        }
        #endif
    }
}
