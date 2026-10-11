#!/bin/sh
# flat84: census seeds 0..999 in <base-copy> and <patched-copy> (git-archive copies of b05d384ca; patched = + flat84-temp-src.diff), 10
# shards each (--seeds=100k..100k+99 --index-from=100k, out r{k}.json / --commands=r{k}.jsonl), merged with hist73Merge.py, delta with
# prep43CensusDelta.py, identity / Flatter / 260-stop summary with flat84CensusCheck.py.
#   sh tools/integration/flat84Census.sh <base-copy> <patched-copy> <fresh-out-dir>
set -e
B=$(cd "${1:?base}" && pwd); P=$(cd "${2:?patched}" && pwd); OUT=${3:?out}; mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd); HERE=$(pwd)
for d in base patched; do mkdir -p "$OUT/$d"; done
for d in base patched; do for k in 0 1 2 3 4 5 6 7 8 9; do echo "$d $k"; done; done | xargs -n 2 -P "${FLAT84_CENSUS_JOBS:-8}" sh -c '
  if [ "$0" = base ]; then C='"$B"'; else C='"$P"'; fi
  cd "$C" && node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=$(($1 * 100))..$(($1 * 100 + 99)) \
    --index-from=$(($1 * 100)) --out='"$OUT"'/$0/r$1.json --commands='"$OUT"'/$0/r$1.jsonl > '"$OUT"'/$0/r$1.log 2>&1 || echo FAILED $0 $1'
for d in base patched; do python3 tools/integration/hist73Merge.py "$OUT/$d" "$OUT/census-$d.json" "$OUT/census-$d.jsonl" > /dev/null; done
python3 tools/integration/prep43CensusDelta.py "$OUT/census-base.json" "$OUT/census-base.jsonl" "$OUT/census-patched.json" "$OUT/census-patched.jsonl" \
  "$OUT/census-delta.json" > /dev/null
python3 tools/integration/flat84CensusCheck.py "$OUT" > "$OUT/census-check.txt"
echo "flat84Census done: $OUT"
