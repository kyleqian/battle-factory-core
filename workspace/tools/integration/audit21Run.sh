#!/bin/sh
# Live audit 21 reproduction (run from workspace/; direct mGBA only, never the shared HTTP oracles; production src is NOT patched: the temp
# patch is applied to a git-archive copy of HEAD inside <scratch-dir>).
#   sh tools/integration/audit21Run.sh <receipt-dir> <scratch-dir>      (both FRESH caller-given dirs; nothing is deleted outside them)
# 1. re-stages the scenarios (== tools/integration/fixtures/audit-21/scenarios/); probes each once (audit19Probes.py), derives the window
#    fixtures (audit21Fixtures.py; == fixtures/) and the ALIGNED copies (audit21Align.py; == aligned/, and cast83's form / ctl windows
#    == c83-aligned/);
# 2. audit21Check.ts (two more fresh probe processes per scenario, r1 == r2) with THIS tree's production code on fixtures/ -> check/,
#    aligned/ -> aligned/, c83-aligned/ -> c83-aligned/ (before);
# 3. the same check from a git-archive copy of HEAD with patches/audit21-castform-residual-keys-lift.diff applied on c83-aligned/ ->
#    c83-aligned-lifted/ (after);
# 4. summaries (audit21Summary.py), lag.txt (issue151Counters.sh), and a byte comparison with the committed receipts/.
set -e
[ $# -ge 2 ] || { echo "usage: audit21Run.sh <receipt-dir> <scratch-dir>"; exit 2; }
REC=$1; T=$2; W=tools/integration/fixtures/audit-21; C=tools/integration/fixtures/cast83
[ ! -e "$REC" ] && [ ! -e "$T" ] || { echo "give FRESH dirs"; exit 2; }
mkdir -p "$REC" "$T"
REC=$(cd "$REC" && pwd); T=$(cd "$T" && pwd)
J=${AUDIT21_JOBS:-12}
C83="c83-sun-ember-by-cfply c83-sun-ember-by-cfopp c83-sun-flamethrower-by-cfply c83-sun-flamethrower-by-cfopp c83-hail-scary-face-at-cfply
 c83-hail-scary-face-at-cfopp c83-ctl-ember-by-cfply c83-ctl-ember-by-cfopp c83-ctl-flamethrower-by-cfply c83-ctl-flamethrower-by-cfopp
 c83-ctl-scary-face-at-cfply c83-ctl-scary-face-at-cfopp"
python3 tools/integration/audit21Stage.py "$T/sc" > /dev/null
diff -r "$T/sc" $W/scenarios > /dev/null && echo "staged scenarios == committed" || { echo "staged scenarios differ"; exit 1; }
AUDIT19_JOBS=$J python3 tools/integration/audit19Probes.py "$T/probe" $W/scenarios/*.json > "$T/probes.txt"
python3 tools/integration/audit21Fixtures.py "$T/probe" "$T/fx" > "$REC/derive.txt"
diff -r "$T/fx" $W/fixtures > "$REC/derive-vs-committed.txt" && echo "derived fixtures == committed" | tee -a "$REC/derive-vs-committed.txt" \
  || echo "WARNING: derived fixtures differ (ROM drift, ISSUES #154?): $REC/derive-vs-committed.txt"
python3 tools/integration/audit21Align.py $W/fixtures "$T/al"
python3 tools/integration/audit21Align.py $C/fixtures "$T/c83al" $C83
diff -r "$T/al" $W/aligned > /dev/null && diff -r "$T/c83al" $W/c83-aligned > /dev/null && echo "aligned fixtures == committed" \
  || { echo "aligned fixtures differ"; exit 1; }
mkdir -p "$T/tree"
git archive HEAD | tar -x -C "$T/tree"
ln -s "$PWD/node_modules" "$T/tree/node_modules"
patch -s -p1 -d "$T/tree" < $W/patches/audit21-castform-residual-keys-lift.diff
jobs() {
  for n in $(ls $W/fixtures/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename); do
    echo "tools/integration/audit21Check.ts $W/fixtures $n check"; echo "tools/integration/audit21Check.ts $W/aligned $n aligned"; done
  for n in $C83; do
    echo "tools/integration/audit21Check.ts $W/c83-aligned $n c83-aligned"; echo "$T/tree/tools/integration/audit21Check.ts $W/c83-aligned $n c83-aligned-lifted"; done
}
jobs | xargs -n 4 -P "$J" sh -c 'mkdir -p "'"$REC"'/$3"; node --experimental-strip-types --no-warnings "$0" "$1" "$2" "'"$REC"'/$3/check-$2.json" \
  > "'"$T"'/$3-$2.log" 2>&1 || echo "FAILED $3 $2"'
for d in check aligned c83-aligned c83-aligned-lifted; do python3 tools/integration/audit21Summary.py "$REC/$d" > "$REC/summary-$d.txt"; done
sh tools/integration/issue151Counters.sh "$T/lag" "$J" $W/aligned/a21-cn-scary-face-at-cfply-azurill-c2.json \
  $W/aligned/a21-cn-scary-face-at-cfply-azurill-c1.json $W/aligned/a21-cn-scary-face-at-cfply-snorlax-c2.json \
  $W/fixtures/a21-iw-normal-at-cfply-golbat-c2.json $W/fixtures/a21-iw-normal-at-cfply-golbat-c1.json \
  $W/fixtures/a21-iw-normal-by-cfopp-mantine-c0.json $W/fixtures/a21-iw-normal-by-cfopp-mantine-c1.json \
  $W/fixtures/a21-iw-normal-by-cfply-golbat-c0.json $W/fixtures/a21-iw-normal-by-cfply-golbat-c1.json \
  $W/fixtures/a21-iw-rain-by-hpply-golbat-c2.json $W/fixtures/a21-iw-rain-by-hpply-golbat-c1.json > "$REC/lag.txt"
if [ -d $W/receipts ]; then
  diff -r "$REC" $W/receipts > "$T/receipts-vs-committed.txt" && echo "receipts == committed (byte-identical)" \
    || { echo "receipts DIFFER from the committed ones:"; head -40 "$T/receipts-vs-committed.txt"; }
fi
