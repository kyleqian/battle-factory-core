#!/bin/sh
# ice72 live-share census, seeds 0..999 in three parallel ranges (battle ids restart at 0 per range), base vs final, plus the base order
# census and the chain predictor (prep45Chains.py --cleared "body 301 ICE_BALL"). Trees are git archive copies under the out dir.
# usage (from workspace/): sh tools/integration/ice72Census.sh <fresh-out-dir> [<base commit, default a7904fcc0>] [<final commit, default HEAD>]
set -e
OUT=${1:?usage: ice72Census.sh <fresh-out-dir> [base] [final]}; BASE=${2:-ff4baec48}; FINAL=${3:-HEAD}
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd); WS=$PWD
NODE="node --max-old-space-size=4096 --experimental-strip-types --no-warnings"
tree() {
  mkdir -p "$OUT/$1"
  git -C "$(git rev-parse --show-toplevel)" archive --format=tar "$2" workspace/src workspace/tests workspace/tools workspace/package.json \
    workspace/tsconfig.json workspace/vite.config.ts | tar -x -C "$OUT/$1" --strip-components=1
  ln -s "$WS/node_modules" "$OUT/$1/node_modules"
}
tree base "$BASE"; tree final "$FINAL"
echo "base $(git rev-parse "$BASE") src $(git rev-parse "$BASE:workspace/src"); final $(git rev-parse "$FINAL") src $(git rev-parse "$FINAL:workspace/src")" | tee "$OUT/trees.txt"
for r in 0..299 300..649 650..999; do
  t=$(echo $r | tr . -  | sed 's/--/-/')
  (cd "$OUT/base" && $NODE tools/integration/liveShareCensus.ts --seeds=$r --out="$OUT/before-$t.json" --commands="$OUT/before-$t.jsonl" > "$OUT/before-$t.log" 2>&1) &
  (cd "$OUT/final" && $NODE tools/integration/liveShareCensus.ts --seeds=$r --out="$OUT/after-$t.json" --commands="$OUT/after-$t.jsonl" > "$OUT/after-$t.log" 2>&1) &
  (cd "$OUT/base" && $NODE tools/integration/prep61OrderCensus.ts --seeds=$r --out="$OUT/order-$t.json" --commands="$OUT/order-$t.jsonl" > "$OUT/order-$t.log" 2>&1) &
done
wait
for t in 0-299 300-649 650-999; do
  python3 tools/integration/prep43CensusDelta.py "$OUT/before-$t.json" "$OUT/before-$t.jsonl" "$OUT/after-$t.json" "$OUT/after-$t.jsonl" "$OUT/delta-$t.json" | head -3
done
python3 - "$OUT" <<'PY'
import json, sys
out = sys.argv[1]
key = lambda p: [tuple(json.loads(l).get(k) for k in ("battle", "kind", "moveId", "side", "attacker", "target")) for l in open(p)]
for t in ("0-299", "300-649", "650-999"):
    b, a = json.load(open(f"{out}/before-{t}.json")), json.load(open(f"{out}/after-{t}.json"))
    print(f"  {t}: battle digest identical {b['battleDigest'] == a['battleDigest']}, command keys identical",
          key(f"{out}/before-{t}.jsonl") == key(f"{out}/after-{t}.jsonl"), ", render throws", a["sanity"]["renderThrowCount"])
for arm in ("order", "after", "before"):
    with open(f"{out}/{arm}-0-999.jsonl", "w") as w:
        for t, start in (("0-299", 0), ("300-649", 300), ("650-999", 650)):
            for l in open(f"{out}/{arm}-{t}.jsonl"):
                d = json.loads(l); d["battle"] += start; w.write(json.dumps(d, separators=(",", ":")) + "\n")
PY
C="python3 tools/integration/prep45Chains.py"
$C "$OUT/order-0-999.jsonl" "$OUT/chains-iceball-0-999.json" --cleared "body 301 ICE_BALL" --after "$OUT/after-0-999.jsonl" | tail -3
$C "$OUT/order-0-999.jsonl" "$OUT/chains-iceball-mudslap-0-999.json" --cleared "body 301 ICE_BALL|body 189 MUD_SLAP" --after "$OUT/after-0-999.jsonl" | tail -3
for t in 0-299 300-649 650-999 0-999; do shasum -a 256 "$OUT"/*-$t.jsonl | sed "s|$OUT/||"; done > "$OUT/jsonl-sha256.txt"
