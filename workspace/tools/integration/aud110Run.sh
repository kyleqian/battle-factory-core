#!/bin/sh
# aud110 reproduction (docs/aud110-live-audit-25.md). Run from workspace/ with a FRESH <out-dir> INSIDE the repo (the probes find ../oracle from
# there); direct mGBA processes only (never the shared HTTP oracles); every probe is two fresh mGBA processes (r1 == r2 in the summaries).
# Production trees are git-archive copies of the FIXED base 5c050b765 (+ stg107's Struggle diff so later Struggle bodies have adapters); nothing
# outside <out-dir> is written. Receipts land in <out-dir>/rec and are compared with tools/integration/fixtures/aud110/ (`same` / `DIFF`).
#   sh tools/integration/aud110Run.sh <fresh-out-dir>                 # A unaligned flagged windows, B aligned base, C aligned + the two patches (~5 min)
#   AUD110_CENSUS=1 sh tools/integration/aud110Run.sh <fresh-out-dir> # + census 0..999 on the base (ret88Census.sh, ~5 min) -> exposure receipt
set -e
OUT=${1:?usage: aud110Run.sh <fresh-out-dir>}
[ ! -e "$OUT" ] || { echo "refusing: $OUT exists"; exit 1; }
mkdir -p "$OUT/rec"; OUT=$(cd "$OUT" && pwd)
T=tools/integration; F=$T/fixtures/aud110; REC=$OUT/rec
P1=$F/aud110-taunt-anger-front.diff; P2=$F/aud110-harden-opponent-attacker-idle.diff
same() { if cmp -s "$1" "$2"; then echo "same $(basename "$2")"; else echo "DIFF $(basename "$2")"; fi; }
python3 $T/stg107Stage.py "$OUT/sc-stg" | tail -1
python3 $T/aud110Stage.py "$OUT/sc-wide" | tail -1
mkdir "$OUT/sc-all"; cp "$OUT"/sc-stg/*.json "$OUT"/sc-wide/*.json "$OUT/sc-all/"
# A. the flagged windows exactly as stg107 saw them: audit20Check.ts, windows from the ROM activation (no alignment)
sh $T/aud110Patched.sh "$OUT/a" "$OUT/sc-stg" > "$OUT/a.log"
python3 $T/aud110Summary.py "$OUT/a/check" > "$REC/a-unaligned-stg107.txt"
# B. the same + the widened scenarios, windows aligned to production's accepted start (aud110Align.py), base tree
AUD110_ALIGN=1 sh $T/aud110Patched.sh "$OUT/b" "$OUT/sc-all" > "$OUT/b.log"
python3 $T/aud110Summary.py "$OUT/b/check" > "$REC/b-aligned-base.txt"
# C. aligned, base + the two banked patches
AUD110_ALIGN=1 sh $T/aud110Patched.sh "$OUT/c" "$OUT/sc-all" $P1 $P2 > "$OUT/c.log"
python3 $T/aud110Summary.py "$OUT/c/check" > "$REC/c-aligned-patched.txt"
for f in a-unaligned-stg107.txt b-aligned-base.txt c-aligned-patched.txt; do same "$F/$f" "$REC/$f"; done
grep TOTAL "$REC/c-aligned-patched.txt"
if [ -n "$AUD110_CENSUS" ]; then
  sh $T/ret88Census.sh shards "$OUT/census" 5c050b765
  node --experimental-strip-types --no-warnings $T/aud110Exposure.ts "$OUT/census/merged.jsonl" > "$REC/exposure-base-5c050b765.json"
  same "$F/exposure-base-5c050b765.json" "$REC/exposure-base-5c050b765.json"
fi
