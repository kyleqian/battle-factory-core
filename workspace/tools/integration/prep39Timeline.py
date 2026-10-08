#!/usr/bin/env python3
"""prep39: print every General_SubstituteFade window of a prep39 probe (age 0 = first script row); --changes prints
only rows whose registers / attacker sprite / graphics / palettes / tasks differ from the previous row."""
import hashlib
import json
import sys

FADE = "General_SubstituteFade"
probe = json.load(open(sys.argv[1]))
changes = "--changes" in sys.argv
rows = probe["rows"]
starts = [i for i, r in enumerate(rows) if r["script"] == FADE and (i == 0 or rows[i - 1]["script"] != FADE or rows[i - 1]["frame"] != r["frame"] - 1)]
ph = lambda p: hashlib.sha1(json.dumps(p).encode()).hexdigest()[:6]  # noqa: E731
for s in starts:
    a = rows[s]["animAttacker"]
    end = next(i for i in range(s, len(rows)) if rows[i]["script"] != FADE)
    print(f"== window frame {rows[s]['frame']} attacker {a} script rows {end - s} species {rows[s]['battlers'][a]['species']}")
    digests: dict = {}
    prev = None
    for r in rows[max(0, s - 6):min(len(rows), end + 8)]:
        age = r["frame"] - rows[s]["frame"]
        b = r["battlers"][a]; o = r["battlers"][1 - a]
        d = digests.setdefault(b["tileDigest"], f"g{len(digests)}")
        tasks = ",".join(t["func"].replace("AnimTask_", "").replace("Task_", "")[:14] for t in r["tasks"])
        sp = b["sprite"]
        line = (f"bldcnt={r['bldcnt']:04x} alpha={r['bldalpha']:04x} bgcnt={'/'.join(f'{c:04x}' for c in r['bgcnt'])} bg1={r['bg1']} bg2={r['bg2']} "
                f"x={sp['x']} y={sp['y']} x2={sp['x2']} y2={sp['y2']} inv={int(sp['invisible'])} prio={sp['priority']} {d} hw={ph(b['hwPalette'])} fd={ph(b['fadedPalette'])} uf={ph(b['unfadedPalette'])} "
                f"p8={ph(r['bgPal8'])} p9={ph(r['bgPal9'])} sub={int(b['behindSubstitute'])} oth=({o['sprite']['x2']},{o['sprite']['y2']},{int(o['sprite']['invisible'])}) sh={int(r['battlers'][1]['shadow']['invisible'])} {tasks}")
        if not changes or line != prev:
            print(f"{age:4d} {str(r['script'])[:8]:8s} {line}")
        prev = line
