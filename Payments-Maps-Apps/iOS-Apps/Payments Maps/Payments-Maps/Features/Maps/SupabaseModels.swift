import Foundation
import CoreLocation

struct PosRow: Decodable {
    let id: UUID
    let name: String
    let lat: Double
    let lng: Double
    let is_favorite: Bool?
    let address: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case lat
        case lng
        case is_favorite
        case address
    }
}

extension PointOfInterest {
    init(row: PosRow) {
        self.id = row.id
        self.name = row.name
        self.brand = "" // TODO: 填充品牌字段（后续可从后端返回）
        self.coordinate = CLLocationCoordinate2D(latitude: row.lat, longitude: row.lng)
        self.isFavorite = row.is_favorite ?? false
        self.address = row.address
    }
}
