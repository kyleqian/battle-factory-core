#!/usr/bin/env python3
"""BG-register history: per-consumer later-body cases (read-field values at activation) + compact per-body table + r1/r2 determinism receipt.
usage: bgHistoryCases.py PROBE_DIR_R1 PROBE_DIR_R2 OUT_DIR"""
import json, glob, sys, hashlib, collections
from pathlib import Path
R1, R2, OUT = sys.argv[1:4]; OUT = Path(OUT)
DROP = {"bg0hofs", "bg0vofs", "var:BG0_X", "var:BG0_Y", "bitmap"}
READS = {315: ["dispcnt", "bg1cnt", "bg1hofs", "bg1vofs", "win0h", "win0v", "bldcnt", "bldalpha", "bldy", "matricesSha"], 318: ["dispcnt", "bg1cnt", "bg2cnt", "bg1hofs", "bg1vofs", "win0h", "win0v", "bldcnt", "bldalpha", "bldy", "matricesSha"],
         244: ["dispcnt", "bg1cnt", "bg2cnt", "bg1hofs", "bg1vofs", "bldcnt", "bldalpha", "bldy", "matricesSha"]}
NM = {315: "OVERHEAT", 318: "SILVER_WIND", 244: "PSYCH_UP"}
cases = collections.defaultdict(dict); table = []; same = diff = 0; h = hashlib.sha256()
for f in sorted(glob.glob(R1 + "/*.json")):
    a = open(f, "rb").read(); b = open(f.replace(R1, R2), "rb").read(); h.update(a)
    same += a == b; diff += a != b
    d = json.loads(a); n = Path(f).stem; bs = d["bodies"]
    for i, x in enumerate(bs):
        table.append([n, i, x["move"], x["attacker"], x["start"], x["end"], x["scriptPtr"] if x["move"] == 0 else None, x["args0"][:2] if x["move"] == 0 else None])
        if x["move"] in READS and i > 0:
            side = "player" if x["attacker"] == 0 else "opponent"; v = {k: x["act"][k] for k in READS[x["move"]]}
            key = (NM[x["move"]], side, bs[i - 1]["move"], "first-turn-gap<30" if x["start"] - (bs[i - 1]["end"] or 0) < 30 else "gap>=30", json.dumps(v, sort_keys=True))
            cases[key[:4]].setdefault(key[4], n)
S0 = {}
out = {"determinism": {"scenarios": same + diff, "r1EqualsR2ByteIdentical": same, "different": diff, "sha256OfR1Concat": h.hexdigest()},
       "laterBodyReadSignatures": [{"move": k[0], "side": k[1], "prevMove": k[2], "gap": k[3], "readFields": json.loads(s), "example": e} for k, d in sorted(cases.items(), key=str) for s, e in d.items()]}
(OUT / "consumer-later-body-cases.json").write_text(json.dumps(out, indent=0, separators=(",", ":")))
(OUT / "bodies-table.json").write_text(json.dumps({"columns": ["scenario", "bodyIndex", "moveId", "attackerBattler", "startFrame", "endFrame", "scriptPtr(move0)", "statArgs(move0)"], "rows": table}, separators=(",", ":")))
print(out["determinism"], len(out["laterBodyReadSignatures"]))
base = None
for r in out["laterBodyReadSignatures"]: print(r["move"], r["side"], "after", r["prevMove"], r["gap"], {k: v for k, v in r["readFields"].items() if k in ("dispcnt", "bg1cnt", "bg2cnt", "bg1vofs", "win0h", "win0v")}, r["example"])
