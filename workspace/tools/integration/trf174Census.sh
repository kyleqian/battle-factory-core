#!/bin/sh
# trf174 census (docs/trf174-transform-live.md): sub157Census.sh's shards (liveShareCensus.ts seeds 0..999, 10 --index-from shards on
# a git-archive copy of <tree-ish>, merged with hist73Merge.py) for several (tree-ish, scene) arms through ONE job pool capped at
# TRF174_CENSUS_JOBS (default 4; the 16 GiB host cannot take sub157Census.sh's 10 concurrent shards per arm).
#   sh tools/integration/trf174Census.sh <fresh-root> <tree-ish>:<on|off>...    # arm dirs <root>/<scene>-<short sha>/
# Compare two arms with `sh tools/integration/ret88Census.sh compare <base-arm> <head-arm> <out>`.
set -eu
T=tools/integration
ROOT=$1; shift
[ ! -e "$ROOT" ] || { echo "$ROOT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$ROOT"; ROOT=$(cd "$ROOT" && pwd); WS=$PWD
: > "$ROOT/jobs"
for arm in "$@"; do
  REV=${arm%:*}; SCENE=${arm##*:}; OUT="$ROOT/$SCENE-$(git rev-parse --short "$REV")"
  mkdir -p "$OUT/tree"
  git -C "$(git rev-parse --show-toplevel)" archive --format=tar "$REV" workspace/src workspace/tests workspace/tools workspace/package.json \
    workspace/tsconfig.json workspace/vite.config.ts | tar -x -C "$OUT/tree" --strip-components=1
  cp "$WS/$T/liveShareCensus.ts" "$OUT/tree/$T/liveShareCensus.ts"
  ln -s "$WS/node_modules" "$OUT/tree/node_modules"
  git rev-parse "$REV" > "$OUT/commit"; git rev-parse "$REV:workspace/src" > "$OUT/src"; echo "$SCENE" > "$OUT/scene"
  for i in 0 1 2 3 4 5 6 7 8 9; do echo "$OUT $i $SCENE" >> "$ROOT/jobs"; done
done
xargs -P "${TRF174_CENSUS_JOBS:-4}" -L 1 sh -c 'a=$(($1 * 100)); b=$((a + 99)); cd "$0/tree" && node --max-old-space-size=4096 \
  --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=$a..$b --index-from=$a --scene="$2" \
  --out="$0/r$1.json" --commands="$0/r$1.jsonl" > "$0/r$1.log" 2>&1 || echo "FAIL $0 r$1"' < "$ROOT/jobs"
for arm in "$@"; do
  REV=${arm%:*}; SCENE=${arm##*:}; OUT="$ROOT/$SCENE-$(git rev-parse --short "$REV")"
  python3 $T/hist73Merge.py "$OUT" "$OUT/merged.json" "$OUT/merged.jsonl" | tail -1
  rm "$OUT/tree/node_modules"; rm -rf "$OUT/tree"
done
echo done > "$ROOT/DONE"
