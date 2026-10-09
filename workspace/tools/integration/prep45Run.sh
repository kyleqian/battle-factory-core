#!/bin/sh
# prep45 reproduction (run from workspace/ of a clean checkout; direct mGBA processes only, never the shared HTTP oracles).
#   OUT=/tmp/p45-repro REC=/tmp/p45-rec sh tools/integration/prep45Run.sh   # ~7 min: probes (104 jobs x 2 fresh), census x2, replays x2
#   SKIP_PROBES=1 ...   reuse $OUT/raw;   SKIP_CENSUS=1 ...   skip the two 300-battle census runs (and the chain / delta receipts)
# Writes receipts into $REC; compare with tools/integration/fixtures/prep45/ (the loop at the end prints same/DIFF per file).
# The src experiment is applied from the committed .diff and ALWAYS reverted; `git status --short src` must print nothing.
set -e
: "${OUT:?set OUT=<scratch dir>}"; : "${REC:?set REC=<receipt dir>}"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
T=tools/integration; F=$T/fixtures/prep45; N="node --experimental-strip-types --no-warnings"
ALL="status animation BRN|general animation TURN_TRAP FIRE_SPIN|general animation TURN_TRAP WHIRLPOOL|general animation TURN_TRAP SAND_TOMB|general animation TURN_TRAP WRAP|general animation TURN_TRAP BIND|general animation INGRAIN_HEAL|general animation WISH_HEAL|general animation FUTURE_SIGHT_HIT|body 56 HYDRO_PUMP|body 179 REVERSAL|body 76 SOLAR_BEAM|body 195 PERISH_SONG|body 349 DRAGON_DANCE|body 135 SOFT_BOILED|body 315 OVERHEAT|body 345 MAGICAL_LEAF|body 236 MOONLIGHT"
SCAN="Status_Burn Move_HYDRO_PUMP Move_REVERSAL Move_MAGICAL_LEAF Move_SOFT_BOILED Move_OVERHEAT Move_PERISH_SONG Move_DRAGON_DANCE Move_SOLAR_BEAM General_IngrainHeal Status_FireSpin Status_Whirlpool Status_SandTomb Status_BindWrap General_WishHeal General_FutureSightHit Move_MOONLIGHT Move_ATTRACT Move_MEGA_DRAIN Move_DREAM_EATER Move_BLIZZARD Move_WATER_SPOUT Move_SAND_ATTACK Move_MUD_SLAP Move_DIVE Move_ICE_BALL"
mkdir -p "$OUT" "$REC"
test -z "$(git status --short src)" || { echo "src is not clean"; exit 1; }
trap 'git checkout -- src' EXIT
if [ -z "$SKIP_PROBES" ]; then $PY $T/prep45Probe.py "$OUT" --jobs 12; fi
python3 $T/prep45Extract.py "$OUT" "$REC/units.json" > "$REC/units-summary.txt"; head -1 "$REC/units-summary.txt"
$N $T/prep45Check.ts "$REC/units.json" "$REC/check.json" > /dev/null
python3 $T/prep45RandomScan.py $SCAN > "$REC/random-scan.txt"
$N $T/prep45CorpusReplay.ts "$REC/replay-before.json" | head -2
if [ -z "$SKIP_CENSUS" ]; then
  census() { $N $T/prep45OrderCensus.ts --seeds=0..299 --out="$1" --commands="$2" 2>&1 | tail -1; }
  census "$REC/census-before-seeds0-299.json" "$OUT/census-before.jsonl"
  python3 $T/prep45Chains.py "$OUT/census-before.jsonl" "$REC/chains-before-seeds0-299.json" > /dev/null
fi
git apply $F/prep45-temp-src.diff
$N $T/prep45CorpusReplay.ts "$REC/replay-after.json" | head -2
if [ -z "$SKIP_CENSUS" ]; then
  census "$REC/census-after-all-seeds0-299.json" "$OUT/census-after-all.jsonl"
fi
git checkout -- src
if [ -z "$SKIP_CENSUS" ]; then
  python3 $T/prep45Chains.py "$OUT/census-before.jsonl" "$REC/chains-predict-all.json" --cleared "$ALL" --after "$OUT/census-after-all.jsonl" | sed -n 2,3p
  python3 $T/prep45Chains.py "$OUT/census-after-all.jsonl" "$REC/chains-after-all-seeds0-299.json" > /dev/null
  python3 $T/prep43CensusDelta.py "$REC/census-before-seeds0-299.json" "$OUT/census-before.jsonl" \
    "$REC/census-after-all-seeds0-299.json" "$OUT/census-after-all.jsonl" "$REC/census-delta-all-seeds0-299.json" | head -2
fi
test -z "$(git status --short src)" && echo "src reverted"
for f in "$REC"/*.json "$REC"/*.txt; do cmp -s "$f" "$F/$(basename "$f")" && echo "same  $(basename "$f")" || echo "DIFF  $(basename "$f")"; done
