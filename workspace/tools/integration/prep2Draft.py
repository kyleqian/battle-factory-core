#!/usr/bin/env python3
"""Generates the drafted (not yet consumed) live fixtures tools/integration/fixtures/prep2-<move>-<side>.json.
Values: accepted compare fixtures / evidence manifests, activation frames measured with
tools/integration/issue142ActivationProbe.py on the accepted scenarios, derived-config pins computed with the
production liveBattlerAnchors + createBattleCommandFieldArtView (see docs/next-adapters-prep2.md).
`<side>` = attacker side. Fixtures carry a `draft` block the harness ignores."""
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
OUT = ROOT + "/tools/integration/fixtures"
BL = "tools/battle-lab/mechanic-"

def mon(sp, side): return {"species": sp, "geometry": {"side": side}}
def put(move_key, side, d):
    with open(f"{OUT}/prep2-{move_key}-{side}.json", "w") as f:
        json.dump(d, f, indent=2); f.write("\n")

def emit(key, move, probe, side, scen, a, t, fp, orient, act, win, extra, probeArgs=None):
    start, end = win
    d = {"schema": "prep2-adapter-draft/v1", "move": move, "probe": probe, "scenario": BL + scen,
         "attacker": mon(a, side), "target": mon(t, "opponent" if side == "player" else "player"),
         "fieldProfile": fp, "orientation": orient,
         "denseWindow": {"startFrame": start, "endFrame": end, "ageOffset": 0},
         "draft": {"activationFrame": act, "shadowRow": act - start, "shadowRowInMap": act - start >= 0,
                   "expectedDuration": end - start + 1, "consumedByTest": False, **extra}}
    put(key, side, d)

def prof(php, pmax, ohp, omax, pg="male", og="male"):
    return {"playerHp": php, "playerMaxHp": pmax, "opponentHp": ohp, "opponentMaxHp": omax, "playerGender": pg, "opponentGender": og}

# SURF (Wartortle -> Shuckle) / MUDDY_WATER (Marshtomp -> Onix): H_BASIC, same renderer branch (battleScene.ts:17983).
emit("surf", "SURF", "tools/compare/surfWaveProbe.py", "player", "surf-player-wartortle-opponent-shuckle.json", "WARTORTLE", "SHUCKLE",
     prof(134, 134, 127, 127), "player-back WARTORTLE -> opponent-front SHUCKLE", 72, (72, 215), {"configInputs": "none beyond attacker/target/fieldProfile"})
emit("surf", "SURF", "tools/compare/surfWaveProbe.py", "opponent", "surf-opponent-wartortle-player-shuckle.json", "WARTORTLE", "SHUCKLE",
     prof(127, 127, 134, 134), "opponent-front WARTORTLE -> player-back SHUCKLE", 76, (76, 219), {"configInputs": "none beyond attacker/target/fieldProfile"})
emit("muddy-water", "MUDDY_WATER", "tools/compare/muddyWaterProbe.py", "player", "muddy-water-player-marshtomp-opponent-onix.json", "MARSHTOMP", "ONIX",
     prof(145, 145, 142, 142), "player-back MARSHTOMP -> opponent-front ONIX", 80, (80, 223), {"configInputs": "none beyond attacker/target/fieldProfile", "hpSource": "probe frame 0 battlers (muddyWaterPortable.ts:172-178)"})
emit("muddy-water", "MUDDY_WATER", "tools/compare/muddyWaterProbe.py", "opponent", "muddy-water-opponent-marshtomp-player-onix.json", "MARSHTOMP", "ONIX",
     prof(142, 142, 145, 145), "opponent-front MARSHTOMP -> player-back ONIX", 84, (84, 227), {"configInputs": "none beyond attacker/target/fieldProfile", "hpSource": "probe frame 0 battlers"})

# ICY_WIND (Swinub -> Onix): effectGeometry from anchors only.
emit("icy-wind", "ICY_WIND", "tools/compare/icyWindProbe.py", "player", "icy-wind-player-swinub-opponent-onix.json", "SWINUB", "ONIX",
     prof(108, 125, 110, 110), "player-back SWINUB -> opponent-front ONIX", 220, (220, 506),
     {"effectGeometry": {"attackerCenter": {"x": 72, "y": 104}, "targetCenter": {"x": 176, "y": 42}, "spikeTargetCenter": {"x": 176, "y": 40}},
      "effectGeometrySource": "attackerCenter/targetCenter = liveBattlerAnchors(side).picOffsetPoint (Swinub player pic y clamps to 104); spikeTargetCenter = target battlePositionCenter"})
emit("icy-wind", "ICY_WIND", "tools/compare/icyWindProbe.py", "opponent", "icy-wind-opponent-swinub-player-onix.json", "SWINUB", "ONIX",
     prof(110, 110, 108, 125), "opponent-front SWINUB -> player-back ONIX", 220, (220, 506),
     {"effectGeometry": {"attackerCenter": {"x": 176, "y": 60}, "targetCenter": {"x": 72, "y": 88}, "spikeTargetCenter": {"x": 72, "y": 80}},
      "effectGeometrySource": "same as player"})

