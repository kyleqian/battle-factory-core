#!/bin/sh
# stl109 reproduction (docs/stl109-struggle-live.md): stg107Run.sh, with the render step against the LANDED production (a git-archive copy of
# HEAD, no patch applied) instead of base + the banked diff. Run from workspace/ with a FRESH <out-dir> INSIDE the repo; direct mGBA only.
#   sh tools/integration/stl109Run.sh <fresh-out-dir>                  # ROM receipts: ON windows x2 + OFF timing x2 (r1 == r2), same / DIFF vs stg107 fixtures
#   STL109_PATCH=1 sh tools/integration/stl109Run.sh <fresh-out-dir>   # + the landed production through the live renderer (~3 min); commit first
# Receipt files land in <out-dir>/rec; `same` / `DIFF` lines compare them with tools/integration/fixtures/stg107/.
set -e
OUT=${1:?usage: stl109Run.sh <fresh-out-dir>}
[ ! -e "$OUT" ] || { echo "refusing: $OUT exists"; exit 1; }
mkdir -p "$OUT/rec"; OUT=$(cd "$OUT" && pwd)
T=tools/integration; F=$T/fixtures/stg107; REC=$OUT/rec
same() { if cmp -s "$1" "$2"; then echo "same $(basename "$2")"; else echo "DIFF $(basename "$2")"; fi; }
# 1. real forced-Struggle scenarios (Scene ON + Scene OFF copies), two fresh probe batches each
python3 $T/stg107Stage.py "$OUT/sc-on" | tail -1
python3 $T/stg107Stage.py "$OUT/sc-off" --off | tail -1
for b in 1 2; do
  python3 $T/stg107Probes.py "$OUT/on$b" "$OUT"/sc-on/*.json | grep -v "attempt 1" || true
  python3 $T/stg107Summary.py "$OUT/on$b" "$OUT/on$b.jsonl"
  python3 $T/stg107Probes.py "$OUT/off$b" "$OUT"/sc-off/*.json | grep -v "attempt 1" || true
  python3 $T/stg107Summary.py "$OUT/off$b" "$OUT/off$b.jsonl"
done
same "$OUT/on1.jsonl" "$OUT/on2.jsonl"; same "$OUT/off1.jsonl" "$OUT/off2.jsonl"
cp "$OUT/on1.jsonl" "$REC/struggle-windows-on.jsonl"; cp "$OUT/off1.jsonl" "$REC/timing-off.jsonl"
for f in struggle-windows-on.jsonl timing-off.jsonl; do same "$F/$f" "$REC/$f"; done
# 2. the banked patch through the production live renderer (optional)
if [ -n "$STL109_PATCH" ]; then
  sh $T/stl109Patched.sh "$OUT/patched" "$OUT/sc-on"
  cp "$OUT/patched/summary.txt" "$REC/patched-windows-summary.txt"
  same "$F/patched-windows-summary.txt" "$REC/patched-windows-summary.txt"
fi
