import sys, os
from PIL import Image, ImageDraw
# sheet.py out.png cols cellw file...
out, cols, cw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
files = sys.argv[4:]
ims = [Image.open(f).convert('RGB') for f in files]
ch = round(cw * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cw, rows * (ch + 18)), (20, 20, 28))
d = ImageDraw.Draw(sheet)
for i, (im, f) in enumerate(zip(ims, files)):
    x, y = (i % cols) * cw, (i // cols) * (ch + 18)
    sheet.paste(im.resize((cw, ch), Image.LANCZOS), (x, y))
    d.text((x + 4, y + ch + 3), os.path.basename(f)[2:-4], fill=(230, 230, 230))
sheet.save(out)
