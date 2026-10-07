#!/bin/sh
# speciesAudit5: dense live-vs-ROM compare (2 fresh mGBA runs each, digests must agree) for derived fixtures matching a glob. usage: speciesAudit5Dense.sh <outDir> <parallel> <glob>...
cd "$(dirname "$0")/../.." || exit 1
D=tools/integration/fixtures/species-audit-5/derived; OUT=$1; P=$2; shift 2; mkdir -p $OUT
for g in "$@"; do ls $D/$g.json; done | OUT_DIR=$OUT xargs -P $P -n 1 npx vite-node tools/integration/speciesAuditDense.ts 2>&1 | grep -v "^$" | sed 's/^/  /'
