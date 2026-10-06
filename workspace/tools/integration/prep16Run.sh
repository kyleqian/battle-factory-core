#!/bin/sh
# prep16: full reproduction (workspace root).  Direct mGBA only (never the shared HTTP oracles); every relied-on probe runs twice from fresh processes and is compared.   sh tools/integration/prep16Run.sh   (~6 min)
set -e
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
FX=tools/integration/fixtures/prep16; T=${T:-/tmp/p16}; mkdir -p $FX $T
python3 tools/integration/prep16Scenarios.py > /dev/null                                   # tools/battle-lab/prep16-*.json (63)
rm -rf $T/r1 $T/r2; JOBS=${JOBS:-12} sh tools/integration/prep16Probes.sh $T            # palette + register probe x2, byte-identical
python3 tools/integration/prep16PaletteSources.py $T/r1 $FX/prep16-palette-sources.json > /dev/null
npx vite-node tools/integration/prep16PaletteCheck.ts $T/r1 $FX/prep16-palette-check.json | tail -1
npx vite-node tools/integration/prep16ProviderSlots.ts $FX/prep16-provider-slots.json | tail -3
npx vite-node tools/integration/prep16OverheatPixels.ts $FX/prep16-overheat-pixels.json
npx vite-node tools/integration/prep16SilverWindPixels.ts $FX/prep16-silver-wind-pixels.json
python3 tools/integration/prep16BgHistory.py $T/r1 $FX/prep16-bg-history.json | tail -2
python3 tools/integration/prep16BgStates.py $T/r1 $FX/prep16-bg-states.json | head -2
python3 tools/integration/prep16BgTable.py $T/r1 $FX/prep16-bg-table.json > /dev/null
# first-body dense captures (silverWindProbe / psychUpProbe + RGB), 2 fresh runs each, frame sha256 lists compared
cap() { # name probe scenario
  for r in 1 2; do rm -rf $T/$1$r; mkdir -p $T/$1$r/rgb; python3 tools/run-mgba-probe.py $T/$1$r/out.json -- $PY tools/compare/$2 tools/battle-lab/$3.json $T/$1$r/out.json $T/$1$r/rgb > /dev/null 2>&1 || true; done
  python3 - $T/${1}1/out.json $T/${1}2/out.json <<'PYEOF'
import json, sys
a, b = (json.load(open(p))["frames"] for p in sys.argv[1:3]); print("capture", sys.argv[1].split("/")[-2][:-1], "frames", len(a), "sha256 lists identical:", [x["sha256"] for x in a] == [x["sha256"] for x in b])
PYEOF
}
cap swfirst silverWindProbe.py prep16-swopp-first-onix; cap pufirst psychUpProbe.py prep16-hist-psychup-player-first-shuckle
npx vite-node tools/integration/prep16SilverWindFirstBody.ts $T/swfirst1/out.json $T/swfirst1/rgb $FX/prep16-silver-wind-first-body.json > /dev/null && echo "SW first-body written"
npx vite-node tools/integration/prep16PsychUpFirstBody.ts $T/pufirst1/out.json $T/pufirst1/rgb $FX/prep16-psych-up-first-body.json > /dev/null && echo "PU first-body written"
node --experimental-strip-types tools/integration/prep16Routes.ts > $FX/prep16-routes.json
node --experimental-strip-types tools/integration/prep16RouteProbe.ts > $FX/prep16-route-probe.json; node --experimental-strip-types tools/integration/prep16RouteProbe.ts | cmp - $FX/prep16-route-probe.json && echo "route probe x2 identical"
echo done
