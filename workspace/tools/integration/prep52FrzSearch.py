#!/usr/bin/env python3
"""prep52: battle-lab seed search for a landed freeze (Status_Freeze) in the accepted Ice Beam scenarios (docs/next-adapters-prep52.md).

usage: prep52FrzSearch.py <out-dir> [--snorlax]
One run per (orientation, seed 1..20) of tools/integration/prep52NetZeroProbe.py (prep52Probe.run, run "A" only) with 3 more
FIGHT turns; with --snorlax the frozen side's lead is Snorlax (143). Prints the seeds whose run has a Status_Freeze interval. The
chosen seeds are fixed in prep52Probe.UNITS["FRZ"] (12 / 1 Shuckle, 8 / 13 Snorlax), where every job runs twice fresh.
"""
import json, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep52Probe as P

out, snorlax = Path(sys.argv[1]), "--snorlax" in sys.argv
jobs = [(f"{'fz2' if snorlax else 'frz'}-{side}-s{s}", f"mechanic-ice-beam-{side}-delcatty-{'opponent' if side == 'player' else 'player'}-shuckle",
         ("seed", s, "turns", 3) + ((("opponent" if side == "player" else "player"), P.SNORLAX) if snorlax else ()))
        for side in ("player", "opponent") for s in range(1, 21)]
with ThreadPoolExecutor(12) as ex:
    list(ex.map(P.run, [(out, j, "A") for j in jobs]))
for j in jobs:
    d = json.loads((out / "raw" / f"{j[0]}-A.json").read_text())
    frz = [(b["activation"], b["attacker"], b.get("netZero")) for b in d["bodies"] if b["script"] == "Status_Freeze"]
    if frz:
        print(j[0], frz)
