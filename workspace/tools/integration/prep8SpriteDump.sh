#!/bin/sh
# prep8: per-frame gSprites + sSpriteOrder over the move script window (direct mGBA, tools/integration/prep6SpriteDump.py reused unmodified). Run from workspace root.
# Window = [activation - 3, script end + 2] of the move's body (prep8-activation receipts), for the 20 accepted lab scenarios and the 6 derived first-body scenarios.
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
D=tools/integration/fixtures/prep8-sprites
mkdir -p $D
python3 - <<'P' | xargs -P 4 -L 1 sh -c '"$0" tools/integration/prep6SpriteDump.py "$1" "$2" "$3" "$4" >/dev/null 2>&1' $PY
import json, glob, os
FX = "tools/integration/fixtures"
MV = {"aurora-beam": 62, "frustration": 218, "horn-drill": 32, "seismic-toss": 69, "stockpile": 254, "swift": 129, "thunderbolt": 85, "trick": 271, "uproar": 253, "zap-cannon": 192}
for rec in sorted(glob.glob(f"{FX}/prep8-activation/*.json")):
    stem = os.path.basename(rec)[:-5]
    key = stem.replace("mechanic-", "").split("-")
    mv = next(v for k, v in MV.items() if stem.replace("mechanic-", "").startswith(k))
    iv = [i for i in json.load(open(rec))["intervals"] if i["move"] == mv][0]
    scen = f"{FX}/prep8-scenarios/{stem}.json" if stem.endswith("firstbody") else (f"tools/compare/fixtures/{stem}.json" if stem.startswith("trick") else f"tools/battle-lab/{stem}.json")
    print(scen, f"{FX}/prep8-sprites/{stem.replace('mechanic-', '')}.json", max(0, iv["start"] - 3), iv["end"] + 2)
P
ls $D
