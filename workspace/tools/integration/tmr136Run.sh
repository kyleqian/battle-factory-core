#!/bin/sh
# tmr136 reproduction (docs/tmr136-timing-remainders.md). Run from workspace/ (the checkout or a git-archive copy with node_modules /
# reference / artifacts symlinked) with a FRESH <out-dir> INSIDE the repo (the probes find ../oracle from there). Direct mGBA processes
# only (never the shared HTTP oracles), explicit lab seeds (the scenario files). Receipts land in <out-dir>/rec and are compared with the
# banked tools/integration/fixtures/tmr136/ (`same` / `DIFF`).
#   sh tools/integration/tmr136Run.sh <fresh-out-dir>          (~4 min on an idle machine)
# (A) the live Double Team stats-change tail: tmr136Probes.sh (tmr136Probe.py = prep48Probe.py + a 12-frame tail, r1 / r2 fresh) over six
#     dt60 scenarios (both sides, 6 species pairs, 2 DT bodies each), then tmr136DtTail.ts per scenario (every row -1 .. 238 through
#     production vs the ROM; the ROM's box change after the tail).
# (B) Smokescreen: aud129Stage.py's 16 Smokescreen scenarios, audit20Probes.py + audit20Fixtures.py + the aud110 / aud129 alignment, then
#     tmr136SmokeCheck.ts (two more fresh probes per scenario) with the production host's use ordinal and with it withheld (the revert
#     experiment), summarised by tmr136SmokeSummary.py.
set -e
OUT=${1:?usage: tmr136Run.sh <fresh-out-dir>}
[ ! -e "$OUT" ] || { echo "refusing: $OUT exists"; exit 1; }
mkdir -p "$OUT/rec"; OUT=$(cd "$OUT" && pwd)
T=tools/integration; F=$T/fixtures/tmr136; REC=$OUT/rec
same() { if cmp -s "$1" "$2"; then echo "same $(basename "$2")"; else echo "DIFF $(basename "$2")"; fi; }

# (A)
S=$T/fixtures/dt60/scenarios
sh $T/tmr136Probes.sh "$OUT/dt" $S/dt60-opp-umbreon.json $S/dt60-opp-scyther.json $S/dt60-opp-gardevoir.json $S/dt60-ply-umbreon.json \
  $S/dt60-ply-scyther.json $S/dt60-ply-metagross.json
mkdir -p "$REC/dt-tail"
for s in dt60-opp-umbreon dt60-opp-scyther dt60-opp-gardevoir dt60-ply-umbreon dt60-ply-scyther dt60-ply-metagross; do
  node --experimental-strip-types --no-warnings $T/tmr136DtTail.ts $T/fixtures/dt60/fixtures $s "$OUT/dt" "$REC/dt-tail/$s.json"
  same "$F/dt-tail/$s.json" "$REC/dt-tail/$s.json"
done

# (B)
python3 $T/aud129Stage.py "$OUT/scall" | tail -1
mkdir -p "$OUT/sc"; for f in "$OUT"/scall/*.json; do case $(basename "$f") in *108*|*smokescreen*) cp "$f" "$OUT/sc/";; esac; done
AUDIT20_JOBS=12 python3 $T/audit20Probes.py "$OUT/probe1" "$OUT"/sc/*.json | grep -v " exit 0$" || true
python3 $T/audit20Fixtures.py "$OUT/probe1" "$OUT/fx1" "$OUT/sc" > "$REC/smoke-derive.txt"
awk '$2=="ODOR_SLEUTH"||$2=="FALSE_SWIPE"||$2=="TACKLE"{print $1}' "$REC/smoke-derive.txt" | while read f; do rm "$OUT/fx1/$f"; done
python3 $T/aud110Align.py "$OUT/fx1" "$OUT/fxh" > /dev/null
python3 $T/aud129Align.py "$OUT/fxh" "$OUT/fxa"
STF115_CHECK=tmr136SmokeCheck sh $T/stf115Check.sh "$OUT/fxa" . "$OUT/check-final"
TMR136_USE=off STF115_CHECK=tmr136SmokeCheck sh $T/stf115Check.sh "$OUT/fxa" . "$OUT/check-revert"
python3 $T/tmr136SmokeSummary.py "$OUT/check-final" "$OUT/fxa" "$REC/smoke-final.json"
python3 $T/tmr136SmokeSummary.py "$OUT/check-revert" "$OUT/fxa" "$REC/smoke-revert.json"
for f in smoke-derive.txt smoke-final.json smoke-revert.json; do same "$F/$f" "$REC/$f"; done
rm -rf "$OUT/dt/r1"/*/rgb "$OUT/dt/r2"/*/rgb "$OUT/probe1"
