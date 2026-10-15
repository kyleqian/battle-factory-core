#!/bin/sh
# trn181 census (docs/trn181-action-transition-on.md): trn181Census.ts (per-command arrays) over seeds 0..999 in
# 100-seed shards on a git-archive copy of each <tree-ish>, for several (tree-ish, scene) arms through ONE job pool capped at
# TRN178_CENSUS_JOBS (default 4; trf174Census.sh's limit for the 16 GiB host). The same trn181Census.ts is copied into every tree.
#   sh tools/integration/trn181Census.sh <fresh-root> <tree-ish>:<on|off>...    # arm dirs <root>/<scene>-<short sha>/r<i>.jsonl
# Compare two arms with `python3 tools/integration/trn181CensusDelta.py <base-arm> <final-arm> [out.json]`.
set -eu
T=tools/integration
ROOT=$1; shift
[ ! -e "$ROOT" ] || { echo "$ROOT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$ROOT"; ROOT=$(cd "$ROOT" && pwd); WS=$PWD
: > "$ROOT/jobs"
for arm in "$@"; do
  REV=${arm%:*}; SCENE=${arm##*:}; OUT="$ROOT/$SCENE-$(git rev-parse --short "$REV")"
  mkdir -p "$OUT/tree"
  git -C "$(git rev-parse --show-toplevel)" archive --format=tar "$REV" workspace/src workspace/tools workspace/package.json \
    workspace/tsconfig.json | tar -x -C "$OUT/tree" --strip-components=1
  cp "$WS/$T/trn181Census.ts" "$OUT/tree/$T/trn181Census.ts"
  ln -s "$WS/node_modules" "$OUT/tree/node_modules"
  git rev-parse "$REV" > "$OUT/commit"; git rev-parse "$REV:workspace/src" > "$OUT/src"; echo "$SCENE" > "$OUT/scene"
  for i in 0 1 2 3 4 5 6 7 8 9; do echo "$OUT $i $SCENE" >> "$ROOT/jobs"; done
done
xargs -P "${TRN178_CENSUS_JOBS:-4}" -L 1 sh -c 'a=$(($1 * 100)); b=$((a + 99)); cd "$0/tree" && node --max-old-space-size=4096 \
  --experimental-strip-types --no-warnings tools/integration/trn181Census.ts --seeds=$a..$b --scene="$2" \
  --out="$0/r$1.jsonl" > "$0/r$1.log" 2>&1 || echo "FAIL $0 r$1"' < "$ROOT/jobs"
for arm in "$@"; do
  REV=${arm%:*}; SCENE=${arm##*:}; OUT="$ROOT/$SCENE-$(git rev-parse --short "$REV")"
  rm "$OUT/tree/node_modules"; rm -rf "$OUT/tree"
done
echo done > "$ROOT/DONE"
