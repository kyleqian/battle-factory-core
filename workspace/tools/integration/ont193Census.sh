#!/bin/sh
# ont193 census (docs/ont193-scene-on-tails.md; recipe of sub183Census.sh): ont193Census.ts over seeds 0..999 in 100-seed shards on a git-archive copy of each <tree-ish>, several (tree-ish, scene) arms through one job pool capped at
# ONT193_CENSUS_JOBS (default 4; the task caps it at 6). The same ont193Census.ts is copied into every tree.
#   sh tools/integration/ont193Census.sh <fresh-root> <tree-ish>:<on|off>...    # arm dirs <root>/<scene>-<short sha>/r<i>.jsonl
# Compare two arms with `python3 tools/integration/ont193CensusDelta.py <base-arm> <final-arm> [out.json]`.
set -eu
T=tools/integration
ROOT=$1; shift
# ONT193_SHARDS="0 1 2" runs only those 100-seed shards (default all ten); re-invoke with the same root to resume (ONT193_FINAL=1 on the last call removes the trees).
SHARDS=${ONT193_SHARDS:-0 1 2 3 4 5 6 7 8 9}
mkdir -p "$ROOT"; ROOT=$(cd "$ROOT" && pwd); WS=$PWD
: > "$ROOT/jobs"
for arm in "$@"; do
  REV=${arm%:*}; SCENE=${arm##*:}; OUT="$ROOT/$SCENE-$(git rev-parse --short "$REV")"
  if [ ! -d "$OUT/tree" ]; then
    mkdir -p "$OUT/tree"
    git -C "$(git rev-parse --show-toplevel)" archive --format=tar "$REV" workspace/src workspace/tools workspace/package.json \
      workspace/tsconfig.json | tar -x -C "$OUT/tree" --strip-components=1
    cp "$WS/$T/ont193Census.ts" "$OUT/tree/$T/ont193Census.ts"
    ln -s "$WS/node_modules" "$OUT/tree/node_modules"
    git rev-parse "$REV" > "$OUT/commit"; git rev-parse "$REV:workspace/src" > "$OUT/src"; echo "$SCENE" > "$OUT/scene"
  fi
  for i in $SHARDS; do
    [ -s "$OUT/r$i.jsonl" ] && continue
    # ONT193_SPLIT=4 cuts a shard into 25-seed parts r<i>.p<j>.jsonl (each resumable inside one tool call), concatenated into r<i>.jsonl when complete.
    for j in $(seq 0 $((${ONT193_SPLIT:-1} - 1))); do [ -s "$OUT/r$i.p$j.jsonl" ] || echo "$OUT $i $SCENE $j" >> "$ROOT/jobs"; done
  done
done
SPLIT=${ONT193_SPLIT:-1}
export SPLIT
xargs -P "${ONT193_CENSUS_JOBS:-4}" -L 1 sh -c 'w=$((100 / SPLIT)); a=$(($1 * 100 + $3 * w)); b=$((a + w - 1)); cd "$0/tree" && node --max-old-space-size=4096 \
  --experimental-strip-types --no-warnings tools/integration/ont193Census.ts --seeds=$a..$b --scene="$2" \
  --out="$0/r$1.p$3.jsonl" > "$0/r$1.p$3.log" 2>&1 || echo "FAIL $0 r$1 p$3"' < "$ROOT/jobs"
for arm in "$@"; do
  REV=${arm%:*}; SCENE=${arm##*:}; OUT="$ROOT/$SCENE-$(git rev-parse --short "$REV")"
  for i in $SHARDS; do
    [ -s "$OUT/r$i.jsonl" ] && continue
    ok=1; for j in $(seq 0 $((SPLIT - 1))); do [ -s "$OUT/r$i.p$j.jsonl" ] || ok=0; done
    [ $ok = 1 ] && for j in $(seq 0 $((SPLIT - 1))); do cat "$OUT/r$i.p$j.jsonl"; done > "$OUT/r$i.jsonl"
  done
done
if [ "${ONT193_FINAL:-0}" = 1 ]; then
  for arm in "$@"; do
    REV=${arm%:*}; SCENE=${arm##*:}; OUT="$ROOT/$SCENE-$(git rev-parse --short "$REV")"
    rm "$OUT/tree/node_modules"; rm -rf "$OUT/tree"
  done
  echo done > "$ROOT/DONE"
fi
