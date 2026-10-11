#!/bin/sh
# aud110 (docs/aud110-live-audit-25.md): scenarios -> direct-mGBA probes -> fixtures -> audit20Check.ts (or audit21Check.ts with
# AUD110_CHECK=audit21Check) in a git-archive copy of the FIXED base 5c050b765 [+ optional patches]. Nothing outside <out> is written.
# AUD110_ALIGN=1: render the aud110Align.py windows (Taunt / Harden at production's accepted start) with audit21Check.ts.
# AUD110_REUSE=<dir>: reuse that run's probe / fx (skips the mGBA probes).
# usage (from workspace/): sh tools/integration/aud110Patched.sh <fresh-out-dir INSIDE the repo> <scenario-dir> [patch ...]
# The stg107 Struggle diff is always applied (so later Struggle bodies have adapters; the first Taunt / Harden bodies precede any Struggle).
set -e
OUT=$1; SC=$2; shift 2
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT/copy" "$OUT/sc" "$OUT/check"; OUT=$(cd "$OUT" && pwd); SC=$(cd "$SC" && pwd); ROOT=$(pwd)
CHECK=${AUD110_CHECK:-audit20Check}
[ -z "$AUD110_ALIGN" ] || CHECK=audit21Check
git archive --format=tar 5c050b765 . | tar -x -C "$OUT/copy"
for d in node_modules reference artifacts; do ln -s "$ROOT/$d" "$OUT/copy/$d"; done
(cd "$OUT/copy" && git init -q && git apply "$ROOT/tools/integration/fixtures/stg107/stg107-struggle.diff")
for p in "$@"; do (cd "$OUT/copy" && git apply "$ROOT/$p"); done
for f in "$SC"/*.json; do cp "$f" "$OUT/sc/pb-$(basename "$f")"; done
if [ -n "$AUD110_REUSE" ]; then  # the ROM side is tree-independent: reuse an earlier run's probes + fixtures (same scenario dir)
  ln -s "$AUD110_REUSE/probe" "$OUT/probe"; cp -R "$AUD110_REUSE/fx" "$OUT/fx"
else
  AUDIT20_JOBS=${AUD110_JOBS:-11} python3 tools/integration/audit20Probes.py "$OUT/probe" "$OUT"/sc/*.json > "$OUT/probes.txt"
  python3 tools/integration/audit20Fixtures.py "$OUT/probe" "$OUT/fx" "$OUT/sc" > "$OUT/derive.txt"
fi
FX=fx
if [ -n "$AUD110_ALIGN" ]; then python3 tools/integration/aud110Align.py "$OUT/fx" "$OUT/fxa"; FX=fxa; fi
NAMES=$(ls "$OUT"/$FX/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename)
cd "$OUT/copy"
echo "$NAMES" | OUT=$OUT CHECK=$CHECK FX=$FX xargs -n 1 -P 6 sh -c 'node --experimental-strip-types --no-warnings tools/integration/$CHECK.ts "$OUT/$FX" "$0" "$OUT/check/check-$0.json" > "$OUT/check/$0.log" 2>&1 || echo "FAILED $0"'
cd "$ROOT"
python3 tools/integration/aud110Summary.py "$OUT/check" > "$OUT/summary.txt"
tail -6 "$OUT/summary.txt"
