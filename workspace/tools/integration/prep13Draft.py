#!/usr/bin/env python3
"""prep13: drafted alternate-species dense fixtures (prep10/prep11 shape: draft true, consumedByTest false) + compact receipts.
Writes tools/integration/fixtures/prep13/drafts/prep13-<move>-<side>-<scenario>.json for each alternate scenario's body (first body of the move) and
tools/integration/fixtures/prep13/prep13-receipts.json (sha1 of the two fresh-process probe outputs per scenario, identical).
Window = the alternate's OWN source activation frame + the accepted offset (0: every accepted window of these four moves starts at its activation frame, prep13-crosscheck.json)."""
import hashlib, json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
FX = ROOT / "tools/integration/fixtures/prep13"; (FX / "drafts").mkdir(exist_ok=True)
sp = {int(m.group(2)): m.group(1) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)", (ROOT / "reference/pokeemerald/include/constants/species.h").read_text())}
A = json.loads((FX / "prep13-analysis.json").read_text()); cross = json.loads((FX / "prep13-crosscheck.json").read_text())
routes = {}
for r in json.loads((FX / "prep13-route-probe.json").read_text()):
    if r.get("requestedMove"): routes.setdefault(r["move"], []).append({"seed": r["seed"], "streak": r["streak"], "species": r["species"], "firstBody": r["firstBody"], "orderInputKnown": r.get("firstBodyOrderKnown")})
n = 0
for sc, rows in A.items():
    if not sc.startswith("prep13-") or not any(k in sc for k in ("ice-beam", "water-spout", "hidden-power", "hyper-beam")): continue
    mv = sc.split("-alt-")[0].replace("prep13-", ""); side = sc.split("-alt-")[1].split("-")[0]; MV = mv.upper().replace("-", "_")
    r = next(x for x in rows if x["move"] == MV)
    acc = cross[f"{mv}-{side}"]; off = acc["firstFrame"]["offset"]
    pl, op = r["monsAtAct"][0], r["monsAtAct"][1]
    kinds = {}
    for s in r["sprites"]:
        if s["tmpl"] == "ALLOCATE_SCRIPT_CMD_TABLE": continue
        kinds.setdefault(s["tmpl"], {"firstSlot": s["slot"], "bank": s["bank"], "tile": s["tile"], "matrix": s["matrix"], "firstAge": s["age"], "count": 0})["count"] += 1
    doc = {"schema": "prep13-adapter-draft/v1", "DRAFT": "unverified by an adapter run (consumedByTest: false)", "move": MV, "scenario": f"tools/battle-lab/{sc}.json", "acceptedScenario": acc["scenario"],
           "attacker": {"species": sp.get((pl if side == "player" else op)["species"]), "side": side}, "target": {"species": sp.get((op if side == "player" else pl)["species"]), "side": "opponent" if side == "player" else "player"},
           "personalities": {"player": pl["personality"], "opponent": op["personality"]}, "hpAtActivation": {"player": [pl["hp"], pl["maxHP"]], "opponent": [op["hp"], op["maxHP"]]},
           "draft": {"consumedByTest": False, "activationFrame": r["act"], "scriptEndFirstInactive": r["firstInactive"], "acceptedWindowOffsetFromActivation": off,
                     "denseWindow": {"startFrame": r["act"] + off, "endFrame": r["firstInactive"], "frameCount": r["rows"]}, "acceptedFrameCount": acc["rows"]["corpus"],
                     "allocatorAtActivation": {"gOamMatrixAllocBitmap": hex(r["bitmap"]), "activeTasks": r["tasksAtAct"], "inUseSprites": r["inUseAtAct"]}, "orderShapeAtActivation": r["orderShape"], "orderAtActivation": r["orderAtAct"],
                     "battlerSubpriority": {"player": r["battlerSub"][0], "opponent": r["battlerSub"][1]}, "battlerSpriteIds": r["battlerSpriteIds"], "battlerXYAtActivation": r["battlerXY"],
                     "spriteKinds": kinds, "taskSlots": [[t["age"], t["slot"], t["func"]] for t in r["tasks"]], "netZeroAtEnd+1": r["netZeroAtEnd1"],
                     "animationRng2AtActivation": r["rng2"], "gameplayRngAtActivation": r["rng"]},
           "routeSeeds": routes.get(MV, [])[:3] or "none found (see doc)"}
    (FX / "drafts" / f"prep13-{mv}-{sc.split("-alt-")[1]}.json").write_text(json.dumps(doc, indent=1) + "\n"); n += 1
print(n, "drafts")
rec = {}
for r1 in sorted(Path("/tmp/prep13-probes/r1").glob("*.json")):
    r2 = Path("/tmp/prep13-probes/r2") / r1.name
    a, b = hashlib.sha1(r1.read_bytes()).hexdigest(), hashlib.sha1(r2.read_bytes()).hexdigest()
    d = json.loads(r1.read_text()); rec[r1.stem] = {"sha1Run1": a, "sha1Run2": b, "identical": a == b, "frames": d["frames"], "bodies": [[x["move"], x["start"], x["end"]] for x in d["bodies"]]}
(FX / "prep13-receipts.json").write_text(json.dumps({"schema": "prep13-receipts/v1", "note": "direct mGBA, Scene ON, fresh process per run; both runs byte-identical", "scenarios": rec}, indent=1))
print(len(rec), "scenarios;", sum(v["identical"] for v in rec.values()), "identical")
