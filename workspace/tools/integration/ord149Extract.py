#!/usr/bin/env python3
"""ord149: raw sSpriteOrder probe rows (ord149Probe.py) -> unit receipts (prep43Extract's unit split and plan encoding, as ord124Extract.py)
plus, per Astonish 310 body, the two droplets' oam.y at their creation frame and on the frame before their same-frame destroy (the last
SortSprites that orders them; spriteOrderEventProbe keys [prio, sub, oam.y, ...]). Pure python3, no mGBA.
usage (from workspace/): ord149Extract.py <out-dir> <units.json>"""
import hashlib, json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Extract as X
import ord149Probe as J

X.J = J


def sort_y(key):  # SortSprites' y (oam.y >= DISPLAY_HEIGHT wraps; the droplets are 8x8, never affine double)
    return key[2] - 256 if key[2] >= 160 else key[2]


def droplets(raw_rows, unit):
    keys = {row[0]: row[6] for row in raw_rows if len(row) > 6}
    pair = [w for w in unit["windows"] if len(w["C"]) == 2]
    if len(pair) != 1:
        return None
    slots = [s for s, _ in pair[0]["C"]]
    dead = [w for w in unit["windows"] if sorted(w["D"]) == sorted(slots)]
    if len(dead) != 1 or pair[0]["f"] not in keys or dead[0]["f"] - 1 not in keys:
        return None
    born, last = keys[pair[0]["f"]], keys[dead[0]["f"] - 1]
    out = []
    for s in slots:
        b, l = born[str(s)], last[str(s)]
        out.append({"slot": s, "prioWord": b[0] << 8 | b[1], "yBorn": sort_y(b), "yLast": sort_y(l), "rise": sort_y(b) - sort_y(l)})
    return {"createF": pair[0]["f"], "destroyF": dead[0]["f"], "steps": dead[0]["f"] - pair[0]["f"], "droplets": out,
            "romPair": dead[0]["D"]}


if __name__ == "__main__":
    OUT = Path(sys.argv[1])
    X.OUT = OUT
    result = {"schema": "ord149-units/v1", "jobs": {}}
    for unit, job, move, base, ops in J.JOBS:
        a, b = OUT / "raw" / f"{job}-A.json", OUT / "raw" / f"{job}-B.json"
        if not a.exists():
            continue
        raw = json.loads(a.read_text())["rows"]
        rows = hashlib.sha256(json.dumps(raw, separators=(",", ":")).encode()).hexdigest()
        entry = {"unit": unit, "move": move, "base": base, "ops": [list(o) for o in ops], "rowsSha256A": rows,
                 "identicalAB": b.exists() and a.read_bytes() == b.read_bytes()}
        entry.update(X.units_of(job, a))
        for u in entry["units"]:
            if u["kind"] == "body" and u["label"].startswith("body 310:") and not u["truncated"]:
                u["astonish"] = droplets(raw, u)
        result["jobs"][job] = entry
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    print(len(result["jobs"]), "jobs;", sum(not j["identicalAB"] for j in result["jobs"].values()), "A/B differ")
