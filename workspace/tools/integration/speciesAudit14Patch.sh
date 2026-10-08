#!/bin/sh
# speciesAudit14 defect proof (run from workspace/): apply an env-gated src patch IN PLACE, run speciesAudit14SwapCheck.ts on the given
# stems with the gate set, revert src (trap), then the summary. Never commit with the patch applied (git status src must be clean).
# usage: sh tools/integration/speciesAudit14Patch.sh <patch.diff> <probe dir> <scenario dir> <receipt dir> <ENV=1> <stem>...
[ $# -ge 6 ] || { echo "usage: speciesAudit14Patch.sh <patch.diff> <probe dir> <scenario dir> <receipt dir> <ENV=1> <stem>..."; exit 2; }
P=$1 PR=$2 SC=$3 REC=$4 GATE=$5; shift 5; mkdir -p "$REC"
git apply --directory=workspace -p2 "$P" 2>/dev/null || git apply "$P" || { echo "patch did not apply"; exit 1; }
trap 'git checkout src' EXIT
for s in "$@"; do echo "$s"; done | env "$GATE" PR="$PR" REC="$REC" S14_SCENARIOS="$SC" xargs -P 14 -n 1 sh -c \
  'node --experimental-strip-types --no-warnings tools/integration/speciesAudit14SwapCheck.ts --out="$REC/$0.json" "$PR" "$0" > "$REC/$0.out" 2>&1 || echo "FAIL $0"'
git checkout src; trap - EXIT; git status --short src
for s in "$@"; do printf '%s\t\n' "$s"; done > "$REC/list.tsv"; python3 tools/integration/speciesAudit14Summary.py "$REC" "$REC/list.tsv" > "$REC/summary.txt"; tail -1 "$REC/summary.txt"
