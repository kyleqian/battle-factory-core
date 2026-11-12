#!/bin/sh
# chg161 runner (docs/chg161-charge-turn-print.md). Run from workspace/; direct mGBA only (never the shared HTTP oracles).
#   sh tools/integration/chg161Run.sh <out-dir>
# Probes the three committed off108 charge-turn scenarios (Dig / Razor Wind / Solar Beam, player PRIMEAPE vs SNORLAX) in both scenes,
# twice in fresh processes (idle94Probe.py, 6 parallel); r1 == r2 byte for byte and == off108's committed probe-sha256.json.
set -eu
OUT=${1:?usage: chg161Run.sh <out-dir>}
PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
mkdir -p "$OUT/r1" "$OUT/r2"
for r in r1 r2; do for m in on off; do for s in dig-ply-primeape-snorlax razor-wind-ply-primeape-snorlax solar-beam-ply-primeape-snorlax; do
  echo "$OUT/$r/off108-$s-$m.json $m tools/integration/fixtures/off108/scenarios/off108-$s.json"
done; done; done | xargs -P 6 -n 3 sh -c 'python3 tools/run-mgba-probe.py "$0" -- '"$PY"' tools/integration/idle94Probe.py "$2" "$1" "$0" > /dev/null 2>&1'
fail=0
for f in "$OUT"/r1/*.json; do
  b=$(basename "$f")
  a=$(shasum -a 256 "$f" | cut -d' ' -f1); c=$(shasum -a 256 "$OUT/r2/$b" | cut -d' ' -f1)
  want=$(python3 -c "import json,sys;print(json.load(open('tools/integration/fixtures/off108/receipts/probe-sha256.json'))['sha256'][sys.argv[1]]['r1'])" "$b")
  if [ "$a" = "$c" ] && [ "$a" = "$want" ]; then echo "SAME $b"; else echo "DIFF $b r1=$a r2=$c off108=$want"; fail=1; fi
done
exit $fail
