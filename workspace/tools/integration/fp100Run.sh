#!/bin/sh
# fp100 reproduction (run from workspace/; docs/fp100-focus-punch-d4.md): Focus Punch 264's age-131 restore lag, a D4 faithful-timing
# entry (liveMoveTimingPolicy.ts 264), on THIS checkout's code.
#  1. fp100Scenarios.py regenerates tools/integration/fixtures/fp100/scenarios (cmp'd: "same scenarios" / "DIFF scenarios");
#  2. fresh direct-mGBA probes, twice (r1 == r2 gated; a crashed job (exit 138 / 139) rerun once): ctl95Probe.py (40-row RGB tail) on
#     the 4 fp100 labs, ctl95's 5 Focus Punch labs and doll81's 4 Focus Punch attacker labs (their doll-free bodies);
#  3. ctl95ControlCheck.ts --move=FOCUS_PUNCH (production live renderer, every row of every doll-free body, both runs) -> <out>/rec;
#     fp100Phase.py (the lag ages of every body from the gRng2Value repeats + production px) -> <out>/phase.tsv, cmp'd with
#     tools/integration/fixtures/fp100/receipts/phase.tsv; the accepted fixtures through liveAdapterFramebuffer.ts -> <out>/accepted-*.json;
#  4. --census (or --census-only): liveShareCensus.ts seeds 0..999 as 10 --index-from shards on git-archive copies of BASE and HEAD,
#     hist73Merge.py, land82CensusCheck.py, ctl95CensusPair.py (+ prep43CensusDelta) and fp100CensusFocus.py -> <out>/census-*.
# The out dir must be INSIDE the repo (the probe tools find ../oracle from there).
# usage: sh tools/integration/fp100Run.sh <fresh-out-dir> [--census | --census-only]
set -e
OUT=${1:?usage: fp100Run.sh <fresh-out-dir> [--census | --census-only]}; [ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)"; exit 2; }
BASE=406bfc999; WS=$PWD; FX=$WS/tools/integration/fixtures
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd); PR=$OUT/probes; REC=$OUT/rec; mkdir -p "$PR" "$REC" "$OUT/scenarios"
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py; PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
echo "code $(git rev-parse HEAD) src $(git rev-parse HEAD:workspace/src) dirty-src $(git status --short src | wc -l | tr -d ' ')"
if [ "$2" != --census-only ]; then
  python3 tools/integration/fp100Scenarios.py "$OUT/scenarios" > /dev/null
  diff -r "$OUT/scenarios" "$FX/fp100/scenarios" > /dev/null && echo "same scenarios" || echo "DIFF scenarios"
  S100="fp100-opponent-machamp-snorlax fp100-opponent-hitmonchan-steelix fp100-player-heracross-lapras fp100-player-machamp-skarmory"
  S95="ctl95-fp-opponent-persian ctl95-fp-opponent-golbat ctl95-fp-opponent-breloom ctl95-fp-player-persian ctl95-fp-player-gengar"
  S81="doll81-att-focus-punch-opponent doll81-att-focus-punch-opponent-golbat doll81-att-focus-punch-player doll81-att-focus-punch-player-gengar"
  { for s in $S100; do echo "$FX/fp100/scenarios $s"; done; for s in $S95; do echo "$FX/ctl95/scenarios $s"; done
    for s in $S81; do echo "$FX/doll81/scenarios $s"; done; } > "$OUT/jobs.txt"
  while read -r d s; do for r in 1 2; do echo "$d $s $r"; done; done < "$OUT/jobs.txt" | xargs -P 8 -n 3 sh -c \
    'python3 tools/run-mgba-probe.py "'"$PR"'/$1-r$2.json" -- "'"$PY"'" tools/integration/ctl95Probe.py 40 "$0/$1.json" "'"$PR"'/$1-r$2.json" "'"$PR"'/$1-r$2-rgb" > "'"$PR"'/$1-r$2.out" 2>&1 || true'
  while read -r d s; do for r in 1 2; do [ -s "$PR/$s-r$r.json" ] || python3 tools/run-mgba-probe.py "$PR/$s-r$r.json" -- "$PY" tools/integration/ctl95Probe.py 40 "$d/$s.json" "$PR/$s-r$r.json" "$PR/$s-r$r-rgb" > "$PR/$s-r$r.out" 2>&1 || true; done; done < "$OUT/jobs.txt"
  n=0; while read -r d s; do cmp -s "$PR/$s-r1.json" "$PR/$s-r2.json" && n=$((n + 1)) || echo "DIFF $s"; done < "$OUT/jobs.txt"; echo "probes: $n scenarios r1 == r2 byte-identical"
  CHK=tools/integration/ctl95ControlCheck.ts
  node --experimental-strip-types --no-warnings $CHK --scenarios="$FX/fp100/scenarios" --move=FOCUS_PUNCH --out="$REC/fp100.json" "$PR" $S100 > /dev/null
  node --experimental-strip-types --no-warnings $CHK --scenarios="$FX/ctl95/scenarios" --move=FOCUS_PUNCH --out="$REC/ctl95.json" "$PR" $S95 > /dev/null
  node --experimental-strip-types --no-warnings $CHK --scenarios="$FX/doll81/scenarios" --move=FOCUS_PUNCH --out="$REC/doll81.json" "$PR" $S81 > /dev/null
  python3 tools/integration/fp100Phase.py "$PR" "$REC/fp100.json" "$REC/ctl95.json" "$REC/doll81.json" -- $S100 $S95 $S81 > "$OUT/phase.tsv"
  cmp -s "$OUT/phase.tsv" "$FX/fp100/receipts/phase.tsv" && echo "same phase.tsv" || echo "DIFF phase.tsv"
  for f in focus-punch-player-breloom-opponent-starmie focus-punch-opponent-breloom-player-starmie; do
    # exits 1 on any residual (the opponent fixture is now the documented other phase, rows 132..147)
    node --experimental-strip-types --no-warnings tools/integration/liveAdapterFramebuffer.ts "tools/compare/fixtures/$f.json" > "$OUT/accepted-$f.json" || true
    python3 -c 'import json,sys; [print("accepted", r["fixture"].split("/")[-1], "run", r["run"], "rows", r["rows"], "duration", r["expectedDuration"], "exact", r["exactRows"], "px", r["residualPixels"], r["digest"][:12]) for r in json.load(open(sys.argv[1]))]' "$OUT/accepted-$f.json"
  done
