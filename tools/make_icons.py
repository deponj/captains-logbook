"""Generate app icons (paper skin: warm cream bg, ink wordmark + accent dot).
Produces icon-192.png, icon-512.png, apple-touch-icon.png.
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), '..', 'icons')
os.makedirs(OUT, exist_ok=True)

BG = (243, 239, 230)
INK = (26, 24, 21)
ACCENT = (155, 58, 42)

def candidate_fonts():
    base = r'C:\Windows\Fonts'
    return [
        os.path.join(base, n) for n in (
            'georgia.ttf', 'georgiai.ttf', 'times.ttf', 'cambria.ttc',
            'segoeui.ttf', 'arial.ttf'
        )
    ]

def load_font(size):
    for p in candidate_fonts():
        if os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except Exception: pass
    return ImageFont.load_default()

def render(size, out_name):
    img = Image.new('RGBA', (size, size), BG + (255,))
    d = ImageDraw.Draw(img)
    # Centered "L." — serif, large
    font = load_font(int(size * 0.62))
    text = 'L'
    bbox = d.textbbox((0,0), text, font=font)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    x = (size - tw)//2 - bbox[0]
    y = (size - th)//2 - bbox[1] - int(size*0.04)
    d.text((x, y), text, font=font, fill=INK)
    # accent dot
    r = max(4, int(size*0.045))
    cx = x + tw + int(size*0.05)
    cy = y + th - r//2
    d.ellipse((cx-r, cy-r, cx+r, cy+r), fill=ACCENT)
    # thin hairline rule at bottom
    rule_y = int(size * 0.88)
    d.line((int(size*0.16), rule_y, int(size*0.84), rule_y), fill=INK, width=max(1, size//256))
    # tiny mono cap top
    cap = load_font(int(size * 0.06))
    cap_text = "CAPT. LOGBOOK"
    bb = d.textbbox((0,0), cap_text, font=cap)
    cw = bb[2]-bb[0]
    d.text(((size - cw)//2 - bb[0], int(size*0.10)), cap_text, font=cap, fill=(122,116,106))
    path = os.path.join(OUT, out_name)
    img.save(path, 'PNG')
    print('wrote', path)

render(192, 'icon-192.png')
render(512, 'icon-512.png')
render(180, 'apple-touch-icon.png')
