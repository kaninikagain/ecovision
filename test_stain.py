from PIL import Image
import numpy as np

img = Image.open('assets/pizza_box.jpg').convert('RGB')
w, h = img.size
print('Image dimensions:', w, h)

# Sample the center box area (0.28 to 0.72 width, 0.20 to 0.80 height)
box = img.crop((int(w * 0.25), int(h * 0.15), int(w * 0.75), int(h * 0.85)))
arr = np.array(box, dtype=np.float32)

r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
# Mean cardboard color
brightness = (r + g + b) / 3.0

# Oily stain pixels: dark brown grease spots
stain = (brightness < 115) & (r > b) & (brightness > 20)
stain_pct = (np.sum(stain) / (arr.shape[0] * arr.shape[1])) * 100
print('Stain percentage in pizza box crop:', round(stain_pct, 2))
