#!/usr/bin/env python3
"""inv142 (docs/inv142-status-animation-invisible-battler.md): the status-animation windows of gaf140Probe.py's Scene ON outputs (a pure
function of the probe rows + the ROM / map for opcodes, gaf140Rom.py's window rule): X = the last row of a statusanimation /
status2animation / chosenstatusanimation instruction run, R = the first gAnimScriptActive rise after it (gate = R - X - 1), F = the first
row after R with gAnimScriptActive 0. Per window, per battler: the gSprites `invisible` bit (probe `sp` [sid, x, y, x2, y2, invisible])
at X, over R .. F - 1 and the first row >= F where it is visible again; the battler's x2 range over the window (ShakeMon2); gSprites in use
at X and the maximum over the window (the script's sprites); the changed-pixel count of the window's rows vs row R - 1 (probe `d`).
A window is INVISIBLE when its battler's sprite is invisible at X. The battler = the one whose sprite is invisible at X (else the
attacker). Battler 0 = player, 1 = opponent.
usage: inv142Rom.py <probe-dir> <out.json>     (<probe-dir>/<name>.json for every probe file)
"""
import glob, json, os, re, sys

probe_dir, out_path = sys.argv[1:3]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
ROM = open(os.path.join(ROOT, "reference/pokeemerald/pokeemerald.gba"), "rb").read()
OPS = re.findall(r"^\s*B_SCR_OP_(\w+),", open(os.path.join(ROOT, "reference/pokeemerald/include/constants/battle_script_commands.h")).read(), re.M)
op = lambda p: OPS[ROM[p - 0x08000000]].lower() if 0x08000000 <= p < 0x08000000 + len(ROM) and ROM[p - 0x08000000] < len(OPS) else None
ANIM_OPS = {"statusanimation", "status2animation", "chosenstatusanimation"}
out = {}
for path in sorted(glob.glob(os.path.join(probe_dir, "*.json"))):
    name = os.path.basename(path)[:-5]
    rows = json.load(open(path))["rows"]
    # carry the delta-coded `sp` forward
    sp, cur = [], None
    for r in rows:
        cur = r.get("sp", cur)
        sp.append(cur)
    xs = [x for x in range(len(rows) - 1) if op(rows[x]["ptr"]) in ANIM_OPS and rows[x + 1]["ptr"] != rows[x]["ptr"]]
    wins = []
    for x in xs:
        nxt = next((y for y in xs if y > x), len(rows))
        r = next((r for r in range(x + 1, nxt) if rows[r]["act"] and not rows[r - 1]["act"]), None)
        inv_x = [sp[x][2][b][5] for b in (0, 1)]
        b = 0 if inv_x[0] else 1 if inv_x[1] else rows[x]["atk"]
        w = {"X": x, "op": op(rows[x]["ptr"]), "ptr": hex(rows[x]["ptr"]), "battler": b, "invisibleAtX": inv_x, "spritesInUseAtX": sp[x][0]}
        if r is not None:
            f = r
            while f < len(rows) and rows[f]["act"]:
                f += 1
            vis = next((y for y in range(x, len(rows)) if not sp[y][2][b][5]), None)
            w.update({"R": r, "F": f, "gate": r - x - 1, "activeRows": f - r,
                      "battlerInvisibleRows": sum(sp[y][2][b][5] for y in range(r, f)),
                      "battlerX2": [min(sp[y][2][b][3] for y in range(r, f)), max(sp[y][2][b][3] for y in range(r, f))],
                      "spritesInUseMax": max(sp[y][0] for y in range(r, f)),
                      "changedPxMax": max((rows[y].get("d") or [0])[0] for y in range(r, f)),
                      "firstVisibleRow": vis, "visibleAfterF": None if vis is None else vis - f,
                      "visibleBy": None if vis is None else op(rows[vis - 1]["ptr"]), "dump": f"{name}-{r}.npz"})
        w["invisible"] = bool(inv_x[b])
        wins.append(w)
    out[name] = wins
    for w in wins:
        if w["invisible"]:
            print(name, {k: w.get(k) for k in ("X", "op", "battler", "gate", "activeRows", "battlerInvisibleRows", "battlerX2",
                                              "spritesInUseAtX", "spritesInUseMax", "changedPxMax", "visibleAfterF", "visibleBy")})
json.dump(out, open(out_path, "w"), indent=1)
open(out_path, "a").write("\n")
