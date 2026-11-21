#!/usr/bin/env bash
# drv1: re-score T2 (aud249Rescore.sh, ROM-driven cadence) over every seed of an aud248 evidence dir. A whole run takes ~5 min, so split it by scene (RESCORE_SCENES="on" / "off")
# to keep each foreground call under the harness's 10-minute limit. Usage: tools/audio/rescoreAll.sh OUTDIR [FROM_DIR=.integration/evidence/t2n]
set -u
D=$1; E=${2:-.integration/evidence/t2n}; mkdir -p "$D"
for sc in ${RESCORE_SCENES:-off on}; do for s in $(cat "$E/$sc.seeds"); do tools/audio/aud249Rescore.sh "$E" "$D" "$s" "$sc" >/dev/null 2>"$D/$s-$sc.err" || echo "FAIL $s $sc"; done; done
