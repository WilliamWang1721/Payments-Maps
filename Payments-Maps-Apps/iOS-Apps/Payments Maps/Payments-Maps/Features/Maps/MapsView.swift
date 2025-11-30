import SwiftUI
import MapKit

struct MapsView: View {
    @StateObject private var viewModel = MapViewModel()
    
    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $viewModel.selectedTab) {
                // MARK: Maps Tab
                NavigationStack {
                    MapContent(viewModel: viewModel)
                        .toolbar(.hidden, for: .navigationBar)
                }
                .tabItem {
                    Label("Maps", systemImage: MapTab.maps.systemImage)
                }
                .tag(MapTab.maps)
                
                // MARK: Lists Tab
                NavigationStack {
                    placeholderTab(title: "Lists", systemImage: MapTab.lists.systemImage)
                        .navigationTitle("Lists")
                        .toolbar(.hidden, for: .navigationBar)
                }
                .tabItem {
                    Label("Lists", systemImage: MapTab.lists.systemImage)
                }
                .tag(MapTab.lists)
                
                // MARK: Brand Tab
                NavigationStack {
                    placeholderTab(title: "Brand", systemImage: MapTab.brand.systemImage)
                        .navigationTitle("Brand")
                        .toolbar(.hidden, for: .navigationBar)
                }
                .tabItem {
                    Label("Brand", systemImage: MapTab.brand.systemImage)
                }
                .tag(MapTab.brand)
                
                // MARK: My Tab
                NavigationStack {
                    placeholderTab(title: "My", systemImage: MapTab.my.systemImage)
                        .navigationTitle("My")
                        .toolbar(.hidden, for: .navigationBar)
                }
                .tabItem {
                    Label("My", systemImage: MapTab.my.systemImage)
                }
                .tag(MapTab.my)
            }
            .background(Color(.systemBackground))
            
            // 自定义液态玻璃底部菜单栏
            GlassTabBar(selection: $viewModel.selectedTab)
                .padding(.horizontal, 16)
                .padding(.bottom, 10)
        }
        // 隐藏系统 TabBar，只用自定义玻璃 TabBar
        .toolbar(.hidden, for: .tabBar)
    }
}

// MARK: - 占位 Tab 内容（Lists / Brand / My）

private func placeholderTab(title: String, systemImage: String) -> some View {
    VStack {
        Spacer()
        Label(title, systemImage: systemImage)
            .font(.title2.weight(.semibold))
            .foregroundStyle(.secondary)
        Spacer()
    }
}

// MARK: - Map 内容

private struct MapContent: View {
    @ObservedObject var viewModel: MapViewModel
    
