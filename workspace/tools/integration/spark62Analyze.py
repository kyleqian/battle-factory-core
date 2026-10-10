#!/usr/bin/env python3
"""spark62: summarise spark62-probes/<run>/*.json -> creation context, VBlank edge position in the creation iteration, initial advances, lag frame.
usage: spark62Analyze.py <probeDir> [out.json]"""
import json, sys
from pathlib import Path
rows = []
for p in sorted(Path(sys.argv[1]).glob("*.json")):
    d = json.loads(p.read_text()); c = d["creation"]
    log = c["log"]
    creators = sorted({e["lr"] for e in log if e["fn"] == "CreateSpriteAndAnimate"})
    contexts = []  # which top-level callback each CreateSpriteAndAnimate ran under
    top = None
    for e in log:
        if e["fn"] in ("BattleMainCB1", "BattleMainCB2"): top = e["fn"]
        if e["fn"] == "CreateSpriteAndAnimate": contexts.append(top)
    steps_before_edge = {}
    for e in log:
        if e["fn"] == "AnimSparkElectricityFlashing_Step": steps_before_edge[e["slot"]] = steps_before_edge.get(e["slot"], 0) + 1
    traversed = [e["slot"] for e in log if e["fn"] == "AnimateSprite" and e["lr"].startswith("AnimateSprites")]
    flash = c["flashingSlots"]
    data0 = {r["slot"]: r["data"][0] for r in c["replaySlots"] if r["slot"] in flash}
    adv = [12 - 1 - data0[s] - 0 for s in flash]  # data[0]=12 -> 11 after the creation step; one more step each extra advance
    fr = {x["age"]: x for x in d["frames"]}
    a0 = c["age"]
    rows.append({"scenario": p.name, "activation": d["bodies"][0]["start"], "creationAge": a0, "flashingSlots": flash,
                 "creatorCallers": creators, "creationContext": sorted(set(contexts)), "createdInOrder": [e["slot"] for e in log if e["fn"] == "AnimSparkElectricityFlashing"],
                 "animateSpritesTraversedBeforeVBlank": traversed, "flashingStepsBeforeVBlank": steps_before_edge,
                 "initialCallbackAdvances": adv,
                 "lagFrame": {"screen(c+1)==screen(c)": fr[a0 + 1]["screenSha256"] == fr[a0]["screenSha256"],
                              "screen(c+2)!=screen(c+1)": fr[a0 + 2]["screenSha256"] != fr[a0 + 1]["screenSha256"]}})
out = {"schema": "spark62-analysis/v1", "rows": rows}
if len(sys.argv) > 2: Path(sys.argv[2]).write_text(json.dumps(out, indent=1) + "\n")
for r in rows:
    print(r["scenario"], r["activation"], r["creationAge"], r["flashingSlots"], r["creationContext"], r["creatorCallers"], "traversed", r["animateSpritesTraversedBeforeVBlank"], "adv", r["initialCallbackAdvances"], r["lagFrame"])
