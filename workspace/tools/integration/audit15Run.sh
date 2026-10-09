#!/bin/sh
# Live audit 15 reproduction (run from workspace/; direct mGBA only, never the shared HTTP oracles).
#   sh tools/integration/audit15Run.sh <receipt-dir> [scratch-dir]
# 1. re-stages the scenarios (must equal the committed tools/integration/fixtures/audit-15/scenarios/);
# 2. probes every scenario once (audit15Probes.sh) and derives the consumer fixtures (audit15Fixtures.py; must equal the committed fixtures/);
# 3. runs the PRODUCTION checker (audit15Check.ts: two more fresh probe processes per scenario, r1 == r2 per-row digests) per scenario,
#    in parallel, writing <receipt-dir>/main/check-<scenario>.json, then main/summary.txt (audit15Summary.py);
# 4. the entry-lend sensitivity pass (AUDIT15_ENTRY_LEND=1: the same windows with the history cut to the consumer body) into <receipt-dir>/entry/.
set -e
[ $# -ge 1 ] || { echo "usage: audit15Run.sh <receipt-dir> [scratch-dir]"; exit 2; }
REC=$1; T=${2:-$(mktemp -d)}; W=tools/integration/fixtures/audit-15
mkdir -p "$REC" "$T"
python3 tools/integration/audit15Stage.py "$T/sc" > /dev/null
diff -rq "$T/sc" $W/scenarios || { echo "staged scenarios differ from the committed ones"; exit 1; }
sh tools/integration/audit15Probes.sh "$T/probe" > /dev/null
python3 tools/integration/audit15Fixtures.py "$T/probe" "$T/fx" > "$T/derive.txt"
diff -rq "$T/fx" $W/fixtures || echo "WARNING: derived fixtures differ from the committed ones"
for pass in main entry; do
  mkdir -p "$REC/$pass"
  for s in $W/scenarios/*.json; do
    n=$(basename "$s" .json)
    [ $pass = entry ] && case $n in ctl-*|acc-ctl-*) continue;; esac
    E=0; [ $pass = entry ] && E=1
    AUDIT15_ENTRY_LEND=$E POKEBENCH_LIVE_PROBE_SHARE=1 node --experimental-strip-types --no-warnings tools/integration/audit15Check.ts $W/fixtures \
      "$REC/$pass/check-$n.json" "$n-c" > "$T/$pass-$n.log" 2>&1 &
  done
  wait
  python3 tools/integration/audit15Summary.py "$REC/$pass" > "$REC/$pass/summary.txt"
done
cat "$REC/main/summary.txt"
