#!/bin/sh
# shp116 runner (docs/shp116-shadow-lead-and-shadow-punch-d4.md). Run from workspace/; direct mGBA only (never the shared HTTP oracles).
# <out> must be FRESH (absent or empty) and INSIDE the repo (the probe tools find ../oracle from there).
#   sh tools/integration/shp116Run.sh <fresh-out-dir> [--census]
# 1. shadow105Stage.py / sp103Scenarios.py -> <out>/sc105, <out>/sc103, diff'd with the committed scenarios;
# 2. fresh probes x2: shadow105's 11 labs (shadow105Job.sh) + sp103's 6 labs (sp103Job.sh), r1 == r2 (frame rows), sha256 equal to the
#    banked shadow105 / sp103 receipts;
# 3. THIS checkout's production: shadow105LeadCheck.ts --pre-activation per move (13 lead windows), cmp'd with shadow105's banked
#    lead-patched-*.json; ctl95ControlCheck.ts --shift=8 on the 24 sp103 bodies (per-row px vs sp103's banked body-patch.json);
# 4. the 5 shadow105 census routes through the full production path, base 681da5c10 (git-archive copy) vs this checkout
#    (shadow105RouteRender.ts + shadow105RouteCheck.py); Scene ON / OFF parity on the seed-54 HAUNTER route in both (shp116Parity.ts);
# 5. --census: liveShareCensus.ts seeds 0..999 (ten --index-from shards) in a base copy and a HEAD copy; hist73Merge.py;
#    shp116CensusDelta.py;
# 6. shp116Receipt.py builds <out>/shp116-live-receipt.json and compares it with tools/integration/fixtures/shp116-live-receipt.json
#    (the census section only with --census). Archive copies and raw RGB dumps are removed at the end.
set -eu
OUT=${1:?usage: shp116Run.sh <fresh-out-dir> [--census]}; shift
CENSUS=0; for a in "$@"; do case "$a" in --census) CENSUS=1;; *) echo "unknown $a"; exit 2;; esac; done
W=$(pwd); [ -f "$W/tools/integration/shp116Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"; [ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd); case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
BASE=681da5c10; F105=$W/tools/integration/fixtures/shadow105; F103=$W/tools/integration/fixtures/sp103
echo "code $(git rev-parse HEAD) src $(git rev-parse HEAD:workspace/src) dirty-src $(git status --short src | wc -l | tr -d ' ') base $BASE"

# 1. staging
python3 tools/integration/shadow105Stage.py "$OUT/sc105" > /dev/null
python3 tools/integration/sp103Scenarios.py "$OUT/sc103" > /dev/null
diff -r "$OUT/sc105" "$F105/scenarios" > /dev/null && echo "SAME shadow105 scenarios" || echo "DIFF shadow105 scenarios"
diff -r "$OUT/sc103" "$F103/scenarios" > /dev/null && echo "SAME sp103 scenarios" || echo "DIFF sp103 scenarios"

# 2. probes (the committed scenario files, as both evidence runners do)
mkdir -p "$OUT/p105" "$OUT/p103"
cut -f1 "$OUT/sc105/list.tsv" | while read -r n; do for r in 1 2; do echo "$OUT/sc105 $n $r $OUT/p105"; done; done \
  | xargs -P 8 -n 4 tools/integration/shadow105Job.sh > "$OUT/p105.log" 2>&1
for s in $(cut -f1 "$F103/scenarios/list.tsv"); do for r in 1 2; do echo "$F103/scenarios $s $r $OUT/p103"; done; done \
  | xargs -P 6 -n 4 sh tools/integration/sp103Job.sh > "$OUT/p103.log" 2>&1 || true

# 3. this checkout: lead windows + sp103 bodies
mkdir -p "$OUT/lead"
for m in SHADOW_PUNCH:shadow-punch BITE:bite SLUDGE_BOMB:sludge-bomb TWINEEDLE:twineedle; do M=${m%%:*}; k=${m#*:}
  stems=$(grep -E "^shadow105-$k-" "$OUT/sc105/list.tsv" | cut -f1 | tr '\n' ' ')
  node --experimental-strip-types --no-warnings tools/integration/shadow105LeadCheck.ts --scenarios="$OUT/sc105" --move=$M --pre-activation \
    --out="$OUT/lead/lead-$k.json" "$OUT/p105" $stems > "$OUT/lead/lead-$k.log"
done
node --experimental-strip-types --no-warnings tools/integration/ctl95ControlCheck.ts --scenarios="$F103/scenarios" --move=SHADOW_PUNCH --shift=8 \
  --out="$OUT/body-sp103.json" "$OUT/p103" $(cut -f1 "$F103/scenarios/list.tsv") > /dev/null

# 4. routes + parity (base copy vs this checkout)
mkdir -p "$OUT/base" "$OUT/route"
git -C .. archive $BASE workspace | tar -x -C "$OUT/base"
for g in node_modules artifacts reference; do ln -s "$W/$g" "$OUT/base/workspace/$g"; done
cp tools/integration/shadow105RouteRender.ts tools/integration/shp116Parity.ts "$OUT/base/workspace/tools/integration/"
for r in 38:44:opponent 4:188:opponent 31:337:opponent 38:188:player 32:44:player; do b=${r%%:*}; rest=${r#*:}; mv=${rest%%:*}; sd=${rest#*:}
  (cd "$OUT/base/workspace" && node --experimental-strip-types --no-warnings tools/integration/shadow105RouteRender.ts --seed=$b --streak=$(( (b * 11) % 49 )) \
    --move=$mv --side=$sd --out="$OUT/route/base-b$b-$mv-$sd.json" > /dev/null)
  node --experimental-strip-types --no-warnings tools/integration/shadow105RouteRender.ts --seed=$b --streak=$(( (b * 11) % 49 )) \
    --move=$mv --side=$sd --out="$OUT/route/patched-b$b-$mv-$sd.json" > /dev/null
done
python3 tools/integration/shadow105RouteCheck.py "$OUT/route" "$OUT/route-check.json" 38:44:opponent 4:188:opponent 31:337:opponent 38:188:player 32:44:player > /dev/null
(cd "$OUT/base/workspace" && node --experimental-strip-types --no-warnings tools/integration/shp116Parity.ts) > "$OUT/parity-base.json"
node --experimental-strip-types --no-warnings tools/integration/shp116Parity.ts > "$OUT/parity-final.json"

# 5. census
if [ $CENSUS = 1 ]; then
  mkdir -p "$OUT/final"
  git -C .. archive HEAD workspace | tar -x -C "$OUT/final"
  for g in node_modules artifacts reference; do ln -s "$W/$g" "$OUT/final/workspace/$g"; done
  for t in base final; do
    mkdir -p "$OUT/census-$t"
    (cd "$OUT/$t/workspace" && for k in 0 1 2 3 4 5 6 7 8 9; do
      node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=$((k * 100))..$((k * 100 + 99)) --index-from=$((k * 100)) \
        --out="$OUT/census-$t/r$k.json" --commands="$OUT/census-$t/r$k.jsonl" > "$OUT/census-$t/r$k.log" 2>&1 &
    done; wait)
    python3 tools/integration/hist73Merge.py "$OUT/census-$t" "$OUT/census-$t-merged.json" "$OUT/census-$t-merged.jsonl" | tail -1
  done
  python3 tools/integration/shp116CensusDelta.py "$OUT/census-base" "$OUT/census-final" "$OUT/base/workspace/src/engine/battleResolutionPresentationRender.ts" \
    "$OUT/census-delta.json"
fi

# 6. receipt
rm -rf "$OUT/base" "$OUT/final" "$OUT"/p105/*-rgb "$OUT"/p103/*-rgb
python3 tools/integration/shp116Receipt.py "$OUT" "$W/tools/integration/fixtures/shp116-live-receipt.json"
