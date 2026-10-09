#!/bin/sh
# prep50 reproduction (run from workspace/ of a clean checkout; direct mGBA processes only, never the shared HTTP oracles).
#   OUT=/tmp/p50-repro REC=/tmp/p50-rec sh tools/integration/prep50Run.sh   # ~5 min: probes (35 jobs x 2 fresh), census x2
#   SKIP_PROBES=1 ...   reuse $OUT/raw;   SKIP_CENSUS=1 ...   skip the two 300-battle census runs
# Writes receipts into $REC; compare with tools/integration/fixtures/prep50/ (the loop at the end prints same/DIFF per file).
# The src experiment is applied from the committed .diff and ALWAYS reverted; `git status --short src` must print nothing.
set -e
: "${OUT:?set OUT=<scratch dir>}"; : "${REC:?set REC=<receipt dir>}"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
T=tools/integration; F=$T/fixtures/prep50; N="node --experimental-strip-types --no-warnings"
STATUS=SLP,CONFUSION,PSN,PRZ,BRN
mkdir -p "$OUT" "$REC"
test -z "$(git status --short src)" || { echo "src is not clean"; exit 1; }
trap 'git checkout -- src' EXIT
if [ -z "$SKIP_PROBES" ]; then $PY $T/prep50Probe.py "$OUT" --jobs 10 | grep -v ' ok$' || true; fi
python3 $T/prep50Extract.py "$OUT" "$REC/status-net-zero-audit.json" | head -5
if [ -z "$SKIP_CENSUS" ]; then
  census() { $N $T/prep50AllocatorCensus.ts --seeds=0..299 --out="$1" --commands="$2" 2>&1 | tail -1; }
  census "$REC/census-before-seeds0-299.json" "$OUT/census-before.jsonl"
  python3 $T/prep50Chains.py "$OUT/census-before.jsonl" "$REC/chains-before-seeds0-299.json" > /dev/null
  python3 $T/prep50Chains.py "$OUT/census-before.jsonl" "$REC/chains-predict-status.json" --cleared-status $STATUS | sed -n 2p
  git apply $F/prep50-temp-src.diff
  census "$REC/census-after-seeds0-299.json" "$OUT/census-after.jsonl"
  git checkout -- src
  python3 $T/prep43CensusDelta.py "$REC/census-before-seeds0-299.json" "$OUT/census-before.jsonl" \
    "$REC/census-after-seeds0-299.json" "$OUT/census-after.jsonl" "$REC/census-delta-seeds0-299.json" | head -2
  python3 $T/prep50Chains.py "$OUT/census-after.jsonl" "$REC/chains-after-seeds0-299.json" > /dev/null
fi
git checkout -- src
test -z "$(git status --short src)" && echo "src reverted"
for f in "$REC"/*.json; do cmp -s "$f" "$F/$(basename "$f")" && echo "same  $(basename "$f")" || echo "DIFF  $(basename "$f")"; done
