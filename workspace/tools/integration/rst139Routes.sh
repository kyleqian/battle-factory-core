#!/bin/sh
# rst139Routes.sh <tree-workspace> <fresh-out-dir> [seeds]   (rst139RouteRender.ts of THIS checkout copied into the tree; one process per
# seed, all in parallel; default seeds = the 9 census battles 0..999 with an ONIX opponent, tools/integration/fixtures/rst139/exposure.json)
set -eu
TREE=$1; OUT=$2; SEEDS=${3:-27 134 196 205 312 428 731 780 851}
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
[ "$(cd "$TREE" && pwd)" = "$(pwd)" ] || cp tools/integration/rst139RouteRender.ts tools/integration/rst139Exposure.ts "$TREE/tools/integration/"
for s in $SEEDS; do
  (cd "$TREE" && node --max-old-space-size=4096 --experimental-strip-types --no-warnings tools/integration/rst139RouteRender.ts \
    --seeds=$s --out="$OUT/r$s.jsonl" > "$OUT/r$s.log" 2>&1) &
done
wait
cat "$OUT"/r*.log
