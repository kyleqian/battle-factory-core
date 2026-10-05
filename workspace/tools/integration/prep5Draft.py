#!/usr/bin/env python3
"""Generates the drafted (not yet consumed) live fixtures tools/integration/fixtures/prep5-<move>-{player,opponent}.json
(`<side>` = attacker side; shape of prep4-*.json, schema prep5-adapter-draft/v1) and fixtures/prep5-summary.json.
Values: accepted compare fixtures / evidence manifests; activation intervals measured with issue142ActivationProbe.py
(tools/integration/prep5Activation.sh -> fixtures/prep5-activation/); derived config values from fixtures/prep5-pins.json (production
liveBattlerAnchors + createBattleCommandFieldArtView); order verdicts from fixtures/prep5-tie-scan.json / prep5-heal-bell-order.json /
prep5-belly-drum-order.json (see docs/next-adapters-prep5.md). Run from workspace root."""
import json, os, gzip
R = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
FX = R + "/tools/integration/fixtures"; CF = R + "/tools/compare/fixtures/"
rd = lambda p: json.load(open(p))
pins = rd(FX + "/prep5-pins.json")
def pin(move, o, field): return next(p["derived"] for p in pins if p["move"] == move and p["orientation"] == o and p["field"] == field)
def xy(s): x, y = s.split(","); return {"x": int(x), "y": int(y)}
def act(scen, mv): return next(i for i in rd(f"{FX}/prep5-activation/mechanic-{scen}.json")["intervals"] if i["move"] == mv)
def win(d):
    for k in ("sourceWindow", "denseWindow", "window"):
        if k in d: return d[k]["startFrame"], d[k]["endFrame"]
ORDER = {  # verdicts, see doc s2
 "HEAL_BELL": "NEEDS-ORDER: note painter order replays a persistent sSpriteOrder from an ASSUMED initial [4,5,7,9,10,11] (healBell.ts:372-407); other permutations change the order on 5 ages (first age 34) with overlapping notes (prep5-heal-bell-order.json)",
 "MIST_BALL": "ORDER-INDEPENDENT: one projectile sprite at a time (prep5-tie-scan.json)",
 "AROMATHERAPY": "ORDER-INDEPENDENT: 0 equal-key pairs over the window (prep5-tie-scan.json)",
 "PERISH_SONG": "NEEDS-ORDER: 16 notes tie-break on reducer oamSlot (battleScene.ts perish branch `right.oamSlot - left.oamSlot`); 6 equal-centerY overlapping pairs with different tile/matrix per orientation (all at centerY -9, top clip); slots are the known-entry free list 3,4,5,7,9..20 (prep5-tie-scan.json)",
 "DRAGON_RAGE": "NEEDS-ORDER (weak): 28 equal-y fire-plume pairs (spawns 0/4, 2/6) resolved by spawnIndex (orderFirePlumesForDraw); 32x32 plumes at dx 30 overlap by 2 px (pixel effect unmeasured)",
 "FOLLOW_ME": "ORDER-INDEPENDENT: one finger sprite",
 "TAUNT": "ORDER-INDEPENDENT: bubble (createsprite subpriority offset 11) and finger (12) differ in subpriority; the scan's equal-key hits are same-position pairs with distinct keys",
 "METRONOME": "ORDER-INDEPENDENT: bubble (offset 11) and finger (offset 12) differ in subpriority (same note as Taunt)",
 "LEAF_BLADE": "NEEDS-ORDER: blade slot 3 / trails share subpriority and (x,y) on 32/26 ages with different tile cells; renderer replays persistent order from assumed [3, ...TRAIL_OAM_SLOTS] (leafBlade.ts:236-275)",
 "BELLY_DRUM": "ORDER-INDEPENDENT: note painter order identical for 4 initial permutations of [4,5,7,9,10] (prep5-belly-drum-order.json)",
}
SHADOW = {"HEAL_BELL": "src/engine/battleScene.ts:34419-34430 (opponent attacker, healState.age === 0, drawn at animationCenter.x - width/2, battlePositionCenter.y + 29): retire",
          "MIST_BALL": "src/engine/battleScene.ts:17589-17594 (opponent attacker, view.age === 0, animationCenter.x - 16, battlePositionCenter.y + 25): retire"}
