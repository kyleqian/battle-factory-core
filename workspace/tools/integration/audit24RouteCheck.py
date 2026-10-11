#!/usr/bin/env python3
"""Live audit 24 (docs/live-audit-24.md): the temp patch fixtures/audit-24/audit24-lead-row0.diff on PRODUCTION census routes.
idle94RouteRender.ts outputs of the same route from a base and a patched archive copy (<dir>/{base,patched}-b<seed>-<move>-<side>.json):
per route, the command timeline (rows: frame, type, duration; without the command's first-row `live` flag, which the patch turns
false on every lead command by design: its row 0 has no effect) and total frames must be identical; the rendered rows of the lead
command must be identical except patched row 0 (no effect: age None, live False); and whether patched row 0 equals base row 0
(expected for a non-elevated attacker: the ordinary field == the age-0 image) or not (an elevated opponent: its shadow is drawn).
usage: audit24RouteCheck.py <dir> <out.json> <seed:move:side>...
"""
import json, sys

d, out, routes = sys.argv[1], sys.argv[2], sys.argv[3:]
res = []
for r in routes:
    seed, move, side = r.split(":")
    b, p = (json.load(open(f"{d}/{t}-b{seed}-{move}-{side}.json")) for t in ("base", "patched"))
    br, pr = b["render"], p["render"]
    strip = lambda rows: [{k: v for k, v in x.items() if k != "live"} for x in rows]
    flips = sorted({(x.get("moveId"), x.get("live"), y.get("live")) for x, y in zip(b["rows"], p["rows"]) if x.get("live") != y.get("live")})
    e = {"route": r, "frames": [b["frames"], p["frames"]], "timelineSame": strip(b["rows"]) == strip(p["rows"]) and b["frames"] == p["frames"],
         "firstRowLiveFlips": sum(x.get("live") != y.get("live") for x, y in zip(b["rows"], p["rows"])), "flippedMoves": [f[0] for f in flips],
         "end": [b["end"], p["end"]], "rows": [len(br), len(pr)],
         "rowsAfter0Same": [x["sha"] for x in br[1:]] == [x["sha"] for x in pr[1:]] and [x["age"] for x in br[1:]] == [x["age"] for x in pr[1:]],
         "baseRow0": {k: br[0][k] for k in ("elapsed", "age", "live", "sha")}, "patchedRow0": {k: pr[0][k] for k in ("elapsed", "age", "live", "sha")},
         "row0Same": br[0]["sha"] == pr[0]["sha"], "baseRow0EqRow1": br[0]["sha"] == br[1]["sha"]}
    res.append(e)
    print(r, "timelineSame", e["timelineSame"], "rowsAfter0Same", e["rowsAfter0Same"], "row0Same", e["row0Same"],
          "patched row0 age", e["patchedRow0"]["age"], "live", e["patchedRow0"]["live"], "frames", e["frames"],
          "first-row live flips", e["firstRowLiveFlips"], e["flippedMoves"])
json.dump({"schema": "audit24-route-check/v1", "routes": res}, open(out, "w"), indent=1)
open(out, "a").write("\n")
