#!/usr/bin/env python3
"""ohm1: classify every AI tray (battler 1) in ait1TrayProbe.py --all rows as a 101 or 102 tray and as voluntary / faint replacement.

usage: ohm1TrayTable.py PROBE.json [SND.json]   (prints one JSON line per tray)
A tray starts at the first shown row (delayTimer 0) after a not-shown gap; its timer first reads 1 at d+1 (the 101 tray: 0, 1, 2) or d+2 (the 102 tray: 0, 0, 1), see ait1 in docs/ais1-ai-switch-withdraw.md.
With SND.json (soundEventProbe lab output of the same trace) the tray is voluntary when no SE_FAINT (16) with pan > 0 (the opponent) sits between the previous SE_BALL_OPEN-free stretch
(60..700 frames before the tray) and the tray; `lag` = timer-1 frame - d."""
import json
import sys

rows = json.load(open(sys.argv[1]))["rows"]
snd = json.load(open(sys.argv[2]))["events"] if len(sys.argv) > 2 else []
trays, cur, last = [], None, None
for r in rows:
    f, timer, shown = r[0], r[2], r[4]
    if shown and (last is None or not last[4] or f - last[0] > 1 and timer == 0 and cur and cur["end"] is not None):
        pass
    if shown and timer == 0 and (cur is None or cur.get("closed") or f - cur["last"] > 3):
        cur = {"d": f, "t1": None, "last": f, "closed": False, "end": None}
        trays.append(cur)
    elif cur and not cur["closed"]:
        if shown:
            cur["last"] = f
            if timer == 1 and cur["t1"] is None:
                cur["t1"] = f
        else:
            cur["closed"] = True
            cur["end"] = f
    last = r
for t in trays:
    near = [e for e in snd if e.get("id") == 114 and abs(e["frame"] - t["d"]) <= 4]
    lag = None if t["t1"] is None else t["t1"] - t["d"]
    faint = [e["frame"] for e in snd if e.get("id") == 16 and (e.get("pan") or 0) > 0 and 0 < t["d"] - e["frame"] < 700]
    print(json.dumps({"d": t["d"], "t1": t["t1"], "lag": lag, "tray": {1: 101, 2: 102}.get(lag), "end": t["end"], "len": None if t["end"] is None else t["end"] - t["d"],
                      "se114": [e["frame"] for e in near], "oppFaintBefore": faint, "kind": "faint" if faint else "voluntary-or-intro"}))
