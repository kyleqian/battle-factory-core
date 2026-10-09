#!/bin/sh
# Live audit 16: one prep48Probe.py run per scenario into <out-dir> (direct mGBA, fresh process each; never the shared HTTP oracles).
#   sh tools/integration/audit16Probes.sh <out-dir> [scenario.json ...]   (default: every tools/integration/fixtures/audit-16/scenarios/*.json)
# run-mgba-probe.py may exit 138/139 on a teardown SIGBUS with complete output; the JSON is validated by the wrapper. RGB dirs are removed.
# AUDIT16_JOBS (default 12) probes run at once.
OUT=$1; shift; mkdir -p "$OUT"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
export PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python} OUT
SC=${*:-$(ls tools/integration/fixtures/audit-16/scenarios/*.json)}
for s in $SC; do echo "$s"; done | xargs -n 1 -P "${AUDIT16_JOBS:-12}" sh -c '
  n=$(basename "$0" .json)
  python3 tools/run-mgba-probe.py "$OUT/$n.json" -- $PY tools/integration/prep48Probe.py "$0" "$OUT/$n.json" "$OUT/rgb-$n" > /dev/null 2>&1
  rm -rf "$OUT/rgb-$n" "$OUT/$n.json.log"'
ls "$OUT"/*.json | wc -l
