#!/bin/sh
# Live audit 17 reproduction (run from workspace/; direct mGBA only, never the shared HTTP oracles).
#   sh tools/integration/audit17Run.sh <receipt-dir> <scratch-dir>      (both FRESH caller-given dirs; nothing is deleted)
# 1. re-stages the scenarios (must equal tools/integration/fixtures/audit-17/scenarios/);
# 2. probes every scenario once (audit17Probes.py) and derives the consumer fixtures (audit17Fixtures.py; must equal fixtures/);
# 3. runs audit17Check.ts per scenario (two more fresh probe processes each; CHAIN and ENTRY lends; r1 == r2 per-row digests),
#    AUDIT17_JOBS (default 8) at once, into <receipt-dir>/check-<scenario>.json, then <receipt-dir>/summary.txt (audit16Summary.py);
# 4. the dt60 RAM measurement (dt60Probe.py) + prediction-vs-measurement table, and the Heal Bell icon ablation.
# Production src is NOT patched here; the DEFECT patch proofs are receipts/patch-hidden*/ (git apply --unidiff-zero, run, revert).
set -e
[ $# -ge 2 ] || { echo "usage: audit17Run.sh <receipt-dir> <scratch-dir>"; exit 2; }
REC=$1; T=$2; W=tools/integration/fixtures/audit-17
mkdir -p "$REC" "$T/ram" "$REC/ablation"
python3 tools/integration/audit17Stage.py "$T/sc" > /dev/null
diff -rq "$T/sc" $W/scenarios || { echo "staged scenarios differ from the committed ones"; exit 1; }
python3 tools/integration/audit17Probes.py "$T/probe" > "$T/probes.txt"
python3 tools/integration/audit17Fixtures.py "$T/probe" "$T/fx" > "$T/derive.txt"
diff -rq "$T/fx" $W/fixtures || echo "WARNING: derived fixtures differ from the committed ones"
export REC T W
ls $W/fixtures/*.json | sed 's/-cu*[0-9]*\.json$//' | sort -u | xargs -n 1 -P "${AUDIT17_JOBS:-8}" sh -c '
  n=$(basename "$0")
  node --experimental-strip-types --no-warnings tools/integration/audit17Check.ts $W/fixtures "$n" "$REC/check-$n.json" > "$T/check-$n.log" 2>&1 \
    || echo "FAILED $n (see $T/check-$n.log)"'
python3 tools/integration/audit16Summary.py "$REC" > "$REC/summary.txt"
PY=${PY:-${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python}
export PYTHONPATH=${PYTHONPATH:-${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py}
for s in $W/scenarios/dt-*.json; do
  $PY tools/integration/dt60Probe.py "$s" "$T/ram/$(basename "$s")" 2 > /dev/null 2>&1 || [ -s "$T/ram/$(basename "$s")" ]  # exit 139 teardown
done
python3 tools/integration/audit17Dt60Measure.py "$T/ram" "$REC" > "$REC/dt60-prediction-vs-measurement.txt"
for n in bounce-heal-bell-ply bounce-heal-bell-opp; do
  node --experimental-strip-types --no-warnings tools/integration/audit17Check.ts $W/ablation "$n" "$REC/ablation/check-$n.json" > /dev/null 2>&1
done
python3 tools/integration/audit17Compare.py "$REC" $W/receipts
