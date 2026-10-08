#!/bin/sh
# speciesAudit12 run: speciesAudit9Run.sh (d4aTimingCheck.ts per derived fixture: production live view vs 2 fresh direct-mGBA runs, digests
# compared; policy phase 0 px + full duration, other phase documented alternatePhaseResidual rows only) over the audit-12 derived fixtures; one
# compact receipt per row -> <receiptDir>/<stem>.json (no RGB). usage: speciesAudit12Run.sh <receiptDir> <parallel> <glob>...
cd "$(dirname "$0")/../.." || exit 1
DERIVED=${DERIVED:-tools/integration/fixtures/species-audit-12/derived} exec sh tools/integration/speciesAudit9Run.sh "$@"
