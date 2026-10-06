#!/bin/sh
# speciesAudit3: defect proof. usage: speciesAudit3Patch.sh <patch.diff> <outDir> <derivedStem>...   applies the one-value patch to src/ (git apply), runs the
# dense compare (2 fresh runs, identical digests) on each fixture, ALWAYS reverts (git apply -R). Do not run other audit jobs meanwhile.
cd "$(dirname "$0")/../.." || exit 1
P=$1; OUT=$2; shift 2; D=tools/integration/fixtures/species-audit-3/derived
git apply "$P" || exit 1
for s in "$@"; do OUT_DIR=$OUT npx vite-node tools/integration/speciesAuditDense.ts $D/$s.json 2>&1 | tail -1 & done; wait
git apply -R "$P"; git status --short src | head
