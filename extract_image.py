import json
import base64
from pathlib import Path

try:
    req_file = Path("request.json")
    if req_file.exists():
        data = json.loads(req_file.read_text(encoding="utf-8"))
        img_data = base64.b64decode(data["image_base64"])
        Path("assets").mkdir(exist_ok=True)
        Path("assets/sample_waste.jpg").write_bytes(img_data)
        print("Saved assets/sample_waste.jpg, size:", len(img_data))
    else:
        print("request.json not found")
except Exception as e:
    print("Error:", e)
