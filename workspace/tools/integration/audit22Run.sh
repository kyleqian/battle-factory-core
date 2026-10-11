#!/bin/sh
# Live audit 22 reproduction (docs/live-audit-22.md; run from workspace/; direct mGBA only, never the shared HTTP oracles; evidence only).
#   sh tools/integration/audit22Run.sh <receipt-dir> <scratch-dir>      (both FRESH caller-given dirs; nothing is deleted outside them)
# Everything runs inside a git-archive copy of the FIXED base 9df9b234a (<scratch-dir>/tree/workspace, inside the repo so the probes find
# ../oracle) with this checkout's audit22* tools copied in; outputs go to the RELATIVE root a22/ inside the copy, so the fixtures' scenario
# paths are identical across runs. Production src is never patched (no temp patch: audit 22 found no production defect).
#  1. ret88's two Double Team consumer scenarios (ret88ConsumerStage.py) + audit22Stage.py (dt / rw / dc) + audit22FlatterStage.py (ff):
#     audit20Probes.py (a crashed probe is rerun once), audit20Fixtures.py, ret88Rekey.py (consumers; --returns: ReturnWeak bodies),
#     audit22Align.py (Double Team ageOffset -1 = production's accepted framing); dt60Probe.py RAM data[3] for ret88's DT scenarios.
#  2. audit22ReseedProbe.py (land87 reseed routes, win A / B) -> audit22ReseedFixtures.py -> audit22Level.py (the level ablation).
#  3. checks (two more fresh probe processes per scenario, r1 == r2): audit22Check.ts (raw + aligned DT, consumers, returns, ff),
#     reseed85Check.ts (reseed raw + level) -> audit22Summary.py; production step counters (audit22StepCounter.ts).
#  4. byte comparison of every receipt and derived fixture with tools/integration/fixtures/audit-22/ (same / DIFF per file).
set -e
[ $# -ge 2 ] || { echo "usage: audit22Run.sh <receipt-dir> <scratch-dir>"; exit 2; }
REC=$1; T=$2; W=tools/integration/fixtures/audit-22; BASE=9df9b234a
[ ! -e "$REC" ] && [ ! -e "$T" ] || { echo "give FRESH dirs"; exit 2; }
mkdir -p "$REC" "$T"
REC=$(cd "$REC" && pwd); T=$(cd "$T" && pwd); WS=$PWD
J=${AUDIT22_JOBS:-8}
VPY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
mkdir -p "$T/tree"
git -C .. archive "$BASE" workspace/ | tar -x -C "$T/tree"
C=$T/tree/workspace
ln -s "$WS/node_modules" "$C/node_modules"; ln -s "$WS/reference" "$C/reference"; ln -s "$WS/artifacts" "$C/artifacts"
cp tools/integration/audit22*.py tools/integration/audit22*.ts "$C/tools/integration/"
cd "$C"
O=a22
python3 tools/integration/ret88ConsumerStage.py $O/r88 > /dev/null
mkdir -p $O/dt/sc && cp $O/r88/pb-ret88-opp-double-team.json $O/r88/pb-ret88-ply-double-team.json $O/dt/sc/
python3 tools/integration/audit22Stage.py $O/a/sc > /dev/null
python3 tools/integration/audit22FlatterStage.py $O/ff/sc > /dev/null
for fam in dt a ff; do
  AUDIT20_JOBS=$J python3 tools/integration/audit20Probes.py $O/$fam/probe $O/$fam/sc/*.json > $O/$fam-probes.txt
  for s in $O/$fam/sc/*.json; do
    [ -s $O/$fam/probe/$(basename $s) ] || python3 tools/integration/audit20Probes.py $O/$fam/probe $s >> $O/$fam-probes.txt
  done
done
for n in opp ply; do
  python3 tools/run-mgba-probe.py $O/dt/ram-$n.json -- $VPY tools/integration/dt60Probe.py $O/dt/sc/pb-ret88-$n-double-team.json $O/dt/ram-$n.json 3 \
    > /dev/null 2>&1 || [ -s $O/dt/ram-$n.json ] || python3 tools/run-mgba-probe.py $O/dt/ram-$n.json -- $VPY tools/integration/dt60Probe.py \
    $O/dt/sc/pb-ret88-$n-double-team.json $O/dt/ram-$n.json 3 > /dev/null 2>&1 || true
done
$VPY tools/integration/audit22ReseedProbe.py $O/rs > $O/rs-probes.txt
mkdir -p "$REC/ret88-dt" "$REC/a22" "$REC/ff" "$REC/reseed"
python3 tools/integration/audit22Data3.py $O/dt/ram-opp.json $O/dt/ram-ply.json > "$REC/ret88-dt/rom-data3.jsonl"
python3 tools/integration/audit20Fixtures.py $O/dt/probe $O/dt/fx0 $O/dt/sc > "$REC/ret88-dt/derive.txt"
python3 tools/integration/ret88Rekey.py $O/dt/fx0 $O/dt/fx > "$REC/ret88-dt/rekey.txt"
python3 tools/integration/audit22Align.py $O/dt/fx $O/dt/al
python3 tools/integration/audit20Fixtures.py $O/a/probe $O/a/fx0 $O/a/sc > "$REC/a22/derive.txt"
python3 tools/integration/ret88Rekey.py $O/a/fx0 $O/a/fxc > "$REC/a22/rekey-consumers.txt"
python3 tools/integration/ret88Rekey.py $O/a/fx0 $O/a/fxr --returns > "$REC/a22/rekey-returns.txt"
python3 tools/integration/audit22Align.py $O/a/fxc $O/a/alc
python3 tools/integration/audit20Fixtures.py $O/ff/probe $O/ff/fx $O/ff/sc > "$REC/ff/derive.txt"
python3 tools/integration/audit22ReseedFixtures.py $O/rs/raw $O/rs/fx $O/rs/scenarios > "$REC/reseed/derive.txt"
python3 tools/integration/audit22Level.py $O/rs/fx $O/rs/fxl
node --experimental-strip-types --no-warnings tools/integration/audit22StepCounter.ts $O/dt/fx > "$REC/ret88-dt/production-step-counter.jsonl"
node --experimental-strip-types --no-warnings tools/integration/audit22StepCounter.ts $O/a/fxc > "$REC/a22/production-step-counter.jsonl"
names() { ls "$1" | grep -E "$2" | sed 's/-c[0-9]*\.json$//' | sort -u; }
{
  for n in $(names $O/dt/fx .); do echo "audit22Check.ts $O/dt/fx $n ret88-dt/raw"; echo "audit22Check.ts $O/dt/al $n ret88-dt/aligned"; done
  for n in $(names $O/a/fxc a22dt); do echo "audit22Check.ts $O/a/fxc $n a22/raw"; done
  for n in $(names $O/a/alc 'a22dt|a22dc'); do echo "audit22Check.ts $O/a/alc $n a22/aligned"; done
  for n in $(names $O/a/fxr .); do echo "audit22Check.ts $O/a/fxr $n a22/returns"; done
  for n in $(names $O/ff/fx .); do echo "audit22Check.ts $O/ff/fx $n ff/check"; done
  for n in $(names $O/rs/fx .); do echo "reseed85Check.ts $O/rs/fx $n reseed/raw"; echo "reseed85Check.ts $O/rs/fxl $n reseed/level"; done
} > $O/jobs.txt
mkdir -p $O/logs
xargs -n 4 -P "$J" sh -c 'mkdir -p "'"$REC"'/$3"; node --experimental-strip-types --no-warnings "tools/integration/$0" "$1" "$2" "'"$REC"'/$3/check-$2.json" \
  > "a22/logs/$(echo $3 | tr / -)-$2.log" 2>&1 || echo "FAILED $3 $2"' < $O/jobs.txt
for d in ret88-dt/raw ret88-dt/aligned a22/raw a22/aligned a22/returns ff/check reseed/raw reseed/level; do
  python3 tools/integration/audit22Summary.py "$REC/$d" > "$REC/summary-$(echo $d | tr / -).txt"
done
mkdir -p "$REC/fixtures"
for x in dt/fx dt/al a/fxc a/fxr a/alc ff/fx rs/fx rs/fxl; do mkdir -p "$REC/fixtures/$x"; cp $O/$x/*.json "$REC/fixtures/$x/"; done
mkdir -p "$REC/scenarios"; cp $O/dt/sc/*.json $O/a/sc/*.json $O/ff/sc/*.json $O/rs/scenarios/*.json "$REC/scenarios/"
cd "$WS"
for f in $(cd "$REC" && find . -type f | sort); do
  if [ -f "$W/$f" ] && cmp -s "$REC/$f" "$W/$f"; then echo "same $f"; else echo "DIFF $f"; fi
done > "$T/compare.txt"
echo "receipts: $(grep -c '^same' "$T/compare.txt") same, $(grep -c '^DIFF' "$T/compare.txt") DIFF (vs $W; $T/compare.txt)"
tail -1 "$REC"/summary-*.txt
