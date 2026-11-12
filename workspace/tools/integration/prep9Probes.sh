#!/bin/sh
# prep9: run prep9PaletteProbe.py (direct mGBA, fresh process each) over every scenario of fixtures/prep9-scenarios/manifest.json.
# usage (workspace root): sh tools/integration/prep9Probes.sh <runTag> [filterSubstring]   outputs: fixtures/prep9-probes/<runTag>/<name>.json
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py
export PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
export RUN=${1:-r1} FILT=${2:-}
FX=tools/integration/fixtures
mkdir -p $FX/prep9-probes/$RUN
python3 - <<'P' | xargs -P 8 -L 1 sh -c '$PY tools/integration/prep9PaletteProbe.py "$0" "$1" "$2" > /dev/null 2>&1'
import json, os
for m in json.load(open("tools/integration/fixtures/prep9-scenarios/manifest.json")):
    if os.environ["FILT"] in m["name"]: print(m["file"], "tools/integration/fixtures/prep9-probes/%s/%s.json" % (os.environ["RUN"], m["name"]), m["move"])
P
ls $FX/prep9-probes/$RUN | wc -l
