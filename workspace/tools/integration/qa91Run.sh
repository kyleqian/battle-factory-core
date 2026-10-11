#!/bin/sh
# qa91 reproduction (run from workspace/; direct mGBA only, never the shared HTTP oracles). Both dirs FRESH, caller-given.
#   sh tools/integration/qa91Run.sh <receipt-dir> <scratch-dir>
# 1. RAM x2 (qa91X2Probe.py) on audit 21's PIDGEOTTO / NIDORINA -> ONIX and NIDORINA -> NIDORINO scenarios, two runs, r1 == r2 (== x2/);
# 2. audit21Check.ts with THIS tree's production code: audit 21's 6 player Quick Attack scenarios (fixtures/audit-21/fixtures -> qa/) and
#    cast83's 16 aligned scenarios (fixtures/audit-21/c83-aligned -> castform/);
# 3. the opponent-side Quick Attack controls: qa91Stage.py (== scenarios/), audit19Probes.py, qa91Fixtures.py (== fixtures/), then
#    audit21Check.ts on this tree (-> opp/) and on a git-archive copy of 27b43d26d (src e7a4775e = base 5af9bdb51's; -> opp-before/);
# 4. summaries, and a byte comparison with tools/integration/fixtures/qa91/.
set -e
[ $# -ge 2 ] || { echo "usage: qa91Run.sh <receipt-dir> <scratch-dir>"; exit 2; }
REC=$1; T=$2; Q=tools/integration/fixtures/qa91; A=tools/integration/fixtures/audit-21
[ ! -e "$REC" ] && [ ! -e "$T" ] || { echo "give FRESH dirs"; exit 2; }
mkdir -p "$REC/x2" "$REC/qa" "$REC/castform" "$REC/opp" "$REC/opp-before" "$T"
REC=$(cd "$REC" && pwd); T=$(cd "$T" && pwd)
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
for r in r1 r2; do for n in a21-qa-ply-pidgeotto-onix a21-qa-ply-nidorina-onix a21-qa-ply-nidorina-nidorino; do echo "$n $r"; done; done |
  xargs -n 2 -P 6 sh -c 'python3 tools/run-mgba-probe.py "'"$T"'/x2-$0-$1.json" -- '"$PY"' tools/integration/qa91X2Probe.py \
    '"$A"'/scenarios/$0.json "'"$T"'/x2-$0-$1.json" > /dev/null 2>&1 || true'
for n in a21-qa-ply-pidgeotto-onix a21-qa-ply-nidorina-onix a21-qa-ply-nidorina-nidorino; do
  cmp "$T/x2-$n-r1.json" "$T/x2-$n-r2.json" && cp "$T/x2-$n-r1.json" "$REC/x2/$n.json"; done
python3 tools/integration/qa91Stage.py "$T/sc"
diff -r "$T/sc" $Q/scenarios > /dev/null && echo "staged scenarios == committed" || { echo "staged scenarios differ"; exit 1; }
AUDIT19_JOBS=4 python3 tools/integration/audit19Probes.py "$T/oppprobe" $Q/scenarios/*.json
python3 tools/integration/qa91Fixtures.py "$T/oppprobe" "$T/fx" > "$REC/derive-opp.txt"
diff -r "$T/fx" $Q/fixtures > /dev/null && echo "derived fixtures == committed" || echo "WARNING: derived fixtures differ (ROM drift, ISSUES #154?)"
mkdir -p "$T/tree-before"; git archive 27b43d26d | tar -x -C "$T/tree-before"; ln -s "$PWD/node_modules" "$T/tree-before/node_modules"
jobs() {
  for n in $(ls $A/fixtures/a21-qa-*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename); do
    echo "tools/integration/audit21Check.ts $A/fixtures $n qa"; done
  for n in $(ls $A/c83-aligned/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename); do
    echo "tools/integration/audit21Check.ts $A/c83-aligned $n castform"; done
  for n in $(ls $Q/fixtures/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename); do
    echo "tools/integration/audit21Check.ts $Q/fixtures $n opp"; echo "$T/tree-before/tools/integration/audit21Check.ts $Q/fixtures $n opp-before"; done
}
jobs | xargs -n 4 -P "${QA91_JOBS:-11}" sh -c 'node --experimental-strip-types --no-warnings "$0" "$1" "$2" "'"$REC"'/$3/check-$2.json" \
  > "'"$T"'/$3-$2.log" 2>&1 || echo "FAILED $3 $2"'
for d in qa castform opp opp-before; do python3 tools/integration/audit21Summary.py "$REC/$d" > "$REC/summary-$d.txt"; done
for d in x2 qa castform opp opp-before; do diff -r "$REC/$d" $Q/$d > /dev/null && echo "$d == committed" || echo "$d DIFFERS"; done
for d in qa castform opp opp-before; do cmp -s "$REC/summary-$d.txt" $Q/summary-$d.txt && echo "summary-$d == committed" || echo "summary-$d DIFFERS"; done
