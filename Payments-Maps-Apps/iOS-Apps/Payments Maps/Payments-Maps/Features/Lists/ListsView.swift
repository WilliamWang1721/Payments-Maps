import SwiftUI

private enum ListFilter: String, CaseIterable {
    case all = "All merchants"
    case favorites = "Favorites only"
}

private enum ListSort: String, CaseIterable {
    case name = "Name"
}

struct ListsView: View {
    @ObservedObject var viewModel: MapViewModel   // 与 MapsView 共用同一个 ViewModel
    
    @State private var searchText = ""
    @State private var listFilter: ListFilter = .all
    @State private var listSort: ListSort = .name
    
    private var displayedPoints: [PointOfInterest] {
        var result = viewModel.filteredPoints
        
        switch listFilter {
        case .all:
            break
        case .favorites:
            result = result.filter { $0.isFavorite }
        }
        
        switch listSort {
        case .name:
            result = result.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        }
        
        if !searchText.isEmpty {
            result = result.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
        
        return result
    }
    
    var body: some View {
        ZStack {
            Color(.systemBackground)
                .ignoresSafeArea()
            
            List {
                ForEach(displayedPoints) { point in
                    NavigationLink {
                        // TODO: 详情页（占位）
                        Text(point.name)
                            .navigationTitle(point.name)
                    } label: {
                        MerchantRow(point: point)
                    }
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                    .listRowBackground(Color.clear)
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("Lists")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                ControlGroup {
                    Menu {
                        ForEach(ListFilter.allCases, id: \.self) { filter in
                            Button {
                                listFilter = filter
                            } label: {
                                Label(
                                    filter.rawValue,
                                    systemImage: listFilter == filter
                                        ? "checkmark.circle.fill"
                                        : "circle"
                                )
                            }
                        }
                    } label: {
                        Image(systemName: listFilter == .all
                              ? "line.3.horizontal.decrease.circle"
                              : "line.3.horizontal.decrease.circle.fill")
                    }
                    
                    Menu {
                        ForEach(ListSort.allCases, id: \.self) { sort in
                            Button {
                                listSort = sort
                            } label: {
                                Label(
                                    sort.rawValue,
                                    systemImage: listSort == sort
                                        ? "checkmark.circle.fill"
                                        : "circle"
                                )
                            }
                        }
                    } label: {
                        Image(systemName: "arrow.up.arrow.down.circle")
                    }
                }
                .labelStyle(.iconOnly)
                .controlGroupStyle(.navigation)
            }
            
            ToolbarItem(placement: .topBarTrailing) {
                ToolbarIconButton(systemName: "plus") {
                    print("Add tapped in Lists")
                    // TODO: 弹出新增商户页面 / 表单
                }
            }
        }
        .task {
            await viewModel.loadPointsFromSupabaseIfNeeded()
        }
    }
}

// MARK: - 单行：商户 Liquid Glass 行卡片

private struct MerchantRow: View {
    let point: PointOfInterest
    
    var body: some View {
        HStack(spacing: 14) {
            MerchantIconView(point: point)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(point.name)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                
                if let address = point.address, !address.isEmpty {
                    Text(address)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            
            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .glassEffect(.clear, in: .rect(cornerRadius: 18))
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(Color.white.opacity(0.22), lineWidth: 0.5)
        }
        .contentShape(Rectangle())
    }
}

private struct MerchantIconView: View {
    let point: PointOfInterest
    
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.secondary.opacity(0.25))
            
            Text(firstLetter(of: point.name))
                .font(.title3.weight(.semibold))
                .foregroundStyle(.white)
        }
        .frame(width: 40, height: 40)
    }
    
    private func firstLetter(of text: String) -> String {
        guard let first = text.trimmingCharacters(in: .whitespacesAndNewlines).first else {
            return "•"
        }
        return String(first).uppercased()
    }
}

// 右上角复用的小图标按钮（原生样式，扩大点击区域）
private struct ToolbarIconButton: View {
    let systemName: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 20, weight: .medium))
                .frame(width: 32, height: 32)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ListsView(viewModel: MapViewModel())
}