    var body: some View {
        ZStack {
            mapLayer
                .ignoresSafeArea()
                .safeAreaInset(edge: .top) {
                    // 顶部渐变 + 左「添加/更多」、右「Payments Maps」
                    ZStack(alignment: .bottom) {
                        // 顶部轻微渐变：避免按钮太透明
                        LinearGradient(
                            colors: [
                                Color(.systemBackground).opacity(0.98),
                                Color(.systemBackground).opacity(0.80),
                                Color(.systemBackground).opacity(0.0)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                        .frame(height: 120)
                        .ignoresSafeArea(edges: .top)
                        
                        HStack(spacing: 16) {
                            // 左：添加 + 更多 两个系统图标，液态玻璃胶囊
                            HStack(spacing: 8) {
                                Button {
                                    // 添加 action
                                } label: {
                                    Image(systemName: "plus")
                                        .font(.system(size: 16, weight: .semibold))
                                        .frame(width: 28, height: 28)
                                        .contentShape(Circle())
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("添加")
                                
                                Button {
                                    // 更多 action
                                } label: {
                                    Image(systemName: "ellipsis")
                                        .font(.system(size: 16, weight: .semibold))
                                        .frame(width: 28, height: 28)
                                        .contentShape(Circle())
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("更多")
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(
                                Capsule(style: .continuous)
                                    .fill(.ultraThinMaterial) // Liquid Glass
                            )
                            .overlay(
                                Capsule(style: .continuous)
                                    .stroke(Color.white.opacity(0.45), lineWidth: 0.7)
                            )
                            .shadow(color: Color.black.opacity(0.25), radius: 12, y: 6)
                            
                            Spacer(minLength: 12)
                            
                            // 右：Payments Maps 文本，参考 Today 风格
                            Button {
                                // header 主动作，比如切换模式 / 过滤
                            } label: {
                                Text("Payments Maps")
                                    .font(.system(.title3, design: .rounded).weight(.semibold))
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                            }
                            .buttonStyle(.plain)
                            .background(
                                Capsule(style: .continuous)
                                    .fill(.thinMaterial)
                            )
                            .overlay(
                                Capsule(style: .continuous)
                                    .stroke(Color.white.opacity(0.6), lineWidth: 0.7)
                            )
                            .shadow(color: Color.black.opacity(0.2), radius: 14, y: 8)
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 4)
                        .padding(.bottom, 10)
                    }
                }
            
            // 右下角浮动按钮：搜索 + 定位，竖排
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    VStack(spacing: 12) {
                        // 搜索按钮
                        Button {
                            // 搜索 action
                        } label: {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: 17, weight: .semibold))
                                .padding(12)
                                .background(.ultraThinMaterial, in: Circle())
                                .overlay(
                                    Circle()
                                        .stroke(Color.white.opacity(0.45), lineWidth: 0.7)
                                )
                        }
                        .buttonStyle(.plain)
                        .shadow(color: Color.black.opacity(0.25), radius: 12, y: 6)
                        .accessibilityLabel("搜索地点")
                        
                        // 定位按钮（系统 MapUserLocationButton）
                        MapUserLocationButton()
                            .labelStyle(.iconOnly)
                            .tint(.primary)
                            .controlSize(.large)
                            .buttonBorderShape(.circle)
                            .padding(10)
                            .background(.ultraThinMaterial, in: Circle())
                            .overlay(
                                Circle()
                                    .stroke(Color.white.opacity(0.45), lineWidth: 0.7)
                            )
                            .shadow(color: Color.black.opacity(0.25), radius: 12, y: 6)
                            .accessibilityLabel("定位到当前位置")
                    }
                }
                .padding(.trailing, 20)
                .padding(.bottom, 28)
            }
            .allowsHitTesting(true)
        }
    }
    
    // MARK: Map 图层 + 注释气泡
    
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
            // 自定义当前用户位置
            UserAnnotation()
        }
        .mapStyle(.standard(elevation: .realistic))
        // 背景彩色光晕（保留你原来的氛围）
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

// MARK: - 液态玻璃底部 TabBar

private struct GlassTabBar: View {
    @Binding var selection: MapTab
    
    private let tabs: [MapTab] = [.maps, .lists, .brand, .my]
    
    var body: some View {
        HStack(spacing: 12) {
            ForEach(tabs, id: \.self) { tab in
                Button {
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
                        selection = tab
                    }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.systemImage)
                            .imageScale(.medium)
                            .symbolVariant(selection == tab ? .fill : .none)
                        
                        Text(title(for: tab))
                            .font(.caption2.weight(selection == tab ? .semibold : .regular))
                    }
                    .foregroundStyle(selection == tab ? .primary : .secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .padding(.horizontal, 4)
                    .background(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .fill(
                                selection == tab
                                ? Color.white.opacity(0.22)
                                : Color.white.opacity(0.02)
                            )
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(
            Capsule(style: .continuous)
                .fill(.ultraThinMaterial) // 顶级 Liquid Glass
        )
        .overlay(
            Capsule(style: .continuous)
                .stroke(Color.white.opacity(0.35), lineWidth: 0.7)
        )
        .shadow(color: Color.black.opacity(0.25), radius: 20, y: 12)
    }
    
    private func title(for tab: MapTab) -> String {
        switch tab {
        case .maps:  return "Maps"
        case .lists: return "Lists"
        case .brand: return "Brand"
        case .my:    return "My"
        }
    }
}

// MARK: - Canvas 预览

#Preview {
    MapsView()
        .preferredColorScheme(.light)
}