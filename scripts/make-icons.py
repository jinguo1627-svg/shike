"""生成 PWA 图标（纯几何图形，不依赖任何字体）。

用法：python scripts/make-icons.py
"""
from __future__ import annotations

import math
import os

from PIL import Image, ImageDraw

BLUE = (24, 95, 165, 255)
WHITE = (255, 255, 255, 255)
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "icons")


def make(size: int, pad_ratio: float = 0.0) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 圆角底板；maskable 图标需要留出安全区，所以内容整体缩小
    draw.rounded_rectangle([0, 0, size, size], radius=int(size * 0.22), fill=BLUE)

    scale = 1 - pad_ratio
    cx = cy = size / 2
    r = size * 0.29 * scale
    w = max(2, int(size * 0.085 * scale))

    # 一段留缺口的圆环，呼应应用里的今日进度环
    box = [cx - r, cy - r, cx + r, cy + r]
    draw.arc(box, start=-90, end=235, fill=WHITE, width=w)

    # 缺口末端加一个圆点，作为进度指示
    angle = math.radians(235)
    dot = w * 0.62
    dx, dy = cx + r * math.cos(angle), cy + r * math.sin(angle)
    draw.ellipse([dx - dot, dy - dot, dx + dot, dy + dot], fill=WHITE)

    return img


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    targets = [
        ("icon-192.png", 192, 0.0),
        ("icon-512.png", 512, 0.0),
        ("icon-maskable-512.png", 512, 0.18),
        ("apple-touch-icon.png", 180, 0.0),
    ]
    for name, size, pad in targets:
        make(size, pad).save(os.path.join(OUT, name))
        print(f"[icon] {name} {size}x{size}")


if __name__ == "__main__":
    main()
