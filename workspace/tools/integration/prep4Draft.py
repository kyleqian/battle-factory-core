#!/usr/bin/env python3
"""Generates the drafted (not yet consumed) live fixtures tools/integration/fixtures/prep4-<move>-<side>.json.
Values: accepted compare fixtures / evidence manifests, activation frames measured with
tools/integration/issue142ActivationProbe.py on the accepted scenarios, derived-config pins computed with the
production liveBattlerAnchors + createBattleCommandFieldArtView (tools/integration/prep4Pins.mjs; see docs/h-buffer-s1-prep.md).
`<side>` = attacker side. Fixtures carry a `draft` block the harness ignores."""
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
OUT = ROOT + "/tools/integration/fixtures"
BL = "tools/battle-lab/mechanic-"

def mon(sp, side): return {"species": sp, "geometry": {"side": side}}
def put(move_key, side, d):
    with open(f"{OUT}/prep4-{move_key}-{side}.json", "w") as f:
        json.dump(d, f, indent=2); f.write("\n")

def emit(key, move, probe, side, scen, a, t, fp, orient, act, win, extra, probeArgs=None):
    start, end = win
    d = {"schema": "prep4-adapter-draft/v1", "move": move, "probe": probe, "scenario": BL + scen,
         "attacker": mon(a, side), "target": mon(t, "opponent" if side == "player" else "player"),
         "fieldProfile": fp, "orientation": orient,
         "denseWindow": {"startFrame": start, "endFrame": end, "ageOffset": 0},
         "draft": {"activationFrame": act, "shadowRow": act - start, "shadowRowInMap": act - start >= 0,
                   "expectedDuration": end - start + 1, "consumedByTest": False, **extra}}
    put(key, side, d)

def prof(php, pmax, ohp, omax, pg="male", og="male"):
    return {"playerHp": php, "playerMaxHp": pmax, "opponentHp": ohp, "opponentMaxHp": omax, "playerGender": pg, "opponentGender": og}


def prof2(php, pmax, ohp, omax, pg, og): return prof(php, pmax, ohp, omax, pg, og)
ACT = {}  # measured activation frames: tools/integration/fixtures/prep4-activation/<scenario>.json (issue142ActivationProbe.py)
def act(scen, mv):
    d = json.load(open(f"{OUT}/prep4-activation/mechanic-{scen}"))
    return next(i["start"] for i in d["intervals"] if i["move"] == mv)

def go(key, move, mid, probe, scen_p, scen_o, a, t, fps, wins, extras, ageOffsets=(0, 0), accepted=None):
    for k, (side, scen) in enumerate((("player", scen_p), ("opponent", scen_o))):
        start, end = wins[k]; ao = ageOffsets[k]
        pa = a[k] if isinstance(a, tuple) else a
        a_ = act(scen, mid)
        # draft window: first row is the first age >= 0 (a negative first-frame presentation age is trimmed off, see doc)
        ws = start - ao if ao < 0 else start
        d = {"schema": "prep4-adapter-draft/v1", "move": move, "probe": probe, "scenario": BL + scen,
             "attacker": mon(pa, side), "target": mon(t, "opponent" if side == "player" else "player"),
             "fieldProfile": fps[k], "orientation": f"{side}-{'back' if side == 'player' else 'front'} {pa} -> {'opponent-front' if side == 'player' else 'player-back'} {t}",
             "denseWindow": {"startFrame": ws, "endFrame": end, "ageOffset": 0},
             "draft": {"activationFrame": a_, "shadowRow": a_ - start + ao, "shadowRowInMap": a_ - start + ao >= 0,
                       "expectedDuration": end - ws + 1, "consumedByTest": False,
                       "acceptedWindow": {"startFrame": start, "endFrame": end, "firstFramePresentationAge": ao}, **extras[k]}}
        put(key, side, d)

