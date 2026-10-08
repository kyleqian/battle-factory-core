#!/usr/bin/env python3
"""S10A Substitute fade live receipt: two fadeLiveRun.sh passes (same fresh probe dir) -> tools/integration/fixtures/fade-live-receipt.json.

usage: python3 tools/integration/fadeLiveReceipt.py <REC1> <REC2> <out.json> <code commit> <src tree>
Both passes must be byte-identical (checker + negatives + probe digest); the receipt keeps both passes' results.
"""
import json, sys, hashlib, pathlib

rec1, rec2, out, commit, tree = sys.argv[1:6]
names = ["probes.json", "fade-live-check.json", "fade-neg-age+1.json", "fade-neg-no-fade.json", "fade-neg-no-x2.json"]
identical = {}
for n in names:
    a, b = (pathlib.Path(rec1) / n).read_bytes(), (pathlib.Path(rec2) / n).read_bytes()
    identical[n] = {"identical": a == b, "sha256": hashlib.sha256(a).hexdigest()[:16]}
    if a != b:
        sys.exit(f"pass mismatch: {n}")
passes = [json.loads((pathlib.Path(r) / "fade-live-check.json").read_text()) for r in (rec1, rec2)]
neg = {}
for n in ["age+1", "no-fade", "no-x2"]:
    d = json.loads((pathlib.Path(rec1) / f"fade-neg-{n}.json").read_text())
    neg[n] = {"failingWindows": sum(1 for r in d["results"] if r["verdict"].startswith("FAIL")), "windows": len(d["results"])}
results = passes[0]["results"]
receipt = {
    "schema": "fade-live-receipt/v1",
    "codeCommit": commit, "srcTree": tree,
    "method": "fresh direct-mGBA prep39 probes (prep39Probes.sh: every scenario twice from fresh processes, json + rgb cmp'd), "
              "then tools/integration/fadeLiveCheck.ts twice (production createBattleResolutionPresentationRenderView + "
              "renderBattleResolutionLiveView, every row of every fade window: script rows + first inactive row + 2-row OAM tail)",
    "claim": "pixels outside the wait-cursor footprint (the queue presents STRINGID_SUBSTITUTEDMG as an automatic message: the ROM's "
             "frozen cursor is the message host's, reported as cursorBoxPx)",
    "summary": {
        "windows": len(results), "rows": sum(r["rows"] for r in results),
        "policyExact": sum(1 for r in results if r["verdict"] == "policy-exact"),
        "alternatePhaseDocumented": sum(1 for r in results if r["verdict"] == "alternate-phase-documented"),
        "failed": sum(1 for r in results if r["verdict"].startswith("FAIL")),
        "outsideCursorPx": sum(r["totalPx"] for r in results), "cursorBoxPx": sum(r["cursorBoxPx"] for r in results),
        "sceneOff": [{"window": r["window"], "totalPx": r["totalPx"]} for r in results if r["profile"] == "battle-scene-off"],
    },
    "passesByteIdentical": identical,
    "negatives": neg,
    "passes": [{"results": p["results"]} for p in passes],
}
pathlib.Path(out).write_text(json.dumps(receipt, indent=1) + "\n")
print(f"wrote {out}: {receipt['summary']}")
