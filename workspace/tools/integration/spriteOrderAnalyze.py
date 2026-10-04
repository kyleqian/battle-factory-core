#!/usr/bin/env python3
"""Analyse sprite-order-raw/*: write tools/integration/fixtures/sprite-order-evidence.json.

Pure python3 (no mGBA). Models tested against EVERY sample body (order at activation-1):
  M_asc    relative order of the move's effect slots == ascending slot number
  M_fresh  stable sort of identity order by the activation-1 keys (no history): full 64-order,
           relative order of occupied slots, and relative order of effect slots
  M_const  relative order of effect slots == the most common observed pattern for that slot set
"""
import hashlib, json, subprocess, sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "tools/integration/fixtures/sprite-order-raw"
sys.path.insert(0, str(ROOT / "tools/integration"))
import spriteOrderBatch as B  # noqa: E402


def sort_key(k):
    prio, sub, y, aff, size, shape = k
    p = sub | (prio << 8)
    if y >= 160: y -= 256
    if aff == 3 and size == 3 and shape in (0, 2) and y > 128: y -= 256
    return p, y


def fresh(keys):
    """identity order then one SortSprites pass == stable sort by (priority asc, y desc)."""
    def k(s):
        p, y = sort_key(keys[s]); return (p, -y)
    return sorted(range(64), key=k)


def sha(b): return hashlib.sha256(b).hexdigest()


def keys_of(snap):
    keys = [tuple(snap["freeKeys"][0])] * 64 if snap["freeKeys"] else [(3, 255, 160, 0, 0, 0)] * 64
    for occ in snap["occupied"]:
        keys[occ[0]] = tuple(occ[3:9])
    return keys


def rel(order, slots):
    pos = {s: i for i, s in enumerate(order)}
    return sorted(slots, key=lambda s: pos[s])


def git(*a): return subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True).stdout.strip()


samples, mismatch = [], []
manifest_moves = {int(m) for m in json.loads((ROOT / "tools/integration/fixtures/allocator-net-zero-manifest.json").read_text())}
for mid, sc in B.jobs():
    stem = Path(sc).stem
    f0, f1 = RAW / f"{mid}-{stem}-0.json", RAW / f"{mid}-{stem}-1.json"
    if not f0.is_file() or not f1.is_file(): continue
    b0, b1 = f0.read_bytes(), f1.read_bytes()
    d = json.loads(b0)
    # toolSha is identical for both runs; compare bytes
    identical = b0 == b1
    if not identical: mismatch.append(f"{mid}-{stem}")
    for bi, body in enumerate(d["bodies"]):
        s = {"move": int(mid), "scenario": sc, "bodyIndex": bi, "bodyCount": len(d["bodies"]),
             "sha256": [sha(b0), sha(b1)], "identical": identical,
             "needsOrderMove": int(mid) in B.NEEDS and sc in B.NEEDS[int(mid)]}
        if "error" in body:
            s["error"] = body["error"]; samples.append(s); continue
        before, act, cl = body["before"], body["atActivation"], body["atCleanup"]
        E = body["effectSlots"]
        occ = [o[0] for o in before["occupied"]]
        free = [x for x in range(64) if x not in occ]
        o_before = before["order"]
        keys = keys_of(before)
        fr = fresh(keys)
        s.update({
            "activation": body["activation"], "cleanup": body["cleanup"],
            "resortChecks": [body["resortOk"], len(body["resortBad"])],
            "effectSlots": E, "orderBefore": o_before,
            "effectRelOrder": rel(o_before, E),
            "freeKeysBefore": before["freeKeys"],
            "occupiedBefore": occ,
            "effectSubsetOfFree": all(e in free for e in E),
            "freeAllAfterOccupied": max(o_before.index(x) for x in occ) < min(o_before.index(x) for x in free),
            "occupiedRelOrder": rel(o_before, occ),
            "freeTailRel": rel(o_before, free),
            "orderAtCleanup": cl["order"], "orderAtActivation": act["order"],
            "orderChangedInWindow": len(body["orderChanges"]),
            "modelAsc": rel(o_before, E) == sorted(E),
            "modelFreshFull": fr == o_before,
            "modelFreshOccupied": rel(fr, occ) == rel(o_before, occ),
            "modelFreshEffect": rel(fr, E) == rel(o_before, E),
        })
        samples.append(s)

# M_const: most common relative pattern per effect-slot set
by_set = defaultdict(Counter)
for s in samples:
    if "effectRelOrder" in s and s["effectSlots"]:
        by_set[tuple(sorted(s["effectSlots"]))][tuple(s["effectRelOrder"])] += 1
for s in samples:
    if "effectRelOrder" in s and s["effectSlots"]:
        top = by_set[tuple(sorted(s["effectSlots"]))].most_common(1)[0][0]
        s["modelConstEffect"] = tuple(s["effectRelOrder"]) == top

