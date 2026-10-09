#!/bin/sh
# prep52 reproduction (run from workspace/ of a clean checkout; direct mGBA processes only, never the shared HTTP oracles).
#   OUT=/tmp/p52-repro REC=/tmp/p52-rec sh tools/integration/prep52Run.sh   # ~11 min: probes (150 scenarios x 2 fresh), census x3
#   SKIP_PROBES=1 ...   reuse $OUT/raw;   SKIP_CENSUS=1 ...   skip the two 300-battle census runs
# Writes receipts into $REC; compares each with tools/integration/fixtures/prep52/ (prints same/DIFF per file).
# The src experiment is applied from the committed .diff and ALWAYS reverted; `git status --short src` must print nothing.
# The FRZ seeds in prep52Probe.py came from: $PY tools/integration/prep52FrzSearch.py <dir> [--snorlax]   (not a receipt)
set -e
: "${OUT:?set OUT=<scratch dir>}"; : "${REC:?set REC=<receipt dir>}"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
T=tools/integration; F=$T/fixtures/prep52; N="node --experimental-strip-types --no-warnings"
STATUS=FRZ,INFATUATION,CURSED,NIGHTMARE
mkdir -p "$OUT" "$REC"
test -z "$(git status --short src)" || { echo "src is not clean"; exit 1; }
trap 'git checkout -- src' EXIT
if [ -z "$SKIP_PROBES" ]; then $PY $T/prep52Probe.py "$OUT" --jobs 12; fi
python3 $T/prep52Extract.py "$OUT" "$REC/net-zero-audit.json" | grep -v '^NET-ZERO  ' || true
python3 $T/prep52GeneralScan.py "$OUT" "$REC/general-animation-scan.json" > /dev/null
if [ -z "$SKIP_CENSUS" ]; then
  IDS=$(python3 -c "import json; d = json.load(open('$F/net-zero-audit.json')); print(','.join(str(u['key']) for u in sorted(d['units'], key=lambda u: str(u['key'])) if isinstance(u['key'], int) and u['verdict'] == 'NET-ZERO'))")
  census() { $N $T/prep52AllocatorCensus.ts --seeds=0..299 --out="$1" --commands="$2" 2>&1 | tail -1; }
  census "$REC/census-before-seeds0-299.json" "$OUT/census-before.jsonl"
  python3 $T/prep52Chains.py "$OUT/census-before.jsonl" "$REC/chains-before-seeds0-299.json" > /dev/null
  python3 $T/prep52Chains.py "$OUT/census-before.jsonl" "$REC/chains-predict.json" --cleared "$IDS" --cleared-status $STATUS | sed -n 2p
  git apply $F/prep52-temp-src.diff
  census "$REC/census-after-seeds0-299.json" "$OUT/census-after.jsonl"
  git checkout -- src
  python3 $T/prep43CensusDelta.py "$REC/census-before-seeds0-299.json" "$OUT/census-before.jsonl" \
    "$REC/census-after-seeds0-299.json" "$OUT/census-after.jsonl" "$REC/census-delta-seeds0-299.json" | head -2
  python3 $T/prep52Chains.py "$OUT/census-after.jsonl" "$REC/chains-after-seeds0-299.json" > /dev/null
  # Residual attribution: a third census (patched) with --reseed-detail (only commandDigest differs from census-after).
  git apply $F/prep52-temp-src.diff
  $N $T/prep52AllocatorCensus.ts --seeds=0..299 --reseed-detail --out="$OUT/resid-after.json" --commands="$OUT/resid-after.jsonl" 2>&1 | tail -1
  git checkout -- src
  python3 $T/prep52Residual.py "$OUT/resid-after.jsonl" "$REC/residual-after-patch.json" | head -1
fi
git checkout -- src
test -z "$(git status --short src)" && echo "src reverted"
for f in "$REC"/*.json; do cmp -s "$f" "$F/$(basename "$f")" && echo "same  $(basename "$f")" || echo "DIFF  $(basename "$f")"; done
