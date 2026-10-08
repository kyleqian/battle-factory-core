#!/bin/sh
# prep40: subbed-ATTACKER swap composites for the top live adapters. Fresh probes (twice, cmp) + the production checks on BOTH runs:
#   patched/   the temporary patch fixtures/prep40/swap-ids-framing-env.diff with PREP40_SWAP_IDS = every probed move id (prod + aligned + tail)
#   fallback/  the same patch, no extra ids = production today (every non-proven attacker-doll body declines to the static field)
#   drop164/   patched, --order=drop-164 (the attacker's Substitute body treated as order-neutral: NEEDS-ORDER evidence)
#   firstbody/ patched, --order=first-body (the known-entry first-body order lend: NEEDS-ORDER evidence where drop-164 still has no lend)
# then prep40Summary.py -> $REC/summary.json / summary.txt. The patch is always reverted (trap); src must be clean.
# usage (from workspace/): OUT=<dir> REC=<fresh dir> sh tools/integration/prep40Run.sh   [SKIP_PROBES=1 reuses OUT] [JOBS=<n>]
set -e
[ -n "$OUT" ] && [ -n "$REC" ] || { echo "OUT=<dir> REC=<dir> required"; exit 2; }
git diff --quiet -- src || { echo "src is not clean"; exit 2; }
[ -n "$SKIP_PROBES" ] || sh tools/integration/prep40Probes.sh
SC=tools/integration/fixtures/prep40/scenarios
PATCH=tools/integration/fixtures/prep40/swap-ids-framing-env.diff
mkdir -p "$REC/patched" "$REC/fallback" "$REC/drop164" "$REC/firstbody"
git apply "$PATCH"
trap 'git apply -R "$PATCH"' EXIT INT TERM
IDS=$(cut -f3 "$SC/list.tsv" | sort -un | tr '\n' ',' | sed 's/,$//')
CHECK="node --experimental-strip-types --no-warnings tools/integration/prep40Check.ts"
export CHECK OUT
run() { # mode env order
  M_DIR="$REC/$1" M_ENV="$2" M_ORDER="$3"; export M_DIR M_ENV M_ORDER
  cut -f1 "$SC/list.tsv" | xargs -n 1 -P "${JOBS:-8}" sh -c 'env $M_ENV $CHECK $M_ORDER --out="$M_DIR/$0.json" "$OUT" "$0" > "$M_DIR/$0.out" 2>&1 || echo "FAIL $M_DIR $0"'
}
run patched "PREP40_SWAP_IDS=$IDS" ""
run fallback "PREP40_SWAP_IDS=" ""
run drop164 "PREP40_SWAP_IDS=$IDS" "--order=drop-164"
run firstbody "PREP40_SWAP_IDS=$IDS" "--order=first-body"
python3 tools/integration/prep40Summary.py "$REC" > "$REC/summary.txt"
echo "receipts -> $REC (summary.txt)"