OPP = lambda s: "opponent" if s == "player" else "player"
# ---- EMBER (Onix <-> Murkrow). FaintAttack-style profile: no max HP in the accepted config; max = Onix 117 / Murkrow 142 (rental sets 156 / 184).
go("ember", "EMBER", 52, "tools/probe/run-battle-lab-rgb.py", "ember-player-onix-opponent-murkrow.json", "ember-opponent-onix-player-murkrow.json", "ONIX", "MURKROW",
   [prof(117, 117, 142, 142, "female", "male"), prof(142, 142, 69, 117, "female", "male")], [(388, 450), (442, 504)],
   [{"animationProfile": {"attackerCenter": {"x": 72, "y": 88}, "targetCenter": {"x": 176, "y": 51}, "targetBattlePosition": {"x": 176, "y": 40}, "attackerSide": "player", "targetSubpriority": 40},
     "order": "NEEDS-ORDER: 90 equal-key overlapping ember/flare pairs (prep4-tie-scan.json); reducer proxies OAM order with spawnIndex"},
    {"animationProfile": {"attackerCenter": {"x": 176, "y": 42}, "targetCenter": {"x": 72, "y": 97}, "targetBattlePosition": {"x": 72, "y": 80}, "attackerSide": "opponent", "targetSubpriority": 30},
     "order": "NEEDS-ORDER (same)"}])
# ---- DRAGON_BREATH (Onix <-> Murkrow). accepted window begins at presentation age -2.
go("dragon-breath", "DRAGON_BREATH", 225, "tools/probe/run-battle-lab-rgb.py", "dragon-breath-player-onix-opponent-murkrow.json", "dragon-breath-opponent-onix-player-murkrow.json", "ONIX", "MURKROW",
   [prof(117, 117, 142, 142, "female", "male"), prof(142, 142, 69, 117, "female", "male")], [(395, 479), (449, 533)],
   [{"animationProfile": {"attackerCenter": {"x": 72, "y": 88}, "targetCenter": {"x": 176, "y": 51}, "attackerSide": "player", "duration": 20, "targetSubpriority": 40, "subpriorityOffset": 2, "spawnCount": 11, "spawnInterval": 4},
     "order": "ORDER-INDEPENDENT: 0 equal-key pairs over the window (prep4-tie-scan.json)", "animationAgeOffsetNote": "accepted fixture starts at presentation age -2 (appStage.firstFramePresentationAge); draft window trims the two pre-age-0 rows"},
    {"animationProfile": {"attackerCenter": {"x": 176, "y": 42}, "targetCenter": {"x": 72, "y": 97}, "attackerSide": "opponent", "duration": 20, "targetSubpriority": 30, "subpriorityOffset": 2, "spawnCount": 11, "spawnInterval": 4},
     "order": "ORDER-INDEPENDENT (same)", "animationAgeOffsetNote": "same"}], ageOffsets=(-2, -2))
# ---- DEFENSE_CURL (Phanpy -> Onix)
go("defense-curl", "DEFENSE_CURL", 111, "tools/compare/defenseCurlProbe.py", "defense-curl-player-phanpy-opponent-onix.json", "defense-curl-opponent-phanpy-player-onix.json", "PHANPY", "ONIX",
   [prof(172, 183, 117, 117, "male", "male"), prof(117, 117, 171, 183, "male", "male")], [(214, 313), (215, 314)],
   [{"animationProfile": {"attackerPicYOffset": 14, "attackerSubpriority": 30}, "attackerAnimationCenter": {"x": 72, "y": 86},
     "attackerAnimationCenterSource": "attacker battlePositionCenter + (0,6): Move_DEFENSE_CURL argv (0,6,0,1), AnimSpriteOnMonPos respectMonPicOffsets=FALSE (battle_anim_mons.c:1515-1528); NOT the pic point (72,102)",
     "order": "ORDER-INDEPENDENT: single orb sprite, subpriority attackerSubpriority-2"},
    {"animationProfile": {"attackerPicYOffset": 16, "attackerSubpriority": 40}, "attackerAnimationCenter": {"x": 176, "y": 46}, "attackerAnimationCenterSource": "same rule", "order": "ORDER-INDEPENDENT"}])
