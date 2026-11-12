#!/bin/sh
# doll90 reproduction (run from workspace/; docs/doll90-doll-cells.md): Substitute-doll residual cells, batch 2, on THIS checkout's code.
#  1. fresh direct-mGBA probes, twice (r1 == r2 gated): the doll81 scenarios of the landed cells (Psych Up def, Double Team self, Sing att)
#     + the doll90 scenarios (doll-free controls: GrassWhistle / Sing / Recover opponent; the predicted Sing pairs CROBAT <-> WAILORD);
#     doll90Personality.py (gPlayerParty / gEnemyParty personalities, twice) and dt60Probe.py (Double Team clone RAM) per Double Team lab;
#  2. Psych Up: doll81DefFixtures.py -> prep38Check.ts (controls shift 0, tests at the control shift); swap windows: attdollLiveCheck.ts via
#     speciesAudit14SwapCheck.ts --personalities; doll-free controls (doll90 scenarios) the same way;
#  3. doll90Summary.py -> <out>/summary.tsv, cmp'd with tools/integration/fixtures/doll90/receipts/summary.tsv ("same" / "DIFF");
#  4. --census: liveShareCensus.ts seeds 0..999 as 10 --index-from shards on a git-archive copy of BASE and of HEAD, hist73Merge.py,
#     land82CensusCheck.py -> <out>/census-delta.json, <out>/census-check.txt (cmp'd with the committed receipts).
# The out dir must be INSIDE the repo (the probe tools find ../oracle from there). usage: sh tools/integration/doll90Run.sh <fresh-out-dir> [--census]
set -e
OUT=${1:?usage: doll90Run.sh <fresh-out-dir> [--census]}; [ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)"; exit 2; }
BASE=d46cdfff1; WS=$PWD; FX=$WS/tools/integration/fixtures/doll90; D81=$WS/tools/integration/fixtures/doll81/scenarios
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd); PR=$OUT/probes; REC=$OUT/rec
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py; PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
NODE="node --experimental-strip-types --no-warnings"
echo "code $(git rev-parse HEAD) src $(git rev-parse HEAD:workspace/src) dirty-src $(git status --short src | wc -l | tr -d ' ')"
DEF="doll81-def-psych-up-player doll81-def-psych-up-player-gengar doll81-def-psych-up-opponent doll81-def-psych-up-opponent-golbat"
DT="doll81-self-double-team-player doll81-self-double-team-player-gengar doll81-self-double-team-opponent doll81-self-double-team-opponent-golbat"
SING="doll81-att-sing-player doll81-att-sing-player-gengar doll81-att-sing-opponent doll81-att-sing-opponent-golbat"
OUT="$PR" sh tools/integration/doll81Probes.sh $DEF $DT $SING | tail -1
N90=$(cut -f1 "$FX/scenarios/list.tsv")
for s in $N90; do for r in 1 2; do echo "$s $r"; done; done | xargs -P 8 -n 2 sh -c \
  'python3 tools/run-mgba-probe.py "'"$PR"'/$0-r$1.json" -- "'"$PY"'" tools/integration/prep40Probe.py "'"$FX"'/scenarios/$0.json" "'"$PR"'/$0-r$1.json" "'"$PR"'/$0-r$1-rgb" > "'"$PR"'/$0-r$1.out" 2>&1 || true'
n=0; for s in $N90; do cmp -s "$PR/$s-r1.json" "$PR/$s-r2.json" && n=$((n + 1)) || echo "DIFF $s"; done; echo "doll90 probes: $n scenarios r1 == r2 byte-identical"
mkdir -p "$OUT/pers" "$OUT/dt"
for s in $DT $SING; do for r in 1 2; do echo "$s $r"; done; done | xargs -P 8 -n 2 sh -c \
  'python3 tools/run-mgba-probe.py "'"$OUT"'/pers/$0-r$1.json" -- "'"$PY"'" tools/integration/doll90Personality.py "'"$D81"'/$0.json" "'"$OUT"'/pers/$0-r$1.json" > /dev/null 2>&1 || true'
for s in $DT $SING; do cmp -s "$OUT/pers/$s-r1.json" "$OUT/pers/$s-r2.json" || echo "personality DIFF $s"; done
for s in $DT; do python3 tools/run-mgba-probe.py "$OUT/dt/$s.json" -- "$PY" tools/integration/dt60Probe.py "$D81/$s.json" "$OUT/dt/$s.json" 4 > /dev/null 2>&1 || true; done
python3 tools/integration/doll81DefFixtures.py "$PR" "$OUT/def-derived" $DEF > "$OUT/def-fixtures.txt"
mkdir -p "$REC/def/control" "$REC/def/test" "$REC/att" "$REC/ctl"
for f in "$OUT"/def-derived/*-control.json; do $NODE tools/integration/prep38Check.ts --probes="$PR" --out="$REC/def/control/$(basename "$f")" --shift=0 "$f" > /dev/null; done
for f in "$OUT"/def-derived/*-test.json; do $NODE tools/integration/prep38Check.ts --probes="$PR" --out="$REC/def/test/$(basename "$f")" --shifts="$REC/def/control" "$f" > /dev/null; done
for s in $DT $SING; do S14_SCENARIOS=$D81 $NODE tools/integration/speciesAudit14SwapCheck.ts --personalities="$OUT/pers" --out="$REC/att/$s.json" "$PR" "$s" > /dev/null; done
for s in $N90; do d=ctl; case $s in doll90-att-*) d=att;; esac
  S14_SCENARIOS=$FX/scenarios $NODE tools/integration/speciesAudit14SwapCheck.ts --out="$REC/$d/$s.json" "$PR" "$s" > /dev/null; done
python3 tools/integration/doll90Summary.py "$REC" > "$OUT/summary.tsv"
cmp -s "$OUT/summary.tsv" "$FX/receipts/summary.tsv" && echo "same summary.tsv" || echo "DIFF summary.tsv"
if [ "$2" = --census ]; then
  for t in base final; do
    mkdir -p "$OUT/census/$t-tree" "$OUT/census/$t"; rev=HEAD; [ $t = base ] && rev=$BASE
    git -C "$(git rev-parse --show-toplevel)" archive --format=tar $rev workspace/src workspace/tests workspace/tools workspace/package.json \
      workspace/tsconfig.json workspace/vite.config.ts | tar -x -C "$OUT/census/$t-tree" --strip-components=1
    ln -s "$WS/node_modules" "$OUT/census/$t-tree/node_modules"
  done
  for t in base final; do (cd "$OUT/census/$t-tree" && for i in 0 1 2 3 4 5 6 7 8 9; do a=$((i * 100)); b=$((a + 99))
    $NODE --max-old-space-size=4096 tools/integration/liveShareCensus.ts --seeds=$a..$b --index-from=$a --out="$OUT/census/$t/r$i.json" \
      --commands="$OUT/census/$t/r$i.jsonl" > "$OUT/census/$t/r$i.log" 2>&1 & done; wait); done
  for t in base final; do python3 tools/integration/hist73Merge.py "$OUT/census/$t" "$OUT/census/$t.json" "$OUT/census/$t.jsonl" > /dev/null; done
  python3 tools/integration/land82CensusCheck.py "$OUT/census/base" "$OUT/census/base.json" "$OUT/census/base.jsonl" "$OUT/census/final" \
    "$OUT/census/final.json" "$OUT/census/final.jsonl" "$OUT/census-delta.json" > "$OUT/census-check.txt"
  for f in census-delta.json census-check.txt; do cmp -s "$OUT/$f" "$FX/receipts/$f" && echo "same $f" || echo "DIFF $f"; done
fi
