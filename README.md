# EcoVision Mini AI
**See Waste. Sort Smarter. Build a Cleaner Campus.**
Upload a photo of a waste item. **Gemma 4** (open-weights, Apache-2.0) suggests the item and a broad category. An **editable campus rule table** (not the model) supplies the disposal wording. When the photo is unclear, the app says so instead of guessing.

> Status: working prototype. No accuracy figure is claimed until `evaluation/run_eval.py` has been run on real labelled photos.

## Quick start (about 10 minutes)
```bash
git clone https://github.com/<your-org>/ecovision-mini-ai && cd ecovision-mini-ai
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # then paste your key from https://aistudio.google.com
uvicorn backend.app:app --reload
# open http://127.0.0.1:8000/ (do not open frontend/index.html directly; it uses the server's APIs)
pytest                                                 # 10 offline tests
```
No key yet? Tick **Demo options -> Sample mode** in the page (clearly labelled fake results, for design demos only).

## Open-weights / local mode
Hosted: `PROVIDER=gemini`, `MODEL_NAME=gemma-4-31b-it` (Google docs also list `gemma-4-26b-a4b-it`).
Local: install [Ollama](https://ollama.com), pull a Gemma 4 build, set `PROVIDER=ollama` and `MODEL_NAME=<tag>`. Confirm the exact tag in the Ollama library.

## How it works
`photo -> /api/analyse (validate type/size) -> Gemma 4 -> JSON parse (+1 retry) -> rule layer (rules.json) -> result`
- The page connects to `/api/health`, `/api/rules`, and `/api/stats` on load; scan requests use `/api/analyse`. Open the page through the running backend URL so these same-origin API calls work.
- Guidance text always comes from `backend/rules.json`. Unknown category or `uncertainty_flag` gives **unsure**.
- API key stays server-side. Images are not stored. `LOG_SCANS=1` logs only category and timing.
- `skill/ecovision-waste-sorter/` is an agent skill version of the same logic.

## Project layout
`backend/` FastAPI + rule layer | `frontend/index.html` UI | `evaluation/` measurement | `tests/` | `docs/PROJECT_PLAN.md` | `skill/`

## Optional Gemini Multimodal API Configuration
To enable the optional high-accuracy cloud multimodal model:
1. Open [`config.js`](file:///c:/Users/Kaninika%20Gain/Downloads/ecovision-mini-ai/ecovision-mini-ai/config.js).
2. Set `GEMINI_API_KEY: 'YOUR_ACTUAL_KEY_HERE'`.
3. If no key is set, EcoVision runs on-device using TensorFlow.js COCO-SSD and MobileNet without sending any images to external servers.

## Environmental LCA Methodology & Citations
Material carbon offsets and avoided energy metrics in [`data/materials.json`](file:///c:/Users/Kaninika%20Gain/Downloads/ecovision-mini-ai/ecovision-mini-ai/data/materials.json) are based on peer-reviewed Life Cycle Assessment (LCA) benchmarks:
- **Cardboard / OCC**: EPA WARM v15 (0.92 kg CO₂e saved/kg recycled, 1.45 kWh/kg avoided).
- **Aluminum Cans**: The Aluminum Association / EPA (9.13 kg CO₂e saved/kg, 14.20 kWh/kg avoided; 95% energy reduction vs virgin bauxite smelting).
- **PET Plastic Bottles**: Association of Plastic Recyclers (APR) 2020 LCA (1.55 kg CO₂e/kg, 5.60 kWh/kg avoided).
- **Glass Bottles**: Glass Packaging Institute / FEVE LCA (0.31 kg CO₂e/kg, 0.85 kWh/kg avoided).
- **Food & Organic Waste Composting**: Project Drawdown Composting Solutions (0.24 kg CO₂e/kg avoided methane).
- **Smartphone & Small Electronics**: ITU Global E-waste Monitor & Apple Environmental Progress Reports.

## Honest limitations
Rules are campus-specific and must be approved by campus staff. Model output is guidance, not a certified recycling decision. Mixed-material items are hard.

License: MIT. Gemma 4 is released under Apache-2.0 (check Google's model card).

