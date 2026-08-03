#!/usr/bin/env python3
"""Render every icon size from the vector master in assets/icon.svg.

The design was supplied as a 352px PNG, which is smaller than the largest
slots need (1024 for the Play listing, 432 for xxxhdpi launchers). Rather than
upscale it ~3x and lose the edges, the geometry is reproduced here and drawn
at whatever size is asked for. The constants below were measured off the
original export — keep them in step with assets/icon.svg.

Feeds @capacitor/assets, which turns these three into every Android launcher
density. The web icons under public/icons/ are still the old teardrop pin and
are deliberately not touched here.

Usage:  python3 scripts/generate-icons.py && npx @capacitor/assets generate --android
Needs:  pillow
"""
from PIL import Image, ImageDraw

# ── Geometry, in the 352-unit space of the original export ──────────────────
UNIT = 352.0
CORNER_RADIUS = 75.0
BACKGROUND = (14, 21, 18, 255)          # #0e1512
RINGS = [
    # (centreline radius, stroke width, colour)
    (108.5, 8.0, (8, 127, 71, 255)),    # #087f47
    (72.5, 8.0, (4, 196, 107, 255)),    # #04c46b
]
DISC_RADIUS = 40.0
DISC = (0, 255, 136, 255)               # #00ff88 — the app accent

# Drawn at this multiple then downsampled, which is how the curves get their
# antialiasing; PIL has none of its own.
SUPERSAMPLE = 4


def render(size, *, full_bleed=False, foreground_only=False, background_only=False):
    """One icon.

    full_bleed      corners filled rather than transparent. Maskable and iOS
                    slots apply their own shape, and a transparent corner
                    under those masks shows through as a notch.
    foreground_only just the rings and disc, for the Android adaptive layer.
    background_only just the flat colour, likewise.
    """
    s = size * SUPERSAMPLE
    scale = s / UNIT
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = s / 2

    if not foreground_only:
        if full_bleed or background_only:
            d.rectangle([0, 0, s, s], fill=BACKGROUND)
        else:
            d.rounded_rectangle([0, 0, s - 1, s - 1],
                                radius=CORNER_RADIUS * scale, fill=BACKGROUND)
    if background_only:
        return im.resize((size, size), Image.LANCZOS)

    for radius, width, colour in RINGS:
        r = radius * scale
        w = width * scale
        d.ellipse([c - r, c - r, c + r, c + r], outline=colour, width=round(w))

    r = DISC_RADIUS * scale
    d.ellipse([c - r, c - r, c + r, c + r], fill=DISC)
    return im.resize((size, size), Image.LANCZOS)


TARGETS = [
    # (path, size, kwargs)
    ('assets/icon.png', 1024, {}),
    ('assets/icon-foreground.png', 1024, dict(foreground_only=True)),
    ('assets/icon-background.png', 1024, dict(background_only=True)),

]

if __name__ == '__main__':
    for path, size, kwargs in TARGETS:
        render(size, **kwargs).save(path)
        print(f'{path:44} {size}x{size}')

