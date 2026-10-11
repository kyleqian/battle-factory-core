#!/bin/sh
# stg107 census (docs/stg107-struggle.md s3): liveShareCensus.ts seeds 0..999 as 10 --index-from shards (shard k = seeds 100k..100k+99),
# merged with hist73Merge.py, in an EXISTING tree (stg107Patched.sh's patched copy); the base arm is ret88Census.sh shards <dir> 52c181d54.
#   sh tools/integration/stg107Census.sh <fresh-dir> <tree-dir>
#   sh tools/integration/ret88Census.sh compare <base-dir> <patched-dir> <out-dir>   (KEY sequence + battleDigestExcludingFrames + flips)
set -eu
OUT=$1; TREE=$2; T=tools/integration
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd); TREE=$(cd "$TREE" && pwd)
for i in 0 1 2 3 4 5 6 7 8 9; do a=$((i * 100)); b=$((a + 99))
  (cd "$TREE" && node --max-old-space-size=4096 --experimental-strip-types --no-warnings $T/liveShareCensus.ts --seeds=$a..$b \
    --index-from=$a --out="$OUT/r$i.json" --commands="$OUT/r$i.jsonl" > "$OUT/r$i.log" 2>&1) &
done
wait
python3 $T/hist73Merge.py "$OUT" "$OUT/merged.json" "$OUT/merged.jsonl" | tail -1
