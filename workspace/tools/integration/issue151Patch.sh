#!/bin/sh
# issue151: patch proof. Applies <patch.diff> (env-driven timing override), runs speciesAuditDense.ts (2 fresh mGBA runs per fixture, digests compared)
# for each "<ENV=value>:<fixture.json>" job, ALWAYS reverts the patch. usage: issue151Patch.sh <patch.diff> <receiptDir> <ENV=value>:<fixture.json>...
cd "$(dirname "$0")/../.." || exit 1
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PATCH=$1; OUT=$2; shift 2; mkdir -p "$OUT"
git apply "$PATCH" || exit 1
trap 'git apply -R "$PATCH"' EXIT INT TERM
for job in "$@"; do
  envset=${job%%:*}; fx=${job#*:}; stem=$(basename "$fx" .json)
  ( [ "$envset" = "-" ] && OUT_DIR="$OUT/$stem" npx vite-node tools/integration/speciesAuditDense.ts "$fx" || env "$envset" OUT_DIR="$OUT/$stem" npx vite-node tools/integration/speciesAuditDense.ts "$fx" ) 2>&1 | grep -v "^$" | sed "s|^|  [$envset] |" &
done; wait
