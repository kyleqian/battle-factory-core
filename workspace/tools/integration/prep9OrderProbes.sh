#!/bin/sh
# prep9: tools/compare/spriteOrderEventProbe.py (per-frame sSpriteOrder + occupancy, direct mGBA, fresh process) over every prep9 scenario. Raw rows stay local (fixtures/prep9-raw not committed).
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py
export PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
FX=tools/integration/fixtures; mkdir -p $FX/prep9-raw
python3 - <<'P' | xargs -P 8 -L 1 sh -c '$PY tools/compare/spriteOrderEventProbe.py "$2" "$0" "$1" > /dev/null 2>&1'
import json
for m in json.load(open("tools/integration/fixtures/prep9-scenarios/manifest.json")):
    print(m["file"], "tools/integration/fixtures/prep9-raw/%s.json" % m["name"], m["move"])
P
ls $FX/prep9-raw | wc -l; du -sh $FX/prep9-raw
