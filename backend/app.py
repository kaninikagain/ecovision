"""EcoVision Mini AI backend. Keeps the API key on the server and calls Gemma 4.
Run:  uvicorn backend.app:app --reload      (from the project root)
"""
import base64, binascii, collections, json, os, time
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.logic import apply_rules, extract_json, load_rules, sniff_mime

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

PROVIDER = os.getenv("PROVIDER", "gemini")                     # "gemini" (hosted) or "ollama" (local open weights)
MODEL = os.getenv("MODEL_NAME", "gemini-3-flash-preview")
API_KEY = os.getenv("GEMINI_API_KEY", "")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
MAX_BYTES = int(os.getenv("MAX_IMAGE_MB", "5")) * 1024 * 1024
RATE_PER_MIN = int(os.getenv("RATE_PER_MIN", "20"))
LOG_SCANS = os.getenv("LOG_SCANS", "0") == "1"                 # privacy: off by default; logs NO images
LOG_FILE = ROOT / "data" / "scans.jsonl"
RULES = load_rules(ROOT / "backend" / "rules.json")

PROMPT = """You are a waste-sorting assistant for a college campus.
Look at the photo and answer ONLY with JSON in exactly this format, with no extra text:
{"item_name":"...","category":"recyclable|organic|hazardous|general|unsure","explanation":"one short sentence","uncertainty_flag":true|false}
Use "hazardous" ONLY for batteries, fluorescent/CFL mercury tubes, chargers, and electronics. Use "general" for chip packets, wrappers, tissues, ceramics, porcelain, mugs, and incandescent, halogen, and LED light bulbs.
Incandescent, halogen, and LED bulbs are regular non-hazardous general waste (trash) because they do not contain toxic mercury; do NOT put in glass recycling. Wrap broken bulb pieces safely in paper or cardboard before binning to prevent cuts. Broken ceramics are also strictly non-recyclable general waste.
Rules: if the image is blurry, shows several mixed items, or you are not sure, use category "unsure" and uncertainty_flag true.
Never invent facts. Keep the explanation under 20 words."""

RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "item_name": {"type": "STRING", "description": "Short name of the detected waste item."},
        "category": {
            "type": "STRING",
            "enum": ["recyclable", "organic", "hazardous", "general", "unsure"],
            "description": "Waste category.",
        },
        "explanation": {"type": "STRING", "description": "One short sentence explanation under 20 words."},
        "uncertainty_flag": {
            "type": "BOOLEAN",
            "description": "True if blurry, shows several mixed items, or unsure; false otherwise.",
        },
    },
    "required": ["item_name", "category", "explanation", "uncertainty_flag"],
}

app = FastAPI(title="EcoVision Mini AI", version="1.0.0")
_hits = collections.defaultdict(collections.deque)


class AnalyseIn(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"


def _rate_limit(ip):
    q, now = _hits[ip], time.time()
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= RATE_PER_MIN:
        raise HTTPException(429, "Too many scans. Wait a minute and try again.")
    q.append(now)


async def ask_model(b64, mime):
    async with httpx.AsyncClient(timeout=60) as c:
        if PROVIDER == "ollama":
            r = await c.post(f"{OLLAMA_URL}/api/chat", json={
                "model": MODEL, "stream": False, "format": "json",
                "messages": [{"role": "user", "content": PROMPT, "images": [b64]}]})
            r.raise_for_status()
            return r.json()["message"]["content"]
        if not API_KEY:
            raise HTTPException(500, "Server has no GEMINI_API_KEY. Add it to .env.")
        r = await c.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
            headers={"x-goog-api-key": API_KEY},
            json={
                "contents": [{"parts": [{"text": PROMPT}, {"inline_data": {"mime_type": mime, "data": b64}}]}],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 300,
                    "responseMimeType": "application/json",
                    "responseSchema": RESPONSE_SCHEMA,
                },
            },
        )
        r.raise_for_status()
        cands = r.json().get("candidates") or []
        if not cands:
            return ""                                           # blocked / empty -> treated as unsure
        parts = cands[0].get("content", {}).get("parts", [])
        return "".join(p.get("text", "") for p in parts if not p.get("thought"))


@app.get("/api/health")
def health():
    return {"ok": True, "provider": PROVIDER, "model": MODEL, "key_set": bool(API_KEY) or PROVIDER == "ollama"}


@app.get("/api/rules")
def rules():
    return RULES


@app.post("/api/analyse")
async def analyse(body: AnalyseIn, request: Request):
    _rate_limit(request.client.host if request.client else "?")
    try:
        raw = base64.b64decode(body.image_base64, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(400, "Image data is not valid base64.")
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, f"Image too large (max {MAX_BYTES // 1048576} MB).")
    mime = sniff_mime(raw)
    if not mime:
        raise HTTPException(415, "Only JPEG, PNG or WebP images are accepted.")
    t0 = time.perf_counter()
    try:
        text = await ask_model(body.image_base64, mime)
        obj = extract_json(text)
        if obj is None:                                         # one retry if the JSON was malformed
            obj = extract_json(await ask_model(body.image_base64, mime))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(503, f"AI service unavailable ({type(e).__name__}). Try again.")
    out = apply_rules(obj, RULES)
    out.update(model=MODEL, provider=PROVIDER, latency_ms=int((time.perf_counter() - t0) * 1000))
    if LOG_SCANS:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps({"t": int(time.time()), "category": out["category"],
                                "unsure": out["uncertainty_flag"], "ms": out["latency_ms"]}) + "\n")
    return out


@app.get("/api/stats")
def stats():
    """Counts by category from the team's own test scans (needs LOG_SCANS=1)."""
    counts, n = collections.Counter(), 0
    if LOG_FILE.exists():
        for line in LOG_FILE.read_text(encoding="utf-8").splitlines():
            counts[json.loads(line)["category"]] += 1
            n += 1
    return {"total_scans": n, "by_category": dict(counts), "note": "Test/demo records only."}


app.mount("/", StaticFiles(directory=ROOT / "frontend", html=True), name="frontend")
