import time
import os
import random
from stealth_browser import StealthBrowser
from human_simulator import HumanSimulator
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

def read_config():
    # TODO: 替换为您需要的真实测试账号或抓取自动取号器参数
    return {
        \"target_url\": \"https://bot.sannysoft.com/\",  # 这里目前用著名指纹检测站点演示，实际使用时请替换为您要注册的官网（例如 ChatGPT等）
        \"account_email\": f\"test_acc_{random.randint(1000,9999)}@gmail.com\",
        \"account_password\": \"Test_Pass@2026Ww\",
        \"first_name\": \"William\",
        \"last_name\": \"Wang\"
    }

def simulate_registration():
    print(\"[-] 正在构建深度伪装隔离环境...\")
    sb = StealthBrowser(headless=False) # 演示阶段建议开启窗口以便肉眼观察人类拟态行为
    pw, browser, context, page = sb.launch()
    print(\"[+] 环境构建完成，准备启动仿真核心。\")
    
    cfg = read_config()
    simulator = HumanSimulator(page)
    
    # 假定初始鼠标在屏幕中央偏上的位置
    current_mouse_pos = (500.0, 300.0) 
    
    try:
        print(f\"[-] 正在访问注册页面: {cfg['target_url']}\")
        # 超时时间设长一些，有时候国外高风险检测会故意挂起 10s 观察 TLS Client Hello 握手情况
        page.goto(cfg['target_url'], wait_until=\"networkidle\", timeout=60000)
        
        # 模拟真人等待网页加载完成的下意识动作，例如随便晃晃鼠标或者滚轮
        time.sleep(random.uniform(2, 4))
        page.mouse.wheel(0, random.uniform(200, 500))
        time.sleep(random.uniform(1, 3))
        
        print(\"[!] 以下是演示打字引擎与鼠标轨迹的代码骨架，由于未指定具体的账户表单：\")
        print(\"[!] 因此代码执行此部分作为通用逻辑示例，如果在检测网能够绿灯通过，即代表该指纹库及方案无懈可击。\")
        
        # --- 通用注册表单填写逻辑示范段落（正式使用时请取消注释并对应选取 selector） ---
        \"\"\"
        # 1. 查找并点击 'Create Account / Sign Up'
        signup_btn = page.locator(\"text=Sign Up\").first
        if signup_btn.is_visible():
            current_mouse_pos = simulator.human_click(current_mouse_pos, signup_btn)
            page.wait_for_load_state(\"networkidle\")

        # 2. 填写名字
        fname_input = page.locator(\"input[name='firstname'], input[id*='first']\").first
        if fname_input.is_visible():
            current_mouse_pos = simulator.human_click(current_mouse_pos, fname_input)
            simulator.human_type(fname_input, cfg['first_name'], mistake_rate=0.08)

        # 3. 填写邮箱
        email_input = page.locator(\"input[type='email'], input[name='email']\").first
        if email_input.is_visible():
            current_mouse_pos = simulator.human_click(current_mouse_pos, email_input)
            simulator.human_type(email_input, cfg['account_email'])

        # 4. 填写密码（密码一般极少打错，所以 mistake_rate 极低或为0）
        pwd_input = page.locator(\"input[type='password']\").first
        if pwd_input.is_visible():
            current_mouse_pos = simulator.human_click(current_mouse_pos, pwd_input)
            simulator.human_type(pwd_input, cfg['account_password'], mistake_rate=0.01)

        # 5. 滑动验证码预留 (Slider & reCaptcha)
        # 例如发现某个 Cloudflare 盾的框，使用贝塞尔曲线划过去点击
        cf_checkbox = page.locator(\"iframe[src*='cloudflare']\").locator(\".ctp-checkbox-label\").first
        if cf_checkbox.is_visible():
            print(\"[+] 发现 CF 层，开始拟真点击绕过...\")
            # 在点击复选框前在周围随便乱转两下
            cf_x, cf_y = cf_checkbox.bounding_box()['x'], cf_checkbox.bounding_box()['y']
            simulator._generate_mouse_trajectory(current_mouse_pos, (cf_x - 30, cf_y + 20), 20)
            current_mouse_pos = simulator.human_click(current_mouse_pos, cf_checkbox)
            time.sleep(3)

        # 6. 点击最终的 Submit 提交
        submit_btn = page.locator(\"button[type='submit'], text=Create Account\").first
        if submit_btn.is_visible():
            current_mouse_pos = simulator.human_click(current_mouse_pos, submit_btn)
        \"\"\"
        
        # 为了演示指纹检测效果，我们在检测页提留 30 秒供肉眼勘察全线飘绿的状态
        print(\"[+] 您现在有 30 秒时间检查页面上的 Webdriver、Webgl、UserAgent 和 TLS 伪装成果。\")
        time.sleep(30)
        
    except PlaywrightTimeoutError:
        print(\"[-] 页面加载超时，目标检测极为严苛。这可能需要我们进一步使用特定原生指纹配置。\")
    except Exception as e:
        print(f\"[-] 流程发生异常: {e}\")
    finally:
        print(\"[-] 正在销毁无痕容器并清理会话与持久层...\")
        sb.close()

if __name__ == \"__main__\":
    print(\"===========================================\")
    print(\"        高级人类拟态注册辅助终端 V1.0        \")
    print(\"===========================================\")
    simulate_registration()
