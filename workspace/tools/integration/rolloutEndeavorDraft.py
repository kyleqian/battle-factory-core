#!/usr/bin/env python3
"""rollout/endeavor: DRAFTED dense fixtures tools/integration/fixtures/rollout-endeavor/draft-<move>-<case>.json (schema prep10-adapter-draft/v1 shape, draft: true, consumedByTest: false)
from the two-fresh-run receipts fixtures/rollout-endeavor/probes/r1 (cmp r2).  usage (workspace root): python3 tools/integration/rolloutEndeavorDraft.py"""
import json
from pathlib import Path
FX = Path("tools/integration/fixtures/rollout-endeavor"); P = FX / "probes/r1"
rd = lambda n: json.load(open(P / n))
def body(b):
    a = b["atActivation"]
    return {"start": b["start"], "end": b["end"], "frames": (b["end"] - b["start"]) if b["end"] else None, "attacker": a["animAttacker"], "gAnimMovePower": a["gAnimMovePower"], "gBattleMovePower": a["gBattleMovePower"],
            "gDynamicBasePower": a["gDynamicBasePower"], "hp": [m["hp"] for m in a["mons"]], "status2": a["status2"]}
out = []
ROLL = [("rollout-endeavor-rollout-voltorb-onix.json", "player", "VOLTORB -> ONIX, no Defense Curl"), ("rollout-endeavor-rollout-opponent-voltorb.json", "opponent", "opponent VOLTORB -> player ONIX, no Defense Curl"),
        ("rollout-endeavor-rollout-defense-curl.json", "player", "SHUCKLE (Defense Curl first) -> BLISSEY")]
for fn, side, label in ROLL:
    d = rd(fn); att = 0 if side == "player" else 1
    bs = [b for b in d["bodies"] if b["move"] == 205]
    rows = []
    for b in bs:
        a = b["atActivation"]
        rows.append({**body(b), "rolloutTimer": a["ds"][att]["rolloutTimer"], "rolloutTimerStartValue": a["ds"][att]["rolloutTimerStartValue"], "romCounterRockFormula": a["counterRock"], "animBufferCounter": a["animPtrCounterRock"],
                     "defenseCurl": a["defenseCurl"], "requestPower": a["gAnimMovePower"]})
    fx = {"schema": "prep10-adapter-draft/v1", "DRAFT": "unverified by an adapter run", "draft": True, "move": "ROLLOUT", "side": side, "case": label, "scenario": "tools/battle-lab/" + fn,
          "verdict": "READY-WITH-CHANGE: RolloutCounter = rolloutTimerStartValues[attacker] - battlers[attacker].rolloutTimer (post rolloutdamagecalculation) at the MOVE_ANIMATION event; engine already matches ROM at every body",
          "consumedByTest": False, "bodies": rows, "engineReceipt": "fixtures/rollout-endeavor/engine-rollout.json"}
    out.append((f"draft-rollout-{side}-{'curl' if 'curl' in fn else 'plain'}.json", fx))
END = [("staged-endeavor-player.json", "player", "ordinary Factory route (battle 1, challenge 0, AI flags 0), staged Endeavor in slot 0", "first battle of a run, no CalculateBaseDamage before the activation"),
       ("rollout-endeavor-endeavor-player-ai4.json", "player", "lab, full AI flags (challenge 7), player Endeavor after the opponent's Quick Attack", "damagecalc of the faster opponent's move"),
       ("rollout-endeavor-endeavor-player-ai2.json", "player", "lab, CHECK_BAD_MOVE AI (challenge 2), player Endeavor after the opponent's Quick Attack", "damagecalc of the faster opponent's move"),
       ("rollout-endeavor-endeavor-tv-order.json", "player", "lab, challenge 0, player Endeavor after a not-very-effective Rock Slide; opponent only Harden", "Battle-TV TrySetBattleSeminarShow loop (last non-variable move of the player's moveset)"),
       ("rollout-endeavor-endeavor-ai2-opp.json", "opponent", "lab, CHECK_BAD_MOVE AI, opponent Endeavor in slot 0 (moves 283 x3 + Tackle); first action", "AI_CalcDmg (BattleAI scoring) during the decision")]
for fn, side, label, writer in END:
    d = rd(fn); att = 0 if side == "player" else 1
    bs = [b for b in d["bodies"] if b["move"] == 283]
    if not bs: continue
    b = bs[0]
    fx = {"schema": "prep10-adapter-draft/v1", "DRAFT": "unverified by an adapter run", "draft": True, "move": "ENDEAVOR", "side": side, "case": label, "scenario": ("tools/battle-lab/" + fn) if fn.startswith("rollout") else "--stage=" + side + ":283:5 (battle1-turn1 canonical route)",
          "verdict": "READY-WITH-CHANGE: request power = persistent presentation register of the last CalculateBaseDamage (rolloutEndeavor doc §2)", "consumedByTest": False, "staleWriter": writer,
          "bodies": [body(b)], "register": {"requestPower": b["atActivation"]["gAnimMovePower"], "writesBeforeActivation": [{"f": w["f"], "before": w["before"], "after": w["after"], "lastCaller": w["entries"][-1]["caller"].split("+")[0] if w["entries"] else None, "lastMove": w["entries"][-1]["currentMove"] if w["entries"] else None}
              for w in d["bmpWrites"] if (str(w["f"]).startswith("p") or w["f"] < b["start"])][-8:]}}
    out.append((f"draft-endeavor-{side}-{fn.replace('rollout-endeavor-endeavor-', '').replace('.json', '')}.json", fx))
for n, fx in out: (FX / n).write_text(json.dumps(fx, indent=1))
print(len(out), "drafts")