# accepted-fixture seed comparison
seed_cmp = []
FX = ROOT / "tools/compare/fixtures"
for fx in sorted(FX.glob("*.json")):
    try: j = json.loads(fx.read_text())
    except Exception: continue
    ap = j.get("animationProfile") if isinstance(j, dict) else None
    if not isinstance(ap, dict) or "spriteOrderSeed" not in ap: continue
    seed = ap["spriteOrderSeed"]; sc = j["scenario"]
    for s in samples:
        if s["scenario"] == sc and "orderBefore" in s and s["needsOrderMove"] and s["bodyIndex"] == 0:
            slots = ap.get("flameSpriteSlots") or seed
            full = len(seed) == 64
            rb = s["orderBefore"] if full else rel(s["orderBefore"], seed)
            ra = s["orderAtActivation"] if full else rel(s["orderAtActivation"], seed)
            raw = json.loads((RAW / f"{s['move']}-{Path(sc).stem}-0.json").read_text())["bodies"][0]
            wins = [raw["before"]["frame"]] + [fr for fr, _ in raw["orderChanges"]]
            ords = [raw["before"]["order"]] + [o for _, o in raw["orderChanges"]]
            hit = [fr for fr, o in zip(wins, ords) if (o if full else rel(o, seed)) == seed]
            seed_cmp.append({"windowFramesMatching": hit, "activation": s["activation"],"fixture": fx.name, "move": s["move"], "seedLen": len(seed), "fixtureSlots": slots if not full else None,
                             "seed": seed if not full else None, "observedBefore": rb if not full else None,
                             "matchesBefore": rb == seed, "matchesAtActivation": ra == seed,
                             "effectSlotsObserved": s["effectSlots"], "effectRelObserved": s["effectRelOrder"]})
            break

n = [s for s in samples if "orderBefore" in s]
summary = {
    "samples": len(samples), "withOrder": len(n), "errors": [(s["move"], s["scenario"], s["error"]) for s in samples if "error" in s],
    "distinctMoves": len({s["move"] for s in n}), "scenarios": len({s["scenario"] for s in n}),
    "identicalRuns": sum(s["identical"] for s in n), "nonIdentical": mismatch,
    "resortBadTotal": sum(s["resortChecks"][1] for s in n), "resortOkTotal": sum(s["resortChecks"][0] for s in n),
    "firstBody": sum(s["bodyIndex"] == 0 for s in n), "laterBody": sum(s["bodyIndex"] > 0 for s in n),
    "freeAllAfterOccupied": sum(s["freeAllAfterOccupied"] for s in n), "effectSubsetOfFree": sum(s["effectSubsetOfFree"] for s in n),
    "distinctFullOrders": len({tuple(s["orderBefore"]) for s in n}),
    "distinctEffectPatterns": len({(tuple(sorted(s["effectSlots"])), tuple(s["effectRelOrder"])) for s in n}),
    "modelAsc": [sum(s["modelAsc"] for s in n), sum(not s["modelAsc"] for s in n)],
    "modelFreshFull": [sum(s["modelFreshFull"] for s in n), sum(not s["modelFreshFull"] for s in n)],
    "modelFreshOccupied": [sum(s["modelFreshOccupied"] for s in n), sum(not s["modelFreshOccupied"] for s in n)],
    "modelFreshEffect": [sum(s["modelFreshEffect"] for s in n), sum(not s["modelFreshEffect"] for s in n)],
    "modelConstEffect": [sum(s.get("modelConstEffect", False) for s in n), sum(not s.get("modelConstEffect", True) for s in n)],
    "freeKeyVariants": sorted({json.dumps(s["freeKeysBefore"]) for s in n}),
    "seedFixtures": len(seed_cmp), "seedMatchBefore": sum(c["matchesBefore"] for c in seed_cmp),
    "seedMatchAtActivation": sum(c["matchesAtActivation"] for c in seed_cmp),
}
out = {"schema": "sprite-order-evidence/v1",
       "pins": {"referenceGit": git("-C", "reference/pokeemerald", "rev-parse", "HEAD") or None,
                "spriteC": sha((ROOT / "reference/pokeemerald/src/sprite.c").read_bytes()),
                "pokeemeraldGba": sha((ROOT / "reference/pokeemerald/pokeemerald.gba").read_bytes()),
                "probe": sha((ROOT / "tools/compare/spriteOrderProbe.py").read_bytes()),
                "batch": sha((ROOT / "tools/integration/spriteOrderBatch.py").read_bytes()),
                "analyze": sha(Path(__file__).read_bytes())},
       "summary": summary, "seedComparison": seed_cmp, "samples": samples}
(ROOT / "tools/integration/fixtures/sprite-order-evidence.json").write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps({k: v for k, v in summary.items() if k != "freeKeyVariants"}, indent=1))
print("freeKeyVariants", summary["freeKeyVariants"])
for c in seed_cmp: print(c["fixture"], c["matchesBefore"], c["matchesAtActivation"], c["seed"], c["observedBefore"])
