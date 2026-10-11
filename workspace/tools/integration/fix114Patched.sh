#!/bin/sh
# fix114 (docs/fix114-live-audit-defects.md): aud110Patched.sh with the production tree taken from a REV of this checkout (default HEAD) instead of
# the fixed aud110 base: scenarios -> direct-mGBA probes -> fixtures -> aud110Align.py windows -> audit21Check.ts run INSIDE a git-archive copy of
# <rev> (+ stg107's Struggle diff: Struggle is not on master, later Struggle bodies need its adapters). Nothing outside <out> is written.
# FIX114_REUSE=<dir>: reuse that run's probe / fx (the ROM side does not depend on the tree).
# usage (from workspace/): sh tools/integration/fix114Patched.sh <fresh-out-dir INSIDE the repo> <scenario-dir> [rev]
set -e
OUT=$1; SC=$2; REV=${3:-HEAD}
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT/copy" "$OUT/sc" "$OUT/check"; OUT=$(cd "$OUT" && pwd); SC=$(cd "$SC" && pwd); ROOT=$(pwd)
git rev-parse "$REV" > "$OUT/rev.txt"; git rev-parse "$REV:workspace/src" >> "$OUT/rev.txt"
git archive --format=tar "$REV" . | tar -x -C "$OUT/copy"
for d in node_modules reference artifacts; do ln -s "$ROOT/$d" "$OUT/copy/$d"; done
(cd "$OUT/copy" && git init -q && git apply "$ROOT/tools/integration/fixtures/stg107/stg107-struggle.diff")
for f in "$SC"/*.json; do cp "$f" "$OUT/sc/pb-$(basename "$f")"; done
if [ -n "$FIX114_REUSE" ]; then
  ln -s "$FIX114_REUSE/probe" "$OUT/probe"; cp -R "$FIX114_REUSE/fx" "$OUT/fx"
else
  AUDIT20_JOBS=${FIX114_JOBS:-11} python3 tools/integration/audit20Probes.py "$OUT/probe" "$OUT"/sc/*.json > "$OUT/probes.txt"
  python3 tools/integration/audit20Fixtures.py "$OUT/probe" "$OUT/fx" "$OUT/sc" > "$OUT/derive.txt"
fi
python3 tools/integration/aud110Align.py "$OUT/fx" "$OUT/fxa"
NAMES=$(ls "$OUT"/fxa/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename)
cd "$OUT/copy"
echo "$NAMES" | OUT=$OUT xargs -n 1 -P 6 sh -c 'node --experimental-strip-types --no-warnings tools/integration/audit21Check.ts "$OUT/fxa" "$0" "$OUT/check/check-$0.json" > "$OUT/check/$0.log" 2>&1 || echo "FAILED $0"'
cd "$ROOT"
python3 tools/integration/aud110Summary.py "$OUT/check" > "$OUT/summary.txt"
tail -6 "$OUT/summary.txt"
