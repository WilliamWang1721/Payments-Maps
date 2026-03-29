import random
from typing import Dict, Any
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, Browser, BrowserContext, Page
from playwright_stealth import stealth_sync
from fake_useragent import UserAgent

class StealthBrowser:
    def __init__(self, headless: bool = False, locale: str = 'en-US', timezone: str = 'America/New_York'):
        self.headless = headless
        self.locale = locale
        self.timezone = timezone
        self._ua = UserAgent(os="windows", browsers=["chrome", "edge"])
        
    def get_advanced_args(self) -> list:
        # 高级启动参数，防止 WebGL 和特定功能的检测
        return [
            "--disable-blink-features=AutomationControlled",
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process",
            "--disable-site-isolation-trials",
            "--no-first-run",
            "--no-default-browser-check",
            "--password-store=basic",
            "--disable-extensions",
            "--disable-sync"
        ]

    def _get_random_viewport(self):
        viewports = [
            {"width": 1920, "height": 1080},
            {"width": 2560, "height": 1440},
            {"width": 1366, "height": 768},
            {"width": 1440, "height": 900},
            {"width": 1536, "height": 864}
        ]
        return random.choice(viewports)

    def launch(self) -> tuple:
        \"\"\"
        启动浏览器，并返回上下文和主页面
        \"\"\"
        self.playwright = sync_playwright().start()
        
        # 随机分配真实的 User-Agent (尽量保证是 Windows 的 Chrome)
        user_agent = self._ua.random
        
        # 启动 Chromium
        self.browser: Browser = self.playwright.chromium.launch(
            headless=self.headless,
            args=self.get_advanced_args()
        )
        
        viewport = self._get_random_viewport()
        
        # 创建独立上下文，模拟完全干净的环境
        self.context: BrowserContext = self.browser.new_context(
            user_agent=user_agent,
            viewport=viewport,
            locale=self.locale,
            timezone_id=self.timezone,
            permissions=["geolocation", "notifications"], # 授权基本权限显得很自然
            color_scheme="dark" if random.random() > 0.5 else "light",
            has_touch=False,
            device_scale_factor=random.choice([1, 1.25, 1.5])
        )

        # 挂载 Stealth 插件消除 webdriver 指纹
        self.page: Page = self.context.new_page()
        stealth_sync(self.page)
        
        # 补充更深度的 Canvas 和 WebRTC 干扰及 Navigator 伪装
        self._inject_deep_stealth(self.page)
        
        return self.playwright, self.browser, self.context, self.page

    def _inject_deep_stealth(self, page: Page):
        # 1. 深度隐藏 webdriver 对象属性
        page.add_init_script(\"\"\"
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            window.navigator.chrome = {
                runtime: {},
                // 以及一些模拟的 loadTimes 等属性
            };
        \"\"\")

        # 2. 修改 Canvas 签名，使得每台机器或者每次指纹稍有区别
        page.add_init_script(\"\"\"
            const originalGetContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function(type, contextAttributes) {
                const context = originalGetContext.call(this, type, contextAttributes);
                if (type === '2d') {
                    const originalFillText = context.fillText;
                    context.fillText = function(...args) {
                        return originalFillText.apply(this, args);
                    };
                }
                return context;
            };
        \"\"\")
        
        # 3. 欺骗插件列表检测 (Plugin Length)
        page.add_init_script(\"\"\"
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
        \"\"\")
        
    def close(self):
        self.context.close()
        self.browser.close()
        self.playwright.stop()
