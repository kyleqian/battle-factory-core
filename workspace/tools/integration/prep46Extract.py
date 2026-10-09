#!/usr/bin/env python3
"""prep46: raw probe rows (prep46OrderRngProbe.py) -> unit receipts with dense per-frame sSpriteOrder for the words bodies (pure python3).

usage (from workspace/): prep46Extract.py <out-dir> <units.json>
Units are split as prep43Extract (body = a gAnimScriptActive interval from its rising edge, gap = up to the next rising edge); every
allocation window {f, C [[slot, f|e]], D [slots in sSpriteOrder order], F after} and the unit's first-frame free order F0. Words bodies
(mv 28 / 189 / 240, and mv-0 bodies of the Rain Dance jobs = General_Rain) also carry `dense`: [age, sSpriteOrder hex, inUse mask hex]
for every frame of the body, and their RAM-read Random2 words (prep46Words.bodies). Run A and run B must be byte-identical files.
"""
import hashlib, json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import spriteOrderBodyPlans as P
import spriteOrderEventModel as M
import prep43Extract as X
import prep46Probe as J
import prep46Words as Wd

WORDS_MV = {28, 189, 240}


FRONTIER = json.loads(Path("src/data/gen/battle-frontier-mons.json").read_text())["entries"]
SPECIES = {s["id"]: s["name"] for s in json.loads(Path("src/data/gen/species-stats.json").read_text())["species"]}


def lead_species(scenario_path):
    """Lead species id per side: a party override's species, else the first Factory set's species."""
    d = json.loads(Path(scenario_path).read_text())
    by_name = {v: k for k, v in SPECIES.items()}
    out = {}
    for side, key in (("player", "playerSetIds"), ("opponent", "opponentSetIds")):
        party = d.get("overrides", {}).get("parties", {}).get(side)
        out[side] = party[0]["species"] if party else by_name[FRONTIER[d[key][0]]["species"]]
    return out


def units_of(path, rain):
    d, W = P.windows(path)
    _, rows = M.load(path)
    dense = {n: r for n, r in M.frames_of(rows, d["lastFrame"])}
    words = {b["frame"]: b for b in Wd.bodies(d)}
    edges = [i for i, w in enumerate(W) if w["act"] and (i == 0 or not W[i - 1]["act"])]
    edges.append(len(W))
    out = []

    def unit(kind, lo, hi, mv):
        wins, stray = [], 0
        for w in W[lo:hi]:
            if w["C"] or w["D"]:
                wins.append({"f": w["n"], "C": [[s, m] for s, m in P.create_modes(w["pmask"], w["C"])], "D": w["D"], "F": w["obsF"]})
            elif w["obsF"] != w["F"]:
                stray += 1
        text, survivors = X.plan_text(wins)
        first = W[min(lo, len(W) - 1)]
        u = {"kind": kind, "mv": mv, "frame": first["n"], "length": hi - lo, "F0": first["F"], "mask0": format(first["pmask"], "x"),
             "truncated": hi >= len(W), "strayFChanges": stray, "plan": text, "survivorSlots": survivors, "windows": wins}
        if kind == "body" and (mv in WORDS_MV or (rain and mv == 0)):
            # the frame before the edge is the activation state (the production lend); then every frame of the body
            u["dense"] = [[W[k]["n"] - first["n"], bytes(dense[W[k]["n"]]["order"]).hex(), format(dense[W[k]["n"]]["mask"], "x")]
                          for k in range(max(lo - 1, 0), hi)]
            b = words[first["n"]]
            u["activationValue"], u["draws"], u["lagAges"] = b["activationValue"], b["draws"], b["lagAges"]
        return u

    for j in range(len(edges) - 1):
        a, b = edges[j], edges[j + 1]
        k = a
        while k < b and W[k]["act"]:
            k += 1
        out.append(unit("body", a, k, W[a]["mv"]))
        out.append(unit("gap", k, b, None))
    return out


if __name__ == "__main__":
    out = Path(sys.argv[1])
    result = {"schema": "prep46-units/v1", "jobs": {}}
    for unit, ident, move, base, variant in J.JOBS:
        a, b = out / "raw" / f"{ident}-A.json", out / "raw" / f"{ident}-B.json"
        if not a.exists():
            continue
        same = b.exists() and a.read_bytes() == b.read_bytes()
        result["jobs"][ident] = {"unit": unit, "move": move, "base": base, "variant": variant, "identicalAB": same,
                                 "rawSha256A": hashlib.sha256(a.read_bytes()).hexdigest(),
                                 "attackerSide": "opponent" if "-opp-" in ident else "player",
                                 "species": lead_species(J.P45.scenario(out, (unit, ident, move, base, variant))),
                                 "units": units_of(a, unit == "BODY240")}
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    for ident, job in result["jobs"].items():
        print(ident, "A==B" if job["identicalAB"] else "A!=B",
              " | ".join(f"{u['kind'][0]}{u['mv'] if u['mv'] is not None else ''}@{u['frame']}:{u['plan'] or '-'}" for u in job["units"]))
