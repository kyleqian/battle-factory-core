#!/usr/bin/env python3
"""cf78 receipt: census delta (base vs final cf78LiveShareCensus.ts shard dirs), audit-19 windows (cf78Audit19Windows.ts jsonl),
audit-19 lends (AUDIT19_LENDS_ONLY over all scenarios, concatenated as audit19Run.sh does), the two parity receipts, gates.
usage: cf78Receipt.py <base-dir> <final-dir> <windows.jsonl> <lends.txt> <parity-950.json> <parity-603.json> <gates.json> <commit> <src-tree> <out.json>
"""
import json, sys
base, final, windows, lends, p950, p603, gates, commit, tree, out = sys.argv[1:11]
load = lambda d: [json.loads(l) for k in range(10) for l in open(f"{d}/s{k}.jsonl") if l.strip()]
b, a = load(base), load(final)
key = lambda r: (r["battle"], r["kind"], r["moveId"], r["side"], r["attacker"], r["target"])
assert len(b) == len(a)
digests = [(json.load(open(f"{base}/s{k}.json"))["battleDigestExcludingFrames"], json.load(open(f"{final}/s{k}.json"))["battleDigestExcludingFrames"]) for k in range(10)]
changes = []
for x, y in zip(b, a):
    if (x["status"], x["liveFrames"]) == (y["status"], y["liveFrames"]):
        continue
    explained = bool(x.get("castformFrames")) and y["liveFrames"] == x["liveFrames"] - x.get("castformLiveFrames", 0) \
        and (y["decline"] or {}).get("reason", "").startswith("CASTFORM")
    changes.append({"battle": x["battle"], "move": x["move"], "moveId": x["moveId"], "side": x["side"], "attacker": x["attacker"],
                    "target": x["target"], "frames": x["frames"], "statusBefore": x["status"], "statusAfter": y["status"],
                    "liveFramesBefore": x["liveFrames"], "liveFramesAfter": y["liveFrames"],
                    "reason": (y["decline"] or {}).get("reason"), "gate": (y["decline"] or {}).get("gate"), "explained": explained})
w = [json.loads(l) for l in open(windows) if l.strip()]
needle = [json.loads(l) for l in open(lends) if '"fixture":"needle-' in l]
committed = {json.loads(l)["fixture"]: l.rstrip("\n") for l in open("tools/integration/fixtures/audit-19/receipts/lends.txt") if l.strip()}
now = {json.loads(l)["fixture"]: l.rstrip("\n") for l in open(lends) if l.strip()}
par = lambda p: {k: v for k, v in json.load(open(p)).items() if k != "bodies"}
receipt = {
    "schema": "cf78-live-receipt/v1",
    "testedCommit": commit, "testedSrcTree": tree, "base": "c68111480 (src d73cf1af)",
    "castformRule": "presentation-only per-slot gBattleMonForms from CASTFORM_CHANGE events (argument & ~0x80); kept across switches / faints; reset at battle start; every live body (liveMoveAnimationPresentation, liveSubstituteSwapView) declines while a displayed CASTFORM has a non-zero slot form",
    "census": {
        "seeds": "0..999 (10 --index-from shards of cf78LiveShareCensus.ts)", "commands": len(a),
        "keySequenceEqual": [key(x) for x in b] == [key(y) for y in a], "framesEqual": all(x["frames"] == y["frames"] for x, y in zip(b, a)),
        "battleDigestExcludingFramesEqual": all(x == y for x, y in digests),
        "liveCommands": [sum(r["status"] == "live" for r in b), sum(r["status"] == "live" for r in a)],
        "liveFrames": [sum(r["liveFrames"] for r in b), sum(r["liveFrames"] for r in a)],
        "totalFrames": sum(r["frames"] for r in a),
        "castformTransformedLiveCommands": [sum(1 for r in b if r.get("castformLiveFrames")), sum(1 for r in a if r.get("castformLiveFrames"))],
        "castformTransformedLiveFrames": [sum(r.get("castformLiveFrames", 0) for r in b), sum(r.get("castformLiveFrames", 0) for r in a)],
        "changes": len(changes), "liveToFallback": sum(c["statusBefore"] == "live" and c["statusAfter"] == "fallback" for c in changes),
        "unexplained": sum(not c["explained"] for c in changes), "changeList": changes,
    },
    "audit19Windows": {
        "windows": len(w), "liveBefore": sum(r["liveBefore"] for r in w), "liveAfter": sum(r["liveAfter"] for r in w),
        "castformWindows": sum(r["fixture"].startswith("cast-") for r in w),
        "castformLiveBefore": sum(r["liveBefore"] for r in w if r["fixture"].startswith("cast-")),
        "castformLiveAfter": sum(r["liveAfter"] for r in w if r["fixture"].startswith("cast-")),
        "gateOnNonCastformWindows": sum(r["gate"] for r in w if not r["fixture"].startswith("cast-")),
    },
    "audit19Lends": {
        "lines": len(now), "byteIdenticalToCommitted": sum(committed[f] == l for f, l in now.items()),
        "changed": sorted(f for f, l in now.items() if committed[f] != l),
        "needleWindows": len(needle), "needleLendEqualsRom": sum(r["lend"] == r["rom"] for r in needle),
    },
    "parity": {"950": par(p950), "603": par(p603)},
    "gates": json.load(open(gates)),
}
json.dump(receipt, open(out, "w"), indent=1)
open(out, "a").write("\n")
print(json.dumps({k: v for k, v in receipt["census"].items() if k != "changeList"}))
print(json.dumps(receipt["audit19Windows"])); print(json.dumps(receipt["audit19Lends"]))
