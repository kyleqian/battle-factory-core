#!/bin/sh
# pfr192 census: pfr192Census.ts (fpc180Census.ts + per-replacement send-in records) over seeds 0..999 in 100-seed shards on a git-archive copy of each
# <tree-ish>, several (tree-ish, scene) arms through ONE job pool capped at PFR192_CENSUS_JOBS (default 4; the task caps it at 6). Resumable: shards whose
# r<i>.jsonl is complete are skipped on re-invoke with the same root; PFR192_SHARDS="0 1" restricts the shards.
#   sh tools/integration/pfr192Census.sh <fresh-root> <tree-ish>:<on|off>...    # arm dirs <root>/<scene>-<short sha>/r<i>.jsonl
# Compare: python3 tools/integration/pfr192CensusDelta.py <base-arm> <final-arm> [out.json]
set -eu
T=tools/integration
ROOT=$1; shift
# PFR192_SHARDS="0 1 2" runs only those 100-seed shards (default all ten); re-invoke with the same root to resume (PFR192_FINAL=1 on the last call removes the trees).
SHARDS=${PFR192_SHARDS:-0 1 2 3 4 5 6 7 8 9}
mkdir -p "$ROOT"; ROOT=$(cd "$ROOT" && pwd); WS=$PWD
: > "$ROOT/jobs"
for arm in "$@"; do
  REV=${arm%:*}; SCENE=${arm##*:}; OUT="$ROOT/$SCENE-$(git rev-parse --short "$REV")"
  if [ ! -d "$OUT/tree" ]; then
    mkdir -p "$OUT/tree"
    git -C "$(git rev-parse --show-toplevel)" archive --format=tar "$REV" workspace/src workspace/tools workspace/package.json \
      workspace/tsconfig.json | tar -x -C "$OUT/tree" --strip-components=1
    cp "$WS/$T/pfr192Census.ts" "$OUT/tree/$T/pfr192Census.ts"
    ln -s "$WS/node_modules" "$OUT/tree/node_modules"
    git rev-parse "$REV" > "$OUT/commit"; git rev-parse "$REV:workspace/src" > "$OUT/src"; echo "$SCENE" > "$OUT/scene"
  fi
  for i in $SHARDS; do [ -s "$OUT/r$i.jsonl" ] || echo "$OUT $i $SCENE" >> "$ROOT/jobs"; done
done
xargs -P "${PFR192_CENSUS_JOBS:-4}" -L 1 sh -c 'a=$(($1 * 100)); b=$((a + 99)); cd "$0/tree" && node --max-old-space-size=4096 \
  --experimental-strip-types --no-warnings tools/integration/pfr192Census.ts --seeds=$a..$b --scene="$2" \
  --out="$0/r$1.jsonl" > "$0/r$1.log" 2>&1 || echo "FAIL $0 r$1"' < "$ROOT/jobs"
if [ "${PFR192_FINAL:-0}" = 1 ]; then
  for arm in "$@"; do
    REV=${arm%:*}; SCENE=${arm##*:}; OUT="$ROOT/$SCENE-$(git rev-parse --short "$REV")"
    rm "$OUT/tree/node_modules"; rm -rf "$OUT/tree"
  done
  echo done > "$ROOT/DONE"
fi
