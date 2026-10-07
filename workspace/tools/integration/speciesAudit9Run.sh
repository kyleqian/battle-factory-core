#!/bin/sh
# speciesAudit9 run: the D4 timing check (d4aTimingCheck.ts: verifyLiveAdapterFramebuffer = production live view vs the ROM, 2 fresh mGBA runs,
# digests compared; zero px in the policy phase, documented alternatePhaseResidual rows only in the other phase) per derived fixture matching the
# globs, in parallel; one compact receipt per row -> <receiptDir>/<stem>.json (no RGB). usage: speciesAudit9Run.sh <receiptDir> <parallel> <glob>...
# (fixtures from tools/integration/fixtures/species-audit-9/derived, or $DERIVED)
cd "$(dirname "$0")/../.." || exit 1
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
D=${DERIVED:-tools/integration/fixtures/species-audit-9/derived}; OUT=$1; P=$2; shift 2; mkdir -p "$OUT"; export OUT
for g in "$@"; do ls $D/$g.json; done | xargs -P "$P" -n 1 sh -c \
 'node --experimental-strip-types --no-warnings tools/integration/d4aTimingCheck.ts "$OUT/$(basename "$0")" "$0" 2>&1 | grep -v "^$" | sed "s|^tools/integration/fixtures/species-audit-9/||"'
