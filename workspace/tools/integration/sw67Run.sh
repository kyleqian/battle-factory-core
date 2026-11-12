#!/bin/sh
# sw67 rerun (docs/next-adapters-sw67.md): Shock Wave 351 fit + geometry classes + predictions + direct-mGBA grid + live-share census
# into a FRESH output dir, each step compared with the committed fixtures (tools/integration/fixtures/sw67/).
# usage (from workspace/): tools/integration/sw67Run.sh <fresh-out-dir> [--base <commit>] [--skip-classes] [--skip-probe] [--skip-census]
#   --base: the census / chain baseline (default 82690e775); its workspace/src + census tools are extracted with git archive into
#   <out>/base (node_modules symlinked), never checked out. Probes: direct mGBA (MGBA_PY / LIBMGBA_PY below), never the HTTP oracles.
set -eu
[ $# -ge 1 ] || { echo "usage: $0 <fresh-out-dir> [--base <commit>] [--skip-classes] [--skip-probe] [--skip-census]" >&2; exit 2; }
OUT=$1; shift
BASE=82690e775; CLASSES=1; PROBE=1; CENSUS=1
while [ $# -gt 0 ]; do
  case $1 in
    --base) BASE=$2; shift 2 ;;
    --skip-classes) CLASSES=0; shift ;;
    --skip-probe) PROBE=0; shift ;;
    --skip-census) CENSUS=0; shift ;;
    *) echo "unknown option $1" >&2; exit 2 ;;
  esac
done
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
FX=tools/integration/fixtures/sw67
NODE="node --experimental-strip-types --no-warnings"
MGBA_PY=${MGBA_PY:-${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python}
LIBMGBA_PY=${LIBMGBA_PY:-${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py}
same() { if cmp -s "$1" "$2"; then echo "  == $2"; else echo "  DIFFERS from $2" >&2; exit 1; fi; }

echo "[1] fit: plans48's 8 ROM receipts through the seam"
$NODE tools/integration/sw67ShockWaveFit.ts "$OUT/fit-plans48.json" | tail -1
same "$OUT/fit-plans48.json" "$FX/fit-plans48.json"
if [ $CLASSES = 1 ]; then
  echo "[2] geometry classes (~2 min)"
  $NODE tools/integration/sw67Classes.ts "$OUT/classes.json"
  same "$OUT/classes.json" "$FX/classes.json"
fi
echo "[3] predictions (the committed grid)"
$NODE tools/integration/sw67Predict.ts "$OUT/predictions.json" > /dev/null
same "$OUT/predictions.json" "$FX/predictions.json"
if [ $PROBE = 1 ]; then
  echo "[4] grid probes: 18 jobs x 2 fresh direct-mGBA runs (~20 s at 12 jobs)"
  PYTHONPATH=$LIBMGBA_PY "$MGBA_PY" tools/integration/sw67Probe.py "$OUT/probe" --jobs 12 --predictions "$FX/predictions.json"
  python3 tools/integration/sw67Extract.py "$OUT/probe" "$OUT/units.json" --predictions "$FX/predictions.json"
  same "$OUT/units.json" "$FX/units.json"
  $NODE tools/integration/sw67ShockWaveFit.ts "$OUT/grid-check.json" --units="$OUT/units.json" --prefix=sw67- --predictions="$FX/predictions.json" | tail -1
  same "$OUT/grid-check.json" "$FX/grid-check.json"
fi
if [ $CENSUS = 1 ]; then
  echo "[5] live-share census seeds 0..299: $BASE vs this checkout (~3 min, both in parallel), then the chain predictor (~3 min)"
  TOP=$(git rev-parse --show-toplevel)
  mkdir -p "$OUT/base"
  git -C "$TOP" archive --format=tar "$BASE" workspace/src workspace/package.json workspace/tools/integration/liveShareCensus.ts \
    workspace/tools/integration/liveShareCensusGates.ts workspace/tools/integration/prep61OrderCensus.ts | tar -x -C "$OUT/base" --strip-components=1
  ln -s "$PWD/node_modules" "$OUT/base/node_modules"
  (cd "$OUT/base" && $NODE tools/integration/liveShareCensus.ts --seeds=0..299 --out="$OUT/census-before.json" --commands="$OUT/census-before.jsonl" > "$OUT/census-before.log" 2>&1) &
  $NODE tools/integration/liveShareCensus.ts --seeds=0..299 --out="$OUT/census-after.json" --commands="$OUT/census-after.jsonl" > "$OUT/census-after.log" 2>&1 &
  wait
  tail -1 "$OUT/census-before.log"; tail -1 "$OUT/census-after.log"
  python3 tools/integration/prep43CensusDelta.py "$OUT/census-before.json" "$OUT/census-before.jsonl" "$OUT/census-after.json" "$OUT/census-after.jsonl" "$OUT/census-delta.json" | head -2
  python3 - "$OUT" <<'PY'
import json, sys
out = sys.argv[1]
b, a = json.load(open(f"{out}/census-before.json")), json.load(open(f"{out}/census-after.json"))
key = lambda p: [tuple(json.loads(l).get(k) for k in ("battle", "kind", "moveId", "side", "attacker", "target")) for l in open(p)]
print("  battle digest identical:", b["battleDigest"] == a["battleDigest"], b["battleDigest"][:8])
print("  command key sequence identical:", key(f"{out}/census-before.jsonl") == key(f"{out}/census-after.jsonl"))
PY
  (cd "$OUT/base" && $NODE tools/integration/prep61OrderCensus.ts --seeds=0..299 --out="$OUT/order-before.json" --commands="$OUT/order-before.jsonl" > "$OUT/order-before.log" 2>&1)
  python3 tools/integration/prep45Chains.py "$OUT/order-before.jsonl" "$OUT/chains.json" --cleared "body 351 SHOCK_WAVE" --after "$OUT/census-after.jsonl" > /dev/null
  python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print('  chains: predicted', d['predictedUnlockCommands'], '/', d['predictedUnlockFrames'], 'measured', d['measured'])" "$OUT/chains.json"
  rm "$OUT/base/node_modules"
fi
echo "sw67Run: done -> $OUT"
