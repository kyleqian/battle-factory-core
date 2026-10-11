#!/bin/sh
# land87: live-share census seeds 0..999 as 10 --index-from shards, for one tree (the base git-archive copy or this checkout).
#   sh tools/integration/land87Census.sh <workdir> <out-dir>   (workdir = a workspace/ dir with node_modules)
set -e
W=${1:?workdir}; OUT=${2:?out-dir}; T=tools/integration; N="node --experimental-strip-types --no-warnings"
mkdir -p "$OUT"
for i in 0 1 2 3 4 5 6 7 8 9; do a=$((i * 100)); b=$((a + 99))
  (cd "$W" && $N $T/hist73LiveShareCensus.ts --seeds=$a..$b --index-from=$a --out="$OUT/r$i.json" --commands="$OUT/r$i.jsonl" > "$OUT/r$i.log" 2>&1) &
done
wait
python3 $T/hist73Merge.py "$OUT" "$OUT/merged.json" "$OUT/merged.jsonl" | tail -1
