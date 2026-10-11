#!/bin/sh
# stat102 runner (docs/stat102-stats-change-reducer.md, ISSUES #166 slice b). Run from workspace/; direct mGBA only (never the shared HTTP
# oracles); production is read only in a git-archive copy of 927ecad33 (production src 72e4e0ab + the unwired slice (a) reducer
# src/animation/statsChange.ts) inside the FRESH <out-dir> (refused if non-empty; must be inside the repo). Nothing outside <out-dir> is
# written or removed.
#   sh tools/integration/stat102Run.sh <fresh-out-dir>
# 1. archive copy <out>/base (927ecad33) + the stat101 / stat102 tools and fixtures from this checkout;
# 2. re-stage the 11 stat101 scenarios (== committed);
# 3. probes: 11 scenarios x {ON, OFF} x {r1, r2} (stat101Job.sh, 8 parallel, r1 dumps the window frames into <out-dir>), r1 == r2 and
#    == stat101 receipts/probe-sha256.txt; stat101Receipts.py == stat101 receipts/ (stat-anim.json + 20 row TSVs);
# 4. stat101ProtoCompare.ts (ROM rect, receipt EVA / BG1) on this base == stat101 proto-compare.json (regression);
# 5. stat102ReducerCompare.ts (reducer rows, production corner, shadow rule) == fixtures/stat102/proto-compare.json and 20 / 20 windows 0 px.
set -eu
OUT=${1:?usage: stat102Run.sh <fresh-out-dir>}
BASE=927ecad33
W=$(pwd)
[ -f "$W/tools/integration/stat102Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
F=tools/integration/fixtures/stat101
G=tools/integration/fixtures/stat102
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
fail=0
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }

# 1. archive copy
mkdir -p "$OUT/base"
git -C .. archive "$BASE" workspace | tar -x -C "$OUT/base"
B="$OUT/base/workspace"
ln -s "$W/node_modules" "$B/node_modules"
ln -s "$W/reference" "$B/reference"
cp tools/integration/stat101* tools/integration/stat102* "$B/tools/integration/"
mkdir -p "$B/$F" "$B/$G" && cp -R "$F/." "$B/$F/"
if [ -d "$G" ]; then cp -R "$G/." "$B/$G/"; fi

# 2. staging
python3 tools/integration/stat101Stage.py "$OUT/stage/scenarios" > /dev/null
diff -r "$F/scenarios" "$OUT/stage/scenarios" > /dev/null && echo "SAME scenarios ($(ls "$F/scenarios" | wc -l | tr -d ' '))" || { echo "DIFF scenarios"; fail=1; }

# 3. probes + receipts
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2" "$OUT/dump"
export STAT101_PY="$PY"
(cd "$B" && for m in on off; do for f in "$F"/scenarios/*.json; do echo "$OUT/probes/r1 $m $f"; done; done \
  | STAT101_DUMP="$OUT/dump" xargs -n 3 -P 8 sh tools/integration/stat101Job.sh)
(cd "$B" && for m in on off; do for f in "$F"/scenarios/*.json; do echo "$OUT/probes/r2 $m $f"; done; done \
  | xargs -n 3 -P 8 sh tools/integration/stat101Job.sh)
n=0; t=0
for f in "$OUT"/probes/r1/*.json; do t=$((t + 1)); cmp -s "$f" "$OUT/probes/r2/$(basename "$f")" && n=$((n + 1)); done
echo "probes r1 == r2: $n / $t"; [ "$n" -eq "$t" ] && [ "$t" -eq 22 ] || fail=1
(cd "$OUT/probes/r1" && shasum -a 256 *.json) > "$OUT/probe-sha256.txt"
check "$F/receipts/probe-sha256.txt" "$OUT/probe-sha256.txt" probe-sha256
python3 "$B/tools/integration/stat101Receipts.py" "$OUT/probes/r1" "$OUT/probes/r2" "$F/scenario-index.json" "$OUT/receipts" > /dev/null
check "$F/receipts/stat-anim.json" "$OUT/receipts/stat-anim.json" stat-anim.json
diff -r "$F/receipts/rows" "$OUT/receipts/rows" > /dev/null && echo "SAME rows ($(ls "$OUT/receipts/rows" | wc -l | tr -d ' ') TSVs)" || { echo "DIFF rows"; fail=1; }

# 4. + 5. comparators
python3 "$B/tools/integration/stat101NpzToRaw.py" "$OUT/dump" "$F/receipts/stat-anim.json" "$OUT/raw" > /dev/null
(cd "$B" && node --experimental-strip-types --no-warnings tools/integration/stat101ProtoCompare.ts "$OUT/raw" "$OUT/stat101-proto-compare.json" > /dev/null)
check "$F/proto-compare.json" "$OUT/stat101-proto-compare.json" "stat101 proto-compare.json (ROM rect, receipt rows)"
(cd "$B" && node --experimental-strip-types --no-warnings tools/integration/stat102ReducerCompare.ts "$OUT/raw" "$OUT/proto-compare.json" | tail -1)
grep -q '"zeroPxWindows": 20' "$OUT/proto-compare.json" && grep -q '"windows": 20' "$OUT/proto-compare.json" || { echo "FAIL reducer comparator not 20 / 20"; fail=1; }
if [ -f "$G/proto-compare.json" ]; then check "$G/proto-compare.json" "$OUT/proto-compare.json" "stat102 proto-compare.json (reducer)"; else echo "NEW stat102 proto-compare.json (not committed yet)"; fi
[ "$fail" -eq 0 ] && echo "ALL SAME" || { echo "SOME DIFF"; exit 1; }
