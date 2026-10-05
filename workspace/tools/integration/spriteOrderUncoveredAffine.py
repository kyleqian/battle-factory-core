#!/usr/bin/env python3
"""Affine-matrix bitmap + task table around each uncovered sprite-order unit (docs/sprite-order-uncovered-units.md section 3).

usage: spriteOrderUncoveredAffine.py [--write]
Inputs: fixtures/sprite-order-uncovered/affine-raw/<name>.json (spriteOrderUncoveredAffineProbe.py output, per-frame gOamMatrixAllocBitmap / sprite matrixNum /
gTasks) and fixtures/sprite-order-uncovered/units.json (unit windows, spriteOrderUncoveredExtract.py).  For every non-entry unit it records the state just
before the unit, just after its last allocator call (+3 frames) and at the settle point (the next unit's start - 1, at most 220 frames after the unit), and a
per-class verdict: whether the pre-unit baseline (bitmap 0x6 = player battler matrix 1, opponent matrix 2) is restored.
"""
from __future__ import annotations
import collections, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FX = ROOT / "tools/integration/fixtures/sprite-order-uncovered"
NAMES = {"battle1-turn17-dense": "turn17", "battle1-switch": "switch", "lab:forced-switch-player-choice": "forced-switch-player-choice",
         "lab:forced-switch-ai-choice": "forced-switch-ai-choice", "lab:hit-chain-ko": "hit-chain-ko", "lab:issue135-pursuit-switch-intercept": "issue135-pursuit-switch-intercept",
         "lab:endturn-toxic-ko": "endturn-toxic-ko"}


def state_at(rows, n):
    last = None
    for r in rows:
        if r["n"] <= n:
            last = r
        else:
            break
    return last


def brief(r):
    if r is None:
        return None
    return {"n": r["n"], "bitmap": r["bitmap"], "matrices": {k: v for k, v in sorted(r["mats"].items(), key=lambda kv: int(kv[0]))},
            "tasks": [[t[0], t[1].split("+")[0]] for t in r["tasks"]]}


def main():
    units = json.loads((FX / "units.json").read_text())["units"]
    out, byclass = [], collections.defaultdict(list)
    for tr, fname in NAMES.items():
        rows = json.loads((FX / "affine-raw" / f"{fname}.json").read_text())["rows"]
        mine = sorted((u for u in units if u["trace"] == tr and u["first"] > rows[0]["n"]), key=lambda u: u["first"])
        for i, u in enumerate(mine):
            if u["class"][0] == "E" or u["class"].startswith("other"):
                continue
            nxt = mine[i + 1]["first"] - 1 if i + 1 < len(mine) else u["last"] + 220
            pre, post, settle = state_at(rows, u["first"] - 1), state_at(rows, u["last"] + 3), state_at(rows, min(nxt, u["last"] + 220))
            rec = {"trace": tr, "class": u["class"], "first": u["first"], "last": u["last"], "pre": brief(pre), "post": brief(post), "settle": brief(settle)}
            out.append(rec)
            byclass[u["class"]].append(rec)
    summary = {}
    for k, recs in sorted(byclass.items()):
        sig = collections.Counter(json.dumps([(r["pre"]["bitmap"], r["settle"]["bitmap"]) for r in [r]]) for r in recs)
        summary[k] = {"instances": len(recs), "bitmapPreToSettle": {json.loads(s)[0][0] + "->" + json.loads(s)[0][1]: c for s, c in sig.items()},
                      "settleTasks": sorted({json.dumps([t[1] for t in r["settle"]["tasks"]]) for r in recs})}
    for k, v in summary.items():
        print(k, v)
    if "--write" in sys.argv:
        (FX / "affine-units.json").write_text(json.dumps({"schema": "sprite-order-uncovered-affine/v1", "summary": summary, "units": out}, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    main()
