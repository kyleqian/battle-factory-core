#!/bin/sh
# Deferred-lend Ice Ball dense windows (run from workspace/): one d4aTimingCheck process per fixture (two fresh oracle runs each), in parallel.
# usage: OUT=/tmp/lend-d4a sh tools/integration/lendIceBallWindows.sh [fixture.json ...]   (default: tools/integration/fixtures/lend-live/ice-ball-*.json)
OUT=${OUT:-/tmp/lend-d4a}; mkdir -p "$OUT"
FIXTURES=${*:-$(ls tools/integration/fixtures/lend-live/ice-ball-*.json)}
for f in $FIXTURES; do
  n=$(basename "$f" .json)
  node --experimental-strip-types --no-warnings tools/integration/d4aTimingCheck.ts "$OUT/$n.json" "$f" > "$OUT/$n.log" 2>&1 &
done
wait
status=0
for f in $FIXTURES; do n=$(basename "$f" .json); tail -1 "$OUT/$n.log"; grep -q '"violations":\[\]' "$OUT/$n.log" || status=1; done
exit $status
