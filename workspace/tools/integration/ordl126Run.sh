#!/bin/sh
# ordl126 reproduction (docs/ordl126-order-plans-live.md). Run from workspace/ with a FRESH <out-dir> INSIDE the repo; direct mGBA only.
#   sh tools/integration/ordl126Run.sh <fresh-out-dir>     # ~6 min: table check, ROM-unit check, census 0..999 x2, windows after the bodies, receipt
# The LANDED tree is a git-archive copy of this checkout's HEAD. The BASE arm is the same copy with ord124-order-plans.diff reversed
# (= the table before the landing). Works from a fresh git-archive copy of the repo (needs `git init` + one commit there).
set -e
OUT=${1:?usage: ordl126Run.sh <fresh-out-dir>}
[ ! -e "$OUT" ] || { echo "refusing: $OUT exists"; exit 1; }
mkdir -p "$OUT/rec"; OUT=$(cd "$OUT" && pwd); ROOT=$(pwd)
T=tools/integration; F=$T/fixtures/ord124; REC=$OUT/rec; FX=$T/fixtures
MGBA_PY=${MGBA_PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
LIBMGBA_PY=${LIBMGBA_PY:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
same() { if cmp -s "$1" "$2"; then echo "same $(basename "$2")"; else echo "DIFF $(basename "$2")"; fi; }
copy() {  # copy <dir> [reverse-diff]: git-archive copy of HEAD, node_modules / reference / artifacts linked, its own git repo
  d=$1
  git archive --format=tar HEAD . | (mkdir -p "$d" && tar -x -C "$d")
  for l in node_modules reference artifacts; do ln -s "$ROOT/$l" "$d/$l"; done
  if [ -n "$2" ]; then (cd "$d" && patch -s -R -p1 < "$ROOT/$2"); fi
  (cd "$d" && git init -q && git add -A > /dev/null && git -c user.email=w@x -c user.name=w commit -qm copy \
    && git -c user.email=w@x -c user.name=w commit -q --allow-empty -m extra)
}
copy "$OUT/landed"
copy "$OUT/base" $F/ord124-order-plans.diff
# the landed table regenerates byte for byte from its generator
(cd "$OUT/landed" && node --experimental-strip-types --no-warnings $T/spriteOrderProductionTable.ts > /dev/null && git diff --quiet -- src/engine/spriteOrderProductionPlans.ts) \
  && echo "table regenerates byte-identically (landed copy)" || echo "TABLE DIFF"
# the generated table equals the banked ord124 src hunk: the base arm's table + the diff's src hunk == the landed table
(cd "$OUT/base" && patch -s -p1 --dry-run < "$ROOT/$F/ord124-order-plans.diff" > /dev/null) && echo "banked diff applies to the base arm" || echo "BANKED DIFF DOES NOT APPLY"

# per-window ROM check of the plan rows on the committed unit receipts (plans69 + ord124): 316 51 / 51, 206 18 / 18
node --experimental-strip-types --no-warnings $T/ord124Check.ts "$REC/ord124-check.json" $T/fixtures/plans69/units.json $F/ord124-units.json | head -5
same "$F/ord124-check.json" "$REC/ord124-check.json"

# census 0..999 (10 --index-from shards, hist73Merge.py), base arm vs landed
sh $T/stg107Census.sh "$OUT/census-base" "$OUT/base"
sh $T/stg107Census.sh "$OUT/census-landed" "$OUT/landed"
python3 $T/ord124CensusPair.py "$OUT/census-base" "$OUT/census-landed" "$REC/census-pair.json"
python3 $T/land82CensusCheck.py "$OUT/census-base" "$OUT/census-base/merged.json" "$OUT/census-base/merged.jsonl" "$OUT/census-landed" \
  "$OUT/census-landed/merged.json" "$OUT/census-landed/merged.jsonl" "$REC/census-check.json" > /dev/null

# the windows AFTER the bodies in the LANDED tree: CHAIN lend vs ROM sSpriteOrder (two fresh probe batches, r1 == r2), then audit21Check
python3 $T/ord124Stage.py "$OUT/sc0" | tail -1
mkdir -p "$OUT/sc"; for f in "$OUT"/sc0/ord124-*.json; do cp "$f" "$OUT/sc/pb-$(basename "$f")"; done
for b in 1 2; do
  AUDIT20_JOBS=12 python3 $T/audit20Probes.py "$OUT/probe-w$b" "$OUT"/sc/*.json | grep -v " exit 0$" || true
  python3 $T/audit20Fixtures.py "$OUT/probe-w$b" "$OUT/fx$b" "$OUT/sc" > "$OUT/derive$b.txt"
  awk '$2=="ODOR_SLEUTH"||$2=="FALSE_SWIPE"{print $1}' "$OUT/derive$b.txt" | while read f; do rm "$OUT/fx$b/$f"; done
  ls "$OUT/fx$b"/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename > "$OUT/names$b.txt"
  (cd "$OUT/landed" && while read n; do AUDIT20_LENDS_ONLY=1 node --experimental-strip-types --no-warnings $T/audit20Check.ts "$OUT/fx$b" "$n" /dev/null; done \
    < "$OUT/names$b.txt") > "$OUT/lends$b.jsonl"
done
same "$OUT/derive1.txt" "$OUT/derive2.txt"; same "$OUT/lends1.jsonl" "$OUT/lends2.jsonl"
python3 $T/aud110Align.py "$OUT/fx1" "$OUT/fxa" > /dev/null
STF115_CHECK=audit21Check sh $T/stf115Check.sh "$OUT/fxa" "$OUT/landed" "$OUT/check-landed"
python3 $T/stf115Summary.py "$OUT/check-landed" "$OUT/lends1.jsonl" > "$REC/windows-landed.txt"
grep "^TOTAL all" "$REC/windows-landed.txt" | sed "s/^/landed: /"
same "$F/ord124-rung3-windows-patched.txt" "$REC/windows-landed.txt"

python3 $T/ordl126Receipt.py "$REC/census-pair.json" "$REC/census-check.json" "$REC/ord124-check.json" "$REC/windows-landed.txt" "$OUT/lends1.jsonl" "$REC/ordl126-live-receipt.json"
same "$FX/ordl126-live-receipt.json" "$REC/ordl126-live-receipt.json"
