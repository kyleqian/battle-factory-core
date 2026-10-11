#!/bin/sh
# doll81 reproduction (run from workspace/): Substitute-doll cells, evidence only (docs/next-adapters-doll81.md).
#  1. git-archive copies of the FIXED base 1e2f48b8a (src cdae97b8) -> <out>/base, base + the temporary patch
#     tools/integration/fixtures/doll81/doll81-cells.diff -> <out>/patched, and base + doll81-explore.diff (every candidate cell, the
#     exploratory framing; it measures the residuals of the excluded cells) -> <out>/explore (never the live checkout; node_modules symlinked);
#  2. fresh direct-mGBA probes of every doll81 scenario, twice (doll81Probes.sh; r1 == r2 gated) [PROBES=<dir> reuses a probe dir];
#  3. attacker-doll windows (attdollLiveCheck.ts via speciesAudit14SwapCheck.ts) on patched + base; defender-doll windows
#     (doll81DefFixtures.py -> prep38Check.ts: control calibrated, Psych Up / Dig at shift 0; test at the control shift) on patched + base;
#  4. doll81Summary.py -> <out>/summary.tsv (patched) and <out>/summary-explore.tsv (explore), the four related test files on the
#     patched copy -> <out>/pins.txt;
#  5. --census: liveShareCensus.ts seeds 0..999 on base and patched (one process each), prep43CensusDelta.py + the command KEY sequence /
#     battleDigestExcludingFrames identity -> <out>/census-delta.json, <out>/census-check.txt.
# Every output is cmp'd with the committed tools/integration/fixtures/doll81/receipts/ ("same" / "DIFF").
# usage: sh tools/integration/land82Run.sh <fresh-out-dir> [--census]
set -e
OUT=${1:?usage: land82Run.sh <fresh-out-dir> [--census]}; [ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)"; exit 2; }
BASE=b05d384ca; WS=$PWD; FX=$WS/tools/integration/fixtures/doll81
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
NODE="node --experimental-strip-types --no-warnings"
for t in base patched explore; do
  mkdir -p "$OUT/$t"
  git -C "$(git rev-parse --show-toplevel)" archive --format=tar $BASE workspace/src workspace/tests workspace/tools workspace/package.json \
    workspace/tsconfig.json workspace/vite.config.ts | tar -x -C "$OUT/$t" --strip-components=1
  ln -s "$WS/node_modules" "$OUT/$t/node_modules"
done
patch -s -p1 -d "$OUT/patched" < "$FX/doll81-cells.diff"
patch -s -p1 -d "$OUT/explore" < "$FX/doll81-explore.diff"
echo "base $(git rev-parse $BASE) src $(git rev-parse $BASE:workspace/src); patch sha256 $(shasum -a 256 < "$FX/doll81-cells.diff" | cut -c1-16)"
PR=${PROBES:-$OUT/probes}
[ -n "$PROBES" ] || OUT="$PR" sh tools/integration/doll81Probes.sh | tail -2
PR=$(cd "$PR" && pwd)
export S14_SCENARIOS=$FX/scenarios PR
LIST=$FX/scenarios/list.tsv
for t in patched base explore; do
  d=$OUT/rec/att; [ $t = base ] && d=$OUT/rec/att-base; [ $t = explore ] && d=$OUT/rec-explore/att; mkdir -p "$d"; export d
  (cd "$OUT/$t" && awk -F'\t' '$7 != "def" {print $1}' "$LIST" | xargs -P 14 -n 1 sh -c \
    '$0 --experimental-strip-types --no-warnings tools/integration/speciesAudit14SwapCheck.ts --out="$d/$1.json" "$PR" "$1" > /dev/null 2>&1 || echo "FAIL $1"' node)
done
python3 tools/integration/doll81DefFixtures.py "$PR" "$OUT/def-derived" > "$OUT/def-fixtures.txt"
mkdir -p "$OUT/rec/def/control" "$OUT/rec/def/test" "$OUT/rec/def/fallback"
for f in "$OUT"/def-derived/*-control.json; do
  case $f in *psych-up*|*-dig-*) a=--shift=0;; *) a=--calibrate;; esac
  echo "$f $a"
done | (cd "$OUT/patched" && xargs -P 14 -n 2 sh -c 'node --experimental-strip-types --no-warnings tools/integration/prep38Check.ts --probes="$PR" --out="$(dirname "$0")/../rec/def/control/$(basename "$0")" $1 "$0" > /dev/null 2>&1 || echo "FAIL $0"')
mkdir -p "$OUT/rec-explore/def/test"
for t in patched base explore; do
  k=rec/def/test; [ $t = base ] && k=rec/def/fallback; [ $t = explore ] && k=rec-explore/def/test; export k OUTD=$OUT
  ls "$OUT"/def-derived/*-test.json | (cd "$OUT/$t" && xargs -P 14 -n 1 sh -c 'node --experimental-strip-types --no-warnings tools/integration/prep38Check.ts --probes="$PR" --out="$OUTD/$k/$(basename "$0")" --shifts="$OUTD/rec/def/control" "$0" > /dev/null 2>&1 || echo "FAIL $0"')
done
cp -R "$OUT/rec/att-base" "$OUT/rec-explore/att-base"; cp -R "$OUT/rec/def/control" "$OUT/rec/def/fallback" "$OUT/rec-explore/def/"
python3 tools/integration/doll81Summary.py "$OUT/rec" > "$OUT/summary.tsv"
python3 tools/integration/doll81Summary.py "$OUT/rec-explore" > "$OUT/summary-explore.tsv"
(cd "$OUT/patched" && npx vitest run tests/substituteSwapPresentation.test.ts tests/substituteDollAdapterDecline.test.ts \
  tests/substituteDollDefenderLive.test.ts tests/substituteSwapAttdollCells.test.ts > "$OUT/pins.log" 2>&1 || true)
grep -E "^ FAIL |Tests  " "$OUT/pins.log" | sed 's/ *([0-9]*ms)//; s/ *[0-9.]*m\{0,1\}s$//' > "$OUT/pins.txt"
if [ "$2" = --census ]; then
  for t in base patched; do
    (cd "$OUT/$t" && $NODE --max-old-space-size=4096 tools/integration/liveShareCensus.ts --seeds=0..999 --out="$OUT/census-$t.json" \
      --commands="$OUT/census-$t.jsonl" > "$OUT/census-$t.log" 2>&1) &
  done
  wait
  python3 tools/integration/doll81CensusCheck.py "$OUT/census-base.json" "$OUT/census-base.jsonl" "$OUT/census-patched.json" \
    "$OUT/census-patched.jsonl" "$OUT/census-delta.json" > "$OUT/census-check.txt"
fi
for f in summary.tsv summary-explore.tsv pins.txt census-delta.json census-check.txt; do
  [ -e "$OUT/$f" ] || continue
  cmp -s "$OUT/$f" "$FX/receipts/$f" && echo "same $f" || echo "DIFF $f"
done
