#!/bin/sh
# later58: every later58 scenario twice fresh (r1 / r2) in independent direct-mGBA prep48Probe.py processes (never the shared HTTP oracles).
#   OUT=<scratch> [JOBS=12] sh tools/integration/later58Probes.sh [scenario-glob-prefix]
# Writes $OUT/r1/<name>.json and $OUT/r2/<name>.json (no RGB kept; the pixel checks re-probe fresh through liveAdapterFramebuffer.ts).
set -e
: "${OUT:?set OUT=<scratch dir>}"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
S=tools/integration/fixtures/later58/scenarios
mkdir -p "$OUT/r1" "$OUT/r2"
for run in r1 r2; do for s in $S/${1:-}*.json; do echo "$run $(basename "$s" .json)"; done; done | xargs -P "${JOBS:-12}" -n 2 sh -c '
  python3 tools/run-mgba-probe.py "$0/$1/$2.json" -- '"$PY"' tools/integration/prep48Probe.py tools/integration/fixtures/later58/scenarios/$2.json "$0/$1/$2.json" "$0/$1/rgb-$2" > /dev/null 2>&1 || true
  rm -rf "$0/$1/rgb-$2" "$0/$1/$2.json.log"' "$OUT"
