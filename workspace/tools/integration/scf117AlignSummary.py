#!/usr/bin/env python3
"""scf117: summarize scf117Align.ts shards per path (STATS_CHANGE source label, minimumFrames, next receipt type, hold) and scene.
residual = firstMessage - (minimumFrames + 1 + delta(first print)), i.e. production's first-glyph rel vs A + nextInstruction +
(delta(print) - delta(STATS_CHANGE) - 1) + 1. Also per scene: presented stats-change commands, frames (minimumFrames + holdFrames).
usage: scf117AlignSummary.py <align-dir> <out.json>
"""
import collections, glob, json, os, sys

src, out = sys.argv[1:3]
paths = collections.defaultdict(lambda: {"on": 0, "off": 0})
scene = {"on": {"commands": 0, "frames": 0, "holdFrames": 0, "sharply": 0}, "off": {"commands": 0, "frames": 0, "holdFrames": 0, "sharply": 0}}
nonzero = 0
for f in sorted(glob.glob(os.path.join(src, "*.jsonl"))):
    for line in open(f):
        if not line.strip(): continue
        r = json.loads(line)
        resid = None if r["firstMessage"] is None or r["firstMessageDelta"] is None else r["firstMessage"] - (r["minimumFrames"] + 1 + r["firstMessageDelta"])
        if resid not in (0, None): nonzero += 1
        k = f'{(r["statsChangeLabel"] or "").split(":")[0]}|{r["minimumFrames"]}|{r["nextType"]}|hold {r["holdFrames"]}|glyph rel {r["firstMessage"]}|residual {resid}'
        paths[k][r["scene"]] += 1
        s = scene[r["scene"]]
        s["commands"] += 1; s["frames"] += r["minimumFrames"] + r["holdFrames"]; s["holdFrames"] += r["holdFrames"]; s["sharply"] += r["minimumFrames"] == 90
res = {"perScene": scene, "nonZeroResidual": nonzero, "paths": dict(sorted(paths.items()))}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({"perScene": scene, "nonZeroResidual": nonzero, "paths": len(paths)}))
