"""Measure what the prototype REALLY does. Usage (server running):
    python evaluation/run_eval.py
Put photos in evaluation/images/ and list them in evaluation/labels.csv (see labels_template.csv).
Writes evaluation/results.csv and evaluation/summary.md. Report these numbers honestly, failures included."""
import base64, csv, statistics, sys, time
from collections import defaultdict
from pathlib import Path
import httpx

HERE = Path(__file__).parent
URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000/api/analyse"
rows = list(csv.DictReader(open(HERE / "labels.csv", encoding="utf-8")))
res, lat = [], []
for r in rows:
    b64 = base64.b64encode((HERE / "images" / r["filename"]).read_bytes()).decode()
    t0 = time.perf_counter()
    try:
        d = httpx.post(URL, json={"image_base64": b64}, timeout=90).json()
        ms = int((time.perf_counter() - t0) * 1000)
        d.update(error="")
    except Exception as e:
        d, ms = {"category": "error", "uncertainty_flag": True, "valid_json": False, "error": str(e)}, 0
    res.append({**r, "predicted": d.get("category"), "model_category": d.get("model_category"),
                "unsure": d.get("uncertainty_flag"), "valid_json": d.get("valid_json"), "ms": ms, "error": d.get("error")})
    if ms:
        lat.append(ms)
    time.sleep(3.1)                                    # stay under the server's 20 requests/min limit

with open(HERE / "results.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(res[0].keys())); w.writeheader(); w.writerows(res)

n = len(res)
ok = sum(1 for x in res if x["predicted"] == x["expected_category"])
confident = [x for x in res if not x["unsure"]]
conf_ok = sum(1 for x in confident if x["predicted"] == x["expected_category"])
by = defaultdict(lambda: [0, 0])
for x in res:
    by[x["difficulty"]][1] += 1
    by[x["difficulty"]][0] += x["predicted"] == x["expected_category"]
lines = [f"# Evaluation summary ({n} labelled images)", "",
 f"- Category accuracy (final, after fallback): {ok}/{n} = {100*ok/n:.1f}%",
 f"- Accuracy when confident: {conf_ok}/{len(confident)}" + (f" = {100*conf_ok/len(confident):.1f}%" if confident else ""),
 f"- Fallback ('unsure') rate: {n-len(confident)}/{n} = {100*(n-len(confident))/n:.1f}%",
 f"- Valid JSON from model: {sum(1 for x in res if x['valid_json'])}/{n}",
 f"- Latency: median {statistics.median(lat) if lat else 'n/a'} ms, max {max(lat) if lat else 'n/a'} ms (record model + hardware/host here)", "",
 "| Difficulty | Correct | Total |", "|---|---|---|"] + [f"| {k} | {v[0]} | {v[1]} |" for k, v in by.items()]
(HERE / "summary.md").write_text("\n".join(lines), encoding="utf-8")
print("\n".join(lines))
