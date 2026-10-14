#!/usr/bin/env python3
"""
Generate high-contrast luxury metallic gold favicons with 100% transparent backgrounds.
Designed specifically to excel on:
1. Google Search snippet light circular background (rich contrast, visible).
2. Browser tabs in both dark mode (#0B0C10 / #202124) and light mode.
3. High DPI mobile bookmarks (Apple Touch Icon 180x180).
"""

from PIL import Image

def generate_gold_favicons():
    # Load original white crown for the crisp alpha mask
    src = Image.open('public/icon.png').convert('RGBA')
    orig_a = src.split()[3]
    w, h = src.size

    # Crop to bounding box to maximize prominence
    bbox = orig_a.getbbox()
    cropped_a = orig_a.crop(bbox)
    cw, ch = cropped_a.size

    # Fit into 512x512 with optimal padding (460px width for max prominence)
    target_w = 460
    aspect = ch / cw
    target_h = int(target_w * aspect)

    resized_a = cropped_a.resize((target_w, target_h), Image.Resampling.LANCZOS)

    canvas_a = Image.new('L', (512, 512), 0)
    paste_x = (512 - target_w) // 2
    paste_y = (512 - target_h) // 2
    canvas_a.paste(resized_a, (paste_x, paste_y))

    # Metallic gold color stops (luxurious royal gold luster)
    # Stop 0.0:  #F8E496 (248, 228, 150) - Top specular highlight
    # Stop 0.35: #E0BA4C (224, 186, 76)  - Bright polished gold
    # Stop 0.70: #C89B23 (200, 155, 35)  - Rich 24k bullion gold
    # Stop 1.0:  #966E0F (150, 110, 15)  - Deep gold shadow
    def lerp(c1, c2, t):
        return int(c1 + (c2 - c1) * t)

    def get_gold_color(t):
        t = max(0.0, min(1.0, t))
        if t < 0.35:
            sub = t / 0.35
            return (lerp(248, 224, sub), lerp(228, 186, sub), lerp(150, 76, sub))
        elif t < 0.70:
            sub = (t - 0.35) / 0.35
            return (lerp(224, 200, sub), lerp(186, 155, sub), lerp(76, 35, sub))
        else:
            sub = (t - 0.70) / 0.30
            return (lerp(200, 150, sub), lerp(155, 110, sub), lerp(35, 15, sub))

    # Generate gold RGBA canvas with 100% transparent background
    gold_512 = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    gold_pixels = gold_512.load()
    canvas_a_pixels = canvas_a.load()

    y_start = paste_y
    y_end = paste_y + target_h
    x_start = paste_x
    x_end = paste_x + target_w

    for y in range(512):
        for x in range(512):
            a = canvas_a_pixels[x, y]
            if a > 0:
                diag_t = ((y - y_start) * 0.8 + (x - x_start) * 0.2) / ((y_end - y_start) * 0.8 + (x_end - x_start) * 0.2)
                r, g, b = get_gold_color(diag_t)
                gold_pixels[x, y] = (r, g, b, a)

    # 1. Save public/icon.png (512x512)
    gold_512.save('public/icon.png', 'PNG')
    print('✅ Saved public/icon.png (512x512)')

    # 2. Save src/app/icon.png (512x512)
    gold_512.save('src/app/icon.png', 'PNG')
    print('✅ Saved src/app/icon.png (512x512)')

    # 3. Save public/apple-icon.png (180x180)
    apple_icon = gold_512.resize((180, 180), Image.Resampling.LANCZOS)
    apple_icon.save('public/apple-icon.png', 'PNG')
    print('✅ Saved public/apple-icon.png (180x180)')

    # 4. Save public/favicon.ico (multi-resolution 16, 32, 48)
    gold_512.save('public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print('✅ Saved public/favicon.ico (16x16, 32x32, 48x48)')

if __name__ == '__main__':
    generate_gold_favicons()
