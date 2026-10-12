#!/usr/bin/env python3
"""iu120: Scene OFF unchanged / Scene ON moved by P + T per live body, on idle94Route.ts routes (docs/iu120-universal-rows.md).

usage: iu120SceneParity.py <route-dir> <out.json> <battle>...
<route-dir>/{base,final}-b<battle>-{on,off}.json. OFF: every command row (frame, seg, cmd, type, ev, moveId, attacker, duration, lines)
and the total frames identical. ON: the same command key sequence; the total frame delta and every move command's duration delta are
reported per command (frame span to the next command row; the live move commands move by P + T, tools/integration/iu120CensusDelta.py checks the per-side arithmetic census-wide).
"""
import json, sys

rdir, out, battles = sys.argv[1], sys.argv[2], sys.argv[3:]
ld = lambda t, b, s: json.load(open(f"{rdir}/{t}-b{b}-{s}.json"))
key = lambda r: (r.get("seg"), r.get("cmd"), r.get("type"), r.get("ev"), r.get("moveId"), r.get("attacker"), r.get("lines"))
res = {}
for b in battles:
    bo, fo, bn, fn = ld("base", b, "off"), ld("final", b, "off"), ld("base", b, "on"), ld("final", b, "on")
    span = lambda rows, i: rows[i + 1]["frame"] - rows[i]["frame"]
    moved = [(r.get("moveId"), r.get("attacker"), span(fn["rows"], i) - span(bn["rows"], i))
             for i, (r, q) in enumerate(zip(bn["rows"][:-1], fn["rows"][:-1])) if span(fn["rows"], i) != span(bn["rows"], i)]
    res[f"b{b}"] = {"offFrames": [bo["frames"], fo["frames"]], "offRowsIdentical": bo["rows"] == fo["rows"],
                    "onFrames": [bn["frames"], fn["frames"]], "onKeySequenceIdentical": [key(r) for r in bn["rows"]] == [key(r) for r in fn["rows"]],
                    "onMovedMoveCommands": [f"{m}{'p' if a == 0 else 'o'}:+{d}" for m, a, d in moved],
                    "onFrameDelta": fn["frames"] - bn["frames"], "onMovedSum": sum(d for _, _, d in moved)}
    res[f"b{b}"]["pass"] = res[f"b{b}"]["offRowsIdentical"] and bo["frames"] == fo["frames"] and res[f"b{b}"]["onKeySequenceIdentical"]
json.dump(res, open(out, "w"), indent=1)
print(json.dumps(res))
