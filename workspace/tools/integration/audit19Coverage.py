#!/usr/bin/env python3
"""Live audit 19: coverage per UNIT immediately before each consumer window (the last non-HIT event of the window's history: a move body
by id (+ its side, Magnitude power class, Ice Ball counter, Dive setup / attack), a general / stat animation, or, when the consumer opens its turn,
"prompt after" / "locked turn after" the previous turn's last unit) x chain verdict (ZERO / DIFF / FALLBACK), from <receipt-dir>/check/check-*.json + the fixtures.
usage: audit19Coverage.py <receipt-dir> <fixture-dir>"""
import json, sys
from collections import Counter
from pathlib import Path

rec, fx = Path(sys.argv[1]), Path(sys.argv[2])
NAMES = {"222": "MAGNITUDE", "241": "SUNNY_DAY", "240": "RAIN_DANCE", "176": "CONVERSION_2", "302": "NEEDLE_ARM", "301": "ICE_BALL",
         "291": "DIVE", "351": "SHOCK_WAVE", "352": "WATER_PULSE", "129": "SWIFT", "85": "THUNDERBOLT", "189": "MUD_SLAP", "250": "WHIRLPOOL"}
count = Counter()
for p in sorted((rec / "check").glob("check-*.json")):
    for r in json.loads(p.read_text())["rows"]:
        f = json.loads((fx / r["fixture"]).read_text())
        turns = f["precedingTurns"]
        last = [e for e in turns[-1]["events"][:-1] if e.get("animationId") != "HIT_ANIMATION"]
        prefix = ""
        if not last and len(turns) > 1:
            # the consumer opens its turn: the unit is the previous turn's last one, then the prompt (or a locked turn: no prompt)
            prefix = "prompt after " if f["promptShown"][-1] else "locked turn after "
            last = [e for e in turns[-2]["events"] if e.get("animationId") != "HIT_ANIMATION"]
        if not last:
            unit = prefix + "battle start"
        else:
            e = last[-1]
            side = "ply" if e["battler"] == 0 else "opp"
            if e.get("animationId") == "MOVE_ANIMATION":
                m = e["arguments"][0]
                unit = f"{NAMES.get(m, m)}:{side}"
                if m == "222":
                    unit += " >99" if int(e["arguments"][2]) > 99 else " <=99"
                if m == "301":
                    unit += f" counter {e['arguments'][6]}"
                if m == "291":
                    unit += " attack" if e["arguments"][1] == "1" else " setup"
            elif e.get("kind") == "status-animation":
                unit = "status animation"
            else:
                unit = f"{e['animationId']}({','.join(e.get('arguments', []))}):{side}"
        unit = prefix + unit
        c = r["chain"]
        v = "FALLBACK" if not c["live"] else "ZERO" if c["px"] == 0 else "DIFF"
        count[(unit, r["move"], v)] += 1
units = sorted({k[0] for k in count})
for u in units:
    rows = {(m, v): n for (uu, m, v), n in count.items() if uu == u}
    tot = Counter()
    for (m, v), n in rows.items():
        tot[v] += n
    print(f"{u:<34} windows={sum(tot.values()):<4} ZERO={tot['ZERO']:<4} DIFF={tot['DIFF']:<3} FALLBACK={tot['FALLBACK']:<4} consumers: "
          + ", ".join(f"{m} {v} {n}" for (m, v), n in sorted(rows.items())))
