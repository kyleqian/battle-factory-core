#!/usr/bin/env python3
"""aud118 (docs/aud118-live-audit-26.md): olnd113Verify.py, unchanged, on aud118's Scene OFF classes (lead(STATS_CHANGE) = 1 adjustment of
off108Verify.py's residuals; the joint target = the first stat message's first glyph after the pause + the sc106 stats-change command) with
its SCEN map replaced by the four new stat classes (Swords Dance 14, Agility 97, Leer 43, Screech 103); ON = off108Verify.py --scene=on on
the Scene ON routes (only the hold classes have ON routes). Then the known ISSUES #153 Substitute 164 row, quantified: the ROM's
Scene OFF Substitute use (the exempted attackanimation: its waitanimation run, the HP bar's first change, the message's first glyph, rows - G)
vs production's command starts (frames after G + 1) on every census use with the same receipt path.
usage: aud118Verify.py <rom-r1.json> <verify-off.json> <verify-on.json> <route-dir> <out.json> <substitute-out.json>"""
import glob, json, os, re, sys
from pathlib import Path

rom_path, vo, von, rdir, out, sub_out = sys.argv[1:7]
SCEN = '''SCEN = {14: "aud118-swords-dance-ply-primeape-onix", 97: "aud118-agility-ply-primeape-onix", 43: "aud118-leer-ply-primeape-snorlax",
        103: "aud118-screech-ply-primeape-snorlax"}
'''
src = Path(__file__).with_name("olnd113Verify.py").read_text()
new, n = re.subn(r"^SCEN = \{.*?\}\n", lambda m: SCEN, src, count=1, flags=re.M | re.S)
assert n == 1, "olnd113Verify.py SCEN not found"
sys.argv = [str(Path(__file__).with_name("olnd113Verify.py")), rom_path, vo, von, rdir, out]
exec(compile(new, "olnd113Verify.py(aud118 SCEN)", "exec"), {"__name__": "__main__", "__file__": sys.argv[0]})

rom = json.load(open(rom_path))["scenarios"]["aud118-substitute-ply-primeape-onix"]
res = {"schema": "aud118-substitute/v1", "issue": "#153"}
for mode in ("off", "on"):
    u = rom[mode][0]
    runs = {r[0]: r for r in u["runs"]}
    wait, hp, msg = runs["BattleScript_SubstituteAnim+1"], runs["BattleScript_SubstituteAnim+4"], runs["BattleScript_SubstituteString+5"]
    res[f"rom_{mode}"] = {"G": u["G"], "waitanimation": [wait[1], wait[2]], "waitanimationChanges": wait[6], "hpFirstChange": hp[5][0],
                          "messageFirstGlyph": msg[5][0]}
starts = {}
for f in sorted(glob.glob(os.path.join(rdir, "off-*.jsonl"))):
    for line in open(f):
        if not line.strip():
            continue
        u = json.loads(line)
        if u["move"] != 164 or u["attack"] is None:
            continue
        c = u["commands"]
        t, row = (c[0][3] or 0), {}
        for x in c[1:]:
            row.setdefault(x[1], t)
            t += (x[2] or 0) + (x[3] or 0)
            if x[1] == "message":
                break
        key = json.dumps([[x[1], x[2], x[3]] for x in c[1:4]])
        starts.setdefault(key, {"commands": json.loads(key), "uses": 0, "starts": row})
        starts[key]["uses"] += 1
ro = res["rom_off"]
res["production"] = sorted(starts.values(), key=lambda s: -s["uses"])
for s in res["production"]:
    st = s["starts"]
    s["residualHpBar"] = st.get("hp", 0) - (ro["hpFirstChange"] - 1) if "hp" in st else None
    s["residualMessage"] = st.get("message", 0) - (ro["messageFirstGlyph"] - 1) if "message" in st else None
json.dump(res, open(sub_out, "w"), indent=1)
for s in res["production"]:
    print(f"substitute (#153) uses {s['uses']}: ROM OFF waitanimation {ro['waitanimation'][1]} rows ({ro['waitanimationChanges']} screen changes), "
          f"HP bar G+{ro['hpFirstChange']}, glyph G+{ro['messageFirstGlyph']}; production {s['commands']} -> residual HP {s['residualHpBar']}, "
          f"message {s['residualMessage']}")
