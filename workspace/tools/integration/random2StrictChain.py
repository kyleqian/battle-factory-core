#!/usr/bin/env python3
"""Strict-chain gRng2Value tracker evaluation over random2RouteProbe.py fixtures (no emulator).

Consumption model (docs/random2-trackability.md §2): every frame advances gRng2Value by
  rfu(f) + draws(f)
where rfu(f) = 1 unless f is a lag frame (no AgbMain iteration => no RfuMain1 -> Random2,
link_rfu_2.c:2023) and draws(f) are the explicit animation Random2() calls (source draw plans,
docs/visual-randomness-prep.md §2). A tracker needs, per presentation unit, its frame length
(production knows it) + its lag-frame count + its draw count.

Units: maximal runs of the probe's frame context. An animation unit starts at a
gAnimScriptActive 0->1 frame and is keyed by the script label at activation; a non-animation
unit is keyed by (gMain.callback2, gBattleMainFunc). The lag-count table maps kind -> count;
a kind whose occurrences disagree is "unstable" and never modelled.

Strict chain: seed once (anchor / battle-entry value), walk units in order, never re-seed;
the tracker becomes INVALID at the first unit whose kind is absent/unstable in the table and
stays invalid. At every move-body activation edge report known / exact / mismatch.

usage: random2StrictChain.py <test-fixture.json> [--train <fixture.json> ...] [--json OUT]
       (no --train = in-sample table from the test fixture itself)
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("test")
ap.add_argument("--train", action="append", default=[])
ap.add_argument("--json")
ap.add_argument("--merge-gaps", action="store_true", help="event-signature units (see merge_gaps)")
ap.add_argument("--seed-frame", type=int, default=0,
                help="seed at the value observed after this frame (0 = probe anchor)")
args = ap.parse_args()

# Explicit Random2() draws per animation script (visual-randomness-prep §2; route/lab
# single-step attribution confirms DOUBLE_KICK 4/body, ASTONISH 4, SAND_ATTACK/MUD_SLAP 60).
DRAWS = {"Move_DOUBLE_KICK": 4, "Move_ASTONISH": 4, "Move_MUD_SLAP": 60, "Move_SAND_ATTACK": 60,
         "Move_THRASH": 12, "Move_FLAIL": 2, "Move_LUSTER_PURGE": 12}


def lcg(x: int) -> int:
    return (x * 1103515245 + 24691) & 0xFFFFFFFF


def lcg_n(x: int, n: int) -> int:
    # jump-ahead by squaring the affine map (a, c)
    a, c, ra, rc = 1103515245, 24691, 1, 0
    while n:
        if n & 1:
            ra, rc = (ra * a) & 0xFFFFFFFF, (rc * a + c) & 0xFFFFFFFF
        a, c = (a * a) & 0xFFFFFFFF, (c * a + c) & 0xFFFFFFFF
        n >>= 1
    return (ra * x + rc) & 0xFFFFFFFF


def base(label: str) -> str:
    return label.split("+")[0]


def load(path: str):
    d = json.loads(Path(path).read_text())
    n = d["frames"]
    steps, ctx, val = [0] * (n + 1), [None] * (n + 1), [0] * (n + 1)
    val[0] = d["anchorRng2"]
    for r in d["runs"]:
        for f in range(r["from"], r["to"] + 1):
            steps[f], ctx[f] = r["steps"], tuple(r["ctx"])
        val[r["to"]] = r["endValue"]
    # reconstruct per-frame values (runs store only the end value)
    for f in range(1, n + 1):
        val[f] = lcg_n(val[f - 1], steps[f])
    assert val[n] == d["finalRng2"], "fixture reconstruction failed"
    units = []
    for f in range(1, n + 1):
        cb2, bmf, active, label, ctrl = (ctx[f] + ("-",))[:5]
        prev = (ctx[f - 1] + ("-",))[:5] if f > 1 else None
        if active:
            new = not (prev and prev[2])
            kind = ("anim", base(label)) if new else None
        else:
            kind = ("state", base(cb2), base(bmf), base(ctrl))
            new = not (prev and not prev[2] and (base(prev[0]), base(prev[1]), base(prev[4])) == kind[1:])
        if new:
            units.append({"kind": kind, "start": f, "frames": 0, "lag": 0, "steps": 0})
        u = units[-1]
        if active:  # key animation units by activation label + final label (branching scripts, e.g. Fly turns)
            u["kind"] = ("anim", u["kind"][1].split(">")[0] + ">" + base(label))
        u["frames"] += 1
        u["steps"] += steps[f]
        u["lag"] += steps[f] == 0
    for u in units:
        u["draws"] = u["steps"] - (u["frames"] - u["lag"])
    if args.merge_gaps:
        units = merge_gaps(units)
    return d, val, units


def merge_gaps(units):
    """Event-signature units: an animation body is keyed by (activation label, body length in
    frames) -- both known to production; the non-animation frames between two bodies are one
    unit keyed by the de-duplicated sequence of (callback2, battleMainFunc, controller) states
    it visits (lag frames straddle those ROM-state boundaries by a frame, so they are not
    separable units)."""
    out = []
    for u in units:
        if u["kind"][0] == "anim":
            v = dict(u)
            v["kind"] = ("anim", u["kind"][1].split(">")[0] + f"#{u['frames']}")
            out.append(v)
            continue
        sig = "/".join(u["kind"][1:])
        if out and out[-1]["kind"][0] == "gap":
            g = out[-1]
            if g["sig"][-1] != sig:
                g["sig"].append(sig)
            for k in ("frames", "lag", "steps", "draws"):
                g[k] += u[k]
        else:
            out.append({"kind": ("gap",), "sig": [sig], "start": u["start"], "frames": u["frames"],
                        "lag": u["lag"], "steps": u["steps"], "draws": u["draws"]})
    for g in out:
        if g["kind"][0] == "gap":
            g["kind"] = ("gap", " > ".join(g.pop("sig")))
    return out


def table_from(unit_lists):
    seen: dict = {}
    for units in unit_lists:
        for u in units:
            seen.setdefault(u["kind"], set()).add(u["lag"])
    return {k: (next(iter(v)) if len(v) == 1 else None) for k, v in seen.items()}


test_d, test_val, test_units = load(args.test)
train_units = [load(p)[2] for p in args.train] if args.train else [test_units]
table = table_from(train_units)

# seed at the first unit boundary at/after --seed-frame (a tracker seeds at a unit edge)
seed_frame = 0 if args.seed_frame == 0 else next(u["start"] - 1 for u in test_units if u["start"] > args.seed_frame)
state = test_val[seed_frame]
known = True
edges = []
invalid_at = None
for u in test_units:
    if u["start"] <= seed_frame:
        continue
    if u["kind"][0] == "anim":
        edge = {"frame": u["start"], "kind": u["kind"][1].split(">")[0].split("#")[0], "observed": test_val[u["start"] - 1]}
        edge["known"] = known
        if known:
            edge["predicted"] = state
            edge["exact"] = state == edge["observed"]
        edges.append(edge)
    lag = table.get(u["kind"])
    if known and lag is None:
        known, invalid_at = False, {"frame": u["start"], "kind": list(u["kind"]),
                                    "reason": "unstable" if u["kind"] in table else "unmodelled"}
    if known:
        draws = DRAWS.get(u["kind"][1].split(">")[0].split("#")[0], 0) if u["kind"][0] == "anim" else 0
        state = lcg_n(state, u["frames"] - lag + draws)

kinds = {}
for units in ([test_units] + ([] if not args.train else train_units)):
    for u in units:
        kinds.setdefault(" ".join(u["kind"][1:]), set()).add(u["lag"])
move_edges = [e for e in edges if e["kind"].startswith("Move_")]
result = {
    "test": args.test,
    "train": args.train or ["<in-sample>"],
    "seedFrame": seed_frame,
    "seedValue": test_val[seed_frame],
    "units": len(test_units),
    "lagFrames": sum(u["lag"] for u in test_units),
    "explicitDraws": sum(u["draws"] for u in test_units),
    "drawsMatchPlanTable": all(u["draws"] == (DRAWS.get(u["kind"][1].split(">")[0].split("#")[0], 0) if u["kind"][0] == "anim" else 0)
                               for u in test_units),
    "unstableKinds": sorted(k for k, v in kinds.items() if len(v) > 1),
    "invalidatedAt": invalid_at,
    "edges": {"all": len(edges), "known": sum(e["known"] for e in edges),
              "exact": sum(bool(e.get("exact")) for e in edges),
              "mismatch": sum(e["known"] and not e["exact"] for e in edges)},
    "moveBodyEdges": {"all": len(move_edges), "known": sum(e["known"] for e in move_edges),
                      "exact": sum(bool(e.get("exact")) for e in move_edges),
                      "mismatch": sum(e["known"] and not e["exact"] for e in move_edges)},
    "edgeList": edges,
    "lagTable": {" ".join(k[1:]) + f" [{k[0]}]": v for k, v in sorted(table.items(), key=str)},
}
text = json.dumps(result, indent=1)
if args.json:
    Path(args.json).write_text(text + "\n")
print(json.dumps({k: v for k, v in result.items() if k not in ("edgeList", "lagTable")}, indent=1))
