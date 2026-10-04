#!/bin/sh
# usage: altSpecies2Run.sh <pass> <live-fixture> ; evidence under $A2_ROOT/pass<N>
R=${A2_ROOT:-.integration/validation/altspecies2-20261004}
n=$(basename "$2" .json); mkdir -p $R/logs
POKEBENCH_LIVE_EVIDENCE_DIR=$R/pass$1 node --experimental-strip-types tools/integration/liveAdapterFramebuffer.ts "$2" > $R/logs/$n.p$1.json 2> $R/logs/$n.p$1.err
echo "$n p$1 exit=$?"
