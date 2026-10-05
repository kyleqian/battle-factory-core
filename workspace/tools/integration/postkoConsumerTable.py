#!/usr/bin/env python3
"""Post-KO consumer audit table (pure python3; docs/postko-consumer-audit.md s1).

Every live adapter in src/engine/liveMoveAnimation.ts that (a) returns null without the lent sprite order or the allocator
input, or (b) renders with known-entry constants (sprite slots, battler slots 6/8, occupied prefix, matrix ids, task slots).
For each: classes (i)..(v), the entry constants, usage weight (tools/integration/spriteOrderPlanCoverageRank.py model), and a
mechanical post-unit check against the opponent-KO + next-mon send-out geometry of docs/sprite-order-uncovered-units.md s1.2/s1.3
(occupancy {0,1,2,5,6,60..63}, opponent battler slot 5, matrix bitmap 0x3: opponent battler matrix 0, player 1, no tasks).

usage: postkoConsumerTable.py [--write]   (writes tools/integration/fixtures/postko/consumer-table.json)
"""
import importlib.util, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src/engine/liveMoveAnimation.ts"
OUT = ROOT / "tools/integration/fixtures/postko/consumer-table.json"

ENTRY_OCC = {0, 1, 2, 6, 8, 60, 61, 62, 63}
POSTKO_OCC = {0, 1, 2, 5, 6, 60, 61, 62, 63}          # s1.2: after opponent faint + summary + nextSendOut
ENTRY_LOWEST = [s for s in range(64) if s not in ENTRY_OCC]
POSTKO_LOWEST = [s for s in range(64) if s not in POSTKO_OCC]
ENTRY_BATTLER = {"player": 6, "opponent": 8}
POSTKO_BATTLER = {"player": 6, "opponent": 5}
ENTRY_MATRIX = {"player": 1, "opponent": 2}          # bitmap 0x6
POSTKO_MATRIX = {"player": 1, "opponent": 0}         # bitmap 0x3 (s1.3)
ENTRY_FREE_MATRICES = [m for m in range(32) if m not in (1, 2)]
POSTKO_FREE_MATRICES = [m for m in range(32) if m not in (0, 1)]

