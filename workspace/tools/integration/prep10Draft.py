#!/usr/bin/env python3
"""prep10: DRAFTED dense fixtures tools/integration/fixtures/prep10-<move>-<side>.json (`<side>` = attacker side; schema prep10-adapter-draft/v1, prep9 shape + `inputs`) and prep10-summary.json
from the prep10 receipts (fixtures/prep10-probes/r1 = lab scenarios incl. alternate species, stage-r1 = staged fire-punch/endeavor, prep10-route-probe.json, census-activation windows).
UNVERIFIED by an adapter run (no harness; `consumedByTest: false`).   usage (workspace root): python3 tools/integration/prep10Draft.py"""
import json
from pathlib import Path
FX = Path("tools/integration/fixtures"); rd = lambda p: json.load(open(p))
import re
NAMES = {int(v): k for k, v in re.findall(r"#define SPECIES_(\w+)\s+(\d+)\b", open("reference/pokeemerald/include/constants/species.h").read())}  # internal ids
R1 = FX / "prep10-probes/r1"; ST = FX / "prep10-probes/stage-r1"
routes = rd(FX / "prep10-route-probe.json"); act = rd(FX / "census-activation/summary.json")["rows"]
MOVE_ID = {"MAGNITUDE": 222, "REVERSAL": 179, "FLAIL": 175, "PAIN_SPLIT": 220, "SPARK": 209, "FIRE_PUNCH": 7, "ENDEAVOR": 283, "ROCK_BLAST": 350, "RAZOR_WIND": 13}
# (move, attacker side) -> (probe file stem in r1 | ("stage", file), kind) ; kind accepted = the accepted lab/staged scenario, alt = alternate-species scenario
CASES = [
 ("MAGNITUDE", "player", "mechanic-magnitude-regular-player-graveler-opponent-onix", "accepted"), ("MAGNITUDE", "opponent", "mechanic-magnitude-regular-opponent-graveler-player-onix", "accepted"),
 ("MAGNITUDE", "player", "mechanic-magnitude-intense-player-camerupt-opponent-onix", "accepted-intense"), ("MAGNITUDE", "opponent", "mechanic-magnitude-intense-opponent-camerupt-player-onix", "accepted-intense"),
 ("MAGNITUDE", "player", "magnitude-intense-player-realcamerupt-opponent-onix", "alt-species CAMERUPT (internal 340)"), ("MAGNITUDE", "opponent", "magnitude-intense-opponent-realcamerupt-player-onix", "alt-species CAMERUPT (internal 340)"),
 ("REVERSAL", "player", "mechanic-reversal-hp-bands-off", "accepted-hp-bands(scene-off lab file, probed Scene ON)"),
 ("REVERSAL", "player", "mechanic-reversal-player-delcatty-opponent-vigoroth", "accepted"), ("REVERSAL", "player", "reversal-player-raichu-opponent-vigoroth", "alt-species RAICHU"),
 ("FLAIL", "player", "mechanic-flail-hp-bands-off", "accepted-hp-bands(scene-off lab file, probed Scene ON)"),
 ("FLAIL", "player", "mechanic-flail-player-krabby-opponent-onix", "accepted"), ("FLAIL", "opponent", "mechanic-flail-opponent-krabby-player-onix", "accepted"),
 ("FLAIL", "player", "flail-player-kingler-opponent-onix", "alt-species KINGLER"), ("FLAIL", "opponent", "flail-opponent-kingler-player-onix", "alt-species KINGLER"),
 ("PAIN_SPLIT", "player", "mechanic-pain-split-player-misdreavus-opponent-gengar", "accepted"), ("PAIN_SPLIT", "opponent", "mechanic-pain-split-opponent-misdreavus-player-gengar", "accepted"),
 ("PAIN_SPLIT", "player", "pain-split-player-dusclops-opponent-gengar", "alt-species DUSCLOPS"), ("PAIN_SPLIT", "opponent", "pain-split-opponent-dusclops-player-gengar", "alt-species DUSCLOPS"),
 ("SPARK", "player", "mechanic-spark-player-minun-opponent-shuckle", "accepted"), ("SPARK", "opponent", "mechanic-spark-opponent-minun-player-shuckle", "accepted"),
 ("SPARK", "player", "spark-player-plusle-opponent-shuckle", "alt-species PLUSLE"), ("SPARK", "opponent", "spark-opponent-plusle-player-shuckle", "alt-species PLUSLE"), ("SPARK", "player", "spark-player-chinchou-opponent-shuckle", "alt-species CHINCHOU"),
 ("FIRE_PUNCH", "player", ("stage", "fire-punch-player"), "accepted-staged (ONIX->GROVYLE)"), ("FIRE_PUNCH", "opponent", ("stage", "fire-punch-opponent"), "accepted-staged (GROVYLE->ONIX)"),
 ("FIRE_PUNCH", "player", "mechanic-fire-punch-burn-lifecycle-off", "lab MAGBY-class burn lifecycle (scene-off lab file, probed Scene ON)"),
 ("ENDEAVOR", "player", ("stage", "endeavor-player"), "accepted-staged (ONIX attacker)"), ("ENDEAVOR", "opponent", "mechanic-endeavor-success", "lab (scene-off file) opponent Endeavor"), ("ENDEAVOR", "player", "mechanic-endeavor-fail", "lab (scene-off file) player Endeavor (fails: attacker HP >= target)"),
 ("ROCK_BLAST", "player", "mechanic-rock-blast-player-rhyhorn-opponent-shuckle", "accepted"), ("ROCK_BLAST", "opponent", "mechanic-rock-blast-opponent-rhyhorn-player-shuckle", "accepted"),
 ("ROCK_BLAST", "player", "rock-blast-player-octillery-opponent-shuckle", "alt-species OCTILLERY"), ("ROCK_BLAST", "opponent", "rock-blast-opponent-octillery-player-shuckle", "alt-species OCTILLERY"),
 ("RAZOR_WIND", "player", "mechanic-razor-wind-player-nuzleaf-opponent-onix", "accepted"), ("RAZOR_WIND", "opponent", "mechanic-razor-wind-opponent-nuzleaf-player-onix", "accepted"),
 ("RAZOR_WIND", "player", "razor-wind-player-absol-opponent-onix", "alt-species ABSOL"), ("RAZOR_WIND", "opponent", "razor-wind-opponent-absol-player-onix", "alt-species ABSOL"),
]
VERDICT = {
 "MAGNITUDE": "READY-WITH-CHANGE (dynamic power on the request; Random()%100 magnitude roll is gameplay RNG already in the engine)",
 "REVERSAL": "READY-WITH-CHANGE (dynamic power on the request + reducer toggle fix ceil(A/2)/-floor(A/2))",
 "FLAIL": "READY-WITH-CHANGE for the X-POWER part (reducer already exact for 20/40/80/100/150/200); BLOCKED overall by the 2 Random2 words (code C)",
 "PAIN_SPLIT": "READY-WITH-CHANGE for the accepted MISDREAVUS/GENGAR pair (coords.yOffset per side into the reducer); alternate species DISCREPANT (see doc 3.4)",
 "SPARK": "READY-WITH-CHANGE for the player attacker (constants zero); BLOCKED for the opponent attacker (flashing initial advances vary by species) and for hardwareTieSlotOrder (not the activation-time lent order)",
 "FIRE_PUNCH": "READY-WITH-CHANGE (body-only: flames/burn are a separate ordinary status body; accepted-window phase RESOLVED: opponent window starts after the body, player reducer age at activation = 27)",
 "ENDEAVOR": "READY-WITH-CHANGE (persistent presentation register of the last CalculateBaseDamage power; 0 at battle start)",
 "ROCK_BLAST": "READY (one body per hit; request.turn 0..n-1 + multihit n..1 already emitted)",
 "RAZOR_WIND": "READY (request.turn 0 = charge body, 1 = attack body)",
}
def window_of(move, side, probe):
    for r in act:
        if r["move"] == move and r["probe"].replace("mechanic-", "") .startswith(probe.replace("mechanic-", "")[:len(r["probe"])]) and r.get("window"): return r["window"], r.get("activationMinusWindowStart")
    return None, None
