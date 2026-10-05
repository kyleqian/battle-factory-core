#!/usr/bin/env python3
"""Generates the drafted (not yet consumed) live fixtures tools/integration/fixtures/next-<move>-<side>.json.
Values come from the accepted compare fixtures/evidence and /tmp activation probes (see docs/next-adapters-prep.md)."""
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
OUT = ROOT + "/tools/integration/fixtures"
G = lambda side: {"side": side}

def put(name, d):
    with open(f"{OUT}/next-{name}.json", "w") as f:
        json.dump(d, f, indent=2); f.write("\n")

def draft(move, side, act, win, dur, extra, **kw):
    start, end = win
    d = {"schema": "next-adapter-draft/v1", "move": move, **kw,
         "denseWindow": {"startFrame": start, "endFrame": end, "ageOffset": 0},
         "draft": {"activationFrame": act, "shadowRow": act - start, "expectedDuration": dur,
                   "consumedByTest": False, **extra}}
    return d

# DIZZY_PUNCH / SCARY_FACE: the accepted compare fixture is a complete Fixture (scenario/probe/attacker/target/fieldProfile).
for side, (act, win) in {"player": (77, (90, 158)), "opponent": (81, (94, 162))}.items():
    src = "tools/compare/fixtures/" + ("dizzy-punch-player-spinda-opponent-onix.json" if side == "player" else "dizzy-punch-opponent-spinda-player-onix.json")
    pers = {"player": 2349019157, "opponent": 1793700107}[side]
    put(f"dizzy-punch-{side}", draft("DIZZY_PUNCH", side, act, win, 69,
        {"attackerPersonality": pers,
         "personalityPixelEffect": "none (player back sprite carries no Spinda spots)" if side == "player" else "Spinda spots on the opponent front frame"},
        sourceFixture=src))
for side, (act, win) in {"player": (75, (79, 268)), "opponent": (79, (83, 272))}.items():
    src = f"tools/compare/fixtures/scary-face-{side}-rhyhorn-{'opponent' if side=='player' else 'player'}-shuckle.json"
    eye = {"player": {"x": 72, "y": 100}, "opponent": {"x": 176, "y": 49}}[side]
    put(f"scary-face-{side}", draft("SCARY_FACE", side, act, win, 190,
        {"attackerEyeCenter": eye, "attackerEyeCenterSource": "liveBattlerAnchors(attackerSide).picOffsetPoint (X_2 / Y_PIC_OFFSET), no arg offset"},
        sourceFixture=src))

def mon(sp, side): return {"species": sp, "geometry": G(side)}
GL = {"player": ("player-back-to-opponent-front", 74, (74, 286), {"playerHp": 207, "playerMaxHp": 207, "opponentHp": 127, "opponentMaxHp": 127},
                 {"x": 72, "y": 95}, {"x": 82, "y": 93}, {"x": 176, "y": 49}),
      "opponent": ("opponent-front-to-player-back", 78, (78, 290), {"playerHp": 127, "playerMaxHp": 127, "opponentHp": 207, "opponentMaxHp": 207},
                   {"x": 176, "y": 49}, {"x": 168, "y": 49}, {"x": 72, "y": 99})}
for side, (orient, act, win, fp, eye, s, e) in GL.items():
    t = "opponent" if side == "player" else "player"
    put(f"glare-{side}", draft("GLARE", side, act, win, 213,
        {"attackerEyeCenter": eye, "eyeDotStart": s, "eyeDotEnd": e,
         "derivation": "eyeCenter = attacker picOffsetPoint + (0,-8) [sparkle arg]; dotStart.x = pic.x +/- BATTLER_COORD_ATTR_HEIGHT/4 (+ player, - opponent), dotStart.y = pic.y - HEIGHT/4; dotEnd = target picOffsetPoint"},
        probe="tools/compare/glareProbe.py", scenario=f"tools/battle-lab/mechanic-glare-{side}-dunsparce-{t}-shuckle.json",
        attacker=mon("DUNSPARCE", side), target=mon("SHUCKLE", t), fieldProfile=fp, orientation=orient))

TD = {"player": (227, (227, 395), {"playerHp": 154, "playerMaxHp": 167, "opponentHp": 110, "opponentMaxHp": 110, "playerGender": "female", "opponentGender": "male"},
                 2349019136, {"x": 72, "y": 84}, "tools/compare/fixtures/teeter-dance-player-spinda-opponent-onix.json", "SPINDA", "ONIX"),
      "opponent": (222, (222, 390), {"playerHp": 110, "playerMaxHp": 110, "opponentHp": 154, "opponentMaxHp": 167, "playerGender": "male", "opponentGender": "female"},
                   1793700111, {"x": 176, "y": 48}, "tools/compare/fixtures/teeter-dance-player-onix-opponent-spinda.json", "SPINDA", "ONIX")}
for side, (act, win, fp, pers, ctr, scen, a, t) in TD.items():
    tside = "opponent" if side == "player" else "player"
    put(f"teeter-dance-{side}", draft("TEETER_DANCE", side, act, win, 169,
        {"attackerSpriteCenter": ctr, "attackerSpriteCenterSource": "liveBattlerAnchors(attackerSide).spriteCenter (Harden precedent, liveMoveAnimation.ts:427)",
         "attackerPersonality": pers, "personalityPixelEffect": "none (player back sprite)" if side == "player" else "Spinda spots on the opponent front frame"},
        probe="tools/compare/teeterDanceProbe.py", scenario=scen,
        attacker=mon(a, side), target=mon(t, tside), fieldProfile=fp))

SB = {"player": (227, (227, 498), "tools/battle-lab/mechanic-soft-boiled-player-chansey-opponent-onix.json",
                 {"playerHp": 297, "playerMaxHp": 325, "opponentHp": 110, "opponentMaxHp": 110, "playerGender": "female"}, {"x": 72, "y": 99}),
      "opponent": (228, (228, 499), "tools/battle-lab/mechanic-soft-boiled-opponent-chansey-player-onix.json",
                   {"playerHp": 110, "playerMaxHp": 110, "opponentHp": 296, "opponentMaxHp": 325, "opponentGender": "female"}, {"x": 176, "y": 49})}
for side, (act, win, scen, fp, heal) in SB.items():
    other = "opponent" if side == "player" else "player"
    put(f"soft-boiled-{side}", draft("SOFT_BOILED", side, act, win, 272,
        {"healingCenter": heal, "healingCenterSource": "liveBattlerAnchors(attackerSide).picOffsetPoint (target == attacker; AnimSpriteOnMonPos arg3=0 -> X_2/Y_PIC_OFFSET)",
         "needsToolChange": "liveAdapterFramebuffer.ts SELF_TARGET_MOVES lacks SOFT_BOILED, so liveView would send target = the other side; the request must have target == attacker",
         "nonAttackerBattler": {"species": "ONIX", "side": other, "drawnFrom": "field art, not a hard-coded corner"}},
        probe="tools/compare/softBoiledProbe.py", scenario=scen,
        attacker=mon("CHANSEY", side), target=mon("CHANSEY", side), fieldProfile=fp))
