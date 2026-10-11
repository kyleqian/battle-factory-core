#!/bin/sh
# stat101 runner (docs/stat101-stats-change-design.md). Run from workspace/; direct mGBA only (never the shared HTTP oracles); production is
# read only in a git-archive copy of the fixed base a36a956ac inside the FRESH <out-dir> (refused if non-empty; must be inside the repo so the
# copy finds ../oracle). Nothing outside <out-dir> is written or removed.
#   sh tools/integration/stat101Run.sh <fresh-out-dir> [--census]
# 1. archive copy <out>/base (a36a956ac) + the stat101 tools and fixtures from this checkout;
# 2. re-stage the 11 scenarios (== the committed ones and scenario-index.json);
# 3. probes: 11 scenarios x {ON, OFF} x {r1, r2} (stat101Job.sh, 8 parallel; a crashed job reruns once), r1 == r2 byte for byte and
#    == receipts/probe-sha256.txt; stat101Receipts.py == receipts/ (stat-anim.json + rows/*.tsv);
# 3b. prototype: r1 jobs also dump the window frames (STAT101_DUMP, inside <out-dir>), stat101NpzToRaw.py + stat101ProtoCompare.ts (production
#    banner helpers over the ROM's own pre-banner row) == proto-compare.json;
# 4. --census: stat101Exposure.ts seeds 0..999 (ten shards, base copy), stat101ExposureSummary.py == exposure.json.
set -eu
OUT=${1:?usage: stat101Run.sh <fresh-out-dir> [--census]}
CENSUS=${2:-}
W=$(pwd)
[ -f "$W/tools/integration/stat101Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
F=tools/integration/fixtures/stat101
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
fail=0
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }

# 1. archive copy
mkdir -p "$OUT/base"
git -C .. archive a36a956ac workspace | tar -x -C "$OUT/base"
B="$OUT/base/workspace"
ln -s "$W/node_modules" "$B/node_modules"
ln -s "$W/reference" "$B/reference"
cp tools/integration/stat101* "$B/tools/integration/"
mkdir -p "$B/$F" && cp -R "$F/." "$B/$F/"

# 2. staging
python3 tools/integration/stat101Stage.py "$OUT/stage/scenarios" > /dev/null
diff -r "$F/scenarios" "$OUT/stage/scenarios" > /dev/null && echo "SAME scenarios ($(ls "$F/scenarios" | wc -l | tr -d ' '))" || { echo "DIFF scenarios"; fail=1; }
check "$F/scenario-index.json" "$OUT/stage/scenario-index.json" scenario-index

# 3. probes + receipts
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2"
export STAT101_PY="$PY"
mkdir -p "$OUT/dump"
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

# 3b. prototype comparison
python3 "$B/tools/integration/stat101NpzToRaw.py" "$OUT/dump" "$F/receipts/stat-anim.json" "$OUT/raw" > /dev/null
(cd "$B" && node --experimental-strip-types --no-warnings tools/integration/stat101ProtoCompare.ts "$OUT/raw" "$OUT/proto-compare.json" > /dev/null)
check "$F/proto-compare.json" "$OUT/proto-compare.json" proto-compare.json

# 4. census exposure
if [ "$CENSUS" = "--census" ]; then
  mkdir -p "$OUT/exposure"
  cat > "$OUT/shard.sh" <<'SHARD'
#!/bin/sh
# shard.sh <outdir> <k>: census seeds 100k..100k+99 (run from the base copy's workspace/)
node --experimental-strip-types --no-warnings tools/integration/stat101Exposure.ts --seeds=$(($2 * 100))..$(($2 * 100 + 99)) --out="$1/shard-$2.jsonl" > /dev/null
SHARD
  (cd "$B" && for k in 0 1 2 3 4 5 6 7 8 9; do echo "$OUT/exposure $k"; done | xargs -n 2 -P 10 sh "$OUT/shard.sh")
  python3 "$B/tools/integration/stat101ExposureSummary.py" "$OUT/exposure" "$OUT/exposure.json" > /dev/null
  check "$F/exposure.json" "$OUT/exposure.json" exposure.json
fi
[ "$fail" -eq 0 ] && echo "ALL SAME" || { echo "SOME DIFF"; exit 1; }
