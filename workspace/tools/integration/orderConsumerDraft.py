#!/usr/bin/env python3
"""Generates fixtures/order-consumer-summary.json and the DRAFTED (unconsumed) live fixtures fixtures/order-consumer-<move>-{player,opponent}.json
(`<side>` = attacker side; schema order-consumer-adapter-draft/v1, shape of prep5-*.json; the `draft` block is ignored by loaders).
Inputs: accepted compare fixtures / evidence (tools/compare/fixtures), activation receipts (fixtures/order-consumer-activation/, fresh direct mGBA),
pins (fixtures/order-consumer-pins.json), provider replay (fixtures/order-consumer-seeds.json), sensitivity (order-consumer-truth.json, order-consumer-seed-sensitivity.json).
Run from workspace root: python3 tools/integration/orderConsumerDraft.py"""
import json, gzip
from pathlib import Path
R = Path(__file__).resolve().parents[2]
FX = R / "tools/integration/fixtures"; CF = R / "tools/compare/fixtures"
rd = lambda p: json.loads(Path(p).read_text())
pins = rd(FX / "order-consumer-pins.json"); seeds = rd(FX / "order-consumer-seeds.json")["scenarios"]
def pin(move, o, field):
    h = [p for p in pins if p["move"] == move and p["orientation"] == o and p["field"] == field]; return h[0]["derived"] if h else None
def xy(s):
    if s is None: return None
    x, y = s.split(","); return {"x": int(x), "y": int(y)}
def act(scen, mv, nth=0):
    iv = [i for i in rd(FX / f"order-consumer-activation/mechanic-{scen}.json")["intervals"] if i["move"] == mv]; return iv[nth]
def seed_rec(stem, mv, body=0): return next(s for s in seeds if s["scenario"] == stem and s["move"] == mv and s["bodyOfMove"] == body)
def dense(path): return json.load(gzip.open(R / path))["frames"]
HB_FP = {"player": {"playerHp": 152, "playerMaxHp": 161, "opponentHp": 110, "opponentMaxHp": 110, "playerGender": "female", "opponentGender": "male"},
         "opponent": {"playerHp": 110, "playerMaxHp": 110, "opponentHp": 151, "opponentMaxHp": 161, "playerGender": "male", "opponentGender": "female"}}
def fp_from_dense(path):
    f = dense(path)[0]; p, o = f["parties"]["player"][0], f["parties"]["opponent"][0]
    return {"playerHp": p["hp"], "playerMaxHp": p["maxHp"], "opponentHp": o["hp"], "opponentMaxHp": o["maxHp"],
            "playerGender": "female" if p["gender"] == "female" else "male", "opponentGender": "female" if o["gender"] == "female" else "male"}

