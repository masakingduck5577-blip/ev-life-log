"""
アプリのアイコンを作る（配色C：紺の背景に、白い線の車と、青い丸の稲妻）。

    python scripts/make-icon.py

出力
- assets/images/icon.png（1024×1024、iPhone と Android のアイコン）
- assets/images/splash-icon.png（起動画面の印。角を丸めた四角）
- assets/images/favicon.png（ブラウザのタブ、48×48）
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'images'

NAVY = (10, 37, 64)  # #0A2540
ACCENT = (31, 111, 235)  # #1F6FEB
WHITE = (255, 255, 255)

S = 2048  # 大きく描いて縮める（線をなめらかにするため）
LINE = 76


def draw_icon() -> Image.Image:
    img = Image.new('RGB', (S, S), NAVY)
    d = ImageDraw.Draw(img)

    # 車（横から見た形）。屋根と車体を1本の線で描く
    body = [
        (330, 1330), (330, 1130), (420, 1060), (700, 1020), (860, 790), (1320, 790),
        (1520, 1020), (1640, 1050), (1718, 1130), (1718, 1330),
    ]
    # 始まりの2点をもう一度つなげて、線を閉じる所も角を丸める
    d.line(body + body[:2], fill=WHITE, width=LINE, joint='curve')
    # 窓
    window = [(920, 1000), (990, 870), (1270, 870), (1400, 1000)]
    d.line(window + window[:2], fill=WHITE, width=LINE // 2, joint='curve')
    # タイヤ（背景色でぬって、車体の線を切る）
    for cx in (690, 1360):
        r = 165
        d.ellipse((cx - r, 1330 - r, cx + r, 1330 + r), fill=NAVY, outline=WHITE, width=LINE)
        d.ellipse((cx - 45, 1330 - 45, cx + 45, 1330 + 45), fill=WHITE)

    # 稲妻（EV）：右上の青い丸
    cx, cy, r = 1540, 560, 270
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=ACCENT)
    bolt = [(1575, 380), (1440, 600), (1530, 600), (1495, 740), (1640, 510), (1550, 510)]
    d.polygon(bolt, fill=WHITE)

    return img.resize((1024, 1024), Image.LANCZOS)


def rounded(img: Image.Image, radius: int) -> Image.Image:
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.size[0] - 1, img.size[1] - 1), radius=radius, fill=255)
    out = img.convert('RGBA')
    out.putalpha(mask)
    return out


def main() -> None:
    icon = draw_icon()
    icon.save(OUT / 'icon.png')
    rounded(icon, 224).save(OUT / 'splash-icon.png')
    rounded(icon, 224).resize((48, 48), Image.LANCZOS).save(OUT / 'favicon.png')
    print('作りました：icon.png・splash-icon.png・favicon.png')


if __name__ == '__main__':
    main()
