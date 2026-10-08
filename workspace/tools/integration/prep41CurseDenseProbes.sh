#!/bin/sh
# prep41: dense CurseGhost state + RGB probes (tools/compare/curseProbe.py), the 2 GENGAR alternates + the 4 prep41 DUSCLOPS scenarios,
# 2 fresh direct-mGBA processes each, cmp'd (r1 == r2). usage: prep41CurseDenseProbes.sh <outDir>
cd "$(dirname "$0")/../.." || exit 1
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
O=$1; mkdir -p "$O"
S="prep14-curse-ghost-alt-gengar-golem prep23-curse-ghost-altopp-gengar-golem $(ls tools/battle-lab/prep41-curse-ghost-*.json | xargs -n 1 basename | sed 's/.json$//')"
for s in $S; do for r in 1 2; do echo "$s $r"; done; done |
  xargs -P "${JOBS:-8}" -n 2 sh -c 'mkdir -p '"$O"'/$0-r$1-rgb; python3 tools/run-mgba-probe.py '"$O"'/$0-r$1.json -- '"$PY"' tools/compare/curseProbe.py tools/battle-lab/$0.json '"$O"'/$0-r$1.json '"$O"'/$0-r$1-rgb > '"$O"'/$0-r$1.log 2>&1 || echo "probe exit $? $0 r$1 (gate on r1 == r2)"'
for s in $S; do cmp -s "$O/$s-r1.json" "$O/$s-r2.json" && echo "$s r1 == r2" || echo "DIFF $s"; done
