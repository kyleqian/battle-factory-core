#!/bin/sh
# prep43 reproduction (run from workspace/ of a clean checkout; direct mGBA processes only, never the shared HTTP oracles).
#   OUT=/tmp/p43-repro REC=/tmp/p43-rec sh tools/integration/prep43Run.sh     # ~8 min: probes (63 jobs x A/B), checks, replays, census x3
#   SKIP_PROBES=1 ...   reuse $OUT/raw;   SKIP_CENSUS=1 ...   skip the three 200-battle census runs
# Writes receipts into $REC (compare with tools/integration/fixtures/prep43/: `diff -r` must be silent apart from files skipped).
# The src experiments are applied from the committed .diff files and ALWAYS reverted; `git status --short src` must print nothing.
set -e
: "${OUT:?set OUT=<scratch dir>}"; : "${REC:?set REC=<receipt dir>}"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
T=tools/integration; F=$T/fixtures/prep43; N="node --experimental-strip-types --no-warnings"
mkdir -p "$OUT" "$REC"
test -z "$(git status --short src)" || { echo "src is not clean"; exit 1; }
trap 'git checkout -- src' EXIT
if [ -z "$SKIP_PROBES" ]; then python3 $T/prep43Probe.py "$OUT" --jobs 12; fi
python3 $T/prep43Extract.py "$OUT" "$REC/units.json"
$N $T/prep43Check.ts "$REC/units.json" "$REC/check.json"
# before: master src
$N $T/prep43CorpusReplay.ts "$REC/replay-before.json" > /dev/null
$N $T/spriteOrderCrossBodyCorpusReplay.ts | head -1 > "$REC/corpus-replay-unmodified-tool-before.json"
if [ -z "$SKIP_CENSUS" ]; then
  $N $T/liveShareCensus.ts --seeds=0..199 --out="$REC/census-before-seeds0-199.json" --commands="$OUT/census-before.jsonl" > /dev/null
fi
# after: the temporary prep43 patch
git apply $F/prep43-temp-src.diff
$N $T/prep43CorpusReplay.ts "$REC/replay-after.json" > /dev/null
$N $T/spriteOrderCrossBodyCorpusReplay.ts | head -1 > "$REC/corpus-replay-unmodified-tool-after.json"
if [ -z "$SKIP_CENSUS" ]; then
  $N $T/liveShareCensus.ts --seeds=0..199 --out="$REC/census-after-seeds0-199.json" --commands="$OUT/census-after.jsonl" > /dev/null
  # + the locked-turn experiment (measured zero delta)
  git apply $F/prep43-temp-src-locked-incremental.diff
  $N $T/liveShareCensus.ts --seeds=0..199 --out="$REC/census-after-locked-seeds0-199.json" --commands="$OUT/census-after-locked.jsonl" > /dev/null
fi
git checkout -- src
test -z "$(git status --short src)" && echo "src reverted"
if [ -z "$SKIP_CENSUS" ]; then
  python3 $T/prep43CensusDelta.py "$REC/census-before-seeds0-199.json" "$OUT/census-before.jsonl" \
    "$REC/census-after-seeds0-199.json" "$OUT/census-after.jsonl" "$REC/census-delta-seeds0-199.json" | head -2
  cmp -s "$OUT/census-after.jsonl" "$OUT/census-after-locked.jsonl" && echo "locked-turn experiment: commands identical to the patch alone"
fi
for f in "$REC"/*.json; do cmp -s "$f" "$F/$(basename "$f")" && echo "same  $(basename "$f")" || echo "DIFF  $(basename "$f")"; done
