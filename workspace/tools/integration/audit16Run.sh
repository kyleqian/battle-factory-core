#!/bin/sh
# Live audit 16 reproduction (run from workspace/; direct mGBA only, never the shared HTTP oracles).
#   sh tools/integration/audit16Run.sh <receipt-dir> [scratch-dir]
# 1. re-stages the scenarios (must equal the committed tools/integration/fixtures/audit-16/scenarios/);
# 2. probes every scenario once (audit16Probes.sh) and derives the consumer fixtures (audit16Fixtures.py; must equal the committed fixtures/);
# 3. runs audit16Check.ts per scenario (two more fresh probe processes; CHAIN and ENTRY lends rendered against both; r1 == r2 per-row
#    digests), AUDIT16_JOBS (default 8) at once, into <receipt-dir>/check-<scenario>.json, then <receipt-dir>/summary.txt (audit16Summary.py).
set -e
[ $# -ge 1 ] || { echo "usage: audit16Run.sh <receipt-dir> [scratch-dir]"; exit 2; }
REC=$1; T=${2:-$(mktemp -d)}; W=tools/integration/fixtures/audit-16
mkdir -p "$REC" "$T"
python3 tools/integration/audit16Stage.py "$T/sc" > /dev/null
diff -rq "$T/sc" $W/scenarios || { echo "staged scenarios differ from the committed ones"; exit 1; }
sh tools/integration/audit16Probes.sh "$T/probe" > /dev/null
python3 tools/integration/audit16Fixtures.py "$T/probe" "$T/fx" > "$T/derive.txt"
diff -rq "$T/fx" $W/fixtures || echo "WARNING: derived fixtures differ from the committed ones"
export REC T W
ls $W/fixtures/*.json | sed 's/-cu*[0-9]*\.json$//' | sort -u | xargs -n 1 -P "${AUDIT16_JOBS:-8}" sh -c '
  n=$(basename "$0")
  node --experimental-strip-types --no-warnings tools/integration/audit16Check.ts $W/fixtures "$n" "$REC/check-$n.json" > "$T/check-$n.log" 2>&1 \
    || echo "FAILED $n (see $T/check-$n.log)"'
python3 tools/integration/audit16Summary.py "$REC" > "$REC/summary.txt"
cat "$REC/summary.txt"
