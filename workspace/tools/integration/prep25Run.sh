#!/bin/sh
# prep25: reproduction (run from workspace/, direct mGBA only). usage: sh tools/integration/prep25Run.sh OUTDIR   (OUTDIR is created; receipts land in OUTDIR/receipts; ~12 min)
# tools/run-mgba-probe.py refuses to overwrite an existing output: OUTDIR must be fresh.
set -e
OUT=${1:?usage: prep25Run.sh OUTDIR}; [ -e "$OUT" ] && { echo "OUTDIR exists: $OUT"; exit 1; }
mkdir -p "$OUT/receipts/moves"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
python3 tools/integration/prep25AltScenarios.py >/dev/null
KEYS=$( (cat tools/integration/fixtures/prep25/accepted-scenarios.txt; ls tools/battle-lab/prep25-*-alt-*.json | xargs -n1 basename | sed 's/.json//') )
# NOTE: do NOT pass "$KEYS" quoted-as-one or let zsh keep it unsplit: the probe scripts need one key per argument (run this file with sh)
JOBS=${JOBS:-12} sh tools/integration/prep14Probes.sh "$OUT/r2" $KEYS    # Random2 attribution probes, x2 fresh processes per scenario
JOBS=${JOBS:-12} sh tools/integration/prep22Probes.sh "$OUT/state" 2 $KEYS  # state probes x2
python3 tools/integration/prep25Analyze.py "$OUT/state" "$OUT/r2" "$OUT/receipts/moves"
python3 tools/integration/prep25Bodies.py "$OUT/state" "$OUT/r2" "$OUT/receipts/bodies.json" >/dev/null
python3 tools/integration/prep25Plans.py "$OUT/r2" "$OUT/receipts/plans.json" >/dev/null
node --experimental-strip-types tools/integration/prep25PaletteCheck.ts "$OUT/state" "$OUT/receipts/palette-check.json"
python3 tools/integration/prep25LowestFree.py "$OUT/state" "$OUT/receipts/lowest-free.json" >/dev/null
python3 tools/integration/prep25DiveData.py "$OUT/state" "$OUT/r2" "$OUT/receipts/dive-data.json"
python3 tools/integration/prep25IceBallData.py "$OUT/state" "$OUT/r2" "$OUT/receipts/ice-ball-data.json" >/dev/null
GEOM=battle node --experimental-strip-types tools/integration/prep25DiveReducerCheck.ts "$OUT/state" "$OUT/r2" "$OUT/receipts/dive-reducer.json" | tail -9
python3 tools/integration/prep25LagFrames.py "$OUT/state" "$OUT/r2" "$OUT/receipts/lag-frames.json" >/dev/null
python3 tools/integration/prep25DiveHidden.py "$OUT/state" "$OUT/receipts/dive-hidden.json" >/dev/null
# twice-identical check of the state probes (full JSON) and of the Random2 probes (all fields except finalStateSha1)
python3 - "$OUT" <<'PYEOF'
import json, sys, glob
o = sys.argv[1]; bad = 0; n = 0
for a in sorted(glob.glob(f"{o}/state/*-r1.json")):
    n += 1; bad += json.load(open(a)) != json.load(open(a.replace("-r1.json", "-r2.json")))
for a in sorted(glob.glob(f"{o}/r2/*-r1.json")):
    n += 1; x, y = json.load(open(a)), json.load(open(a.replace("-r1.json", "-r2.json"))); bad += any(x[k] != y[k] for k in x if k != "finalStateSha1")
print("scenario probe pairs", n, "differing", bad)
PYEOF
