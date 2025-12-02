import SwiftUI
import MapKit
import UIKit

private enum TopContext: String, CaseIterable {
    case paymentsMaps = "Payments Maps"
    case paymentsCounter = "Payments Counter"
}

private enum MapFilter: String, CaseIterable {
    case all = "All merchants"
    case favorites = "Favorites only"
}

struct MapsView: View {
    @StateObject private var viewModel = MapViewModel()
    @State private var showMerchantNames = true      // 控制“是否显示商户名”开关
    @State private var selectedMapFilter: MapFilter = .all
    @State private var selectedContext: TopContext = .paymentsMaps
    @State private var searchText = ""
    
    var body: some View {
        TabView(selection: $viewModel.selectedTab) {
            
            // MARK: - Maps tab
            Tab("Maps",
                systemImage: MapTab.maps.systemImage,
                value: MapTab.maps) {
                NavigationStack {
                    MapContent(viewModel: viewModel, selectedContext: selectedContext)
                        .navigationTitle("")
                        .toolbarTitleDisplayMode(.inline)
                        .toolbar {
                            // 左侧：模式切换下拉菜单
                            ToolbarItem(placement: .topBarLeading) {
                                Menu {
                                    Section {
                                        ForEach(TopContext.allCases, id: \.self) { context in
                                            Button {
                                                selectedContext = context
                                                // TODO: 可在此同步到 viewModel
                                            } label: {
                                                Label(
                                                    context.rawValue,
                                                    systemImage: selectedContext == context
                                                        ? "checkmark.circle.fill"
                                                        : "circle"
                                                )
                                            }
                                        }
                                    }
                                    
                                    Section {
                                        Button {
                                            if let url = URL(string: "https://your-web-url-here") {
                                                UIApplication.shared.open(url)
                                            }
                                        } label: {
                                            Label("跳转到 Web", systemImage: "safari")
                                        }
                                        
                                        Button {
                                            if let url = URL(string: "https://your-cashback-url-here") {
                                                UIApplication.shared.open(url)
                                            }
                                        } label: {
                                            Label("跳转到 Cashback Counter", systemImage: "creditcard")
                                        }
                                    }
                                } label: {
                                    HStack(spacing: 4) {
                                        Text(selectedContext.rawValue)
                                            .font(.headline.weight(.semibold))
                                        Image(systemName: "chevron.down")
                                            .font(.system(size: 12, weight: .semibold))
                                    }
                                }
                            }
                            
                            // 右侧：＋ 按钮 + 更多下拉菜单
                            ToolbarItem(placement: .topBarTrailing) {
                                HStack(spacing: 24) {
                                    ToolbarIconButton(systemName: "plus") {
                                        print("Add tapped")
                                        // TODO: 添加 action
                                    }
                                    
                                    Menu {
                                        // 子菜单：Filter ▸
                                        Menu {
                                            ForEach(MapFilter.allCases, id: \.self) { filter in
                                                Button {
                                                    selectedMapFilter = filter
                                                } label: {
                                                    Label(
                                                        filter.rawValue,
                                                        systemImage: selectedMapFilter == filter
                                                            ? "checkmark.circle.fill"
                                                        : "circle"
                                                    )
                                                }
                                            }
                                        } label: {
                                            Label(
                                                "Filter",
                                                systemImage: selectedMapFilter == .all
                                                    ? "line.3.horizontal.decrease.circle"
                                                    : "line.3.horizontal.decrease.circle.fill"
                                            )
                                        }

                                        Divider()

                                        Button {
                                            showMerchantNames.toggle()
                                            // TODO: 同步状态给 viewModel，例如：
                                            // viewModel.showMerchantNames = showMerchantNames
                                        } label: {
                                            Label(
                                                "Show merchant names",
                                                systemImage: showMerchantNames
                                                    ? "checkmark.circle.fill"
                                                    : "circle"
                                            )
                                        }
                                    } label: {
                                        Image(systemName: "ellipsis")
                                            .font(.system(size: 20, weight: .medium))
                                            .frame(width: 32, height: 32)
                                            .contentShape(Rectangle())
                                    }
                                }
                                .labelStyle(.iconOnly)
                                .padding(.trailing, 4)
                                .padding(.vertical, 2)
                            }
                        }
                }
            }
            
            // MARK: - Lists tab
            Tab("Lists",
                systemImage: MapTab.lists.systemImage,
                value: MapTab.lists) {
                NavigationStack {
                    ListsView(viewModel: viewModel)
                }
            }
            
            // MARK: - Brand tab
            Tab("Brand",
                systemImage: MapTab.brand.systemImage,
                value: MapTab.brand) {
                NavigationStack {
                    placeholderTab(title: "Brand",
                                   systemImage: MapTab.brand.systemImage)
                        .navigationTitle("Brand")
                }
            }
            
            // MARK: - My tab
            Tab("My",
                systemImage: MapTab.my.systemImage,
                value: MapTab.my) {
                NavigationStack {
                    placeholderTab(title: "My",
                                   systemImage: MapTab.my.systemImage)
                        .navigationTitle("My")
                }
            }
            
            // MARK: - Search tab（iOS 18+ 搜索角色）
            if #available(iOS 26.0, *) {
                Tab(value: MapTab.search, role: .search) {
                    NavigationStack {
                        SearchContent(searchText: $searchText)
                            .navigationTitle("Search")
                    }
                }
            }
        }
        .background(Color(.systemBackground))
    }
}

