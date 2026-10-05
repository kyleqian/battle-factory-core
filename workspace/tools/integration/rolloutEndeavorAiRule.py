#!/usr/bin/env python3
"""Checks the AI-decision stale-power rule against the ROM receipts (probes/r1/*aiorder*): register after the first AI decision (bmpAfterPrepare) ==
CHECK_BAD_MOVE-only AI (challenge 2-3): table power of the LAST slot with power>1 and effect not in sIgnoredPowerfulMoveEffects;
full AI (challenge>=4 / Frontier Brain): table power of the LAST slot with power>=2 (TryToFaint if_can_faint(considered) adds the ignored-effect moves).
usage (workspace root): python3 tools/integration/rolloutEndeavorAiRule.py   (exit 1 on a mismatch)"""
import json, glob, sys
POWER = {33: 35, 157: 75, 98: 40, 283: 1, 153: 250}; IGNORED = {153}   # Explosion's effect is in sIgnoredPowerfulMoveEffects (battle_ai_script_commands.c:266-281)
bad = 0; rows = []
for f in sorted(glob.glob("tools/integration/fixtures/rollout-endeavor/probes/r1/*aiorder*.json")):
    d = json.load(open(f)); sc = json.load(open("tools/battle-lab/" + d["scenario"]))
    moves = sc["overrides"]["parties"]["opponent"][0]["moves"]; full = "-ai4-" in d["scenario"]
    el = [m for m in moves if POWER[m] > (1 if not full else 1) and (full or m not in IGNORED)]
    pred = POWER[el[-1]]
    rows.append((d["scenario"].split("aiorder-")[1], moves, "full" if full else "CBM", d["bmpAfterPrepare"], pred, d["bmpAfterPrepare"] == pred)); bad += d["bmpAfterPrepare"] != pred
for r in rows: print(*r)
print("mismatches:", bad); sys.exit(1 if bad else 0)
