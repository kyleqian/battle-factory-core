#!/usr/bin/env python3
"""off121: ROM rows of every status-data instruction and the print after it in the off121 lab scenarios (idle94Probe.py ON + OFF outputs;
docs/off121-status-command.md).

usage: off121Rom.py <probe-dir> <scenario-index.json> <out.json>      (<probe-dir>/<stem>-{on,off}.json)
Pointer runs (gBattlescriptCurrInstr constant) are labelled with the battle-script symbol + offset (pokeemerald.map) and the opcode
name (include/constants/battle_script_commands.h enum order; the ROM byte at the pointer). An instruction that emits
BtlController_EmitSetMonData(REQUEST_STATUS_BATTLE) -- seteffectprimary / seteffectsecondary / seteffectwithchance (SetMoveEffect),
attackcanceler (effect 2: sleep / freeze turns), cleareffectsonfaint, trysetrest, moveend (MOVEEND item cures) -- starts an "event" when the next print
(printstring / printfromtable) follows it with no other print in between. Per event: S = the status instruction's first row, P = the
print's first row, F = the first screen change after P (the print's first glyph; a faint's last healthbox / sprite change lands on P
itself), the runs from S to P (label, opcode, start - S,
length), and the status animation run between S and the print or after its waitmessage (statusanimation's length, gAnimScriptActive rows
and screen changes: Scene ON plays B_ANIM_STATUS_*, Scene OFF skips it). Also every statusanimation run in the probe (ticks, sleep
turns, paralysis): its rows, active rows, screen changes, and the label of the print before it.
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
STATUS_OPS = {"seteffectprimary", "seteffectsecondary", "seteffectwithchance", "attackcanceler", "cleareffectsonfaint", "trysetrest", "moveend"}
PRINT_OPS = {"printstring", "printfromtable"}


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


def openers(rows, rr):
    """off108Rom.py's G: per "X used Y!" (the pointer run right after an `attackstring` while the controller is busy), the release
    row - 2 = the final glyph. Production's next command starts on G + 1 (idle98 section 2)."""
    out = []
    for (f, g) in rr:
        if f and rows[f]["exec"] and op(rows[f - 1]["ptr"]) == "attackstring" and any(rows[x]["scr"] != rows[x - 1]["scr"] for x in range(f, g + 1)):
            out.append(g - 1)
    return out


def analyse(rows):
    rr = runs(rows)
    gs = openers(rows, rr)
    changes = [x for x in range(1, len(rows)) if rows[x]["scr"] != rows[x - 1]["scr"]]
    first_change = lambda a: changes[bisect.bisect_left(changes, a)] if bisect.bisect_left(changes, a) < len(changes) else None
    desc = lambda f, g, base: [lab(rows[f]["ptr"]), op(rows[f]["ptr"]), f - base, g - f + 1, rows[f]["exec"],
                              sum(1 for x in range(f, g + 1) if rows[x]["act"]), sum(1 for x in changes if f <= x <= g)]
    events, anims = [], []
    for i, (f, g) in enumerate(rr):
        o = op(rows[f]["ptr"])
        if o == "statusanimation":
            prev = next((lab(rows[rr[k][0]]["ptr"]) for k in range(i - 1, max(-1, i - 12), -1) if op(rows[rr[k][0]]["ptr"]) in PRINT_OPS), None)
            anims.append({"label": lab(rows[f]["ptr"]), "row": f, "rows": g - f + 1, "activeRows": sum(1 for x in range(f, g + 1) if rows[x]["act"]),
                          "screenChanges": sum(1 for x in changes if f <= x <= g), "printBefore": prev})
        if o not in STATUS_OPS:
            continue
        for k in range(i + 1, min(len(rr), i + 60)):
            ko = op(rows[rr[k][0]]["ptr"])
            if ko in STATUS_OPS:
                break
            if ko in PRINT_OPS:
                S, P = f, rr[k][0]
                F = first_change(P + 1)
                after = [desc(a, b, S) for (a, b) in rr[i:k + 1]]
                anim = next((desc(a, b, S) for (a, b) in rr[i:min(len(rr), k + 8)] if op(rows[a]["ptr"]) == "statusanimation"), None)
                G = max((x for x in gs if x < S), default=None)
                events.append({"statusLabel": lab(rows[S]["ptr"]), "statusOp": o, "S": S, "Sexec": g, "G": G, "printLabel": lab(P and rows[P]["ptr"]), "P": P,
                               "F": F, "printMinusStatus": P - S, "glyphMinusPrint": None if F is None else F - P,
                               "romOffSpan": None if F is None else F - (S + 1), "runs": after, "statusAnimation": anim})
                break
    return events, anims


out = {"schema": "off121-rom/v1", "scenarios": {}}
for name, meta in sorted(index.items()):
    stem = name[:-5]
    rec = {**meta}
    for mode in ("on", "off"):
        rows = json.load(open(os.path.join(probe_dir, f"{stem}-{mode}.json")))["rows"]
        ev, an = analyse(rows)
        rec[mode] = {"events": ev, "statusAnimations": an}
    out["scenarios"][stem] = rec
json.dump(out, open(out_path, "w"), indent=1)
print(f"off121Rom: {len(out['scenarios'])} scenarios")
