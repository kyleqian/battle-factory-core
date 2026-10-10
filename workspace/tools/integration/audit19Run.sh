#!/bin/sh
# Live audit 19 reproduction (run from workspace/; direct mGBA only, never the shared HTTP oracles; production src is NOT patched —
# a temp patch is applied only to a git-archive copy inside the scratch dir).
#   sh tools/integration/audit19Run.sh <receipt-dir> <scratch-dir>      (both FRESH caller-given dirs; nothing is deleted outside them)
# 1. re-stages the scenarios (must equal tools/integration/fixtures/audit-19/scenarios/);
# 2. probes every scenario once (audit19Probes.py) and derives the consumer fixtures (audit19Fixtures.py; must equal fixtures/);
# 3. audit19Check.ts per scenario on the COMMITTED fixtures (two more fresh probe processes each; CHAIN + ENTRY lends; r1 == r2) into
#    <receipt-dir>/check/, then summary.txt (audit19Summary.py) and verdicts.txt (audit19Verdicts.py: vs the no-unit controls);
# 4. lends.txt: every window's production lend (a deferred lend resolved as the render seam resolves it) vs the ROM free order at
#    activation (AUDIT19_LENDS_ONLY);
# 5. wp160/: ISSUES #160 (audit19Wp160.sh: the dive70 fixture's own lend vs the ROM, the ROM-turn history, and the patched copy);
# 6. compares <receipt-dir> with the committed receipts (audit19Compare.py).
set -e
[ $# -ge 2 ] || { echo "usage: audit19Run.sh <receipt-dir> <scratch-dir>"; exit 2; }
REC=$1; T=$2; W=tools/integration/fixtures/audit-19
mkdir -p "$REC/check" "$T"
J=${AUDIT19_JOBS:-10}
python3 tools/integration/audit19Stage.py "$T/sc" > /dev/null
diff -rq "$T/sc" $W/scenarios || { echo "staged scenarios differ from the committed ones"; exit 1; }
AUDIT19_JOBS=$J python3 tools/integration/audit19Probes.py "$T/probe" > "$T/probes.txt"
python3 tools/integration/audit19Fixtures.py "$T/probe" "$T/fx" > "$REC/derive.txt"
diff -rq "$T/fx" $W/fixtures > "$REC/derive-vs-committed.txt" && echo "derived fixtures == committed" >> "$REC/derive-vs-committed.txt" \
  || echo "WARNING: derived fixtures differ from the committed ones (see $REC/derive-vs-committed.txt)"
export REC T W
ls $W/fixtures/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 -P "$J" sh -c '
  n=$(basename "$0")
  node --experimental-strip-types --no-warnings tools/integration/audit19Check.ts $W/fixtures "$n" "$REC/check/check-$n.json" > "$T/check-$n.log" 2>&1 \
    || echo "FAILED $n (see $T/check-$n.log)"'
python3 tools/integration/audit19Summary.py "$REC/check" > "$REC/summary.txt"
python3 tools/integration/audit19Verdicts.py "$REC/check" > "$REC/verdicts.txt"
for n in $(ls $W/fixtures/*.json | sed 's/-c[0-9]*\.json$//' | sort -u); do
  AUDIT19_LENDS_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/audit19Check.ts $W/fixtures "$(basename "$n")" /dev/null
done > "$REC/lends.txt"
[ -f tools/integration/audit19Wp160.sh ] && sh tools/integration/audit19Wp160.sh "$REC/wp160" "$T/wp160"
[ -d $W/receipts/check ] && python3 tools/integration/audit19Compare.py "$REC" $W/receipts | tee "$T/receipts-vs-committed.txt" | tail -14 || true
