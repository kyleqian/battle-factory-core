#!/usr/bin/env python3
"""Build compact ROM event streams (prompt / body / anim / blip + observed free order F at every body edge) for the S10A policy-gap scenarios
and the Intimidate-class corpus entries; consumed by tools/integration/spriteOrderPolicyGapsReplay.ts.
usage: OUT=/tmp/pgprobe python3 tools/integration/spriteOrderPolicyGapsEvents.py     (writes fixtures/sprite-order-policy-gaps/events/*.json + intimidate.json)
Inputs: $OUT/rows-<n>-A.json (spriteOrderEventProbe.py) and $OUT/calls-<n>-A.json (spriteOrderGapCallProbe.py), both from spriteOrderPolicyGapsProbe.sh
(two fresh runs A/B are byte-identical). Events come ONLY from probe markers (LaunchBattleAnimation, TryHandleLaunchBattleTableAnimation,
InitAndLaunchChosenStatusAnimation/LaunchStatusAnimation, DoBounceEffect, DoHitAnimHealthboxEffect) and the row act edges; F is attached for comparison only."""
import json, os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import spriteOrderBodyPlans as P

OUT = Path(os.environ.get("OUT", "/tmp/pgprobe"))
DEST = P.FIX / "sprite-order-policy-gaps"
NAMES = {"dt-player": "double-team player (Dragonair/Onix)", "dt-opponent": "double-team opponent", "ft-player": "fake-tears player (Delcatty/Shuckle)",
         "ft-opponent": "fake-tears opponent", "fd-player": "feather-dance player (Pidgeotto/Onix)", "fd-opponent": "feather-dance opponent",
         "ftb-player": "fake-tears player (Onix/Pidgeotto)", "ftb-opponent": "fake-tears opponent (Onix/Pidgeotto)",
         "ftc-player": "fake-tears player (Dragonair/Chansey)", "ftc-opponent": "fake-tears opponent (Dragonair/Chansey)",
         "en-player": "endeavor player (Diglett/Chansey)", "en-opponent": "endeavor opponent"}
STATUS = {0: "PSN", 1: "CONFUSION", 2: "BRN", 3: "INFATUATION", 4: "SLP", 5: "PRZ", 6: "FRZ", 7: "CURSED", 8: "NIGHTMARE"}
GENERAL = {7: "HELD_ITEM_EFFECT", 11: "SUN_CONTINUES", 13: "HAIL_CONTINUES", 6: "TURN_TRAP", 20: "FOCUS_PUNCH_SETUP"}


def build(name):
    rows = OUT / f"rows-{name}-A.json"
    sc = P.extract_scenario("pg", str(rows))
    side = "player" if name.endswith("player") else "opponent"
    calls = json.loads((OUT / f"calls-{name}-A.json").read_text())["calls"]
    marks = [c for c in calls if c["kind"].startswith("marker:")]
    ev = []
    bounce = sorted(c["n"] for c in marks if c["kind"] == "marker:DoBounceEffect")
    prev = None
    for n in bounce:  # one prompt per cluster of DoBounceEffect markers (HEALTHBOX + MON, every frame while the prompt is up)
        if prev is None or n - prev > 20:
            ev.append({"n": n, "k": "prompt"})
        prev = n
    for c in marks:
        if c["kind"] == "marker:DoHitAnimHealthboxEffect":
            ev.append({"n": c["n"], "k": "blip"})
    bodies = [u for u in sc["units"] if u["kind"] == "body" and not u["truncated"]]
    for u in bodies:
        e = {"n": u["frame"], "k": "body", "obsF": u["observedFreeAtEdge"], "mv": u["mv"]}
        if u["mv"] != 0:
            e["move"], e["side"] = u["mv"], side if True else side
        else:
            near = [c for c in marks if abs(c["n"] - u["frame"]) <= 2]
            try_ = [c for c in near if c["kind"] == "marker:TryHandleLaunchBattleTableAnimation"]
            stat = [c for c in near if c["kind"] == "marker:LaunchStatusAnimation"]
            if try_:
                args = try_[0]["r0"] if isinstance(try_[0].get("r0"), list) else try_[0].get("args")
                e["k"] = "anim"; e["table"] = "gBattleAnims_General"; e["id"] = args[3] if args else None; e["arg"] = args[4] if args else None
            elif stat:
                a = stat[0].get("r0") if isinstance(stat[0].get("r0"), list) else stat[0].get("args")
                e["k"] = "anim"; e["table"] = "gBattleAnims_StatusConditions"; e["id"] = a[1]; e["arg"] = None
            else:
                e["k"] = "anim"; e["table"] = "unknown"; e["id"] = None; e["arg"] = None
        ev.append(e)
    order = {"prompt": 0, "body": 1, "anim": 1, "blip": 2}
    ev.sort(key=lambda e: (e["n"], order[e["k"]]))
    return {"name": name, "label": NAMES[name], "side": side, "scenarioMove": sc["move"], "entryMatchesProvider": sc["entryMatchesProvider"], "events": ev}


def intimidate():
    d = json.loads((P.FIX / "sprite-order-gap-causes.json").read_text())
    files = [r["file"] for r in d["intimidateEntryReplay"]]
    table = {s["file"]: s for s in json.loads((P.FIX / "sprite-order-body-events.json").read_text())["scenarios"]}
    out = []
    for f in files:
        bodies = [u for u in table[f]["units"] if u["kind"] == "body"]
        out.append({"file": f, "intimidateEdge": {"mv": bodies[0]["mv"], "obsF": bodies[0]["observedFreeAtEdge"], "windows": bodies[0]["windows"]},
                    "firstMoveEdge": {"mv": bodies[1]["mv"], "obsF": bodies[1]["observedFreeAtEdge"]}, "statArg": 22})
    return out


if __name__ == "__main__":
    for n in NAMES:
        r = build(n)
        (DEST / "events" / f"{n}.json").write_text(json.dumps(r, separators=(",", ":")) + "\n")
        print(n, [(e["k"], e["n"], e.get("move"), e.get("arg")) for e in r["events"] if e["k"] != "blip"][:14], "blips", sum(e["k"] == "blip" for e in r["events"]))
    (DEST / "events" / "intimidate.json").write_text(json.dumps(intimidate(), separators=(",", ":")) + "\n")