# BLIZZARD (Pelipper -> Onix)
emit("blizzard", "BLIZZARD", "tools/compare/blizzardProbe.py", "player", "blizzard-player-pelipper-opponent-onix.json", "PELIPPER", "ONIX",
     prof(158, 167, 110, 110), "player-back PELIPPER -> opponent-front ONIX", 214, (214, 585),
     {"effectGeometry": {"attackerCenter": {"x": 72, "y": 94}, "targetCenter": {"x": 176, "y": 42}},
      "effectGeometrySource": "attacker/target liveBattlerAnchors(side).picOffsetPoint (SetAverageBattlerPositions in singles = the target's own X_2/Y_PIC_OFFSET)"})
emit("blizzard", "BLIZZARD", "tools/compare/blizzardProbe.py", "opponent", "blizzard-opponent-pelipper-player-onix.json", "PELIPPER", "ONIX",
     prof(110, 110, 158, 167), "opponent-front PELIPPER -> player-back ONIX", 213, (213, 573),
     {"effectGeometry": {"attackerCenter": {"x": 176, "y": 36}, "targetCenter": {"x": 72, "y": 88}}, "effectGeometrySource": "same as player"})

# FAKE_OUT (Makuhita -> Shuckle)
emit("fake-out", "FAKE_OUT", "tools/compare/fakeOutProbe.py", "player", "fake-out-player-makuhita-opponent-shuckle.json", "MAKUHITA", "SHUCKLE",
     prof(179, 179, 127, 127), "player-back MAKUHITA -> opponent-front SHUCKLE", 78, (78, 163),
     {"targetPictureYOffset": 9, "targetPictureYOffsetSource": "liveBattlerAnchors-adjacent: createBattleCommandFieldArtView(field)[targetSide].coords.yOffset (opponent-front Shuckle table)"})
emit("fake-out", "FAKE_OUT", "tools/compare/fakeOutProbe.py", "opponent", "fake-out-opponent-makuhita-player-shuckle.json", "MAKUHITA", "SHUCKLE",
     prof(127, 127, 179, 179), "opponent-front MAKUHITA -> player-back SHUCKLE", 82, (82, 167),
     {"targetPictureYOffset": 11, "targetPictureYOffsetSource": "same; player-back Shuckle table"})

# EXPLOSION (Glalie -> Shuckle): attacker displayed HP is 0 in the accepted evidence (setatkhptozero precedes the animation).
emit("explosion", "EXPLOSION", "tools/compare/selfDestructProbe.py", "player", "explosion-player-glalie-opponent-shuckle.json", "GLALIE", "SHUCKLE",
     prof(0, 155, 95, 95), "player-back GLALIE -> opponent-front SHUCKLE", 72, (76, 287),
     {"needsInput": "attacker displayed HP 0 at event time (fieldProfile.playerHp = 0); source battle_scripts_1.s:380 setatkhptozero before attackanimation",
      "carrier": "real Level-50 Factory set-495"})
emit("explosion", "EXPLOSION", "tools/compare/selfDestructProbe.py", "opponent", "explosion-opponent-glalie-player-shuckle.json", "GLALIE", "SHUCKLE",
     prof(95, 95, 0, 155), "opponent-front GLALIE -> player-back SHUCKLE", 76, (80, 291),
     {"needsInput": "attacker displayed HP 0 at event time (fieldProfile.opponentHp = 0)", "carrier": "real Level-50 Factory set-495"})

# FUTURE_SIGHT (Kadabra -> Onix); gender male from personality&255 >= ratio (futureSightPortable.ts:16,67)
emit("future-sight", "FUTURE_SIGHT", "tools/probe/run-battle-lab-rgb.py", "player", "future-sight-kadabra-onix.json", "KADABRA", "ONIX",
     prof(115, 115, 110, 110), "player-back KADABRA -> opponent-front ONIX", 72, (77, 190),
     {"note": "turn-1 body only; the delayed hit is playanimation B_ANIM_FUTURE_SIGHT_HIT (battle_scripts_1.s:3519), not this body"})
emit("future-sight", "FUTURE_SIGHT", "tools/probe/run-battle-lab-rgb.py", "opponent", "future-sight-opponent-kadabra-player-onix.json", "KADABRA", "ONIX",
     prof(110, 110, 115, 115), "opponent-front KADABRA -> player-back ONIX", 76, (81, 194), {"note": "same"})

# COSMIC_POWER (Lunatone -> Onix); Lunatone is genderless
emit("cosmic-power", "COSMIC_POWER", "tools/compare/cosmicPowerProbe.py", "player", "cosmic-power-player-lunatone-opponent-onix.json", "LUNATONE", "ONIX",
     prof(173, 177, 110, 110, "none", "male"), "player-back LUNATONE -> opponent-front ONIX", 294, (294, 534),
     {"configInputs": "none; fieldProfile gender 'none' (cosmicPowerPortable.ts:130)", "carrier": "Factory set 222"})
emit("cosmic-power", "COSMIC_POWER", "tools/compare/cosmicPowerProbe.py", "opponent", "cosmic-power-opponent-lunatone-player-onix.json", "LUNATONE", "ONIX",
     prof(110, 110, 173, 177, "male", "none"), "opponent-front LUNATONE -> player-back ONIX", 294, (294, 534), {"configInputs": "none", "carrier": "Factory set 222"})
