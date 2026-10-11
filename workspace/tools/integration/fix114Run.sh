#!/bin/sh
# fix114 reproduction (docs/fix114-live-audit-defects.md). Run from workspace/ with a FRESH <out-dir> INSIDE the repo (the probes find ../oracle);
# direct mGBA processes only, every probe = two fresh mGBA processes (r1 == r2 in the summaries). Scenarios: stg107's 11 + aud110's 17 (its 69
# windows) + fix114Stage.py's 10 widened. Arms (fix114Patched.sh, aligned windows, audit21Check.ts in a git-archive copy):
#   head = this checkout's HEAD (the landed fixes); base = bce86a4b0 (before them), reusing head's ROM probes.
# Receipts in <out-dir>/rec; `same` / `DIFF` against tools/integration/fixtures/fix114/ and the aud110 patched receipt.
#   sh tools/integration/fix114Run.sh <fresh-out-dir>                  (~8 min)
#   FIX114_CENSUS=1 sh tools/integration/fix114Run.sh <fresh-out-dir>  (+ census base vs HEAD and the receipt, ~6 more min)
set -e
OUT=${1:?usage: fix114Run.sh <fresh-out-dir>}
[ ! -e "$OUT" ] || { echo "refusing: $OUT exists"; exit 1; }
mkdir -p "$OUT/rec"; OUT=$(cd "$OUT" && pwd)
T=tools/integration; F=$T/fixtures/fix114; REC=$OUT/rec
same() { if cmp -s "$1" "$2"; then echo "same $(basename "$2")"; else echo "DIFF $(basename "$2")"; fi; }
python3 $T/stg107Stage.py "$OUT/sc-stg" | tail -1
python3 $T/aud110Stage.py "$OUT/sc-wide" | tail -1
python3 $T/fix114Stage.py "$OUT/sc-fix" | tail -1
mkdir "$OUT/sc-all"; cp "$OUT"/sc-stg/*.json "$OUT"/sc-wide/*.json "$OUT"/sc-fix/*.json "$OUT/sc-all/"
sh $T/fix114Patched.sh "$OUT/head" "$OUT/sc-all" HEAD > "$OUT/head.log"
FIX114_REUSE="$OUT/head" sh $T/fix114Patched.sh "$OUT/base" "$OUT/sc-all" bce86a4b0 > "$OUT/base.log"
cp "$OUT/head/summary.txt" "$REC/head-aligned.txt"; cp "$OUT/base/summary.txt" "$REC/base-aligned.txt"
grep -v '^pb-fix114-' "$REC/head-aligned.txt" | grep -v '^TOTAL\|^not listed' > "$REC/head-aud110-windows.txt"
grep -v '^TOTAL\|^not listed' $T/fixtures/aud110/c-aligned-patched.txt > "$REC/aud110-c-windows.txt"
same "$REC/aud110-c-windows.txt" "$REC/head-aud110-windows.txt"
for f in head-aligned.txt base-aligned.txt; do same "$F/$f" "$REC/$f"; done
grep TOTAL "$REC/head-aligned.txt"
if [ -n "$FIX114_CENSUS" ]; then  # census 0..999 base vs this HEAD (ret88Census.sh: 10 --index-from shards, hist73Merge.py, land82 / prep43 compare)
  sh $T/ret88Census.sh shards "$OUT/census-base" bce86a4b0
  sh $T/ret88Census.sh shards "$OUT/census-final" HEAD
  sh $T/ret88Census.sh compare "$OUT/census-base" "$OUT/census-final" "$OUT/census-cmp" | tail -4
  python3 $T/fix114Receipt.py "$OUT" "$OUT/census-base" "$OUT/census-final" > "$REC/fix114-live-receipt.json"
  python3 -c 'import json, sys; a, b = (json.load(open(p)) for p in sys.argv[1:]); k = lambda d: [d["windows"], d["census"]["statusChanges"], d["census"]["frameChanges"], d["census"]["keySequenceIdentical"], d["census"]["battleDigest"], d["census"]["commandKeyDigest"]]; print("same windows + census" if k(a) == k(b) else "DIFF receipt")' $T/fixtures/fix114-live-receipt.json "$REC/fix114-live-receipt.json"
fi
