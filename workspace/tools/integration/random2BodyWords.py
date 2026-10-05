#!/usr/bin/env python3
"""Intra-body Random2 word derivation check (no emulator).

Given the gRng2Value at a body's activation edge, the words a Random2 move draws follow from
(non-lag frames from activation through the draw frame, each one RfuMain1 step that runs BEFORE
the frame's callbacks: main.c:171-174 -> link.c:1798) + the source draw order. Checks:
  1. the accepted DOUBLE_KICK fixture words (tools/compare/fixtures/double-kick-player-nidorina-
     opponent-onix.json fistRandom) against rng2-doublekick-receipt.json;
  2. every draw frame in the lab fixture: predicted value after the frame == observed.
usage: random2BodyWords.py [lab-fixture.json]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LAB = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "tools/integration/fixtures/random2/lab-doublekick-astonish-mudslap.json"


def lcg(x: int) -> int:
    return (x * 1103515245 + 24691) & 0xFFFFFFFF


def words(v: int, rfu_steps: int, draws: int) -> list[int]:
    for _ in range(rfu_steps):
        v = lcg(v)
    out = []
    for _ in range(draws):
        v = lcg(v)
        out.append(v >> 16)  # Random2 returns gRng2Value >> 16 (random.c:31-32)
    return out


out = {}
# 1. accepted DOUBLE_KICK words
receipt = json.loads((ROOT / "tools/integration/rng2-doublekick-receipt.json").read_text())
fixture = json.loads((ROOT / "tools/compare/fixtures/double-kick-player-nidorina-opponent-onix.json").read_text())
fr = fixture["fistRandom"]
pinned = [fr["x"], fr["y"], fr["xSign"], fr["ySign"]]
steps = receipt["steps"]
draw_idx = next(i for i, s in enumerate(steps) if s["gRng2Steps"] > 1)
rfu = sum(s["gRng2Steps"] for s in steps[:draw_idx]) + 1  # non-lag frames before + the draw frame's RfuMain1
pred = words(receipt["firstRng2"], rfu, 4)
out["acceptedDoubleKick"] = {"activationRow": steps[0]["from"], "drawFrame": steps[draw_idx]["to"],
                             "rfuStepsBeforeDraws": rfu, "predicted": pred, "pinned": pinned,
                             "exact": pred == pinned}

# 2. lab draw frames
lab = json.loads(LAB.read_text())
n = lab["frames"]
st, val = [0] * (n + 1), [lab["anchorRng2"]] + [0] * n
for r in lab["runs"]:
    for f in range(r["from"], r["to"] + 1):
        st[f] = (r["steps"], r["ctx"])
for f in range(1, n + 1):
    v = val[f - 1]
    for _ in range(st[f][0]):
        v = lcg(v)
    val[f] = v
callers = {a["frame"]: a["callers"] for a in lab["singleSteppedNonTrivial"]}
bodies = []
start = None
for f in range(1, n + 1):
    active = st[f][1][2]
    if active and (f == 1 or not st[f - 1][1][2]):
        start = f
    if f in callers and start:
        cs = callers[f]
        rfu_first = cs[0].startswith("RfuMain1")
        nonlag = sum(1 for g in range(start, f) if st[g][0] > 0)
        # earlier draw waves of the same body (source plan: e.g. 10 per AnimDirtScatter wave)
        prior = sum(len(callers[g]) - 1 for g in callers if start <= g < f)
        pred = words(val[start - 1], nonlag + prior + 1, len(cs) - 1)
        obs_after = val[f]
        v = val[start - 1]
        for _ in range(nonlag + prior + len(cs)):
            v = lcg(v)
        bodies.append({"activation": start, "drawFrame": f, "offset": f - start, "lagBeforeDraw": (f - start) - nonlag, "earlierDraws": prior,
                       "rfuFirst": rfu_first, "drawCallers": sorted(set(c.split("+")[0] for c in cs[1:])),
                       "words": pred, "valueAfterDrawFrameExact": v == obs_after})
out["labDrawFrames"] = bodies
out["allExact"] = out["acceptedDoubleKick"]["exact"] and all(b["valueAfterDrawFrameExact"] and b["rfuFirst"] for b in bodies)
print(json.dumps(out, indent=1))
