#!/bin/sh
# stf115 reproduction (docs/stf115-struggle-declines.md). Run from workspace/ with a FRESH <out-dir> INSIDE the repo; direct mGBA only.
#   sh tools/integration/stf115Run.sh <fresh-out-dir>                   # rung 1 + rung 2 receipts (~8 min)
#   STF115_CENSUS=1 sh tools/integration/stf115Run.sh <fresh-out-dir>   # + census 0..999 on the base and patched copies (~4 min each)
# Every tree is a git-archive copy of the FIXED base 7390bf8ca (+ tools/integration/fixtures/stf115/stf115-*.diff for the patched copy).
# Receipts land in <out-dir>/rec; `same` / `DIFF` lines compare them with tools/integration/fixtures/stf115/.
set -e
OUT=${1:?usage: stf115Run.sh <fresh-out-dir>}
[ ! -e "$OUT" ] || { echo "refusing: $OUT exists"; exit 1; }
mkdir -p "$OUT/rec"; OUT=$(cd "$OUT" && pwd); ROOT=$(pwd)
T=tools/integration; F=$T/fixtures/stf115; REC=$OUT/rec; BASE=7390bf8ca
same() { if cmp -s "$1" "$2"; then echo "same $(basename "$2")"; else echo "DIFF $(basename "$2")"; fi; }
copy() {  # copy <dir> [diff]: git-archive copy of BASE (+ the diff), node_modules / reference / artifacts linked, its own git repo
  git archive --format=tar $BASE . | (mkdir -p "$1" && tar -x -C "$1")
  for d in node_modules reference artifacts; do ln -s "$ROOT/$d" "$1/$d"; done
  if [ -n "$2" ]; then (cd "$1" && patch -s -p1 < "$ROOT/$2"); fi
  (cd "$1" && git init -q && git add -A > /dev/null && git -c user.email=w@x -c user.name=w commit -qm copy \
    && git -c user.email=w@x -c user.name=w commit -q --allow-empty -m extra)
}
copy "$OUT/base"
# 1. scenarios: stg107's 11 forced-Struggle routes + stf115's 4 doll routes (absolute paths: the checks run inside the copies)
python3 $T/stf115Stage.py "$OUT/sc0" | tail -1
mkdir -p "$OUT/sc"; for f in "$OUT"/sc0/*.json; do cp "$f" "$OUT/sc/pb-$(basename "$f")"; done
# 2. RUNG 1: two fresh probe batches; per window the production CHAIN lend's free order vs the ROM sSpriteOrder free order at activation
for b in 1 2; do
  AUDIT20_JOBS=11 python3 $T/audit20Probes.py "$OUT/probe$b" "$OUT"/sc/*.json | grep -v " exit 0$" || true
  python3 $T/audit20Fixtures.py "$OUT/probe$b" "$OUT/fx$b" "$OUT/sc" > "$OUT/derive$b.txt"
  ls "$OUT/fx$b"/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename > "$OUT/names$b.txt"
  (cd "$OUT/base" && while read n; do AUDIT20_LENDS_ONLY=1 node --experimental-strip-types --no-warnings $T/audit20Check.ts "$OUT/fx$b" "$n" /dev/null; done \
    < "$OUT/names$b.txt") > "$OUT/lends$b.jsonl"
done
same "$OUT/lends1.jsonl" "$OUT/lends2.jsonl"; same "$OUT/derive1.txt" "$OUT/derive2.txt"
cp "$OUT/lends1.jsonl" "$REC/rung1-lends.jsonl"; cp "$OUT/derive1.txt" "$REC/derive.txt"
# 3. RUNG 1: every live window through the production renderer (aligned windows, two fresh probes each inside audit21Check)
python3 $T/aud110Align.py "$OUT/fx1" "$OUT/fxa"
STF115_CHECK=audit21Check sh $T/stf115Check.sh "$OUT/fxa" "$OUT/base" "$OUT/check-base"
python3 $T/stf115Summary.py "$OUT/check-base" "$OUT/lends1.jsonl" > "$REC/rung1-windows-base.txt"
tail -2 "$REC/rung1-windows-base.txt"
for f in rung1-lends.jsonl derive.txt rung1-windows-base.txt; do same "$F/$f" "$REC/$f"; done
# 4. RUNG 2: the patched copy (base + the banked doll diff), when the diff exists
if [ -f $F/stf115-struggle-doll.diff ]; then
  copy "$OUT/patched" $F/stf115-struggle-doll.diff
  STF115_CHECK=audit21Check sh $T/stf115Check.sh "$OUT/fxa" "$OUT/patched" "$OUT/check-patched"
  python3 $T/stf115Summary.py "$OUT/check-patched" "$OUT/lends1.jsonl" > "$REC/rung2-windows-patched.txt"
  tail -2 "$REC/rung2-windows-patched.txt"; same "$F/rung2-windows-patched.txt" "$REC/rung2-windows-patched.txt"
fi
# 5. census 0..999 (optional): base copy, and the patched copy when it exists
if [ -n "$STF115_CENSUS" ]; then
  sh $T/stg107Census.sh "$OUT/census-base" "$OUT/base"
  python3 $T/stf115Declines.py "$OUT/census-base/merged.jsonl" "$REC/census-base-declines.json"
  same "$F/census-base-declines.json" "$REC/census-base-declines.json"
  if [ -d "$OUT/patched" ]; then
    sh $T/stg107Census.sh "$OUT/census-patched" "$OUT/patched"
    python3 $T/stf115Declines.py "$OUT/census-patched/merged.jsonl" "$REC/census-patched-declines.json"
    python3 $T/stg107CensusSummary.py "$OUT/census-base" "$OUT/census-patched" "$REC/census-summary.json" | tail -3
    python3 $T/land82CensusCheck.py "$OUT/census-base" "$OUT/census-base/merged.json" "$OUT/census-base/merged.jsonl" "$OUT/census-patched" \
      "$OUT/census-patched/merged.json" "$OUT/census-patched/merged.jsonl" "$REC/census-check.json" | tail -3
    for f in census-patched-declines.json census-summary.json census-check.json; do same "$F/$f" "$REC/$f"; done
  fi
fi
