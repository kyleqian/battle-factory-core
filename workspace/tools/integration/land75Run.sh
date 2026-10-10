#!/bin/sh
# land75 wall-route dense check (docs/land75-allocator-hidden-faint.md). Run from workspace/; direct mGBA only (never the shared HTTP
# oracles); production src is NOT patched. Everything goes under the FRESH <out-dir> (refused if non-empty); nothing is removed outside it.
#   sh tools/integration/land75Run.sh <fresh-out-dir>
# 1. re-stages the scenarios (the committed four must be byte-identical to the staged ones of the same name);
# 2. probes the committed scenarios once (audit18Probes.py) and re-derives the fixtures (land75Fixtures.py; must equal fixtures/);
# 3. audit18Check.ts per scenario on the COMMITTED fixtures (two more fresh probe processes each, r1 == r2); the wall260 scenarios run with
#    AUDIT18_NO_MISS_RULE=1: audit 18's per-turn missed-strike inference cannot see that Magic Coat (+4 priority) precedes the diver's strike
#    in the same turn (the fixture's turn ends at the consumer); hideAgree still checks the hide against the ROM's own invisible flags;
# 4. land75RouteCheck.ts (the production orchestrator on routes 10 / 260); every receipt compared with tools/integration/fixtures/land75/.
set -e
OUT=${1:?usage: land75Run.sh <fresh-out-dir>}
if [ -e "$OUT" ] && [ -n "$(ls -A "$OUT" 2>/dev/null)" ]; then echo "refusing: $OUT exists and is not empty"; exit 1; fi
mkdir -p "$OUT/check"; W=tools/integration/fixtures/land75; N="node --experimental-strip-types --no-warnings"
python3 tools/integration/land75Stage.py "$OUT/sc" > /dev/null
for f in $W/scenarios/*.json; do cmp -s "$f" "$OUT/sc/$(basename "$f")" && echo "same  scenarios/$(basename "$f")" || echo "DIFF  scenarios/$(basename "$f")"; done
python3 tools/integration/audit18Probes.py "$OUT/probe" $W/scenarios/*.json > "$OUT/probes.txt"
python3 tools/integration/land75Fixtures.py "$OUT/probe" "$OUT/fx" $W/scenarios > "$OUT/derive.txt"
diff -rq "$OUT/fx" $W/fixtures > /dev/null && echo "same  fixtures/ (derived == committed)" || echo "DIFF  fixtures/"
for f in $W/scenarios/*.json; do n=$(basename "$f" .json)
  case $n in wall260-*) MISS=1;; *) MISS=;; esac
  (AUDIT18_NO_MISS_RULE=$MISS $N tools/integration/audit18Check.ts $W/fixtures "$n" "$OUT/check/check-$n.json" > "$OUT/check-$n.log" 2>&1 || echo "FAILED $n") &
done
wait
$N tools/integration/land75RouteCheck.ts --out="$OUT/route-check.json" > /dev/null
for f in "$OUT"/check/*.json; do cmp -s "$f" "$W/check/$(basename "$f")" && echo "same  check/$(basename "$f")" || echo "DIFF  check/$(basename "$f")"; done
cmp -s "$OUT/route-check.json" $W/route-check.json && echo "same  route-check.json" || echo "DIFF  route-check.json"
