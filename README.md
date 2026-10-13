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

## Honest limitations
Rules are campus-specific and must be approved by campus staff. Model output is guidance, not a certified recycling decision. Mixed-material items are hard.

License: MIT. Gemma 4 is released under Apache-2.0 (check Google's model card).
