#!/usr/bin/env python3
"""prep43: raw sSpriteOrder probe rows (prep43Probe.py) -> compact unit receipts (pure python3, no mGBA).

usage (from workspace/): prep43Extract.py <out-dir> <units.json>
For every job: run A and run B must be byte-identical files (sha256 of run A's rows recorded). Units are split as spriteOrderBodyPlans.py does
(body = a gAnimScriptActive interval from its rising edge, gap = up to the next rising edge). Per unit: the free order F at its
first frame, every allocation window {f, C [[slot, f|e]] in creation order, D [slots in sSpriteOrder order], F after}, the number
of frames inside the unit where F changed without an allocation (must be 0), and the observed plan text in the production
encoding (spriteOrderProductionTable.ts encodeSpriteOrderPlan: n-index = k-th sprite created in the unit, o<slot> = an occupant
that predates the unit). Label: the order-host unit the job probes (prep43Probe.JOBS) for mv-0 bodies of that job, else
`body <mv>:<attacker side>` (side of the scenario's named move = side_of, the other side otherwise).
"""
import hashlib, json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import spriteOrderBodyPlans as P
import prep43Probe as J

MV0_LABEL = {"CONFUSION": "status CONFUSION", "PRZ": "status PRZ", "RAIN": "general mv-0 (rain job)",
             "WEATHER_VAR": "general mv-0 (weather job)", "LEECH": "general mv-0 (leech job)"}


def plan_text(windows):
    made = {}
    parts_out = []
    count = 0
    for w in windows:
        parts = []
        if w["C"]:
            parts.append("C" + "".join(m for _, m in w["C"]))
            for s, _ in w["C"]:
                made[s] = count
                count += 1
        if w["D"]:
            toks = []
            for s in w["D"]:
                toks.append(str(made.pop(s)) if s in made else f"o{s}")
            parts.append("D" + ",".join(toks))
        parts_out.append("/".join(parts))
    return ";".join(parts_out), sorted(made)


def units_of(job, path):
    d, W = P.windows(path)
    named = J.JOBS[[j[1] for j in J.JOBS].index(job)]
    scen = {"move": named[2], "scenario": str(J.scenario(OUT, named))}
    side = P.side_of(scen)
    edges = [i for i, w in enumerate(W) if w["act"] and (i == 0 or not W[i - 1]["act"])]
    edges.append(len(W))
    out = []

    def unit(kind, lo, hi, label):
        wins, stray = [], 0
        for w in W[lo:hi]:
            if w["C"] or w["D"]:
                wins.append({"f": w["n"], "C": [[s, m] for s, m in P.create_modes(w["pmask"], w["C"])], "D": w["D"], "F": w["obsF"]})
            elif w["obsF"] != w["F"]:
                stray += 1
        text, survivors = plan_text(wins)
        return {"kind": kind, "label": label, "frame": W[min(lo, len(W) - 1)]["n"], "F0": W[min(lo, len(W) - 1)]["F"],
                "mask0": format(W[min(lo, len(W) - 1)]["pmask"], "x"), "truncated": hi >= len(W) and kind == "body",
                "strayFChanges": stray, "plan": text, "survivorSlots": survivors, "windows": wins}

    for j in range(len(edges) - 1):
        a, b = edges[j], edges[j + 1]
        k = a
        while k < b and W[k]["act"]:
            k += 1
        mv = W[a]["mv"]
        if mv == 0:
            label = MV0_LABEL.get(named[0], "mv-0")
        else:
            owner = None if side is None else side if mv == named[2] else ("player" if side == "opponent" else "opponent")
            label = f"body {mv}:{owner}"
        out.append(unit("body", a, k, label))
        out.append(unit("gap", k, b, "gap"))
    return {"attackerSide": side, "units": out}


if __name__ == "__main__":
    OUT = Path(sys.argv[1])
    result = {"schema": "prep43-units/v1", "jobs": {}}
    for unit, job, move, base, variant in J.JOBS:
        a, b = OUT / "raw" / f"{job}-A.json", OUT / "raw" / f"{job}-B.json"
        if not a.exists():
            continue
        # the raw file embeds the scenario path (OUT-dependent): hash its rows, and require A == B byte-identical as files
        same = b.exists() and a.read_bytes() == b.read_bytes()
        rows = hashlib.sha256(json.dumps(json.loads(a.read_text())["rows"], separators=(",", ":")).encode()).hexdigest()
        entry = {"unit": unit, "move": move, "base": base, "variant": variant, "rowsSha256A": rows, "identicalAB": same}
        entry.update(units_of(job, a))
        result["jobs"][job] = entry
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    print(len(result["jobs"]), "jobs;", sum(not j["identicalAB"] for j in result["jobs"].values()), "A/B differ")
