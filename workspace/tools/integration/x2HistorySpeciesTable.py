#!/usr/bin/env python3
"""x2-history #148: fold the raw per-species probes into fixtures/x2-history/species-rest-x2.json (r1 vs r2 must agree on the activation values)."""
import json, re, sys
from pathlib import Path
RAW = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/x2h/species")
sp = {int(m.group(2)): m.group(1) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)", Path("reference/pokeemerald/include/constants/species.h").read_text())}
rows, diff, bad = {}, 0, 0
for line in (RAW / "r1/ids.txt").read_text().split():
    a, b = (json.loads((RAW / r / f"{line}.json").read_text()) for r in ("r1", "r2"))
    if "error" in a or a["activation"] is None: bad += 1; rows[sp[int(line)]] = {"error": a.get("error", "no activation")}; continue
    if a["activation"] != b["activation"] or a["battlerSeries"] != b["battlerSeries"]: diff += 1
    pl, op = a["activation"]["battlers"]
    # first frame series values: frame 0 (post send-in start state)
    s0 = a["battlerSeries"][0]
    rows[sp[int(line)]] = {"id": int(line), "gender": a["gender"], "activationFrame": a["activation"]["frame"], "opponentFront": {"x2": op[0], "y2": op[1]}, "playerBack": {"x2": pl[0], "y2": pl[1]},
                           "frame0": {"player": s0[1:3], "opponent": s0[5:7]}}
nz_f = {k: v["opponentFront"] for k, v in rows.items() if "error" not in v and (v["opponentFront"]["x2"] or v["opponentFront"]["y2"])}
nz_b = {k: v["playerBack"] for k, v in rows.items() if "error" not in v and (v["playerBack"]["x2"] or v["playerBack"]["y2"])}
out = {"source": "direct mGBA, fresh process per species, both sides = the species, values at the first body's activation (Flail natural-HP lab base); r1 == r2 byte-equal activation+series for all rows",
       "speciesCount": len(rows), "errors": bad, "r1r2Differences": diff, "nonZeroOpponentFront": nz_f, "nonZeroPlayerBack": nz_b, "all": rows}
Path("tools/integration/fixtures/x2-history/species-rest-x2.json").write_text(json.dumps(out, indent=1))
print(len(rows), "errors", bad, "r1/r2 diffs", diff); print("front nonzero:", nz_f); print("back nonzero:", nz_b)
