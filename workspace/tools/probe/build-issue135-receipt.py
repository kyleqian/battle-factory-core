#!/usr/bin/env python3
"""Fold the two ISSUES #135 probe runs into one semantic receipt.

usage: build-issue135-receipt.py <intercept-r1> <intercept-r2> <control-r1> <control-r2> <out.json>

Each arm must be byte-identical across its two fresh-oracle runs; the digest
of the raw probe output is recorded per arm.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 6:
    raise SystemExit(__doc__)

paths = [Path(p) for p in sys.argv[1:5]]
OUT = Path(sys.argv[5])


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(a: Path, b: Path) -> tuple[dict, str]:
    da, db = digest(a), digest(b)
    if da != db:
        raise SystemExit(f"arm not reproducible: {a} {da} != {b} {db}")
    return json.loads(a.read_text()), da


intercept, intercept_digest = load(paths[0], paths[1])
control, control_digest = load(paths[2], paths[3])


def transitions_of(run: dict, key: str) -> list[dict]:
    return [
        {"frame": t["frame"], "from": t["changed"][key][0], "to": t["changed"][key][1],
         "script": t["state"]["script"]}
        for t in run["transitions"] if key in t["changed"]
    ]


def window(run: dict, lo: int, hi: int) -> dict:
    dmg = [t for t in transitions_of(run, "battleMoveDamage") if lo <= t["frame"] <= hi]
    hp = [
        {"frame": t["frame"], "from": t["changed"]["playerPartyHp"][0],
         "to": t["changed"]["playerPartyHp"][1], "script": t["state"]["script"]}
        for t in run["transitions"]
        if "playerPartyHp" in t["changed"] and lo <= t["frame"] <= hi
    ]
    draws = [r for r in run["randomEvents"] if lo <= r["frame"] <= hi]
    return {
        "frameWindow": [lo, hi],
        "battleMoveDamageTransitions": dmg,
        "playerPartyHpTransitions": hp,
        "randomDraws": draws,
        "randomDrawCount": sum(r["calls"] for r in draws),
    }


receipt = {
    "schema": "issue135-pursuit-switch-off-receipt/v1",
    "issue": 135,
    "oracleProfile": "battle-scene-off",
    "dmgMultiplierByteOffset": intercept["dmgMultiplierOffset"],
    "dmgMultiplierOffsetDerivation": (
        "include/battle.h:489-518 struct BattleScripting: s32 painSplitHp @0, "
        "s32 bideDmg @4, u8 multihitString[6] @8..13, u8 dmgMultiplier @14, "
        "u8 twoTurnsMoveStringId @15, u8 animArg1 @16, u8 animArg2 @17, "
        "u16 tripleKickPower @18, u8 moveendState @20 (cross-checked against "
        "ISSUES #129's probe, which read moveendState at gBattleScripting+20)."
    ),
    "sourceUnderTest": {
        "setbyte": "data/battle_scripts_1.s:3089 BattleScript_ActionSwitch `setbyte sDMG_MULTIPLIER, 2`",
        "entry": "data/battle_scripts_1.s:3094-3096 goto BattleScript_PursuitSwitchDmgLoop",
        "hitScript": "data/battle_scripts_1.s:3123-3148 BattleScript_PursuitDmgOnSwitchOut",
        "consumer": "src/battle_script_commands.c:1296 Cmd_damagecalc",
        "variance": "src/battle_script_commands.c:1638-1650 ApplyRandomDmgMultiplier (one Random())",
        "physicality": "TYPE_DARK > TYPE_MYSTERY, so Pursuit is a SPECIAL move in Gen 3 (spAttack 85 vs spDefense 50)",
    },
    "fixture": {
        "cards": {
            "intercept": "tools/battle-lab/issue135-pursuit-switch-intercept-off.json",
            "control": "tools/battle-lab/issue135-pursuit-switch-control-off.json",
        },
        "seed": intercept["seed"],
        "parties": intercept["parties"],
        "note": (
            "The battle-lab checkpoint already sits inside turn 1's action selection with "
            "the AI committed, so both arms act on TURN 1 with the player lead at full HP. "
            "The opponent lead's four slots are all MOVE_PURSUIT (one legal AI choice)."
        ),
    },
    "arms": {
        "intercept": {
            "playerAction": "party menu, switch slot 0 -> slot 1",
            "digest": intercept_digest,
            "dmgMultiplierTransitions": transitions_of(intercept, "dmgMultiplier"),
            "pursuitHit": window(intercept, 380, 640),
            "totalRandomCalls": intercept["totalRandomCalls"],
            "messageEvents": intercept["messageEvents"],
        },
        "control": {
            "playerAction": "FIGHT, move slot 0 (DEFENSE_CURL); PERSIAN is faster so Pursuit lands first",
            "digest": control_digest,
            "dmgMultiplierTransitions": transitions_of(control, "dmgMultiplier"),
            "pursuitHit": window(control, 60, 240),
            "totalRandomCalls": control["totalRandomCalls"],
            "messageEvents": control["messageEvents"][:10],
        },
    },
    "finals": {
        "intercept": intercept["final"],
        "control": control["final"],
    },
}
OUT.write_text(json.dumps(receipt, indent=2) + "\n")
print(f"wrote {OUT}")