# gate: "order" = returns null without spriteOrderInput; "allocator" = null without spriteAllocatorInput; "none" = always renders.
# classes: i lowest-free from F, ii hard-coded sprite slots, iii battler slots / occupied prefix, iv matrix / task ids, v other.
# slots: hard-coded effect sprite slot sequences (first-free allocations in creation order, with reuse), matrices likewise.
C = [
    # id, name, case label regex, gate, classes, constants
    (113, "LIGHT_SCREEN", r"case 113:$", "allocator", ["i"], {"note": "wall/sparkles = host first-free (allocateFirstLiveSprite); host invalidated by faint/summary/switch-in"}),
    (112, "BARRIER", r"case 112: case 115", "allocator", ["i"], {}),
    (115, "REFLECT", r"case 112: case 115", "allocator", ["i"], {}),
    (182, "PROTECT", r"case 112: case 115", "allocator", ["i"], {}),
    (243, "MIRROR_COAT", r"case 112: case 115", "allocator", ["i"], {}),
    (277, "MAGIC_COAT", r"case 112: case 115", "allocator", ["i"], {}),
    (215, "HEAL_BELL", r"case 215: \{", "order", ["ii"], {"slots": [4, 5, 7, 9, 10, 11], "via": "spriteOrderForSlots(HEAL_BELL_REUSED_ORDER_SLOTS)"}),
    (348, "LEAF_BLADE", r"case 348: \{", "order", ["ii"], {"slotsRef": "LEAF_BLADE_OAM_ORDER_SLOTS", "via": "spriteOrderForSlots"}),
    (299, "BLAZE_KICK", r"case 299: \{", "order", ["i"], {"via": "sorted(F)[:10]"}),
    (88, "ROCK_THROW", r"case 88: \{", "order", ["iii"], {"prefix": True, "via": "spriteOrderWithOccupiedPrefix(KNOWN_ENTRY_OCCUPIED)"}),
    (195, "PERISH_SONG", r"case 195: \{", "order", ["ii"], {"via": "perishSongNoteOrderFromFree (fixed note windows of slots)"}),
    (53, "FLAMETHROWER", r"case 53: \{", "none", ["i"], {"via": "sorted(F)[:8] when lent, else literal [3,4,5,7,9,10,11,12] (labels only, prep §0)"}),
    (288, "GRUDGE", r"case 288: \{", "order", ["i"], {"via": "sorted(F)[:6]"}),
    (317, "ROCK_TOMB", r"case 317: \{", "none", ["iii"], {"battlerSlot": "target", "note": "targetSpriteSlot opponent 8 / player 6; rock slots first-free inside the reducer (seed-independent)"}),
    (219, "SAFEGUARD", r"case 219:$", "none", ["ii"], {"slots": [3, 4, 5], "note": "labels only (0/42 seeds, prep6 s2.3)"}),
    (230, "SWEET_SCENT", r"case 230:$", "none", ["ii"], {"slots": [3, 4, 5, 7, 9, 10, 3, 11, 12, 13, 14, 15, 16, 17, 4, 5, 7, 9, 10, 3, 11, 12, 13, 14], "note": "seed-independent (0/42 seeds)"}),
    (157, "ROCK_SLIDE", r"case 157:$", "none", ["iii"], {"prefix": True, "note": "opponent attacker only; prefix order when lent, accepted literal otherwise (seed-independent 0/40)"}),
    (126, "FIRE_BLAST", r"case 126: \{", "order", ["iii"], {"battlerSlot": "target"}),
    (349, "DRAGON_DANCE", r"case 349: \{", "order", ["ii"], {"slots": [3, 4, 5, 7, 9, 10], "via": "spriteOrderForSlots"}),
    (129, "SWIFT", r"case 129: case 271", "order", ["ii", "iii", "iv"], {"slots": [3, 4, 5, 7, 9], "battlerSlot": "both", "tasks": {"targetShakeTaskSlot": 0}}),
    (271, "TRICK", r"case 129: case 271", "order", ["ii", "iii", "iv"], {"slots": [3, 4], "battlerSlot": "both", "tasks": {"stretch": [1, 0], "shake": [0, 1]}}),
    (218, "FRUSTRATION", r"case 218: case 69", "order", ["ii", "iii", "iv"], {"prefix": True, "slots": [3, 3, 4], "matrices": [0, 0, 3]}),
    (69, "SEISMIC_TOSS", r"case 218: case 69", "order", ["ii", "iii", "iv"], {"prefix": True, "slots": [3, 4, 5, 7, 9, 10, 11, 12, 13], "matrices": [0, 3, 4, 5, 6, 7, 8, 9, 10]}),
    (32, "HORN_DRILL", r"case 218: case 69", "order", ["ii", "iii", "iv"], {"prefix": True, "slots": [3, 4, 5], "matrices": [0, 3, 4], "via": "spriteOrderForSlots([3,4,5])"}),
    (62, "AURORA_BEAM", r"case 218: case 69", "order", ["ii", "iii", "iv"], {"prefix": True, "slots": [3, 4, 5, 7, 9, 10], "matrices": [0, 3, 4, 5, 6, 7]}),
    (253, "UPROAR", r"case 218: case 69", "order", ["ii", "iii", "iv"], {"prefix": True, "slots": [3, 4, 5], "matrices": [0], "battlerMatrix": "attacker"}),
    (85, "THUNDERBOLT", r"case 218: case 69", "order", ["ii", "iii", "iv"], {"prefix": True, "slots": [3, 4, 5, 7, 9, 10, 11, 12, 13], "matrices": [0, 3, 4, 5, 6, 7, 8, 9, 10]}),
    (254, "STOCKPILE", r"case 218: case 69", "order", ["ii", "iii", "iv"], {"prefix": True, "slots": [3, 4, 5, 7, 9], "matrices": [0, 3, 4, 5, 6]}),
    (192, "ZAP_CANNON", r"case 218: case 69", "order", ["ii", "iii", "iv"], {"prefix": True, "slots": [3, 4, 5, 7, 9, 10, 11, 12, 13], "matrices": [0, 3, 4, 5, 6, 7, 8, 9]}),
    (241, "SUNNY_DAY", r"case 202: case 241", "order", ["ii", "iii"], {"prefix": True, "slots": [3, 4, 5, 7]}),
    (202, "GIGA_DRAIN", r"case 202: case 241", "order", ["ii", "iii"], {"prefix": True, "slots": [3, 4, 5, 7, 9] + list(range(10, 22))}),
    (72, "MEGA_DRAIN", r"case 202: case 241", "order", ["ii", "iii"], {"prefix": True, "slots": [3, 4, 5, 7, 9] + list(range(10, 17))}),
    (71, "ABSORB", r"case 202: case 241", "order", ["ii", "iii"], {"prefix": True, "slots": [3, 4, 5, 7, 9, 10]}),
    (138, "DREAM_EATER", r"case 202: case 241", "order", ["ii", "iii"], {"prefix": True, "slots": [3, 4, 5, 7, 9] + list(range(10, 22))}),
    (104, "DOUBLE_TEAM", r"case 104: \{", "order", ["ii"], {"slots": [3, 4], "via": "spriteOrderForSlots([3,4])"}),
    (297, "FEATHER_DANCE", r"case 297:$", "order", ["v"], {"note": "gate only (no order field consumed); body is the known-entry staged profile"}),
    (325, "SHADOW_PUNCH", r"case 325:$", "none", ["iii"], {"battlerSlot": "attacker", "note": "attackerSpriteId 6/8"}),
]