summary = {"schema": "prep10-summary/v1", "verdicts": VERDICT, "rows": []}
for move, side, probe, kind in CASES:
    mid = MOVE_ID[move]
    p = (ST / f"{probe[1]}.json") if isinstance(probe, tuple) else (R1 / f"{probe}.json")
    d = rd(p)
    bodies = [b for b in d["bodies"] if b["move"] == mid]
    if not bodies: continue
    first = bodies[0]; a = first["atActivation"]; att, tgt = a["attacker"], a["target"]
    other = "opponent" if side == "player" else "player"
    sp = lambda m: NAMES[m["species"]]
    name = probe[1] if isinstance(probe, tuple) else probe
    rr = [r for r in routes if r["move"] == move and r.get("requestedMove")]
    row = {"move": move, "id": mid, "orientation": side, "probe": name, "kind": kind, "scenario": d["scenario"],
           "attacker": sp(a["mons"][att]), "target": sp(a["mons"][tgt]),
           "bodies": [{"start": b["start"], "end": b["end"], "frames": (b["end"] - b["start"]) if b["end"] else None, "animTurn": b["atActivation"]["animTurn"] - 1, "multiHitCounter": b["atActivation"]["multiHitCounter"],
                       "gAnimMovePower": b["atActivation"]["gAnimMovePower"], "gBattleMovePower": b["atActivation"]["gBattleMovePower"], "gDynamicBasePower": b["atActivation"]["gDynamicBasePower"],
                       "hpBefore": [m["hp"] for m in b["atActivation"]["mons"]], "maxHp": [m["maxHP"] for m in b["atActivation"]["mons"]], "status1": [m["status1"] for m in b["atActivation"]["mons"]]} for b in bodies],
           "baseline": {"gOamMatrixAllocBitmap": hex(a["bitmap"]), "activeTasks": a["tasks"], "occupiedSprites": a["sprites"]}, "orderAtActivationHead": a["spriteOrder"][:24],
           "stalePowerChanges": [[c["f"], c["gBattleMovePower"], c["gDynamicBasePower"], c["gAnimMovePower"], c["currentMove"]] for c in d["powerChanges"]]}
    win, rowoff = window_of(move, side, name)
    row["acceptedWindow"] = win; row["activationMinusWindowStart"] = rowoff
    summary["rows"].append(row)
    out = {"schema": "prep10-adapter-draft/v1", "DRAFT": "unverified by an adapter run", "move": move, "kind": kind, "probe": name, "attacker": {"species": row["attacker"], "geometry": {"side": side}},
           "target": {"species": row["target"], "geometry": {"side": other}}, "verdict": VERDICT[move],
           "draft": {"activationFrame": first["start"], "scriptEndFirstInactive": first["end"], "scriptFrames": (first["end"] - first["start"]) if first["end"] else None, "acceptedWindow": win, "windowStartMinusActivation": None if not win else win["start"] - first["start"],
                     "consumedByTest": False, "bodies": row["bodies"], "baseline": row["baseline"], "orderAtActivation": a["spriteOrder"], "powerChanges": row["stalePowerChanges"],
                     "requestRoutes": [{"seed": r["seed"], "streak": r["streak"], "species": r["species"], "firstBody": r["firstBody"], "requestPower": r["moveRequest"] and r["moveRequest"].get("field") is not None and None} for r in rr[:3]]}}
    (FX / f"prep10-{move.lower().replace('_', '-')}-{side}-{name.replace('mechanic-', '')[:60]}.json").write_text(json.dumps(out, indent=1) + "\n")
(FX / "prep10-summary.json").write_text(json.dumps(summary, indent=1) + "\n")
for r in summary["rows"]: print(r["move"].ljust(11), r["orientation"][:3], r["kind"][:28].ljust(28), r["attacker"], "->", r["target"], [(b["start"], b["frames"], b["gAnimMovePower"], b["animTurn"]) for b in r["bodies"]][:4])
