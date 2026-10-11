#!/usr/bin/env python3
"""flat84: Tier-1 test vectors for a fold (docs/next-adapters-flat84.md FOLD INSTRUCTIONS): one row per Flatter 260 body of the flat84
probes (flat77Probe.py output): the ROM activation free order (`at.spriteOrder` without the known-entry occupied slots, in order), the RAM
gRng2Value of the activation (the presentation host pin), the RAM species of both battlers, the attacker side, and the ROM post-body free
order (`endOrder` without the occupied slots). A fold's test feeds the first four to liveFlatterWordsPostFree (host pinned at rng2 and
activated for the body's request, as flat84Plan.ts does) and asserts the fifth.
usage: flat84Vectors.py <probe-r1-dir> <out.json>
"""
import json, sys
from pathlib import Path

OCCUPIED = {0, 1, 2, 6, 8, 60, 61, 62, 63}
src, out = Path(sys.argv[1]), Path(sys.argv[2])
rows = []
for p in sorted(src.glob("*.json")):
    k = 0
    for b in json.loads(p.read_text())["bodies"]:
        if b["label"] != "Move_FLATTER":
            continue
        free = lambda order: [s for s in order if s not in OCCUPIED]
        rows.append({"scenario": p.stem, "flatter": k, "startFrame": b["startFrame"], "attackerSide": "player" if b["attacker"] == 0 else "opponent",
                     "rng2": b["at"]["rng2"], "bodySpecies": {"player": b["at"]["battlers"][0]["species"], "opponent": b["at"]["battlers"][1]["species"]},
                     "activationFree": free(b["at"]["spriteOrder"]), "romPostFree": free(b["endOrder"])})
        k += 1
out.write_text(json.dumps({"schema": "flat84-flatter-vectors/v1", "occupied": sorted(OCCUPIED), "bodies": rows}, separators=(",", ":")) + "\n")
print(len(rows), "Flatter bodies")
