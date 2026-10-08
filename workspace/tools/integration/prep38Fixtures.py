#!/usr/bin/env python3
"""prep38 fixtures: from each scenario's OWN two fresh prep38Probe.py runs (which must agree on the bodies), the CONTROL window (the first
move-X body, defender shown as the mon) and the TEST window (the first move-X body whose defender is shown as the Substitute doll at the
activation edge: battlerData behindSubstitute set on the previous row AND the defender OBJ tiles == the doll tiles of the previous rows,
i.e. the doll is displayed). Window = [activation, first inactive row]. HP / status / gender at activation; preceding move bodies (by move
id and attacker side) in order; D3 bodies pin presentationRngActivation = gRng2Value at A + 1 stepped back once (as s10aLiveFixtures.py).
usage: prep38Fixtures.py PROBEDIR OUTDIR list.tsv   -> OUTDIR/<stem>-{control,test}.json, one status line per stem"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from prep38Bodies import bodies  # noqa: E402
R = Path(__file__).resolve().parents[2]
D, OUT, LIST = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]; OUT.mkdir(parents=True, exist_ok=True)
S = {s["id"]: s["name"].replace("SPECIES_", "") for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
LCG_INV = pow(1103515245, -1, 2 ** 32)
D3 = {189, 240, 352, 24, 28, 175, 273, 142, 260, 310, 63, 37}
def status(v): return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
for line in open(LIST):
    stem, move, mid, side, atk_name, def_name = line.rstrip("\n").split("\t"); mid = int(mid)
    try: runs = [json.load(open(D / f"{stem}-r{r}.json")) for r in (1, 2)]
    except Exception as e: print(stem, "NO-PROBE", str(e)[:100]); continue
    bs = [bodies(p["frames"]) for p in runs]
    strip = lambda b: [(x["start"], x["end"], x["script"], x["attacker"], x["target"], x["rng2Next"], x["at"]) for x in b]  # noqa: E731
    if strip(bs[0]) != strip(bs[1]): print(stem, "RUNS-DISAGREE"); continue
    sc = json.load(open(R / "tools/integration/fixtures/prep38/scenarios" / f"{stem}.json"))
    atk_b = 0 if side == "player" else 1; dfn_b = 1 - atk_b; dside = "opponent" if side == "player" else "player"
    gender = {s: sc["overrides"]["parties"][s][0]["gender"] for s in ("player", "opponent")}
    ours = [(i, b) for i, b in enumerate(bs[0]) if b["script"] == f"Move_{move}" and b["attacker"] == atk_b]
    doll_tiles = next((b["prev"][dfn_b]["tiles"] for b in bs[0] if b["prev"][dfn_b]["doll"]), None)
    picks = {"control": next(((i, b) for i, b in ours if not b["prev"][dfn_b]["doll"]), None),
             "test": next(((i, b) for i, b in ours if b["prev"][dfn_b]["doll"] and b["prev"][dfn_b]["tiles"] == doll_tiles), None)}
    msg = [stem]
    for kind, pick in picks.items():
        if pick is None: msg.append(f"{kind}=MISSING"); continue
        i, b = pick
        sp = [S[sc["overrides"]["parties"][s][0]["species"]] for s in ("player", "opponent")]
        at = b["at"]
        fx = {"schema": "prep38-subbed-defender-fixture/v1", "move": move, "moveId": mid, "kind": kind, "stem": stem,
              "probe": "tools/integration/prep38Probe.py", "scenario": f"tools/integration/fixtures/prep38/scenarios/{stem}.json",
              "denseWindow": {"startFrame": b["start"], "endFrame": b["end"]},
              "attacker": {"species": sp[atk_b], "geometry": {"side": side}}, "target": {"species": sp[dfn_b], "geometry": {"side": dside}},
              "defenderDoll": kind == "test",
              "fieldProfile": {"playerHp": at[0]["hp"], "playerMaxHp": at[0]["maxHP"], "opponentHp": at[1]["hp"], "opponentMaxHp": at[1]["maxHP"],
                               "playerGender": gender["player"], "opponentGender": gender["opponent"]},
              "displayedStatus": {"player": status(at[0]["status1"]), "opponent": status(at[1]["status1"])},
              "precedingBodies": [{"moveId": x["move"] if x["script"] != "Move_SUBSTITUTE" else 164, "side": "player" if x["attacker"] == 0 else "opponent"}
                                  for x in bs[0][:i] if (x["script"] or "").startswith("Move_")],
              "nonMoveBodiesBefore": [x["script"] for x in bs[0][:i] if not (x["script"] or "").startswith("Move_")],
              "doll": {"behindSubstitute": b["prev"][dfn_b]["doll"], "subHP": at[dfn_b]["subHP"], "tiles": b["prev"][dfn_b]["tiles"]}}
        if mid in D3:
            fx["presentationRngActivation"] = {"value": ((b["rng2Next"] - 24691) * LCG_INV) & 0xFFFFFFFF,
                                               "source": "prep38Probe.py gRng2Value at activation + 1, stepped back once (2 fresh runs agree)"}
        (OUT / f"{stem}-{kind}.json").write_text(json.dumps(fx, indent=1) + "\n")
        msg.append(f"{kind}={b['start']}..{b['end']}({b['rows']})")
    print(" ".join(msg))
