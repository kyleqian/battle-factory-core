#!/usr/bin/env python3
"""speciesAudit9 fixtures: d4aFixtures.py's recipe applied to SWAPPED scenarios (speciesAudit9Stage.sh list rows: stem, accepted d4a-live fixture,
swapped scenario, swapped side). Everything comes from the swapped scenario's OWN two fresh prep22Probe.py runs (speciesAudit9Probes.sh r1/r2):
window = [activation, activation + own body rows - 1], the measured CPU phase (Megahorn / Mach Punch / Meteor Mash: optional late lag = body rows;
Megahorn / Revenge: monbg BGnCNT write row from regEvents), HP / gender / personality / status at activation, preceding bodies, and (Meteor Mash, D3)
the activation rng2 word. Rows whose two runs disagree, whose move body is missing, on the other side or without an end are reported, not written.
usage: speciesAudit9Fixtures.py PROBEDIR OUTDIR list.tsv...   -> OUTDIR/<stem>.json, one status line per row"""
import json, sys, os
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D, OUT = Path(sys.argv[1]), Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
MOVES = {"MACH_PUNCH": (183, 110, 109), "MEGAHORN": (224, 177, 176), "REVENGE": (279, 145, 145), "METEOR_MASH": (309, 215, 214)}
INCLUSIVE = {"MEGAHORN": 1, "REVENGE": 1, "METEOR_MASH": 1}
LCG_INV = pow(1103515245, -1, 2 ** 32)
def status(v): return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
def measure(p, move, side):
    mid, ev_rows, none_rows = MOVES[move]; bodies = p["bodies"]
    idx = next((i for i, b in enumerate(bodies) if b["move"] == mid), None)
    if idx is None: return "BODY-MISSING", None
    body = bodies[idx]
    if ("player" if body["atActivation"]["attacker"] == 0 else "opponent") != side: return "BODY-SIDE-MISMATCH", None
    if body["end"] is None: return "BODY-NO-END", None
    A, E = body["start"], body["end"]; rows = E - A + INCLUSIVE.get(move, 0); monbg = None
    if move in ("MEGAHORN", "REVENGE"):
        key = "bg1" if side == "player" else "bg2"
        regs = [(f - A, rg) for f, rg in p["regEvents"] if f <= A + 12]
        at = [rg for f, rg in regs if f <= 0][-1][key]
        monbg = next((f for f, rg in regs if f > 0 and rg[key] != at), None)
    rng = None
    if move == "METEOR_MASH":
        r2 = dict((f, v) for f, v in p["rng2Series"]); rng = ((r2[A + 1] - 24691) * LCG_INV) & 0xFFFFFFFF
    return None, {"idx": idx, "A": A, "rows": rows, "monbg": monbg, "rng2": rng, "bodies": [(b["move"], b["start"], b["end"]) for b in bodies]}
for lst in sys.argv[3:]:
    for l in open(lst):
        stem, orig, sw, swside = l.rstrip("\n").split("\t")
        of = json.load(open(orig)); move = of["move"]; side = of["attacker"]["geometry"]["side"]; base = Path(sw).stem
        try: ps = [json.load(open(D / f"{base}-r{r}.json")) for r in (1, 2)]
        except Exception as e: print(stem, "NO-PROBE", e); continue
        ms = [measure(p, move, side) for p in ps]
        if ms[0][0]: print(stem, ms[0][0], [(b["move"], b["start"], b["end"]) for b in ps[0]["bodies"]]); continue
        if ms[0] != ms[1]: print(stem, "RUNS-DISAGREE", ms[0][1], ms[1][1] if ms[1][1] else ms[1][0]); continue
        m0 = ms[0][1]; A, rows, monbg = m0["A"], m0["rows"], m0["monbg"]; mid, ev_rows, none_rows = MOVES[move]
        bad = rows not in (ev_rows, none_rows) or (move == "MEGAHORN" and monbg not in (7, 8)) or (move == "REVENGE" and monbg not in (4, 5))
        body = ps[0]["bodies"][m0["idx"]]; mm = body["atActivation"]["mons"]; sp = {"player": mm[0], "opponent": mm[1]}
        foe = "opponent" if side == "player" else "player"
        fx = {"schema": "d4a-live-adapter-fixture/v1", "move": move, "probe": "tools/probe/run-battle-lab-rgb.py", "scenario": sw,
              "denseWindow": {"startFrame": A, "endFrame": A + rows - 1},
              "windowSource": f"speciesAudit9: window = [activation, activation + {rows} - 1] of the swapped scenario's own body (2 fresh prep22Probe.py runs agree)",
              "timingPhase": ("event" if monbg == 5 else "no-event") if move == "REVENGE" else "event" if rows == ev_rows else "no-event"}
        if move == "MEGAHORN":
            fx["timingPhases"] = {"optional-lag-age": "event" if rows == ev_rows else "no-event", "bg-write-row": "event" if monbg == 8 else "no-event"}; fx["monbgCntRow"] = monbg
        if move == "REVENGE":
            fx["timingPhases"] = {"bg-write-row": "event" if monbg == 5 else "no-event"}; fx["monbgCntRow"] = monbg
        fx["attacker"] = {"species": name(sp[side]), "geometry": {"side": side}}
        fx["target"] = {"species": name(sp[foe]), "geometry": {"side": foe}}
        fx["attackerPersonality"] = sp[side]["personality"]
        fx["displayedStatus"] = {"player": status(mm[0]["status1"]), "opponent": status(mm[1]["status1"])}
        fx["fieldProfile"] = {"playerHp": mm[0]["hp"], "playerMaxHp": mm[0]["maxHP"], "opponentHp": mm[1]["hp"], "opponentMaxHp": mm[1]["maxHP"],
                              "playerGender": gender(mm[0]["species"], mm[0]["personality"]), "opponentGender": gender(mm[1]["species"], mm[1]["personality"])}
        pre = [{"moveId": b["move"], "side": "player" if b["atActivation"]["attacker"] == 0 else "opponent"} if b["move"] != 0
               else {"moveId": 0, "side": "player" if b["atActivation"]["attacker"] == 0 else "opponent", "statusAnimation": "SLP"} for b in ps[0]["bodies"][:m0["idx"]]]
        if pre: fx["precedingBodies"] = pre
        if move == "METEOR_MASH":
            fx["presentationRngActivation"] = {"value": m0["rng2"], "source": f"speciesAudit9: prep22Probe.py rng2Series[{A + 1}] stepped back once (activation frame {A}), r1 == r2"}
        fx["speciesAudit9"] = {"acceptedFixture": orig, "swappedSide": swside, "bodies": m0["bodies"], "bodyIndex": m0["idx"], "rows": rows, "monbgCntRow": monbg,
                               "personality": [mm[0]["personality"], mm[1]["personality"]], "freshProbeRunsAgree": True}
        (OUT / f"{stem}.json").write_text(json.dumps(fx, indent=1) + "\n")
        print(stem, f"A={A} rows={rows} phase={fx.get('timingPhases', fx['timingPhase'])}{' UNEXPECTED-ROWS' if bad else ''} body{m0['idx']} pre={[b['moveId'] for b in pre]}",
              fx["attacker"]["species"], "->", fx["target"]["species"])
