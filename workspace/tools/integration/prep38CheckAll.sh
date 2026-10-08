#!/bin/sh
# prep38: prep38Check.ts per fixture in parallel (one receipt per fixture -> <REC>/<stem>-<kind>.json), with the CURRENT src tree.
# usage: PROBES=<probe dir> REC=<receipt dir> [P=8] [ORDER=drop-164] [CAL=1 | SHIFTS=<calibrated control receipts dir>] sh tools/integration/prep38CheckAll.sh fixture.json...
[ -n "$PROBES" ] && [ -n "$REC" ] || { echo "PROBES= REC= required"; exit 2; }
mkdir -p "$REC"; export PROBES REC ORDER CAL SHIFTS
for f in "$@"; do echo "$f"; done | xargs -P ${P:-8} -n 1 sh -c \
 'node --experimental-strip-types --no-warnings tools/integration/prep38Check.ts --probes="$PROBES" --out="$REC/$(basename "$0")" ${ORDER:+--order=$ORDER} ${CAL:+--calibrate} ${SHIFTS:+--shifts=$SHIFTS} "$0" 2>&1 | tail -1'
