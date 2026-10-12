#!/usr/bin/env python3
"""sta123: ROM rows of every status animation in the sta123 lab scenarios (idle94Probe.py ON + OFF outputs; docs/sta123-status-
animations-design.md). Same row model as off121Rom.py (base 2d70bafd9 does not carry it), widened to the three status-animation
opcodes: statusanimation (status1), status2animation (masked status2) and chosenstatusanimation (the chosenstatus2animation macro).

usage: sta123Rom.py <probe-dir> <scenario-index.json> <out.json>      (<probe-dir>/<stem>-{on,off}.json)
Per status-animation instruction run (gBattlescriptCurrInstr constant on the instruction; label = battle-script symbol + offset from
pokeemerald.map, opcode = the ROM byte at the pointer in include/constants/battle_script_commands.h enum order):
  instrRows        rows the instruction's pointer run lasts (it waits for gBattleControllerExecFlags == 0, then advances in 1 row);
  controllerRows   rows after the run while gBattleControllerExecFlags stays set (Scene ON: the controller's B_ANIM_STATUS_* playback
                   through PlayerHandleStatusAnimation / OpponentHandleStatusAnimation -> LaunchStatusAnimation; the next
                   instruction holds for exactly these rows);
  activeRows / firstActive / lastActive   gAnimScriptActive rows inside the controller window (offsets from the first controller row);
  screen / oam / pal changes inside the controller window; window = one flag string per row from the instruction row - 2 to the release
                   row + 2 ("." nothing, letters: s screen, o OAM, p OBJ palette RAM, a gAnimScriptActive set, x controller busy);
  next             the label / opcode of the instruction the script resumes on (executes on the release row);
  printBefore      the label of the last print before it (end-turn / turn-start paths); animation = the B_ANIM_STATUS_* the label
                   implies (DoStatusTurnDmg: from the print before: PoisonTurnDmg -> PSN, BurnTurnDmg -> BRN); battler = gBattlerAttacker
                   (`atk`) for BS_ATTACKER scripts, the other singles battler for MoveEffect* (BS_EFFECT_BATTLER = the move's target).
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
PRINT_OPS = {"printstring", "printfromtable"}
BY_LABEL = {  # label (without offset) -> (B_ANIM_STATUS_*, kernel path)
    "BattleScript_MoveEffectToxic": ("PSN", "move-inflicted"), "BattleScript_MoveEffectPoison": ("PSN", "move-inflicted"),
    "BattleScript_MoveEffectBurn": ("BRN", "move-inflicted"), "BattleScript_MoveEffectParalysis": ("PRZ", "move-inflicted"),
    "BattleScript_MoveEffectSleep": ("SLP", "move-inflicted"), "BattleScript_MoveEffectFreeze": ("FRZ", "move-inflicted"),
    "BattleScript_MoveEffectConfusion": ("CONFUSION", "move-inflicted"), "BattleScript_YawnMakesAsleep": ("SLP", "yawn"),
    "BattleScript_MoveUsedIsAsleep": ("SLP", "sleep turn"), "BattleScript_MoveUsedIsParalyzed": ("PRZ", "can't move"),
    "BattleScript_MoveUsedIsFrozen": ("FRZ", "frozen turn"), "BattleScript_MoveUsedIsConfused": ("CONFUSION", "confusion self-check"),
    "BattleScript_MoveUsedIsInLove": ("INFATUATION", "in-love check"), "BattleScript_CurseTurnDmg": ("CURSED", "end-turn curse tick"),
    "BattleScript_NightmareTurnDmg": ("NIGHTMARE", "end-turn nightmare tick"), "BattleScript_CuteCharmActivates": ("INFATUATION", "cute charm"),
    "BattleScript_ThrashConfuses": ("CONFUSION", "thrash fatigue"),
}


def lab(p):
    i = bisect.bisect_right(addrs, p) - 1
    return f"{syms[i][1]}+{p - syms[i][0]}" if i >= 0 and p - syms[i][0] < 1024 else hex(p)


def runs(rows):
    out, f = [], 0
    while f < len(rows):
        g = f
        while g + 1 < len(rows) and rows[g + 1]["ptr"] == rows[f]["ptr"]:
            g += 1
        out.append((f, g))
        f = g + 1
    return out


def flags(rows, x):
    r, p = rows[x], rows[x - 1] if x else rows[x]
    s = "".join(c for c, k in (("s", "scr"), ("o", "oam"), ("p", "pal")) if r[k] != p[k])
    return (s + ("a" if r["act"] else "") + ("x" if r["exec"] else "")) or "."


def analyse(rows):
    rr = runs(rows)
    anims = []
    for i, (f, g) in enumerate(rr):
        o = op(rows[f]["ptr"])
        if o not in ANIM_OPS:
            continue
        label = lab(rows[f]["ptr"])
        prev = next((lab(rows[rr[k][0]]["ptr"]) for k in range(i - 1, max(-1, i - 12), -1) if op(rows[rr[k][0]]["ptr"]) in PRINT_OPS), None)
        base = label.split("+")[0]
        if base == "BattleScript_DoStatusTurnDmg":
            anim, path = {"BattleScript_PoisonTurnDmg": ("PSN", "end-turn poison tick"), "BattleScript_BurnTurnDmg": ("BRN", "end-turn burn tick")}.get(
                (prev or "").split("+")[0], ("?", "end-turn tick"))
        else:
            anim, path = BY_LABEL.get(base, ("?", "?"))
        atk = rows[g]["atk"]
        battler = (1 - atk) if base.startswith("BattleScript_MoveEffect") else atk
        h = g + 1
        while h < len(rows) and rows[h]["exec"]:
            h += 1
        ctl = range(g + 1, h)
        act = [x - (g + 1) for x in ctl if rows[x]["act"]]
        ch = lambda k: sum(1 for x in ctl if rows[x][k] != rows[x - 1][k])
        nxt = rows[g + 1]["ptr"] if g + 1 < len(rows) else None
        anims.append({"label": label, "op": o, "animation": anim, "path": path, "battler": battler, "row": f, "instrRows": g - f + 1,
                      "controllerRows": h - g - 1, "activeRows": len(act), "firstActive": act[0] if act else None,
                      "lastActive": act[-1] if act else None, "screenChanges": ch("scr"), "oamChanges": ch("oam"), "palChanges": ch("pal"),
                      "next": None if nxt is None else [lab(nxt), op(nxt)], "printBefore": prev,
                      "window": " ".join(flags(rows, x) for x in range(max(1, f - 2), min(len(rows), h + 3)))})
    return anims


out = {"schema": "sta123-rom/v1", "scenarios": {}}
for name, meta in sorted(index.items()):
    stem = name[:-5]
    rec = {**meta}
    for mode in ("on", "off"):
        rows = json.load(open(os.path.join(probe_dir, f"{stem}-{mode}.json")))["rows"]
        rec[mode] = {"rows": len(rows), "statusAnimations": analyse(rows)}
    out["scenarios"][stem] = rec
summary = {}
for stem, rec in out["scenarios"].items():
    for mode in ("on", "off"):
        for a in rec[mode]["statusAnimations"]:
            k = f"{a['animation']}|{a['path']}|{'player' if a['battler'] == 0 else 'opponent'}|{mode}"
            s = summary.setdefault(k, {"n": 0, "controllerRows": [], "activeRows": [], "instrRows": [], "next": []})
            s["n"] += 1
            for f in ("controllerRows", "activeRows", "instrRows"):
                if a[f] not in s[f]:
                    s[f].append(a[f])
            if a["next"][0].split("+")[0] not in s["next"]:
                s["next"].append(a["next"][0].split("+")[0])
out["summary"] = dict(sorted(summary.items()))
json.dump(out, open(out_path, "w"), indent=1)
print(f"sta123Rom: {len(out['scenarios'])} scenarios, {sum(v['n'] for v in summary.values())} status animations")
for k, v in out["summary"].items():
    print(k, v["n"], "ctl", v["controllerRows"], "act", v["activeRows"], "instr", v["instrRows"], "next", v["next"])
