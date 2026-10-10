#!/bin/sh
# doll81: the census battle seed 881 / streak 38 (stalled at liveShareCensus.ts's FRAME_BUDGET 200000 in base AND patched) replayed with
# a 20,000,000-frame budget on both git-archive trees, with the per-battle records (seed, streak, end, turns, frames) exported. The census
# source is rewritten into tools/integration/doll81CensusBig.ts INSIDE each archive copy (scratch; the committed census is unchanged).
# Battle 0 of the run is seed 0 / streak 0, battle 1 is seed 881 / streak (1 * 38) % 49 = 38.
# usage: sh tools/integration/doll81Stall881.sh <dir containing base/ and patched/ archive copies (doll81Run.sh)>
set -e
D=${1:?usage: doll81Stall881.sh <doll81Run.sh out dir>}; D=$(cd "$D" && pwd)
for t in base patched; do
  sed -e 's/^const FRAME_BUDGET = 200000,/const FRAME_BUDGET = 20000000,/' \
      -e 's|^const out = arg("out");|writeFileSync(arg("records")!, JSON.stringify(battles) + "\\n"); const out = arg("out");|' \
      "$D/$t/tools/integration/liveShareCensus.ts" > "$D/$t/tools/integration/doll81CensusBig.ts"
  grep -q "FRAME_BUDGET = 20000000" "$D/$t/tools/integration/doll81CensusBig.ts"
  (cd "$D/$t" && node --max-old-space-size=4096 --experimental-strip-types --no-warnings tools/integration/doll81CensusBig.ts \
    --seeds=0..881 --seed-step=881 --streak-mul=38 --out="$D/stall881-$t.json" --commands="$D/stall881-$t.jsonl" \
    --records="$D/stall881-$t-records.json" > "$D/stall881-$t.log" 2>&1) &
done
wait
python3 - "$D" <<'PY' | tee "$D/stall881-check.txt"
import json, sys
d = sys.argv[1]
key = lambda p: [tuple(json.loads(l).get(k) for k in ("battle", "kind", "moveId", "side", "attacker", "target")) for l in open(p)]
b, a = key(f"{d}/stall881-base.jsonl"), key(f"{d}/stall881-patched.jsonl")
print("base commands", len(b), "patched commands", len(a), "| patched keys == base prefix", a == b[:len(a)], "| base tail", b[len(a):])
rec = {t: json.load(open(f"{d}/stall881-{t}-records.json")) for t in ("base", "patched")}
print("records (seed, streak, end, turns, frames):", {t: [(r["seed"], r["streak"], r["end"], r["turns"], r["frames"]) for r in rec[t]] for t in rec})
PY
cmp -s "$D/stall881-check.txt" tools/integration/fixtures/doll81/receipts/stall881-check.txt && echo "same stall881-check.txt" || echo "DIFF stall881-check.txt"
