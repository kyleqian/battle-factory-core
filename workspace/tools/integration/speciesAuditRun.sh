#!/bin/sh
# speciesAudit: full pipeline for one swap species. usage: speciesAuditRun.sh <TAG> <SPECIES> <id> <hp> <speedEv> <list(stem\torig)> <outroot>
# stage -> body probes (orig+swapped, direct mGBA) -> derive windows/HP from the swapped ROM bodies -> dense x2 fresh -> summary.
cd "$(dirname "$0")/../.." || exit 1
TAG=$1; SP=$2; ID=$3; HP=$4; EV=$5; LIST=$6; OUT=$7; mkdir -p $OUT
python3 tools/integration/speciesAuditStage.py --species $SP --id $ID --hp $HP --speed-ev $EV --tag $TAG $LIST > $OUT/list.tsv
tools/integration/speciesAuditBodies.sh $OUT/list.tsv $OUT/bodies >/dev/null 2>&1
SA_TAG=$TAG python3 tools/integration/speciesAuditDerive.py $OUT/list.tsv $OUT/bodies > $OUT/derive.txt
echo derived: $(grep -c "acc\[" $OUT/derive.txt) skipped: $(grep -vc "acc\[" $OUT/derive.txt)
