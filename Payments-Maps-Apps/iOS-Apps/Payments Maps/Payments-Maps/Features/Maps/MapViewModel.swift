import Foundation
import MapKit
import SwiftUI
import Combine
import Supabase

enum MapTab: String, CaseIterable, Identifiable {
    case maps = "Maps"
    case lists = "Lists"
    case brand = "Brand"
    case my = "My"
    case search = "Search"
    
    var id: String { rawValue }
    
    var systemImage: String {
        switch self {
        case .maps: return "map.fill"
        case .lists: return "list.bullet.rectangle.fill"
        case .brand: return "creditcard.fill"
        case .my: return "person.crop.circle.fill"
        case .search: return "magnifyingglass"
        }
    }
}

struct PointOfInterest: Identifiable {
    let id: UUID
    let name: String
    let brand: String
    let coordinate: CLLocationCoordinate2D
    var isFavorite: Bool
    var address: String?
    
    init(id: UUID = UUID(), name: String, brand: String, coordinate: CLLocationCoordinate2D, isFavorite: Bool, address: String?) {
        self.id = id
        self.name = name
        self.brand = brand
        self.coordinate = coordinate
        self.isFavorite = isFavorite
        self.address = address
    }
}

final class MapViewModel: ObservableObject {
    @Published var searchText: String = ""
    @Published var selectedTab: MapTab = .maps
    @Published var cameraPosition: MapCameraPosition
    @Published private(set) var allPoints: [PointOfInterest] = []
    @Published private(set) var filteredPoints: [PointOfInterest] = []
    
    private let defaultRegion: MKCoordinateRegion
    private var hasLoadedFromSupabase = false
    
    init() {
        let applePark = CLLocationCoordinate2D(latitude: 37.3349, longitude: -122.0090)
        defaultRegion = MKCoordinateRegion(
            center: applePark,
            span: MKCoordinateSpan(latitudeDelta: 0.030, longitudeDelta: 0.030)
        )
        cameraPosition = .region(defaultRegion)
        let sample = [
            PointOfInterest(name: "POS · Apple Park Visitor Center", brand: "Visa", coordinate: applePark, isFavorite: true, address: nil),
            PointOfInterest(name: "POS · Main Lobby", brand: "Mastercard", coordinate: CLLocationCoordinate2D(latitude: 37.3340, longitude: -122.0105), isFavorite: false, address: nil),
            PointOfInterest(name: "POS · Tantau Ave", brand: "Amex", coordinate: CLLocationCoordinate2D(latitude: 37.3365, longitude: -122.0062), isFavorite: false, address: nil),
            PointOfInterest(name: "POS · Wolfe Rd", brand: "UnionPay", coordinate: CLLocationCoordinate2D(latitude: 37.3316, longitude: -122.0164), isFavorite: true, address: nil)
        ]
        allPoints = sample
        filteredPoints = sample
    }
    
    func addRandomPoint() {
        let base = defaultRegion.center
        let offsetLat = Double.random(in: -0.002...0.002)
        let offsetLon = Double.random(in: -0.002...0.002)
        let coordinate = CLLocationCoordinate2D(
            latitude: base.latitude + offsetLat,
            longitude: base.longitude + offsetLon
        )
        let brand = ["Visa", "Mastercard", "Amex", "UnionPay"].randomElement() ?? "Visa"
        let point = PointOfInterest(
            name: "POS · Added \(allPoints.count + 1)",
            brand: brand,
            coordinate: coordinate,
            isFavorite: Bool.random(),
            address: nil
        )
        allPoints.append(point)
        applySearchFilter()
    }
    
    func resetCamera() {
        cameraPosition = .region(defaultRegion)
    }
    
    func loadPointsFromSupabaseIfNeeded() async {
        guard hasLoadedFromSupabase == false else { return }
        hasLoadedFromSupabase = true
        do {
            let rows: [PosRow] = try await SupabaseManager.shared.client
                .database
                .from("pos_points")
                .select()
                .execute()
                .value
            
            let mapped = rows.map(PointOfInterest.init(row:))
            allPoints = mapped
            applySearchFilter()
        } catch {
            print("❌ Supabase 加载失败: \(error)")
            hasLoadedFromSupabase = false
        }
    }
    
    private func applySearchFilter() {
        let trimmed = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.isEmpty == false else {
            filteredPoints = allPoints
            return
        }
        filteredPoints = allPoints.filter {
            $0.name.localizedCaseInsensitiveContains(trimmed) || $0.brand.localizedCaseInsensitiveContains(trimmed)
        }
    }
}
