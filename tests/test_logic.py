import base64, json
from pathlib import Path
from fastapi.testclient import TestClient
from backend.logic import apply_rules, extract_json, load_rules, sniff_mime

RULES = load_rules(Path(__file__).resolve().parent.parent / "backend" / "rules.json")
GOOD = {"item_name": "plastic bottle", "category": "recyclable", "explanation": "PET bottle", "uncertainty_flag": False}

def test_fenced_json():
    assert extract_json('```json\n{"a":1}\n```') == {"a": 1}
def test_json_with_chatter():
    assert extract_json('Sure! {"a": 2} hope it helps') == {"a": 2}
def test_garbage_is_none():
    assert extract_json("no json here") is None and extract_json("") is None
def test_good_answer_uses_rule_text():
    r = apply_rules(GOOD, RULES)
    assert r["category"] == "recyclable" and r["guidance"] == RULES["categories"]["recyclable"]["guidance"]
def test_uncertain_flag_forces_unsure():
    assert apply_rules({**GOOD, "uncertainty_flag": True}, RULES)["category"] == "unsure"
def test_string_false_is_false():
    assert apply_rules({**GOOD, "uncertainty_flag": "false"}, RULES)["category"] == "recyclable"
def test_unknown_category_forces_unsure():
    assert apply_rules({**GOOD, "category": "plutonium"}, RULES)["category"] == "unsure"
def test_malformed_falls_back():
    r = apply_rules(None, RULES)
    assert r["category"] == "unsure" and r["valid_json"] is False
def test_sniff():
    assert sniff_mime(b"\xff\xd8\xff") == "image/jpeg" and sniff_mime(b"MZ...") is None

def test_endpoint_with_mocked_model(monkeypatch):
    import backend.app as appmod
    async def fake(b64, mime): return json.dumps(GOOD)
    monkeypatch.setattr(appmod, "ask_model", fake)
    c = TestClient(appmod.app)
    jpeg = base64.b64encode(b"\xff\xd8\xff" + b"0" * 50).decode()
    ok = c.post("/api/analyse", json={"image_base64": jpeg})
    assert ok.status_code == 200 and ok.json()["category"] == "recyclable"
    bad = c.post("/api/analyse", json={"image_base64": base64.b64encode(b"hello").decode()})
    assert bad.status_code == 415

def test_gemini_call_includes_schema(monkeypatch):
    import asyncio, httpx
    import backend.app as appmod

    captured_request = {}

    class DummyResponse:
        def raise_for_status(self):
            pass
        def json(self):
            return {
                "candidates": [
                    {"content": {"parts": [{"text": json.dumps(GOOD)}]}}
                ]
            }

    async def fake_post(self, url, headers=None, json=None):
        captured_request["url"] = url
        captured_request["headers"] = headers
        captured_request["json"] = json
        return DummyResponse()

    monkeypatch.setattr(appmod, "PROVIDER", "gemini")
    monkeypatch.setattr(appmod, "API_KEY", "test-key")
    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    result = asyncio.run(appmod.ask_model("b64data", "image/jpeg"))
    assert json.loads(result) == GOOD
    gen_config = captured_request["json"]["generationConfig"]
    assert gen_config["responseMimeType"] == "application/json"
    assert gen_config["responseSchema"] == appmod.RESPONSE_SCHEMA
    assert gen_config["responseSchema"]["type"] == "OBJECT"
    assert set(gen_config["responseSchema"]["required"]) == {"item_name", "category", "explanation", "uncertainty_flag"}

