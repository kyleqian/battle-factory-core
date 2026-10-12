#!/bin/sh
# aud118 (docs/aud118-live-audit-26.md): fix114Patched.sh on the FIXED base 396308f86 (Struggle 165 landed: no stg107 diff) [+ optional
# aud118 patches]: scenarios -> direct-mGBA probes (audit20Probes.py, two fresh processes each) -> fixtures -> aud110Align.py windows ->
# audit21Check.ts INSIDE a git-archive copy. Nothing outside <out> is written. AUD118_REUSE=<dir>: reuse that run's probe / fx.
# usage (from workspace/): sh tools/integration/aud118Patched.sh <fresh-out-dir INSIDE the repo> <scenario-dir> [patch ...]
set -e
OUT=$1; SC=$2; shift 2
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT/copy" "$OUT/sc" "$OUT/check"; OUT=$(cd "$OUT" && pwd); SC=$(cd "$SC" && pwd); ROOT=$(pwd)
git archive --format=tar 396308f86 . | tar -x -C "$OUT/copy"
for d in node_modules reference artifacts; do ln -s "$ROOT/$d" "$OUT/copy/$d"; done
(cd "$OUT/copy" && git init -q)
for p in "$@"; do (cd "$OUT/copy" && git apply "$ROOT/$p"); done
for f in "$SC"/*.json; do cp "$f" "$OUT/sc/pb-$(basename "$f")"; done
if [ -n "$AUD118_REUSE" ]; then
  ln -s "$AUD118_REUSE/probe" "$OUT/probe"; cp -R "$AUD118_REUSE/fx" "$OUT/fx"
else
  AUDIT20_JOBS=${AUD118_JOBS:-9} python3 tools/integration/audit20Probes.py "$OUT/probe" "$OUT"/sc/*.json > "$OUT/probes.txt"
  python3 tools/integration/audit20Fixtures.py "$OUT/probe" "$OUT/fx" "$OUT/sc" > "$OUT/derive.txt"
fi
python3 tools/integration/aud110Align.py "$OUT/fx" "$OUT/fxa"
NAMES=$(ls "$OUT"/fxa/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename)
cd "$OUT/copy"
echo "$NAMES" | OUT=$OUT xargs -n 1 -P 6 sh -c 'node --experimental-strip-types --no-warnings tools/integration/audit21Check.ts "$OUT/fxa" "$0" "$OUT/check/check-$0.json" > "$OUT/check/$0.log" 2>&1 || echo "FAILED $0"'
cd "$ROOT"
