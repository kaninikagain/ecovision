import base64
import json
from pathlib import Path

# Find the image in your Documents folder
image_path = Path.home() / "OneDrive" / "Documents" / "waste.jpg"

if not image_path.exists():
    image_path = Path.home() / "Documents" / "waste.jpg"

if not image_path.exists():
    print("Image not found. Check where waste.jpg was saved.")
else:
    image_bytes = image_path.read_bytes()

    data = {
        "image_base64": base64.b64encode(
            image_bytes
        ).decode("utf-8"),
        "mime_type": "image/jpeg"
    }

    output_path = Path(__file__).parent / "request.json"
    output_path.write_text(
        json.dumps(data),
        encoding="utf-8"
    )

    print(f"Request saved to: {output_path}")
    print("Now open request.json and copy its JSON.")