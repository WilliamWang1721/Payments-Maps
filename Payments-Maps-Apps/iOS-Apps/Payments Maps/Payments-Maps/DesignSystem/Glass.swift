import SwiftUI

/// Shared accent palette tuned for the liquid glass look.
enum PMColor {
    static let accentBlue = Color(red: 0.22, green: 0.56, blue: 0.98)
    static let accentPurple = Color(red: 0.60, green: 0.42, blue: 1.00)
    static let accentTeal = Color(red: 0.09, green: 0.80, blue: 0.75)
    static let surfaceShadow = Color.black.opacity(0.2)
}

/// Reusable background plate that mimics "liquid glass".
struct GlassBackground: View {
    var cornerRadius: CGFloat = 22
    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(.ultraThinMaterial)
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(Color.white.opacity(0.24), lineWidth: 0.8)
            }
            .shadow(color: PMColor.surfaceShadow, radius: 10, y: 6)
    }
}

/// Capsule label used for top title chips.
struct GlassLabel: View {
    var title: String
    var icon: String
    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.body.weight(.semibold))
            Text(title)
                .font(.callout.weight(.semibold))
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .foregroundStyle(.primary)
        .background(GlassBackground(cornerRadius: 24))
    }
}

/// Button style that wraps content with a glass backplate.
struct GlassButtonStyle: ButtonStyle {
    enum Shape {
        case circle
        case capsule
        case rounded(CGFloat)
        
        var cornerRadius: CGFloat {
            switch self {
            case .circle: return 99
            case .capsule: return 99
            case .rounded(let value): return value
            }
        }
    }
    
    var shape: Shape = .rounded(20)
    var pressedScale: CGFloat = 0.96
    
    func makeBody(configuration: Configuration) -> some View {
        let isCircle: Bool = {
            if case .circle = shape { return true }
            return false
        }()
        
        configuration.label
            .padding(.horizontal, isCircle ? 0 : 14)
            .padding(.vertical, 12)
            .frame(minWidth: isCircle ? 48 : nil, minHeight: 48)
            .background(
                GlassBackground(cornerRadius: shape.cornerRadius)
                    .opacity(configuration.isPressed ? 0.85 : 1.0)
            )
            .scaleEffect(configuration.isPressed ? pressedScale : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.75), value: configuration.isPressed)
    }
}

/// Small icon-only glass button.
struct GlassIconButton: View {
    var systemName: String
    var size: CGFloat = 22
    var action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: size, weight: .semibold))
                .frame(width: 44, height: 44)
                .foregroundStyle(.primary)
        }
        .buttonStyle(GlassButtonStyle(shape: .circle))
        .accessibilityLabel(Text(systemName))
    }
}
