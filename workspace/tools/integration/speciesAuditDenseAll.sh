#!/bin/sh
# speciesAudit: dense compare (2 fresh mGBA runs each) of every derived fixture of a tag. usage: speciesAuditDenseAll.sh <derivedDir> <outDir> [parallel]
cd "$(dirname "$0")/../.." || exit 1
ls $1/*.json | OUT_DIR=$2 xargs -P ${3:-8} -n 2 npx vite-node tools/integration/speciesAuditDense.ts >/dev/null 2>&1
python3 tools/integration/speciesAuditSummary.py $2
