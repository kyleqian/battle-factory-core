#!/usr/bin/env python3
"""Fold two byte-identical runs of probe-rcp143-random-callers.py into one
committed STEP rcp143 receipt (ROM side only; the TS verify script adds the
port side with --write).

    python3 tools/probe/build-rcp143-receipt.py <spec.json> <run1.json> <run2.json> <out.json>

`spec.json` carries the receipt's identity (receipt id, issue, source/port
citations, notes); this script only adds measured data.  ROM draws are split
into turns at each `BattleTurnPassed` draw (`battle_main.c:4013`, the turn's
last draw); AI-selection draws (`BattleAI_*` / `ChooseMoveOrAction_*`, which
the kernel does not own) are counted per turn and listed separately.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(f"usage: {sys.argv[0]} <spec.json> <run1.json> <run2.json> <out.json>")
SPEC, RUN1, RUN2, OUT = (Path(arg) for arg in sys.argv[1:])
AI_PREFIXES = ("BattleAI_", "ChooseMoveOrAction", "AI_", "Cmd_if_random", "Cmd_get_", "ShouldSwitch")


def caller_function(caller: str) -> str:
    return caller.split("+")[0]


def main() -> None:
    spec = json.loads(SPEC.read_text())
    raw1, raw2 = RUN1.read_bytes(), RUN2.read_bytes()
    run = json.loads(raw1)
    sha1, sha2 = hashlib.sha256(raw1).hexdigest(), hashlib.sha256(raw2).hexdigest()
    attribution = run["attribution"]
    if not attribution["reconciled"]:
        raise SystemExit("attribution pass did not reconcile with the sRandCount pass")

    turns: list[dict] = []
    current: dict = {"turn": 1, "aiSelectionDraws": [], "draws": []}
    for hit in attribution["hits"]:
        entry = {
            "frame": hit["frame"],
            "caller": hit["caller"],
            "callerFunction": caller_function(hit["caller"]),
            "rngBefore": hit["rngBefore"],
            "value": hit["value"],
            "script": hit["script"],
            "attacker": hit["attacker"],
            "currentMove": hit["currentMove"],
        }
        if entry["callerFunction"].startswith(AI_PREFIXES):
            current["aiSelectionDraws"].append(entry)
        else:
            current["draws"].append(entry)
        if entry["callerFunction"] == "BattleTurnPassed":
            turns.append(current)
            current = {"turn": current["turn"] + 1, "aiSelectionDraws": [], "draws": []}
    incomplete = current if (current["draws"] or current["aiSelectionDraws"]) else None

    # Active battlers' HP at each turn's BattleTurnPassed frame, replayed from
    # the per-frame watch transitions (activeHp only appears when it changes).
    hp = run["initial"]["activeHp"]
    hp_by_frame: list[tuple[int, list[int]]] = []
    for transition in run["transitions"]:
        if "activeHp" in transition["changed"]:
            hp = transition["changed"]["activeHp"][1]
            hp_by_frame.append((transition["frame"], hp))

    def hp_at(frame: int) -> list[int]:
        value = run["initial"]["activeHp"]
        for at, seen in hp_by_frame:
            if at <= frame:
                value = seen
        return value

    messages = [m for m in run["messages"] if m["text"].strip()]
    receipt = {
        **spec,
        "oracleProfile": run["oracleProfile"],
        "seed": run["seed"],
        "runs": 2,
        "probeOutputSha256": sha1,
        "probeOutputSha256Rerun": sha2,
        "byteIdenticalAcrossRuns": sha1 == sha2,
        "drawCountCrossChecked": run["drawCountCrossChecked"],
        "attributionReconciled": attribution["reconciled"],
        "framebufferSha256": run["framebufferSha256"],
        "parties": run["parties"],
        "rom": {
            "totalRandomCalls": run["totalRandomCalls"],
            "attributionWindow": attribution["window"],
            "turns": [
                {
                    "turn": turn["turn"],
                    "aiSelectionDrawCount": len(turn["aiSelectionDraws"]),
                    "aiSelectionDraws": turn["aiSelectionDraws"],
                    "drawCount": len(turn["draws"]),
                    "activeHpAtTurnEnd": hp_at(turn["draws"][-1]["frame"]),
                    "draws": turn["draws"],
                }
                for turn in turns
            ],
            "incompleteTailDraws": incomplete,
            "messages": messages,
            "final": run["final"],
        },
    }
    OUT.write_text(json.dumps(receipt, indent=1) + "\n")
    print(f"wrote {OUT}: turns={len(turns)} identical={sha1 == sha2}")


if __name__ == "__main__":
    main()
