#!/bin/sh
# ret88 census (docs/ret88-return-weak.md): liveShareCensus.ts seeds 0..999 on a git-archive copy of <tree-ish> (workspace/src, tests,
# tools, package.json, tsconfig.json, vite.config.ts; node_modules symlinked; no tracked file is touched) as 10 --index-from shards
# (shard k = seeds 100k..100k+99, --index-from=100k), merged with hist73Merge.py.
#   sh tools/integration/ret88Census.sh shards <fresh-dir> <tree-ish>      # <dir>/tree, <dir>/r0..r9.{json,jsonl,log}, <dir>/merged.{json,jsonl}
#   sh tools/integration/ret88Census.sh compare <base-dir> <final-dir> <out-dir>
#     prep43CensusDelta.py (delta.json / delta.txt) + land82CensusCheck.py (check.json / check.txt: command KEY sequence +
#     battleDigestExcludingFrames) + hist73KeyCheck.py (keycheck.txt).
set -eu
T=tools/integration
case "$1" in
shards)
  OUT=$2; REV=$3
  [ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
  mkdir -p "$OUT/tree"; OUT=$(cd "$OUT" && pwd); WS=$PWD
  git -C "$(git rev-parse --show-toplevel)" archive --format=tar "$REV" workspace/src workspace/tests workspace/tools workspace/package.json \
    workspace/tsconfig.json workspace/vite.config.ts | tar -x -C "$OUT/tree" --strip-components=1
  ln -s "$WS/node_modules" "$OUT/tree/node_modules"
  git rev-parse "$REV" > "$OUT/commit"; git rev-parse "$REV:workspace/src" > "$OUT/src"
  for i in 0 1 2 3 4 5 6 7 8 9; do a=$((i * 100)); b=$((a + 99))
    (cd "$OUT/tree" && node --max-old-space-size=4096 --experimental-strip-types --no-warnings $T/liveShareCensus.ts --seeds=$a..$b \
      --index-from=$a --out="$OUT/r$i.json" --commands="$OUT/r$i.jsonl" > "$OUT/r$i.log" 2>&1) &
  done
  wait
  python3 $T/hist73Merge.py "$OUT" "$OUT/merged.json" "$OUT/merged.jsonl" | tail -1
  rm "$OUT/tree/node_modules"; rm -rf "$OUT/tree"
  ;;
compare)
  B=$2; A=$3; OUT=$4; mkdir -p "$OUT"
  python3 $T/prep43CensusDelta.py "$B/merged.json" "$B/merged.jsonl" "$A/merged.json" "$A/merged.jsonl" "$OUT/delta.json" > "$OUT/delta.txt"
  python3 $T/land82CensusCheck.py "$B" "$B/merged.json" "$B/merged.jsonl" "$A" "$A/merged.json" "$A/merged.jsonl" "$OUT/check.json" > "$OUT/check.txt"
  python3 $T/hist73KeyCheck.py "$B/merged.json" "$B/merged.jsonl" "$A/merged.json" "$A/merged.jsonl" > "$OUT/keycheck.txt" || true
  head -3 "$OUT/delta.txt"; cat "$OUT/check.txt"; tail -2 "$OUT/keycheck.txt"
  ;;
*) echo "usage: ret88Census.sh shards <fresh-dir> <tree-ish> | compare <base-dir> <final-dir> <out-dir>" >&2; exit 2 ;;
esac
