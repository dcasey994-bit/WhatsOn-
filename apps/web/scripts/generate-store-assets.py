#!/usr/bin/env python3
"""Play Console listing graphics, from the same geometry as the app icon.

Play's requirements: the listing icon is 512x512 and must be opaque; the
feature graphic is exactly 1024x500 and is what appears at the top of the
store page and in promotional spots.

Usage:  python3 scripts/generate-store-assets.py
Needs:  pillow
"""
import importlib.util
from pathlib import Path
from PIL import Image, ImageDraw

spec = importlib.util.spec_from_file_location(
    'icons', Path(__file__).with_name('generate-icons.py'))
icons = importlib.util.module_from_spec(spec)
spec.loader.exec_module(icons)

OUT = Path('store')
OUT.mkdir(exist_ok=True)

# ── Listing icon ────────────────────────────────────────────────────────────
# Opaque, so full_bleed rather than the design's own rounded corners: Play
# rounds it itself, exactly like a launcher does.
icons.render(512, full_bleed=True).save(OUT / 'play-icon-512.png')

# ── Feature graphic ─────────────────────────────────────────────────────────
# 1024x500 exactly. Play crops and overlays this in several places, so the
# mark sits left of centre with the wordmark beside it and nothing important
# near the edges.
W, H = 1024, 500
fg = Image.new('RGB', (W, H), icons.SPLASH_BG[:3])
mark_size = 300
mark = icons.render(mark_size, foreground_only=True)
fg.paste(mark, (96, (H - mark_size) // 2), mark)
d = ImageDraw.Draw(fg)


def font(size):
    for path in (
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    ):
        if Path(path).exists():
            from PIL import ImageFont
            return ImageFont.truetype(path, size)
    from PIL import ImageFont
    return ImageFont.load_default(size)


x = 96 + mark_size + 64
d.text((x, 186), 'WhatsOn', font=font(76), fill=(0, 255, 136))
w = d.textlength('WhatsOn', font=font(76))
d.text((x + w, 186), '?', font=font(76), fill=(255, 255, 255))
d.text((x, 278), "What's on tonight, near you", font=font(30), fill=(150, 155, 160))
fg.save(OUT / 'play-feature-graphic.png')

for f in sorted(OUT.iterdir()):
    print(f'{str(f):40} {Image.open(f).size}')
