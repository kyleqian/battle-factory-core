#!/bin/sh
# scf117 runner (docs/scf117-stats-change-finish.md, ISSUES #166: General_StatsChange finished). Run from workspace/; direct mGBA only
# (never the shared HTTP oracles); production is read only in git-archive copies inside the FRESH <out-dir> (refused if non-empty; must
# be inside the repo). Nothing outside <out-dir> is written or removed.
#   sh tools/integration/scf117Run.sh <fresh-out-dir> [--census] [<final-rev>]
# 1. archive copies <out>/base (681da5c10) and <out>/final (<final-rev>, default HEAD) + this checkout's scf117 / sc106 census tools;
# 2. rung 1: scf117Align.ts seeds 0..199 both scenes (final): every presented stats-change -> the following print's glyph on
#    the kernel-derived ROM row (residual 0), summarized per path (scf117AlignSummary.py);
# 3. rung 2: stat102Run.sh (ROM frames, ALL SAME) -> scd112ProductionCompare.ts on the final copy twice (r1 == r2, 20 / 20);
#    liveAdapterFramebuffer.ts (fresh direct-mGBA probes twice per fixture) on the 5 x2-live fixtures (final) and the 2 base controls
#    -> == tools/integration/fixtures/scf117/x2-live.json;
# 4. (--census) sc106LiveShareCensus.ts seeds 0..999 (ten --index-from shards) in both copies, hist73Merge.py, scf117CensusDelta.py;
#    scf117Align.ts 0..999 ON / OFF (final) and stat101Exposure.ts 0..999 + stat101ExposureSummary.py (final);
# 5. scf117Receipt.py == tools/integration/fixtures/scf117-live-receipt.json (the census sections only with --census).
set -eu
OUT=${1:?usage: scf117Run.sh <fresh-out-dir> [--census] [<final-rev>]}
CENSUS=${2:-}
FINAL=${3:-HEAD}
[ "$CENSUS" = "--census" ] || { [ -n "$CENSUS" ] && FINAL=$CENSUS; CENSUS=; }
BASE=681da5c10
W=$(pwd)
[ -f "$W/tools/integration/scf117Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
RUN="$OUT/run"
mkdir -p "$RUN"
fail=0
NODE="node --experimental-strip-types --no-warnings"

# 1. archive copies
for t in base final; do
  rev=$BASE; [ "$t" = final ] && rev=$FINAL
  mkdir -p "$OUT/$t"
  git -C .. archive "$rev" workspace | tar -x -C "$OUT/$t"
  ln -s "$W/node_modules" "$OUT/$t/workspace/node_modules"
  mkdir -p "$OUT/$t/workspace/reference" && ln -s "$W/reference/pokeemerald" "$OUT/$t/workspace/reference/pokeemerald"
  cp tools/integration/scf117* tools/integration/sc106LiveShareCensus.ts tools/integration/stat101Exposure.ts "$OUT/$t/workspace/tools/integration/"
  mkdir -p "$OUT/$t/workspace/tools/integration/fixtures/scf117"
  cp -R tools/integration/fixtures/scf117/scenarios tools/integration/fixtures/scf117/live "$OUT/$t/workspace/tools/integration/fixtures/scf117/"
done
echo "final production src $(git rev-parse "$FINAL:workspace/src")"
F="$OUT/final/workspace"

# 2. rung 1 alignment
mkdir -p "$RUN/align"
for sc in on off; do for k in 0 1 2 3; do
  (cd "$F" && $NODE tools/integration/scf117Align.ts --seeds=$((k * 50))..$((k * 50 + 49)) --scene=$sc --out="$RUN/align/$sc-$k.jsonl" > /dev/null) &
done; done
wait
python3 tools/integration/scf117AlignSummary.py "$RUN/align" "$RUN/align-summary.json" | tail -1
grep -q '"nonZeroResidual": 0' "$RUN/align-summary.json" || fail=1

# 3. rung 2: ROM frames + production comparator; dense live bodies after a Growl
sh tools/integration/stat102Run.sh "$OUT/stat102" > "$RUN/stat102.log" 2>&1 || true
tail -1 "$RUN/stat102.log"
grep -q '^ALL SAME' "$RUN/stat102.log" || fail=1
(cd "$F" && $NODE tools/integration/scd112ProductionCompare.ts "$OUT/stat102" "$RUN/compare.json" | tail -1)
(cd "$F" && $NODE tools/integration/scd112ProductionCompare.ts "$OUT/stat102" "$RUN/compare-r2.json" > /dev/null)
cmp -s "$RUN/compare.json" "$RUN/compare-r2.json" && echo "SAME comparator r1 == r2" || { echo "DIFF comparator r1 != r2"; fail=1; }
mkdir -p "$RUN/x2"
for f in tools/integration/fixtures/scf117/live/scf117-fury-cutter-opp-onix-golem-growl-0.json tools/integration/fixtures/scf117/live/scf117-fury-cutter-opp-onix-golem-growl-1.json \
  tools/integration/fixtures/scf117/live/scf117-fury-cutter-opp-onix-golem-growl-3.json tools/integration/fixtures/fury99/live/fury-cutter-pla-scyther-golem-growl-2.json \
  tools/integration/fixtures/fury99/live/fury-cutter-opp-grovyle-blissey-growl-2.json; do
  n=$(basename "$f" .json)
  (cd "$F" && $NODE tools/integration/liveAdapterFramebuffer.ts "$f" > "$RUN/x2/live-$n.json" 2> /dev/null || true) &
done
for n in scf117-fury-cutter-opp-onix-golem-growl-0 scf117-fury-cutter-opp-onix-golem-growl-1; do
  (cd "$OUT/base/workspace" && $NODE tools/integration/liveAdapterFramebuffer.ts "tools/integration/fixtures/scf117/live/$n.json" > "$RUN/x2/base-$n.json" 2> /dev/null || true) &
done
wait

# 4. census
if [ "$CENSUS" = "--census" ]; then
  for t in base final; do
    mkdir -p "$OUT/census-$t"
    for k in 0 1 2 3 4 5 6 7 8 9; do
      (cd "$OUT/$t/workspace" && $NODE tools/integration/sc106LiveShareCensus.ts --seeds=$((k * 100))..$((k * 100 + 99)) \
        --index-from=$((k * 100)) --out="$OUT/census-$t/r$k.json" --commands="$OUT/census-$t/r$k.jsonl" \
        --stats="$OUT/census-$t/s$k.jsonl" > "$OUT/census-$t/r$k.log" 2>&1) &
    done
  done
  wait
  for t in base final; do python3 tools/integration/hist73Merge.py "$OUT/census-$t" "$RUN/merged-$t.json" "$RUN/merged-$t.jsonl" > /dev/null; done
  python3 tools/integration/scf117CensusDelta.py "$OUT/census-base" "$OUT/census-final" "$RUN/census-delta.json" > /dev/null || fail=1
  mkdir -p "$RUN/align-census" "$RUN/exposure"
  for k in 0 1 2 3 4 5 6 7 8 9; do
    for sc in on off; do
      (cd "$F" && $NODE tools/integration/scf117Align.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=$sc --out="$RUN/align-census/$sc-$k.jsonl" > /dev/null) &
    done
    (cd "$F" && $NODE tools/integration/stat101Exposure.ts --seeds=$((k * 100))..$((k * 100 + 99)) --out="$RUN/exposure/e$k.jsonl" > /dev/null) &
  done
  wait
  python3 tools/integration/scf117AlignSummary.py "$RUN/align-census" "$RUN/align-census-summary.json" > /dev/null
  python3 tools/integration/stat101ExposureSummary.py "$RUN/exposure" "$RUN/exposure.json" > /dev/null
fi

# 5. receipt
python3 tools/integration/scf117Receipt.py "$RUN" "$(git rev-parse "$FINAL")" "$RUN/receipt.json" $CENSUS
python3 - "$RUN/receipt.json" tools/integration/fixtures/scf117-live-receipt.json "$CENSUS" <<'PY' || fail=1
import json, sys
a, b = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
keys = [k for k in a if k not in ("testedCodeCommit",) and (sys.argv[3] == "--census" or not k.startswith("census"))]
bad = [k for k in keys if a[k] != b.get(k)]
print("SAME receipt" if not bad else f"DIFF receipt: {bad}")
sys.exit(1 if bad else 0)
PY
[ "$fail" = 0 ] && echo "scf117Run: ALL SAME" || { echo "scf117Run: DIFF"; exit 1; }
