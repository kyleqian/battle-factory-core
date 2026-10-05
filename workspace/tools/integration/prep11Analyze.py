#!/usr/bin/env python3
"""prep11: per-body measurements of the prep11 moves from tools/integration/prep11Probe.py outputs (default /tmp/prep11-probes/r1) -> fixtures/prep11/prep11-analysis.json + a text table.
usage: prep11Analyze.py [probe-dir]"""
import json, glob, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/prep11-probes/r1")
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ROOT / "reference/pokeemerald/pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
name = {}
for l in nm.splitlines():
    p = l.split()
    if len(p) == 3: name.setdefault(int(p[0], 16) & ~1, p[2])
MOVES = {46: "ROAR", 18: "WHIRLWIND", 226: "BATON_PASS", 73: "LEECH_SEED", 161: "TRI_ATTACK", 194: "DESTINY_BOND", 278: "RECYCLE", 80: "PETAL_DANCE", 205: "ROLLOUT",
         314: "AIR_CUTTER", 193: "FORESIGHT", 327: "SKY_UPPERCUT", 169: "SPIDER_WEB", 19: "FLY", 340: "BOUNCE"}
BG0 = (0, 8, 10, 12, 14)
out = {}
for f in sorted(D.glob("*.json")):
    d = json.loads(f.read_text()); rows = []
    for b in d["bodies"]:
        if b["move"] not in MOVES: continue
        a = b["atActivation"]; end = b["end"] if b["end"] is not None else d["frames"]
        sp = [s for s in d["spawns"] if b["start"] <= s["f"] <= end]
        plus = [s for s in sp if s["ev"] == "+"]
        sprites = [{"age": s["f"] - b["start"], "slot": s["slot"], "tmpl": name.get(s["tmpl"] & ~1, hex(s["tmpl"])), "pal": s["attr"][2] >> 12, "tile": s["attr"][2] & 0x3ff, "shape": [s["attr"][0] >> 14, s["attr"][1] >> 14], "matrix": (s["attr"][1] >> 9) & 31 if s["attr"][0] & 0x100 else None, "cb": name.get(s["cb"] & ~1, hex(s["cb"]))} for s in plus]
        tev = [[e[0] - b["start"], {k: name.get(v & ~1, hex(v)) for k, v in e[1].items()}] for e in d["taskEvents"] if b["start"] <= e[0] <= end]
        rev = [[e[0] - b["start"], e[1]] for e in d["regEvents"] if b["start"] <= e[0] <= end]
        oam_changes = sorted({s["slot"] for s in plus})
        rows.append({"move": MOVES[b["move"]], "moveId": b["move"], "act": b["start"], "firstInactive": end, "duration": end - b["start"], "animTurn": a["animTurn"], "gAnimMovePower": a["gAnimMovePower"],
                     "gBattleMovePower": a["gBattleMovePower"], "bitmap": a["bitmap"], "tasksAtAct": a["tasks"], "monsAtAct": [(m["species"], m["hp"], m["status1"], m["status2"]) for m in a["mons"]],
                     "regsAtAct": a["regs"], "regChanges": rev, "taskEvents": tev, "sprites": sprites, "spriteSlots": oam_changes, "battlerPal": d["battlerPal"],
                     "objUnfadedAtAct": a["objUnfaded"], "objFadedAtAct": a["objFaded"], "bgUnfadedAtAct": a["bgUnfaded"],
                     "spriteOrderAtAct": a["spriteOrder"][:24], "inUseAtAct": a["sprites"], "atEnd1": b.get("atEnd+1", {}).get("bitmap")})
    out[f.stem] = rows
(ROOT / "tools/integration/fixtures/prep11").mkdir(exist_ok=True, parents=True)
(ROOT / "tools/integration/fixtures/prep11/prep11-analysis.json").write_text(json.dumps(out, separators=(",", ":")))
for sc, rows in out.items():
    print("==", sc)
    for r in rows:
        print(f"  {r['move']} act {r['act']} dur {r['duration']} turn {r['animTurn']} pow {r['gAnimMovePower']} bitmap {r['bitmap']:#x} slots {r['spriteSlots']} tasks@act {r['tasksAtAct']} battlerPal {r['battlerPal']}")
        print("     tasks:", [(t[0], list(t[1].values())) for t in r["taskEvents"]][:6])
        print("     regs@act", {k: hex(v) for k, v in r["regsAtAct"].items()}, "changes", len(r["regChanges"]))
        pals = sorted({(s["tmpl"], s["pal"], s["tile"], s["matrix"]) for s in r["sprites"]}, key=str)
        print("     tmpl/pal/matrix:", pals[:10])
