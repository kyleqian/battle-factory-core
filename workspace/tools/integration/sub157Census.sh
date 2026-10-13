#!/bin/sh
# sub157 (docs/sub157-scene-off-substitute.md): ret88Census.sh's shards for either scene. liveShareCensus.ts seeds 0..999 on a
# git-archive copy of <tree-ish> with the WORKING TREE's liveShareCensus.ts overlaid (its --scene flag; the census logic is otherwise
# the tree's), 10 --index-from shards merged with hist73Merge.py. Compare two runs with `ret88Census.sh compare`.
#   sh tools/integration/sub157Census.sh <fresh-dir> <tree-ish> on|off
set -eu
T=tools/integration
OUT=$1; REV=$2; SCENE=$3
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT/tree"; OUT=$(cd "$OUT" && pwd); WS=$PWD
git -C "$(git rev-parse --show-toplevel)" archive --format=tar "$REV" workspace/src workspace/tests workspace/tools workspace/package.json \
  workspace/tsconfig.json workspace/vite.config.ts | tar -x -C "$OUT/tree" --strip-components=1
cp "$WS/$T/liveShareCensus.ts" "$OUT/tree/$T/liveShareCensus.ts"
ln -s "$WS/node_modules" "$OUT/tree/node_modules"
git rev-parse "$REV" > "$OUT/commit"; git rev-parse "$REV:workspace/src" > "$OUT/src"; echo "$SCENE" > "$OUT/scene"
for i in 0 1 2 3 4 5 6 7 8 9; do a=$((i * 100)); b=$((a + 99))
  (cd "$OUT/tree" && node --max-old-space-size=4096 --experimental-strip-types --no-warnings $T/liveShareCensus.ts --seeds=$a..$b \
    --index-from=$a --scene="$SCENE" --out="$OUT/r$i.json" --commands="$OUT/r$i.jsonl" > "$OUT/r$i.log" 2>&1) &
done
wait
python3 $T/hist73Merge.py "$OUT" "$OUT/merged.json" "$OUT/merged.jsonl" | tail -1
rm "$OUT/tree/node_modules"; rm -rf "$OUT/tree"
