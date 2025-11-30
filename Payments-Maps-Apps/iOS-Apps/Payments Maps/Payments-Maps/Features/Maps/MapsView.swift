import SwiftUI
import MapKit

struct MapsView: View {
    @StateObject private var viewModel = MapViewModel()
    
    var body: some View {
        TabView(selection: $viewModel.selectedTab) {
            NavigationStack {
                MapContent(viewModel: viewModel)
                    .toolbar(.hidden, for: .navigationBar)
            }
            .tabItem {
                Label("Maps", systemImage: MapTab.maps.systemImage)
            }
            .tag(MapTab.maps)
            
            NavigationStack {
                placeholderTab(title: "Lists", systemImage: MapTab.lists.systemImage)
                    .navigationTitle("Lists")
            }
            .tabItem {
                Label("Lists", systemImage: MapTab.lists.systemImage)
            }
            .tag(MapTab.lists)
            
            NavigationStack {
                placeholderTab(title: "Brand", systemImage: MapTab.brand.systemImage)
                    .navigationTitle("Brand")
            }
            .tabItem {
                Label("Brand", systemImage: MapTab.brand.systemImage)
            }
            .tag(MapTab.brand)
            
            NavigationStack {
                placeholderTab(title: "My", systemImage: MapTab.my.systemImage)
                    .navigationTitle("My")
            }
            .tabItem {
                Label("My", systemImage: MapTab.my.systemImage)
            }
            .tag(MapTab.my)
        }
        .background(Color(.systemBackground))
    }
}

private func placeholderTab(title: String, systemImage: String) -> some View {
    NavigationStack {
        VStack {
            Spacer()
            Label(title, systemImage: systemImage)
                .font(.title2.weight(.semibold))
                .foregroundStyle(.secondary)
            Spacer()
        }
        .toolbar(.hidden, for: .navigationBar)
    }
}

private struct MapContent: View {
    @ObservedObject var viewModel: MapViewModel
    
    var body: some View {
        ZStack {
            mapLayer
                .ignoresSafeArea()
                .safeAreaInset(edge: .top) {
                    HStack(spacing: 12) {
                        Button {
                            // header action placeholder
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "mappin.and.ellipse")
                                Text("Payments Maps")
                            }
                            .font(.title3.weight(.semibold))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(
                                Capsule(style: .continuous)
                                    .fill(.thinMaterial)
                                    .overlay(
                                        LinearGradient(
                                            colors: [
                                                Color.white.opacity(0.55),
                                                Color.white.opacity(0.10)
                                            ],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .overlay(
                                        Capsule(style: .continuous)
                                            .stroke(Color.white.opacity(0.6), lineWidth: 0.7)
                                    )
                                    .shadow(color: Color.black.opacity(0.20), radius: 14, x: 0, y: 8)
                            )
                        }
                        .buttonStyle(.plain)
                        Button {
                            // add action
                        } label: {
                            Image(systemName: "plus")
                                .font(.body)
                                .padding(10)
                                .background(.ultraThickMaterial, in: Circle())
                                .overlay {
                                    Circle().stroke(Color.white.opacity(0.45), lineWidth: 0.7)
                                }
                        }
                        Button {
                            // search action placeholder
                        } label: {
                            Image(systemName: "magnifyingglass")
                                .font(.body)
                                .padding(10)
                                .background(.ultraThickMaterial, in: Circle())
                                .overlay {
                                    Circle().stroke(Color.white.opacity(0.45), lineWidth: 0.7)
                                }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 6)
                }
            
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    MapUserLocationButton()
                        .labelStyle(.iconOnly)
                        .tint(.primary)
                        .controlSize(.large)
                        .buttonBorderShape(.circle)
                        .padding(10)
                        .background(.regularMaterial, in: Circle())
                        .shadow(radius: 8, y: 4)
                        .accessibilityLabel("定位到当前位置")
                }
                .padding(.trailing, 20)
                .padding(.bottom, 28)
            }
            .allowsHitTesting(true)
        }
    }

    private var mapLayer: some View {
        Map(position: $viewModel.cameraPosition, interactionModes: [.all]) {
            ForEach(viewModel.filteredPoints) { point in
                Annotation(point.name, coordinate: point.coordinate) {
                    VStack(spacing: 6) {
                        Text(point.name)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 8)
                            .foregroundStyle(.primary)
                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                            .overlay {
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .strokeBorder(Color.white.opacity(0.35), lineWidth: 0.5)
                            }
                        Circle()
                            .fill(point.isFavorite ? PMColor.accentPurple : PMColor.accentBlue)
                            .frame(width: 12, height: 12)
                            .shadow(color: PMColor.accentBlue.opacity(0.35), radius: 12)
                    }
                }
            }
            UserAnnotation()
        }
        .mapStyle(.standard(elevation: .realistic))
        .overlay(alignment: .topTrailing) {
            Circle()
                .fill(PMColor.accentBlue.opacity(0.12))
                .frame(width: 260)
                .offset(x: 80, y: -220)
                .blur(radius: 40)
        }
        .overlay(alignment: .bottomLeading) {
            Circle()
                .fill(PMColor.accentPurple.opacity(0.10))
                .frame(width: 220)
                .offset(x: -160, y: 240)
                .blur(radius: 42)
        }
    }
}

#Preview {
    MapsView()
        .preferredColorScheme(.light)
}
