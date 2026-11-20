#!/usr/bin/env python3
"""Frame catcher: OUTDIR/summary.md over every battle run of tools/frame-catcher/run.sh (counts, run times, the largest differences)."""
import json, sys
from pathlib import Path

out = Path(sys.argv[1])
L = ["# Frame catcher summary", "", "| run | frames (engine / ROM) | menus followed | stretches: content / timing / identical | picture diffs | sound diffs | seconds (engine / ROM / compare) |",
     "|---|---|---|---|---|---|---|"]
tops = []
for d in sorted(p for p in out.iterdir() if (p / "findings.json").exists()):
    f = json.loads((d / "findings.json").read_text())
    t = json.loads((d / "times.json").read_text()) if (d / "times.json").exists() else {}
    big = [x for x in f["pictureDifferences"] if x["pixels"] > 8]
    L.append(f"| [{d.name}]({d.name}/report.md) | {f['engineFrames']} / {f['romFrames']} | {f['driver']['anchors'][0]}/{f['driver']['anchors'][1]} ({f['driver']['stop']}) | "
             f"{f['content']} / {f['timing']} / {f['identical']} | {len(big)} (+{len(f['pictureDifferences']) - len(big)} small) | {len(f['soundDifferences'])} | "
             f"{t.get('engineSeconds', '?')} / {t.get('romSeconds', '?')} / {t.get('compareSeconds', '?')} |")
    for x in big[:5]:
        tops.append((x["score"], d.name, x))
L += ["", "## Largest picture differences of each run", ""]
for score, name, x in sorted(tops, key=lambda t: -t[0]):
    L.append(f"- {name} #{x['id']}: {'ours only' if x['side'] == 'ours' else 'ROM only'}, {x['pixels']} px, {x['frames']} frames, "
             f"{x['occurrences'][0]['where']} (frame {x['worstFrame']})" + (f" ![]({name}/{x['image']})" if x.get("image") else ""))
(out / "summary.md").write_text("\n".join(L) + "\n")
print(f"summary: {out / 'summary.md'}")
