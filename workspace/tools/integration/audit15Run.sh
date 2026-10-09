#!/bin/sh
# Live audit 15 reproduction (run from workspace/; direct mGBA only, never the shared HTTP oracles).
#   sh tools/integration/audit15Run.sh <receipt-dir> [scratch-dir]
# 1. re-stages the scenarios (must equal the committed tools/integration/fixtures/audit-15/scenarios/);
# 2. probes every scenario once (audit15Probes.sh) and derives the consumer fixtures (audit15Fixtures.py; must equal the committed fixtures/);
# 3. runs the PRODUCTION checker (audit15Check.ts: two more fresh probe processes per scenario, r1 == r2 per-row digests) per scenario,
#    in parallel, writing <receipt-dir>/check-<scenario>.json, then summary.txt (audit15Summary.py).
set -e
[ $# -ge 1 ] || { echo "usage: audit15Run.sh <receipt-dir> [scratch-dir]"; exit 2; }
REC=$1; T=${2:-$(mktemp -d)}; W=tools/integration/fixtures/audit-15
mkdir -p "$REC" "$T"
python3 tools/integration/audit15Stage.py "$T/sc" > /dev/null
diff -rq "$T/sc" $W/scenarios || { echo "staged scenarios differ from the committed ones"; exit 1; }
sh tools/integration/audit15Probes.sh "$T/probe" > /dev/null
python3 tools/integration/audit15Fixtures.py "$T/probe" "$T/fx" > "$T/derive.txt"
diff -rq "$T/fx" $W/fixtures || echo "WARNING: derived fixtures differ from the committed ones"
for s in $W/scenarios/*.json; do
  n=$(basename "$s" .json)
  POKEBENCH_LIVE_PROBE_SHARE=1 node --experimental-strip-types --no-warnings tools/integration/audit15Check.ts $W/fixtures "$REC/check-$n.json" "$n-c" > "$REC/check-$n.log" 2>&1 &
done
wait
python3 tools/integration/audit15Summary.py "$REC" > "$REC/summary.txt"
cat "$REC/summary.txt"
