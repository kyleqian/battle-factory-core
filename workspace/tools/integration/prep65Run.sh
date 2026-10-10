#!/bin/sh
# prep65 reproduction (run from workspace/ of a clean checkout; direct mGBA processes only, never the shared HTTP oracles).
#   OUT=<fresh scratch dir> REC=<fresh receipt dir> sh tools/integration/prep65Run.sh   # ~11 min: probes (12 jobs x 2 fresh), 4 census runs
#   SKIP_PROBES=1 ...   reuse $OUT/probe/raw;   SKIP_CENSUS=1 ...   skip the four 300-battle census runs (and the delta / chain / key receipts)
# Writes receipts into $REC and compares them with tools/integration/fixtures/prep65/ (same / DIFF per file). The src experiment is
# applied from the committed .diff and ALWAYS reverted (EXIT trap); `git status --short src` must print nothing afterwards.
set -e
: "${OUT:?set OUT=<scratch dir>}"; : "${REC:?set REC=<receipt dir>}"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
T=tools/integration; F=$T/fixtures/prep65; N="node --experimental-strip-types --no-warnings"
mkdir -p "$OUT" "$REC"
test -z "$(git status --short src)" || { echo "src not clean"; exit 1; }
trap 'git checkout -- src' EXIT
# (1) ROM evidence: prep61's DIVE + HIDDENHIT jobs (12), each twice in fresh mGBA processes with the jobs' explicit lab seeds (A == B is
# required by prep61Extract.py's identicalAB and by prep65Check.ts).
if [ -z "$SKIP_PROBES" ]; then $PY $T/prep61Probe.py "$OUT/probe" --jobs 12 --only DIVE,HIDDENHIT; fi
python3 $T/prep61Extract.py "$OUT/probe" "$REC/units.json" > "$REC/units-summary.txt"; head -1 "$REC/units-summary.txt"
(cd "$REC" && shasum -a 256 units.json) > "$REC/units.sha256"
$N $T/prep65Words.ts "$OUT/probe" "$REC/units.json" "$REC/host-words.json" | tail -1
if [ -z "$SKIP_CENSUS" ]; then
  $N $T/prep61OrderCensus.ts --seeds=0..299 --out="$REC/census-before-seeds0-299.json" --commands="$OUT/census-before.jsonl" \
    --events="$OUT/events-before.jsonl" 2>&1 | tail -1
  $N $T/liveShareCensus.ts --seeds=0..299 --out="$REC/share-before-seeds0-299.json" --commands="$OUT/share-before.jsonl" 2>&1 | tail -1
fi
# (2) the temporary production patch: the ROM check, then the census on the patched tree.
git apply $F/prep65-temp-src.diff
git diff -- src | cmp - $F/prep65-temp-src.diff && echo "patch applies identically"
$N $T/prep65Check.ts "$OUT/probe" "$REC/units.json" "$REC/check.json" | tail -1
if [ -z "$SKIP_CENSUS" ]; then
  $N $T/prep61OrderCensus.ts --seeds=0..299 --out="$REC/census-after-seeds0-299.json" --commands="$OUT/census-after.jsonl" \
    --events="$OUT/events-after.jsonl" 2>&1 | tail -1
  $N $T/liveShareCensus.ts --seeds=0..299 --out="$REC/share-after-seeds0-299.json" --commands="$OUT/share-after.jsonl" 2>&1 | tail -1
fi
git checkout -- src
test -z "$(git status --short src)" && echo "src reverted"
# (3) census delta, chain predictor, key sequence + faithful-random history.
if [ -z "$SKIP_CENSUS" ]; then
  python3 $T/prep43CensusDelta.py "$REC/census-before-seeds0-299.json" "$OUT/census-before.jsonl" \
    "$REC/census-after-seeds0-299.json" "$OUT/census-after.jsonl" "$REC/census-delta-seeds0-299.json" | head -2
  python3 $T/prep45Chains.py "$OUT/census-before.jsonl" "$REC/chains-predict-dive.json" --cleared "body 291 DIVE" \
    --after "$OUT/census-after.jsonl" | sed -n 2,3p
  python3 $T/prep65CensusKeys.py "$REC/share-before-seeds0-299.json" "$OUT/share-before.jsonl" "$REC/share-after-seeds0-299.json" \
    "$OUT/share-after.jsonl" "$REC/census-keys-seeds0-299.json" | head -1
fi
for f in "$REC"/*.json "$REC"/*.txt "$REC"/*.sha256; do
  b=$(basename "$f"); [ "$b" = units.json ] && continue
  cmp -s "$f" "$F/$b" && echo "same  $b" || echo "DIFF  $b"
done
