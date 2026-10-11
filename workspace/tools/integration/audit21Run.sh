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
#    c83-aligned-lifted/ (after), and from a copy with patches/audit21-quick-attack-target-base-x2.diff on the a21-qa-* windows ->
#    qa-patched/ (after; before = check/);
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
 c83-ctl-scary-face-at-cfply c83-ctl-scary-face-at-cfopp c83-rain-icy-wind-by-cfply c83-rain-icy-wind-by-cfopp c83-rain-icy-wind-at-cfply
 c83-rain-icy-wind-at-cfopp"
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
mkdir -p "$T/tree-qa"
git archive HEAD | tar -x -C "$T/tree-qa"
ln -s "$PWD/node_modules" "$T/tree-qa/node_modules"
patch -s -p1 -d "$T/tree-qa" < $W/patches/audit21-quick-attack-target-base-x2.diff
jobs() {
  for n in $(ls $W/fixtures/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename); do
    echo "tools/integration/audit21Check.ts $W/fixtures $n check"; echo "tools/integration/audit21Check.ts $W/aligned $n aligned"; done
  for n in $C83; do
    echo "tools/integration/audit21Check.ts $W/c83-aligned $n c83-aligned"; echo "$T/tree/tools/integration/audit21Check.ts $W/c83-aligned $n c83-aligned-lifted"; done
  for n in $(ls $W/fixtures/a21-qa-*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename); do
    echo "$T/tree-qa/tools/integration/audit21Check.ts $W/fixtures $n qa-patched"; done
}
jobs | xargs -n 4 -P "$J" sh -c 'mkdir -p "'"$REC"'/$3"; node --experimental-strip-types --no-warnings "$0" "$1" "$2" "'"$REC"'/$3/check-$2.json" \
  > "'"$T"'/$3-$2.log" 2>&1 || echo "FAILED $3 $2"'
for d in check aligned c83-aligned c83-aligned-lifted qa-patched; do python3 tools/integration/audit21Summary.py "$REC/$d" > "$REC/summary-$d.txt"; done
sh tools/integration/issue151Counters.sh "$T/lag" "$J" $W/aligned/a21-cn-scary-face-at-cfply-azurill-c2.json \
  $W/aligned/a21-cn-scary-face-at-cfply-azurill-c1.json $W/aligned/a21-cn-scary-face-at-cfply-snorlax-c2.json \
  $W/fixtures/a21-iw-normal-at-cfply-golbat-c2.json $W/fixtures/a21-iw-normal-at-cfply-golbat-c1.json \
  $W/fixtures/a21-iw-normal-by-cfopp-mantine-c0.json $W/fixtures/a21-iw-normal-by-cfopp-mantine-c1.json \
  $W/fixtures/a21-iw-normal-by-cfply-golbat-c0.json $W/fixtures/a21-iw-normal-by-cfply-golbat-c1.json \
  $W/fixtures/a21-iw-rain-by-hpply-golbat-c2.json $W/fixtures/a21-iw-rain-by-hpply-golbat-c1.json > "$REC/lag.txt"
# 5. land82 doll cells (audit21DollStage.py; doll81's harness on THIS tree's production code, land82 landed: no patch): probes twice
#    (audit21DollProbes.sh, r1 == r2), attacker composites (speciesAudit14SwapCheck.ts -> attdollLiveCheck.ts), defender dolls
#    (audit21DollDefFixtures.py + prep38Check.ts: control calibrated, test at its shift), every LATER doll body (audit21DollLater.py), and
#    doll81's own GENGAR -> GOLBAT pair (the k+1 tail-row control) -> <receipt-dir>/doll/
D=$W/doll; mkdir -p "$REC/doll/att" "$REC/doll/def/control" "$REC/doll/def/test" "$REC/doll/later" "$REC/doll/d81att"
python3 tools/integration/audit21DollStage.py "$T/dollsc" > /dev/null
diff -r "$T/dollsc" $D/scenarios > /dev/null && echo "doll scenarios == committed" || { echo "doll scenarios differ"; exit 1; }
OUT="$T/dollprobe" JOBS=14 sh tools/integration/audit21DollProbes.sh > "$REC/doll/probes.txt"
OUT="$T/d81probe" SC=tools/integration/fixtures/doll81/scenarios JOBS=6 sh tools/integration/audit21DollProbes.sh doll81-att-lovely-kiss-player-gengar \
  doll81-self-sunny-day-player-gengar doll81-att-solar-beam-player-gengar >> "$REC/doll/probes.txt"
awk -F'\t' '$7 != "def" {print $1}' $D/scenarios/list.tsv | S14_SCENARIOS=$D/scenarios xargs -P "$J" -n 1 sh -c 'node --experimental-strip-types \
  --no-warnings tools/integration/speciesAudit14SwapCheck.ts --out="'"$REC"'/doll/att/$0.json" "'"$T"'/dollprobe" "$0" > /dev/null 2>&1 || echo "FAIL $0"'
for st in doll81-att-lovely-kiss-player-gengar doll81-self-sunny-day-player-gengar doll81-att-solar-beam-player-gengar; do
  S14_SCENARIOS=tools/integration/fixtures/doll81/scenarios node --experimental-strip-types --no-warnings tools/integration/speciesAudit14SwapCheck.ts \
    --out="$REC/doll/d81att/$st.json" "$T/d81probe" $st > /dev/null 2>&1 || echo "FAIL $st"; done
python3 tools/integration/audit21DollDefFixtures.py "$T/dollprobe" "$T/doll/def-derived" > "$REC/doll/def-fixtures.txt"
python3 tools/integration/audit21DollLater.py "$T/dollprobe" "$T/doll/later-derived" > "$REC/doll/later-fixtures.txt"
export PR="$T/dollprobe"
ls "$T"/doll/def-derived/*-control.json | xargs -P "$J" -n 1 sh -c 'node --experimental-strip-types --no-warnings tools/integration/prep38Check.ts \
  --probes="$PR" --out="'"$REC"'/doll/def/control/$(basename "$0")" --calibrate "$0" > /dev/null 2>&1 || echo "FAIL $0"'
ls "$T"/doll/def-derived/*-test.json | xargs -P "$J" -n 1 sh -c 'node --experimental-strip-types --no-warnings tools/integration/prep38Check.ts \
  --probes="$PR" --out="'"$REC"'/doll/def/test/$(basename "$0")" --shifts="'"$REC"'/doll/def/control" "$0" > /dev/null 2>&1 || echo "FAIL $0"'
ls "$T"/doll/later-derived/*.json | xargs -P "$J" -n 1 sh -c 'node --experimental-strip-types --no-warnings tools/integration/prep38Check.ts \
  --probes="$PR" --out="'"$REC"'/doll/later/$(basename "$0")" --shifts="'"$REC"'/doll/def/control" "$0" > /dev/null 2>&1 || echo "FAIL $0"'
python3 tools/integration/audit21DollSummary.py "$REC/doll" > "$REC/doll/summary.tsv"
if [ -d $W/receipts ]; then
  diff -r "$REC" $W/receipts > "$T/receipts-vs-committed.txt" && echo "receipts == committed (byte-identical)" \
    || { echo "receipts DIFFER from the committed ones:"; head -40 "$T/receipts-vs-committed.txt"; }
fi
