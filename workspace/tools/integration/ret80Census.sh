#!/bin/sh
# ret80 acceptance census (docs/ret80-return-order.md): liveShareCensus.ts seeds 0..999, ONE process per arm -- base (default
# fffd6bd5d) vs final (default HEAD) -- each tree extracted with git archive into <out>/base and <out>/final (node_modules symlinked;
# no tracked file is touched), then prep43CensusDelta.py and the command KEY sequence (battle, kind, moveId, side, attacker, target) +
# battleDigestExcludingFrames comparison. usage (from workspace/): sh tools/integration/ret80Census.sh <fresh-out-dir> [base] [final]
set -eu
OUT=$1; BASE=${2:-b2ed6f8c2}; FINAL=${3:-HEAD}
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd); WS=$PWD
NODE="node --max-old-space-size=8192 --experimental-strip-types --no-warnings"
tree() {
  mkdir -p "$OUT/$1"
  git -C "$(git rev-parse --show-toplevel)" archive --format=tar "$2" workspace/src workspace/tests workspace/tools workspace/package.json \
    workspace/tsconfig.json workspace/vite.config.ts | tar -x -C "$OUT/$1" --strip-components=1
  ln -s "$WS/node_modules" "$OUT/$1/node_modules"
  git -C "$WS" rev-parse "$2:workspace/src" > "$OUT/$1.src"
}
tree base "$BASE"; tree final "$FINAL"
(cd "$OUT/base" && $NODE tools/integration/liveShareCensus.ts --seeds=0..999 --out="$OUT/before.json" --commands="$OUT/before.jsonl" > "$OUT/before.log" 2>&1) &
(cd "$OUT/final" && $NODE tools/integration/liveShareCensus.ts --seeds=0..999 --out="$OUT/after.json" --commands="$OUT/after.jsonl" > "$OUT/after.log" 2>&1) &
wait
python3 tools/integration/prep43CensusDelta.py "$OUT/before.json" "$OUT/before.jsonl" "$OUT/after.json" "$OUT/after.jsonl" "$OUT/delta.json" > "$OUT/delta.txt"
python3 - "$OUT" > "$OUT/compare.txt" <<'PY'
import json, sys
out = sys.argv[1]
key = lambda p: [tuple(json.loads(l).get(k) for k in ("battle", "kind", "moveId", "side", "attacker", "target")) for l in open(p)]
b, a = json.load(open(f"{out}/before.json")), json.load(open(f"{out}/after.json"))
print("command keys identical", key(f"{out}/before.jsonl") == key(f"{out}/after.jsonl"))
print("battleDigestExcludingFrames identical", b["battleDigestExcludingFrames"] == a["battleDigestExcludingFrames"])
print("battleDigest identical", b["battleDigest"] == a["battleDigest"])
print("render throws", b["sanity"]["renderThrowCount"], a["sanity"]["renderThrowCount"])
PY
for d in base final; do rm "$OUT/$d/node_modules"; done
cat "$OUT/compare.txt"; head -5 "$OUT/delta.txt"
