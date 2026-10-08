#!/bin/sh
# speciesAudit14 attacker-swap check (run from workspace/): speciesAudit14SwapCheck.ts (= attdollLiveCheck.ts unchanged, the PRODUCTION
# composite as committed) on every stem of <scenario dir>/list.tsv, both fresh runs per window -> <receipt dir>/<stem>.json (+ .out),
# then speciesAudit14Summary.py -> <receipt dir>/summary.txt (one line per window: r1 / r2 px, digests identical, bad ages, tail rows).
# usage: sh tools/integration/speciesAudit14SwapRun.sh <probe dir> <scenario dir> <receipt dir> [P]
[ $# -ge 3 ] || { echo "usage: speciesAudit14SwapRun.sh <probe dir> <scenario dir> <receipt dir> [P]"; exit 2; }
PR=$1 S14_SCENARIOS=$2 REC=$3; mkdir -p "$REC"; export PR REC S14_SCENARIOS
cut -f1 "$S14_SCENARIOS/list.tsv" | xargs -P ${4:-12} -n 1 sh -c \
  'node --experimental-strip-types --no-warnings tools/integration/speciesAudit14SwapCheck.ts --out="$REC/$0.json" "$PR" "$0" > "$REC/$0.out" 2>&1 || echo "FAIL $0"'
python3 tools/integration/speciesAudit14Summary.py "$REC" "$S14_SCENARIOS/list.tsv" > "$REC/summary.txt"; tail -1 "$REC/summary.txt"
