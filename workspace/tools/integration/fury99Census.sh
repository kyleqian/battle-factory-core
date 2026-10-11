#!/bin/sh
# fury99: census seeds 0..999 in git-archive copies of <base-rev> (46d64a860) and <final-rev> (the fury99 final src), 10 shards each
# (--seeds=100k..100k+99 --index-from=100k), merged with hist73Merge.py, delta with prep43CensusDelta.py, summary with fury99CensusCheck.py.
#   sh tools/integration/fury99Census.sh <fresh-out-dir-inside-the-repo> [base-rev] [final-rev]
set -e
OUT=${1:?usage: fury99Census.sh <fresh-out-dir> [base-rev] [final-rev]}; BASE=${2:-46d64a860}; FINAL=${3:-HEAD}
W=$(pwd)
[ -f "$W/tools/integration/fury99Census.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"; [ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
for t in base final; do
  if [ "$t" = base ]; then REV=$BASE; else REV=$FINAL; fi
  mkdir -p "$OUT/$t" "$OUT/census-$t"
  git -C .. archive "$REV" workspace | tar -x -C "$OUT/$t"
  ln -s "$W/node_modules" "$OUT/$t/workspace/node_modules"; ln -s "$W/reference" "$OUT/$t/workspace/reference"
  echo "$t = $REV src $(git rev-parse "$REV:workspace/src")" >> "$OUT/revs.txt"
done
for t in base final; do for k in 0 1 2 3 4 5 6 7 8 9; do echo "$t $k"; done; done | xargs -n 2 -P "${FURY99_CENSUS_JOBS:-10}" sh -c '
  cd '"$OUT"'/$0/workspace && node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=$(($1 * 100))..$(($1 * 100 + 99)) \
    --index-from=$(($1 * 100)) --out='"$OUT"'/census-$0/r$1.json --commands='"$OUT"'/census-$0/r$1.jsonl > '"$OUT"'/census-$0/r$1.log 2>&1 || echo FAILED $0 $1'
for t in base final; do python3 tools/integration/hist73Merge.py "$OUT/census-$t" "$OUT/census-$t.json" "$OUT/census-$t.jsonl" | tail -1; done
python3 tools/integration/prep43CensusDelta.py "$OUT/census-base.json" "$OUT/census-base.jsonl" "$OUT/census-final.json" "$OUT/census-final.jsonl" \
  "$OUT/census-delta.json" | tail -5
rm -rf "$OUT/base" "$OUT/final"
echo "fury99Census done: $OUT"
