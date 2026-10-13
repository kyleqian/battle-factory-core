#!/bin/sh
# rst139: rst139Exposure.ts over seeds 0..999 in ten parallel shards (run from workspace/ of the tree to measure).
#   sh tools/integration/rst139ExposureShards.sh <fresh-dir>      # <dir>/e0..e9.jsonl
set -eu
OUT=$1
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT"
for i in 0 1 2 3 4 5 6 7 8 9; do a=$((i * 100)); b=$((a + 99))
  node --max-old-space-size=4096 --experimental-strip-types --no-warnings tools/integration/rst139Exposure.ts \
    --seeds=$a..$b --out="$OUT/e$i.jsonl" > "$OUT/e$i.log" 2>&1 &
done
wait
cat "$OUT"/e?.log
