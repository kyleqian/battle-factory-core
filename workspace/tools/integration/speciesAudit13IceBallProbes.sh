#!/bin/sh
# speciesAudit13 Ice Ball probes (run from workspace/): tools/compare/iceBallProbe.py (lendIceBallProbes.sh's probe) on the
# speciesAudit13IceBallStage.py scenarios, twice from fresh processes, cmp'd. Direct mGBA only (never the shared HTTP oracles).
# usage: OUT=<fresh dir> SC=<scenario dir> [JOBS=n] sh tools/integration/speciesAudit13IceBallProbes.sh
set -e
[ -n "$OUT" ] && [ -n "$SC" ] || { echo "OUT=<dir> SC=<scenario dir> required"; exit 2; }
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python OUT SC
mkdir -p "$OUT"
for s in $(cut -f1 $SC/list.tsv); do for r in 1 2; do echo "$s $r"; done; done | xargs -P ${JOBS:-10} -n 2 sh -c \
 'mkdir -p "$OUT/$0-r$1-rgb"; $PY tools/compare/iceBallProbe.py "$SC/$0.json" "$OUT/$0-r$1.json" "$OUT/$0-r$1-rgb" > "$OUT/$0-r$1.log" 2>&1 || true'
for s in $(cut -f1 $SC/list.tsv); do [ -s "$OUT/$s-r1.json" ] || { echo "EMPTY $s"; continue; }; cmp -s "$OUT/$s-r1.json" "$OUT/$s-r2.json" || echo "DIFF $s"; done
echo "probes done"
