#!/bin/sh
# Live audit 15: one prep48Probe.py run per scenario into <out-dir> (direct mGBA, fresh process each; never the shared HTTP oracles).
#   sh tools/integration/audit15Probes.sh <out-dir> [scenario.json ...]   (default: every tools/integration/fixtures/audit-15/scenarios/*.json)
# run-mgba-probe.py may exit 138/139 on a teardown SIGBUS with complete output; the JSON is validated by the wrapper. RGB dirs are removed.
OUT=$1; shift; mkdir -p "$OUT"
export PYTHONPATH=${PYTHONPATH:-${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py}
PY=${PY:-${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python}
SC=${*:-$(ls tools/integration/fixtures/audit-15/scenarios/*.json)}
for s in $SC; do
  n=$(basename "$s" .json)
  ( python3 tools/run-mgba-probe.py "$OUT/$n.json" -- $PY tools/integration/prep48Probe.py "$s" "$OUT/$n.json" "$OUT/rgb-$n" > /dev/null 2>&1
    rm -rf "$OUT/rgb-$n" "$OUT/$n.json.log" ) &
done
wait
ls "$OUT"/*.json | wc -l
