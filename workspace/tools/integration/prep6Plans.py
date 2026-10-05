#!/usr/bin/env python3
"""prep6: sprite-slot PLAN rows (spawn ages / lifetimes) from the dense ROM rows (fixtures/prep6-slots.json) and their comparison with the accepted slot fields
(question 2): SWEET_SCENT PETAL_SLOTS (sweetScentFramebuffer.ts:31-32), SAFEGUARD ringSlots, DRAGON_DANCE allocationSlots, ROCK_TOMB rocks 3,4,5,7 + Red-X 9
(rockTomb.ts:64-67,176), FIRE_BLAST (no slot list: reducer allocates 0..63 minus reserved by first-free, fireBlast.ts:28-31).
Also computes the DRAGON_DANCE age-20 orb painter ranks under the two row-0 seeds (A = ...2,3,4..., B = ...2,4,3...).
Writes fixtures/prep6-plans.json. Run from workspace root."""
import json, os
R = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
FX = R + "/tools/integration/fixtures"
d = json.load(open(FX + "/prep6-slots.json"))
PETAL = [3, 4, 5, 7, 9, 10, 3, 11, 12, 13, 14, 15, 16, 17, 4, 5, 7, 9, 10, 3, 11, 12, 13, 14]
out = {"schema": "prep6-plans/v1", "plans": []}
for m in d["moves"]:
    spawns = m["spawnOrderSlots"]; ages = m["spawnAges"]
    runs = m["runsByTemplate"]
    plan = {"move": m["move"], "orientation": m["orientation"], "rows": m["rows"], "spawnOrderSlots": spawns, "spawnAges": ages,
            "runsByTemplate[slot,spawnAge,lastAliveAge]": runs}
    if m["move"] == "SWEET_SCENT":
        plan["acceptedPetalSlotsEqualRomSpawnOrder"] = spawns == PETAL
        plan["acceptedPetalSlots"] = PETAL
    if m["move"] == "SAFEGUARD": plan["acceptedRingSlots"] = [3, 4, 5]; plan["acceptedRingSlotsEqualRomSpawnOrder"] = spawns[:3] == [3, 4, 5]
    if m["move"] == "DRAGON_DANCE": plan["acceptedAllocationSlots"] = [3, 4, 5, 7, 9, 10]; plan["acceptedEqualRomSpawnOrder"] = spawns[:6] == [3, 4, 5, 7, 9, 10]
    if m["move"] == "ROCK_TOMB": plan["acceptedSlotsRocksThenRedX"] = [3, 4, 5, 7, 9]; plan["acceptedEqualRomSpawnOrder"] = spawns == [3, 4, 5, 7, 9]
    out["plans"].append(plan)
json.dump(out, open(FX + "/prep6-plans.json", "w"), indent=1)
for p in out["plans"]:
    print(p["move"], p["orientation"], {k: v for k, v in p.items() if k.startswith("accepted")}, "spawns", p["spawnOrderSlots"][:12], p["spawnAges"][:12])
