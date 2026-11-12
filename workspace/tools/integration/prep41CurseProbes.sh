#!/bin/sh
# prep41: MOVE_CURSE first-Step2 palette-transfer VCOUNT (tools/compare/cursePaletteTimingProbe.py, no framebuffer read) for the 4 banked
# Ghost scenarios (tools/integration/fixtures/curse-live/ghost-p1-vcount.json) + the 4 prep41 DUSCLOPS scenarios, 2 fresh direct-mGBA runs each.
# usage: prep41CurseProbes.sh <outDir>   -> <outDir>/<scenario stem>.run{0,1}.json
cd "$(dirname "$0")/../.." || exit 1
export PYTHONPATH=${PYTHONPATH:-${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py}
VPY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
O=$1; mkdir -p "$O"
S="tools/battle-lab/mechanic-curse-ghost-player-haunter-opponent-magikarp.json tools/battle-lab/mechanic-curse-ghost-opponent-haunter-player-magikarp.json
tools/battle-lab/prep14-curse-ghost-alt-gengar-golem.json tools/battle-lab/prep23-curse-ghost-altopp-gengar-golem.json
$(ls tools/battle-lab/prep41-curse-ghost-*.json)"
for s in $S; do for r in 0 1; do echo "$s $O/$(basename "$s" .json).run$r.json"; done; done |
  xargs -P "${JOBS:-8}" -n 2 sh -c 'python3 tools/run-mgba-probe.py "$1" -- '"$VPY"' tools/compare/cursePaletteTimingProbe.py "$0" "$1" >/dev/null 2>&1 || echo "probe failed $1 (exit $?)"'
