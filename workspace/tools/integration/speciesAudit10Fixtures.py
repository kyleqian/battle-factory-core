#!/usr/bin/env python3
"""speciesAudit10 fixtures: speciesAudit9Fixtures.py's recipe (d4aFixtures.py / s10aLiveFixtures.py applied to SWAPPED scenarios) for the adapters
merged since audit 9. Everything comes from the swapped scenario's OWN two fresh prep22Probe.py runs (speciesAudit9Probes.sh r1/r2), which must
agree on the bodies: window = [activation, activation + own body rows - 1], HP / gender / personality / status at activation, preceding bodies.
Measured CPU phase per move:
  SHOCK_WAVE   none (scoped exact; geometry-derived length 262..266 = probe end - start + 1).
  PSYWAVE      optional-lag-age = own body rows (205 event / 204 no-event).
  EXTRASENSORY optional-lag-age = own body rows (162 / 161); scanline-split-line is NOT measurable from prep22Probe (a prep30 pixel fit): recorded
               as the policy phase "no-event" with scanlineSplitSource = "assumed-policy" (a residual on such a row is UNRESOLVED until probed).
  NIGHTMARE    optional-lag-age = own body rows (168 / 167); palette-transfer-row (display-neutral) assumed the policy "no-event" likewise.
  SUPERPOWER   bg-write-row: the monbg HOFS row is a prep31 pixel measurement, not in prep22Probe: assumed the per-side policy row (player 10,
               opponent 11) with monbgRowSource = "assumed-policy"; the documented other-phase residual is EMPTY, so any residual is a finding.
  SPIT_UP      none; request.turn = the accepted fixture's Stockpile counter (rows 108 / 109 for counter 3).
usage: speciesAudit10Fixtures.py PROBEDIR OUTDIR list.tsv...   -> OUTDIR/<stem>.json, one status line per row"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D, OUT = Path(sys.argv[1]), Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
MOVES = {"SHOCK_WAVE": (351, None, None), "SUPERPOWER": (276, 248, 248), "PSYWAVE": (149, 205, 204), "EXTRASENSORY": (326, 162, 161),
         "NIGHTMARE": (171, 168, 167), "SPIT_UP": (255, None, None)}
INCLUSIVE = {"SHOCK_WAVE": 1, "SUPERPOWER": 1, "PSYWAVE": 1, "EXTRASENSORY": 1, "SPIT_UP": 1}
def status(v): return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
side_of = lambda b: "player" if b["atActivation"]["attacker"] == 0 else "opponent"
def measure(p, move, side):
    mid = MOVES[move][0]; bodies = p["bodies"]
    idx = next((i for i, b in enumerate(bodies) if b["move"] == mid), None)
    if idx is None: return "BODY-MISSING", None
    body = bodies[idx]
    if side_of(body) != side: return "BODY-SIDE-MISMATCH", None
    if body["end"] is None: return "BODY-NO-END", None
    A, E = body["start"], body["end"]
    return None, {"idx": idx, "A": A, "rows": E - A + INCLUSIVE.get(move, 0), "bodies": [(b["move"], b["start"], b["end"], b["atActivation"]["attacker"]) for b in bodies]}
for lst in sys.argv[3:]:
    for l in open(lst):
        stem, orig, sw, swside = l.rstrip("\n").split("\t")
        of = json.load(open(orig)); move = of["move"]; side = of["attacker"]["geometry"]["side"]; base = Path(sw).stem
        try: ps = [json.load(open(D / f"{base}-r{r}.json")) for r in (1, 2)]
        except Exception as e: print(stem, "NO-PROBE", str(e)[:120]); continue
        ms = [measure(p, move, side) for p in ps]
        if ms[0][0]: print(stem, ms[0][0], [(b["move"], b["start"], b["end"]) for b in ps[0]["bodies"]]); continue
        if ms[0] != ms[1]: print(stem, "RUNS-DISAGREE", ms[0][1], ms[1][1] if ms[1][1] else ms[1][0]); continue
        m0 = ms[0][1]; A, rows = m0["A"], m0["rows"]; mid, ev_rows, none_rows = MOVES[move]
        bad = (ev_rows is not None and rows not in (ev_rows, none_rows)) or (move == "SHOCK_WAVE" and not 260 <= rows <= 270) \
              or (move == "SPIT_UP" and rows != (109 if of["requestFields"]["turn"] == 3 else 108))
        body = ps[0]["bodies"][m0["idx"]]; mm = body["atActivation"]["mons"]; sp = {"player": mm[0], "opponent": mm[1]}
        foe = "opponent" if side == "player" else "player"
        fx = {"schema": "d4a-live-adapter-fixture/v1", "move": move, "probe": "tools/probe/run-battle-lab-rgb.py", "scenario": sw,
              "denseWindow": {"startFrame": A, "endFrame": A + rows - 1},
              "windowSource": f"speciesAudit10: window = [activation, activation + {rows} - 1] of the swapped scenario's own body (2 fresh prep22Probe.py runs agree)"}
        lag = "event" if rows == ev_rows else "no-event"
        if move == "SHOCK_WAVE": fx["timingPhase"] = None
        elif move == "SPIT_UP": fx["requestFields"] = of["requestFields"]
        elif move == "PSYWAVE": fx["timingPhase"] = lag
        elif move == "EXTRASENSORY":
            fx["timingPhase"] = lag; fx["timingPhases"] = {"optional-lag-age": lag, "scanline-split-line": "no-event"}; fx["scanlineSplitSource"] = "assumed-policy"
        elif move == "NIGHTMARE":
            fx["timingPhase"] = lag; fx["timingPhases"] = {"optional-lag-age": lag, "palette-transfer-row": "no-event"}; fx["restoreRowSource"] = "assumed-policy"
        elif move == "SUPERPOWER":
            row = 10 if side == "player" else 11; ph = "event" if row == 11 else "no-event"
            fx["timingPhase"] = ph; fx["timingPhases"] = {"bg-write-row": ph}; fx["monbgCntRow"] = row; fx["monbgRowSource"] = "assumed-policy"
        fx["attacker"] = {"species": name(sp[side]), "geometry": {"side": side}}
        fx["target"] = {"species": name(sp[foe]), "geometry": {"side": foe}}
        fx["attackerPersonality"] = sp[side]["personality"]
        fx["displayedStatus"] = {"player": status(mm[0]["status1"]), "opponent": status(mm[1]["status1"])}
        fx["fieldProfile"] = {"playerHp": mm[0]["hp"], "playerMaxHp": mm[0]["maxHP"], "opponentHp": mm[1]["hp"], "opponentMaxHp": mm[1]["maxHP"],
                              "playerGender": gender(mm[0]["species"], mm[0]["personality"]), "opponentGender": gender(mm[1]["species"], mm[1]["personality"])}
        pre = []
        for i, b in enumerate(ps[0]["bodies"][:m0["idx"]]):
            if b["move"] != 0: pre.append({"moveId": b["move"], "side": side_of(b)})
            elif i > 0 and ps[0]["bodies"][i - 1]["move"] == 45: pre.append({"moveId": 0, "side": side_of(b), "statAnimation": 21})  # Growl's stat unit
            else: pre.append({"moveId": 0, "side": side_of(b), "statusAnimation": "SLP"})  # Hypnosis -> SLP (Nightmare recipe)
        if pre: fx["precedingBodies"] = pre
        fx["speciesAudit10"] = {"acceptedFixture": orig, "swappedSide": swside, "bodies": m0["bodies"], "bodyIndex": m0["idx"], "rows": rows,
                                "personality": [mm[0]["personality"], mm[1]["personality"]], "freshProbeRunsAgree": True}
        (OUT / f"{stem}.json").write_text(json.dumps(fx, indent=1) + "\n")
        print(stem, f"A={A} rows={rows} phase={fx.get('timingPhases', fx.get('timingPhase'))}{' UNEXPECTED-ROWS' if bad else ''} body{m0['idx']} pre={[b['moveId'] for b in pre]}",
              fx["attacker"]["species"], "->", fx["target"]["species"])