fi
if [ "$2" = --census ] || [ "$2" = --census-only ]; then
  for t in base final; do
    mkdir -p "$OUT/census/$t-tree" "$OUT/census/$t"; rev=HEAD; [ $t = base ] && rev=$BASE
    git -C "$(git rev-parse --show-toplevel)" archive --format=tar $rev workspace/src workspace/tests workspace/tools workspace/package.json \
      workspace/tsconfig.json workspace/vite.config.ts | tar -x -C "$OUT/census/$t-tree" --strip-components=1
    ln -s "$WS/node_modules" "$OUT/census/$t-tree/node_modules"
  done
  for t in base final; do (cd "$OUT/census/$t-tree" && for i in 0 1 2 3 4 5 6 7 8 9; do a=$((i * 100)); b=$((a + 99))
    node --experimental-strip-types --no-warnings --max-old-space-size=4096 tools/integration/liveShareCensus.ts --seeds=$a..$b --index-from=$a \
      --out="$OUT/census/$t/r$i.json" --commands="$OUT/census/$t/r$i.jsonl" > "$OUT/census/$t/r$i.log" 2>&1 & done; wait) & done; wait
  for t in base final; do python3 tools/integration/hist73Merge.py "$OUT/census/$t" "$OUT/census/$t.json" "$OUT/census/$t.jsonl" > /dev/null; done
  python3 tools/integration/land82CensusCheck.py "$OUT/census/base" "$OUT/census/base.json" "$OUT/census/base.jsonl" "$OUT/census/final" \
    "$OUT/census/final.json" "$OUT/census/final.jsonl" "$OUT/census-delta.json" > "$OUT/census-check.txt" || true
  python3 tools/integration/ctl95CensusPair.py "$OUT/census/base.json" "$OUT/census/base.jsonl" "$OUT/census/final.json" "$OUT/census/final.jsonl" \
    "$OUT/census-prep43.json" > "$OUT/census-prep43.txt" || true
  python3 tools/integration/fp100CensusFocus.py "$OUT/census/base.jsonl" "$OUT/census/final.jsonl" > "$OUT/census-focus.txt" || true
  rm -rf "$OUT/census/base-tree" "$OUT/census/final-tree"
  echo "census: $OUT/census-check.txt $OUT/census-prep43.txt $OUT/census-focus.txt"
fi
