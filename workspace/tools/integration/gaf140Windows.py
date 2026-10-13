#!/usr/bin/env python3
"""gaf140 (docs/gaf140-status-gate-age.md): the IsBattleSEPlaying-gated Scene ON status-animation windows = every seg127 receipt with
gate > 0 (tools/integration/fixtures/seg127/receipts/rom-r1.json; its committed scenarios, lab seeds as committed). Per window: the
afflicted battler (hit secondary / Yawn: the target; contact ability: the attacker), the B_ANIM_STATUS_* from the instruction's battle
script label, seg127's X (the instruction's last row), poll (X + 1) and gate (launch row R = poll + gate).
usage: gaf140Windows.py <out.json>
"""
import json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
SEG = os.path.join(ROOT, "tools/integration/fixtures/seg127")
ANIM = {"BattleScript_MoveEffectBurn": "BRN", "BattleScript_MoveEffectFreeze": "FRZ", "BattleScript_MoveEffectConfusion": "CONFUSION",
        "BattleScript_MoveEffectPoison": "PSN", "BattleScript_MoveEffectParalysis": "PRZ", "BattleScript_CuteCharmActivates": "INFATUATION",
        "BattleScript_YawnMakesAsleep": "SLP"}
rom = json.load(open(os.path.join(SEG, "receipts/rom-r1.json")))["scenarios"]
out = {}
for stem, v in rom.items():
    for r in v["statusAnimations"]:
        if r["gate"] <= 0:
            continue
        attacker = 0 if v["attackerSide"] == "player" else 1
        battler = attacker if v["class"].startswith("contact-ability") else 1 - attacker
        out[stem] = {"class": v["class"], "attackerSide": v["attackerSide"], "attacker": v["attacker"], "target": v["target"],
                     "seed": v["seed"], "label": r["label"], "animation": ANIM[r["label"].split("+")[0]], "battler": battler,
                     "X": r["X"], "poll": r["poll"], "gate": r["gate"], "R": r["poll"] + r["gate"], "activeRows": r["activeRows"],
                     "nextRow": r["nextRow"], "scenario": f"tools/integration/fixtures/seg127/scenarios/{stem}.json"}
json.dump(out, open(sys.argv[1], "w"), indent=1)
open(sys.argv[1], "a").write("\n")
print(len(out), "gated windows")
