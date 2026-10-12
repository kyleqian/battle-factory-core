#!/bin/sh
# fix122 reproduction (docs/fix122-audit26-defects.md). Run from workspace/ with a FRESH <out-dir> INSIDE the repo (the probes find
# ../oracle from there); direct mGBA processes only (never the shared HTTP oracles), explicit lab seeds, every probe job twice in fresh
# processes (r1 == r2). Production = git-archive copies of the base d6444bd53 and of the final code 20ce9ee3f, inside <out-dir> only.
# Receipts land in <out-dir>/rec and are compared with tools/integration/fixtures/fix122/ (`same` / `DIFF`).
#   sh tools/integration/fix122Run.sh <fresh-out-dir>                 # DEFECT A Struggle windows + DEFECT B ROM rows / routes (~10 min)
#   FIX122_CENSUS=1 sh tools/integration/fix122Run.sh <fresh-out-dir> # + ret88 census 0..999 base vs final (Scene ON)
set -e
OUT=${1:?usage: fix122Run.sh <fresh-out-dir>}
[ ! -e "$OUT" ] || { echo "refusing: $OUT exists"; exit 1; }
mkdir -p "$OUT/rec"; OUT=$(cd "$OUT" && pwd)
T=tools/integration; F=$T/fixtures/fix122; REC=$OUT/rec; BASE=d6444bd53; FINAL=20ce9ee3f
same() { if cmp -s "$1" "$2"; then echo "same $(basename "$2")"; else echo "DIFF $(basename "$2")"; fi; }
# DEFECT A: aud118's Struggle scenarios -> probes -> aligned windows -> audit21Check.ts on the base and the final code (ROM probes reused)
python3 $T/aud118Stage.py "$OUT/sc" | tail -1
sh $T/fix122Patched.sh "$OUT/base" "$OUT/sc" $BASE > "$OUT/base.log"
python3 $T/aud118Summary.py "$OUT/base/check" > "$REC/struggle-base-d6444bd53.txt"
FIX122_REUSE="$OUT/base" sh $T/fix122Patched.sh "$OUT/final" "$OUT/sc" $FINAL > "$OUT/final.log"
python3 $T/aud118Summary.py "$OUT/final/check" > "$REC/struggle-final.txt"
for f in struggle-base-d6444bd53.txt struggle-final.txt; do same "$F/$f" "$REC/$f"; done
# DEFECT B: ROM rows of every hold class (Scene ON + OFF) + production routes seeds 0..999 both scenes, base vs final
sh $T/fix122OnRun.sh "$OUT/on" $BASE $FINAL | tee "$OUT/on.log"
cp "$OUT/on/hold.txt" "$REC/hold.txt"; same "$F/hold.txt" "$REC/hold.txt"
if [ -n "${FIX122_CENSUS:-}" ]; then
  sh $T/ret88Census.sh shards "$OUT/census-base" $BASE
  sh $T/ret88Census.sh shards "$OUT/census-final" $FINAL
  sh $T/ret88Census.sh compare "$OUT/census-base" "$OUT/census-final" "$OUT/compare"
  cp "$OUT/compare/check.txt" "$REC/census-check.txt"
  # every Scene ON use of every move, seeds 0..999, base vs final: only the covered failure messages' opener holds may change
  for t in base final; do
    d="$OUT/on/copy"; [ "$t" = final ] && d="$OUT/on/copy-final"
    mkdir -p "$OUT/hx/$t"
    (cd "$d" && for k in 0 1 2 3 4 5 6 7 8 9; do
      node --experimental-strip-types --no-warnings $T/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=on --out="$OUT/hx/$t/on-$k.jsonl" > /dev/null &
    done; wait)
  done
  python3 $T/aud118HoldExposure.py "$OUT/hx/base" "$OUT/hx/final" > "$REC/hold-exposure.json"
  same "$F/hold-exposure.json" "$REC/hold-exposure.json"
fi
