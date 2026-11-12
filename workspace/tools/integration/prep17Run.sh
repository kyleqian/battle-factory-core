#!/bin/sh
# prep17: direct-mGBA probes (fresh process each; run twice with different TAGs and compare via prep17MeteorReceipt.py).
# usage (workspace root): sh tools/integration/prep17Run.sh TAG [meteor|mud|sand ...]   -> /tmp/p17/TAG/*.json (raw, not committed). mGBA exits with a segfault AFTER the output is written (known, harmless).
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
TAG=${1:-r1}; shift; WHAT=${*:-meteor}
export OUT=/tmp/p17/$TAG; mkdir -p $OUT
S=tools/integration/fixtures/prep17/scenarios; L=tools/battle-lab
for w in $WHAT; do case $w in
  meteor) for f in $L/mechanic-meteor-mash-player-metang-opponent-onix $L/mechanic-meteor-mash-opponent-metang-player-onix $L/prep12-meteor-mash-alt-shiftry-golem $S/meteor-mash-alt2-player-metang-opponent-golem $S/meteor-mash-alt3-player-golem-opponent-shiftry; do echo $f; done;;
  mud) for f in $L/mechanic-mud-slap-player-pidgeotto-onix $L/mechanic-mud-slap-pidgeotto-onix $L/prep12-mud-slap-alt-set156-set146; do echo $f; done;;
  sand) for f in $L/mechanic-sand-attack-player-pidgeotto-onix $L/mechanic-sand-attack-pidgeotto-onix $L/prep12-sand-attack-alt-set156-set146; do echo $f; done;;
esac; done | xargs -P ${JOBS:-5} -n 1 sh -c 'b=$(basename $0); $PY tools/integration/prep13Probe.py $0.json $OUT/$b.json >/dev/null 2>&1; case $b in *meteor*) $PY tools/integration/prep17MeteorLag.py $0.json $OUT/lag-$b.json 0 200 >/dev/null 2>&1;; *mud*|*sand*) $PY tools/integration/prep17DirtTrack.py $0.json $OUT/track-$b.json >/dev/null 2>&1;; esac' 2>&1 | grep -v Segmentation
ls $OUT | wc -l
