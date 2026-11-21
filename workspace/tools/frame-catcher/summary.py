#!/usr/bin/env python3
"""Frame catcher: OUTDIR/summary.md over every battle run of tools/frame-catcher/run.sh (counts, run times, the largest differences, and
the sound timing of all runs together: timing.py, docs/tdr1-catcher-timing-report.md)."""
import json, sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from timing import share  # noqa: E402

out = Path(sys.argv[1])
L = ["# Frame catcher summary", "", "| run | frames (engine / ROM) | menus followed | stretches: content / timing / identical | picture diffs | sound diffs | "
     "sound gaps: within 1 / off 6+ (game alone) | seconds (engine / ROM / compare) |",
     "|---|---|---|---|---|---|---|---|"]
tops = []
gaps = within = off6 = game_within = game_off6 = game_frames = battles = 0
by = defaultdict(lambda: {"times": 0, "seen": 0, "frames": 0, "runs": []})
for d in sorted(p for p in out.iterdir() if (p / "findings.json").exists()):
    f = json.loads((d / "findings.json").read_text())
    t = json.loads((d / "times.json").read_text()) if (d / "times.json").exists() else {}
    big = [x for x in f["pictureDifferences"] if x["pixels"] > 8]
    st = f.get("soundTiming")
    cell = "-"
    if st:
        n = st["gaps"]
        cell = f"{share(st['all']['within1'], n)}% / {share(st['all']['off6'], n)}% ({share(st['game']['within1'], n)}% / {share(st['game']['off6'], n)}%) of {n}"
        gaps, within, off6 = gaps + n, within + st["all"]["within1"], off6 + st["all"]["off6"]
        game_within, game_off6, game_frames = game_within + st["game"]["within1"], game_off6 + st["game"]["off6"], game_frames + st["game"]["frames"]
        battles += st.get("battles") or 0
        for k, n_seen in st.get("seen", {}).items():
            by[k]["seen"] += n_seen
        for r in st["ranked"]:
            g = by[r["gap"]]
            g["times"] += r["times"]
            g["frames"] += r["frames"]
            g["runs"].append(f"{d.name} {r['median']:+g}")
    L.append(f"| [{d.name}]({d.name}/report.md) | {f['engineFrames']} / {f['romFrames']} | {f['driver']['anchors'][0]}/{f['driver']['anchors'][1]} ({f['driver']['stop']}) | "
             f"{f['content']} / {f['timing']} / {f['identical']} | {len(big)} (+{len(f['pictureDifferences']) - len(big)} small) | {len(f['soundDifferences'])} | "
             f"{cell} | {t.get('engineSeconds', '?')} / {t.get('romSeconds', '?')} / {t.get('compareSeconds', '?')} |")
    for x in big[:5]:
        tops.append((x["score"], d.name, x))
if gaps:
    per = f" ({round(game_frames * 7 / battles)} per 7 battles)" if battles else ""
    L += ["", "## Sound timing, all runs", "",
          f"{gaps} sound-to-sound gaps in {battles} battles: {share(within, gaps)}% within 1 frame, {share(off6, gaps)}% off by 6 or more. "
          f"The game's part alone: {share(game_within, gaps)}% within 1 frame, {share(game_off6, gaps)}% off by 6 or more, {game_frames} frames off{per}. "
          "Each run's report.md, \"Sound timing\", says how the gaps are split.", "",
          "| previous sound -> sound | times off / seen | frames | median per run (ROM - ours) |", "|---|---|---|---|"]
    for k, g in sorted(((k, g) for k, g in by.items() if g["frames"]), key=lambda kv: (-kv[1]["frames"], kv[0]))[:30]:
        L.append(f"| {k} | {g['times']} / {g['seen']} | {g['frames']} | {', '.join(g['runs'][:6])} |")
L += ["", "## Largest picture differences of each run", ""]
for score, name, x in sorted(tops, key=lambda t: -t[0]):
    L.append(f"- {name} #{x['id']}: {'ours only' if x['side'] == 'ours' else 'ROM only'}, {x['pixels']} px, {x['frames']} frames, "
             f"{x['occurrences'][0]['where']} (frame {x['worstFrame']})" + (f" ![]({name}/{x['image']})" if x.get("image") else ""))
(out / "summary.md").write_text("\n".join(L) + "\n")
print(f"summary: {out / 'summary.md'}")
