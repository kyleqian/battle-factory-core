#!/usr/bin/env python3
"""prep39: compact receipt of a prep39Probes.sh output dir (r1 == r2 already cmp'd): per scenario the probe JSON sha256, the RGB
dir digest (sha256 over sorted file names + bytes), detail-row count and every General_SubstituteFade window (start frame, script
rows, fading battler).  usage: prep39ProbeDigest.py <probe-dir> <out.json>"""
import hashlib
import json
import sys
from pathlib import Path

src, out = Path(sys.argv[1]), Path(sys.argv[2])
receipt = {"schema": "prep39-probes/v1", "scenarios": []}
for f in sorted(src.glob("*-r1.json")):
    d = json.loads(f.read_text())
    rgb = hashlib.sha256()
    for p in sorted((src / f.name.replace(".json", "-rgb")).iterdir()):
        rgb.update(p.name.encode()); rgb.update(p.read_bytes())
    rows = d["rows"]
    fades = [{"frame": fr, "attacker": who} for fr, label, who in d["scriptStarts"] if label == "General_SubstituteFade"]
    for w in fades:
        w["scriptRows"] = sum(1 for r in rows if r["frame"] >= w["frame"] and r["script"] == "General_SubstituteFade"
                              and r["frame"] < w["frame"] + 200)
    receipt["scenarios"].append({
        "scenario": f.name[:-len("-r1.json")], "profile": d["profile"], "frames": d["frames"],
        "r1EqualsR2": f.read_bytes() == (src / f.name.replace("-r1.json", "-r2.json")).read_bytes(),
        "jsonSha256": hashlib.sha256(f.read_bytes()).hexdigest()[:16], "rgbSha256": rgb.hexdigest()[:16],
        "detailRows": len(rows), "fades": fades,
    })
out.write_text(json.dumps(receipt, indent=1) + "\n")
print(f"wrote {out}: {len(receipt['scenarios'])} scenarios, {sum(len(s['fades']) for s in receipt['scenarios'])} fade windows")
