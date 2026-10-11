#!/bin/sh
# fury99: reproduce every committed fury99 artifact from scratch into a FRESH out dir inside the repo (refused if non-empty / outside).
#   sh tools/integration/fury99Run.sh <fresh-out-dir> [--census]
# 1. scenarios (fury99Scenarios.py, written to the committed dir) must be byte-identical (git diff --quiet);
# 2. probes: 10 scenarios x2 fresh direct mGBA (fury99Probes.sh); summary (r1 == r2, RAM counters, palette blend rows) == probe-summary.json;
# 3. fixtures (fury99Fixtures.py over r1) == fixtures/fury99/live;
# 4. the production renderer check (later58Check.sh: liveAdapterFramebuffer.ts, two more fresh probes per scenario) == fixtures/fury99/check.json,
#    and the receipt (fury99Receipt.py) == fixtures/fury99-live-receipt.json;
# 5. the Tier-1 test; 6. --census: fury99Census.sh (base 46d64a860 vs HEAD, seeds 0..999) and its delta summary.
set -e
OUT=${1:?usage: fury99Run.sh <fresh-out-dir> [--census]}
W=$(pwd)
[ -f "$W/tools/integration/fury99Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"; [ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
F=tools/integration/fixtures/fury99
fail=0
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }
python3 tools/integration/fury99Scenarios.py > /dev/null
git diff --quiet -- "$F/scenarios" && echo "SAME scenarios (10)" || { echo "DIFF scenarios"; fail=1; }
OUT="$OUT/probes" JOBS=8 sh tools/integration/fury99Probes.sh
python3 tools/integration/fury99Summary.py "$OUT/probes" "$OUT/probe-summary.json" > /dev/null
check "$F/probe-summary.json" "$OUT/probe-summary.json" "probe-summary.json (r1 == r2, counters, blend rows)"
python3 tools/integration/fury99Fixtures.py "$OUT/probes/r1" "$OUT/live" > /dev/null
diff -r "$F/live" "$OUT/live" > /dev/null && echo "SAME fixtures (50)" || { echo "DIFF fixtures"; fail=1; }
OUT="$OUT/check-scratch" JOBS=8 sh tools/integration/later58Check.sh "$OUT/live" "$OUT/check.json" > "$OUT/check.log" 2>&1
# later58Check.sh writes compact JSON; the committed copy is the same rows (compare the parsed rows, not the bytes).
python3 -c 'import json, sys; a, b = (json.load(open(p))["rows"] for p in sys.argv[1:3]); sys.exit(a != b)' "$F/check.json" "$OUT/check.json" \
  && echo "SAME check rows (verdicts, px, digests, probe shas)" || { echo "DIFF check rows"; fail=1; }
python3 tools/integration/fury99Receipt.py "$OUT/probes" "$OUT/check.json" "$OUT/fury99-live-receipt.json"
check tools/integration/fixtures/fury99-live-receipt.json "$OUT/fury99-live-receipt.json" "fury99-live-receipt.json"
rm -rf "$OUT/check-scratch"
PATH="$W/tools/autonomy/bin:$PATH" npx vitest run tests/animation/fury99FuryCutterCounters.test.ts --maxWorkers=4 > "$OUT/test.log" 2>&1 \
  && echo "PASS fury99FuryCutterCounters.test.ts" || { echo "FAIL fury99FuryCutterCounters.test.ts"; fail=1; }
if [ "${2:-}" = "--census" ]; then
  sh tools/integration/fury99Census.sh "$OUT/census" 46d64a860 HEAD
  python3 tools/integration/fury99CensusCheck.py "$OUT/census" | tee "$OUT/census-check.txt"
fi
[ "$fail" = 0 ] && echo "fury99Run: ALL SAME" || { echo "fury99Run: DIFFERENCES"; exit 1; }
