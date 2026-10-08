#!/bin/sh
# S10A attacker-doll widening (docs/next-adapters-prep40.md): fresh direct-mGBA prep40 probes (each scenario twice, r1 == r2 cmp'd)
# of every scenario whose move is a prep40 attacker-doll candidate, then the PRODUCTION check (attdollLiveCheck.ts, no patch) on
# both runs, then the receipt summary (attdollReceipt.py; pass REC2 for a second fresh pass's receipts).
# usage (from workspace/): OUT=<fresh dir> REC=<fresh dir> sh tools/integration/attdollRun.sh   [SKIP_PROBES=1 reuses OUT] [JOBS=<n>]
#        python3 tools/integration/attdollReceipt.py <receipt.json> <REC1> <REC2>
set -e
[ -n "$OUT" ] && [ -n "$REC" ] || { echo "OUT=<dir> REC=<dir> required"; exit 2; }
SC=tools/integration/fixtures/prep40/scenarios
STEMS=$(awk -F'\t' '$3~/^(8|25|38|56|57|86|109|157|213|242|263|280|317|332|89|247|94|188|53|92|44|7|153|58|85|202|315|69|224|189)$/{print $1}' "$SC/list.tsv" | grep -v roared)
[ -n "$SKIP_PROBES" ] || sh tools/integration/prep40Probes.sh $STEMS
mkdir -p "$REC"
export OUT REC
for s in $STEMS; do echo "$s"; done | xargs -n 1 -P "${JOBS:-16}" sh -c 'node --experimental-strip-types --no-warnings tools/integration/attdollLiveCheck.ts --out="$REC/$0.json" "$OUT" "$0" > "$REC/$0.out" 2>&1 || echo "FAIL $0"'
python3 tools/integration/attdollReceipt.py "$REC/receipt.json" "$REC" | tail -2
