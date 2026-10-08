#!/bin/sh
# speciesAudit13: speciesAudit13Check.ts per fixture in parallel (one receipt per fixture -> <REC>/<stem>-test.json) with the CURRENT src tree;
# the age shift is the move's calibrated prep38 doll-free CONTROL body (committed tools/integration/fixtures/prep38/receipts/control).
# usage: PROBES=<probe dir> REC=<receipt dir> [P=12] sh tools/integration/speciesAudit13CheckAll.sh fixture.json...
[ -n "$PROBES" ] && [ -n "$REC" ] || { echo "PROBES= REC= required"; exit 2; }
mkdir -p "$REC"; export PROBES REC; SHIFTS=${SHIFTS:-tools/integration/fixtures/prep38/receipts/control}; export SHIFTS
for f in "$@"; do echo "$f"; done | xargs -P ${P:-12} -n 1 sh -c \
 'node --experimental-strip-types --no-warnings tools/integration/speciesAudit13Check.ts --probes="$PROBES" --out="$REC/$(basename "$0")" --shifts=$SHIFTS "$0" 2>&1 | tail -1'
