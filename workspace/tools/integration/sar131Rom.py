#!/usr/bin/env python3
"""sar131 (docs/sar131-status-animation-render.md): the PSN / PRZ status-animation windows of the stat101Probe.py Scene ON outputs, and the
next live body after each one (the x2-history proof). Pure function of the probe rows (+ the ROM / map for labels / opcodes, as
sta123Rom.py): every status-animation instruction row X (gBattlescriptCurrInstr on a statusanimation / status2animation /
chosenstatusanimation opcode) whose gAnimScriptActive rises on X + 1 (R) and falls on F; the window dump is <stem>-<R>.npz (frames X, X+1,
..., F+4). The next live body = the next gAnimScriptActive rise with gCurrentMove != 0 whose row before is not a status-animation
instruction; its battler x2 / y2 (gSprites, the probe's `sp`) on the rise row's previous row (before the body writes anything).
usage: sar131Rom.py <probe-dir> <scenario-index.json> <out.json>     (<probe-dir>/<stem>-on.json)
"""
import bisect, json, os, re, sys

probe_dir, index_path, out_path = sys.argv[1:4]
index = json.load(open(index_path))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
syms = []
for line in open(os.path.join(ROOT, "reference/pokeemerald/pokeemerald.map")):
    m = re.match(r"\s+0x([0-9a-f]{8,16})\s+(BattleScript_\w+)\s*$", line)
    if m:
        syms.append((int(m.group(1), 16), m.group(2)))
syms.sort()
addrs = [a for a, _ in syms]
ROM = open(os.path.join(ROOT, "reference/pokeemerald/pokeemerald.gba"), "rb").read()
OPS = re.findall(r"^\s*B_SCR_OP_(\w+),", open(os.path.join(ROOT, "reference/pokeemerald/include/constants/battle_script_commands.h")).read(), re.M)
op = lambda p: OPS[ROM[p - 0x08000000]].lower() if 0x08000000 <= p < 0x08000000 + len(ROM) and ROM[p - 0x08000000] < len(OPS) else None
ANIM_OPS = {"statusanimation", "status2animation", "chosenstatusanimation"}


def lab(p):
    i = bisect.bisect_right(addrs, p) - 1
    return f"{syms[i][1]}+{p - syms[i][0]}" if i >= 0 and p - syms[i][0] < 1024 else hex(p)


out = {}
for name, ix in index.items():
    stem = name[:-5]
    rows = json.load(open(os.path.join(probe_dir, f"{stem}-on.json")))["rows"]
    sp, sps = None, []
    for r in rows:
        sp = r.get("sp", sp)
        sps.append(sp)
    battler = 1 if ix["attackerSide"] == "player" else 0
    wins, bodies = [], []
    for x in range(1, len(rows) - 1):
        if rows[x]["act"] or not rows[x + 1]["act"]:
            continue
        r = x + 1
        f = r
        while f < len(rows) and rows[f]["act"]:
            f += 1
        if op(rows[x]["ptr"]) in ANIM_OPS:
            wins.append({"X": x, "R": r, "F": f, "activeRows": f - r, "label": lab(rows[x]["ptr"]), "op": op(rows[x]["ptr"]),
                         "animation": ix["animation"], "battler": battler, "dump": f"{stem}-on-{r}.npz",
                         "battlerX2BeforeX": [sps[x][2][b][3] for b in (0, 1)]})
        elif rows[r]["mv"] != 0:
            bodies.append({"R": r, "mv": rows[r]["mv"], "atk": rows[r]["atk"], "x2": [sps[x][2][b][3] for b in (0, 1)],
                           "y2": [sps[x][2][b][4] for b in (0, 1)], "dump": f"{stem}-on-{r}.npz"})
    for w in wins:
        nb = next((b for b in bodies if b["R"] > w["F"]), None)
        w["nextBody"] = nb
        # the battler's x2 after the window's last active row (the task's end state) and on the next body's previous row
        w["battlerX2AfterF"] = sps[w["F"]][2][battler][3]
    out[stem] = {"index": ix, "windows": wins, "bodies": [{k: b[k] for k in ("R", "mv", "atk", "x2", "y2")} for b in bodies]}
json.dump(out, open(out_path, "w"), indent=1)
for k, v in out.items():
    print(k, [(w["X"], w["activeRows"], w["label"], w["battlerX2BeforeX"], w["battlerX2AfterF"], w["nextBody"] and (w["nextBody"]["R"], w["nextBody"]["mv"], w["nextBody"]["atk"], w["nextBody"]["x2"])) for w in v["windows"]])
