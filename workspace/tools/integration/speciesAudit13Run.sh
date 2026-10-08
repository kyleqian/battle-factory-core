#!/bin/sh
# speciesAudit13 reproduction (run from workspace/). Direct mGBA only (never the shared HTTP oracles). Every dir is caller-given.
#   sh tools/integration/speciesAudit13Run.sh <probe dir> <nodf probe dir> <receipt dir> [P]
# Re-stages the committed scenarios (must be byte-identical), probes every scenario twice fresh (prep38Probe.py; skipped when the probe dir
# already holds r1/r2 runs), derives the TEST (+ doll-free CONTROL) windows from each scenario's own runs, then runs the PRODUCTION checker
# (speciesAudit13Check.ts) into <receipt dir>/{main,nodf}. Shiny personalities: speciesAudit13Personality.py (personality.tsv).
set -e
[ $# -ge 3 ] || { echo "usage: speciesAudit13Run.sh <probe dir> <nodf probe dir> <receipt dir> [P]"; exit 2; }
PR=$1; PN=$2; REC=$3; P=${4:-14}; W=tools/integration/fixtures/species-audit-13; T=$(mktemp -d)
python3 tools/integration/speciesAudit13Stage.py $T/sc > /dev/null
python3 tools/integration/speciesAudit13Stage.py --nodf $T/scn \
  ONIX:BODY_SLAM:opponent ONIX:BRICK_BREAK:opponent ONIX:FLAMETHROWER:opponent ONIX:ICE_BEAM:opponent ONIX:SLUDGE_BOMB:opponent \
  ONIX:THUNDERBOLT:opponent ONIX:EARTHQUAKE:opponent GOLBAT:PSYCHIC:opponent GOLBAT:FLAMETHROWER:opponent GOLBAT:SLUDGE_BOMB:opponent > /dev/null
diff -rq $T/sc $W/scenarios && diff -rq $T/scn $W/scenarios-nodf || { echo "staged scenarios differ from the committed ones"; exit 1; }
ls $PR/*-r1.json > /dev/null 2>&1 || OUT=$PR SC=$W/scenarios JOBS=$P sh tools/integration/speciesAudit13Probes.sh 2>&1 | grep -v "Segmentation fault"
ls $PN/*-r1.json > /dev/null 2>&1 || OUT=$PN SC=$W/scenarios-nodf JOBS=$P sh tools/integration/speciesAudit13Probes.sh 2>&1 | grep -v "Segmentation fault"
python3 tools/integration/speciesAudit13Fixtures.py $PR $W/scenarios $T/derived $W/personality.tsv > $T/derive.txt
python3 tools/integration/speciesAudit13Fixtures.py $PN $W/scenarios-nodf $T/derived-nodf > $T/derive-nodf.txt
diff -q $T/derive.txt $W/derive.txt && diff -q $T/derive-nodf.txt $W/derive-nodf.txt || echo "WARNING: derived windows differ from the committed derive*.txt"
PROBES=$PR REC=$REC/main P=$P sh tools/integration/speciesAudit13CheckAll.sh $T/derived/*.json > $REC.main.log 2>&1
PROBES=$PN REC=$REC/nodf P=$P sh tools/integration/speciesAudit13CheckAll.sh $T/derived-nodf/*.json > $REC.nodf.log 2>&1
python3 tools/integration/speciesAudit13Summary.py $REC/main $REC/nodf > $REC/summary.txt
echo "receipts in $REC"
