#!/bin/sh
# fpc180 census (docs/fpc180-focus-punch-live.md; recipe of trn178Census.sh): fpc180Census.ts (trn178Census.ts + the pre-pass u field) over seeds 0..999 in
# 100-seed shards on a git-archive copy of each <tree-ish>, for several (tree-ish, scene) arms through ONE job pool capped at
# FPC180_CENSUS_JOBS (default 4; trf174Census.sh's limit for the 16 GiB host). The same fpc180Census.ts is copied into every tree.
#   sh tools/integration/fpc180Census.sh <fresh-root> <tree-ish>:<on|off>...    # arm dirs <root>/<scene>-<short sha>/r<i>.jsonl
# Compare two arms with `python3 tools/integration/fpc180CensusDelta.py <base-arm> <final-arm> [out.json]`.
set -eu
T=tools/integration
ROOT=$1; shift
# FPC180_SHARDS="0 1 2" runs only those 100-seed shards (default all ten); re-invoke with the same root to resume (FPC180_FINAL=1 on the last call removes the trees).
SHARDS=${FPC180_SHARDS:-0 1 2 3 4 5 6 7 8 9}
mkdir -p "$ROOT"; ROOT=$(cd "$ROOT" && pwd); WS=$PWD
: > "$ROOT/jobs"
for arm in "$@"; do
  REV=${arm%:*}; SCENE=${arm##*:}; OUT="$ROOT/$SCENE-$(git rev-parse --short "$REV")"
  if [ ! -d "$OUT/tree" ]; then
    mkdir -p "$OUT/tree"
    git -C "$(git rev-parse --show-toplevel)" archive --format=tar "$REV" workspace/src workspace/tools workspace/package.json \
      workspace/tsconfig.json | tar -x -C "$OUT/tree" --strip-components=1
    cp "$WS/$T/fpc180Census.ts" "$OUT/tree/$T/fpc180Census.ts"
    ln -s "$WS/node_modules" "$OUT/tree/node_modules"
    git rev-parse "$REV" > "$OUT/commit"; git rev-parse "$REV:workspace/src" > "$OUT/src"; echo "$SCENE" > "$OUT/scene"
  fi
  for i in $SHARDS; do echo "$OUT $i $SCENE" >> "$ROOT/jobs"; done
done
xargs -P "${FPC180_CENSUS_JOBS:-4}" -L 1 sh -c 'a=$(($1 * 100)); b=$((a + 99)); cd "$0/tree" && node --max-old-space-size=4096 \
  --experimental-strip-types --no-warnings tools/integration/fpc180Census.ts --seeds=$a..$b --scene="$2" \
  --out="$0/r$1.jsonl" > "$0/r$1.log" 2>&1 || echo "FAIL $0 r$1"' < "$ROOT/jobs"
if [ "${FPC180_FINAL:-0}" = 1 ]; then
  for arm in "$@"; do
    REV=${arm%:*}; SCENE=${arm##*:}; OUT="$ROOT/$SCENE-$(git rev-parse --short "$REV")"
    rm "$OUT/tree/node_modules"; rm -rf "$OUT/tree"
  done
  echo done > "$ROOT/DONE"
fi
