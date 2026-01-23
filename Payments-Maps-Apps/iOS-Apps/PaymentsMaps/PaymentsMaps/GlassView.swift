import UIKit

final class GlassView: UIView {
    private let blurView: UIVisualEffectView = {
        let effect = UIBlurEffect(style: .systemUltraThinMaterial)
        let view = UIVisualEffectView(effect: effect)
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private let borderLayer: CALayer = {
        let layer = CALayer()
        layer.borderWidth = 0.8
        layer.borderColor = UIColor.white.withAlphaComponent(0.25).cgColor
        return layer
    }()

    override init(frame: CGRect) {
        super.init(frame: frame)
        commonInit()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        commonInit()
    }

    private func commonInit() {
        backgroundColor = UIColor.white.withAlphaComponent(0.08)
        layer.cornerCurve = .continuous
        layer.cornerRadius = 24
        layer.masksToBounds = true

        addSubview(blurView)
        NSLayoutConstraint.activate([
            blurView.leadingAnchor.constraint(equalTo: leadingAnchor),
            blurView.trailingAnchor.constraint(equalTo: trailingAnchor),
            blurView.topAnchor.constraint(equalTo: topAnchor),
            blurView.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])

        layer.addSublayer(borderLayer)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        borderLayer.frame = bounds
        borderLayer.cornerRadius = layer.cornerRadius
    }
}
