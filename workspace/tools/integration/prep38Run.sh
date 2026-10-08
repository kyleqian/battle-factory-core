#!/bin/sh
# prep38 reproduction (run from workspace/). Direct mGBA only (never the shared HTTP oracles). Both dirs are caller-given.
#   OUT=<fresh probe dir> REC=<receipt dir> sh tools/integration/prep38Run.sh              # probes (twice fresh, compared) + every checker
#   OUT=<existing probe dir> REC=<dir2> SKIP_PROBES=1 sh tools/integration/prep38Run.sh    # second checker pass; diff -r the receipt dirs
# The temporary src patches (tools/integration/fixtures/prep38/*.diff) are applied one at a time and ALWAYS reverted (trap); src must be clean.
set -e
[ -n "$OUT" ] && [ -n "$REC" ] || { echo "usage: OUT=<probe dir> REC=<receipt dir> sh tools/integration/prep38Run.sh"; exit 2; }
[ -z "$(git status --porcelain src)" ] || { echo "src not clean"; exit 2; }
P38=tools/integration/fixtures/prep38; LIST=$P38/scenarios/list.tsv; mkdir -p "$REC"
python3 tools/integration/prep38Stage.py $P38/scenarios > /dev/null
[ -z "$(git status --porcelain $P38/scenarios)" ] || echo "WARNING: staged scenarios differ from the committed ones"
[ -n "$SKIP_PROBES" ] || OUT=$OUT sh tools/integration/prep38Probes.sh 2>&1 | grep -v "Segmentation fault"
python3 tools/integration/prep38Fixtures.py "$OUT" "$REC/derived" $LIST > "$REC/fixtures.txt"
C="$REC/derived/*-control.json"; T="$REC/derived/*-test.json"
run() {  # run <receipt subdir> [env...] -- CheckAll with the current src
  d=$1; shift; env "$@" PROBES="$OUT" REC="$REC/$d" P=${P:-12} sh tools/integration/prep38CheckAll.sh $FIX > /dev/null 2>&1 || true; }
trap 'git checkout -q src' EXIT
# 1. doll-free CONTROL bodies, production as is, age shift calibrated per body (scan -24..24)
FIX=$(ls $C); run control CAL=1
# 2. TEST bodies (defender shown as the doll), production as is = the decline fallback (static Scene OFF field)
FIX=$(ls $T); run fallback SHIFTS="$REC/control"
# 3. the three patch variants (cumulative): v1 liveSceneOnBattlerArt + decline lift + anchors; v2 + every species-art asset lookup; v3 + the
#    palette composite. Order input: production's (unknown after 164 -> declines) and drop-164 (164 treated as order-neutral).
for v in env assets-env assets-palette-env; do
  git apply $P38/defender-doll-art-$v.diff
  run $v-prodorder SHIFTS="$REC/control"
  run $v ORDER=drop-164 SHIFTS="$REC/control"
  if [ $v = env ]; then  # negative controls of the two source-derived anchors
    run neg-center ORDER=drop-164 SHIFTS="$REC/control" PREP38_DOLL_CENTER=doll
    run neg-rest ORDER=drop-164 SHIFTS="$REC/control" PREP38_DOLL_REST=species
  fi
  git checkout -q src
done
python3 tools/integration/prep38Summary.py "$REC" > "$REC/summary.txt"
echo "receipts in $REC"