# move: (id, probe, [(attacker, target)], scenario stems (player, opponent), fixture names, extra-config fn)
M = [
 ("HEAL_BELL", 215, "tools/compare/healBellProbe.py", "CHIMECHO", "ONIX", ("heal-bell-player-chimecho-opponent-onix", "heal-bell-opponent-chimecho-player-onix"), None),
 ("MIST_BALL", 296, "tools/compare/mistBallProbe.py", "LATIAS", "REGISTEEL", ("mist-ball-player-latias-opponent-registeel", "mist-ball-opponent-latias-player-registeel"), "mist-ball-%s-latias-%s-registeel"),
 ("AROMATHERAPY", 312, None, "VILEPLUME", "ONIX", ("aromatherapy-player-vileplume-opponent-onix", "aromatherapy-opponent-vileplume-player-onix"), "aromatherapy-%s-vileplume-%s-onix"),
 ("PERISH_SONG", 195, "tools/compare/perishSongProbe.py", "MURKROW", "ONIX", ("perish-song-player-murkrow-opponent-onix", "perish-song-opponent-murkrow-player-onix"), "perish-song-%s-murkrow-%s-onix"),
 ("DRAGON_RAGE", 82, None, "CHARMELEON", "ONIX", ("dragon-rage-charmeleon-onix", "dragon-rage-onix-charmeleon"), "dragon-rage-%s-charmeleon-%s-onix"),
 ("FOLLOW_ME", 266, None, "TOGETIC", "ONIX", ("follow-me-player-togetic-opponent-onix", "follow-me-opponent-togetic-player-onix"), "follow-me-%s-togetic-%s-onix"),
 ("TAUNT", 269, None, "MURKROW", "SHUCKLE", ("taunt-player-murkrow-opponent-shuckle", "taunt-opponent-murkrow-player-shuckle"), "taunt-%s-murkrow-%s-shuckle"),
 ("METRONOME", 118, None, "CHANSEY", "ONIX", ("metronome-player-chansey-opponent-onix", "metronome-opponent-chansey-player-onix"), "metronome-%s-chansey-%s-onix"),
 ("LEAF_BLADE", 348, None, "SCEPTILE", "ONIX", ("leaf-blade-player-sceptile-opponent-onix", "leaf-blade-opponent-sceptile-player-onix"), "leaf-blade-%s-sceptile-%s-onix"),
 ("BELLY_DRUM", 187, "tools/compare/bellyDrumProbe.py", "POLIWRATH", "ONIX", ("belly-drum-player-poliwrath-opponent-onix", "belly-drum-opponent-poliwrath-player-onix"), None),
]
HB_FP = {"player": {"playerHp": 152, "playerMaxHp": 161, "opponentHp": 110, "opponentMaxHp": 110, "playerGender": "female", "opponentGender": "male"},
         "opponent": {"playerHp": 110, "playerMaxHp": 110, "opponentHp": 151, "opponentMaxHp": 161, "playerGender": "male", "opponentGender": "female"}}
summary = []
for move, mid, probe, A, T, scens, fxname in M:
    for k, side in enumerate(("player", "opponent")):
        o = "player-back" if side == "player" else "opponent-front"; tside = "opponent" if side == "player" else "player"
        scen = scens[k]; stem = scen if fxname is None or move in ("HEAL_BELL",) else None
        if move == "HEAL_BELL":
            ev = rd(CF + "heal-bell-evidence.json")["orientations"][o]; w = win(ev); fp = HB_FP[side]; srcprobe = probe
        elif move == "BELLY_DRUM":
            ev = rd(CF + "belly-drum-evidence.json")["orientations"][o]; w = win(ev); srcprobe = probe
            first = json.load(gzip.open(R + "/" + ev["denseState"]))["frames"][0]["battlers"]
            fp = {"playerHp": first["player"]["hp"], "playerMaxHp": first["player"]["maxHp"], "opponentHp": first["opponent"]["hp"], "opponentMaxHp": first["opponent"]["maxHp"], "playerGender": "male", "opponentGender": "male"}
        else:
            f = rd(CF + (fxname % (("player", "opponent") if side == "player" else ("opponent", "player"))) + ".json")
            w = win(f); fp = f["fieldProfile"]; srcprobe = f.get("probe") or f"(see {f['scenario']})"
        a = act(scen, mid); start, end = w
        row = a["start"] - start
        extra = {}
        att = {"animationCenter": xy(pin(move, o, "attacker.geometry.animationCenter")), "battlePositionCenter": xy(pin(move, o, "attacker.geometry.battlePositionCenter"))}
        extra["derivedAttacker"] = att
        for fld in ("attackerTop", "attackerHead", "targetProfile", "attackerNoteOrigin"):
            hit = [p for p in pins if p["move"] == move and p["orientation"] == o and p["field"] == fld]
            if hit: extra[fld] = json.loads(hit[0]["derived"]) if hit[0]["derived"].startswith("{") else xy(hit[0]["derived"])
        if move == "PERISH_SONG": extra["fieldProfileAdd"] = {"playerPerishSongTurns": 3, "opponentPerishSongTurns": 3}
        d = {"schema": "prep5-adapter-draft/v1", "move": move, "probe": srcprobe, "scenario": "tools/battle-lab/mechanic-" + scen + ".json",
             "attacker": {"species": A, "geometry": {"side": side}}, "target": {"species": T, "geometry": {"side": tside}},
             "fieldProfile": fp, "orientation": f"{o} {A} -> {'opponent-front' if side == 'player' else 'player-back'} {T}",
             "denseWindow": {"startFrame": start, "endFrame": end, "ageOffset": 0},
             "draft": {"activationFrame": a["start"], "scriptEndFirstInactive": a["end"], "shadowRow": row, "shadowRowInMap": row >= 0,
                       "expectedDuration": end - start + 1, "consumedByTest": False, "acceptedWindow": {"startFrame": start, "endFrame": end},
                       "order": ORDER[move], "adhocShadowDraw": SHADOW.get(move, "none"), **extra}}
        with open(f"{FX}/prep5-{move.lower().replace('_', '-')}-{side}.json", "w") as fh: json.dump(d, fh, indent=2); fh.write("\n")
        summary.append({"move": move, "id": mid, "side": side, "activation": a["start"], "scriptEndFirstInactive": a["end"], "window": [start, end], "shadowRow": row,
                        "shadowRowInMap": row >= 0, "duration": end - start + 1, "windowEndMinusScriptEnd": end - a["end"]})
json.dump(summary, open(FX + "/prep5-summary.json", "w"), indent=1)
for s in summary: print(s["move"], s["side"], "act", s["activation"], "win", s["window"], "row", s["shadowRow"], "dur", s["duration"], "scriptEnd", s["scriptEndFirstInactive"], "winEnd-scriptEnd", s["windowEndMinusScriptEnd"])
