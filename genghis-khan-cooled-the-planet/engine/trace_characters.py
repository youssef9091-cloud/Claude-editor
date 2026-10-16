"""Cut the presenters out of the character sheet (assets/ref_character_sheet.png) and trace them to SVG.
Run: python3 -I engine/trace_characters.py   → build/chars/<piece>.svg (+ .png previews)"""
import numpy as np, vtracer
from PIL import Image, ImageFilter
from scipy import ndimage
SHEETS = {'f': Image.open('assets/ref_character_sheet.png').convert('RGB'),          # father (905 px original)
          'd': Image.open('assets/ref_character_sheet_daughter.png').convert('RGB')}  # daughter (new 784x1360 sheet)
K = 8   # upscale before tracing
SHADOW = (218, 209, 193)   # the beige ground shadow under the sheet figures
# name: (crop box in sheet px, trace params)
FINE = dict(color_precision=8, layer_difference=8, filter_speckle=14)
SOFT = dict(color_precision=7, layer_difference=14, filter_speckle=20)
PIECES = {   # name: (sheet, crop box in sheet px, trace params)
    'd_front':   ('d', (30, 255, 246, 606), SOFT),    # hand on hip
    'd_sit':     ('d', (394, 1074, 569, 1296), SOFT),  # cross-legged, hand on chin
    'd_explain': ('d', (266, 1000, 430, 1170), SOFT),  # palm up, explaining
    'f_34_full': ('f', (125, 148, 222, 478), FINE),    # same pose, full length (stands by the sofa in the wide shot)
}
for name, (sh, box, prm) in PIECES.items():
    a = np.asarray(SHEETS[sh].crop(box)).astype(int)
    corners = np.concatenate([a[:4, :4].reshape(-1, 3), a[:4, -4:].reshape(-1, 3), a[-4:, :4].reshape(-1, 3), a[-4:, -4:].reshape(-1, 3)])
    bg = np.median(corners, axis=0)
    near = np.sqrt(((a - bg) ** 2).sum(-1)) < 30
    lab, n = ndimage.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(edge))
    fg = ~bgmask
    lab2, n2 = ndimage.label(fg)
    if n2: sizes = ndimage.sum(fg, lab2, range(1, n2 + 1)); fg = lab2 == (1 + int(np.argmax(sizes)))
    holes = ndimage.binary_fill_holes(fg) & ~fg       # fill only pin-holes; keep the gaps between arms and body open
    hl, hn = ndimage.label(holes)
    for i in range(1, hn + 1):
        if (hl == i).sum() < 25: fg |= hl == i
    fg = ndimage.binary_opening(fg, iterations=1)
    fg = ndimage.binary_erosion(fg, iterations=1)   # drop the anti-aliased background fringe
    # enclosed background (e.g. inside the arm on the hip) and the sheet's ground shadows → transparent
    bgish = np.sqrt(((a - bg) ** 2).sum(-1)) < (26 if name == 'd_sit' else 42)   # d_sit keeps its white sneaker soles
    bl, bn = ndimage.label(bgish & fg)
    for i in range(1, bn + 1):
        if (bl == i).sum() > (110 if sh == 'd' else 12): fg &= ~(bl == i)
    shadow = np.sqrt(((a - np.array(SHADOW)) ** 2).sum(-1)) < 30
    sl, sn = ndimage.label(shadow & fg)
    for i in range(1, sn + 1):
        if (sl == i).sum() > 60: fg &= ~(sl == i)
    lab3, n3 = ndimage.label(fg)
    if n3: sizes = ndimage.sum(fg, lab3, range(1, n3 + 1)); fg = lab3 == (1 + int(np.argmax(sizes)))
    rgba = np.dstack([a, (fg * 255)]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA'); W, H = im.size
    big = im.resize((W * K, H * K), Image.LANCZOS)
    rgb = big.convert('RGB').filter(ImageFilter.MedianFilter(5)); al = big.split()[3].filter(ImageFilter.GaussianBlur(3)).point(lambda v: 255 if v > 140 else 0)
    out = Image.merge('RGBA', (*rgb.split(), al)); out.save(f'build/chars/{name}.png')
    vtracer.convert_image_to_svg_py(f'build/chars/{name}.png', f'build/chars/{name}.svg', colormode='color', hierarchical='stacked', mode='spline',
        corner_threshold=60, length_threshold=4.0, splice_threshold=45, path_precision=3, **prm)
    print(name, box, f'{W}x{H} →', f'{W*K}x{H*K}')
