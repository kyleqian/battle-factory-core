#!/usr/bin/env python3
"""prep13: Hyper Beam orb allocator facts per scenario -> fixtures/prep13/prep13-hyper-beam-orbs.json.
Per orb i (creation order; two per group g = i//2 at age 110+3g): slot, spawn age, death age (lifetime), persistentOrder as the ACCEPTED fixture defines it (sSpriteOrder.indexOf(slot) at row 110+3g, hyperBeamFramebuffer.ts:116)
versus the production-derivable candidates: index in the order lent AT ACTIVATION, and index in the order at row 109 (spriteOrderSeed row).  Then a first-free simulation of the slots from the measured (spawnAge, lifetime)
pairs over the in-use set at activation (+ the two gSimplePaletteBlend sprites) to prove the slots are the known-entry first-free allocator."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
A = json.loads((ROOT / "tools/integration/fixtures/prep13/prep13-analysis.json").read_text())
import glob
RAW = {Path(p).stem: json.loads(Path(p).read_text()) for p in glob.glob("/tmp/prep13-probes/r1/*hyper-beam*.json")}
out = {}
for sc, rows in A.items():
    if "hyper-beam" not in sc: continue
    r = rows[-1] if len(rows) == 1 else [x for x in rows if x["move"] == "HYPER_BEAM"][0]
    raw = RAW[sc]; body = [b for b in raw["bodies"] if b["move"] == 63][0]; start = body["start"]
    orders = [(f - start, o) for f, o in raw["orderSeries"] if start <= f <= (body["end"] or 10**9)]
    def order_at(age):
        o = r["orderAtAct"]
        for a, ordr in orders:
            if a <= age: o = ordr
        return o
    sp = [s for s in raw["spawns"] if start <= s["f"] <= (body["end"] or 10**9)]
    orb_births = [s for s in sp if s["ev"] == "+" and name_ok if False] if False else None
    import subprocess
    # template names via the probe's analysis (tmpl field already symbolised)
    orbs = [s for s in r["sprites"] if s["tmpl"] == "gHyperBeamOrbSpriteTemplate"]
    simple = [s for s in r["sprites"] if s["tmpl"] == "gSimplePaletteBlendSpriteTemplate"]
    # deaths: from the raw spawn log (ev "-")
    deaths = {}
    births = [(s["f"] - start, s["slot"]) for s in sp if s["ev"] == "+"]
    for s in sp:
        if s["ev"] == "-":
            deaths.setdefault(s["slot"], []).append(s["f"] - start)
    life = []
    used = {}
    for o in orbs:
        ds = [d for d in deaths.get(o["slot"], []) if d > o["age"]]
        life.append({"slot": o["slot"], "age": o["age"], "death": min(ds) if ds else None})
    po_accepted, po_act, po_109 = [], [], []
    for i, o in enumerate(orbs):
        g = i // 2
        po_accepted.append(order_at(110 + 3 * g).index(o["slot"]))
        po_act.append(r["orderAtAct"].index(o["slot"]))
        po_109.append(order_at(109).index(o["slot"]))
    # first-free simulation: in-use at activation + simple blend sprites (their own lifetimes), orbs by (age, creation index)
    inuse0 = set(r["inUseAtAct"])
    ev = sorted([(l["age"], 1, i) for i, l in enumerate(life)])  # creation events in order
    alive = {}  # slot -> death age
    sim = []
    simple_events = [(s["age"], s["slot"]) for s in simple]
    occupied = lambda age: inuse0 | {sl for sl, d in alive.items() if d is None or d > age}
    for age, _, i in ev:
        for a, sl in simple_events:  # simple blend sprites occupy their own slot from their birth (they are created by the script at their own age)
            pass
        free = [s for s in range(64) if s not in occupied(age) and s not in {sl for a, sl in simple_events if a <= age and a >= 100}]
        slot = free[0]; sim.append(slot); alive[slot] = life[i]["death"]
    out[sc] = {"orbCount": len(orbs), "simpleBlend": [(s["age"], s["slot"], s["bank"]) for s in simple], "slots": [l["slot"] for l in life], "spawnAges": [l["age"] for l in life], "lifetimes": [None if l["death"] is None else l["death"] - l["age"] for l in life],
               "persistentOrderAccepted": po_accepted, "persistentOrderAtActivation": po_act, "persistentOrderAtRow109": po_109,
               "equalAtActivation": po_accepted == po_act, "equalAtRow109": po_accepted == po_109, "mismatchesAtActivation": sum(a != b for a, b in zip(po_accepted, po_act)),
               "firstFreeSimSlots": sim, "firstFreeSimEqual": sim == [l["slot"] for l in life], "orderAtAct24": r["orderAtAct"][:24], "orderShape": r["orderShape"], "orderRows109": order_at(109)[:24], "orderChangesInBody": len(orders), "attackerSubpriority": r["battlerSub"]}
    print(sc[-50:], "orbs", len(orbs), "simple", out[sc]["simpleBlend"], "slots", out[sc]["slots"][:10], "sim==", out[sc]["firstFreeSimEqual"], "po==act", out[sc]["equalAtActivation"], "mism", out[sc]["mismatchesAtActivation"], "po==109", out[sc]["equalAtRow109"], "orderChanges", len(orders))
(ROOT / "tools/integration/fixtures/prep13/prep13-hyper-beam-orbs.json").write_text(json.dumps(out, indent=1))
