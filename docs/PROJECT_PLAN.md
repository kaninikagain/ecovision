# EcoVision Mini AI - Full Project Plan

## 1. Goal and challenge fit
Build one stable flow: **photo -> Gemma 4 -> category -> campus guidance -> uncertainty fallback**.
| Challenge (from the hackathon page) | How we satisfy it | Still to do |
|---|---|---|
| Best Use of Gemma 4 | Multimodal image+text input via Gemini API (`gemma-4-31b-it`), structured JSON output, uncertainty path, optional local run | Record a real measured eval |
| Best Open-Source AI Project | Public GitHub repo, MIT license, open-weight model is core, optional Ollama mode, agent skill in `skill/` | Make repo public; verify skill against the Agent Skill Open Standard |
**Check the official rules for**: deadline, whether one project may enter both challenges, required submission format (video? form? repo link?), judging criteria. The official template always overrides this plan.

## 2. Scope
**Must:** upload+preview, Gemma 4 call, rule mapping, uncertainty fallback, result screen with limitation note, tests, README.
**Should:** evaluation numbers (30-50 images), demo video, deployed link.
**Could:** stats endpoint view (`/api/stats`), Ollama run, smart-bin diagram, multilingual guidance.
**Won't:** fine-tuning, accounts, hardware, claims of real-world impact.

## 3. Architecture and API contract
`POST /api/analyse` body `{image_base64, mime_type}` ->
```json
{"item_name":"plastic bottle","category":"recyclable","model_category":"recyclable","bin_name":"Recycling bin",
 "guidance":"...from rules.json...","caution":"...","explanation":"...","uncertainty_flag":false,
 "valid_json":true,"model":"gemma-4-31b-it","provider":"gemini","latency_ms":2100}
```
Errors: 400 bad base64, 413 too big (5 MB), 415 not JPEG/PNG/WebP, 429 rate limit, 503 AI unavailable. Also `GET /api/health`, `/api/rules`, `/api/stats`.
Design decisions: key server-side; magic-byte file check; one retry on malformed JSON; low-temperature (0.2); rules never come from the model; no image storage.

## 4. Seven-day schedule (shift to the real deadline)
| Day | Goal | Done when |
|---|---|---|
| 1 | Repo created, everyone runs `pytest` and the server; key obtained; **verify model ID** on `/api/health` | Each member has a working local copy |
| 2 | One real photo returns a real Gemma 4 answer (Kaninika). Rule table drafted (Trisha). Collect photos | Result card shows live (non-sample) output |
| 3 | Prompt tuning on 10 photos; fix failures; campus rules approved | Valid JSON on nearly all runs |
| 4 | Full 30-50 image evaluation; log in `labels.csv`; run `run_eval.py` | `summary.md` produced |
| 5 | Deploy (Render/Railway/Hugging Face Spaces: set `GEMINI_API_KEY` as a secret); phone test | Public URL works on a phone |
| 6 | Demo video (60-90 s), screenshots, README polish, concept diagram (Rimi) | Video recorded, repo clean |
| 7 | Buffer, final review, submit early | Checklist (section 9) all ticked |

## 5. Who does what
- **Kaninika (AI/integration):** get key, confirm model ID, tune `PROMPT` in `backend/app.py`, fix API errors, optional Ollama test.
- **Trisha (data/testing):** write approved rules in `backend/rules.json`, collect photos, fill `evaluation/labels.csv`, run eval, write results into README.
- **Rimi (electronics concept):** one block diagram (camera -> Raspberry-Pi-class board -> same API -> LED/servo flap), labelled **future work**. Do not claim it is built.
- **Bidisha (lead):** repo and branches, UI polish in `frontend/index.html`, deployment, demo script/video, submission, final review.
Git flow: `main` stays working; each person works on `feature/<name>`; open pull requests; Bidisha merges.

## 6. Photo and labelling guide
30-50 photos you took yourselves (no faces, IDs, private info). Mix: ~15 clean single items, ~10 other categories incl. e-waste, ~8 mixed-material (composite cups, multilayer pouches), ~7 hard (clutter, dim light, partially hidden). `difficulty` values: `single_clean`, `mixed_material`, `multi_item`, `poor_quality`. Decide the expected label BEFORE running the model. Items with no clear answer are expected `unsure`.

## 7. Evaluation and honest reporting
Run `python evaluation/run_eval.py`. Report accuracy, accuracy-when-confident, fallback rate, valid-JSON rate, median latency (with model + host), per-difficulty results, and list the failures. Never show sample-mode output as AI output.

## 8. Demo script (60-90 s)
1. (10 s) Problem: "Which bin does this go in? Rules differ by campus."
2. (30 s) Upload a prepared photo -> real Gemma 4 result -> point to rule wording coming from the editable table.
3. (20 s) Upload a mixed-material item -> app says **Check first** instead of guessing.
4. (15 s) Show `rules.json` edit and the evaluation summary. Close with limitations and the roadmap.

## 9. Submission checklist
- [ ] Repo public, MIT license present, no `.env` or key in history (rotate the key if it ever leaked)
- [ ] README quick start tested on a clean machine
- [ ] `pytest` passes; `summary.md` real numbers included
- [ ] Rules approved by campus staff (or clearly labelled as draft)
- [ ] Demo video + live link (if required); official format and page limits followed
- [ ] Agent skill checked against the Agent Skill Open Standard (if entering that way)
- [ ] Nothing in the write-up that you cannot demonstrate

## 10. Risks
| Risk | Response |
|---|---|
| Model ID/access/quota problem | Check `/api/health` on day 1; try `gemma-4-26b-a4b-it`; Ollama fallback; screen recording backup |
| Slow responses | Resize images (UI already caps at 1024 px); smaller model |
| Wrong category | Uncertainty rule, test varied photos, human-check wording |
| Key leak | Server-side `.env`, `.gitignore`, deploy secrets only |
| Scope creep | Freeze features on day 5 |