// MARK: - 其他 Tab 的占位页面

private func placeholderTab(title: String, systemImage: String) -> some View {
    VStack {
        Spacer()
        Label(title, systemImage: systemImage)
            .font(.title2.weight(.semibold))
            .foregroundStyle(.secondary)
        Spacer()
    }
    .toolbar(.hidden, for: .navigationBar)
}

// MARK: - 地图页面（无蒙版）

private struct MapContent: View {
    @ObservedObject var viewModel: MapViewModel
    let selectedContext: TopContext
    @Namespace private var mapScope          // ✅ 用于把 Map 和 控件 绑在一起
    
    var body: some View {
        ZStack(alignment: .topLeading) {
            mapLayer
                .ignoresSafeArea()
        }
        .mapScope(mapScope)                    // ✅ 把 scope 挂在容器上
    }
    
    // MARK: Map 图层：绑定到同一个 scope
    private var mapLayer: some View {
        Map(
            position: $viewModel.cameraPosition,
            bounds: nil,
            interactionModes: [.all],
            scope: mapScope                     // ✅ 告诉 Map 自己属于哪个 scope
        ) {
            ForEach(viewModel.filteredPoints) { point in
                Annotation(point.name, coordinate: point.coordinate) {
                    VStack(spacing: 6) {
                        Text(point.name)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 8)
                            .foregroundStyle(.primary)
                            .background(
                                .ultraThinMaterial,
                                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
                            )
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
        .mapControls {
            MapCompass()
        }
        .overlay(alignment: .bottomTrailing) {
            VStack(spacing: 12) {
                MapCompass()
                MapUserLocationButton()
                    .labelStyle(.iconOnly)
                    .controlSize(.large)
                    .buttonBorderShape(.circle)
                    .tint(.accentColor)
            }
            .padding(.trailing, 16)
            .padding(.bottom, 40)
        }
    }
}

/// 导航栏右上角用的 SF Symbol 按钮：扩大点击区域和与边框的距离
private struct ToolbarIconButton: View {
    let systemName: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 20, weight: .medium))
                .frame(width: 32, height: 32, alignment: .center)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// 单颗图标按钮：带 iOS 26 式点击动效（轻微缩放 + 变暗）

private struct UltraGlassIconButton: View {
    static let size: CGFloat = 26
    let systemName: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 13, weight: .semibold))
                .frame(width: Self.size, height: Self.size)
        }
        .buttonStyle(.plain)
        .background(
            Circle()
                .fill(.ultraThinMaterial)
                .overlay(
                    Circle()
                        .stroke(Color.white.opacity(0.5), lineWidth: 0.6)
                        .allowsHitTesting(false)
                )
            .shadow(color: .black.opacity(0.22), radius: 8, x: 0, y: 5)
        )
    }
}

// MARK: - Search content with voice input

private struct SearchContent: View {
    @Binding var searchText: String
    
    var body: some View {
        VStack(spacing: 10) {
            VoiceInputButton {
                print("Voice input tapped")
                // TODO: 接入语音识别后在此更新 searchText
            }
            
            TextField("Search", text: $searchText)
                .textFieldStyle(.roundedBorder)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Color(.systemBackground))
    }
}

private struct VoiceInputButton: View {
    let action: () -> Void
    @State private var isListening = false
    
    var body: some View {
        Button {
            isListening.toggle()
            action()
        } label: {
            Label(isListening ? "正在语音输入…" : "语音键入",
                  systemImage: isListening ? "mic.circle.fill" : "mic.circle")
                .font(.subheadline.weight(.semibold))
                .labelStyle(.titleAndIcon)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
        }
        .buttonStyle(.plain)
        .glassEffect(.clear, in: .capsule)
        .overlay {
            Capsule()
                .strokeBorder(Color.white.opacity(0.25), lineWidth: 0.5)
        }
        .contentShape(Rectangle())
    }
}

// MARK: - Preview

#Preview {
    MapsView()
        .preferredColorScheme(.light)
}
