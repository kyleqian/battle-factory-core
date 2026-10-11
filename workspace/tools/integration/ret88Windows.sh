#!/bin/sh
# ret88 (docs/ret88-return-weak.md): ReturnWeak BODY dense windows through the production live renderer -- ret88WindowStage.py scenarios
# (+ optional extra scenario dirs, e.g. ret88Consumers.sh's <out>/sc) -> audit20Probes.py (direct mGBA) -> audit20Fixtures.py ->
# ret88Rekey.py --returns (Return-body windows only, request friendship = the staged 0) -> audit20Check.ts (lends + the full dense
# render, 2 fresh probes per scenario, r1 == r2) -> audit20Summary.py, in the current tree.
# usage (from workspace/): sh tools/integration/ret88Windows.sh <fresh-out-dir> [<extra-scenario-dir> ...]
set -e
OUT=$1; shift
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
python3 tools/integration/ret88WindowStage.py "$OUT/sc"
for d in "$@"; do cp "$d"/*.json "$OUT/sc/"; done
AUDIT20_JOBS=12 python3 tools/integration/audit20Probes.py "$OUT/probe" "$OUT"/sc/*.json > "$OUT/probes.txt"
python3 tools/integration/audit20Fixtures.py "$OUT/probe" "$OUT/fx0" "$OUT/sc" > "$OUT/derive.txt"
python3 tools/integration/ret88Rekey.py "$OUT/fx0" "$OUT/fx" --returns | tee "$OUT/rekey.txt"
NAMES=$(ls "$OUT"/fx/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename)
mkdir -p "$OUT/check"
echo "$NAMES" | OUT=$OUT xargs -n 1 -P 6 sh -c 'node --experimental-strip-types --no-warnings tools/integration/audit20Check.ts "$OUT/fx" "$0" "$OUT/check/check-$0.json" > "$OUT/check/$0.log" 2>&1 || echo "FAILED $0"'
python3 tools/integration/audit20Summary.py "$OUT/check" > "$OUT/summary.txt"
tail -1 "$OUT/summary.txt"
