#!/bin/sh
# speciesAudit14 attacker-swap probes (run from workspace/): tools/integration/prep40Probe.py (attdollRun.sh's probe) on the
# speciesAudit14SwapStage.py scenarios, twice from fresh processes, r1 == r2 compared. Direct mGBA only (never the shared HTTP oracles).
# run-mgba-probe.py may exit 138 on a teardown SIGBUS with complete output: the gate is r1 == r2 (cmp) on non-empty JSON.
# usage: OUT=<fresh dir> SC=<scenario dir> [JOBS=n] sh tools/integration/speciesAudit14SwapProbes.sh [stem ...]
[ -n "$OUT" ] && [ -n "$SC" ] || { echo "OUT=<dir> SC=<scenario dir> required"; exit 2; }
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python OUT SC
mkdir -p "$OUT"
STEMS=${*:-$(cut -f1 $SC/list.tsv)}
for s in $STEMS; do for r in 1 2; do echo "$s $r"; done; done | xargs -P ${JOBS:-14} -n 2 sh -c \
 'o="$OUT/$0-r$1.json"; [ ! -e "$o" ] || { echo "refusing to reuse $o"; exit 0; }; python3 tools/run-mgba-probe.py "$o" -- $PY tools/integration/prep40Probe.py "$SC/$0.json" "$o" "$OUT/$0-r$1-rgb" > "$OUT/$0-r$1.out" 2>&1 || true'
n=0; for s in $STEMS; do f="$OUT/$s-r1.json"; [ -s "$f" ] && [ -s "$OUT/$s-r2.json" ] || { echo "EMPTY $s"; continue; }; cmp -s "$f" "$OUT/$s-r2.json" && n=$((n + 1)) || echo "DIFF $s"; done
echo "probes: $n scenarios r1 == r2 byte-identical"
