#!/usr/bin/env python3
"""prep7: validates the production order provider against the observed per-frame sSpriteOrder of direct-mGBA first-body runs and against every
accepted fixture literal, for the four order consumers (Fire Blast 126, Dragon Dance 349, Double Team 104, Rock Slide 157) + Ice Punch 8 (no order input; recorded for completeness).
Provider call (src/engine/factoryRoundBattleOrchestrator.ts:2132-2138 -> liveMoveSpriteAllocator.ts prepareLiveMoveSpriteOrder): spriteOrderInput.free = SpriteOrderState.free of
knownEntrySpriteOrderState (== KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, spriteOrderProvider.ts:38) at the activation edge, FIRST body only.
  consumer order for N lowest-free slots = spriteOrderForSlots(state, slots)   (spriteOrderProvider.ts:235)
  full 64 order                          = spriteOrderWithOccupiedPrefix(state, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER)  (:256)
usage (from workspace/): python3 tools/integration/prep7OrderSeed.py  -> fixtures/prep7-order-seed.json   (raw rows: fixtures/prep7-raw/*.json from prep7OrderProbes.sh)"""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/integration"))
import spriteOrderEventModel as M
FX = ROOT / "tools/integration/fixtures"
src = lambda p: (ROOT / p).read_text()
def ints(txt): return [int(x) for x in re.findall(r"\d+", txt)]
# --- production provider constants (parsed from source, not retyped)
sp = src("src/engine/spriteOrderProvider.ts")
KNOWN_F = ints(re.search(r"KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER[^=]*=\s*Object\.freeze\(\[(.*?)\]\)", sp, re.S).group(1))
OCC_PREFIX = ints(re.search(r"KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER[^=]*=\s*Object\.freeze\(\[(.*?)\]\)", sp, re.S).group(1))
assert len(KNOWN_F) == 55 and OCC_PREFIX == [62, 60, 0, 63, 1, 61, 6, 8, 2], (len(KNOWN_F), OCC_PREFIX)
RESERVED = {0, 1, 2, 6, 8, 60, 61, 62, 63}
FB_SEED = [s for s in ints(re.search(r"const FIRE_BLAST_ORDER_SEED = \[(.*?)\]\.filter", src("src/animation/fireBlast.ts"), re.S).group(1)) if s not in RESERVED]
RS_SEED = ints(re.search(r"GROVYLE_TO_ONIX_ROCK_SLIDE_ORDER_SEED = \[(.*?)\] as const", src("src/animation/sceneOnPresentation.ts"), re.S).group(1))
DD_SLOTS, DD_ORDER = [3, 4, 5, 7, 9, 10], [0, 1, 2, 3, 4, 5]  # prep6Accepted.mjs (dragon-dance fixture config; reducer default order = [0..5])
DT_FRONT = "a"  # sceneOnPresentation.ts ONIX_TO_GROVYLE_DOUBLE_TEAM_PROFILE.frontClone (a = slot 3 in front of slot 4)
def provider_free(): return list(KNOWN_F)
def for_slots(slots): return [s for s in KNOWN_F if s in slots]
def full64(): return OCC_PREFIX + KNOWN_F

def analyse(name, mv):
    d, rows = M.load(FX / "prep7-raw" / name)
    seq = M.frames_of(rows, d["lastFrame"])
    # activation = first frame gAnimScriptActive rises with sAnimMoveIndex == mv (after the last battle ResetSpriteData)
    act = next(n for n, r in seq if r["act"] and r["mv"] == mv)
    prev = None; first_create = None; creates = []
    base_mask = dict(seq)[act - 1]["mask"] if (act - 1) in dict(seq) else dict(seq)[act]["mask"]
    for n, r in seq:
        if n < act: continue
        newbits = [s for s in range(64) if r["mask"] >> s & 1 and not base_mask >> s & 1 and s not in RESERVED]
        if newbits and first_create is None: first_create = n
        if first_create is not None and n == first_create: creates = newbits
        if first_create is not None: break
    at = lambda n: dict(seq)[n]
    edge = at(act - 1)
    pre = at(first_create - 1)
    out = {"file": name, "move": mv, "activation": act, "firstCreateFrame": first_create, "firstCreateSlots": creates,
           "observedFreeAtActivationEdge": M.free_order(edge["order"], edge["mask"]), "observedFullOrderAtActivationEdge": edge["order"],
           "observedFreeBeforeFirstCreate": M.free_order(pre["order"], pre["mask"]), "observedFullOrderBeforeFirstCreate": pre["order"],
           "observedOccupiedBeforeFirstCreate": [s for s in range(64) if pre["mask"] >> s & 1],
           "providerFreeEqualsObservedAtActivationEdge": M.free_order(edge["order"], edge["mask"]) == provider_free(),
           "providerFreeEqualsObservedBeforeFirstCreate": M.free_order(pre["order"], pre["mask"]) == provider_free()}
    return out

