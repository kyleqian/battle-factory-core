#!/bin/sh
# prep41: main-loop pass counters (speciesAudit2Counters.py) for the 8 Ghost Curse scenarios, 2 fresh direct-mGBA runs each (activation
# frame and lag ages of the CurseGhost body). usage: prep41CurseCounters.sh <outDir>
cd "$(dirname "$0")/../.." || exit 1
export PYTHONPATH=${PYTHONPATH:-${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py}
VPY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
O=$1; mkdir -p "$O"
S="tools/battle-lab/mechanic-curse-ghost-player-haunter-opponent-magikarp.json tools/battle-lab/mechanic-curse-ghost-opponent-haunter-player-magikarp.json
tools/battle-lab/prep14-curse-ghost-alt-gengar-golem.json tools/battle-lab/prep23-curse-ghost-altopp-gengar-golem.json
$(ls tools/battle-lab/prep41-curse-ghost-*.json)"
for s in $S; do for r in 0 1; do echo "$s $O/$(basename "$s" .json).run$r.json"; done; done |
  xargs -P "${JOBS:-8}" -n 2 sh -c 'python3 tools/run-mgba-probe.py "$1" -- '"$VPY"' tools/integration/speciesAudit2Counters.py "$0" "$1" >/dev/null 2>&1 || echo "probe failed $1 (exit $?)"'
