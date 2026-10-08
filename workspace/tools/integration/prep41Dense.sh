#!/bin/sh
# prep41: one prep41TimingCheck.ts process per fixture (each = 2 fresh probe processes through the production live renderer), JOBS parallel.
# usage: prep41Dense.sh <outDir> <fixture.json>...   -> <outDir>/<stem>.json + <outDir>/<stem>.log
cd "$(dirname "$0")/../.." || exit 1
O=$1; shift; mkdir -p "$O"
for f in "$@"; do echo "$f"; done | xargs -P "${JOBS:-8}" -n 1 sh -c 's=$(basename "$0" .json); node --experimental-strip-types --no-warnings tools/integration/prep41TimingCheck.ts '"$O"'/$s.json "$0" > '"$O"'/$s.log 2>&1 || echo "VIOLATION or failure: $0"'
