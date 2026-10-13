#!/usr/bin/env python3
"""Fold the STEP rcp143 R4 (ISSUES #139 Focus Punch pre-pass) probe runs into
one committed receipt: Scene OFF + Scene ON, Focus Punch arm + control arm,
each run twice fresh through probe-rcp143-random-callers.py.

    python3 tools/probe/build-rcp143-r4-receipt.py <spec.json> <out.json> \
        <arm>=<run1.json>,<run2.json> [...]

Per arm it records the turn-1 phase frames (gBattleMainFunc transitions:
SetActionsAndBattlersTurnOrder -> CheckFocusPunch_ClearVarsBeforeTurnStarts ->
[BattleScript_FocusPunchSetUp via RunBattleScriptCommands_PopCallbacksStack]
-> RunTurnActionsFunctions), every displayed-string change after the turn
order is fixed (the frame each message box's string is written), the
gAnimScriptActive spans with their sBattleAnimScriptPtr labels, and every
attributed Random() draw -- so the receipt states how many draws fall inside
the pre-pass (the ROM spends none).
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) < 4:
    raise SystemExit(f"usage: {sys.argv[0]} <spec.json> <out.json> <arm>=<run1>,<run2> ...")
SPEC, OUT = Path(sys.argv[1]), Path(sys.argv[2])


def main_func_frames(run: dict) -> list[dict]:
    rows = []
    for transition in run["transitions"]:
        changed = transition["changed"]
        if "battleMainFunc" in changed:
            rows.append({"frame": transition["frame"], "from": changed["battleMainFunc"][0], "to": changed["battleMainFunc"][1]})
    return rows


def anim_spans(run: dict) -> list[dict]:
    spans: list[dict] = []
    open_span: dict | None = None
    for transition in run["transitions"]:
        changed = transition["changed"]
        if "animActive" in changed:
            if changed["animActive"][1]:
                label = changed.get("animScript", [None, None])[1] or ""
                open_span = {"script": label.split("+")[0], "firstActiveFrame": transition["frame"], "labelsVisited": []}
            elif open_span is not None:
                open_span["lastActiveFrame"] = transition["frame"] - 1
                open_span["frames"] = open_span["lastActiveFrame"] - open_span["firstActiveFrame"] + 1
                spans.append(open_span)
                open_span = None
        if open_span is not None and "animScript" in changed and changed["animScript"][1]:
            label = changed["animScript"][1].split("+")[0]
            if label not in open_span["labelsVisited"]:
                open_span["labelsVisited"].append(label)
    if open_span is not None:
        open_span["lastActiveFrame"] = None
        spans.append(open_span)
    return spans


def arm_record(name: str, paths: list[Path]) -> dict:
    raws = [path.read_bytes() for path in paths]
    shas = [hashlib.sha256(raw).hexdigest() for raw in raws]
    run = json.loads(raws[0])
    if not run["attribution"]["reconciled"]:
        raise SystemExit(f"{name}: attribution did not reconcile")
    funcs = main_func_frames(run)
    turn_order = next(row["frame"] for row in funcs if row["to"] == "SetActionsAndBattlersTurnOrder")
    check_entry = next(row["frame"] for row in funcs if row["to"] == "CheckFocusPunch_ClearVarsBeforeTurnStarts")
    actions = next(row["frame"] for row in funcs if row["to"] == "RunTurnActionsFunctions")
    script_rows = [row for row in funcs if row["to"] == "RunBattleScriptCommands_PopCallbacksStack" and row["frame"] < actions]
    pre_pass = None
    if script_rows:
        start = script_rows[0]["frame"]
        end = next(row["frame"] for row in funcs if row["from"] == "RunBattleScriptCommands_PopCallbacksStack" and row["frame"] > start)
        pre_pass = {
            "script": "BattleScript_FocusPunchSetUp",
            "scriptStartFrame": start,
            "scriptEndFrame": end,
            "frames": end - start,
            "randomDraws": sum(row["calls"] for row in run["perFrameDraws"] if check_entry <= row["frame"] < actions),
        }
    messages = [m for m in run["messages"] if m["frame"] > turn_order]
    pngs = run["pngs"]
    return {
        "arm": name,
        "card": run["card"],
        "oracleProfile": run["oracleProfile"],
        "seed": run["seed"],
        "runs": len(raws),
        "probeOutputSha256": shas,
        "byteIdenticalAcrossRuns": len(set(shas)) == 1,
        "densePngFrames": [pngs[0]["frame"], pngs[-1]["frame"]] if pngs else None,
        "densePngRgbSha256Digest": hashlib.sha256("".join(p["rgbSha256"] for p in pngs).encode()).hexdigest() if pngs else None,
        "turnOrderFrame": turn_order,
        "checkFocusPunchFrame": check_entry,
        "runTurnActionsFrame": actions,
        "prePass": pre_pass,
        "drawsBetweenTurnOrderAndFirstAction": sum(
            row["calls"] for row in run["perFrameDraws"] if turn_order <= row["frame"] < actions
        ),
        "messages": messages,
        "animSpans": anim_spans(run),
        "draws": [
            {key: hit[key] for key in ("frame", "caller", "rngBefore", "value", "script", "attacker", "currentMove")}
            for hit in run["attribution"]["hits"]
        ],
        "parties": run["parties"],
        "drawCountCrossChecked": run["drawCountCrossChecked"],
        "attributionReconciled": run["attribution"]["reconciled"],
    }


def main() -> None:
    spec = json.loads(SPEC.read_text())
    arms = []
    for argument in sys.argv[3:]:
        name, paths = argument.split("=", 1)
        arms.append(arm_record(name, [Path(path) for path in paths.split(",")]))
    OUT.write_text(json.dumps({**spec, "arms": arms}, indent=1) + "\n")
    print(f"wrote {OUT}: arms={[arm['arm'] for arm in arms]}")


if __name__ == "__main__":
    main()
