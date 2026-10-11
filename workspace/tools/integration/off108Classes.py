#!/usr/bin/env python3
"""off108: the per-class Scene OFF pause rule, ROM vs production provenance (docs/off108-scene-off-pauses.md §1 / §2).

usage: off108Classes.py <rom.json> <route-dir> <out-dir>
<rom.json> = off108Rom.py output (lab scenarios, ON + OFF). <route-dir>/{off,on}-*.jsonl = off108Route.ts outputs (census battles).
ROM side, per lab use (G = the final glyph of the opener print; every number below is a ROM row - G, i.e. the kernel's
instructionExecution - u for the receipt that instruction emits): att = the attackanimation row (Scene OFF pushes BattleScript_Pausex20 on
the next row), the 32-row pause run (Pausex20 / MoveMissedPause / ButItFailed / a script `pause B_WAIT_TIME_SHORT`), afterAtt = the row
after waitanimation (att + 35 for an attack pause), next = the first presented anchor after the pause: a message's first glyph (its print
row + 2), a STATS_CHANGE activation (gAnimScriptActive rise), the HP bar's first change, k = next - afterAtt.
Production side, per class: the census uses of the move with the lab's receipt path (same follow labels), their kernel deltas
(attack receipt, the next presented receipt N), the frames production already presents between the opener and the attack receipt
(D_between), and the RULE: the pause command lasts P = delta(N) + lead(N) - D_between (lead = 1 for a message: its first glyph lands one
row after the print executes; 1 for a status-data receipt: Cmd_statusanimation is the next instruction; 0 for STATS_CHANGE and the HP bar).
check = the ROM anchor (next) - 1 == delta(N) + lead(N): the rule puts production's next command on the ROM row.
"""
import collections, glob, json, os, sys

rom_path, rdir, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
R = json.load(open(rom_path))["scenarios"]
PAUSES = ("BattleScript_Pausex20+0", "BattleScript_MoveMissedPause+0", "BattleScript_ButItFailed+0")
# (class, scenario stem, attacker battler, use ordinal of that attacker, move)
CASES = [
    ("stat self (Bulk Up)", "off108-bulk-up-ply-primeape-onix", 0, 0, 339),
    ("stat self (Double Team)", "off108-double-team-ply-primeape-onix", 0, 0, 104),
    ("stat target (Sand-Attack)", "off108-sand-attack-ply-primeape-snorlax", 0, 0, 28),
    ("status msg (Confuse Ray)", "off108-confuse-ray-ply-primeape-snorlax", 0, 0, 109),
    ("status (Toxic)", "off108-toxic-ply-primeape-onix", 0, 0, 92),
    ("status (Thunder Wave)", "off108-thunder-wave-ply-primeape-snorlax", 0, 0, 86),
    ("protect (Protect)", "off108-protect-ply-primeape-onix", 0, 0, 182),
    ("protect (Detect)", "off108-detect-ply-primeape-onix", 0, 0, 197),
    ("rest (Rest)", "off108-rest-ply-snorlax-onix", 0, 0, 156),
    ("two-turn charge (Dig)", "off108-dig-ply-primeape-snorlax", 0, 0, 91),
    ("two-turn charge (Razor Wind)", "off108-razor-wind-ply-primeape-snorlax", 0, 0, 13),
    ("two-turn charge (SolarBeam)", "off108-solar-beam-ply-primeape-snorlax", 0, 0, 76),
    ("failed (Snore awake: But it failed!)", "off108-snore-ply-primeape-snorlax", 0, 0, 173),
    ("miss (Dynamic Punch, player)", "off108-dynamic-punch-ply-machamp-snorlax", 0, 0, 223),
    ("miss (Dynamic Punch, opponent)", "off108-dynamic-punch-opp-machamp-snorlax", 1, 0, 223),
    ("protect-blocked (Tackle vs Protect)", "off108-protect-ply-primeape-onix", 1, 0, 33),
    ("protect-blocked (Tackle vs Detect)", "off108-detect-ply-primeape-onix", 1, 0, 33),
]


