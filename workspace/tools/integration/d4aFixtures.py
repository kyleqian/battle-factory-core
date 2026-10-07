#!/usr/bin/env python3
"""D4a/D4b faithful-timing dense fixtures (Mach Punch 183, Nightmare 171, Megahorn 224) from fresh direct-mGBA prep22Probe.py outputs (prep22Probes.sh DIR 1 <scenarios>).
Window = [activation, activation + own body rows - 1] of the probed body: each scenario's OWN activation and length (the measured CPU phase); the fixture
records the phase ("event" = the optional late lag is present, "no-event" = not) for the D4 check (zero residual in the policy's phase, documented rows
only in the other). Same recipe as q2Fixtures.py. usage: d4aFixtures.py PROBEDIR [move...]   -> tools/integration/fixtures/d4a-live/*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1]); ONLY = set(sys.argv[2:])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
# move -> (id, rows with the optional lag ("event"), rows without)
MOVES = {"MACH_PUNCH": (183, 110, 109), "NIGHTMARE": (171, 168, 167), "MEGAHORN": (224, 177, 176), "REVENGE": (279, 145, 145)}
# Megahorn rows include the first inactive row (probe end - start + 1; liveMoveAnimationDuration = first inactive age + 1, as Pursuit / Return).
INCLUSIVE = {"MEGAHORN": 1, "REVENGE": 1}
# Revenge has no optional lag (145 rows in every window); its only CPU-phase parameter is the monbg BGnCNT write row ("event" = row 5),
# banked by prep26RevengeCheck.ts knownFor for the four prep26 windows (docs/next-adapters-prep26.md s2.4).
PREP26_MONBG_ROW = {"mechanic-revenge-player-machamp-opponent-shuckle": 5, "mechanic-revenge-opponent-qwilfish-player-shuckle": 4,
                    "prep25-revenge-alt-player-machoke-golem": 5, "prep25-revenge-alt-opponent-machoke-golem": 5}
# Megahorn's second CPU-phase parameter (bg-write-row: the monbg BGnCNT write row, "event" = the later row 8) = the first body row whose
# regEvents value of the monbg layer's BGnCNT (bg1 for a player attacker, bg2 for an opponent attacker) differs from the activation value.
# Cross-checked against the six windows banked by prep24MegahornCheck.ts phaseOf (docs/next-adapters-prep24.md s0.2 H(a)).
PREP24_MONBG_ROW = {"mechanic-megahorn-player-seaking-opponent-onix": 8, "mechanic-megahorn-opponent-seaking-player-onix": 8,
             "prep18-megahorn-alt-heracross-golem": 7, "prep18-megahorn-altopp-heracross-golem": 7,
             "prep24-megahorn-alt-heracross-onix": 7, "prep24-megahorn-altopp-heracross-onix": 8}
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
          ("REVENGE", "revenge-alt-opponent-machoke-golem", "prep25-revenge-alt-opponent-machoke-golem", "opponent")]
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
           {"timingPhases": {"bg-write-row": "event" if monbg_row == 5 else "no-event"}, "monbgCntRow": monbg_row} if move == "REVENGE" else {}),
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
    (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
    print(tag, fx["denseWindow"], rows, fx["timingPhase"], fx["attacker"]["species"], "->", fx["target"]["species"], pre)
