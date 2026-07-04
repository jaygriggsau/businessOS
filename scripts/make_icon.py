#!/usr/bin/env python3
"""Generate the businessOS app icon (build/icon.ico + build/icon.png).

Draws a rounded-square tile with a brand-blue vertical gradient and a white
lowercase "b" mark, matching the in-app logo. Run from the project root:

    python3 scripts/make_icon.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

SIZE = 1024
RADIUS = int(SIZE * 0.225)  # rounded-square corner radius
TOP = (53, 99, 247)         # brand-500  #3563f7
BOTTOM = (26, 51, 212)      # brand-700  #1a33d4

FONT_CANDIDATES = [
    "/mnt/skills/examples/canvas-design/canvas-fonts/InstrumentSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def load_font(px: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return ImageFont.truetype(path, px)
    return ImageFont.load_default()


def vertical_gradient(size: int, top, bottom) -> Image.Image:
    grad = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / (size - 1)
        grad.putpixel(
            (0, y),
            (
                round(top[0] + (bottom[0] - top[0]) * t),
                round(top[1] + (bottom[1] - top[1]) * t),
                round(top[2] + (bottom[2] - top[2]) * t),
            ),
        )
    return grad.resize((size, size))


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def build() -> Image.Image:
    base = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    tile = vertical_gradient(SIZE, TOP, BOTTOM).convert("RGBA")
    base.paste(tile, (0, 0), rounded_mask(SIZE, RADIUS))

    draw = ImageDraw.Draw(base)

    # Soft top highlight for a bit of depth.
    highlight = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    hd = ImageDraw.Draw(highlight)
    hd.rounded_rectangle(
        [SIZE * 0.10, SIZE * 0.07, SIZE * 0.90, SIZE * 0.52],
        radius=int(RADIUS * 0.8),
        fill=(255, 255, 255, 28),
    )
    base = Image.alpha_composite(base, highlight)
    draw = ImageDraw.Draw(base)

    # The "b" mark.
    font = load_font(int(SIZE * 0.62))
    bbox = draw.textbbox((0, 0), "b", font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = (SIZE - w) / 2 - bbox[0]
    y = (SIZE - h) / 2 - bbox[1]
    draw.text((x, y), "b", font=font, fill=(255, 255, 255, 255))

    return base


def main() -> None:
    os.makedirs("build", exist_ok=True)
    icon = build()

    icon.save("build/icon.png")  # 1024px master (used for macOS/Linux)
    icon.save(
        "build/icon.ico",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print("Wrote build/icon.png and build/icon.ico")


if __name__ == "__main__":
    main()