def rom_use(stem, mode, atk, ordinal):
    us = [u for u in R[stem][mode] if u["atk"] == atk]
    return us[ordinal] if ordinal < len(us) else None


def rom_anchors(u):
    runs = u["runs"]
    out = {"G": u["G"], "opener": u["opener"], "pauses": [], "att": None, "afterAtt": None, "next": None, "nextKind": None, "statusAnim": None, "path": []}
    for i, (lab, d, n, ex, act, ch, nch) in enumerate(runs):
        if lab.startswith("BattleScript_MoveEnd"):
            break
        out["path"].append([lab, d, n])
        if out["statusAnim"] is None and out["att"] is not None and lab.startswith("BattleScript_MoveEffect") and lab.endswith("+0"):
            out["statusAnim"] = d  # Cmd_statusanimation's row (skipped under HITMARKER_NO_ANIMATIONS in Scene OFF)
        if n == 32 and (lab in PAUSES or True) and lab.endswith("+0") or (n == 32 and lab in PAUSES):
            out["pauses"].append([lab, d])
            if lab == "BattleScript_Pausex20+0" and out["att"] is None:
                out["att"] = runs[i - 1][1]
                out["afterAtt"] = out["att"] + 35
        if out["next"] is None and nch and d >= (out["afterAtt"] or 0) and (out["pauses"] or out["att"] is not None):
            if act:
                out["next"], out["nextKind"] = d, "STATS_CHANGE activation (act rise)"
            else:
                out["next"], out["nextKind"] = ch[0], f"first change in {lab} (exec {ex})"
    if out["afterAtt"] is not None and out["next"] is not None:
        out["k"] = out["next"] - out["afterAtt"]
    return out


def prod_samples(scene, move, labels_hint):
    res = []
    for f in sorted(glob.glob(os.path.join(rdir, f"{scene}-*.jsonl"))):
        for line in open(f):
            if not line.strip():
                continue
            u = json.loads(line)
            if u["move"] == move:
                res.append(u)
    return res


MOVES_ANY = sorted({json.loads(l)["move"] for f in glob.glob(os.path.join(rdir, "off-*.jsonl")) for l in open(f) if l.strip()} - {None})
PRESENTED = ("message", "stat-stage-change", "set-battler-status-data", "health-bar-update", "status-icon-update")
LEAD = {"message": 1, "set-battler-status-data": 1, "STATS_CHANGE": 0, "health-bar-update": 0}


def prod_sig(u):
    """the receipt path after the opener: the attack receipt, the first presented receipt after it (N), D_between"""
    att = u["attack"]
    follow = u["follow"]
    seqs_cmd = {c[0]: c for c in u["commands"]}
    used_seq = min(c[0] for c in u["commands"]) if u["commands"] else None
    if att is None:  # no attack receipt: the first presented receipt (a miss / failed message)
        n = next((r for r in follow if r[1] == "message"), None)
        return {"att": None, "N": n, "lead": LEAD.get("message"), "D_between": 0, "path": [r[2] or r[1] for r in follow[:4]]}
    before = [c for c in u["commands"] if used_seq is not None and used_seq < c[0] < att[0]]
    d_between = sum((c[2] or 0) + (c[3] or 0) for c in before)
    after = [r for r in follow if r[0] > att[0]]
    n = next((r for r in after if (r[1] == "animation" and r[2] == "STATS_CHANGE") or r[1] in ("message", "set-battler-status-data", "health-bar-update")), None)
    kind = None if n is None else ("STATS_CHANGE" if n[2] == "STATS_CHANGE" else n[1])
    return {"att": att[4], "attLabel": att[3], "N": n, "Nkind": kind, "lead": LEAD.get(kind), "D_between": d_between,
            "between": [c[1] for c in before], "path": [r[2] or r[1] for r in after[:3]]}


