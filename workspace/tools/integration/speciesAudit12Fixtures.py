#!/usr/bin/env python3
"""speciesAudit12 fixtures: speciesAudit11Fixtures.py's recipe applied to the SWAPPED scenarios of the last S10A adapters, with the per-move
fields of s10aLiveFixtures.py (SKILL_SWAP / FLATTER / ERUPTION) and substBodyFixtures.py (SUBSTITUTE). Everything comes from the swapped
scenario's OWN two fresh prep22Probe.py runs (speciesAudit9Probes.sh r1/r2), which must agree on the bodies: window = [activation, first inactive
row] of the move's FIRST body, HP / gender / personality / status at activation, preceding bodies, and the presentation RNG (FLATTER: gRng2Value at
activation = rng2Series[A + 1] stepped back once, as the s10a-live fixtures pin it).
Measured CPU phase per move:
  SKILL_SWAP  optional-lag-age 176 = own body rows (196 event / 195 no-event). palette-transfer-row (restore row 175 / 176) is a prep35 pixel fit,
              not in prep22Probe: recorded as the policy phase "no-event" (restoreRow 175, restoreRowSource "assumed-policy"); display-neutral per
              the policy, so a residual on rows 175..177 only would be probed separately.
  FLATTER     none (D3 faithful random; 219 rows).   ERUPTION  none (scoped exact; 476 / 482 / 494 / 500 rows by attacker y).
  SUBSTITUTE  none (scoped exact; 87 rows).
usage: speciesAudit12Fixtures.py PROBEDIR OUTDIR list.tsv...   -> OUTDIR/<stem>.json, one status line per row"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D, OUT = Path(sys.argv[1]), Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
IDS = {"SUBSTITUTE": 164, "SKILL_SWAP": 285, "FLATTER": 260, "ERUPTION": 284}
LCG_INV = pow(1103515245, -1, 2 ** 32)
def status(v): return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
side_of = lambda b: "player" if b["atActivation"]["attacker"] == 0 else "opponent"
def measure(p, move, side):
    bodies = p["bodies"]
    idx = next((i for i, b in enumerate(bodies) if b["move"] == IDS[move]), None)
    if idx is None: return "BODY-MISSING", None
    body = bodies[idx]
    if side_of(body) != side: return "BODY-SIDE-MISMATCH", None
    if body["end"] is None: return "BODY-NO-END", None
    A, E = body["start"], body["end"]
    return None, {"idx": idx, "A": A, "rows": E - A + 1, "bodies": [(b["move"], b["start"], b["end"], b["atActivation"]["attacker"]) for b in bodies]}
def expected(move, rows):
    return {"SUBSTITUTE": rows == 87, "SKILL_SWAP": rows in (195, 196), "FLATTER": rows == 219, "ERUPTION": rows in (476, 482, 494, 500)}[move]
for lst in sys.argv[3:]:
    for l in open(lst):
        stem, orig, sw, swside = l.rstrip("\n").split("\t")
        of = json.load(open(orig)); move = of["move"]; side = of["attacker"]["geometry"]["side"]; base = Path(sw).stem
        try: ps = [json.load(open(D / f"{base}-r{r}.json")) for r in (1, 2)]
        except Exception as e: print(stem, "NO-PROBE", str(e)[:120]); continue
        ms = [measure(p, move, side) for p in ps]
        if ms[0][0]: print(stem, ms[0][0], [(b["move"], b["start"], b["end"]) for b in ps[0]["bodies"]]); continue
        if ms[0] != ms[1]: print(stem, "RUNS-DISAGREE", ms[0][1], ms[1][1] if ms[1][1] else ms[1][0]); continue
        m0 = ms[0][1]; A, rows = m0["A"], m0["rows"]
        body = ps[0]["bodies"][m0["idx"]]; mm = body["atActivation"]["mons"]; sp = {"player": mm[0], "opponent": mm[1]}
        foe = "opponent" if side == "player" else "player"
        r2s = [dict((f, v) for f, v in p["rng2Series"]) for p in ps]
        if r2s[0].get(A + 1) != r2s[1].get(A + 1): print(stem, "RNG2-DISAGREE"); continue
        fx = {"schema": "s10a-live-adapter-fixture/v1" if move == "SUBSTITUTE" else "d4a-live-adapter-fixture/v1", "move": move,
              "probe": "tools/probe/run-battle-lab-rgb.py", "scenario": sw, "denseWindow": {"startFrame": A, "endFrame": A + rows - 1},
              "windowSource": f"speciesAudit12: window = [activation, activation + {rows} - 1] of the swapped scenario's own first {move} body (2 fresh prep22Probe.py runs agree)"}
        if move == "SKILL_SWAP":
            ph = "event" if rows == 196 else "no-event"
            fx["timingPhase"] = ph; fx["timingPhases"] = {"optional-lag-age": ph, "palette-transfer-row": "no-event"}
            fx["restoreRow"] = 175; fx["restoreRowSource"] = "assumed-policy"
        fx["attacker"] = {"species": name(sp[side]), "geometry": {"side": side}}
        fx["target"] = {"species": name(sp[foe]), "geometry": {"side": foe}}
        fx["attackerPersonality"] = sp[side]["personality"]
        fx["displayedStatus"] = {"player": status(mm[0]["status1"]), "opponent": status(mm[1]["status1"])}
        fx["fieldProfile"] = {"playerHp": mm[0]["hp"], "playerMaxHp": mm[0]["maxHP"], "opponentHp": mm[1]["hp"], "opponentMaxHp": mm[1]["maxHP"],
                              "playerGender": gender(mm[0]["species"], mm[0]["personality"]), "opponentGender": gender(mm[1]["species"], mm[1]["personality"])}
        if move == "FLATTER":
            fx["presentationRngActivation"] = {"value": ((r2s[0][A + 1] - 24691) * LCG_INV) & 0xFFFFFFFF,
                                               "source": f"prep22Probe.py rng2Series[{A + 1}] stepped back once (activation frame {A})"}
        pre = []
        for i, b in enumerate(ps[0]["bodies"][:m0["idx"]]):
            if b["move"] != 0: pre.append({"moveId": b["move"], "side": side_of(b)})
            else: pre.append({"moveId": 0, "side": side_of(b), "unknownUnit": True})
        if pre: fx["precedingBodies"] = pre
        fx["speciesAudit12"] = {"acceptedFixture": orig, "swappedSide": swside, "bodies": m0["bodies"], "bodyIndex": m0["idx"], "rows": rows,
                                "personality": [mm[0]["personality"], mm[1]["personality"]], "freshProbeRunsAgree": True}
        (OUT / f"{stem}.json").write_text(json.dumps(fx, indent=1) + "\n")
        print(stem, f"A={A} rows={rows} phase={fx.get('timingPhases', fx.get('timingPhase'))}{'' if expected(move, rows) else ' UNEXPECTED-ROWS'} body{m0['idx']} pre={[b['moveId'] for b in pre]}",
              fx["attacker"]["species"], "->", fx["target"]["species"], f"hp={mm[0]['hp']}/{mm[1]['hp']}")
