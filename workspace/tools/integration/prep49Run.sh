#!/bin/sh
# prep49 reproduction (run from workspace/ of a clean checkout; direct mGBA processes only, never the shared HTTP oracles).
#   OUT=<scratch dir> REC=<receipt dir> sh tools/integration/prep49Run.sh   # ~6 min: probes (8 + 3 jobs x 2 fresh, ~20 s), census x2, replays
#   SKIP_PROBES=1 ...   reuse $OUT/{a,c}/raw;   SKIP_CENSUS=1 ...   skip the two 300-battle census runs (and the delta receipt)
# Writes receipts into $REC; compare with tools/integration/fixtures/prep49/ (the loop at the end prints same/DIFF per file).
# The src experiment is applied from the committed .diff and ALWAYS reverted; `git status --short src` must print nothing.
#   prep49-temp-src-all.diff   Baton Pass returntoball -> forced-switch-out {side}; the AI's DoSwitchOut summary -> switch-out {opponent}
#                              + party-summary-next; the double-KO forced party menu -> battle-reshow with neither battler ("Cfee;Cfee;Cf")
set -e
: "${OUT:?set OUT=<scratch dir>}"; : "${REC:?set REC=<receipt dir>}"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
T=tools/integration; F=$T/fixtures/prep49; N="node --experimental-strip-types --no-warnings"
mkdir -p "$OUT" "$REC"
test -z "$(git status --short src)" || { echo "src is not clean"; exit 1; }
trap 'git checkout -- src' EXIT
if [ -z "$SKIP_PROBES" ]; then
  $PY $T/prep49Probe.py "$OUT/a" --jobs 8
  # the AI voluntary switch (BattleScript_DoSwitchOut) span: prep47 (C)'s Perish Song probes, re-run fresh (unchanged tools)
  $PY $T/prep47AiSwitchProbe.py "$OUT/c"
fi
python3 $T/prep49Extract.py "$OUT/a" "$REC/units.json"
$N $T/prep49Check.ts "$REC/units.json" "$REC/check-before.json"
python3 $T/prep47AiSwitchExtract.py "$OUT/c" "$REC/ai-switch-units.json"
$N $T/prep47AiSwitchCheck.ts "$REC/ai-switch-units.json" "$REC/ai-switch-check.json"
$N $T/prep45CorpusReplay.ts "$REC/replay-before.json" | head -2
census() { $N $T/prep49OrderCensus.ts --seeds=0..299 --out="$REC/census-$1-seeds0-299.json" --commands="$OUT/census-$1.jsonl" 2>&1 | tail -1; }
if [ -z "$SKIP_CENSUS" ]; then census before; fi
git apply $F/prep49-temp-src-all.diff
$N $T/prep49Check.ts "$REC/units.json" "$REC/check-after.json"
$N $T/prep45CorpusReplay.ts "$REC/replay-after-all.json" | head -2
if [ -z "$SKIP_CENSUS" ]; then census after-all; fi
git checkout -- src
if [ -z "$SKIP_CENSUS" ]; then
  python3 $T/prep43CensusDelta.py "$REC/census-before-seeds0-299.json" "$OUT/census-before.jsonl" \
    "$REC/census-after-all-seeds0-299.json" "$OUT/census-after-all.jsonl" "$REC/census-delta-all-seeds0-299.json" | head -2
fi
test -z "$(git status --short src)" && echo "src reverted"
for f in "$REC"/*.json; do cmp -s "$f" "$F/$(basename "$f")" && echo "same  $(basename "$f")" || echo "DIFF  $(basename "$f")"; done
