#!/bin/sh
# speciesAudit13 Ice Ball windows (run from workspace/): d4aTimingCheck.ts (two fresh direct-mGBA probe processes per fixture, the PRODUCTION
# live renderer over the complete dense window, the D4 policy for Ice Ball's per-counter optional lag) on every speciesAudit13IceBallFixtures.py
# fixture, P in parallel -> <receipt dir>/<fixture>.json + .log; then one line per fixture.
# usage: sh tools/integration/speciesAudit13IceBallRun.sh <receipt dir> [P] [fixture.json ...]   (default: fixtures/species-audit-13/iceball-derived/*.json)
[ $# -ge 1 ] || { echo "usage: speciesAudit13IceBallRun.sh <receipt dir> [P] [fixture.json ...]"; exit 2; }
OUT=$1; P=${2:-10}; shift; [ $# -gt 0 ] && shift; mkdir -p "$OUT"; export OUT
FIXTURES=${*:-$(ls tools/integration/fixtures/species-audit-13/iceball-derived/*.json)}
for f in $FIXTURES; do echo "$f"; done | xargs -P "$P" -n 1 sh -c \
  'n=$(basename "$0" .json); node --experimental-strip-types --no-warnings tools/integration/d4aTimingCheck.ts "$OUT/$n.json" "$0" > "$OUT/$n.log" 2>&1'
for f in $FIXTURES; do n=$(basename "$f" .json); printf '%s ' "$n"; tail -1 "$OUT/$n.log" | cut -c1-400; done
