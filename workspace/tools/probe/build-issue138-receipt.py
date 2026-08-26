#!/usr/bin/env python3
"""Join the two ISSUES #138 probe arms into one committed receipt.

usage: build-issue138-receipt.py <struggle-a> <struggle-b> <control-a> <control-b> <out>

Each arm is run TWICE from a fresh oracle; this script refuses to write unless
both runs of an arm are byte-identical, and records the sha256 of the arm's
probe JSON alongside the final framebuffer digest.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 6:
    raise SystemExit(f"usage: {sys.argv[0]} <s-a> <s-b> <c-a> <c-b> <out>")

paths = [Path(p) for p in sys.argv[1:5]]
OUT = Path(sys.argv[5])


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def arm(first: Path, second: Path) -> dict:
    d1, d2 = digest(first), digest(second)
    if d1 != d2:
        raise SystemExit(f"arm not deterministic: {first} {d1} != {second} {d2}")
    body = json.loads(first.read_text())
    return {"probeSha256": d1, "probe": body}


struggle = arm(paths[0], paths[1])
control = arm(paths[2], paths[3])


def turn3(body: dict, key: str) -> list:
    return [event for event in body[key] if event.get("turn") == 3]


def summary(body: dict) -> dict:
    return {
        "turn3NoValidMoves": turn3(body, "noValidMovesEvents"),
        "turn3CurrentMove": turn3(body, "currentMoveEvents"),
        "turn3PpDeduct": turn3(body, "ppDeductEvents"),
        "turn3Hp": turn3(body, "hpEvents"),
        "turn3Pp": turn3(body, "ppEvents"),
        "turn3Messages": [
            {"frame": m["frame"], "text": m["text"], "script": m["script"]}
            for m in body["messageEvents"] if m.get("turn") == 3
        ],
        "randomCallsPerTurn": body["randomCallsPerTurn"],
        "finalActives": body["final"]["actives"],
        "framebufferSha256": body["framebufferSha256"],
    }


receipt = {
    "schema": "issue138-encore-disable-off-receipt/v1",
    "issue": 138,
    "oracleProfile": "battle-scene-off",
    "sourceUnderTest": {
        "selectionOrder": "src/battle_main.c:4183-4197 -- AreAllMovesUnusable() first, encoredMove auto-confirm only in the else-if",
        "limitations": "src/battle_util.c:1094-1122 CheckMoveLimitations (Disable :1108-1109, Encore :1116-1117); :1125-1140 AreAllMovesUnusable",
        "execution": "src/battle_util.c:99-106 HandleAction_UseMove noValidMoves branch -> MOVE_STRUGGLE | HITMARKER_NO_PPDEDUCT",
        "selectionScript": "data/battle_scripts_1.s:3548-3550 BattleScript_NoMovesLeft -> printselectionstring STRINGID_PKMNHASNOMOVESLEFT (168)",
    },
    "arms": {
        "struggle": {
            "fixture": struggle["probe"]["fixture"],
            "probeSha256": struggle["probeSha256"],
            "summary": summary(struggle["probe"]),
        },
        "control": {
            "fixture": control["probe"]["fixture"],
            "probeSha256": control["probeSha256"],
            "summary": summary(control["probe"]),
        },
    },
    "romVerdict": {
        "struggle": (
            "turn 3: gProtectStructs[1].noValidMoves := TRUE during selection "
            "(gBattlescriptCurrInstr resolves to BattleScript_NoMovesLeft+3), "
            "gChosenMoveByBattler[1] stays 0, gCurrentMove := 165 (MOVE_STRUGGLE), "
            "HITMARKER_NO_PPDEDUCT set for the action, opponent PP unchanged, "
            "'Foe JOLTEON used STRUGGLE!' then 'Foe JOLTEON is hit with recoil!'"
        ),
        "control": (
            "turn 3: noValidMoves never set, gCurrentMove := 33 (TACKLE), "
            "PP slot 0 deducted 34 -> 33, no recoil"
        ),
    },
    "engineDivergence": None,
    "notes": [],
}

OUT.write_text(json.dumps(receipt, indent=2) + "\n")
print(f"wrote {OUT}")