# ---- INGRAIN (accepted visual attacker CACTURNE: set-140 mechanic stage overrides party data to Lileep after buffers exist)
go("ingrain", "INGRAIN", 275, "tools/compare/ingrainProbe.py", "ingrain-player-lileep-opponent-onix.json", "ingrain-opponent-lileep-player-onix.json", "CACTURNE", "ONIX",
   [prof(169, 177, 142, 142, "male", "male"), prof(142, 142, 160, 177, "male", "male")], [(205, 368), (293, 456)],
   [{"animationProfile": {"attackerSubpriority": 30}, "attackerBattlePositionCenter": {"x": 72, "y": 80},
     "order": "ORDER-OK: renderer slots 6/8 battlers, 3/4/5/7 roots, 9+i orbs == known-entry firstMove free list (3,4,5,7,9,10,11); 0 overlapping equal-subpriority pairs (prep4-order-scan2.json)",
     "speciesNote": "pixel evidence is CACTURNE art; a Lileep rental renders different art (unverified)"},
    {"animationProfile": {"attackerSubpriority": 40}, "attackerBattlePositionCenter": {"x": 176, "y": 40}, "order": "ORDER-OK (same)", "speciesNote": "same"}])
# ---- MEAN_LOOK (Murkrow -> Onix); config field is called targetSubpriority but the builder fills it with the ATTACKER subpriority
go("mean-look", "MEAN_LOOK", 212, "tools/compare/meanLookProbe.py", "mean-look-player-murkrow-opponent-onix.json", "mean-look-opponent-murkrow-player-onix.json", "MURKROW", "ONIX",
   [prof(156, 156, 142, 142, "male", "male"), prof(142, 142, 156, 156, "male", "male")], [(71, 241), (75, 245)],
   [{"animationProfile": {"targetSubpriority": 30}, "targetAnimationCenter": {"x": 176, "y": 42}, "order": "ORDER-INDEPENDENT: one eye sprite, subpriority 30-2"},
    {"animationProfile": {"targetSubpriority": 40}, "targetAnimationCenter": {"x": 72, "y": 88}, "order": "ORDER-INDEPENDENT: one eye sprite, subpriority 40-2"}])
# ---- SMELLING_SALT (Granbull -> Onix)
go("smelling-salt", "SMELLING_SALT", 265, "tools/compare/smellingSaltProbe.py", "smelling-salt-player-granbull-opponent-onix.json", "smelling-salt-opponent-granbull-player-onix.json", "GRANBULL", "ONIX",
   [prof(190, 197, 142, 142, "female", "male"), prof(142, 142, 190, 197, "male", "female")], [(218, 338), (218, 338)],
   [{"animationProfile": {"targetLeft": 148, "targetRight": 204, "targetTop": 10, "targetPictureY": 42, "targetVerticalSpan": 60},
     "order": "ORDER-INDEPENDENT: hands never overlap (min centre distance 48 >= 32, prep4-order-scan2.json)", "adhocShadow": "none (player attacker)"},
    {"animationProfile": {"targetLeft": 44, "targetRight": 100, "targetTop": 56, "targetPictureY": 88, "targetVerticalSpan": 64},
     "order": "ORDER-INDEPENDENT", "adhocShadow": "src/engine/battleScene.ts:41910-41916 drawSourceOpponentEnemyShadow at age 0 (opponent attacker): retire, hook draws row 0"}])
# ---- S2 BIND (Onix -> Murkrow) / WRAP (Tentacool -> Onix)
go("bind", "BIND", 20, "tools/probe/run-battle-lab-rgb.py", "bind-player-onix-opponent-murkrow.json", "bind-opponent-onix-player-murkrow.json", "ONIX", "MURKROW",
   [prof(117, 117, 142, 142, "female", "male"), prof(142, 142, 69, 117, "female", "male")], [(382, 426), (436, 480)],
   [{"animationProfile": "BIND_ANIMATION_PROFILE (script literals: sway 0/6/3328/4, squeeze 10/-5/5, starts [3,21])", "order": "no sprite-order input (no OAM sprites)"},
    {"animationProfile": "same", "order": "same"}])
go("wrap", "WRAP", 35, "tools/compare/wrapProbe.py", "wrap-player-tentacool-opponent-onix.json", "wrap-opponent-tentacool-player-onix.json", "TENTACOOL", "ONIX",
   [prof(117, 136, 110, 110, "male", "male"), prof(110, 110, 136, 136, "male", "male")], [(222, 259), (78, 115)],
   [{"animationProfile": "WRAP profile (script literals: ellipse 6/4/2/4, squeeze 10/-5/5, starts [1,19])", "order": "no sprite-order input"},
    {"animationProfile": "same", "order": "same"}])
