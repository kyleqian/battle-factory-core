#!/usr/bin/env python3
"""fpc177: fold fpc177Probe.py outputs into compact ROM rows per card. usage: fpc177Rom.py <probe-dir> <scenario-index.json> <out.json>
Rows are probe frames (the frame whose end-state shows the change). A print's first glyph is its gDisplayedStringBattle change row + 1
(sc106); turnOrder = battleMainFunc enters SetActionsAndBattlersTurnOrder's successor row."""
import json, os, sys

pdir, index_path, out_path = sys.argv[1:4]
index = json.load(open(index_path))
KEYS = ("battleMainFunc", "actionFuncId", "script", "animActive", "animScript", "species", "partyIndex", "attacker")
result = {"schema": "fpc177-rom/v1", "cards": {}}
for name in sorted(index):
    d = json.load(open(os.path.join(pdir, name)))
    tr = d["transitions"]
    first_fp = next((t["frame"] for t in tr if "CheckFocusPunch_ClearVarsBeforeTurnStarts" == t["changed"].get("battleMainFunc", [0, 0])[1]), None)
    turn_order = next((t["frame"] for t in tr if t["changed"].get("battleMainFunc", [0, 0])[1] == "SetActionsAndBattlersTurnOrder"), None)
    run_actions = next((t["frame"] for t in tr if t["changed"].get("battleMainFunc", [0, 0])[1] == "RunTurnActionsFunctions"), None)
    msgs = [{"row": m["frame"], "firstGlyph": m["frame"] + 1, "text": m["text"]} for m in d["messages"] if turn_order is None or m["frame"] > turn_order]
    anim = [{"frame": t["frame"], "active": t["changed"]["animActive"][1], "script": t["changed"].get("animScript", [None, None])[1]}
            for t in tr if "animActive" in t["changed"]]
    party = [{"frame": t["frame"], **{k: t["changed"][k][1] for k in ("species", "partyIndex") if k in t["changed"]}}
             for t in tr if "species" in t["changed"] or "partyIndex" in t["changed"]]
    entries = [{"frame": t["frame"], "script": t["changed"]["script"][1]} for t in tr
               if t["changed"].get("script", [0, 0])[1] in ("BattleScript_FocusPunchSetUp", "BattleScript_Pausex20")]
    action_fn = [{"frame": t["frame"], "to": t["changed"]["actionFuncId"][1]} for t in tr if "actionFuncId" in t["changed"]]
    result["cards"][name] = {
        "meta": index[name], "parties": d["parties"], "seed": d["seed"], "oracleProfile": d["oracleProfile"], "turnOrderRow": turn_order, "checkFocusPunchRows": [t["frame"] for t in tr if t["changed"].get("battleMainFunc", [0, 0])[1] == "CheckFocusPunch_ClearVarsBeforeTurnStarts"],
        "runTurnActionsRow": run_actions, "messages": msgs, "animSpans": anim, "partyChanges": party, "focusPunchScriptEntries": entries,
        "actionFuncIdChanges": action_fn, "randomCalls": d["totalRandomCalls"], "randomRows": [r["frame"] for r in d["perFrameDraws"]], "firstDrawRngBefore": (d["perFrameDraws"][0]["rngBefore"] if d["perFrameDraws"] else None),
        "final": d["final"], "framebufferSha256": d["framebufferSha256"],
    }
json.dump(result, open(out_path, "w"), indent=1)
open(out_path, "a").write("\n")
print(f"wrote {out_path}: {len(result['cards'])} cards")
