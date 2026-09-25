# track.py dir x0 y0 ... : crop frames following a figure using probe output (t sx sy) on stdin
import sys, glob, os
from PIL import Image
d, cw, ch, step = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
pos = {}
for line in sys.stdin:
    t, x, y = line.split(); pos[round(float(t), 3)] = (float(x), float(y))
fs = sorted(glob.glob(os.path.join(d, 't_*.png')))[::step]
crops = []
for f in fs:
    t = round(float(os.path.basename(f)[2:-4]), 3)
    x, y = min(pos.items(), key=lambda kv: abs(kv[0] - t))[1]
    crops.append(Image.open(f).crop((int(x - cw / 2), int(y - ch / 2), int(x + cw / 2), int(y + ch / 2))))
sheet = Image.new('RGB', (cw * len(crops), ch))
for i, c in enumerate(crops): sheet.paste(c, (i * cw, 0))
sheet.save(os.path.join(d, sys.argv[5] if len(sys.argv) > 5 else 'track.png'))
