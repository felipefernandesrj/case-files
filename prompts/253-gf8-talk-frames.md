Write one new file and patch existing files. Output exactly one FILE block, then stop. Formats (only marker lines start with <<<; the old text of a REPLACE block has NO < characters added in front of it and no space added before any >):

<<<FILE path>>>
...full content...
<<<END>>>

<<<REPLACE path>>>
old text
=====
new text
<<<END>>>

Do not write the words OLD or NEW inside a block. No commentary, no markdown fences. The full content of every new file and every new text are given between the lines BEGIN and FINISH: copy them exactly, character for character, and do not output the words BEGIN or FINISH.

Context: the last answer skipped this Python file and wrote a wrong CSS file instead. Output only this one Python file, path scripts/assets/talk_frames.py, with the exact content below. Do not output any CSS or HTML.

File scripts/assets/talk_frames.py:
BEGIN
"""Talking portrait sheets for the Conversation log (M2 game feel sprint 8).

Local CPU only: no model call. For every suspect it reads the generated
neutral portrait (128 px) and writes a two frame sheet next to it,
<case>-<id>-talk.png (256x128): frame 1 is the neutral portrait as is,
frame 2 is the same portrait with the mouth open. The page swaps the two
frames with a CSS steps() animation while an answer is being revealed.

Usage: python3 scripts/assets/talk_frames.py [assets dir]
"""
import os
import sys
from PIL import Image

# Mouth centre (x, y) and half width in the 128 px neutral frame, measured by hand.
MOUTHS = {
    'violin-lorenzo': (32, 80, 6),
    'violin-maya': (81, 75, 5),
    'violin-carlos': (44, 74, 7),
    'night-train-helena': (76, 71, 5),
    'night-train-ines': (51, 68, 4),
    'night-train-tomas': (50, 77, 7),
    'night-train-victor': (53, 71, 7),
}
INSIDE = (38, 12, 14, 255)  # dark mouth interior
LIP = (120, 44, 40, 255)    # lower lip edge


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def lip_line(im, cx, cy, hw):
    """Darkest row near the given centre: the closed lip line."""
    best, best_y = None, cy
    for y in range(cy - 3, cy + 4):
        row = [lum(im.getpixel((x, y))) for x in range(cx - hw, cx + hw + 1)]
        v = sum(row) / len(row)
        if best is None or v < best:
            best, best_y = v, y
    return best_y


def open_mouth(neutral, cx, cy, hw):
    im = neutral.copy()
    y0 = lip_line(neutral, cx, cy, hw)
    for dx in range(-hw, hw + 1):
        edge = abs(dx) / max(hw, 1)
        depth = 3 if edge < 0.5 else (2 if edge < 0.85 else 1)
        x = cx + dx
        for k in range(depth):
            im.putpixel((x, y0 + k), INSIDE)
        if edge < 0.85:
            im.putpixel((x, y0 + depth), LIP)
    return im


def build(assets):
    out = []
    for name, (cx, cy, hw) in MOUTHS.items():
        src = os.path.join(assets, 'characters', f'{name}-neutral.png')
        if not os.path.exists(src):
            continue
        neutral = Image.open(src).convert('RGBA')
        sheet = Image.new('RGBA', (neutral.width * 2, neutral.height), (0, 0, 0, 0))
        sheet.paste(neutral, (0, 0))
        sheet.paste(open_mouth(neutral, cx, cy, hw), (neutral.width, 0))
        dst = os.path.join(assets, 'characters', f'{name}-talk.png')
        sheet.save(dst, optimize=True)
        out.append(dst)
    return out


if __name__ == '__main__':
    root = sys.argv[1] if len(sys.argv) > 1 else os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'assets'))
    for f in build(root):
        print(f)
FINISH