def line_of(pattern, nth=0):
    hits = [i + 1 for i, l in enumerate(SRC.read_text().splitlines()) if re.search(r"^\s*" + pattern, l)]
    return hits[nth] if hits else None


def weights():
    spec = importlib.util.spec_from_file_location("rank", ROOT / "tools/integration/spriteOrderPlanCoverageRank.py")
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    w = mod.weights()
    return w, sum(w.values())


def remap(slots, entry_lowest, post_lowest):
    """First-free creates with reuse: a slot's rank among the entry lowest-free set maps to the same rank post-unit."""
    return [post_lowest[entry_lowest.index(s)] for s in slots]


def postko_effect(mid, gate, k):
    """What the CURRENT adapter code does if the lend were licensed at the post-KO geometry (F = any order of the post-KO free set)."""
    free = set(POSTKO_LOWEST)
    out = {}
    if k.get("prefix"):
        # spriteOrderWithOccupiedPrefix: [...KNOWN_ENTRY_OCCUPIED (has 8, lacks 5), ...F (has 8)] -> duplicate 8 -> null
        out["prefix"] = "declines (prefix lacks 5, repeats 8: spriteOrderWithOccupiedPrefix -> null)" if mid != 157 else "falls back to the accepted known-entry literal (wrong occupant set; seed-independent per prep7 s2.3)"
    if "slots" in k:
        s = k["slots"]
        post = remap(s, ENTRY_LOWEST, POSTKO_LOWEST)
        out["slotsEntry"], out["slotsPostKo"] = s, post
        out["slotsChange"] = s != post
        uniq = sorted(set(s))
        out["forSlotsAllFree"] = all(x in free for x in uniq)
    if "matrices" in k:
        m = k["matrices"]
        post = [POSTKO_FREE_MATRICES[ENTRY_FREE_MATRICES.index(x)] for x in m]
        out["matricesEntry"], out["matricesPostKo"], out["matricesChange"] = m, post, m != post
    if k.get("battlerMatrix"):
        out["battlerMatrix"] = {"entry": ENTRY_MATRIX, "postKo": POSTKO_MATRIX}
    if k.get("battlerSlot"):
        out["battlerSlot"] = {"entry": ENTRY_BATTLER, "postKo": POSTKO_BATTLER, "uses": k["battlerSlot"]}
    if "tasks" in k:
        out["tasks"] = {"entry": k["tasks"], "postKo": "unchanged iff the task table is empty at activation (s1.3: cry tasks end ~100 frames after the send-out)"}
    # outcome classification of the current code under a generalized lend
    if gate == "allocator":
        verdict = "host-derived (allocator host must model the post-unit occupancy; today invalidated)"
    elif k.get("prefix") and mid != 157:
        verdict = "self-declines (prefix)"
    elif "slots" in k and not out["forSlotsAllFree"] and k.get("via", "").startswith("spriteOrderForSlots"):
        verdict = "self-declines (a hard-coded slot is occupied post-KO)"
    elif "slots" in k and out["slotsChange"]:
        verdict = "WRONG-SILENT (renders entry slots that are not the post-KO allocation slots)"
    elif k.get("battlerSlot"):
        verdict = "WRONG-SILENT (entry battler slot 8 for the opponent)" if k["battlerSlot"] in ("target", "both", "attacker") else ""
    elif mid in (299, 288, 53):
        verdict = "derives from F (generalizes by construction for slots)"
    elif mid == 195:
        verdict = "derives from F via fixed note windows (check windows at the post-KO free set)"
    else:
        verdict = "gate only / labels"
    out["currentCodeUnderPostKoLend"] = verdict
    return out


