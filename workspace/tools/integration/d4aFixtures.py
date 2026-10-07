#!/usr/bin/env python3
"""D4a/D4b/D4c faithful-timing dense fixtures (Mach Punch 183, Nightmare 171, Megahorn 224, Revenge 279, Meteor Mash 309, Psywave 149) from fresh direct-mGBA prep22Probe.py outputs (prep22Probes.sh DIR 1 <scenarios>).
Window = [activation, activation + own body rows - 1] of the probed body: each scenario's OWN activation and length (the measured CPU phase); the fixture
records the phase ("event" = the optional late lag is present, "no-event" = not) for the D4 check (zero residual in the policy's phase, documented rows
only in the other). Same recipe as q2Fixtures.py. usage: d4aFixtures.py PROBEDIR [move...]   -> tools/integration/fixtures/d4a-live/*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1]); ONLY = set(sys.argv[2:])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
# move -> (id, rows with the optional lag ("event"), rows without)
MOVES = {"MACH_PUNCH": (183, 110, 109), "NIGHTMARE": (171, 168, 167), "MEGAHORN": (224, 177, 176), "REVENGE": (279, 145, 145), "METEOR_MASH": (309, 215, 214), "PSYWAVE": (149, 205, 204), "EXTRASENSORY": (326, 162, 161)}
# Megahorn rows include the first inactive row (probe end - start + 1; liveMoveAnimationDuration = first inactive age + 1, as Pursuit / Return).
INCLUSIVE = {"MEGAHORN": 1, "REVENGE": 1, "METEOR_MASH": 1, "PSYWAVE": 1, "EXTRASENSORY": 1}
# Revenge has no optional lag (145 rows in every window); its only CPU-phase parameter is the monbg BGnCNT write row ("event" = row 5),
# banked by prep26RevengeCheck.ts knownFor for the four prep26 windows (docs/next-adapters-prep26.md s2.4).
PREP26_MONBG_ROW = {"mechanic-revenge-player-machamp-opponent-shuckle": 5, "mechanic-revenge-opponent-qwilfish-player-shuckle": 4,
                    "prep25-revenge-alt-player-machoke-golem": 5, "prep25-revenge-alt-opponent-machoke-golem": 5}
# Extrasensory's second CPU-phase parameter (scanline-split-line, "event" = the distortion write lands inside the target's displayed lines): the
# opponent-target alternates have a residual at S = 0 that no constant split line removes, the other four windows are exact at S = 0
# (tools/integration/fixtures/prep30/extrasensory-pixels.json / extrasensory-split.json, docs/next-adapters-prep30.md s1.4); banked by scenario.
PREP30_SPLIT = {"prep25-extrasensory-alt-player-alakazam-golem": "event", "prep30-extrasensory-alt-player-espeon-crobat": "event"}
# Megahorn's second CPU-phase parameter (bg-write-row: the monbg BGnCNT write row, "event" = the later row 8) = the first body row whose
# regEvents value of the monbg layer's BGnCNT (bg1 for a player attacker, bg2 for an opponent attacker) differs from the activation value.
# Cross-checked against the six windows banked by prep24MegahornCheck.ts phaseOf (docs/next-adapters-prep24.md s0.2 H(a)).
PREP24_MONBG_ROW = {"mechanic-megahorn-player-seaking-opponent-onix": 8, "mechanic-megahorn-opponent-seaking-player-onix": 8,
             "prep18-megahorn-alt-heracross-golem": 7, "prep18-megahorn-altopp-heracross-golem": 7,
             "prep24-megahorn-alt-heracross-onix": 7, "prep24-megahorn-altopp-heracross-onix": 8}
# Nightmare's second CPU-phase parameter (palette-transfer-row, "event" = the Task_FadeToBg BG-palette restore lands on the later row 149, "no-event"
# = row 148; display-neutral: BLDY 16 on rows 146..150), banked by tools/integration/fixtures/prep32/nightmare-check.json windows[].phase.restoreRow.
PREP32_RESTORE_ROW = {"mechanic-nightmare-player-haunter-opponent-shuckle": 149, "mechanic-nightmare-opponent-haunter-player-shuckle": 149,
                      "prep25-nightmare-alt-player-gengar-golem": 148, "prep25-nightmare-alt-opponent-gengar-golem": 148,
                      "d4a-nightmare-extra-player-gengar-golbat": 148, "d4a-nightmare-extra-opponent-gengar-golbat": 148,
                      "d4a-nightmare-extra-player-haunter-snorlax": 149, "d4a-nightmare-extra-opponent-haunter-snorlax": 149}
ACC = {"mach-punch": ("MACH_PUNCH", "hitmonchan-chansey"), "nightmare": ("NIGHTMARE", "haunter-shuckle")}
ALT = {"mach-punch": "machamp-golem", "nightmare": "gengar-golem"}
CASES = []  # (move, tag, scenario, side)
for key, (move, pair) in ACC.items():
    a, t = pair.split("-")
    for side in ("player", "opponent"):
        foe = "opponent" if side == "player" else "player"
        CASES.append((move, f"{key}-{side}-{a}-{foe}-{t}", f"mechanic-{key}-{side}-{a}-{foe}-{t}", side))
        aa, at = ALT[key].split("-")
        CASES.append((move, f"{key}-alt-{side}-{aa}-{at}", f"prep25-{key}-alt-{side}-{aa}-{at}", side))
CASES += [tuple(c) for c in json.loads((Path(__file__).parent / "d4aCases.json").read_text())]
CASES += [("MEGAHORN", "megahorn-player-seaking-opponent-onix", "mechanic-megahorn-player-seaking-opponent-onix", "player"),
          ("MEGAHORN", "megahorn-opponent-seaking-player-onix", "mechanic-megahorn-opponent-seaking-player-onix", "opponent"),
          ("MEGAHORN", "megahorn-alt-player-heracross-golem", "prep18-megahorn-alt-heracross-golem", "player"),
          ("MEGAHORN", "megahorn-alt-opponent-heracross-golem", "prep18-megahorn-altopp-heracross-golem", "opponent"),
          ("MEGAHORN", "megahorn-alt-player-heracross-onix", "prep24-megahorn-alt-heracross-onix", "player"),
          ("MEGAHORN", "megahorn-alt-opponent-heracross-onix", "prep24-megahorn-altopp-heracross-onix", "opponent"),
          ("REVENGE", "revenge-player-machamp-opponent-shuckle", "mechanic-revenge-player-machamp-opponent-shuckle", "player"),
          ("REVENGE", "revenge-opponent-qwilfish-player-shuckle", "mechanic-revenge-opponent-qwilfish-player-shuckle", "opponent"),
          ("REVENGE", "revenge-alt-player-machoke-golem", "prep25-revenge-alt-player-machoke-golem", "player"),
          ("REVENGE", "revenge-alt-opponent-machoke-golem", "prep25-revenge-alt-opponent-machoke-golem", "opponent"),
          ("METEOR_MASH", "meteor-mash-player-metang-opponent-onix", "mechanic-meteor-mash-player-metang-opponent-onix", "player"),
          ("METEOR_MASH", "meteor-mash-opponent-metang-player-onix", "mechanic-meteor-mash-opponent-metang-player-onix", "opponent"),
          ("METEOR_MASH", "meteor-mash-alt-player-shiftry-golem", "prep12-meteor-mash-alt-shiftry-golem", "player")]
# Random2 bodies (D3): the presentation host is pinned to the ROM's gRng2Value at the activation frame (one ISO_RANDOMIZE1 step before the
# probe's first rng2Series row A + 1), so the dense check replays the source words; production draws them from the per-battle host.
LCG_INV = pow(1103515245, -1, 2 ** 32)
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
out = R / "tools/integration/fixtures/d4a-live"
out.mkdir(exist_ok=True)
for move, tag, scen, side in CASES:
    if ONLY and move not in ONLY: continue
    if not (D / f"{scen}-r1.json").exists():
        continue  # a PROBEDIR may hold a subset of the scenarios
    p = json.loads((D / f"{scen}-r1.json").read_text())
    mid, event_rows, none_rows = MOVES[move]
    bodies = p["bodies"]
    idx = next(i for i, b in enumerate(bodies) if b["move"] == mid)
    body = bodies[idx]
    A, E = body["start"], body["end"]
    rows = E - A + INCLUSIVE.get(move, 0)
    monbg_row = None
    if move in ("MEGAHORN", "REVENGE"):
        key = "bg1" if side == "player" else "bg2"
        regs = [(f - A, rg) for f, rg in p["regEvents"] if f <= A + 12]
        at = [rg for f, rg in regs if f <= 0][-1][key]
        monbg_row = next(f for f, rg in regs if f > 0 and rg[key] != at)
        rows_ok = (7, 8) if move == "MEGAHORN" else (4, 5)
        assert monbg_row in rows_ok and {**PREP24_MONBG_ROW, **PREP26_MONBG_ROW}.get(scen, monbg_row) == monbg_row, (scen, monbg_row)
    assert rows in (event_rows, none_rows), (scen, rows)
    m = body["atActivation"]["mons"]
    foe = "opponent" if side == "player" else "player"
    sp = {"player": m[0], "opponent": m[1]}
    name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
    fx = {
        "schema": "d4a-live-adapter-fixture/v1", "move": move,
        "probe": "tools/probe/run-battle-lab-rgb.py", "scenario": f"tools/battle-lab/{scen}.json",
        "denseWindow": {"startFrame": A, "endFrame": A + rows - 1},
        "windowSource": f"window = [activation, activation + {rows} - 1] (this scenario's own body) from a fresh prep22Probes.sh run",
        "timingPhase": ("event" if monbg_row == 5 else "no-event") if move == "REVENGE" else "event" if rows == event_rows else "no-event",
        **({"timingPhases": {"optional-lag-age": "event" if rows == event_rows else "no-event",
                             "bg-write-row": "event" if monbg_row == 8 else "no-event"}, "monbgCntRow": monbg_row} if move == "MEGAHORN" else
           {"timingPhases": {"bg-write-row": "event" if monbg_row == 5 else "no-event"}, "monbgCntRow": monbg_row} if move == "REVENGE" else
           {"timingPhases": {"optional-lag-age": "event" if rows == event_rows else "no-event",
                             "scanline-split-line": PREP30_SPLIT.get(scen, "no-event")}} if move == "EXTRASENSORY" else
           {"timingPhases": {"optional-lag-age": "event" if rows == event_rows else "no-event",
                             "palette-transfer-row": "event" if PREP32_RESTORE_ROW[scen] == 149 else "no-event"},
            "restoreRow": PREP32_RESTORE_ROW[scen]} if move == "NIGHTMARE" else {}),
        "attacker": {"species": name(sp[side]), "geometry": {"side": side}},
        "target": {"species": name(sp[foe]), "geometry": {"side": foe}},
        "attackerPersonality": sp[side]["personality"],
        "displayedStatus": {"player": status(m[0]["status1"]), "opponent": status(m[1]["status1"])},
        "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                         "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])},
    }
    pre = [{"moveId": b["move"], "side": "player" if b["atActivation"]["attacker"] == 0 else "opponent"} if b["move"] != 0
           else {"moveId": 0, "side": "player" if b["atActivation"]["attacker"] == 0 else "opponent", "statusAnimation": "SLP"} for b in bodies[:idx]]
    if pre:
        fx["precedingBodies"] = pre
    if move == "METEOR_MASH":
        r2 = dict((f, v) for f, v in p["rng2Series"])
        fx["presentationRngActivation"] = {"value": ((r2[A + 1] - 24691) * LCG_INV) & 0xFFFFFFFF,
                                           "source": f"prep22Probe.py rng2Series[{A + 1}] stepped back once (activation frame {A})"}
    (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
    print(tag, fx["denseWindow"], rows, fx["timingPhase"], fx["attacker"]["species"], "->", fx["target"]["species"], pre)
