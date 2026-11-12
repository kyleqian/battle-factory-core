#!/bin/sh
# hist73 reproduction (docs/next-adapters-hist73.md). Run from workspace/ of a checkout whose src/ is clean; direct mGBA processes only
# (never the shared HTTP oracles). Everything is written under the FRESH <out-dir> (refused if it exists and is non-empty); nothing is
# removed outside it. The temporary src patches are applied ONLY to git-archive copies under <out-dir>; the checkout never changes.
#   sh tools/integration/hist73Run.sh <fresh-out-dir>                 # ~20 min on 16 cores: probes (A 154 + B 10 scenarios x 2) + 6 censuses
#   SKIP_PROBES=1 / SKIP_CENSUS=1 sh tools/integration/hist73Run.sh <dir>   # skip the mGBA probes / the seeds 0..999 censuses
# Receipts land in <out-dir>/rec and are compared byte-for-byte with tools/integration/fixtures/hist73/ (same / DIFF per file).
set -e
OUT=${1:?usage: hist73Run.sh <fresh-out-dir>}
if [ -e "$OUT" ] && [ -n "$(ls -A "$OUT" 2>/dev/null)" ]; then echo "refusing: $OUT exists and is not empty"; exit 1; fi
mkdir -p "$OUT/rec"; OUT=$(cd "$OUT" && pwd)
WS=$(pwd); T=tools/integration; F=$T/fixtures/hist73; N="node --experimental-strip-types --no-warnings"
export PYTHONPATH=${PYTHONPATH:-${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py}
PY=${PY:-${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python}
test -z "$(git status --short src)" || { echo "src is not clean"; exit 1; }
REC=$OUT/rec
IDS=$(python3 -c "import json; print(','.join(str(u['key']) for u in sorted(json.load(open('$F/net-zero-audit.json'))['units'], key=lambda u: u['key'])))")

# shards <workdir> <tool> <shard-dir>: seeds 0..999 as 10 --index-from shards in parallel (battle ids / streaks equal one 0..999 run)
shards() {
  mkdir -p "$3"
  for i in 0 1 2 3 4 5 6 7 8 9; do a=$((i * 100)); b=$((a + 99))
    (cd "$1" && $N $T/$2 --seeds=$a..$b --index-from=$a --out="$3/r$i.json" --commands="$3/r$i.jsonl" > "$3/r$i.log" 2>&1) &
  done
  wait
}
copy() {  # copy <dir> <diff>: git-archive copy of HEAD + this checkout's hist73 tools + the temp patch
  mkdir -p "$1"; git archive HEAD | tar -x -C "$1"; cp $T/hist73* "$1/$T/"; ln -s "$WS/node_modules" "$1/node_modules"
  [ -z "$2" ] || (cd "$1" && patch -s -p1 < "$WS/$2")
}

if [ -z "$SKIP_PROBES" ]; then
  $PY $T/hist73Probe.py "$OUT/probeA" --jobs 12
  $PY $T/hist73HiddenProbe.py "$OUT/probeB" --jobs 10
fi
if [ -d "$OUT/probeA" ]; then python3 $T/hist73Extract.py "$OUT/probeA" "$REC/net-zero-audit.json" | grep -v '^NET-ZERO ' || true; fi
if [ -d "$OUT/probeB" ]; then python3 $T/hist73HiddenExtract.py "$OUT/probeB" "$REC/hidden-battler-audit.json" | tail -1; fi

if [ -z "$SKIP_CENSUS" ]; then
  # PART A: allocator chains on master, the predictor, master vs the Part A patch, the residual chains after it
  shards "$WS" hist73AllocatorCensus.ts "$OUT/chains-before"
  python3 $T/hist73Merge.py "$OUT/chains-before" "$REC/chains-census-before-seeds0-999.json" "$OUT/chains-before.jsonl"
  python3 $T/hist73Chains.py "$OUT/chains-before.jsonl" "$REC/chains-before-seeds0-999.json" > /dev/null
  python3 $T/hist73Chains.py "$OUT/chains-before.jsonl" "$REC/chains-predict.json" --cleared "$IDS" | sed -n 2p
  python3 $T/hist73ReseedBlockers.py "$OUT/chains-before.jsonl" "$REC/reseed-blockers-before.json" > /dev/null
  copy "$OUT/copyA" "$F/hist73-partA-temp-src.diff"
  copy "$OUT/copyB" "$F/hist73-partB-temp-src.diff"
  copy "$OUT/copyAB" "$F/hist73-partA-temp-src.diff"; (cd "$OUT/copyAB" && patch -s -p1 < "$WS/$F/hist73-partB-temp-src.diff")
  shards "$WS" hist73LiveShareCensus.ts "$OUT/census-before"
  shards "$OUT/copyA" hist73LiveShareCensus.ts "$OUT/censusA-after"
  shards "$OUT/copyB" hist73LiveShareCensus.ts "$OUT/censusB-after"
  shards "$OUT/copyAB" hist73LiveShareCensus.ts "$OUT/censusAB-after"
  python3 $T/hist73Merge.py "$OUT/census-before" "$REC/census-before-seeds0-999.json" "$OUT/census-before.jsonl"
  for P in A B AB; do
    python3 $T/hist73Merge.py "$OUT/census$P-after" "$REC/census$P-after-seeds0-999.json" "$OUT/census$P-after.jsonl"
    python3 $T/hist73KeyCheck.py "$REC/census-before-seeds0-999.json" "$OUT/census-before.jsonl" \
      "$REC/census$P-after-seeds0-999.json" "$OUT/census$P-after.jsonl" > "$REC/keycheck-part$P.txt" || true
    tail -1 "$REC/keycheck-part$P.txt"
    python3 $T/prep43CensusDelta.py "$REC/census-before-seeds0-999.json" "$OUT/census-before.jsonl" \
      "$REC/census$P-after-seeds0-999.json" "$OUT/census$P-after.jsonl" "$REC/census$P-delta-seeds0-999.json" | sed -n 2p
  done
  python3 $T/hist73PartBCases.py "$REC/chains-census-before-seeds0-999.json" "$OUT/census-before.jsonl" "$OUT/censusB-after.jsonl" \
    "$REC/partB-cases.json" > /dev/null
  shards "$OUT/copyA" hist73AllocatorCensus.ts "$OUT/chains-after"
  python3 $T/hist73Merge.py "$OUT/chains-after" "$REC/chains-census-after-seeds0-999.json" "$OUT/chains-after.jsonl"
  python3 $T/hist73Chains.py "$OUT/chains-after.jsonl" "$REC/chains-after-seeds0-999.json" > /dev/null
  python3 $T/hist73ReseedBlockers.py "$OUT/chains-after.jsonl" "$REC/reseed-blockers-after.json" > /dev/null
fi
test -z "$(git status --short src)" && echo "checkout src unchanged"
for f in "$REC"/*; do cmp -s "$f" "$F/$(basename "$f")" && echo "same  $(basename "$f")" || echo "DIFF  $(basename "$f")"; done
