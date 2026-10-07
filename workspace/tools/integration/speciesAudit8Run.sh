#!/bin/sh
# speciesAudit8 run: audit-7 runner pointed at the audit-8 derived fixtures (2 fresh mGBA runs per row; receipts -> <outDir>).
# usage: speciesAudit8Run.sh <receiptDir> <parallel> <glob>...   (override with DERIVED=<dir>)
DERIVED=${DERIVED:-tools/integration/fixtures/species-audit-8/derived}; export DERIVED
exec "$(dirname "$0")/speciesAudit7Run.sh" "$@"
