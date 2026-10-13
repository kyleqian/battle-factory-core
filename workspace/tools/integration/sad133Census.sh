#!/bin/sh
# sad133 census (docs/sad133-status-animation-render-2.md): sar131Census.sh from a workspace DIRECTORY instead of a git rev (so the
# runner works from a fresh git-archive copy whose own git history is empty): sa125LiveShareCensus.ts (Scene ON, this checkout's
# file in both trees) seeds 0..999 on a copy of <tree-dir> (src, tests, tools, package.json, tsconfig.json, vite.config.ts;
# node_modules symlinked), ten --index-from shards in parallel; then sar131CensusDelta.py.
#   sh tools/integration/sad133Census.sh <tree-dir> <fresh-dir>     # <dir>/r0..r9.{json,jsonl,log}, s0..s9.jsonl, src (tree's src digest)
set -eu
TREE=$1; OUT=$2
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT/tree"; OUT=$(cd "$OUT" && pwd); WS=$PWD
(cd "$TREE" && tar -cf - src tests tools package.json tsconfig.json vite.config.ts) | tar -x -C "$OUT/tree"
cp "$WS/tools/integration/sa125LiveShareCensus.ts" "$OUT/tree/tools/integration/"
ln -s "$WS/node_modules" "$OUT/tree/node_modules"
(cd "$OUT/tree" && find src -type f | LC_ALL=C sort | xargs shasum -a 256 | shasum -a 256 | cut -c1-16) > "$OUT/src"
for i in 0 1 2 3 4 5 6 7 8 9; do a=$((i * 100)); b=$((a + 99))
  (cd "$OUT/tree" && node --max-old-space-size=4096 --experimental-strip-types --no-warnings tools/integration/sa125LiveShareCensus.ts \
    --seeds=$a..$b --index-from=$a --out="$OUT/r$i.json" --commands="$OUT/r$i.jsonl" --stats="$OUT/s$i.jsonl" > "$OUT/r$i.log" 2>&1) &
done
wait
rm "$OUT/tree/node_modules"; rm -rf "$OUT/tree"
echo done > "$OUT/done"
