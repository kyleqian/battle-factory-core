#!/usr/bin/env python3
"""prep9: DRAFTED live fixtures tools/integration/fixtures/prep9-<move>-{player,opponent}.json (`<side>` = attacker side; schema prep9-adapter-draft/v1 = prep8 draft shape + `palette`) and prep9-summary.json
from the prep9 receipts.  Unverified by an adapter run (no harness).   usage (workspace root): python3 tools/integration/prep9Draft.py"""
import json, gzip
from pathlib import Path
FX = Path("tools/integration/fixtures"); rd = lambda p: json.load(open(p))
alloc, var, blend, ff, lend, px, routes, dense = (rd(FX / f) for f in ("prep9-allocator.json", "prep9-bank-variance.json", "prep9-blend-check.json", "prep9-first-free.json", "prep9-tracker-lend.json", "prep9-order-pixels.json", "prep9-routes.json", "prep9-dense-crosscheck.json"))
base = rd(FX / "prep9-palette-baseline.json")
MOVES = {"ABSORB": (71, "absorb", "LOMBRE", "ONIX"), "MEGA_DRAIN": (72, "mega-drain", "SKIPLOOM", "ONIX"), "GIGA_DRAIN": (202, "giga-drain", "ROSELIA", "ONIX"), "DREAM_EATER": (138, "dream-eater", "WIGGLYTUFF", "ONIX"), "SUNNY_DAY": (241, "sunny-day", "BELLOSSOM", "ONIX")}
WINDOW = {("giga-drain", "player"): (214, 443), ("giga-drain", "opponent"): (214, 443), ("mega-drain", "player"): (75, 292), ("mega-drain", "opponent"): (79, 296), ("dream-eater", "player"): (1308, 1573), ("dream-eater", "opponent"): (2146, 2412),
          ("sunny-day", "player"): (211, 368), ("sunny-day", "opponent"): (211, 368), ("absorb", "player"): (223, 416), ("absorb", "opponent"): (223, 416)}  # dense-state.json.gz frame ranges; absorb: tools/compare/fixtures/absorb-*.json denseWindow
FIELD = {("absorb", "player"): dict(playerHp=152, playerMaxHp=167, opponentHp=110, opponentMaxHp=110), ("absorb", "opponent"): dict(playerHp=110, playerMaxHp=110, opponentHp=152, opponentMaxHp=167),
         ("giga-drain", "player"): dict(playerHp=135, playerMaxHp=146, opponentHp=110, opponentMaxHp=110), ("giga-drain", "opponent"): dict(playerHp=110, playerMaxHp=110, opponentHp=135, opponentMaxHp=146),
         ("mega-drain", "player"): dict(playerHp=151, playerMaxHp=151, opponentHp=110, opponentMaxHp=110), ("mega-drain", "opponent"): dict(playerHp=110, playerMaxHp=110, opponentHp=151, opponentMaxHp=151),
         ("dream-eater", "player"): dict(playerHp=205, playerMaxHp=215, opponentHp=110, opponentMaxHp=110, playerGender="female", opponentStatus="sleep"), ("dream-eater", "opponent"): dict(playerHp=110, playerMaxHp=110, opponentHp=195, opponentMaxHp=215, opponentGender="female", playerStatus="sleep"),
         ("sunny-day", "player"): dict(playerHp=172, playerMaxHp=182, opponentHp=142, opponentMaxHp=142, playerGender="female"), ("sunny-day", "opponent"): dict(playerHp=142, playerMaxHp=142, opponentHp=172, opponentMaxHp=182, opponentGender="female")}
