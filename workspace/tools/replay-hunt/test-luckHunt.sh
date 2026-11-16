#!/usr/bin/env bash
# Deadline test for luckHunt.sh (no ROM drive: the dummy design's marker never runs). Run from anywhere: tools/replay-hunt/test-luckHunt.sh
# 1. a deadline already past: exit 0 in a few seconds, valid summary.json / summary.md, no seed started.
# 2. a deadline 15 s ahead, one job: exit 0, within one seed's time (limit 240 s), a valid summary, no seed started after the deadline.
set -uo pipefail
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd); ws=$(cd "$here/../.." && pwd); cd "$ws" || exit 1
t=$(mktemp -d "${TMPDIR:-/tmp}/luckhunt-test.XXXXXX"); trap 'rm -rf "$t"' EXIT
mkdir "$t/designs"
python3 - "$ws" "$t/designs/dummy.json" <<'PY'
import json, sys
s = json.load(open(sys.argv[1] + "/docs/parity-mac/stages/coverage/R001-lunatone-spdef-max.json"))
s.update(name="TEST-dummy-never-hit", rules=["R999"], cover=[{"file": "src/engine/damageCalc.ts", "text": "{\n    damage = 0", "at": 0}], coverAny=True, expect=[])
json.dump(s, open(sys.argv[2], "w"))
PY
fail=0
check() { python3 - "$1" "$2" <<'PY' || { echo "FAIL: $3"; fail=1; }
import json, sys
s = json.load(open(sys.argv[1] + "/summary.json")); assert s["byRule"][0]["rule"] == "R999" and s["totals"]["seeds"] == int(sys.argv[2]), s["totals"]
assert open(sys.argv[1] + "/summary.md").read().startswith("# Luck hunt")
PY
}
t0=$(date +%s)
LUCK_HUNT_OUT=$t/past LUCK_HUNT_DEADLINE_EPOCH=$((t0 - 60)) LUCK_HUNT_DESIGNS="$t/designs/*.json" "$here/luckHunt.sh" >"$t/past.console" 2>&1; rc=$?
d=$(( $(date +%s) - t0 ))
[ $rc = 0 ] && [ $d -le 20 ] || { echo "FAIL: past deadline: rc=$rc after ${d}s"; fail=1; }
check "$t/past" 0 "past deadline: summary or seeds started"
t0=$(date +%s)
LUCK_HUNT_OUT=$t/short LUCK_HUNT_DEADLINE_EPOCH=$((t0 + 15)) LUCK_HUNT_JOBS=1 LUCK_HUNT_DESIGNS="$t/designs/*.json" "$here/luckHunt.sh" >"$t/short.console" 2>&1; rc=$?
d=$(( $(date +%s) - t0 ))
[ $rc = 0 ] && [ $d -le 240 ] || { echo "FAIL: short deadline: rc=$rc after ${d}s"; fail=1; }
n=$(wc -l < "$t/short/seeds.jsonl")
[ "$n" -ge 1 ] && [ "$n" -le 2 ] || { echo "FAIL: short deadline: $n seeds"; fail=1; }
check "$t/short" "$n" "short deadline summary"
[ $fail = 0 ] && echo "luckHunt deadline test: ok (past: instant, short: ${d}s, $n seed(s))"
exit $fail
