#!/usr/bin/env python3
"""prep29: Spit Up evidence. (1) request counter: ROM animTurn at the Spit Up body activation (post-increment of Cmd_attackanimation, battle_script_commands.c:1788) vs the Stockpile counter
(1/2/3 from the scenario) -> request.turn (= animTurn at emit, Cmd_stockpiletobasedamage sets animTurn = stockpileCounter, :6883, mirrored by src/engine/battleScriptStockpileOpcode.ts:117) == counter.
(2) per counter: body length, spawn count, spawn signature (slot, age, template, subpriority, bank) equal across the 4 scenarios (accepted P/O + alternate P/O).
(3) the accepted reducer (src/animation/spitUp.ts spitUpAtAge) returns input.ownedSprites / buffers / liveTasks unchanged for every age: the number of DISTINCT per-age effect-sprite sets in the ROM body (>1) proves a static input cannot reproduce it.
usage: prep29SpitUpCheck.py STATE_DIR MOVES_DIR OUT.json (MOVES_DIR unused, kept for the Run.sh signature)"""
import json, re, sys
from pathlib import Path
SD, MD, OUT = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
import hashlib
h = lambda o: hashlib.sha1(json.dumps(o).encode()).hexdigest()[:12]
res = {"note": "bodies grouped by the ROM animTurn at activation (a scenario can hold several Spit Up bodies, e.g. a second Spit Up at counter 1); counter = animTurn - 1", "perAnimTurn": {}}
for p in sorted(SD.glob("*spit-up*-r1.json")):
    n = p.name[:-8]; d = json.loads(p.read_text())
    for bi, b in enumerate(x for x in d["bodies"] if x["move"] == 255):
        A, E = b["start"], b["end"]; a = b["atActivation"]
        sets = {tuple(sorted(s[0] for s in row[1:])) for row in b["spriteSeries"]}
        sp = [[x["f"] - A, x["slot"], x["ev"]] + ([hex(x["tmpl"]), x["sub"], x["attr"][2] >> 12] if x["ev"] == "+" else []) for x in d["spawns"] if A <= x["f"] <= E + 1]
        g = res["perAnimTurn"].setdefault(str(a["animTurn"]), {"bodies": 0, "bodyLen": set(), "distinctSpriteSets": set(), "nSpawns": set(), "spawnSig": set(), "slotStream": set()})
        g["bodies"] += 1; g["bodyLen"].add(E - A); g["distinctSpriteSets"].add(len(sets)); g["nSpawns"].add(sum(1 for x in sp if x[2] == "+"))
        g["spawnSig"].add(h(sp)); g["slotStream"].add(h([x[:3] for x in sp])); g.setdefault("sigBySide", {}).setdefault(str(a["attacker"]), set()).add(h(sp))
for g in res["perAnimTurn"].values():
    for k, x in list(g.items()):
        if isinstance(x, set): g[k] = sorted(x)
    g["sigBySide"] = {k: sorted(v) for k, v in g["sigBySide"].items()}
res["claims"] = {"animTurnAtActivation_is_counter_plus_1_for_counters_1_2_3": sorted(res["perAnimTurn"]) == ["2", "3", "4"],
                 "bodyLenAndSpawnsFunctionOfAnimTurn": all(len(g["bodyLen"]) == 1 and len(g["nSpawns"]) == 1 for g in res["perAnimTurn"].values()),
                 "slotStreamConstantPerAnimTurn": all(len(g["slotStream"]) == 1 for g in res["perAnimTurn"].values()),
                 "spawnSigConstantPerAnimTurnAndAttackerSide": all(len(v) == 1 for g in res["perAnimTurn"].values() for v in g["sigBySide"].values())}
json.dump(res, open(OUT, "w"), indent=1); print(json.dumps(res))
