#!/bin/sh
# prep44 reproduction (run from workspace/ of a clean checkout; direct mGBA processes only, never the shared HTTP oracles).
#   OUT=/tmp/p44-repro REC=/tmp/p44-rec sh tools/integration/prep44Run.sh   # ~7 min: probes (103 jobs x 2 fresh), census x3
#   SKIP_PROBES=1 ...   reuse $OUT/raw;   SKIP_CENSUS=1 ...   skip the three 300-battle census runs
# Writes receipts into $REC; compare with tools/integration/fixtures/prep44/ (the loop at the end prints same/DIFF per file).
# The src experiments are applied from the committed .diff files and ALWAYS reverted; `git status --short src` must print nothing.
set -e
: "${OUT:?set OUT=<scratch dir>}"; : "${REC:?set REC=<receipt dir>}"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
T=tools/integration; F=$T/fixtures/prep44; N="node --experimental-strip-types --no-warnings"
TIER1=24,57,58,60,73,85,89,98,104,157,185,189,196,203,225,240,263,266,322,332,352
ALL=19,24,28,35,52,53,57,58,59,60,73,80,85,86,89,91,98,104,129,133,142,157,173,184,185,189,196,202,203,212,219,225,226,236,240,250,258,263,266,273,282,291,313,315,317,322,332,340,345,352
mkdir -p "$OUT" "$REC"
test -z "$(git status --short src)" || { echo "src is not clean"; exit 1; }
trap 'git checkout -- src' EXIT
python3 $T/prep44Stage.py > /dev/null
git diff --quiet -- $F/scenarios || { echo "staged scenarios differ from the committed ones"; exit 1; }
if [ -z "$SKIP_PROBES" ]; then $PY $T/prep44Probe.py "$OUT" --jobs 10 | grep -v ' ok$' || true; fi
python3 $T/prep44Extract.py "$OUT" "$REC/net-zero-audit.json" | head -1
if [ -z "$SKIP_CENSUS" ]; then
  census() { $N $T/prep44AllocatorCensus.ts --seeds=0..299 --out="$1" --commands="$2" 2>&1 | tail -1; }
  census "$REC/census-before-seeds0-299.json" "$OUT/census-before.jsonl"
  python3 $T/prep44Chains.py "$OUT/census-before.jsonl" "$REC/chains-before-seeds0-299.json" > /dev/null
  python3 $T/prep44Chains.py "$OUT/census-before.jsonl" "$REC/chains-predict-tier1.json" --cleared $TIER1 | sed -n 2p
  python3 $T/prep44Chains.py "$OUT/census-before.jsonl" "$REC/chains-predict-all.json" --cleared $ALL | sed -n 2p
  git apply $F/prep44-temp-src.diff
  census "$REC/census-after-tier1-seeds0-299.json" "$OUT/census-after-tier1.jsonl"
  git checkout -- src
  git apply $F/prep44-temp-src-tier2.diff
  census "$REC/census-after-all-seeds0-299.json" "$OUT/census-after-all.jsonl"
  git checkout -- src
  python3 $T/prep43CensusDelta.py "$REC/census-before-seeds0-299.json" "$OUT/census-before.jsonl" \
    "$REC/census-after-tier1-seeds0-299.json" "$OUT/census-after-tier1.jsonl" "$REC/census-delta-tier1-seeds0-299.json" | head -2
  python3 $T/prep43CensusDelta.py "$REC/census-before-seeds0-299.json" "$OUT/census-before.jsonl" \
    "$REC/census-after-all-seeds0-299.json" "$OUT/census-after-all.jsonl" "$REC/census-delta-all-seeds0-299.json" | head -2
  python3 $T/prep44Chains.py "$OUT/census-after-all.jsonl" "$REC/chains-after-all-seeds0-299.json" > /dev/null
fi
git checkout -- src
test -z "$(git status --short src)" && echo "src reverted"
for f in "$REC"/*.json; do cmp -s "$f" "$F/$(basename "$f")" && echo "same  $(basename "$f")" || echo "DIFF  $(basename "$f")"; done
