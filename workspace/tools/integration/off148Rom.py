#!/usr/bin/env python3
"""off148: off108Rom.py restricted to Scene OFF probes (docs/off148-scene-off-pauses-remainder.md); otherwise the same pointer-run table.

usage: off148Rom.py <probe-dir> <scenario-index.json> <out.json>      (<probe-dir>/<stem>-off.json)

off108's description follows.
off108: ROM anchors of every move use in the off108 lab scenarios (idle94Probe.py ON + OFF outputs; docs/off108-scene-off-pauses.md).
A use = the pointer run right after an `attackstring` (opcode 0x02 in the ROM image) or a `printstring STRINGID_EMPTYSTRING3` (0x10 0x30 0x01,
a two-turn move's charge-turn opener) while gBattleControllerExecFlags != 0: the "X used Y!" print (the next instruction waits for the controller). G = the last screen change inside that run (the final glyph),
so production's next command starts on the ROM frame G + 1 (idle98 §2, the accepted OFF hit-path anchor). G is taken as the release
row - 2 (the opener's next instruction leaves its controller wait two rows after the final glyph), which also anchors the 2-row EMPTYSTRING3 print. For every later pointer run up to
the next use: the battle-script label + byte offset (pokeemerald.map), its first frame - G (= the kernel's instructionExecution - u, the
production route's "delta" for the receipt the instruction emits), its length, gBattleControllerExecFlags / gAnimScriptActive, and the
screen changes inside it (- G). Scene ON and OFF are listed side by side; the OFF Pausex20 run and the BattleScript_MoveMissedPause /
ButItFailed pause runs are flagged.
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
EMPTYSTRING3 = bytes([0x30, 0x01])  # printstring STRINGID_EMPTYSTRING3 (304): a two-turn move's charge-turn opener
opcode = lambda p: ROM[p - 0x08000000] if 0x08000000 <= p < 0x08000000 + len(ROM) else None


def lab(p):
    i = bisect.bisect_right(addrs, p) - 1
    return f"{syms[i][1]}+{p - syms[i][0]}" if i >= 0 and p - syms[i][0] < 512 else hex(p)


def runs(rows):
    out, f = [], 0
    while f < len(rows):
        g = f
        while g + 1 < len(rows) and rows[g + 1]["ptr"] == rows[f]["ptr"]:
            g += 1
        out.append((f, g))
        f = g + 1
    return out


def uses(rows):
    rr = runs(rows)
    res = []
    for i, (f, g) in enumerate(rr):
        r = rows[f]
        if not f or not r["exec"] or opcode(rows[f - 1]["ptr"]) not in (0x02, 0x10):
            continue
        if opcode(rows[f - 1]["ptr"]) == 0x10 and ROM[rows[f - 1]["ptr"] - 0x08000000 + 1:rows[f - 1]["ptr"] - 0x08000000 + 3] != EMPTYSTRING3:
            continue
        ch = [x for x in range(f, g + 1) if rows[x]["scr"] != rows[x - 1]["scr"]]
        if not ch:
            continue
        # G = the release row - 2 (g = the last row the next instruction waits on the controller): the final glyph of a non-empty print
        # (37 / 37 attack strings here and idle98's), and the kernel's u for the 2-row EMPTYSTRING3 charge-turn print.
        res.append({"i": i, "mv": r["mv"], "atk": r["atk"], "G": g - 1, "lastChange": ch[-1], "firstGlyph": ch[0],
                    "opener": "EMPTYSTRING3" if opcode(rows[f - 1]["ptr"]) == 0x10 else "attackstring"})
    return rr, res


out = {"schema": "off148-rom/v1", "scenarios": {}}
for name, meta in sorted(index.items()):
    stem = name[:-5]
    rec = {**meta}
    for mode in ("off",):
        rows = json.load(open(os.path.join(probe_dir, f"{stem}-{mode}.json")))["rows"]
        rr, us = uses(rows)
        lst = []
        for k, u in enumerate(us):
            end = us[k + 1]["i"] if k + 1 < len(us) else len(rr)
            G = u["G"]
            seq = []
            for (f, g) in rr[u["i"] + 1:end]:
                ch = [x - G for x in range(f, g + 1) if x and rows[x]["scr"] != rows[x - 1]["scr"]]
                seq.append([lab(rows[f]["ptr"]), f - G, g - f + 1, rows[f]["exec"], rows[f]["act"], ch[:2] + ([ch[-1]] if len(ch) > 2 else []), len(ch)])
                if len(seq) >= 60:
                    break
            lst.append({"mv": u["mv"], "atk": u["atk"], "G": G, "lastChange": u["lastChange"], "openerFirstChange": u["firstGlyph"],
                        "opener": u["opener"], "runs": seq})
        rec[mode] = lst
    out["scenarios"][stem] = rec
json.dump(out, open(out_path, "w"), indent=1)
print(f"off148Rom: {len(out['scenarios'])} scenarios")