table = []
for cls, stem, atk, ordinal, move in CASES:
    row = {"class": cls, "scenario": stem, "attacker": atk, "move": move}
    for mode in ("off", "on"):
        u = rom_use(stem, mode, atk, ordinal)
        row[f"rom_{mode}"] = None if u is None else rom_anchors(u)
    samples = prod_samples("off", move, None) if move != 33 else [x for m in MOVES_ANY for x in prod_samples("off", m, None)]
    sigs = collections.Counter()
    ex = {}
    for s in samples:
        if s["attacker"] is None:
            continue
        p = prod_sig(s)
        if move == 33 and not (p["att"] is None and p["N"] and p["N"][2] == "STRINGID_PKMNPROTECTEDITSELF"):
            continue  # any move blocked by Protect / Detect runs the same BattleScript_PrintMoveMissed path
        key = json.dumps({k: v for k, v in p.items() if k != "N"} | {"N": None if p["N"] is None else [p["N"][1], p["N"][2], p["N"][3], p["N"][4]]}, sort_keys=True)
        sigs[key] += 1
        ex.setdefault(key, s["seed"])
    rom = row["rom_off"]
    pick = None
    for key, n in sigs.most_common():
        p = json.loads(key)
        if rom and rom["G"] > 0 and p["N"] is not None and rom["next"] is not None and ((p["att"] is None) == (rom["att"] is None)):
            if p["att"] is not None and p["att"] != rom["att"]:
                continue
            pick = (key, n)
            break
    on = row["rom_on"]
    if rom and on:
        # scene independence of everything outside attackanimation .. waitanimation: the pause-path classes (miss / failed / blocked) must
        # be identical ON vs OFF (same pause runs, same next anchor); attack-pause classes compare G and att only
        row["onVsOff"] = {"pausePathSame": rom["att"] is None and on["pauses"] == rom["pauses"] and on["next"] == rom["next"]}
    row["prodSamples"] = sum(sigs.values())
    if pick:
        p = json.loads(pick[0])
        row["prod"] = p | {"samples": pick[1], "exampleSeed": ex[pick[0]]}
        dN, lead = p["N"][3], p["lead"]
        # the ROM anchor of N's command start, as a row - (G + 1): a message's first glyph - 1; a STATS_CHANGE activation - 1; a status-data
        # receipt: Cmd_statusanimation's row (it executes one row later; Scene OFF draws nothing there)
        anchor = rom["statusAnim"] if p.get("Nkind") == "set-battler-status-data" else rom["next"] - 1
        if lead is not None and anchor is not None:
            row["rule"] = {"P": dN + lead - p["D_between"], "romAnchor": anchor, "deltaNplusLead": dN + lead, "check": anchor == dN + lead,
                           "baseResidual": p["D_between"] - anchor}  # base production start of N vs the ROM anchor (rows)
    table.append(row)

json.dump({"schema": "off108-classes/v1", "rows": table}, open(os.path.join(out, "classes.json"), "w"), indent=1)
with open(os.path.join(out, "classes.tsv"), "w") as t:
    t.write("class\tG\tatt\tpause rows\tafterAtt\tnext\tk\tnext kind\tprod N (kernel delta)\tlead\tD_between\tP (rule)\tcheck\tbase residual\tsamples\n")
    for r in table:
        ro, p, ru = r["rom_off"] or {}, r.get("prod") or {}, r.get("rule") or {}
        t.write("\t".join(str(x) for x in [r["class"], ro.get("G"), ro.get("att"), ";".join(f"{a}@{b}" for a, b in ro.get("pauses", [])), ro.get("afterAtt"),
                ro.get("next"), ro.get("k"), ro.get("nextKind"), None if not p.get("N") else f"{p['N'][1] or p['N'][0]}@{p['N'][3]}", p.get("lead"),
                p.get("D_between"), ru.get("P"), ru.get("check"), ru.get("baseResidual"), p.get("samples")]) + "\n")
ok = sum(1 for r in table if (r.get("rule") or {}).get("check"))
pp = [r for r in table if r["rom_off"] and r["rom_off"]["att"] is None]
print(f"pause-path classes ON == OFF (pause runs + next anchor): {sum(r['onVsOff']['pausePathSame'] for r in pp)} / {len(pp)}")
print(f"off108Classes: {len(table)} classes, rule check {ok} / {sum(1 for r in table if r.get('rule'))}")
