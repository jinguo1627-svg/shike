"""开发期截图脚本：跑一遍主要流程并把画面存到 .shots/。不参与构建。"""
import os
import sys

from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:4173/"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".shots")


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        page.on("pageerror", lambda exc: errors.append(f"[pageerror] {exc}"))
        page.on("console", lambda msg: errors.append(f"[console] {msg.text}") if msg.type == "error" else None)

        page.goto(URL, wait_until="networkidle")
        page.wait_for_timeout(800)
        page.screenshot(path=os.path.join(OUT, "01-today-empty.png"))

        page.click(".fab")
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(OUT, "02-search.png"))

        page.fill(".search input", "米饭")
        page.wait_for_timeout(300)
        page.click(".food-row >> nth=0")
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(OUT, "03-portion.png"))

        page.click(".detail .btn-primary")
        page.wait_for_timeout(700)
        page.screenshot(path=os.path.join(OUT, "04-today-filled.png"))

        # 再记一条别的
        page.click(".fab")
        page.wait_for_timeout(300)
        page.fill(".search input", "鸡胸")
        page.wait_for_timeout(300)
        page.click(".food-row >> nth=0")
        page.wait_for_timeout(300)
        page.click(".detail .btn-primary")
        page.wait_for_timeout(600)

        page.click(".tab >> nth=1")
        page.wait_for_timeout(700)
        page.screenshot(path=os.path.join(OUT, "05-trends.png"))

        page.click(".tab >> nth=2")
        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(OUT, "06-settings.png"))

        browser.close()

    if errors:
        print("页面错误：")
        for item in errors:
            print(" -", item)
        return 1
    print("截图完成，无页面错误")
    return 0


if __name__ == "__main__":
    sys.exit(main())
