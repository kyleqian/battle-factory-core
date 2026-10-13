#!/usr/bin/env python3
"""off148: anchor check of the Scene OFF no-hit pause remainder (docs/off148-scene-off-pauses-remainder.md).

usage: off148Verify.py <off148-rom.json> <off108-rom.json> <base-route-dir> <final-route-dir> <out.json>
ROM side (Scene OFF probes, G = the opener's final glyph = release row - 2, off108Rom.py): per scenario, the attackanimation row (the
pointer run right before BattleScript_Pausex20+0) and N's anchor: a print = its first glyph (the first screen change of the waitmessage
run; the print executes 2 rows before), STATS_CHANGE = A + 1 (A = the gAnimScriptActive rise; playanimation executes on A - 1; the
stats-change command's age 0 is A + 1, olnd113), the HP bar = the healthbarupdate row + 1 (the first HP-bar change is one row later, as
on the accepted hit path). Production side (off108Route.ts census routes, Scene OFF): every use of the class's move whose kernel
signature equals the ROM rows and whose attacker is on the probe's side (attack receipt delta == the ROM attackanimation row; N's delta == N's executing row; for Rest, where the
waitmessage breaks the mapping before the attack, N delta - attack delta == N row - attackanimation row), and N's command start
G + 1 + (frames of the commands after the opener before N's command). Residual = production start - ROM anchor, base and final.
"""
import collections, glob, json, os, sys

rom148_path, rom108_path, base_dir, final_dir, out_path = sys.argv[1:6]
CLASSES = [  # (name, rom file, scenario, move, N kind, skipped stage receipts)
    ("Curse (player)", "148", "off148-curse-ply", 174, "message"),
    ("Curse (opponent)", "148", "off148-curse-opp", 174, "message"),
    ("Swagger", "148", "off148-swagger-ply", 207, "STATS_CHANGE"),
    ("Flatter", "148", "off148-flatter-ply", 260, "STATS_CHANGE"),
    ("Rest", "108", "off108-rest-ply-snorlax-onix", 156, "health-bar-update"),
]
roms = {"148": json.load(open(rom148_path)), "108": json.load(open(rom108_path))}


def rom_anchor(scn, move, kind):
    use = next(u for u in scn["off"] if u["mv"] == move)
    runs = use["runs"]
    k = next(i for i, r in enumerate(runs) if r[0] == "BattleScript_Pausex20+0")
    att = runs[k - 1][1]
    after = runs[k:]
    if kind == "message":
        r = next(r for r in after if r[6] > 0)
        return {"G": use["G"], "att": att, "nExec": r[5][0] - 2, "anchor": r[5][0], "firstChange": r[5][0]}
    if kind == "STATS_CHANGE":
        r = next(r for r in after if r[4] == 1)
        return {"G": use["G"], "att": att, "nExec": r[1] - 1, "anchor": r[1] + 1, "firstChange": r[5][0]}
    r = next(r for r in after if r[6] > 0)  # datahpupdate's wait: starts the row after healthbarupdate
    return {"G": use["G"], "att": att, "nExec": r[1] - 1, "anchor": r[1], "firstChange": r[5][0]}


def load(d):
    res = []
    for f in sorted(glob.glob(os.path.join(d, "off-*.jsonl"))):
        res += [json.loads(line) for line in open(f) if line.strip()]
    return res


def production(y, kind):
    att = y["attack"]
    if att is None or y["hit"] or att[2] != "SCENE_OFF_ATTACK_PAUSE":
        return None
    after = [r for r in y["follow"] if r[0] > att[0] and r[1] not in ("set-battler-pp-data", "play-se", "stat-stage-change")]
    if not after:
        return None
    n = after[0]
    if (n[2] if kind == "STATS_CHANGE" else n[1]) != kind:
        return None
    cmds = y["commands"]
    start, found = 1 + (cmds[0][3] or 0) if cmds else 1, None  # the opener's own hold runs after G (olnd113 startOfN)
    for c in cmds[1:]:
        if c[0] == n[0]:
            found = start
            break
        start += c[2] + (c[3] or 0)
    return {"attDelta": att[4], "nDelta": n[4], "start": found, "pause": next((c[2] for c in cmds if c[0] == att[0] and c[1] == "move-animation"), 0)}


base, final = load(base_dir), load(final_dir)
out = {"schema": "off148-verify/v1", "classes": []}
for name, rom, scenario, move, kind in CLASSES:
    a = rom_anchor(roms[rom]["scenarios"][scenario], move, kind)
    anchor, att, nexec = a["anchor"], a["att"], a["nExec"]  # off108Rom rows are already relative to G
    row = {"class": name, "move": move, "N": kind, "romAttRow": att, "romNExecRow": nexec, "romAnchor": anchor,
           "romFirstChange": a["firstChange"]}
    for label, routes in (("base", base), ("final", final)):
        res, pauses, n = collections.Counter(), collections.Counter(), 0
        for y in routes:
            if y["move"] != move or y["attacker"] != (1 if scenario.endswith("-opp") else 0):
                continue
            p = production(y, kind)
            if p is None or p["start"] is None:
                continue
            if rom == "108":
                if p["nDelta"] - p["attDelta"] != nexec - att:
                    continue
            elif p["attDelta"] != att or p["nDelta"] != nexec:
                continue
            n += 1
            res[p["start"] - anchor] += 1
            pauses[p["pause"]] += 1
        row[label] = {"bodies": n, "residual": dict(res), "pause": dict(pauses)}
    row["exact"] = row["final"]["bodies"] > 0 and set(row["final"]["residual"]) == {0}
    out["classes"].append(row)
out["exactClasses"] = sum(r["exact"] for r in out["classes"])
json.dump(out, open(out_path, "w"), indent=1)
for r in out["classes"]:
    print(f"{r['class']:18} N={r['N']:18} ROM att {r['romAttRow']:4} N exec {r['romNExecRow']:4} anchor {r['romAnchor']:4} "
          f"| base {r['base']['bodies']:4} {r['base']['residual']} | final {r['final']['bodies']:4} {r['final']['residual']} P {r['final']['pause']}")
print(f"off148Verify: {out['exactClasses']} / {len(out['classes'])} classes at residual 0")
