#!/bin/sh
# sar131 census (docs/sar131-status-animation-render.md): sa125LiveShareCensus.ts (Scene ON, the same tool file in both trees) seeds
# 0..999 on a git-archive copy of <tree-ish> (workspace/src, tests, tools, package.json, tsconfig.json, vite.config.ts; node_modules
# symlinked), ten --index-from shards in parallel (shard k = seeds 100k..100k+99, --index-from=100k); then sar131CensusDelta.py.
#   sh tools/integration/sar131Census.sh shards <fresh-dir> <tree-ish>     # <dir>/r0..r9.{json,jsonl,log}, s0..s9.jsonl
#   python3 tools/integration/sar131CensusDelta.py <base-dir> <final-dir> <out.json>
set -eu
OUT=$2; REV=$3
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT/tree"; OUT=$(cd "$OUT" && pwd); WS=$PWD
git -C "$(git rev-parse --show-toplevel)" archive --format=tar "$REV" workspace/src workspace/tests workspace/tools workspace/package.json \
  workspace/tsconfig.json workspace/vite.config.ts | tar -x -C "$OUT/tree" --strip-components=1
cp "$WS/tools/integration/sa125LiveShareCensus.ts" "$OUT/tree/tools/integration/"
ln -s "$WS/node_modules" "$OUT/tree/node_modules"
git rev-parse "$REV" > "$OUT/commit"; git rev-parse "$REV:workspace/src" > "$OUT/src"
for i in 0 1 2 3 4 5 6 7 8 9; do a=$((i * 100)); b=$((a + 99))
  (cd "$OUT/tree" && node --max-old-space-size=4096 --experimental-strip-types --no-warnings tools/integration/sa125LiveShareCensus.ts \
    --seeds=$a..$b --index-from=$a --out="$OUT/r$i.json" --commands="$OUT/r$i.jsonl" --stats="$OUT/s$i.jsonl" > "$OUT/r$i.log" 2>&1) &
done
wait
rm "$OUT/tree/node_modules"; rm -rf "$OUT/tree"
echo done > "$OUT/done"
