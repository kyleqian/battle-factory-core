#!/usr/bin/env python3
"""Build multi-hit prep artifacts from two fresh multihitProbe.py runs per scenario.

usage: multihitPrepBuild.py <dir-with-<name>-a.json/<name>-b.json> [--write]
Asserts run a == run b (per-frame raw-RGB sha256 trace, script pointers, x2, HP, chrome hashes), then with --write emits
tools/integration/fixtures/multihit-<move>-<side>-hit<i>.json (draft live fixtures, unused by any test),
multihit-prep-evidence.json and multihit-shadow-rows.json (ISSUES #142 rows in issue142-shadow-rows.json shape).
"""
import hashlib, json, sys
from pathlib import Path
D = Path(sys.argv[1]); WRITE = "--write" in sys.argv
ROOT = Path(__file__).resolve().parents[2]; FX = ROOT / "tools/integration/fixtures"
MOVES = {  # name -> (move, probeMoveId, scenario stem, attacker species, target species, side)
    "ds-player": ("DOUBLE_SLAP", 3, "double-slap-player-poliwhirl-opponent-onix", "POLIWHIRL", "ONIX", "player"),
    "ds-opponent": ("DOUBLE_SLAP", 3, "double-slap-opponent-poliwhirl-player-onix", "POLIWHIRL", "ONIX", "opponent"),
    "cp-player": ("COMET_PUNCH", 4, "comet-punch-player-ledian-opponent-onix", "LEDIAN", "ONIX", "player"),
    "cp-opponent": ("COMET_PUNCH", 4, "comet-punch-opponent-ledian-player-onix", "LEDIAN", "ONIX", "opponent"),
    "tk-player": ("TRIPLE_KICK", 167, "triple-kick-player-hitmontop-opponent-onix", "HITMONTOP", "ONIX", "player"),
    "tk-opponent": ("TRIPLE_KICK", 167, "triple-kick-opponent-hitmontop-player-onix", "HITMONTOP", "ONIX", "opponent"),
}
evidence, shadow, fixtures = [], [], {}
for name, (move, mid, stem, att, tgt, side) in MOVES.items():
    a, b = (json.loads((D / f"{name}-{r}.json").read_text()) for r in "ab")
    if a["trace"] != b["trace"]: raise SystemExit(f"{name}: fresh runs differ")
    trace = a["trace"]
    rawdigest = hashlib.sha256(json.dumps([[r["frame"], r["sha256"]] for r in trace]).encode()).hexdigest()
    hits = []
    for h in a["hits"]:
        i, s, e = h["hit"], h["start"], h["end"]
        win = [r for r in trace if s <= r["frame"] <= e]
        hp = h["hpAtStart"]; mx = trace[0]["maxHp"]
        if h["hpAtStart"] != h["hpAtEnd"] or h["turnAtActivation"] != i or h["turnsSeen"] != [i]:
            raise SystemExit(f"{name} hit {i}: unexpected turn/HP movement")
        # activation = first frame gAnimScriptActive && sAnimMoveIndex == move; window starts there (offset 0)
        hit = {"hit": i, "activationFrame": s, "windowStart": s, "windowEnd": e, "frameCount": e - s + 1,
               "gAnimMoveTurn": h["turnAtActivation"], "chromeHash": h["chromeAtStart"],
               "messageVisible": "move-used banner (<attacker> used / <MOVE>!)" if i == 0 else "blank message window (no text)",
               "targetX2AtActivation": h["targetX2AtStart"]["p" if side == "opponent" else "o"][1],
               "attackerX2AtActivation": h["targetX2AtStart"]["o" if side == "opponent" else "p"][1],
               "playerHp": hp[0], "opponentHp": hp[1]}
        hits.append(hit)
        pm, om = ("player", "opponent")
        fx = {"schema": "multihit-live-adapter/v1", "draft": True, "move": move,
              "probe": "tools/integration/multihitProbe.py", "probeArgs": [str(mid)],
              "scenario": f"tools/battle-lab/mechanic-{stem}.json",
              "attacker": {"species": att, "geometry": {"side": side}},
              "target": {"species": tgt, "geometry": {"side": "opponent" if side == "player" else "player"}},
              "fieldProfile": {"playerHp": hp[0], "playerMaxHp": mx[0], "opponentHp": hp[1], "opponentMaxHp": mx[1],
                               "playerGender": "male", "opponentGender": "male"},
              "denseWindow": {"startFrame": s, "endFrame": e},
              "requestFields": {"turn": i}}
        if i > 0: fx["messageLines"] = ["", ""]
        fixtures[f"multihit-{move.lower().replace('_', '-')}-{side}-hit{i}.json"] = fx
        shadow.append({"move": move, "moveId": mid, "orientation": side, "hit": i, "duration": e - s + 1, "activationFrame": s,
                       "windowStart": s, "ageOffset": 0, "shadowRow": 0, "inWindow": True, "offsetWindowStartMinusActivation": 0,
                       "currentlyDrawn": None, "needsFix": None,
                       "note": "adapter absent: draw the elevated-opponent shadow on live age 0 iff the adapter is added (window starts at activation)",
                       "fixture": f"tools/integration/fixtures/multihit-{move.lower().replace('_', '-')}-{side}-hit{i}.json"})
    evidence.append({"name": name, "move": move, "moveId": mid, "orientation": side, "scenario": f"tools/battle-lab/mechanic-{stem}.json",
                     "freshRuns": 2, "runsIdentical": True, "rawTraceSha256": rawdigest, "rawFramesPerRun": len(trace),
                     "maxHp": trace[0]["maxHp"], "hits": hits})
    print(name, [(h["activationFrame"], h["windowEnd"], h["gAnimMoveTurn"], h["targetX2AtActivation"]) for h in hits])
if WRITE:
    for n, fx in fixtures.items(): (FX / n).write_text(json.dumps(fx, indent=1) + "\n")
    (FX / "multihit-prep-evidence.json").write_text(json.dumps({"schema": "multihit-prep-evidence/v1", "probe": "tools/integration/multihitProbe.py",
                                                                "moves": evidence}, indent=1) + "\n")
    (FX / "multihit-shadow-rows.json").write_text(json.dumps({"schema": "multihit-shadow-rows/v1", "rows": shadow}, indent=1) + "\n")
    print("wrote", len(fixtures), "fixtures")
