"""Pure functions (no network) so they can be unit-tested. Rule layer + JSON handling."""
import json
import re

REQUIRED_KEYS = {"item_name", "category", "explanation", "uncertainty_flag"}


def load_rules(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def sniff_mime(raw: bytes):
    """Check real file type from magic bytes, not from what the browser claims."""
    if raw[:2] == b"\xff\xd8":
        return "image/jpeg"
    if raw[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        return "image/webp"
    return None


def extract_json(text):
    """Return a dict from model text, or None. Handles ```json fences and extra prose."""
    if not text:
        return None
    t = re.sub(r"```(?:json)?", "", text).strip()
    try:
        obj = json.loads(t)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", t, re.S)
        if not m:
            return None
        try:
            obj = json.loads(m.group(0))
        except json.JSONDecodeError:
            return None
    return obj if isinstance(obj, dict) else None


def _as_bool(v):
    return v.strip().lower() == "true" if isinstance(v, str) else bool(v)


def apply_rules(model_obj, rules):
    """Turn the model's answer into advice. Guidance ALWAYS comes from rules.json, never from the model."""
    cats = rules["categories"]
    valid = isinstance(model_obj, dict) and REQUIRED_KEYS <= set(model_obj)
    if valid:
        model_cat = str(model_obj["category"]).strip().lower()
        flag = _as_bool(model_obj["uncertainty_flag"])
        item = str(model_obj["item_name"])[:80]
        why = str(model_obj["explanation"])[:200]
    else:
        model_cat, flag, item, why = None, True, "Could not read the answer", "The AI reply was not in the expected format."
    final = model_cat if (valid and model_cat in cats and not flag) else "unsure"
    return {
        "item_name": item,
        "category": final,
        "model_category": model_cat,        # kept so the evaluation can compare raw model output
        "bin_name": cats[final]["bin_name"],
        "guidance": cats[final]["guidance"],
        "caution": cats[final]["caution"],
        "explanation": why,
        "uncertainty_flag": final == "unsure",
        "valid_json": valid,
    }
