#!/usr/bin/env python3
"""pfr185: the SEND OUT confirm (third party-menu press) -> ball / controller idle / next print / action prompt offsets, from the raw probe outputs
of pfr185Run.py (<dir>/out-<case>-<scene>.json).  The confirm is the clock production's forced party select counts from (partySelect.ts
sendOutElapsed), so this is the ROM side of the production comparison.
usage: python3 tools/integration/pfr185AEdge.py <out.json> <dirR1> [<dirR2>]"""
import hashlib, json, sys
from pathlib import Path

out, dirs = Path(sys.argv[1]), [Path(d) for d in sys.argv[2:]]


def edge(p):
    raw = p.read_bytes()
    j = json.loads(raw)
    H = j["H"]
    A = next(i for i in j["inputs"] if i["kind"] == "party-menu-open")["presses"][2][0] - H
    closed = next(i for i in j["inputs"] if i["kind"] == "menu-closed")["frame"] - H
    r = {int(k): v for k, v in j["rows"].items()}
    B = next(s["f"] for s in j["spawns"] if s.get("cb") == "SpriteCB_WaitForBattlerBallReleaseAnim" and s["f"] > closed)
    ks = sorted(r)
    idle = next(k for k in ks if k > B + 20 and r[k]["ctrl"][0] == "PlayerBufferRunCommand")
    t0 = r[idle]["txt"][:4]
    nxt = next(k for k in ks if k > idle and r[k]["txt"][:4] != t0)
    prompt = next(k for k in ks if k > idle and r[k]["ctrl"][0] == "HandleInputChooseAction")
    return {"sha256": hashlib.sha256(raw).hexdigest(), "confirm": A, "menuClosedFromConfirm": closed - A, "ballFromConfirm": B - A,
            "idleFromConfirm": idle - A, "nextTxtFromConfirm": nxt - A, "promptFromConfirm": prompt - A}


rows = []
for p in sorted(dirs[0].glob("out-*-*.json")):
    if p.name.endswith(".log"):
        continue
    row = {"key": p.stem[4:], **edge(p)}
    for k, d in enumerate(dirs[1:], start=2):
        o = edge(d / p.name)
        row[f"r{k}Identical"] = o == {x: y for x, y in row.items() if x != "key" and not x.endswith("Identical")}
    rows.append(row)
out.write_text(json.dumps(rows, indent=1) + "\n")
print(len(rows), "rows", sum(1 for r in rows if r.get("r2Identical")), "r2 identical")
