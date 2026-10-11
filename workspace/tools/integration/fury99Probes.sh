#!/bin/sh
# fury99: every fury99 scenario twice fresh (r1 / r2, one batch) in independent direct-mGBA fury99Probe.py processes (never the HTTP oracles).
#   OUT=<scratch> [JOBS=8] sh tools/integration/fury99Probes.sh [scenario-glob-prefix]
# Writes $OUT/r1/<name>.json and $OUT/r2/<name>.json (raw RGB deleted; the pixel checks re-probe fresh through liveAdapterFramebuffer.ts).
# A crashed job (no parseable output) is rerun once.
set -e
: "${OUT:?set OUT=<scratch dir>}"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
S=tools/integration/fixtures/fury99/scenarios
mkdir -p "$OUT/r1" "$OUT/r2"
for pass in 1 2; do
for run in r1 r2; do for s in $S/${1:-}*.json; do
  n=$(basename "$s" .json)
  python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$OUT/$run/$n.json" 2>/dev/null || echo "$run $n"
done; done | xargs -P "${JOBS:-8}" -n 2 sh -c '
  python3 tools/run-mgba-probe.py "$0/$1/$2.json" -- '"$PY"' tools/integration/fury99Probe.py tools/integration/fixtures/fury99/scenarios/$2.json "$0/$1/$2.json" "$0/$1/rgb-$2" > /dev/null 2>&1 || true
  rm -rf "$0/$1/rgb-$2" "$0/$1/$2.json.log"' "$OUT"
done
