#!/bin/sh
# prep41 full reproduction (docs/next-adapters-prep41.md). Direct mGBA only; never touches the shared HTTP oracles.
#   OUT=<scratch dir> REC=<receipt dir> sh tools/integration/prep41Run.sh      (~12 min on 8 jobs)
# 1. Pursuit / Hidden Power counters (2 fresh runs per scenario) -> REC/{pursuit,hidden-power}-counters.json; the derived window fixtures
#    must equal the committed tools/integration/fixtures/prep41/windows.
# 2. TEMPORARY production patch tools/integration/fixtures/prep41/prep41-d4-widening.diff (applied, reverted on exit; src must be clean),
#    every window through the production live renderer, 2 passes x 2 fresh probe processes -> REC/{pursuit,hidden-power}-check.json.
# 3. Ghost Curse half (prep41CurseRun.sh) -> REC/curse-{p1,ghost-check,pixels-s14}.json.
# 4. cmp every receipt with the committed copy (prints MATCH / DIFF).
set -e
cd "$(dirname "$0")/../.."
OUT=${OUT:?OUT=scratch dir}; REC=${REC:?REC=receipt dir}; mkdir -p "$OUT" "$REC"
FX=tools/integration/fixtures/prep41
git diff --quiet -- src && [ -z "$(git status --porcelain src)" ] || { echo "prep41Run: src must be clean (the patch is applied temporarily)"; exit 1; }
PF="$(ls tools/integration/fixtures/oam1-live/pursuit*.json tools/integration/fixtures/species-audit-5/derived/tyranitar*pursuit*.json tools/integration/fixtures/later-bodies-lb26/pursuit*.json)"
HF="$(ls tools/integration/fixtures/prep13-live/hidden*.json | grep -v gengar) $(ls tools/integration/fixtures/species-audit-3/derived/*hidden-power*.json)"
sh tools/integration/issue151Counters.sh "$OUT/counters" "${JOBS:-8}" $PF > "$OUT/counters.txt"
sh tools/integration/issue151Counters.sh "$OUT/hpcounters" "${JOBS:-8}" $HF > "$OUT/hpcounters.txt"
python3 tools/integration/prep41Counters.py "$OUT/counters" 228 82 "$REC/pursuit-counters.json" $PF > /dev/null
python3 tools/integration/prep41Counters.py "$OUT/hpcounters" 237 64 "$REC/hidden-power-counters.json" $HF > /dev/null
rm -rf "$OUT/windows"
python3 tools/integration/prep41Windows.py "$REC/pursuit-counters.json" pursuit "$OUT/windows" > /dev/null
python3 tools/integration/prep41Windows.py "$REC/hidden-power-counters.json" hp "$OUT/windows" > /dev/null
diff -r "$OUT/windows" "$FX/windows" > /dev/null || { echo "prep41Run: derived window fixtures differ from $FX/windows"; exit 1; }
git apply "$FX/prep41-d4-widening.diff"          # TEMPORARY
trap 'git checkout -- src' EXIT
for p in p1 p2; do rm -rf "$OUT/dense/$p"; sh tools/integration/prep41Dense.sh "$OUT/dense/$p" "$FX"/windows/*.json; done
git checkout -- src; trap - EXIT
python3 tools/integration/prep41Summary.py "$OUT/dense/p1" "$OUT/dense/p2" "$REC/pursuit-check.json" PURSUIT | head -1
python3 tools/integration/prep41Summary.py "$OUT/dense/p1" "$OUT/dense/p2" "$REC/hidden-power-check.json" HIDDEN_POWER | head -1
OUT="$OUT" REC="$REC" sh tools/integration/prep41CurseRun.sh
for f in pursuit-counters hidden-power-counters pursuit-check hidden-power-check curse-p1 curse-ghost-check curse-pixels-s14; do
  cmp -s "$REC/$f.json" "$FX/$f.json" && echo "MATCH $f.json" || echo "DIFF $f.json"
done
