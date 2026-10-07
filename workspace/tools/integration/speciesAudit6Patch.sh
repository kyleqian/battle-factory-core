#!/bin/sh
# speciesAudit6: defect / decline proof. usage: speciesAudit6Patch.sh <patch.diff> <outDir> <derivedStem>...  applies the patch to the tree (git apply), runs the dense
# compare (2 fresh runs, identical digests) on each fixture (parallel), ALWAYS reverts (git apply -R), prints git status of src/tools (must be clean of the patch).
cd "$(dirname "$0")/../.." || exit 1
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
P=$1; OUT=$2; shift 2; D=tools/integration/fixtures/species-audit-6/derived
git apply "$P" || exit 1
for s in "$@"; do OUT_DIR=$OUT npx vite-node tools/integration/speciesAuditDense.ts $D/$s.json 2>&1 | tail -1 & done; wait
git apply -R "$P"; git status --short src | head
