#!/bin/sh
# Live audit 23 reproduction (docs/live-audit-23.md; run from workspace/; direct mGBA only, never the shared HTTP oracles; evidence only).
#   sh tools/integration/audit23Run.sh <receipt-dir> <scratch-dir>      (both FRESH caller-given dirs INSIDE the repo; nothing is deleted)
# Everything runs inside a git-archive copy of the FIXED base 32eb03d65 (tonight's folds ctl95 / doll90 / land96 / fury99 merged;
# <scratch-dir>/tree/workspace, inside the repo so the probes find ../oracle) with this checkout's audit23* tools copied in; outputs go to
# the RELATIVE root a23/ inside the copy, so fixtures / receipts name identical paths across runs. Production src is never patched (no
# temp patch: audit 23 found no production defect).
#  m  (the production-host chain check, live audits 19..22's method):
#     1. audit23Stage.py (gw / it / fc / mm labs, lab seed 305420351) -> audit23Probes.py (audit20Probe.py + an 8-frame RGB tail; a crashed
#        probe is rerun once) -> audit20Fixtures.py -> audit23Align.py --moves=<the folds' moves> (the ACCEPTED windows: GrassWhistle 225
#        rows) -> audit22Level.py (the level ablation);
#     2. audit23Check.ts per scenario (the history replayed through the production hosts as the orchestrator does, the consumer request
#        from its own kernel arguments; CHAIN = the claim, ENTRY = the no-history control; two more fresh probe processes, r1 == r2):
#        check (aligned), level (levelled fixtures, the CLEFFA route), fixreq (AUDIT23_FIXTURE_REQUEST=1 on the Fury Cutter routes: the
#        ablation without the orchestrator's counter argument);
#  d  (the doll cells, doll90 / ctl95's instruments): audit23DollStage.py (doll81-format labs, lab seed 305419897) -> prep40Probe.py
#     (self / att) / prep38Probe.py (def) twice (r1 == r2 gated), doll90Personality.py twice -> speciesAudit14SwapCheck.ts
#     --personalities (attdollLiveCheck.ts: every swap composite + tail rows) / audit23DollDefFixtures.py + prep38Check.ts (Psych Up
#     control shift 0, doll test at the control's shift) / ctl95ControlCheck.ts (the plain Double Team opponent first bodies at shift 0 =
#     attdoll's activation framing and shift 1 = production's accepted framing);
#  3. audit22Summary.py / doll90Summary.py -> summaries; byte comparison of every receipt with tools/integration/fixtures/audit-23/.
set -e
[ $# -ge 2 ] || { echo "usage: audit23Run.sh <receipt-dir> <scratch-dir>"; exit 2; }
REC=$1; T=$2; W=tools/integration/fixtures/audit-23; BASE=32eb03d65
[ ! -e "$REC" ] && [ ! -e "$T" ] || { echo "give FRESH dirs"; exit 2; }
mkdir -p "$REC" "$T"
REC=$(cd "$REC" && pwd); T=$(cd "$T" && pwd); WS=$PWD
J=${AUDIT23_JOBS:-8}
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
mkdir -p "$T/tree"
git -C .. archive "$BASE" workspace/ | tar -x -C "$T/tree"
C=$T/tree/workspace
ln -s "$WS/node_modules" "$C/node_modules"; ln -s "$WS/reference" "$C/reference"; ln -s "$WS/artifacts" "$C/artifacts"
cp tools/integration/audit23*.py tools/integration/audit23*.ts "$C/tools/integration/"
cd "$C"
echo "base $BASE src $(git -C "$WS/.." rev-parse "$BASE:workspace/src")"
O=a23
# ---- m: stage, probe, derive, align, level
python3 tools/integration/audit23Stage.py $O/m/sc > /dev/null
AUDIT20_JOBS=$J python3 tools/integration/audit23Probes.py $O/m/probe $O/m/sc/*.json > $O/m-probes.txt
for s in $O/m/sc/*.json; do
  [ -s $O/m/probe/$(basename $s) ] || python3 tools/integration/audit23Probes.py $O/m/probe $s >> $O/m-probes.txt
done
mkdir -p "$REC/m/check" "$REC/m/level" "$REC/m/fixreq" "$REC/d"
python3 tools/integration/audit20Fixtures.py $O/m/probe $O/m/fx0 $O/m/sc > "$REC/m/derive.txt"
python3 tools/integration/audit23Align.py $O/m/fx0 $O/m/chk --moves=GRASS_WHISTLE,IRON_TAIL,FURY_CUTTER,MEMENTO
python3 tools/integration/audit22Level.py $O/m/chk $O/m/lvl
names() { ls "$1" | grep -E "$2" | sed 's/-c[0-9]*\.json$//' | sort -u; }
{
  for n in $(names $O/m/chk .); do echo "0 $O/m/chk $n m/check"; done
  echo "0 $O/m/lvl pb-a23fc-ply-sandslash-cleffa-growl m/level"
  for n in $(names $O/m/chk a23fc); do echo "1 $O/m/chk $n m/fixreq"; done
} > $O/jobs.txt
mkdir -p $O/logs
xargs -n 4 -P "$J" sh -c 'AUDIT23_FIXTURE_REQUEST=$([ "$0" = 1 ] && echo 1 || echo 0) node --experimental-strip-types --no-warnings \
  tools/integration/audit23Check.ts "$1" "$2" "'"$REC"'/$3/check-$2.json" > "a23/logs/$(echo $3 | tr / -)-$2.log" 2>&1 || echo "FAILED $3 $2"' < $O/jobs.txt
# ---- d: doll cells
python3 tools/integration/audit23DollStage.py $O/d/sc > /dev/null
mkdir -p $O/d/probes $O/d/pers
probe() { p=prep40Probe.py; [ "$3" = def ] && p=prep38Probe.py
  python3 tools/run-mgba-probe.py $O/d/probes/$1-r$2.json -- $PY tools/integration/$p $O/d/sc/$1.json $O/d/probes/$1-r$2.json $O/d/probes/$1-r$2-rgb \
    > $O/d/probes/$1-r$2.out 2>&1 || true; }
while IFS='	' read -r s mv id side u f fam; do for r in 1 2; do echo "$s $r $fam"; done; done < $O/d/sc/list.tsv | xargs -P "$J" -n 3 sh -c \
  'p=prep40Probe.py; [ "$2" = def ] && p=prep38Probe.py; python3 tools/run-mgba-probe.py a23/d/probes/$0-r$1.json -- '"$PY"' tools/integration/$p \
   a23/d/sc/$0.json a23/d/probes/$0-r$1.json a23/d/probes/$0-r$1-rgb > a23/d/probes/$0-r$1.out 2>&1 || true'
# run-mgba-probe.py may exit 138 / 139: rerun a crashed (empty) job once
while IFS='	' read -r s mv id side u f fam; do for r in 1 2; do [ -s $O/d/probes/$s-r$r.json ] || probe $s $r $fam; done; done < $O/d/sc/list.tsv
n=0; for s in $(cut -f1 $O/d/sc/list.tsv); do [ -s $O/d/probes/$s-r1.json ] && cmp -s $O/d/probes/$s-r1.json $O/d/probes/$s-r2.json && n=$((n + 1)) || echo "DIFF $s"; done \
  > "$REC/d/probes-cmp.txt"; echo "doll probes: $n scenarios r1 == r2 byte-identical" >> "$REC/d/probes-cmp.txt"
SELF=$(awk -F'\t' '$7 != "def" {print $1}' $O/d/sc/list.tsv); DEF=$(awk -F'\t' '$7 == "def" {print $1}' $O/d/sc/list.tsv)
for s in $SELF; do for r in 1 2; do echo "$s $r"; done; done | xargs -P "$J" -n 2 sh -c \
  'python3 tools/run-mgba-probe.py a23/d/pers/$0-r$1.json -- '"$PY"' tools/integration/doll90Personality.py a23/d/sc/$0.json a23/d/pers/$0-r$1.json > /dev/null 2>&1 || true'
for s in $SELF; do for r in 1 2; do [ -s $O/d/pers/$s-r$r.json ] || python3 tools/run-mgba-probe.py $O/d/pers/$s-r$r.json -- $PY tools/integration/doll90Personality.py \
  $O/d/sc/$s.json $O/d/pers/$s-r$r.json > /dev/null 2>&1 || true; done; done
for s in $SELF; do cmp -s $O/d/pers/$s-r1.json $O/d/pers/$s-r2.json || echo "personality DIFF $s"; done >> "$REC/d/probes-cmp.txt"
mkdir -p "$REC/d/rec/att" "$REC/d/rec/def/control" "$REC/d/rec/def/test" "$REC/d/pers"
echo $SELF | tr ' ' '\n' | xargs -P "$J" -n 1 sh -c 'S14_SCENARIOS=a23/d/sc node --experimental-strip-types --no-warnings tools/integration/speciesAudit14SwapCheck.ts \
  --personalities=a23/d/pers --out="'"$REC"'/d/rec/att/$0.json" a23/d/probes "$0" > a23/logs/d-$0.log 2>&1 || echo "FAILED d $0"'
python3 tools/integration/audit23DollDefFixtures.py $O/d/sc $O/d/probes $O/d/def $DEF > "$REC/d/def-fixtures.txt"
for f in $O/d/def/*-control.json; do node --experimental-strip-types --no-warnings tools/integration/prep38Check.ts --probes=$O/d/probes \
  --out="$REC/d/rec/def/control/$(basename $f)" --shift=0 $f > /dev/null; done
for f in $O/d/def/*-test.json; do node --experimental-strip-types --no-warnings tools/integration/prep38Check.ts --probes=$O/d/probes \
  --out="$REC/d/rec/def/test/$(basename $f)" --shifts="$REC/d/rec/def/control" $f > /dev/null; done
for s in 0 1; do node --experimental-strip-types --no-warnings tools/integration/ctl95ControlCheck.ts --scenarios=$O/d/sc --move=DOUBLE_TEAM --shift=$s --body=0 \
  --personalities=$O/d/pers --out="$REC/d/dt-plain-shift$s.json" $O/d/probes audit23-self-double-team-opponent-sneasel-magcargo \
  audit23-self-double-team-opponent-yanma-snorlax > "$REC/d/dt-plain-shift$s.txt"; done
for s in $SELF; do cp $O/d/pers/$s-r1.json "$REC/d/pers/"; done
# ---- summaries, fixtures, scenarios
for d in m/check m/level m/fixreq; do python3 tools/integration/audit22Summary.py "$REC/$d" > "$REC/summary-$(echo $d | tr / -).txt"; done
python3 tools/integration/doll90Summary.py "$REC/d/rec" > "$REC/summary-doll.tsv"
mkdir -p "$REC/fixtures/chk" "$REC/fixtures/lvl" "$REC/fixtures/def" "$REC/scenarios/m" "$REC/scenarios/d"
cp $O/m/chk/*.json "$REC/fixtures/chk/"; cp $O/m/lvl/pb-a23fc-ply-sandslash-cleffa-growl-*.json "$REC/fixtures/lvl/"; cp $O/d/def/*.json "$REC/fixtures/def/"
cp $O/m/sc/*.json "$REC/scenarios/m/"; cp $O/d/sc/*.json $O/d/sc/list.tsv "$REC/scenarios/d/"
cd "$WS"
for f in $(cd "$REC" && find . -type f | sort); do
  if [ -f "$W/$f" ] && cmp -s "$REC/$f" "$W/$f"; then echo "same $f"; else echo "DIFF $f"; fi
done > "$T/compare.txt"
echo "receipts: $(grep -c '^same' "$T/compare.txt") same, $(grep -c '^DIFF' "$T/compare.txt") DIFF (vs $W; $T/compare.txt)"
tail -1 "$REC"/summary-m-*.txt; grep -c "px 0/0" "$REC/summary-doll.tsv"; tail -1 "$REC/d/probes-cmp.txt"
