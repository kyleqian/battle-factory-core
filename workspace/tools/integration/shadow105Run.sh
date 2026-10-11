#!/bin/sh
# shadow105 runner (docs/next-adapters-shadow105.md). Run from workspace/; direct mGBA only (never the shared HTTP oracles). <out> must be
# FRESH (absent or empty) and INSIDE the repo (the probe tools find ../oracle from there). Nothing outside it is written.
#   sh tools/integration/shadow105Run.sh <fresh-out-dir> [--census] [--pins]
# 1. shadow105Stage.py -> <out>/scenarios, diff'd with tools/integration/fixtures/shadow105/scenarios;
# 2. fresh probes: 11 labs x {r1, r2} (shadow105Job.sh: ctl95Probe.py, 40-row RGB tail, a crashed run rerun once; 8 parallel), r1 == r2
#    byte for byte (frame rows) -> <out>/receipts/probe-sha256.json;
# 3. git-archive copies of the FIXED base 3cc8381ce (production src dc6c756a) and base + fixtures/shadow105/shadow105-lead-row0-shadow.diff
#    (patch -p1, no .orig / .rej), node_modules + artifacts symlinked;
# 4. shadow105LeadCheck.ts per move in both copies (base as committed; patched with --pre-activation, the patch's row-0 flag)
#    -> <out>/receipts/lead-{base,patched}-<move>.json (the ROM lead table rows + production rows); 4b. shadow105RouteRender.ts on 5
#    census routes in both copies + shadow105RouteCheck.py -> <out>/receipts/route/route-check.json;
# 5. --census: liveShareCensus.ts seeds 0..999 (ten --index-from shards) in both copies; hist73Merge.py; shadow105CensusDelta.py
#    -> <out>/receipts/census-delta.json (+ census-{base,patched}-merged.json headline);
# 6. --pins: `npm test` in the patched copy (its own git init) -> <out>/receipts/patched-npm-test.txt (the failed files / tests);
# 7. every receipt cmp'd with tools/integration/fixtures/shadow105/receipts (SAME / DIFF / NEW).
set -eu
OUT=${1:?usage: shadow105Run.sh <fresh-out-dir> [--census] [--pins]}; shift
CENSUS=0; PINS=0; for a in "$@"; do case "$a" in --census) CENSUS=1;; --pins) PINS=1;; *) echo "unknown $a"; exit 2;; esac; done
W=$(pwd); [ -f "$W/tools/integration/shadow105Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"; [ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd); case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
FX=$W/tools/integration/fixtures/shadow105; BASE=3cc8381ce; REC=$OUT/receipts; S=$OUT/scenarios; P=$OUT/probes
mkdir -p "$REC" "$P"
echo "code $(git rev-parse HEAD) base $BASE src $(git rev-parse $BASE:workspace/src)"

# 1. staging
python3 tools/integration/shadow105Stage.py "$S" > /dev/null
diff -r "$S" "$FX/scenarios" > /dev/null && echo "SAME scenarios ($(wc -l < "$FX/scenarios/list.tsv" | tr -d ' '))" || echo "DIFF scenarios"

# 2. probes
cut -f1 "$S/list.tsv" | while read -r n; do for r in 1 2; do echo "$S $n $r $P"; done; done | xargs -P 8 -n 4 tools/integration/shadow105Job.sh > "$OUT/probes.log"
grep -c '^ok' "$OUT/probes.log" | sed 's/^/probe jobs ok: /'
python3 - "$P" "$REC/probe-sha256.json" <<'PY'
import hashlib, json, sys, glob, os
d, out = sys.argv[1], sys.argv[2]
res = {}
for f in sorted(glob.glob(f"{d}/*-r1.json")):
    s = os.path.basename(f)[:-8]
    fr = [hashlib.sha256(json.dumps(json.load(open(f"{d}/{s}-r{r}.json"))["frames"], sort_keys=True).encode()).hexdigest() for r in (1, 2)]
    res[s] = {"framesR1": fr[0], "framesR2": fr[1], "same": fr[0] == fr[1]}
json.dump({"schema": "shadow105-probe-sha256/v1", "sha256": res}, open(out, "w"), indent=1); open(out, "a").write("\n")
print("probes r1 == r2 (frame rows):", sum(v["same"] for v in res.values()), "/", len(res))
PY

# 3. production copies
for t in base patched; do
  mkdir -p "$OUT/tree/$t"
  git -C .. archive $BASE workspace | tar -x -C "$OUT/tree/$t"
  ln -s "$W/node_modules" "$OUT/tree/$t/workspace/node_modules"; ln -s "$W/artifacts" "$OUT/tree/$t/workspace/artifacts"
  cp tools/integration/shadow105LeadCheck.ts tools/integration/shadow105RouteRender.ts "$OUT/tree/$t/workspace/tools/integration/"
done
patch -s -p1 -d "$OUT/tree/patched" < "$FX/shadow105-lead-row0-shadow.diff"
[ -z "$(find "$OUT/tree/patched" -name '*.orig' -o -name '*.rej')" ] || { echo "patch left .orig / .rej"; exit 1; }
grep -q "preActivationRow === true" "$OUT/tree/patched/workspace/src/engine/battleScene.ts" || { echo "patch not applied"; exit 1; }

# 4. lead / shadow rows
for t in base patched; do pa=""; [ $t = patched ] && pa="--pre-activation"
  for m in SHADOW_PUNCH:shadow-punch BITE:bite SLUDGE_BOMB:sludge-bomb TWINEEDLE:twineedle; do M=${m%%:*}; k=${m#*:}
    stems=$(grep -E "^shadow105-$k-" "$S/list.tsv" | cut -f1 | tr '\n' ' ')
    (cd "$OUT/tree/$t/workspace" && node --experimental-strip-types --no-warnings tools/integration/shadow105LeadCheck.ts --scenarios="$S" --move=$M $pa \
      --out="$REC/lead-$t-$k.json" "$P" $stems) > "$OUT/lead-$t-$k.log"
  done
done
echo "lead checks: $(cat "$OUT"/lead-*.log | wc -l | tr -d ' ') body lines"
# 4b. census routes through the FULL production presentation path (createBattleResolutionPresentationRenderView): 3 elevated opponent
#     attackers (CROBAT Bite b38, Sludge Bomb b4, Dragon Claw b31) and 2 player attackers into an elevated opponent (b38 Sludge Bomb
#     -> CROBAT, b32 Bite -> CHIMECHO); streak = (battle * 11) % 49 (liveShareCensus.ts's default)
mkdir -p "$OUT/route" "$REC/route"
for r in 38:44:opponent 4:188:opponent 31:337:opponent 38:188:player 32:44:player; do b=${r%%:*}; rest=${r#*:}; mv=${rest%%:*}; sd=${rest#*:}
  for t in base patched; do
    (cd "$OUT/tree/$t/workspace" && node --experimental-strip-types --no-warnings tools/integration/shadow105RouteRender.ts --seed=$b --streak=$(( (b * 11) % 49 )) \
      --move=$mv --side=$sd --out="$OUT/route/$t-b$b-$mv-$sd.json" > /dev/null)
  done
done
python3 tools/integration/shadow105RouteCheck.py "$OUT/route" "$REC/route/route-check.json" 38:44:opponent 4:188:opponent 31:337:opponent 38:188:player 32:44:player > /dev/null

# 5. census
if [ $CENSUS = 1 ]; then
  for t in base patched; do
    mkdir -p "$OUT/census-$t"
    (cd "$OUT/tree/$t/workspace" && for k in 0 1 2 3 4 5 6 7 8 9; do
      node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=$((k * 100))..$((k * 100 + 99)) --index-from=$((k * 100)) \
        --out="$OUT/census-$t/r$k.json" --commands="$OUT/census-$t/r$k.jsonl" > "$OUT/census-$t/r$k.log" 2>&1 &
    done; wait)
    python3 tools/integration/hist73Merge.py "$OUT/census-$t" "$OUT/census-$t-merged.json" "$OUT/census-$t-merged.jsonl" | tail -1
    python3 -c "import json,sys; d=json.load(open(sys.argv[1])); json.dump({k: d[k] for k in ('overall','commandKeyDigest','battleDigest')}, open(sys.argv[2],'w'), indent=1)" \
      "$OUT/census-$t-merged.json" "$REC/census-$t-merged.json"
  done
  python3 tools/integration/shadow105CensusDelta.py "$OUT/census-base" "$OUT/census-patched" "$OUT/tree/base/workspace/src/engine/battleResolutionPresentationRender.ts" "$REC/census-delta.json"
fi

# 6. pins
if [ $PINS = 1 ]; then
  (cd "$OUT/tree/patched" && git init -q)
  (cd "$OUT/tree/patched/workspace" && npm test > "$OUT/patched-npm-test.log" 2>&1 || true)
  { grep -E "^ (FAIL|×)|Test Files|Tests " "$OUT/patched-npm-test.log" | sed -E 's/ [0-9]+ms$//; s/\x1b\[[0-9;]*m//g' | sort -u; } > "$REC/patched-npm-test.txt"
fi

# 7. compare
fail=0
for f in $(cd "$REC" && find . -type f | sort); do
  if [ ! -f "$FX/receipts/$f" ]; then echo "NEW $f"; elif cmp -s "$REC/$f" "$FX/receipts/$f"; then echo "SAME $f"; else echo "DIFF $f"; fail=1; fi
done
[ "$fail" -eq 0 ] && echo "shadow105Run: ALL SAME (or NEW)" || { echo "shadow105Run: DIFFERENCES"; exit 1; }
