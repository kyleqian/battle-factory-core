#!/bin/sh
# ret88 (docs/ret88-return-weak.md): consumers (Dragon Dance, Curse, Double Team, Ice Beam, Thunderbolt, Air Cutter) after a friendship-0
# Return 216 (ReturnWeak), both sides -- ret88ConsumerStage.py scenarios -> audit20Probes.py (direct mGBA) -> audit20Fixtures.py ->
# ret88Rekey.py (the staged friendship; Return-body windows dropped) -> audit20Check.ts LENDS_ONLY (lend vs ROM) and the full dense render
# (2 fresh probes per scenario, r1 == r2, production live renderer vs ROM RGB) -> audit20Summary.py, in the current tree.
# usage (from workspace/): sh tools/integration/ret88Consumers.sh <fresh-out-dir>
set -e
OUT=$1
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd); WS=$PWD
python3 tools/integration/ret88ConsumerStage.py "$OUT/sc"
AUDIT20_JOBS=12 python3 tools/integration/audit20Probes.py "$OUT/probe" "$OUT"/sc/*.json > "$OUT/probes.txt"
python3 tools/integration/audit20Fixtures.py "$OUT/probe" "$OUT/fx0" "$OUT/sc" > "$OUT/derive.txt"
python3 tools/integration/ret88Rekey.py "$OUT/fx0" "$OUT/fx" | tee "$OUT/rekey.txt"
NAMES=$(ls "$OUT"/fx/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename)
for n in $NAMES; do AUDIT20_LENDS_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/audit20Check.ts "$OUT/fx" "$n" /dev/null; done > "$OUT/lends.txt"
python3 tools/integration/audit20LendsPi.py "$OUT/lends.txt" "$OUT/fx" > "$OUT/lends-pi.txt"
mkdir -p "$OUT/check"
echo "$NAMES" | OUT=$OUT xargs -n 1 -P 6 sh -c 'node --experimental-strip-types --no-warnings tools/integration/audit20Check.ts "$OUT/fx" "$0" "$OUT/check/check-$0.json" > "$OUT/check/$0.log" 2>&1 || echo "FAILED $0"'
python3 tools/integration/audit20Summary.py "$OUT/check" > "$OUT/summary.txt"
echo "lends: $(python3 tools/integration/ret80LendsSummary.py "$OUT/lends-pi.txt" "$OUT/fx" | tail -2 | tr '\n' ';') render: $(tail -1 "$OUT/summary.txt")"
