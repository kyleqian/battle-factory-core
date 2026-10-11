#!/bin/sh
# stl109 (docs/stl109-struggle-live.md): stg107Patched.sh against the LANDED production: a git-archive copy of HEAD (committed work only; no patch applied)
# base 52c181d54 + tools/integration/fixtures/stg107/stg107-struggle.diff, then every Move_* body of the given scenarios: audit20Probes.py
# (direct mGBA) -> audit20Fixtures.py (pb-* = every body windowed) -> audit20Check.ts IN THE COPY (production render of the full dense
# window, two fresh probes per scenario, r1 == r2) -> audit20Summary.py + stg107PatchedSummary.py (the Struggle windows).
# usage (from workspace/): sh tools/integration/stl109Patched.sh <fresh-out-dir INSIDE the repo> <scenario-dir (stg107Stage.py output)>
set -e
OUT=$1; SC=$2
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT/copy" "$OUT/sc" "$OUT/check"; OUT=$(cd "$OUT" && pwd); SC=$(cd "$SC" && pwd); ROOT=$(pwd)
git archive --format=tar HEAD . | tar -x -C "$OUT/copy"
for d in node_modules reference artifacts; do ln -s "$ROOT/$d" "$OUT/copy/$d"; done
(cd "$OUT/copy" && git init -q)
for f in "$SC"/*.json; do cp "$f" "$OUT/sc/pb-$(basename "$f")"; done
AUDIT20_JOBS=11 python3 tools/integration/audit20Probes.py "$OUT/probe" "$OUT"/sc/*.json > "$OUT/probes.txt"
python3 tools/integration/audit20Fixtures.py "$OUT/probe" "$OUT/fx" "$OUT/sc" > "$OUT/derive.txt"
NAMES=$(ls "$OUT"/fx/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename)
cd "$OUT/copy"
echo "$NAMES" | OUT=$OUT xargs -n 1 -P 6 sh -c 'node --experimental-strip-types --no-warnings tools/integration/audit20Check.ts "$OUT/fx" "$0" "$OUT/check/check-$0.json" > "$OUT/check/$0.log" 2>&1 || echo "FAILED $0"'
cd "$ROOT"
python3 tools/integration/audit20Summary.py "$OUT/check" > "$OUT/all-bodies-summary.txt"
python3 tools/integration/stg107PatchedSummary.py "$OUT/check" > "$OUT/summary.txt"
tail -1 "$OUT/summary.txt"
