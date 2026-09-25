# popscan.py video.mp4 : flag one-frame pops (frame diffs far above their local median)
import glob, subprocess, tempfile, sys, numpy as np
from PIL import Image, ImageFilter
import imageio_ffmpeg
video = sys.argv[1]; fps = 30
ff = imageio_ffmpeg.get_ffmpeg_exe()
with tempfile.TemporaryDirectory() as tmp:
    subprocess.run([ff, '-loglevel', 'error', '-i', video, '-vf', 'scale=480:270', f'{tmp}/f_%05d.png'], check=True)
    im = [np.asarray(Image.open(f).convert('L').filter(ImageFilter.GaussianBlur(2)), float) for f in sorted(glob.glob(f'{tmp}/f_*.png'))]
d = np.array([0] + [np.abs(im[i] - im[i - 1]).mean() for i in range(1, len(im))])
print(f'{len(im)} frames; mean diff {d[1:].mean():.2f}, max {d.max():.2f} at {d.argmax()/fps:.2f}s')
for i in range(1, len(d)):
    loc = np.median(d[max(1, i - 4):i + 5])
    if d[i] > max(1.5, 2.6 * loc):
        print(f'  pop? {i / fps:.2f}s  diff {d[i]:.2f} vs local {loc:.2f}')
# stillness per second
print('per-second mean change:', ' '.join(f'{d[s*fps+1:(s+1)*fps].mean():.2f}' for s in range(len(d)//fps)))
