#!/bin/sh
# Live audit 20 reproduction (run from workspace/; direct mGBA only, never the shared HTTP oracles; production src is NOT patched).
#   sh tools/integration/audit20Run.sh <receipt-dir> <scratch-dir>      (both FRESH caller-given dirs; nothing is deleted outside them)
# 1. re-stages the scenarios (must equal tools/integration/fixtures/audit-20/scenarios/);
# 2. probes every scenario once (audit20Probes.py) and derives the consumer fixtures (audit20Fixtures.py; must equal fixtures/);
# 3. audit20Check.ts per scenario on the COMMITTED fixtures (two more fresh probe processes each; CHAIN + ENTRY lends; r1 == r2; the
#    allocator input vs the ROM) into <receipt-dir>/check/, then summary.txt, verdicts.txt (vs the no-unit controls);
# 4. alloc.txt (AUDIT20_ALLOC_ONLY: per window the allocator input vs the ROM creates + pre-activation state, order lend vs ROM) and
#    lends.txt (AUDIT20_LENDS_ONLY: deferred lends resolved as the render seam resolves them); coverage.txt (audit20Coverage.py);
# 5. compares <receipt-dir> with the committed receipts (audit20Compare.py).
set -e
[ $# -ge 2 ] || { echo "usage: audit20Run.sh <receipt-dir> <scratch-dir>"; exit 2; }
REC=$1; T=$2; W=tools/integration/fixtures/audit-20
mkdir -p "$REC/check" "$T"
J=${AUDIT20_JOBS:-12}
python3 tools/integration/audit20Stage.py "$T/sc" > /dev/null
diff -rq "$T/sc" $W/scenarios || { echo "staged scenarios differ from the committed ones"; exit 1; }
AUDIT20_JOBS=$J python3 tools/integration/audit20Probes.py "$T/probe" > "$T/probes.txt"
python3 tools/integration/audit20Fixtures.py "$T/probe" "$T/fx" > "$REC/derive.txt"
diff -rq "$T/fx" $W/fixtures > "$REC/derive-vs-committed.txt" && echo "derived fixtures == committed" >> "$REC/derive-vs-committed.txt" \
  || echo "WARNING: derived fixtures differ from the committed ones (see $REC/derive-vs-committed.txt)"
export REC T W
ls $W/fixtures/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 -P "$J" sh -c '
  n=$(basename "$0")
  node --experimental-strip-types --no-warnings tools/integration/audit20Check.ts $W/fixtures "$n" "$REC/check/check-$n.json" > "$T/check-$n.log" 2>&1 \
    || echo "FAILED $n (see $T/check-$n.log)"'
python3 tools/integration/audit20Summary.py "$REC/check" > "$REC/summary.txt"
python3 tools/integration/audit20Verdicts.py "$REC/check" > "$REC/verdicts.txt"
# alloc.txt / lends.txt: one file per scenario in parallel, concatenated in the sorted scenario order
mkdir -p "$T/alloc" "$T/lends"
ls $W/fixtures/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename | xargs -n 1 -P "$J" sh -c '
  AUDIT20_ALLOC_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/audit20Check.ts $W/fixtures "$0" /dev/null > "$T/alloc/$0.txt"
  AUDIT20_LENDS_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/audit20Check.ts $W/fixtures "$0" /dev/null > "$T/lends/$0.txt"'
for n in $(ls $W/fixtures/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename); do cat "$T/alloc/$n.txt"; done > "$REC/alloc.txt"
for n in $(ls $W/fixtures/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename); do cat "$T/lends/$n.txt"; done > "$REC/lends.txt"
python3 tools/integration/audit20Coverage.py "$REC" $W/fixtures > "$REC/coverage.txt"
[ -d $W/receipts/check ] && python3 tools/integration/audit20Compare.py "$REC" $W/receipts | tee "$T/receipts-vs-committed.txt" | tail -14 || true
