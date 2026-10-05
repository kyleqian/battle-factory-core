#!/bin/sh
# speciesAudit2: fresh dense run (2 fresh runs, evidence retained) of named fixtures from a derived dir, in parallel.
# usage: speciesAudit2Dense.sh <derivedDir> <evidenceRoot> <outDir> <stem>...
cd "$(dirname "$0")/../.." || exit 1
D=$1; EV=$2; OUT=$3; shift 3
mkdir -p "$EV" "$OUT"
for s in "$@"; do
  POKEBENCH_LIVE_EVIDENCE_DIR="$EV/$s" OUT_DIR="$OUT" npx vite-node tools/integration/speciesAuditDense.ts "$D/$s.json" 2>&1 | tail -2 &
done
wait
