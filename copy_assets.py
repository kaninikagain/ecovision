import shutil
from pathlib import Path

brain_dir = Path(r"C:\Users\Kaninika Gain\.gemini\antigravity-ide\brain\a64ed0cc-af1b-45c4-ad75-956b748bfcca")
assets_dir = Path("assets")
assets_dir.mkdir(exist_ok=True)

# Copy pizza box
pizza_files = list(brain_dir.glob("pizza_box_*.jpg"))
if pizza_files:
    shutil.copy(pizza_files[-1], assets_dir / "pizza_box.jpg")
    print("Copied pizza_box.jpg")

phone_files = list(brain_dir.glob("phone_charge_*.jpg"))
if phone_files:
    shutil.copy(phone_files[-1], assets_dir / "phone_charge.jpg")
    print("Copied phone_charge.jpg")

bulb_files = list(brain_dir.glob("bulb_glow_*.jpg"))
if bulb_files:
    shutil.copy(bulb_files[-1], assets_dir / "bulb_glow.jpg")
    print("Copied bulb_glow.jpg")
