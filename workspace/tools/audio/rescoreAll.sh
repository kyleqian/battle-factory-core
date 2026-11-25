#!/usr/bin/env bash
# drv1: re-score T2 (aud249Rescore.sh, ROM-driven cadence) over every seed of an aud248 evidence dir. A whole run takes ~5 min, so split it by scene (RESCORE_SCENES="on" / "off")
# to keep each foreground call under the harness's 10-minute limit. Usage: tools/audio/rescoreAll.sh OUTDIR [FROM_DIR=.integration/evidence/t2n]
# FROM_DIR (default or relative) falls back to the main checkout's workspace/ copy when this worktree has none; neither found = one line naming both paths, exit 2.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../integration/evidenceDir.sh"
D=$1; E=$(resolve_seeds_dir "${2:-}") || exit 2; mkdir -p "$D"
for sc in ${RESCORE_SCENES:-off on}; do for s in $(cat "$E/$sc.seeds"); do tools/audio/aud249Rescore.sh "$E" "$D" "$s" "$sc" >/dev/null 2>"$D/$s-$sc.err" || echo "FAIL $s $sc"; done; done
