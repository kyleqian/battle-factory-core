#!/bin/sh
# prep29: reproduction (run from workspace/, direct mGBA only). usage: sh tools/integration/prep29Run.sh OUTDIR   (OUTDIR must not exist; receipts land in OUTDIR/receipts)
# STAGE=probes runs only the (slow) probe stage, STAGE=analyze only the analysis (default: both). tools/run-mgba-probe.py refuses to overwrite an existing output.
set -e
OUT=${1:?usage: prep29Run.sh OUTDIR}; STAGE=${STAGE:-all}
if [ "$STAGE" != analyze ]; then [ -e "$OUT/r2" ] && { echo "OUTDIR exists: $OUT"; exit 1; }; fi
mkdir -p "$OUT/receipts/moves"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
python3 tools/integration/prep29AltScenarios.py >/dev/null
KEYS=$( (cat tools/integration/fixtures/prep29/accepted-scenarios.txt; ls tools/battle-lab/prep29-*-alt-*.json | xargs -n1 basename | sed 's/.json//') )
if [ "$STAGE" != analyze ]; then
JOBS=${JOBS:-12} sh tools/integration/prep14Probes.sh "$OUT/r2" $KEYS      # Random2 attribution probes x2 fresh processes
JOBS=${JOBS:-12} sh tools/integration/prep22Probes.sh "$OUT/state" 2 $KEYS  # state probes x2
fi
[ "$STAGE" = probes ] && exit 0
python3 tools/integration/prep29Analyze.py "$OUT/state" "$OUT/r2" "$OUT/receipts/moves"
python3 tools/integration/prep29Bodies.py "$OUT/state" "$OUT/r2" "$OUT/receipts/bodies.json" >/dev/null
python3 tools/integration/prep29Plans.py "$OUT/r2" "$OUT/receipts/plans.json"
node --experimental-strip-types tools/integration/prep29PaletteCheck.ts "$OUT/state" "$OUT/receipts/palette-check.json"
python3 tools/integration/prep29LowestFree.py "$OUT/state" "$OUT/receipts/lowest-free.json" >/dev/null
python3 tools/integration/prep29LagFrames.py "$OUT/state" "$OUT/r2" "$OUT/receipts/lag-frames.json"
python3 tools/integration/prep29LusterData.py "$OUT/state" "$OUT/r2" "$OUT/receipts/luster-purge-data.json"
python3 tools/integration/prep29SpitUpCheck.py "$OUT/state" "$OUT/receipts/moves" "$OUT/receipts/spit-up-check.json" >/dev/null
# accepted reducers fed only production-derivable inputs vs the ROM per-age effect-sprite rows
node --experimental-strip-types tools/integration/prep29BonemerangCheck.ts "$OUT/state" "$OUT/receipts/bonemerang-check.json" | tail -8
node --experimental-strip-types tools/integration/prep29OutrageCheck.ts "$OUT/state" "$OUT/receipts/outrage-check.json" | tail -6
node --experimental-strip-types tools/integration/prep29RapidSpinCheck.ts "$OUT/state" "$OUT/receipts/rapid-spin-check.json" | tail -4
node --experimental-strip-types tools/integration/prep29LusterPurgeCheck.ts "$OUT/state" "$OUT/receipts/luster-purge-check.json" | tail -4
node --experimental-strip-types tools/integration/prep29EruptionWaveCheck.ts "$OUT/state" "$OUT/receipts/eruption-wave-check.json" >/dev/null
python3 - "$OUT" <<'PYEOF'
import json, sys, glob
o = sys.argv[1]; bad = 0; n = 0
for a in sorted(glob.glob(f"{o}/state/*-r1.json")):
    n += 1; bad += json.load(open(a)) != json.load(open(a.replace("-r1.json", "-r2.json")))
for a in sorted(glob.glob(f"{o}/r2/*-r1.json")):
    n += 1; x, y = json.load(open(a)), json.load(open(a.replace("-r1.json", "-r2.json"))); bad += any(x[k] != y[k] for k in x if k != "finalStateSha1")
print("scenario probe pairs", n, "differing", bad)
PYEOF
