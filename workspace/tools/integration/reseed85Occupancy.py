#!/usr/bin/env python3
"""reseed85 occupancy extraction (docs/next-adapters-reseed85.md P1): per scenario, the bodies of the flat77Probe run (win-<id>-A.json) on
the per-frame sSpriteOrder + inUse rows of the prep46OrderRngProbe run (ord-<id>-A.json; same scenario, same lab seed). Frames align by
ord frame = win frame + (ord.lastFrame - win.frameCount); every body's activation sSpriteOrder (flat77 `at.spriteOrder`) must equal the ord
row at that frame (`aligned`). Per body: the occupied slots (inUse) and the free order (sSpriteOrder filtered to free slots) at activation,
and the created / destroyed slot events inside the body. Then the words / control pairs: the allocator consumer's activation occupancy and
its body's mask events must be EQUAL, the free order may differ; every post-send-out consumer must be role-isomorphic to the known entry
(9 occupied slots incl. the healthbox halves 60..63). A == B per probe is checked by reseed85Probe.py (byte-identical raw files).
usage: reseed85Occupancy.py <probe-dir> <out.json>
"""
import json, sys
from pathlib import Path

probe, out = Path(sys.argv[1]), Path(sys.argv[2])
CONSUMERS = {"Move_PROTECT", "Move_REFLECT", "Move_LIGHT_SCREEN"}
PAIRS = [("sa-opp-pidgeotto-protect", "ctl-leer-pidgeotto-protect"), ("ms-opp-pidgeotto-lightscreen", "ctl-leer-pidgeotto-lightscreen"),
         ("rd-opp-poliwag-reflect", "ctl-sunny-poliwag-reflect"), ("sa-ply-snorlax-protect", "ctl-leer-snorlax-protect")]
HALVES = {60, 61, 62, 63}


def extract(ident):
    o = json.loads((probe / "raw" / f"ord-{ident}-A.json").read_text())
    w = json.loads((probe / "raw" / f"win-{ident}-A.json").read_text())
    offset = o["lastFrame"] - w["frameCount"]
    rows = o["rows"]

    def state(frame):
        last = None
        for r in rows:
            if r[0] > frame:
                break
            last = r
        order = list(bytes.fromhex(last[2]))
        mask = int(last[3], 16)
        return order, mask

    bodies = []
    for b in w["bodies"]:
        s, e = b["startFrame"] + offset, b["endFrame"] + offset
        order, mask = state(s)
        occupied = [i for i in range(64) if mask >> i & 1]
        events, prev = [], mask
        for r in rows:
            if s < r[0] <= e:
                m = int(r[3], 16)
                if m != prev:
                    events.append({"added": [i for i in range(64) if m >> i & 1 and not prev >> i & 1],
                                   "removed": [i for i in range(64) if prev >> i & 1 and not m >> i & 1]})
                    prev = m
        bodies.append({"label": b["label"], "attacker": b["attacker"], "startFrame": b["startFrame"], "aligned": order == b["at"]["spriteOrder"],
                       "occupied": occupied, "free": [x for x in order if not mask >> x & 1], "maskEvents": events,
                       "endOccupied": [i for i in range(64) if prev >> i & 1]})
    first_consumer = next((i for i, b in enumerate(bodies) if b["label"] in CONSUMERS), None)
    return {"bodies": bodies, "consumer": first_consumer}


scen = sorted(p.stem for p in (probe / "scenarios").glob("*.json"))
res = {i: extract(i) for i in scen}
report = {"schema": "reseed85-occupancy/v1", "scenarios": {}, "pairs": []}
for i, r in res.items():
    c = r["consumer"]
    cb = r["bodies"][c] if c is not None else None
    report["scenarios"][i] = {
        "allAligned": all(b["aligned"] for b in r["bodies"]),
        "bodies": [f"{b['label']}:{b['attacker']}@{b['startFrame']}" for b in r["bodies"]],
        "consumer": None if cb is None else {"label": cb["label"], "attacker": cb["attacker"], "occupied": cb["occupied"],
                                              "roleIsomorphicCount": len(cb["occupied"]) == 9 and HALVES <= set(cb["occupied"]),
                                              "free": cb["free"], "maskEvents": cb["maskEvents"], "endOccupied": cb["endOccupied"]},
        "afterConsumer": [] if c is None else [{"label": b["label"], "attacker": b["attacker"], "occupied": b["occupied"], "free": b["free"]}
                                               for b in r["bodies"][c + 1:]],
    }
for wid, cid in PAIRS:
    a, b = report["scenarios"].get(wid, {}).get("consumer"), report["scenarios"].get(cid, {}).get("consumer")
    if a is None or b is None:
        report["pairs"].append({"words": wid, "control": cid, "verdict": "MISSING CONSUMER"})
        continue
    same_occ, same_ev = a["occupied"] == b["occupied"], a["maskEvents"] == b["maskEvents"]
    report["pairs"].append({"words": wid, "control": cid, "consumer": a["label"], "sameOccupied": same_occ, "sameMaskEvents": same_ev,
                            "sameFreeOrder": a["free"] == b["free"], "verdict": "SAME OCCUPANCY" if same_occ and same_ev else "DIFF"})
consumers = [s["consumer"] for s in report["scenarios"].values() if s["consumer"] is not None]
report["summary"] = {
    "scenarios": len(scen), "withConsumer": len(consumers), "allAligned": all(s["allAligned"] for s in report["scenarios"].values()),
    "allRoleIsomorphic": all(c["roleIsomorphicCount"] for c in consumers),
    "distinctConsumerOccupancy": sorted({json.dumps(c["occupied"]) for c in consumers}),
    "pairsSame": sum(p["verdict"] == "SAME OCCUPANCY" for p in report["pairs"]), "pairs": len(report["pairs"]),
    "pairsFreeOrderDiffers": sum(p.get("sameFreeOrder") is False for p in report["pairs"]),
}
out.write_text(json.dumps(report, indent=1) + "\n")
print(json.dumps(report["summary"]))
for i, s in report["scenarios"].items():
    print(i, "aligned" if s["allAligned"] else "UNALIGNED", "|", " ".join(s["bodies"]))
for p in report["pairs"]:
    print(p)
