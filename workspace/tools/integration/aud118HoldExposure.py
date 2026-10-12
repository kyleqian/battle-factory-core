#!/usr/bin/env python3
"""aud118 (docs/aud118-live-audit-26.md): census exposure of the Scene ON no-effect attackanimation hold (the banked patch
aud118-on-noeffect-attackanimation-hold.diff). Input: off108Route.ts --scene=on seeds 0..999 (ten shards) on the base 396308f86 and on the
patched copy. Every use is matched by (seed, line order); it is exposed when its opener (STRINGID_USEDMOVE) command's holdFrames differ.
Reports the exposed uses by move and first message, the frames added, and that nothing else in any use's commands changed.
usage: aud118HoldExposure.py <base-route-dir> <patched-route-dir>"""
import collections, glob, json, os, sys


def load(d):
    return [json.loads(l) for f in sorted(glob.glob(os.path.join(d, "on-*.jsonl")), key=lambda p: int(p.rsplit("-", 1)[1].split(".")[0]))
            for l in open(f) if l.strip()]


base, patched = load(sys.argv[1]), load(sys.argv[2])
by_move, frames, other = collections.Counter(), 0, 0
seeds = set()
for b, p in zip(base, patched):
    assert (b["seed"], b["move"], b["attacker"]) == (p["seed"], p["move"], p["attacker"]), (b["seed"], p["seed"])
    if b["commands"] == p["commands"]:
        continue
    hb, hp = (b["commands"][0][3] or 0), (p["commands"][0][3] or 0)
    if b["commands"][1:] != p["commands"][1:] or b["commands"][0][:3] != p["commands"][0][:3]:
        other += 1
        continue
    msg = next((x[2] for x in b["follow"] if x[1] == "message"), None)
    by_move[f"{b['move']}:{msg}"] += 1
    frames += hp - hb
    seeds.add(b["seed"])
print(json.dumps({"uses": [len(base), len(patched)], "exposedUses": sum(by_move.values()), "battles": len(seeds), "framesAdded": frames,
                  "otherCommandChanges": other, "byMoveAndFirstMessage": dict(sorted(by_move.items()))}, indent=1, sort_keys=True))
