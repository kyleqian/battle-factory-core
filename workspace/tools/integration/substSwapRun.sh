#!/bin/sh
# S10A Substitute swaps: fresh probes (twice, cmp) + the production window check on BOTH runs + negative controls + the
# GOLEM-player Headbutt attribution (swap rows 0 px; body residual == the non-subbed control's, per row).
# usage (from workspace/): OUT=<fresh dir> REC=<fresh dir> sh tools/integration/substSwapRun.sh   [SKIP_PROBES=1 reuses OUT]
set -e
[ -n "$OUT" ] && [ -n "$REC" ] || { echo "OUT=<dir> REC=<dir> required"; exit 2; }
mkdir -p "$REC"
[ -n "$SKIP_PROBES" ] || sh tools/integration/substSwapProbes.sh
CHECK="node --experimental-strip-types --no-warnings tools/integration/substSwapLiveCheck.ts"
# Production supplies no sprite-order lend after these histories (the tracker does not know Substitute); every proven body
# must be exact without one.
export POKEBENCH_LIVE_ORDER_INPUT=none
EXACT="subswap-on-opponent-golem-onix-headbutt subswap-on-player-zigzagoon-onix-headbutt subswap-on-opponent-onix-golem-headbutt subswap-on-player-persian-slowbro-bodyslam subswap-on-opponent-persian-slowbro-bodyslam subswap-on-opponent-golbat-slowbro-bodyslam subswap-on-player-persian-slowbro-leechseed subswap-on-opponent-persian-slowbro-leechseed subswap-on-player-persian-golbat-bodyslam"
for r in 1 2; do
  specs=""; for s in $EXACT; do specs="$specs $OUT/$s-r$r.json:$OUT/$s-r$r-rgb"; done
  $CHECK --out="$REC/exact-r$r.json" $specs > "$REC/exact-r$r.out"
  $CHECK --attribute --out="$REC/golem-player-r$r.json" "$OUT/subswap-on-player-golem-onix-headbutt-r$r.json:$OUT/subswap-on-player-golem-onix-headbutt-r$r-rgb" > "$REC/golem-player-r$r.out"
  $CHECK --plain --attribute --out="$REC/golem-control-r$r.json" "$OUT/subswap-ctrl-player-golem-onix-headbutt-r$r.json:$OUT/subswap-ctrl-player-golem-onix-headbutt-r$r-rgb" > "$REC/golem-control-r$r.out"
done
# Seismic Toss (not proven; stays declined): recorded for the record, expected to fail in the body.
for r in 1; do
  $CHECK --out="$REC/seismictoss-unproven-r$r.json" "$OUT/subswap-on-player-persian-slowbro-seismictoss-r$r.json:$OUT/subswap-on-player-persian-slowbro-seismictoss-r$r-rgb" > "$REC/seismictoss-unproven-r$r.out" 2>&1 && { echo "unexpected: unproven Seismic Toss exact"; exit 1; } || true
done
# Negative controls must FAIL.
for neg in lag1 noIdle; do
  $CHECK --neg=$neg --out="$REC/neg-$neg.json" "$OUT/subswap-on-player-persian-slowbro-bodyslam-r1.json:$OUT/subswap-on-player-persian-slowbro-bodyslam-r1-rgb" "$OUT/subswap-on-opponent-persian-slowbro-bodyslam-r1.json:$OUT/subswap-on-opponent-persian-slowbro-bodyslam-r1-rgb" > "$REC/neg-$neg.out" 2>&1 && { echo "negative control $neg passed"; exit 1; } || true
done
python3 - "$REC" <<'PY'
import json, sys
rec = sys.argv[1]
def load(n): return json.load(open(f"{rec}/{n}.json"))["results"]
for n in ("exact", "golem-player", "golem-control"):
    a, b = load(n + "-r1"), load(n + "-r2")
    assert [x["digest"] for x in a] == [x["digest"] for x in b], f"{n}: r1 != r2"
ctrl = {x["bodyPerRowDigest"] for x in load("golem-control-r1")}
for w in load("golem-player-r1"):
    assert w["swapRowsResidual"] == 0 and w["bodyPerRowDigest"] in ctrl, w
for neg in ("lag1", "noIdle"):
    assert any(x["residualPixels"] > 0 for x in load("neg-" + neg)), neg
ex = load("exact-r1")
print(f"exact windows {len(ex)} x2 runs: residual {sum(x['residualPixels'] for x in ex)}; golem player swap rows 0, body == control; negatives fail")
PY
