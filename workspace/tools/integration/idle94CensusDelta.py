#!/usr/bin/env python3
"""idle94: census delta of the lead-rows patch (liveShareCensus.ts seeds 0..999, ten --index-from shards per tree).

usage: idle94CensusDelta.py <base-shard-dir> <patched-shard-dir> <patch.diff> <out.json>
Checks: the command KEY sequence (battle, kind, moveId, side, attacker, target) is identical; every shard's battleDigestExcludingFrames is
identical; no status change (live / partial / fallback); per command, frames(patched) - frames(base) == N(move) for a command of a lead
move whose adapter duration is defined (N parsed from the patch's LIVE_MOVE_IDLE_LEAD_ROWS; this includes presentation-stage fallbacks,
which present the field for the adapter's duration) and 0 for every other command (a Substitute swap composite keeps 0: reported
separately). commandsMovedByN / framesAdded / perMoveSide count the moved commands, live or not (`liveMoved` = the live ones).
"""
import collections, json, re, sys

bdir, pdir, diff, out = sys.argv[1:5]
lead = {int(a): int(b) for a, b in re.findall(r"\[(\d+), (\d+)\]", "".join(l[1:] for l in open(diff) if l.startswith("+") and "], [" in l))}
key = lambda c: (c["battle"], c["kind"], c.get("moveId"), c["side"], c["attacker"], c["target"])
load = lambda d: [json.loads(l) for k in range(10) for l in open(f"{d}/r{k}.jsonl") if l.strip()]
B, P = load(bdir), load(pdir)
dig = lambda d: [json.load(open(f"{d}/r{k}.json"))["battleDigestExcludingFrames"] for k in range(10)]
res = {"leadMoves": len(lead), "commands": [len(B), len(P)], "keySequenceIdentical": [key(c) for c in B] == [key(c) for c in P],
       "battleDigestExcludingFramesIdentical": dig(bdir) == dig(pdir)}
status = collections.Counter((b["status"], p["status"]) for b, p in zip(B, P) if b["status"] != p["status"])
res["statusChanges"] = {f"{a}->{b}": n for (a, b), n in status.items()}
bad, per_move, swaps, live_moved = [], collections.defaultdict(lambda: [0, 0, 0]), 0, 0
for b, p in zip(B, P):
    d = p["frames"] - b["frames"]
    n = lead.get(b.get("moveId"), 0) if b["kind"] == "move" and b.get("duration") is not None else 0
    if n and b.get("swapFrames", 0) > 0:
        swaps += 1
        n = 0
    if d != n:
        bad.append({"base": b, "patched": p, "expected": n})
    if n:
        m = per_move[f'{b["moveId"]} {b["move"]} {b["side"]}']
        m[0] += 1; m[1] += d; m[2] = n
        live_moved += b["status"] == "live"
res["frameDeltaMismatches"] = len(bad)
res["mismatchSamples"] = bad[:5]
res["substituteSwapLeadCommandsKept0"] = swaps
res["commandsMovedByN"] = sum(v[0] for v in per_move.values())
res["liveMoved"] = live_moved
res["framesAdded"] = sum(v[1] for v in per_move.values())
res["totalFrames"] = [sum(c["frames"] for c in B), sum(c["frames"] for c in P)]
res["liveFrames"] = [sum(c["liveFrames"] for c in B), sum(c["liveFrames"] for c in P)]
res["live"] = [sum(c["status"] == "live" for c in B), sum(c["status"] == "live" for c in P)]
res["perMoveSide"] = {k: {"commands": v[0], "framesAdded": v[1], "N": v[2]} for k, v in sorted(per_move.items())}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k: v for k, v in res.items() if k not in ("perMoveSide", "mismatchSamples")}))