def main():
    w, tot = weights()
    rows = []
    seen = {}
    for mid, name, pat, gate, classes, k in C:
        line = line_of(pat)
        rows.append({"move": mid, "name": name, "line": f"src/engine/liveMoveAnimation.ts:{line}", "gate": gate, "classes": classes,
                     "constants": k, "weightPerSide": round(w.get(mid, 0), 5), "usageSharePct": round(100 * w.get(mid, 0) / tot, 3),
                     "postKo": postko_effect(mid, gate, k)})
    by_class = {}
    for r in rows:
        for c in r["classes"]:
            b = by_class.setdefault(c, {"count": 0, "usageSharePct": 0.0, "moves": []})
            b["count"] += 1; b["usageSharePct"] = round(b["usageSharePct"] + r["usageSharePct"], 3); b["moves"].append(r["name"])
    outcome = {}
    for r in rows:
        key = r["postKo"]["currentCodeUnderPostKoLend"].split(" (")[0]
        b = outcome.setdefault(key, {"count": 0, "usageSharePct": 0.0, "moves": []})
        b["count"] += 1; b["usageSharePct"] = round(b["usageSharePct"] + r["usageSharePct"], 3); b["moves"].append(r["name"])
    doc = {"schema": "postko-consumer-table/v1", "geometry": {"entryOccupied": sorted(ENTRY_OCC), "postKoOccupied": sorted(POSTKO_OCC),
           "entryLowestFree": ENTRY_LOWEST[:16], "postKoLowestFree": POSTKO_LOWEST[:16], "entryBattler": ENTRY_BATTLER, "postKoBattler": POSTKO_BATTLER,
           "entryMatrixBitmap": "0x6", "postKoMatrixBitmap": "0x3"}, "byClass": by_class, "byCurrentOutcome": outcome,
           "totalConsumers": len(rows), "totalUsageSharePct": round(sum(r["usageSharePct"] for r in rows), 3), "rows": rows}
    text = json.dumps(doc, indent=1) + "\n"
    if "--write" in sys.argv:
        OUT.write_text(text)
    print(json.dumps({"byClass": {c: {k: v for k, v in b.items() if k != "moves"} for c, b in by_class.items()},
                      "byCurrentOutcome": {c: b for c, b in outcome.items()}, "total": len(rows), "share": doc["totalUsageSharePct"]}, indent=1))
    for r in rows:
        print(r["move"], r["name"], r["line"], r["gate"], r["classes"], r["usageSharePct"], r["postKo"]["currentCodeUnderPostKoLend"],
              r["postKo"].get("slotsPostKo", ""), r["postKo"].get("matricesPostKo", ""))


if __name__ == "__main__":
    main()
