#!/usr/bin/env python3
"""Fold two byte-identical runs of probe-rcp154-action-time.py into one
committed STEP rcp154 receipt (ROM side only; tools/probe/verify-rcp154.ts
adds the port side with --write).

    python3 tools/probe/build-rcp154-receipt.py <spec.json> <run1.json> <run2.json> <out.json> [PNGDIR]

Same fold as tools/probe/build-rcp143-receipt.py (draws split into turns at
each `BattleTurnPassed` draw, AI-selection draws counted per turn and listed
separately), plus the action-time evidence this step is about:

* `turns[].actions`: every `HandleAction_UseMove` dispatch of the turn (the
  frame `gCurrentActionFuncId` leaves B_ACTION_USE_MOVE for
  B_ACTION_EXEC_SCRIPT), with the attacker, its active species and moves, the
  move it ran (`gCurrentMove`), `gCurrMovePos`, `gChosenMoveByBattler` and the
  attacker's Encore fields at that frame.
* `turns[].actionCursor`: every `gCurrentTurnActionNumber` change, so a
  skipped action (no dispatch between two increments) is visible.
* `pngEvidence`: the per-message PNG hashes, if the run saved them; the
  optional PNGDIR is only used to assert the files exist.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) not in (5, 6):
    raise SystemExit(f"usage: {sys.argv[0]} <spec.json> <run1.json> <run2.json> <out.json> [PNGDIR]")
SPEC, RUN1, RUN2, OUT = (Path(arg) for arg in sys.argv[1:5])
PNG_DIR = Path(sys.argv[5]) if len(sys.argv) == 6 else None
AI_PREFIXES = ("BattleAI_", "ChooseMoveOrAction", "AI_", "Cmd_if_random", "Cmd_get_", "ShouldSwitch")
B_ACTION_USE_MOVE = 0
B_ACTION_EXEC_SCRIPT = 10


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
            "battleMainFunc": hit["battleMainFunc"],
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

    # Replay the per-frame watch: transitions only carry changed keys.
    state = dict(run["initial"])
    actions: list[dict] = []
    cursor: list[dict] = []
    hp_by_frame: list[tuple[int, list[int]]] = []
    for transition in run["transitions"]:
        before_func = state["actionFuncId"]
        for key, (_old, new) in transition["changed"].items():
            state[key] = new
        frame = transition["frame"]
        if "activeHp" in transition["changed"]:
            hp_by_frame.append((frame, state["activeHp"]))
        if "turnActionNumber" in transition["changed"]:
            cursor.append({"frame": frame, "turnActionNumber": state["turnActionNumber"], "actionFuncId": state["actionFuncId"]})
        if before_func == B_ACTION_USE_MOVE and state["actionFuncId"] == B_ACTION_EXEC_SCRIPT:
            attacker = state["attacker"]
            actions.append({
                "frame": frame,
                "attacker": attacker,
                "activeSpecies": state["activeSpecies"][attacker],
                "activeMoves": state["activeMoves"][attacker],
                "partyIndex": state["partyIndex"][attacker],
                "currentMove": state["currentMove"],
                "currMovePos": state["currMovePos"],
                "chosenMoveByBattler": state["chosenMoveByBattler"][attacker],
                "slotMoveAtCurrMovePos": state["activeMoves"][attacker][state["currMovePos"]],
                "encore": state["encore"][attacker],
                "lastMoves": state["lastMoves"],
                "script": state["script"],
            })

    def hp_at(frame: int) -> list[int]:
        value = run["initial"]["activeHp"]
        for at, seen in hp_by_frame:
            if at <= frame:
                value = seen
        return value

    bounds: list[tuple[int, int]] = []
    previous_end = 0
    for turn in turns:
        end = turn["draws"][-1]["frame"]
        bounds.append((previous_end, end))
        previous_end = end

    def within(rows: list[dict], window: tuple[int, int]) -> list[dict]:
        return [row for row in rows if window[0] < row["frame"] <= window[1]]

    pngs = run.get("pngs", [])
    if PNG_DIR is not None:
        missing = [p["frame"] for p in pngs if not (PNG_DIR / f"frame-{p['frame']:05d}.png").is_file()]
        if missing:
            raise SystemExit(f"PNG(s) missing from {PNG_DIR}: {missing[:5]}")
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
        "slotPlan": run["slotPlan"],
        "inputSubstitutions": run["inputSubstitutions"],
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
                    "actions": within(actions, window),
                    "actionCursor": within(cursor, window),
                    "messages": within(messages, window),
                    "draws": turn["draws"],
                }
                for turn, window in zip(turns, bounds)
            ],
            "incompleteTailDraws": incomplete,
            "final": run["final"],
        },
        "pngEvidence": {
            "note": "One PNG per displayed-string change (probe --png-after-message); frame -> sha256 of the raw RGB framebuffer. PNGs are not committed; rerun the probe to regenerate them.",
            "frames": {str(p["frame"]): p["rgbSha256"] for p in pngs},
        },
    }
    OUT.write_text(json.dumps(receipt, indent=1) + "\n")
    print(f"wrote {OUT}: turns={len(turns)} actions={len(actions)} identical={sha1 == sha2}")


if __name__ == "__main__":
    main()
