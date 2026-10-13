#!/usr/bin/env python3
"""gaf140 (docs/gaf140-status-gate-age.md): the status-animation windows and live bodies of gaf140Probe.py's Scene ON outputs (a pure
function of the probe rows + the ROM / map for opcodes, as sar131Rom.py). A status-animation window = the last row X of a
statusanimation / status2animation / chosenstatusanimation instruction run and the first gAnimScriptActive rise after it (R, gate =
R - X - 1; falls on F); every other rise with gCurrentMove != 0 is a live body (R, mv, atk: the production x2 tracker's input). The
gated windows (fixtures/gaf140/windows.json) must sit at seg127's X / gate (checked: `seg127Match`). Window dump: <stem>-on-<R>.npz
(rows R - 32 .. F + 4).
usage: gaf140Rom.py <probe-dir> <windows.json> <out.json>     (<probe-dir>/<stem>-on.json)
"""
import json, os, re, sys

probe_dir, windows_path, out_path = sys.argv[1:4]
gated = json.load(open(windows_path))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
ROM = open(os.path.join(ROOT, "reference/pokeemerald/pokeemerald.gba"), "rb").read()
OPS = re.findall(r"^\s*B_SCR_OP_(\w+),", open(os.path.join(ROOT, "reference/pokeemerald/include/constants/battle_script_commands.h")).read(), re.M)
op = lambda p: OPS[ROM[p - 0x08000000]].lower() if 0x08000000 <= p < 0x08000000 + len(ROM) and ROM[p - 0x08000000] < len(OPS) else None
ANIM_OPS = {"statusanimation", "status2animation", "chosenstatusanimation"}
out, bad = {}, 0
for stem, g in gated.items():
    rows = json.load(open(os.path.join(probe_dir, f"{stem}-on.json")))["rows"]
    xs = [x for x in range(len(rows) - 1) if op(rows[x]["ptr"]) in ANIM_OPS and rows[x + 1]["ptr"] != rows[x]["ptr"]]
    rises = [r for r in range(1, len(rows)) if rows[r]["act"] and not rows[r - 1]["act"]]
    wins, used = [], set()
    for x in xs:
        r = next((r for r in rises if r > x), None)
        if r is None:
            continue
        f = r
        while f < len(rows) and rows[f]["act"]:
            f += 1
        used.add(r)
        wins.append({"X": x, "R": r, "F": f, "gate": r - x - 1, "activeRows": f - r, "animation": g["animation"], "battler": g["battler"],
                     "gated": x == g["X"], "dump": f"{stem}-on-{r}.npz"})
    bodies = [{"R": r, "mv": rows[r]["mv"], "atk": rows[r]["atk"]} for r in rises if r not in used and rows[r]["mv"] != 0]
    w = next((w for w in wins if w["gated"]), None)
    match = w is not None and w["gate"] == g["gate"] and w["R"] == g["R"] and w["activeRows"] == g["activeRows"]
    bad += not match
    out[stem] = {"window": g, "seg127Match": match, "windows": wins, "bodies": bodies}
    print(stem, g["animation"], "battler", g["battler"], "X", g["X"], "gate", g["gate"], "seg127Match", match,
          "windows", [(w["X"], w["gate"]) for w in wins], "bodies", [(b["R"], b["mv"], b["atk"]) for b in bodies])
json.dump(out, open(out_path, "w"), indent=1)
open(out_path, "a").write("\n")
sys.exit(1 if bad else 0)
