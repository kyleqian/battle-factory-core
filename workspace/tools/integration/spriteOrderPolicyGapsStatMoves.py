#!/usr/bin/env python3
"""Enumerate, from the pokeemerald sources, the moves whose battle script runs `statbuffchange` BEFORE `attackanimation` (the leading `stat` presentation
command) and then `playanimation B_ANIM_STATS_CHANGE` after it. Writes fixtures/sprite-order-policy-gaps/stat-moves.json.
usage: python3 tools/integration/spriteOrderPolicyGapsStatMoves.py [--write]"""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
R = ROOT / "reference/pokeemerald"
S = (R / "data/battle_scripts_1.s").read_text()
labels, cur = {}, None
for i, line in enumerate(S.splitlines(), 1):
    m = re.match(r"^(\w+)::?\s*$", line)
    if m:
        cur = m.group(1); labels[cur] = {"line": i, "body": []}; continue
    if cur: labels[cur]["body"].append(line.split("@")[0].strip())
table = re.search(r"^gBattleScriptsForMoveEffects::\n(.*?)\n\n", S, re.S | re.M).group(1)
script_by_effect = re.findall(r"\.4byte (\w+)", table)
effects = re.findall(r"#define (EFFECT_\w+)\s+(\d+)", (R / "include/constants/battle_move_effects.h").read_text())
name_by_id = {int(v): k for k, v in effects}
moves = (R / "src/data/battle_moves.h").read_text()
move_consts = {k: int(v) for k, v in re.findall(r"#define (MOVE_\w+)\s+(\d+)", (R / "include/constants/moves.h").read_text())}
move_effect = {}
for m in re.finditer(r"\[(MOVE_\w+)\]\s*=\s*\{\s*\.effect = (EFFECT_\w+)", moves):
    move_effect[m.group(1)] = m.group(2)


# explicit, source-line-backed families: both generic scripts share the shape; effects reach them via `setstatchanger ...; goto BattleScript_EffectStatUp/Down`
ORDER = list(labels)  # file order: a script without a terminal opcode falls through into the next label
TERMINAL = ("goto ", "end", "return")


def successors(lab):
    body = labels.get(lab, {"body": []})["body"]
    out = {l.split()[-1] for l in body if l.startswith("goto ")}
    if not any(l.startswith(TERMINAL) for l in body) and lab in ORDER and ORDER.index(lab) + 1 < len(ORDER):
        out.add(ORDER[ORDER.index(lab) + 1])
    return out


def reaches(script, target):
    """target reachable from `script` through goto / fall-through hops (generic stat scripts are `setstatchanger ...` + fall-through or goto)."""
    frontier = {script}
    for _ in range(4):
        if target in frontier: return True
        frontier = frontier | {n for lab in frontier for n in successors(lab)}
    return target in frontier


fam = {}
for eid, script in enumerate(script_by_effect):
    for target, key in (("BattleScript_EffectStatUp", "statUp"), ("BattleScript_EffectStatUpAfterAtkCanceler", "statUp"), ("BattleScript_EffectStatDown", "statDown")):
        if reaches(script, target):
            fam[name_by_id.get(eid, str(eid))] = key
mv = {k: [] for k in ("statUp", "statDown")}
for m, e in move_effect.items():
    if e in fam: mv[fam[e]].append({"move": m, "id": move_consts[m], "effect": e})
res = {"schema": "sprite-order-policy-gaps-stat-moves/v1",
       "source": {"statUp": f"data/battle_scripts_1.s:{labels['BattleScript_EffectStatUp']['line']} (attackcanceler, attackstring, ppreduce, statbuffchange @494, attackanimation @499, waitanimation, setgraphicalstatchangevalues, playanimation B_ANIM_STATS_CHANGE @503)",
                  "statDown": f"data/battle_scripts_1.s:{labels['BattleScript_EffectStatDown']['line']} (statbuffchange @540, attackanimation @546, waitanimation, setgraphicalstatchangevalues, playanimation @549)"},
       "effects": fam, "moves": mv, "counts": {k: len(v) for k, v in mv.items()}}
prod = set(re.findall(r'"(\d+:(?:player|opponent))"', (ROOT / "src/engine/spriteOrderProductionPlans.ts").read_text()))
ext = json.loads((ROOT / "tools/integration/fixtures/sprite-order-body-plans-ext.json").read_text())["bodies"]
cov = {}
for k in ("statUp", "statDown"):
    for m in mv[k]:
        row = cov.setdefault(m["move"], {"id": m["id"], "families": []})
        row["families"].append(k)
for name, row in cov.items():
    row["productionBody"] = {side: f"{row['id']}:{side}" in prod for side in ("player", "opponent")}
    row["observedVerdict"] = {side: ext.get(f"{row['id']}:{side}", {}).get("verdict") for side in ("player", "opponent")}
res["coverage"] = cov
res["coverageSummary"] = {"moves": len(cov), "withProductionBodyBothSides": sum(all(r["productionBody"].values()) for r in cov.values()),
                          "withProductionBodyAnySide": sum(any(r["productionBody"].values()) for r in cov.values()),
                          "needsKeysAnySide": sorted(n for n, r in cov.items() if "NEEDS-KEYS" in r["observedVerdict"].values())}
print(json.dumps(res["coverageSummary"]))
print(json.dumps(res["counts"]), len(fam), "effects"); print(sorted(fam.items())[:60])
if "--write" in sys.argv:
    (ROOT / "tools/integration/fixtures/sprite-order-policy-gaps/stat-moves.json").write_text(json.dumps(res, indent=1) + "\n")
