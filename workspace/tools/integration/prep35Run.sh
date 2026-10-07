#!/bin/sh
# prep35 reproduction (run from workspace/). Direct mGBA only (never the shared HTTP oracles). Both dirs are caller-given; nothing in /tmp is reused implicitly.
#   OUT=<fresh probe dir> REC=<receipt dir> sh tools/integration/prep35Run.sh             # probes (each scenario twice from fresh processes, state cmp + RGB diff -rq) + checks + pixels + negatives
#   OUT=<existing probe dir> REC=<dir2> SKIP_PROBES=1 sh tools/integration/prep35Run.sh   # second checker pass over the same probes; cmp the receipts
#   STAGES="skillswap" ...                                                                 # subset of: skillswap flatter
set -e
[ -n "$OUT" ] && [ -n "$REC" ] || { echo "usage: OUT=<probe dir> REC=<receipt dir> sh tools/integration/prep35Run.sh"; exit 2; }
STAGES=${STAGES:-skillswap flatter}; mkdir -p "$REC" "$OUT/scratch"; export OUT
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
probe() { for r in 1 2; do ( rm -rf "$OUT/$2-r$r.json" "$OUT/$2-r$r-rgb"; mkdir -p "$OUT/$2-r$r-rgb"; $PY tools/compare/$1 tools/battle-lab/$2.json "$OUT/$2-r$r.json" "$OUT/$2-r$r-rgb" > "$OUT/$2-r$r.log" 2>&1 || true ) & done; }
verify() { for n in "$@"; do f="$OUT/$n-r1.json"; [ -s "$f" ] || { echo "EMPTY $f"; exit 1; }; cmp -s "$f" "$OUT/$n-r2.json" || { echo "DIFF $f"; exit 1; }
  diff -rq "$OUT/$n-r1-rgb" "$OUT/$n-r2-rgb" > /dev/null || { echo "RGB DIFF $n"; exit 1; }; done; echo "probes: r1 == r2 byte-identical, state + RGB ($#)"; }
EV=tools/compare/evidence
SS_ALT="prep22-skill-swap-alt-player-alakazam-golem:player prep22-skill-swap-alt-opponent-alakazam-golem:opponent prep33-skill-swap-alt-player-espeon-weezing:player prep33-skill-swap-alt-opponent-weezing-snorlax:opponent"
FL_ALT="prep25-flatter-alt-player-hypno-golem:player prep25-flatter-alt-opponent-hypno-golem:opponent"
for w in $STAGES; do case $w in
skillswap)
  if [ -z "$SKIP_PROBES" ]; then N=""; for s in $SS_ALT; do probe skillSwapProbe.py ${s%%:*}; N="$N ${s%%:*}"; done; wait; verify $N 2>&1 | grep -v "Segmentation fault"; fi
  W="$EV/skill-swap-player-dense-state.json.gz:player:$EV/skill-swap-player-raw-rgb.tar.gz $EV/skill-swap-opponent-dense-state.json.gz:opponent:$EV/skill-swap-opponent-raw-rgb.tar.gz"
  for s in $SS_ALT; do n=${s%%:*}; W="$W $OUT/$n-r1.json:${s##*:}:$OUT/$n-r1-rgb"; done
  npx vite-node tools/integration/prep35SkillSwapCheck.ts $W --pixels --scratch=$OUT/scratch --out=$REC/skillswap-check-pixels.json 2> /dev/null
  NEGW="$EV/skill-swap-player-dense-state.json.gz:player:$EV/skill-swap-player-raw-rgb.tar.gz $OUT/prep33-skill-swap-alt-opponent-weezing-snorlax-r1.json:opponent:$OUT/prep33-skill-swap-alt-opponent-weezing-snorlax-r1-rgb"
  for n in anim sort anchor palette blend; do npx vite-node tools/integration/prep35SkillSwapCheck.ts $NEGW --pixels --neg=$n --scratch=$OUT/scratch --out=$REC/skillswap-neg-$n.json 2> /dev/null; done ;;
flatter)
  if [ -z "$SKIP_PROBES" ]; then N=""; for s in $FL_ALT; do probe flatterProbe.py ${s%%:*}; N="$N ${s%%:*}"; done; wait; verify $N 2>&1 | grep -v "Segmentation fault"; fi
  W="$EV/flatter-player-dense-state.json.gz:player:$EV/flatter-player-raw-rgb.tar.gz $EV/flatter-opponent-dense-state.json.gz:opponent:$EV/flatter-opponent-raw-rgb.tar.gz"
  for s in $FL_ALT; do n=${s%%:*}; W="$W $OUT/$n-r1.json:${s##*:}:$OUT/$n-r1-rgb"; done
  npx vite-node tools/integration/prep35FlatterCheck.ts $W --pixels --scratch=$OUT/scratch --out=$REC/flatter-check-pixels.json 2> /dev/null
  NEGW="$EV/flatter-player-dense-state.json.gz:player:$EV/flatter-player-raw-rgb.tar.gz $OUT/prep25-flatter-alt-opponent-hypno-golem-r1.json:opponent:$OUT/prep25-flatter-alt-opponent-hypno-golem-r1-rgb"
  for n in sort burst seed dip; do npx vite-node tools/integration/prep35FlatterCheck.ts $NEGW --pixels --neg=$n --scratch=$OUT/scratch --out=$REC/flatter-neg-$n.json 2> /dev/null; done ;;
esac; done
echo "receipts in $REC"
