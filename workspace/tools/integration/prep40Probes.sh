#!/bin/sh
# prep40: fresh direct-mGBA probes (prep40Probe.py; never the shared HTTP oracles) of the prep40Stage.py scenarios
# (tools/integration/fixtures/prep40/scenarios), every scenario twice from fresh processes, r1 == r2 cmp'd.
# usage (from workspace/): OUT=<fresh dir> sh tools/integration/prep40Probes.sh [scenario-stem ...]   (JOBS=<n>, default 16)
set -e
[ -n "$OUT" ] || { echo "OUT=<dir> required"; exit 2; }
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
SC=tools/integration/fixtures/prep40/scenarios
mkdir -p "$OUT"
ALL=$(cut -f1 "$SC/list.tsv")
for s in ${*:-$ALL}; do for r in 1 2; do
  [ ! -e "$OUT/$s-r$r.json" ] || { echo "refusing to reuse $OUT/$s-r$r.json"; exit 2; }
  echo "$s $r"
done; done | xargs -P "${JOBS:-16}" -n 2 sh -c 'python3 tools/run-mgba-probe.py "$0/$1-r$2.json" -- "$PY" tools/integration/prep40Probe.py "'"$SC"'/$1.json" "$0/$1-r$2.json" "$0/$1-r$2-rgb" > "$0/$1-r$2.out" 2>&1 || echo "FAIL $1 r$2"' "$OUT"
n=0
for s in ${*:-$ALL}; do
  f="$OUT/$s-r1.json"
  [ -s "$f" ] || { echo "EMPTY $f"; exit 1; }
  cmp -s "$f" "$OUT/$s-r2.json" || { echo "DIFF $f"; exit 1; }
  n=$((n + 1))
done
echo "probes: r1 == r2 byte-identical ($n scenarios)"
