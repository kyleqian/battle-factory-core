#!/bin/sh
# flat84: every committed flat84 scenario twice, each in a FRESH direct-mGBA process (flat77Probe.py unchanged, via tools/run-mgba-probe.py;
# never the shared HTTP oracles), then r1 == r2 (probe JSON byte-identical, RGB dirs identical). Both runs of a scenario are in one batch
# (ISSUES #154). Exit codes 0 / 138 / 139 (teardown) are not gated. The raw RGB dirs are removed after the compare unless FLAT84_KEEP_RGB=1.
#   sh tools/integration/flat84Probes.sh <fresh-out-dir>     (writes <out>/r1, <out>/r2, <out>/probes-r1r2.txt)
set -e
OUT=${1:?usage: flat84Probes.sh <fresh-out-dir>}
mkdir -p "$OUT/r1" "$OUT/r2"
export OUT PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}; export PY
for f in tools/integration/fixtures/flat84/scenarios/*.json; do for r in 1 2; do echo "$r $f"; done; done | xargs -n 2 -P "${FLAT84_JOBS:-12}" sh -c '
  n=$(basename "$1" .json)
  python3 tools/run-mgba-probe.py "$OUT/r$0/$n.json" -- "$PY" tools/integration/flat77Probe.py "$1" "$OUT/r$0/$n.json" "$OUT/rgb-r$0/$n" > "$OUT/r$0/$n.log" 2>&1 || true'
for f in tools/integration/fixtures/flat84/scenarios/*.json; do n=$(basename "$f" .json)
  if [ -s "$OUT/r1/$n.json" ] && cmp -s "$OUT/r1/$n.json" "$OUT/r2/$n.json" && diff -rq "$OUT/rgb-r1/$n" "$OUT/rgb-r2/$n" > /dev/null; then echo "same $n"; else echo "DIFF $n"; fi
done > "$OUT/probes-r1r2.txt"
[ -n "$FLAT84_KEEP_RGB" ] || rm -rf "$OUT/rgb-r1" "$OUT/rgb-r2"
cat "$OUT/probes-r1r2.txt"