res = {"schema": "prep7-order-seed/v1", "providerKnownEntryFree": KNOWN_F, "providerOccupiedPrefix": OCC_PREFIX, "scenarios": [], "literals": {}}
for name, mv in (("349-dd-player.json", 349), ("349-dd-opponent.json", 349), ("126-fb1-player.json", 126), ("126-fb1-opponent.json", 126), ("126-fb-player.json", 126), ("104-dt-player.json", 104), ("104-dt-opponent.json", 104),
                 ("157-rs-player.json", 157), ("157-rs-opponent.json", 157), ("8-ip-player.json", 8), ("8-ip-opponent.json", 8)):
    a = analyse(name, mv)
    if mv == 349:
        want = for_slots(DD_SLOTS); a["provider"] = want
        a["observedForSlots"] = [s for s in a["observedFreeBeforeFirstCreate"] if s in DD_SLOTS]
        a["providerEqualsObserved"] = want == a["observedForSlots"]
        # reducer rank: orbs sorted by index of slot in allocationOrder -> order of slots = [slots[i] for i in order]
        lit = [DD_SLOTS[i] for i in DD_ORDER]
        a["literalSlotOrder"] = lit
        a["literalSlot3Before4"] = lit.index(3) < lit.index(4); a["providerSlot3Before4"] = want.index(3) < want.index(4)
        a["literalEqualsProvider"] = lit == want
    if mv == 126:
        full = full64(); a["provider64"] = full
        a["observed64BeforeFirstCreate"] = a["observedFullOrderBeforeFirstCreate"]
        a["providerEqualsObserved64"] = full == a["observed64BeforeFirstCreate"]
        a["observed64AtActivationEdge"] = a["observedFullOrderAtActivationEdge"]; a["providerEqualsObserved64AtActivationEdge"] = full == a["observedFullOrderAtActivationEdge"]
        free_lit = [s for s in FB_SEED]
        a["literalFreeTail"] = free_lit
        a["literalEqualsProviderFreeFiltered"] = free_lit == [s for s in KNOWN_F if s not in RESERVED] 
        a["literalDiffersAt"] = [i for i, (x, y) in enumerate(zip(free_lit, [s for s in KNOWN_F if s not in RESERVED])) if x != y]
    if mv == 157:
        full = full64(); a["provider64"] = full; a["literal64"] = RS_SEED
        a["providerEqualsLiteral"] = full == RS_SEED; a["providerEqualsObserved64"] = full == a["observedFullOrderAtActivationEdge"]
    if mv == 104:
        want = for_slots([3, 4]); a["provider"] = want; a["providerFront"] = "b" if want.index(4) < want.index(3) else "a"
        a["observedFront"] = "b" if a["observedFreeBeforeFirstCreate"].index(4) < a["observedFreeBeforeFirstCreate"].index(3) else "a"
        a["literalFrontClone"] = DT_FRONT; a["literalEqualsProvider"] = DT_FRONT == a["providerFront"]
    res["scenarios"].append(a)
res["literals"] = {"FIRE_BLAST_ORDER_SEED(non-reserved, src/animation/fireBlast.ts:34)": FB_SEED, "GROVYLE_TO_ONIX_ROCK_SLIDE_ORDER_SEED(sceneOnPresentation.ts:13456)": RS_SEED,
                   "DRAGON_DANCE allocationOrder": DD_ORDER, "DOUBLE_TEAM frontClone": DT_FRONT}
(FX / "prep7-order-seed.json").write_text(json.dumps(res, indent=1) + "\n")
for a in res["scenarios"]:
    print(a["file"], "act", a["activation"], "firstCreate", a["firstCreateFrame"], a["firstCreateSlots"], "provFree==obs@edge", a["providerFreeEqualsObservedAtActivationEdge"], "@preCreate", a["providerFreeEqualsObservedBeforeFirstCreate"],
          {k: v for k, v in a.items() if k in ("providerEqualsObserved", "literalEqualsProvider", "providerEqualsObserved64", "providerEqualsLiteral", "providerFront", "observedFront", "literalSlotOrder", "provider", "literalDiffersAt")})
