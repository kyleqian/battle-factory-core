#!/usr/bin/env python3
"""prep11: drafted dense-fixture inputs, one per (move body, scenario): tools/integration/fixtures/prep11-<move>-<side>-<scenario>.json (schema prep11-adapter-draft/v1, DRAFT: unverified until an
adapter exists, consumedByTest false). Built from prep11-analysis.json (fresh direct-mGBA probes, two identical runs), prep11-monbg-formula.json, prep11-crosscheck.json and prep11-route-probe.json.
Species are resolved through species.h from the internal ids read from gBattleMons (lab files mix national-dex ids)."""
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
FX = ROOT / "tools/integration/fixtures"
sp = {int(m.group(2)): m.group(1) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)", (ROOT / "reference/pokeemerald/include/constants/species.h").read_text())}
A = json.loads((FX / "prep11/prep11-analysis.json").read_text())
mono = {(r["scenario"], r["move"]): r for r in json.loads((FX / "prep11/prep11-monbg-formula.json").read_text())["rows"]}
cross = json.loads((FX / "prep11/prep11-crosscheck.json").read_text())
routes = {}
for r in json.loads((FX / "prep11-route-probe.json").read_text()):
    if r.get("requestedMove"): routes.setdefault(r["move"], []).append({"seed": r["seed"], "streak": r["streak"], "species": r["species"], "firstBody": r["firstBody"], "orderInputKnown": r.get("firstBodyOrderKnown"), "request": r["moveRequest"] and {k: r["moveRequest"][k] for k in ("attacker", "turn")}})
OWN_PROBE = {"AIR_CUTTER": "airCutter", "DESTINY_BOND": "destinyBond", "FORESIGHT": "foresight", "LEECH_SEED": "leechSeed", "PETAL_DANCE": "petalDance", "RECYCLE": "recycle", "ROLLOUT": "rollout", "SKY_UPPERCUT": "skyUppercut",
             "SPIDER_WEB": "spiderWeb", "TRI_ATTACK": "triAttack", "ROAR": "roar", "WHIRLWIND": "whirlwind"}
n = 0
for sc, rows in A.items():
    seen = set()
    for r in rows:
        key = (r["move"], r["animTurn"])
        if key in seen: continue
        seen.add(key)
        base = sc.replace("mechanic-", "")
        side = "opponent" if "-opponent-" in base.split("-alt-")[0] + "-" and re.search(r"-opponent-\w+-player", base) else "player"
        if "alt" in base: side = "player"
        kinds = {}
        for s in r["sprites"]: kinds.setdefault(s["tmpl"], {"firstSlot": s["slot"], "bank": s["palLate"], "tile": s["tile"], "matrix": s["matrix"], "firstAge": s["age"]})
        tasks = {}
        for age, t in r["taskEvents"]:
            for k, v in t.items(): tasks.setdefault(v, {"slots": set(), "firstAge": age})["slots"].add(int(k))
        mv = r["move"]; mk = mv.lower().replace("_", "-")
        m_ = mono.get((sc, mv))
        cc = cross.get(f"{mk}-{side}", {}) if "alt" not in base else {}
        doc = {"schema": "prep11-adapter-draft/v1", "DRAFT": "unverified by an adapter run (consumedByTest: false)", "move": mv, "moveId": r["moveId"], "bodyTurn": r["animTurn"],
               "scenario": f"tools/battle-lab/{sc}.json", "ownProbe": f"tools/compare/{OWN_PROBE[mv]}Probe.py" if mv in OWN_PROBE else None,
               "attacker": {"species": sp.get(r["monsAtAct"][0 if side == "player" else 1][0]), "geometry": {"side": side}},
               "target": {"species": sp.get(r["monsAtAct"][1 if side == "player" else 0][0]), "geometry": {"side": "opponent" if side == "player" else "player"}},
               "fieldProfileHpAtActivation": {"player": r["monsAtAct"][0][1], "opponent": r["monsAtAct"][1][1]},
               "draft": {"activationFrame": r["act"], "scriptEndFirstInactive": r["firstInactive"], "denseWindow": {"startFrame": r["act"], "endFrame": r["firstInactive"], "ageOffset": 0}, "expectedDuration": r["duration"] + 1,
                         "shadowRow": 0, "windowStartMinusActivationEvidence": cc.get("firstFrame"), "gAnimMovePower": r["gAnimMovePower"], "consumedByTest": False,
                         "allocatorAtActivation": {"gOamMatrixAllocBitmap": hex(r["bitmap"]), "activeTasks": r["tasksAtAct"], "inUseSprites": r["inUseAtAct"]},
                         "spawnSlotsInOrder": [[s["age"], s["slot"], s["tmpl"]] for s in r["sprites"]], "spriteKinds": kinds,
                         "taskSlots": {k: {"slots": sorted(v["slots"]), "firstAge": v["firstAge"]} for k, v in tasks.items()},
                         "monbgTask": m_ and {"createdAge": m_["createdAge"], "slot": m_["slot"], "data": m_["data"], "formulaHolds": m_["formulaHolds"]},
                         "regsAtActivation": r["regsAtAct"], "orderAtActivation": r["spriteOrderAtAct"], "netZeroAtEnd+1": r["atEnd1"] == r["bitmap"],
                         "crossCheckAgainstAcceptedCorpus": cc and {k: cc[k] for k in ("windowRows", "bitmapAtActivation", "spawnSlotSequenceEqual", "taskPairsEqual") if k in cc} or None},
               "requestRoutes": routes.get(mv, [])[:3]}
        out = FX / f"prep11-{mk}-{side}-{sc.replace('mechanic-', '').replace('prep11-', '')}{'-turn' + str(r['animTurn']) if mv in ('FLY', 'BOUNCE') else ''}.json"
        out.write_text(json.dumps(doc, indent=1) + "\n"); n += 1
print(n, "drafts")
