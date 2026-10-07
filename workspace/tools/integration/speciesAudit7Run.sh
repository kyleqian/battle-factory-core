#!/bin/sh
# speciesAudit7 run: dense live-vs-ROM compare (2 fresh mGBA runs each, digests must agree) for derived fixtures matching globs; receipts -> <outDir>.
# usage: speciesAudit7Run.sh <receiptDir> <parallel> <glob>...   (fixtures from tools/integration/fixtures/species-audit-7/derived, or $DERIVED)
cd "$(dirname "$0")/../.." || exit 1
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
D=${DERIVED:-tools/integration/fixtures/species-audit-7/derived}; OUT=$1; P=$2; shift 2; mkdir -p $OUT
for g in "$@"; do ls $D/$g.json; done | OUT_DIR=$OUT xargs -P $P -n 1 npx vite-node tools/integration/speciesAuditDense.ts 2>&1 | grep -v "^$" | sed 's/^/  /'
