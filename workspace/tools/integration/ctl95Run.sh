#!/bin/sh
# ctl95 reproduction (run from workspace/; docs/ctl95-doll-free-controls.md): the doll labs' doll-free control residuals, classified, on THIS
# checkout's code.
#  1. ctl95Scenarios.py regenerates tools/integration/fixtures/ctl95/scenarios (cmp'd: "same scenarios" / "DIFF scenarios");
#  2. fresh direct-mGBA probes, twice (r1 == r2 gated): ctl95Probe.py (prep40Probe.py with a 40-row RGB tail) on doll90's Recover /
#     GrassWhistle controls, the doll81 Focus Punch att / Iron Tail def labs, the doll81 GrassWhistle-opponent / self-Recover doll labs and
#     every ctl95 scenario; doll90Personality.py (twice) on the doll labs;
#  3. ctl95ControlCheck.ts per move (Recover at shift 0 = the doll labs' activation framing AND shift 10 = production's accepted window;
#     GrassWhistle / Iron Tail / Focus Punch at 0) -> <out>/rec/ctl; attdollLiveCheck.ts (speciesAudit14SwapCheck.ts --personalities) on
#     the doll labs -> <out>/rec/att; ctl95Summary.py -> <out>/summary.tsv, cmp'd with tools/integration/fixtures/ctl95/receipts/summary.tsv;
#  4. --census: liveShareCensus.ts seeds 0..999 as 10 --index-from shards on git-archive copies of BASE and HEAD, hist73Merge.py,
#     land82CensusCheck.py + prep43CensusDelta.py (ctl95CensusPair.py: stalled-battle tails paired) -> <out>/census-check.txt,
#     <out>/census-delta.json, <out>/census-prep43.json.
# The out dir must be INSIDE the repo (the probe tools find ../oracle from there).
# usage: sh tools/integration/ctl95Run.sh <fresh-out-dir> [--census]
set -e
OUT=${1:?usage: ctl95Run.sh <fresh-out-dir> [--census]}; [ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)"; exit 2; }
BASE=d46da5755; WS=$PWD; FX=$WS/tools/integration/fixtures/ctl95; D90=$WS/tools/integration/fixtures/doll90/scenarios; D81=$WS/tools/integration/fixtures/doll81/scenarios
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd); PR=$OUT/probes; REC=$OUT/rec; mkdir -p "$PR" "$OUT/pers" "$REC/ctl" "$REC/att" "$OUT/scenarios"
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py; PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
NODE="node --experimental-strip-types --no-warnings"
echo "code $(git rev-parse HEAD) src $(git rev-parse HEAD:workspace/src) dirty-src $(git status --short src | wc -l | tr -d ' ')"
python3 tools/integration/ctl95Scenarios.py "$OUT/scenarios" > /dev/null
diff -r "$OUT/scenarios" "$FX/scenarios" > /dev/null && echo "same scenarios" || echo "DIFF scenarios"
C90="doll90-ctl-recover-opponent doll90-ctl-recover-opponent-golbat doll90-ctl-grass-whistle-opponent doll90-ctl-grass-whistle-opponent-golbat"
C81="doll81-att-focus-punch-opponent doll81-att-focus-punch-opponent-golbat doll81-def-iron-tail-opponent doll81-def-iron-tail-opponent-golbat"
A81="doll81-att-grass-whistle-opponent doll81-att-grass-whistle-opponent-golbat doll81-self-recover-opponent doll81-self-recover-opponent-golbat doll81-self-recover-player doll81-self-recover-player-gengar"
C95=$(cut -f1 "$FX/scenarios/list.tsv")
{ for s in $C90; do echo "$D90 $s"; done; for s in $C81 $A81; do echo "$D81 $s"; done; for s in $C95; do echo "$FX/scenarios $s"; done; } > "$OUT/jobs.txt"
while read -r d s; do for r in 1 2; do echo "$d $s $r"; done; done < "$OUT/jobs.txt" | xargs -P 8 -n 3 sh -c \
  'python3 tools/run-mgba-probe.py "'"$PR"'/$1-r$2.json" -- "'"$PY"'" tools/integration/ctl95Probe.py 40 "$0/$1.json" "'"$PR"'/$1-r$2.json" "'"$PR"'/$1-r$2-rgb" > "'"$PR"'/$1-r$2.out" 2>&1 || true'