LIFT = {
    "ABSORB": "branch battleScene.ts:44397-44562; PAIR GATE :44411-44425 (LOMBRE<->ONIX only; art = absorbArt.lombreBack/Front :44427 + onixFrontSprite/onixBackSprite :44431); healthboxes :44524-44544 (level 50, status 'none'); text :44555 'ABSORB!'",
    "MEGA_DRAIN": "branch :44564-44757; PAIR GATE :44578-44592 (SKIPLOOM<->ONIX; synthesisArt.skiploom* :44594, onix :44602); healthboxes :44719-44739 (level 50, status 'none'); text :44750",
    "GIGA_DRAIN": "branch :44759-44924; PAIR GATE :44768-44781 (ROSELIA<->ONIX; generic battle-back/opponent-front ROSELIA! :44782-44783, onix :44788); healthboxes :44886-44906 (level 50, status 'none'); text :44917",
    "DREAM_EATER": "branch :45048-45269; PAIR GATE :45060-45073 (WIGGLYTUFF<->ONIX; generic art WIGGLYTUFF! :45075-45076, onix :45081); healthboxes :45236-45256 (level 50, status 'sleep' on the TARGET side, hard-coded by orientation :45245/:45256); text :45262",
    "SUNNY_DAY": "branch :35800-35914; NO pair gate (art by species through battleBack/opponentFrontSprites, throws if missing :35817-35819); healthboxes :35893-35903 (level 50, status from fieldProfile ?? 'none'); text :35907",
}
VERDICT = {
    "ABSORB": "READY (+renderer lift): no palette snapshot needed (D-PAL stale); allocator profile constants == ROM first-free replay == accepted literal; no order field in the config (order-neutrality of its sprite kinds measured on Giga/Mega/DE only); reducer age = activation age - 10",
    "MEGA_DRAIN": "READY-WITH-ORDER (+renderer lift): no palette snapshot needed; allocator constants == ROM; orderSeed 12 slots: first-body [4,3,5,16..] == provider == lend, post-Tackle [3,4,5,..] == lend; 0 px over all variants",
    "GIGA_DRAIN": "READY-WITH-ORDER (+renderer lift): no palette snapshot needed; allocator constants == ROM; orderSeed 17 slots: accepted post-Tackle [3,4,21,..] == lend, first-body [4,3,21,..] == provider; 0 px over all variants; Growl-preceded history unknown to the tracker",
    "DREAM_EATER": "READY-WITH-ORDER (+renderer lift): no palette snapshot needed; allocator constants == ROM; orderSeed [4,3,16,..] identical across all 5 histories and == lend after Tackle->Sing (both have production body plans); 0 px; sleep-setting body other than Sing is unplanned",
    "SUNNY_DAY": "READY-WITH-ORDER: no palette snapshot needed; raySlots [3,4,5,7] constant; spriteOrder (64) == provider (first body) / lend (post-Tackle); 0 px over 8 ROM orders + reversed; paletteBanks is echo-only (renderer ignores it)",
}
summary = {"schema": "prep9-summary/v1", "verdicts": VERDICT, "rendererLift": LIFT, "rows": []}
for name, (mid, key, att, tgt) in MOVES.items():
    for side in ("player", "opponent"):
        other = "opponent" if side == "player" else "player"; ws, we = WINDOW[(key, side)]
        sc = alloc["scenarios"][f"{key}-{side}-accepted"]; a, e = sc["activation"], sc["end"]
        age_offset = 10 if key == "absorb" else 0
        pre = [{"moveId": b["moveId"], "riseFrame": b["riseFrame"]} for s in lend["scenarios"] if s["scenario"] == f"{key}-{side}-accepted" for b in s["bodies"] if b["moveId"] != mid]
        tl = next(s for s in lend["scenarios"] if s["scenario"] == f"{key}-{side}-accepted")["targetBody"]
        fbl = next((s for s in lend["scenarios"] if s["scenario"] == f"{key}-{side}-firstbody"), None)
        lit = {k: v for k, v in (sc.get("vsAccepted") or {}).items()}
        cons = alloc["constancy"][str(mid)]; cons_n = cons["hitsplat"]["scenarios"]
        bv = var["moves"][str(mid)]
        bl = {n: r for n, r in blend["scenarios"].items() if r["move"] == mid}
        best = {}
        for nm in ("BG1", "BG2", "BG3", "OBJ0", "OBJ1"):
            lags = {tuple(l for l, v in r[nm].items() if v["mismatch"] == 0) for r in bl.values() if nm in r}
            if lags: best[nm] = sorted({x for t in lags for x in t}) if len(lags) == 1 else "inconsistent"
        dc = next((c for c in dense["cases"] if c["move"] == key and c["side"] == side), None)
        R = routes["routes"].get(name, []); acc_route = next((r for r in R if r["acceptedSpecies"]), None)
        row = {"move": name, "id": mid, "orientation": side, "activation": a, "scriptEndFirstInactive": e, "scriptFrames": e - a, "window": [ws, we], "ageOffset": age_offset, "reducerAgeAtActivation": -age_offset, "shadowRow": a - ws,
               "duration": we - ws + 1, "windowEndMinusScriptEnd": we - e, "precedingBodies": pre, "denseCrosscheck": dc}
        summary["rows"].append(row)
        d = {"schema": "prep9-adapter-draft/v1", "move": name, "probe": next(m["file"] for m in rd(FX / "prep9-scenarios/manifest.json") if m["name"] == f"{key}-{side}-accepted"),
             "attacker": {"species": att, "geometry": {"side": side}}, "target": {"species": tgt, "geometry": {"side": other}}, "fieldProfile": FIELD[(key, side)], "verdict": VERDICT[name],
             "denseWindow": {"startFrame": ws, "endFrame": we, "ageOffset": age_offset},
             "draft": {"activationFrame": a, "scriptEndFirstInactive": e, "shadowRow": a - ws, "shadowRowInMap": a - ws >= 0, "expectedDuration": we - ws + 1, "scriptFrames": e - a, "windowEndMinusScriptEnd": we - e, "windowStartMinusActivation": ws - a,
                       "reducerAgeAtActivation": -age_offset, "liveAgeBasis": age_offset, "consumedByTest": False,
                       "uncoveredScriptTail": max(0, e - we - 1) if key == "absorb" else max(0, e - we),
                       "palette": {"snapshotsNeededFromHost": False, "reducerPaletteInputs": "age-derived blend schedule only (bgPaletteBlendY / Sunny palette.coefficient / DE BLDY+psychic rotation); renderer uses battleBg.palette + species art palettes",
                                   "activationBuffersEqualDenseEvidence": dc and dc["activationBuffersEqual"], "bgBanksConstantAcrossHistories": bv["constantAcrossScenariosAtEveryAge"], "bankClassesThatVary": sorted({k.split('.')[0] for k in bv["varyingAcrossScenarios"]}),
                                   "fadedBanksChangedDuringBody": bv["changedFadedUnionOverScenarios"], "blendMatchLagByBank": best, "scenariosProbed": cons_n},
                       "allocatorDerived": {"baselineOccupiedSprites": sc["baselineOccupied"], "baselineTasks": sc["baselineTasks"], "acceptedLiteralsEqualRom": {k: v["equal"] for k, v in lit.items()}, "constantAcrossScenarios": {k: v for k, v in cons.items() if k != "ages"}, "spawnAgesDistinctAcrossScenarios": cons["ages"],
                                            "firstFree": ff["scenarios"][f"{key}-{side}-accepted"], "romSlots": {k: sc.get(k) for k in ("hitsplat", "orbs", "stars", "paletteController", "rays")}, "tasks": sc["tasks"]},
                       "order": {"orderAtActivationRestricted": sc["orderAtActivationRestricted"], "trackerLend": tl, "firstBodyLab": fbl and fbl["targetBody"], "pixelVariants": [r for r in px["results"] if r["move"] == name.replace("MEGA_DRAIN", "MEGA_DRAIN") and r["orientation"] == side]},
                       "rendererLiftNeeded": LIFT[name],
                       "routes": {"acceptedSpeciesFirstRoute": acc_route, "carrierSpecies": routes["species"][name], "slot0Count": routes["slot0Counts"].get(name), "anySlotCount": routes["anySlotCounts"].get(name)}},
             "precedingBodies": pre}
        (FX / f"prep9-{key}-{side}.json").write_text(json.dumps(d, indent=2) + "\n")
(FX / "prep9-summary.json").write_text(json.dumps(summary, indent=1) + "\n")
for r in summary["rows"]: print(r["move"].ljust(12), r["orientation"][:3], "act", r["activation"], "end", r["scriptEndFirstInactive"], "win", r["window"], "row", r["shadowRow"], "dur", r["duration"], "script", r["scriptFrames"], "we-se", r["windowEndMinusScriptEnd"], "pre", [b["moveId"] for b in r["precedingBodies"]])
