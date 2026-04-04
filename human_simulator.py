import time
import math
import random
from typing import List, Tuple
from playwright.sync_api import Page, Locator

class HumanSimulator:
    def __init__(self, page: Page):
        self.page = page
        
    def _cubic_bezier(self, t: float, p0: Tuple[float, float], p1: Tuple[float, float], p2: Tuple[float, float], p3: Tuple[float, float]) -> Tuple[float, float]:
        \"\"\"
        计算三次贝塞尔曲线上的点
        \"\"\"
        u = 1 - t
        tt = t * t
        uu = u * u
        uuu = uu * u
        ttt = tt * t

        x = uuu * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + ttt * p3[0]
        y = uuu * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * p3[1]
        
        return (x, y)

    def _generate_mouse_trajectory(self, start: Tuple[float, float], end: Tuple[float, float], num_points: int = 30) -> List[Tuple[float, float]]:
        \"\"\"
        生成基于起点和终点的仿生贝塞尔鼠标滑动轨迹，带有微小的自然弧度
        \"\"\"
        # 随机设定两个控制点，给线条增加随性的弯曲
        diff_x = end[0] - start[0]
        diff_y = end[1] - start[1]
        
        # 偏移幅度
        offset1_x = random.uniform(-0.5, 0.5) * diff_x
        offset1_y = random.uniform(-0.5, 0.5) * diff_y
        offset2_x = random.uniform(-0.5, 0.5) * diff_x
        offset2_y = random.uniform(-0.5, 0.5) * diff_y
        
        p0 = start
        p1 = (start[0] + diff_x/3 + offset1_x, start[1] + diff_y/3 + offset1_y)
        p2 = (start[0] + 2*diff_x/3 + offset2_x, start[1] + 2*diff_y/3 + offset2_y)
        p3 = end
        
        points = []
        for i in range(num_points):
            t = i / (num_points - 1)
            # 引入非匀速的时间戳流逝（在中间快，两头慢，利用三角函数）
            ease_t = math.sin(t * math.pi / 2) if random.random() > 0.5 else t
            
            x, y = self._cubic_bezier(ease_t, p0, p1, p2, p3)
            # 细微抖动
            jitter_x = random.uniform(-1, 1)
            jitter_y = random.uniform(-1, 1)
            points.append((x + jitter_x, y + jitter_y))
            
        return points

    def human_move_mouse(self, current_pos: Tuple[float, float], target_locator: Locator):
        \"\"\"
        利用真实贝塞尔轨迹将鼠标滑动至目标元素中央附近
        \"\"\"
        box = target_locator.bounding_box()
        if not box:
            target_locator.scroll_into_view_if_needed()
            time.sleep(random.uniform(0.5, 1.2)) # 人眼寻找位置的时间
            box = target_locator.bounding_box()
            
        if not box:
            return  # 元素不可见

        # 目标点击位置带有随机偏移，不会瞄准绝对正中心
        target_x = box['x'] + box['width'] * random.uniform(0.3, 0.7)
        target_y = box['y'] + box['height'] * random.uniform(0.3, 0.7)
        
        # 生成轨迹
        steps = random.randint(15, 45)
        trajectory = self._generate_mouse_trajectory(current_pos, (target_x, target_y), steps)
        
        for p in trajectory:
            self.page.mouse.move(p[0], p[1])
            # 模拟每次移动的小段延迟 (5ms - 15ms)
            time.sleep(random.uniform(0.005, 0.015))
            
        # 结尾稍加停顿，人眼确认位置
        time.sleep(random.uniform(0.1, 0.3))
        # 返回最终所在位置的坐标以供下一次接续移动使用
        return (target_x, target_y)

    def human_click(self, current_pos: Tuple[float, float], target_locator: Locator):
        \"\"\"
        从当前位置以抛物线滑动到目标，然后进行拟真点击
        \"\"\"
        new_pos = self.human_move_mouse(current_pos, target_locator)
        if new_pos:
            # 鼠标左键按下和弹起有细微间隔
            self.page.mouse.down()
            time.sleep(random.uniform(0.05, 0.15))
            self.page.mouse.up()
            time.sleep(random.uniform(0.05, 0.2)) # 点击完后人的大脑反应间隔
            return new_pos
        return current_pos

    def human_type(self, target_locator: Locator, text: str, mistake_rate: float = 0.05):
        \"\"\"
        极其仿真的键盘输入模型：
        - 不同的字符有不同的敲击延迟（模拟寻找键位）
        - 一定概率出现敲错（模拟按到旁边键），然后再按退格键修正
        \"\"\"
        # 首先点击聚焦到输入框
        target_locator.focus()
        time.sleep(random.uniform(0.2, 0.5))
        
        keyboard = self.page.keyboard
        for char in text:
            # 模拟打错字概率
            if random.random() < mistake_rate:
                # 随便敲一个附近的字母（仅作示例，此处完全随机选择一个字母）
                wrong_char = random.choice('abcdefghijklmnopqrstuvwxyz')
                keyboard.press(wrong_char)
                time.sleep(random.uniform(0.15, 0.35)) # 反应过来打错了
                keyboard.press(\"Backspace\")
                time.sleep(random.uniform(0.1, 0.25))
            
            # 正式键入正确的字符
            keyboard.press(char)
            # 各字符间的不均衡节奏
            time.sleep(random.uniform(0.05, 0.28))
            
        time.sleep(random.uniform(0.3, 0.6))
