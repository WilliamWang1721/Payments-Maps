import UIKit

final class HomeViewController: UIViewController {
    private let topBar = GlassView()
    private let bottomBar = GlassView()
    private let contentLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.text = "Welcome to Payments Maps"
        label.font = UIFont.preferredFont(forTextStyle: .title2)
        label.textColor = UIColor.label
        return label
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.systemBackground
        setupTopBar()
        setupBottomBar()
        setupContent()
    }

    private func setupTopBar() {
        topBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(topBar)

        let menuButton = makeMenuButton()
        let addButton = makeAddButton()
        let spacer = UIView()
        spacer.translatesAutoresizingMaskIntoConstraints = false

        let stack = UIStackView(arrangedSubviews: [menuButton, spacer, addButton])
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .horizontal
        stack.alignment = .center
        stack.spacing = 12

        topBar.addSubview(stack)

        NSLayoutConstraint.activate([
            topBar.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
            topBar.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
            topBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
            topBar.heightAnchor.constraint(equalToConstant: 56),

            stack.leadingAnchor.constraint(equalTo: topBar.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: topBar.trailingAnchor, constant: -16),
            stack.topAnchor.constraint(equalTo: topBar.topAnchor),
            stack.bottomAnchor.constraint(equalTo: topBar.bottomAnchor)
        ])

        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
    }

    private func setupBottomBar() {
        bottomBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(bottomBar)

        let tabStack = UIStackView(arrangedSubviews: [
            makeTabButton(title: "地图", symbol: "map"),
            makeTabButton(title: "列表", symbol: "list.bullet"),
            makeTabButton(title: "品牌", symbol: "building.2"),
            makeTabButton(title: "个人", symbol: "person.crop.circle")
        ])
        tabStack.translatesAutoresizingMaskIntoConstraints = false
        tabStack.axis = .horizontal
        tabStack.alignment = .center
        tabStack.distribution = .fillEqually

        bottomBar.addSubview(tabStack)

        NSLayoutConstraint.activate([
            bottomBar.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
            bottomBar.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
            bottomBar.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -12),
            bottomBar.heightAnchor.constraint(equalToConstant: 72),

            tabStack.leadingAnchor.constraint(equalTo: bottomBar.leadingAnchor, constant: 8),
            tabStack.trailingAnchor.constraint(equalTo: bottomBar.trailingAnchor, constant: -8),
            tabStack.topAnchor.constraint(equalTo: bottomBar.topAnchor),
            tabStack.bottomAnchor.constraint(equalTo: bottomBar.bottomAnchor)
        ])
    }

    private func setupContent() {
        view.addSubview(contentLabel)

        NSLayoutConstraint.activate([
            contentLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            contentLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }

    private func makeMenuButton() -> UIButton {
        var configuration = UIButton.Configuration.plain()
        configuration.title = "Payments Maps"
        configuration.image = UIImage(systemName: "chevron.down")
        configuration.imagePlacement = .trailing
        configuration.imagePadding = 6
        configuration.baseForegroundColor = UIColor.label
        configuration.contentInsets = NSDirectionalEdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12)

        let button = UIButton(configuration: configuration)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.layer.cornerRadius = 18
        button.layer.masksToBounds = true
        button.backgroundColor = UIColor.white.withAlphaComponent(0.12)

        let action = UIAction(title: "Payments Maps", handler: { _ in })
        button.menu = UIMenu(title: "", options: .displayInline, children: [action])
        button.showsMenuAsPrimaryAction = true
        return button
    }

    private func makeAddButton() -> UIButton {
        var configuration = UIButton.Configuration.filled()
        configuration.baseBackgroundColor = UIColor.white.withAlphaComponent(0.18)
        configuration.baseForegroundColor = UIColor.label
        configuration.cornerStyle = .capsule
        configuration.image = UIImage(systemName: "plus")
        configuration.contentInsets = NSDirectionalEdgeInsets(top: 8, leading: 10, bottom: 8, trailing: 10)

        let button = UIButton(configuration: configuration)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.widthAnchor.constraint(equalToConstant: 36).isActive = true
        button.heightAnchor.constraint(equalToConstant: 36).isActive = true
        return button
    }

    private func makeTabButton(title: String, symbol: String) -> UIButton {
        var configuration = UIButton.Configuration.plain()
        configuration.image = UIImage(systemName: symbol)
        configuration.imagePlacement = .top
        configuration.imagePadding = 6
        configuration.title = title
        configuration.baseForegroundColor = UIColor.label
        configuration.contentInsets = NSDirectionalEdgeInsets(top: 8, leading: 8, bottom: 8, trailing: 8)

        let button = UIButton(configuration: configuration)
        button.titleLabel?.font = UIFont.preferredFont(forTextStyle: .caption1)
        button.tintColor = UIColor.label
        return button
    }
}
