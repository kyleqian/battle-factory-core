#!/bin/sh
# soak111: reproduce tools/integration/fixtures/soak111/decoupling-receipt.json from scratch.
#   sh tools/integration/soak111Run.sh <fresh-out-dir-inside-the-repo>     (from workspace/; ~1-2 min)
# 1. git-archives the tested commit (SOAK111_REV, default HEAD) and the coupled base driver (cd84c00fe)
#    into <out>/{dec,dec+off108,cpl,cpl+off108}/workspace; the +off108 copies get
#    fixtures/soak111/off108-scene-off-pauses.diff (byte copy of d31a93720's off108 fixture) via patch -p1;
# 2. soak111Decoupling.ts (full policy, first-round, seeds SOAK111_SEEDS) in all four copies, in parallel;
# 3. soak111Compare.py -> <out>/decoupling-receipt.json, compared with the committed receipt (ALL SAME or a diff).
set -eu
OUT=$1
REV=${SOAK111_REV:-HEAD}
SEEDS=${SOAK111_SEEDS:-0..15,27}
W=$(pwd)
if [ -e "$OUT" ]; then echo "out dir $OUT exists" >&2; exit 1; fi
mkdir -p "$OUT/run"
OUT=$(cd "$OUT" && pwd)
DIFF="$W/tools/integration/fixtures/soak111/off108-scene-off-pauses.diff"
for v in dec dec+off108 cpl cpl+off108; do
  rev=$REV; case $v in cpl*) rev=cd84c00fe ;; esac
  mkdir -p "$OUT/$v/workspace"
  git archive "$rev" . | tar -x -C "$OUT/$v/workspace"
  ln -s "$W/node_modules" "$OUT/$v/workspace/node_modules"
  cp "$W/tools/integration/soak111Decoupling.ts" "$OUT/$v/workspace/tools/integration/soak111Decoupling.ts"
  case $v in *+off108) (cd "$OUT/$v" && patch -p1 -s < "$DIFF") ;; esac
done
for v in dec dec+off108 cpl cpl+off108; do
  (cd "$OUT/$v/workspace" && node --experimental-strip-types --no-warnings tools/integration/soak111Decoupling.ts \
    --policy=full --seeds="$SEEDS" --logs-dir="$OUT/run/$v-logs" --out="$OUT/run/$v.json" > "$OUT/run/$v.log" 2>&1) &
done
wait
for v in dec dec+off108 cpl cpl+off108; do
  [ -s "$OUT/run/$v.json" ] || { echo "variant $v produced no summary; see $OUT/run/$v.log" >&2; exit 1; }
done
cat > "$OUT/identity.json" <<JSON
{
  "testedRev": "$REV",
  "testedDriverTree": "$(git rev-parse "$REV:workspace/tools/soak")",
  "testedSrcTree": "$(git rev-parse "$REV:workspace/src")",
  "coupledBaseRev": "cd84c00fe",
  "coupledBaseDriverTree": "$(git rev-parse "cd84c00fe:workspace/tools/soak")",
  "off108DiffSha256": "$(shasum -a 256 "$DIFF" | cut -d' ' -f1)",
  "off108DiffSource": "d31a93720:workspace/tools/integration/fixtures/off108/off108-scene-off-pauses.diff",
  "patchedSrcFileSha256": "$(shasum -a 256 "$OUT/dec+off108/workspace/src/engine/battleResolutionPresentation.ts" | cut -d' ' -f1)",
  "seeds": "$SEEDS"
}
JSON
python3 "$W/tools/integration/soak111Compare.py" "$OUT" "$OUT/decoupling-receipt.json" "$OUT/identity.json"
if cmp -s "$OUT/decoupling-receipt.json" "$W/tools/integration/fixtures/soak111/decoupling-receipt.json"; then
  echo "ALL SAME"
else
  echo "receipt differs from the committed one:"
  diff "$W/tools/integration/fixtures/soak111/decoupling-receipt.json" "$OUT/decoupling-receipt.json" | head -40 || true
fi
