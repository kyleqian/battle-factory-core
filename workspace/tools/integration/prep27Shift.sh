#!/bin/sh
# prep27: body-length / lag-phase constancy.  Shifts the body start by 0..5 idle frames (and a 7-frame offset) for the AIPOM scenarios on both sides; then compares the timeline JSONs.
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
OUT=${OUT:-/tmp/p27/shift}; export FS_WINDOW=${FS_WINDOW:-300} FS_PROFILE=battle-scene-on
for n in 0 1 2 3 5 7; do mkdir -p $OUT/s$n
 P27_SHIFT=$n P27_PRESS="75:RIGHT:3,100:A:3,130:A:3" $PY tools/integration/prep27BatonProbe.py tools/battle-lab/mechanic-baton-pass-player-aipom-opponent-onix.json $OUT/s$n/mechanic-baton-pass-player-aipom-opponent-onix.json >/dev/null 2>&1 &
 P27_SHIFT=$n $PY tools/integration/prep27BatonProbe.py tools/battle-lab/mechanic-baton-pass-opponent-aipom-player-onix.json $OUT/s$n/mechanic-baton-pass-opponent-aipom-player-onix.json >/dev/null 2>&1 &
done; wait
for n in 0 1 2 3 5 7; do python3 tools/integration/prep27BatonTimeline.py $OUT/s$n $OUT/tl$n.json >/dev/null; done
python3 - "$OUT" <<'PY'
import json, sys
O = sys.argv[1]; T = {n: json.load(open(f"{O}/tl{n}.json")) for n in (0, 1, 2, 3, 5, 7)}
for sc in T[0]:
    base = T[0][sc]
    for n in T:
        v = T[n][sc]; diff = {k: [base["t"][k], v["t"][k]] for k in base["t"] if base["t"][k] != v["t"][k]}
        print(sc, "shift", n, "bodyFrames", v["body"]["activeFrames"], "hideAge", v["t"]["attackerHideAge"], "diff-vs-shift0", diff or "none")
PY