# move: id, probe, attacker, target, scenario stems (player, opponent) = (scenario, compare fixture), verdict + order text
M = [
 dict(move="EMBER", id=52, probe="tools/probe/run-battle-lab-rgb.py", A="ONIX", T="MURKROW", scen=("ember-player-onix-opponent-murkrow", "ember-opponent-onix-player-murkrow"), src="compare",
      verdict="READY (provider-independent)", field="none: ember.ts:174-199 sorts equal-Y embers/flares by creationOrder (earlier created = frontmost)",
      call="none. Every tie pair is created in a different sort window (6 frames apart: createFrames 1 slot each), so a later sprite always sorts behind an equal-key earlier one regardless of F",
      measure="order-consumer-truth.json (EMBER): reducer painter order == observed sSpriteOrder on 45/45 compared ages at nominal alignment, both orientations (0 differ)"),
 dict(move="FLAMETHROWER", id=53, probe="tools/probe/run-battle-lab-rgb.py", A="ONIX", T="MURKROW", scen=("flamethrower-player-onix-opponent-murkrow", "flamethrower-opponent-onix-player-murkrow"), src="compare",
      verdict="READY-WITH-PROVIDER", field="animationProfile.spriteOrderSeed (relative order of animationProfile.flameSpriteSlots; flamethrower.ts:22-34 geometry, :93-110 createSpriteOrderState)",
      call="F at the frame before the first flame create, filtered to flameSpriteSlots: provider.free.filter(s => flameSpriteSlots.includes(s)) (NOT free.slice(0, n): the first-8 of F is [4,3,21,20,..], the 8 lowest-free slots are 3,4,5,7,9..12)",
      measure="order-consumer-seeds.json: provider == accepted literal == observed on 2/2; order-consumer-seed-sensitivity.json: 5 alternative seeds change 0/130 ages (flames are created one per sort window)"),
 dict(move="ROCK_THROW", id=88, probe="tools/probe/run-battle-lab-rgb.py", A="GRAVELER", T="ONIX", scen=("rock-throw-player-graveler-opponent-onix", "rock-throw-opponent-graveler-player-onix"), src="compare",
      verdict="READY-WITH-PROVIDER", field="animationProfile.spriteOrderSeed (64 entries) + occupiedSpriteSlots (rockThrow.ts:73-80, :238 `order = seed.slice()`)",
      call="[...occupiedPrefix, ...provider.free] with provider.free = F before the first rock create (frame 2305 = body+3, creates [3,4]); occupiedPrefix = the fresh sort of the nine battler/healthbox/shadow slots = [62,60,0,63,1,61,6,8,2] (equals observed 2/2; a constant for the known-entry occupants, species/y dependent in general)",
      measure="order-consumer-seeds.json: free tail == accepted literal == observed 2/2, occupied prefix == observed 2/2; seed sensitivity: 0 differing ages for 5 permutations"),
 dict(move="DRAGON_RAGE", id=82, probe="tools/probe/run-battle-lab-rgb.py", A="CHARMELEON", T="ONIX", scen=("dragon-rage-charmeleon-onix", "dragon-rage-onix-charmeleon"), src="compare", windowNote="window starts 7 frames after activation, ends 21 before script end",
      verdict="READY (provider-independent)", field="none: dragonRage.ts:387-390 orderFirePlumesForDraw (y asc, then spawnIndex desc within each subpriority group)",
      call="none. Plumes are created 3 frames apart (one per sort window), so equal-key ties are creation-ordered regardless of F",
      measure="order-consumer-truth.json (DRAGON_RAGE): reducer plume paint order == observed on 41/41 compared ages at shift -1 (the plume age lag), both orientations; 5/41 differ at shift 0 (alignment only)"),
 dict(move="HEAL_BELL", id=215, probe="tools/compare/healBellProbe.py", A="CHIMECHO", T="ONIX", scen=("heal-bell-player-chimecho-opponent-onix", "heal-bell-opponent-chimecho-player-onix"), src="heal-bell",
      verdict="READY-WITH-PROVIDER", field="initial persistent order inside healBellNotesInPainterOrder (healBell.ts:371 HEAL_BELL_REUSED_ORDER_SLOTS = [4,5,7,9,10,11], :379-407); needs a new `initialOrder` parameter",
      call="F at the activation edge, filtered to [4,5,7,9,10,11]: provider.free.filter(s => [4,5,7,9,10,11].includes(s)) = [4,5,11,10,9,7] in both fixtures (second action after Tackle)",
      measure="order-consumer-truth.json (HEAL_BELL): assumed [4,5,7,9,10,11], provider and observed-at-age-0 inits all give 0 differing ages vs observed (98 compared) in both orientations; descending/rotated differ on 5 ages (overlapping notes)"),
 dict(move="PERISH_SONG", id=195, probe="tools/compare/perishSongProbe.py", A="MURKROW", T="ONIX", scen=("perish-song-player-murkrow-opponent-onix", "perish-song-opponent-murkrow-player-onix"), src="compare-source",
      verdict="READY (provider optional; needs 3/3 literals)", field="none in config: reducer oamSlot tie (perishSong.ts:12-13 NOTE_SLOTS, battleScene.ts:34629-34632 `centerY asc, oamSlot desc`); fieldProfile.player/opponentPerishSongTurns must be literal 3",
      call="optional: tie rank = (create window, F index before the first create) from provider.free; not needed for pixels: under the accepted oamSlot rule 1 age (age 4, all 16 notes still at (8,8)) has a flipped overlapping pair with different tile/matrix vs observed; under the provider rank 0 ages",
      measure="order-consumer-truth.json (PERISH_SONG-pairs): 675 equal-centerY pairs checked per orientation; rule oamSlot: 1 pixel-relevant age; provider creation rank: 0"),
 dict(move="LEAF_BLADE", id=348, probe="tools/probe/run-battle-lab-rgb.py", A="SCEPTILE", T="ONIX", scen=("leaf-blade-player-sceptile-opponent-onix", "leaf-blade-opponent-sceptile-player-onix"), src="compare-source",
      verdict="READY-WITH-PROVIDER", field="initial persistent order inside leafBladeDisplayedOamOrderAtAge (leafBlade.ts:246 `[3, ...TRAIL_OAM_SLOTS]`, :240-275); needs a new `initialOrder` parameter",
      call="F at the activation edge filtered to [3,4,5,7,9,10,11,12,13,14,15,16] = [4,3,5,16,15,14,13,12,11,10,9,7] (both fixtures, first action)",
      measure="order-consumer-truth.json (LEAF_BLADE): provider init vs assumed init flips 1 visible-pair age and 0 overlapping different-tile-cell ages; both inits are within 2-4/134 ages of observed at shift -1; pixel-insensitive for the measured histories"),
 dict(move="BLAZE_KICK", id=299, probe="tools/probe/run-battle-lab-rgb.py", A="ONIX", T="MURKROW", scen=("blaze-kick-player-onix-opponent-murkrow", "blaze-kick-opponent-onix-player-murkrow"), src="compare",
      verdict="READY-WITH-PROVIDER", field="animationProfile.spriteOrderSeed (relative order of animationProfile.spriteSlots; blazeKick.ts:37, :226)",
      call="F before the first create (frame body+19/+... see seeds receipt, creates [3]) filtered to spriteSlots [3,4,5,7,9..14]",
      measure="order-consumer-seeds.json: provider == literal == observed 2/2; seed sensitivity: reversed/ascending seeds change 8 ages, swap(3,4) 0. Own body is NEEDS-KEYS (cannot precede another order consumer)"),
 dict(move="MUD_SLAP", id=189, probe="tools/probe/run-battle-lab-rgb.py", A="PIDGEOTTO", T="ONIX", scen=("mud-slap-player-pidgeotto-onix", "mud-slap-pidgeotto-onix"), src="compare-nogeo",
      verdict="READY-WITH-PROVIDER", field="animationProfile.spriteOrderSeed (64 entries; mudSlap.ts:16, :89 `order = seed.slice()`)",
      call="[...occupiedPrefix, ...F] with F taken AFTER the body plan prefix [C n0 (slot 3, act+4), D n0 (act+8)] i.e. the frame before the 6-slot mud create window (act+9): head [3,4,21,20,5,...]; NOT the first create window (F head [4,3,...])",
      measure="order-consumer-seeds.json: literal == provider == observed at exactly that frame (2/2) and not at the first create; seed sensitivity: reversed/ascending/rotated tails change 21-41 ages (all with overlapping flips), swap(3,4) 0"),
 dict(move="SAND_ATTACK", id=28, probe="tools/probe/run-battle-lab-rgb.py", A="PIDGEOTTO", T="ONIX", scen=("sand-attack-player-pidgeotto-onix", "sand-attack-pidgeotto-onix"), src="compare-nogeo",
      verdict="READY-WITH-PROVIDER", field="animationProfile.spriteOrderSeed (64 entries; sandAttack.ts:13, :89)",
      call="same as Mud Slap: [...occupiedPrefix, ...F after the body plan prefix up to the 6-slot dirt window]. The accepted literal (head [4,3,..]) equals F BEFORE the transient slot-3 create, i.e. it is NOT F at the 6-slot allocation (head [3,4,..]); pixel-neutral (swap 0/150 ages)",
      measure="order-consumer-seeds.json: literal == provider == observed at the first create window, != at the 6-slot window; seed sensitivity: acceptedWith34Swapped 0 differing ages, other permutations 10-41"),
 dict(move="GRUDGE", id=288, probe="tools/compare/grudgeProbe.py", A="HAUNTER", T="ONIX", scen=("grudge-player-haunter-opponent-onix", "grudge-opponent-haunter-player-onix"), src="grudge",
      verdict="READY-WITH-PROVIDER (first body only; later body NEEDS-KEYS)", field="animationProfile.spriteOrderSeed (6 entries = relative order of flameSlots; grudge.ts:20, :180; accepted from dense row 45, grudgeFramebuffer.ts:62-63)",
      call="F before the 6-slot flame create window (frame 2122/2118, = row 46), filtered to the six flame slots [3,4,5,7,9,10]",
      measure="order-consumer-seeds.json: provider == literal == observed 2/2 (the literal also equals F for the whole range from the body edge to the create, i.e. no in-body event changes it). Second Grudge body (act+~730) follows its own NEEDS-KEYS body: provider invalid"),
 dict(move="DIVE", id=291, probe="tools/compare/diveProbe.py", A="CHINCHOU", T="ONIX", scen=("dive-player-chinchou-opponent-onix", "dive-opponent-chinchou-player-onix"), src="dive",
      verdict="NEEDS-KEYS (setup body READY-WITH-PROVIDER; attack body needs live keys)", field="animationProfile.spriteOrderSeed (body slots; dive.ts:40, :307; accepted from dense rows setup[9] / attack[15], diveFramebuffer.ts:82-88)",
      call="setup body: F before the 11-slot window / full 64 at row 9 filtered to the body slots. Attack body: F depends on the setup body's NEEDS-KEYS destroy groups -> provider invalid",
      measure="order-consumer-seeds.json: setup body provider == literal == observed 2/2 (+ occupied prefix); attack body providerValid=false (preceded by non-EXACT-PLAN unit)"),
]
summary = []
for m in M:
    for k, side in enumerate(("player", "opponent")):
        o = "player-back" if side == "player" else "opponent-front"; tside = "opponent" if side == "player" else "player"
        scen = m["scen"][k]; stem = scen
        act_i = act(scen, m["id"], 0)
        # accepted window + age offset
        if m["src"] == "heal-bell":
            ev = rd(CF / "heal-bell-evidence.json")["orientations"][o]; w = ev["sourceWindow"]; ao = 0; fp = HB_FP[side]; pm = m["probe"]; ae = None
        elif m["src"] == "grudge":
            ev = rd(CF / "grudge-evidence.json")["orientations"][o]; w = ev["sourceWindow"]; ao = 0; fp = fp_from_dense(ev["denseState"]); pm = m["probe"]
        elif m["src"] == "dive":
            ev = rd(CF / "dive-evidence.json")["orientations"][o]; w = ev["bodyWindows"][0]; ao = 0; fp = fp_from_dense(ev["denseState"]); pm = m["probe"]
        else:
            fname = {"dragon-rage-charmeleon-onix": "dragon-rage-player-charmeleon-opponent-onix", "dragon-rage-onix-charmeleon": "dragon-rage-opponent-charmeleon-player-onix"}.get(scen, scen)
            f = rd(CF / (fname + ".json"))
            if m["move"] == "MUD_SLAP" or m["move"] == "SAND_ATTACK": pass
            w = f.get("denseWindow") or f["sourceWindow"]; a = f.get("appStage", {}); ao = a.get("firstFramePresentationAge", a.get("presentationAge", 0))
            fp = f["fieldProfile"]; pm = f.get("probe", m["probe"])
        start, end = w["startFrame"], w["endFrame"]
        row = act_i["start"] - start + ao
        ws = start - ao if ao < 0 else start   # negative first-frame presentation age: trim to age 0
        age_off = ao if ao > 0 else 0
        rows = end - ws + 1
        sr = seed_rec(stem, m["id"])
        lit = sr.get("literal")
        val = {"providerValid": sr["providerValid"], "edgeMatchesObserved": sr.get("edgeMatchesObserved"), "firstCreateFrame": sr.get("firstCreateFrame"), "firstCreateMatchesObserved": sr.get("firstCreateMatchesObserved")}
        if lit: val.update(acceptedLiteralSource=lit["src"], providerMatchesLiteral=lit["providerMatches"], observedMatchesLiteral=lit["observedMatches"], frameChecked=lit["frameChecked"],
                           framesLiteralEqualsProvider=lit["framesLiteralEqualsProvider"], occupiedPrefixEqualsObserved=lit.get("occupiedPrefixEqualsObserved"),
                           matchBeforeEachCreateWindow=[[c["createFrame"], len(c["createdSlots"]), c["providerMatchesLiteral"]] for c in lit["matchBeforeEachCreateWindow"]])
        derived = {}
        for nm, fld in (("animationCenter", "attacker.animationCenter"), ("battlePositionCenter", "attacker.battlePositionCenter")):
            v = pin(m["move"], o, fld) or pin(m["move"], o, "animationProfile.attackerCenter") if nm == "animationCenter" else pin(m["move"], o, fld)
            if v and not v.startswith("{"): derived[nm] = xy(v)
        d = {"schema": "order-consumer-adapter-draft/v1", "move": m["move"], "probe": pm, "scenario": f"tools/battle-lab/mechanic-{scen}.json",
             "attacker": {"species": m["A"], "geometry": {"side": side}}, "target": {"species": m["T"], "geometry": {"side": tside}}, "fieldProfile": fp,
             "orientation": f"{o} {m['A']} -> {'opponent-front' if side == 'player' else 'player-back'} {m['T']}",
             "denseWindow": {"startFrame": ws, "endFrame": end, "ageOffset": age_off},
             "draft": {"activationFrame": act_i["start"], "scriptEndFirstInactive": act_i["end"], "shadowRow": row, "shadowRowInMap": row >= 0,
                       "expectedDuration": rows + age_off, "consumedByTest": False, "acceptedWindow": {"startFrame": start, "endFrame": end, "firstFramePresentationAge": ao},
                       "windowEndMinusScriptEnd": end - act_i["end"], "derivedAttacker": derived,
                       "verdict": m["verdict"], "orderField": m["field"], "orderProviderCall": m["call"], "orderMeasurement": m["measure"], "orderValidation": val,
                       "pins": "tools/integration/fixtures/order-consumer-pins.json"}}
        if m["move"] == "PERISH_SONG": d["draft"]["fieldProfileAdd"] = {"playerPerishSongTurns": 3, "opponentPerishSongTurns": 3, "note": "already literal 3/3 in the accepted fixture fieldProfile"}
        if m["move"] == "DIVE": d["draft"]["secondBody"] = {"activationFrame": act(scen, 291, 1)["start"], "note": "attack body: provider invalid (preceded by NEEDS-KEYS setup body); not drafted"}
        name = f"order-consumer-{m['move'].lower().replace('_', '-')}-{side}.json"
        (FX / name).write_text(json.dumps(d, indent=2) + "\n")
        summary.append({"move": m["move"], "id": m["id"], "side": side, "activation": act_i["start"], "scriptEndFirstInactive": act_i["end"], "window": [start, end], "ageOffset": ao,
                        "shadowRow": row, "shadowRowInMap": row >= 0, "rowsInWindow": rows, "expectedDuration": rows + age_off, "windowEndMinusScriptEnd": end - act_i["end"], "verdict": m["verdict"],
                        "providerValid": sr["providerValid"],
                        "providerMatchesLiteralAtCreateWindows": [[c["createFrame"], len(c["createdSlots"])] for c in (lit or {}).get("matchBeforeEachCreateWindow", []) if c["providerMatchesLiteral"]] if lit else None})
(FX / "order-consumer-summary.json").write_text(json.dumps(summary, indent=1) + "\n")
for s in summary: print(s["move"], s["side"], "act", s["activation"], "win", s["window"], "ao", s["ageOffset"], "row", s["shadowRow"], "dur", s["expectedDuration"], "scriptEnd", s["scriptEndFirstInactive"], "winEnd-scriptEnd", s["windowEndMinusScriptEnd"], "| lit@windows", s["providerMatchesLiteralAtCreateWindows"])
