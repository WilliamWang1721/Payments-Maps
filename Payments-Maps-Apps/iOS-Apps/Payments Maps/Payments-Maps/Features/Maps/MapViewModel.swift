import Foundation
import MapKit
import SwiftUI
import Combine

enum MapTab: String, CaseIterable, Identifiable {
    case maps = "Maps"
    case lists = "Lists"
    case brand = "Brand"
    case my = "My"
    
    var id: String { rawValue }
    
    var systemImage: String {
        switch self {
        case .maps: return "map.fill"
        case .lists: return "list.bullet.rectangle.fill"
        case .brand: return "creditcard.fill"
        case .my: return "person.crop.circle.fill"
        }
    }
}

struct PointOfInterest: Identifiable {
    let id = UUID()
    let name: String
    let brand: String
    let coordinate: CLLocationCoordinate2D
    let isFavorite: Bool
}

final class MapViewModel: ObservableObject {
    @Published var searchText: String = ""
    @Published var selectedTab: MapTab = .maps
    @Published var cameraPosition: MapCameraPosition
    @Published var points: [PointOfInterest] = []
    
    private let defaultRegion: MKCoordinateRegion
    
    init() {
        let applePark = CLLocationCoordinate2D(latitude: 37.3349, longitude: -122.0090)
        defaultRegion = MKCoordinateRegion(
            center: applePark,
            span: MKCoordinateSpan(latitudeDelta: 0.030, longitudeDelta: 0.030)
        )
        cameraPosition = .region(defaultRegion)
        points = [
            PointOfInterest(name: "POS · Apple Park Visitor Center", brand: "Visa", coordinate: applePark, isFavorite: true),
            PointOfInterest(name: "POS · Main Lobby", brand: "Mastercard", coordinate: CLLocationCoordinate2D(latitude: 37.3340, longitude: -122.0105), isFavorite: false),
            PointOfInterest(name: "POS · Tantau Ave", brand: "Amex", coordinate: CLLocationCoordinate2D(latitude: 37.3365, longitude: -122.0062), isFavorite: false),
            PointOfInterest(name: "POS · Wolfe Rd", brand: "UnionPay", coordinate: CLLocationCoordinate2D(latitude: 37.3316, longitude: -122.0164), isFavorite: true)
        ]
    }
    
    var filteredPoints: [PointOfInterest] {
        let trimmed = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.isEmpty == false else { return points }
        return points.filter { $0.name.localizedCaseInsensitiveContains(trimmed) || $0.brand.localizedCaseInsensitiveContains(trimmed) }
    }
    
    func resetCamera() {
        cameraPosition = .region(defaultRegion)
    }
}