# run-mgba-probe.py may exit 138 / 139: rerun a crashed job once
while read -r d s; do for r in 1 2; do [ -s "$PR/$s-r$r.json" ] || python3 tools/run-mgba-probe.py "$PR/$s-r$r.json" -- "$PY" tools/integration/ctl95Probe.py 40 "$d/$s.json" "$PR/$s-r$r.json" "$PR/$s-r$r-rgb" > "$PR/$s-r$r.out" 2>&1 || true; done; done < "$OUT/jobs.txt"
n=0; while read -r d s; do cmp -s "$PR/$s-r1.json" "$PR/$s-r2.json" && n=$((n + 1)) || echo "DIFF $s"; done < "$OUT/jobs.txt"; echo "probes: $n scenarios r1 == r2 byte-identical"
for s in $A81 ctl95-att-gw-opponent-crobat-wailord; do d=$D81; case $s in ctl95-*) d=$FX/scenarios;; esac; for r in 1 2; do echo "$d $s $r"; done; done | xargs -P 8 -n 3 sh -c \
  'python3 tools/run-mgba-probe.py "'"$OUT"'/pers/$1-r$2.json" -- "'"$PY"'" tools/integration/doll90Personality.py "$0/$1.json" "'"$OUT"'/pers/$1-r$2.json" > /dev/null 2>&1 || true'
for s in $A81 ctl95-att-gw-opponent-crobat-wailord; do cmp -s "$OUT/pers/$s-r1.json" "$OUT/pers/$s-r2.json" || echo "personality DIFF $s"; done
CHK=tools/integration/ctl95ControlCheck.ts
$NODE $CHK --scenarios="$D90" --move=RECOVER --shift=0 --out="$REC/ctl/recover-doll90-shift0.json" "$PR" doll90-ctl-recover-opponent doll90-ctl-recover-opponent-golbat > /dev/null
$NODE $CHK --scenarios="$D90" --move=RECOVER --shift=10 --out="$REC/ctl/recover-doll90-shift10.json" "$PR" doll90-ctl-recover-opponent doll90-ctl-recover-opponent-golbat > /dev/null
$NODE $CHK --scenarios="$FX/scenarios" --move=RECOVER --shift=10 --out="$REC/ctl/recover-ctl95-shift10.json" "$PR" ctl95-recover-player-persian ctl95-recover-player-golbat > /dev/null
$NODE $CHK --scenarios="$D90" --move=GRASS_WHISTLE --out="$REC/ctl/grass-whistle-doll90.json" "$PR" doll90-ctl-grass-whistle-opponent doll90-ctl-grass-whistle-opponent-golbat > /dev/null
$NODE $CHK --scenarios="$FX/scenarios" --move=GRASS_WHISTLE --out="$REC/ctl/grass-whistle-ctl95.json" "$PR" ctl95-gw-opponent-gengar ctl95-gw-opponent-crobat ctl95-gw-player-persian ctl95-gw-player-gengar > /dev/null
$NODE $CHK --scenarios="$D81" --move=FOCUS_PUNCH --out="$REC/ctl/focus-punch-doll81.json" "$PR" doll81-att-focus-punch-opponent doll81-att-focus-punch-opponent-golbat > /dev/null
$NODE $CHK --scenarios="$FX/scenarios" --move=FOCUS_PUNCH --out="$REC/ctl/focus-punch-ctl95.json" "$PR" ctl95-fp-opponent-persian ctl95-fp-opponent-golbat ctl95-fp-opponent-breloom ctl95-fp-player-persian ctl95-fp-player-gengar > /dev/null
$NODE $CHK --scenarios="$D81" --move=IRON_TAIL --body=0 --out="$REC/ctl/iron-tail-doll81.json" "$PR" doll81-def-iron-tail-opponent doll81-def-iron-tail-opponent-golbat > /dev/null
$NODE $CHK --scenarios="$FX/scenarios" --move=IRON_TAIL --out="$REC/ctl/iron-tail-ctl95.json" "$PR" ctl95-it-opponent-persian ctl95-it-opponent-golbat ctl95-it-player-persian ctl95-it-player-gengar > /dev/null
for s in $A81; do S14_SCENARIOS=$D81 $NODE tools/integration/speciesAudit14SwapCheck.ts --personalities="$OUT/pers" --out="$REC/att/$s.json" "$PR" "$s" > /dev/null; done
S14_SCENARIOS=$FX/scenarios $NODE tools/integration/speciesAudit14SwapCheck.ts --personalities="$OUT/pers" --out="$REC/att/ctl95-att-gw-opponent-crobat-wailord.json" "$PR" ctl95-att-gw-opponent-crobat-wailord > /dev/null
python3 tools/integration/ctl95Summary.py "$REC" > "$OUT/summary.tsv"
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
  python3 tools/integration/ctl95CensusPair.py "$OUT/census/base.json" "$OUT/census/base.jsonl" "$OUT/census/final.json" "$OUT/census/final.jsonl" \
    "$OUT/census-prep43.json" > "$OUT/census-prep43.txt"
  for f in census-delta.json census-check.txt census-prep43.json; do cmp -s "$OUT/$f" "$FX/receipts/$f" && echo "same $f" || echo "DIFF $f"; done
fi
