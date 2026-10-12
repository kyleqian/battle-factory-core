#!/bin/sh
# aud118 reproduction (docs/aud118-live-audit-26.md, live audit 26). Run from workspace/ with a FRESH <out-dir> INSIDE the repo (the probes
# find ../oracle from there); direct mGBA processes only (never the shared HTTP oracles), explicit lab seeds; every probe job runs twice in
# fresh processes (r1 == r2). Production = git-archive copies of the FIXED base 396308f86 [+ the banked patch], inside <out-dir> only.
# Receipts land in <out-dir>/rec and are compared with tools/integration/fixtures/aud118/ (`same` / `DIFF`).
#   sh tools/integration/aud118Run.sh <fresh-out-dir>                  # Struggle base + patched, banner, Scene OFF classes (~6 min)
#   AUD118_CENSUS=1 sh tools/integration/aud118Run.sh <fresh-out-dir>  # + census 0..999 on the base (ret88Census.sh) -> exposure receipt
set -e
OUT=${1:?usage: aud118Run.sh <fresh-out-dir>}
[ ! -e "$OUT" ] || { echo "refusing: $OUT exists"; exit 1; }
mkdir -p "$OUT/rec"; OUT=$(cd "$OUT" && pwd)
T=tools/integration; F=$T/fixtures/aud118; REC=$OUT/rec
P=$F/aud118-struggle-target-x2-keep.diff  # (the Scene ON hold patch aud118-on-noeffect-attackanimation-hold.diff: aud118OffRun.sh)
same() { if cmp -s "$1" "$2"; then echo "same $(basename "$2")"; else echo "DIFF $(basename "$2")"; fi; }
# 1. Struggle: widened scenarios -> probes -> aligned windows -> audit21Check.ts, base and base + the banked patch (ROM probes reused)
python3 $T/aud118Stage.py "$OUT/sc" | tail -1
sh $T/aud118Patched.sh "$OUT/base" "$OUT/sc" > "$OUT/base.log"
python3 $T/aud118Summary.py "$OUT/base/check" > "$REC/struggle-base.txt"
AUD118_REUSE="$OUT/base" sh $T/aud118Patched.sh "$OUT/patched" "$OUT/sc" $P > "$OUT/patched.log"
python3 $T/aud118Summary.py "$OUT/patched/check" > "$REC/struggle-patched.txt"
for f in struggle-base.txt struggle-patched.txt; do same "$F/$f" "$REC/$f"; done
tail -1 "$REC/struggle-patched.txt"
# 2. stats-change banner: the scd112 comparator through production on the widened stat scenarios, Scene ON + OFF
sh $T/aud118StatRun.sh "$OUT/banner" | tee "$OUT/banner.log"
cp "$OUT/banner/compare.log" "$REC/banner-compare.txt"; cp "$OUT/banner/receipts/stat-anim.json" "$REC/banner-stat-anim.json"
for f in banner-compare.txt banner-stat-anim.json; do same "$F/$f" "$REC/$f"; done
# 3. Scene OFF pauses / holds: new classes, ROM anchors vs production's next presented command
sh $T/aud118OffRun.sh "$OUT/off" | tee "$OUT/off.log"
cp "$OUT/off/rom-r1.json" "$REC/off-rom-r1.json"; cp "$OUT/off/table/classes.tsv" "$REC/off-classes.tsv"; cp "$OUT/off/verify.txt" "$REC/off-verify.txt"
cp "$OUT/off/substitute.json" "$REC/off-substitute.json"; cp "$OUT/off/hold.txt" "$REC/off-hold.txt"
for f in off-rom-r1.json off-classes.tsv off-verify.txt off-substitute.json off-hold.txt; do same "$F/$f" "$REC/$f"; done
if [ -n "$AUD118_CENSUS" ]; then
  sh $T/ret88Census.sh shards "$OUT/census" 396308f86
  node --experimental-strip-types --no-warnings $T/aud118Exposure.ts "$OUT/census/merged.jsonl" > "$REC/exposure-base-396308f86.json"
  same "$F/exposure-base-396308f86.json" "$REC/exposure-base-396308f86.json"
fi
