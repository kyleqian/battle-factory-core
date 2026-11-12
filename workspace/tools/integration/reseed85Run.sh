#!/bin/sh
# reseed85 reproduction (docs/next-adapters-reseed85.md). Run from workspace/ of a checkout whose src/ is clean; direct mGBA processes only
# (never the shared HTTP oracles). Everything is written under the FRESH <out-dir> (refused if it exists and is non-empty); nothing is
# removed outside it. The temp src patch is applied ONLY to a git-archive copy of the FIXED base aeaa33dff under <out-dir>; the checkout never
# changes. The copies get this checkout's reseed85 tools + scenarios and symlinks to node_modules / reference (the probes read the ROM there).
#   sh tools/integration/reseed85Run.sh <fresh-out-dir>                 # probes (13 x 2 probes x 2 runs) + windows (base + patched) + 5 parity routes
#   RESEED85_CENSUS=1 sh tools/integration/reseed85Run.sh <dir>         # + the seeds 0..999 censuses (base / patched, allocator chains)
# Receipts land in <out-dir>/rec and are compared byte-for-byte with tools/integration/fixtures/reseed85/ (same / DIFF per file).
set -e
OUT=${1:?usage: reseed85Run.sh <fresh-out-dir>}
if [ -e "$OUT" ] && [ -n "$(ls -A "$OUT" 2>/dev/null)" ]; then echo "refusing: $OUT exists and is not empty"; exit 1; fi
mkdir -p "$OUT/rec"; OUT=$(cd "$OUT" && pwd)
WS=$(pwd); T=tools/integration; F=$T/fixtures/reseed85; N="node --experimental-strip-types --no-warnings"; BASE=aeaa33dff
export PYTHONPATH=${PYTHONPATH:-${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py}
PY=${PY:-${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python}
test -z "$(git status --short src)" || { echo "src is not clean"; exit 1; }
REC=$OUT/rec

copy() {  # copy <dir> [patch]: git-archive copy of the base + this checkout's reseed85 tools / scenarios + symlinks + the temp patch
  mkdir -p "$1"; git -C .. archive "$BASE" workspace | tar -x -C "$1" --strip-components=1
  cp $T/reseed85* "$1/$T/"; mkdir -p "$1/$F"; cp -R "$F/scenarios" "$1/$F/"
  ln -s "$WS/node_modules" "$1/node_modules"; ln -s "$(cd "$WS/reference" && pwd -P)" "$1/reference"
  [ -z "$2" ] || (cd "$1" && patch -s -p1 < "$WS/$2")
}
# shards <workdir> <tool> <shard-dir>: seeds 0..999 as 10 --index-from shards in parallel (battle ids / streaks equal one 0..999 run)
shards() {
  mkdir -p "$3"
  for i in 0 1 2 3 4 5 6 7 8 9; do a=$((i * 100)); b=$((a + 99))
    (cd "$1" && $N $T/$2 --seeds=$a..$b --index-from=$a --out="$3/r$i.json" --commands="$3/r$i.jsonl" > "$3/r$i.log" 2>&1) &
  done
  wait
}

# ROM: occupancy audit (P1) and the window fixtures
$PY $T/reseed85Probe.py "$OUT/probe" --jobs "${RESEED85_JOBS:-12}"
python3 $T/reseed85Occupancy.py "$OUT/probe" "$REC/occupancy-audit.json" | head -1
(cd "$OUT/probe/raw" && for f in *-A.json; do b=${f%-A.json}; if cmp -s "$f" "$b-B.json"; then echo "same $b"; else echo "DIFF $b"; fi; done) > "$REC/probes-r1r2.txt"
python3 $T/reseed85Fixtures.py "$OUT/probe/raw" "$OUT/fx" > /dev/null
rm -rf "$OUT"/probe/rgb-*

# windows: the production live renderer in the base copy and in the patched copy (two fresh flat77Probe runs per scenario each)
copy "$OUT/base"
copy "$OUT/pat" "$F/reseed85-temp-src.diff"
ls "$OUT/fx" | sed 's/-c[0-9]*\.json$//' | sort -u > "$OUT/scenarios.txt"
for W in base pat; do mkdir -p "$OUT/check-$W"; done
for W in base pat; do
  (cd "$OUT/$W" && xargs -n 1 -P "${RESEED85_CHECK_JOBS:-7}" sh -c \
    "$N $T/reseed85Check.ts '$OUT/fx' \"\$0\" '$OUT/check-$W/check-'\"\$0\"'.json' > '$OUT/check-$W/'\"\$0\"'.log' 2>&1" < "$OUT/scenarios.txt") &
done
wait
python3 $T/reseed85Windows.py "$OUT/check-base" "$OUT/check-pat" "$REC/windows.json" | head -1
# Scene ON vs OFF parity (flat77Parity.ts = land75Parity's controller) on 5 census routes whose consumers go live through the shadow
for s in 11 98 420 384 785; do
  (cd "$OUT/pat" && $N $T/flat77Parity.ts --seed=$s --streak=$(( (s * 11) % 49 )) --out="$REC/parity-$s.json" > "$OUT/parity-$s.log" 2>&1) &
done
wait

if [ -n "$RESEED85_CENSUS" ]; then
  shards "$OUT/base" hist73LiveShareCensus.ts "$OUT/census-base"
  shards "$OUT/pat" hist73LiveShareCensus.ts "$OUT/census-pat"
  python3 $T/hist73Merge.py "$OUT/census-base" "$REC/census-base-seeds0-999.json" "$OUT/census-base.jsonl" | tail -1
  python3 $T/hist73Merge.py "$OUT/census-pat" "$REC/census-patched-seeds0-999.json" "$OUT/census-pat.jsonl" | tail -1
  python3 $T/hist73KeyCheck.py "$REC/census-base-seeds0-999.json" "$OUT/census-base.jsonl" \
    "$REC/census-patched-seeds0-999.json" "$OUT/census-pat.jsonl" > "$REC/keycheck.txt" || true
  tail -1 "$REC/keycheck.txt"
  python3 $T/reseed85Digests.py "$OUT/census-base" "$OUT/census-pat" > "$REC/digests.txt"; tail -1 "$REC/digests.txt"
  python3 $T/prep43CensusDelta.py "$REC/census-base-seeds0-999.json" "$OUT/census-base.jsonl" \
    "$REC/census-patched-seeds0-999.json" "$OUT/census-pat.jsonl" "$REC/census-delta-seeds0-999.json" | sed -n 2p
  shards "$OUT/base" hist73AllocatorCensus.ts "$OUT/chains-base"
  shards "$OUT/pat" hist73AllocatorCensus.ts "$OUT/chains-pat"
  for W in base pat; do
    python3 $T/hist73Merge.py "$OUT/chains-$W" "$REC/chains-census-$W-seeds0-999.json" "$OUT/chains-$W.jsonl" > /dev/null
    python3 $T/hist73Chains.py "$OUT/chains-$W.jsonl" "$REC/chains-$W-seeds0-999.json" > /dev/null
    python3 $T/hist73ReseedBlockers.py "$OUT/chains-$W.jsonl" "$REC/reseed-blockers-$W.json" > /dev/null
  done
  mv "$REC/chains-census-pat-seeds0-999.json" "$REC/chains-census-patched-seeds0-999.json"
  mv "$REC/chains-pat-seeds0-999.json" "$REC/chains-patched-seeds0-999.json"
  mv "$REC/reseed-blockers-pat.json" "$REC/reseed-blockers-patched.json"
fi
test -z "$(git status --short src)" && echo "checkout src unchanged"
for f in "$REC"/*; do cmp -s "$f" "$F/$(basename "$f")" && echo "same  $(basename "$f")" || echo "DIFF  $(basename "$f")"; done
