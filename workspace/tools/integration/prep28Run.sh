#!/bin/sh
# prep28 reproduction (run from workspace/; the worktree checkout, never the shared HTTP oracles: every probe is a direct mGBA process).
#   sh tools/integration/prep28Run.sh            # everything (~15 min): rank, route blockers, probes A+B (cmp), tie verdicts, rows, patch experiment, replays
#   SKIP_PROBES=1 sh tools/integration/prep28Run.sh   # reuse raw probe rows in $OUT (default /tmp/p28)
# The src experiment is applied from the committed .patch and ALWAYS reverted (git apply -R); `git status --short src` must print nothing at the end.
set -e
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py OUT=${OUT:-/tmp/p28}; F=tools/integration/fixtures/prep28; T=tools/integration
python3 $T/prep28Rank.py $F/ranked-gaps-weight.json > /dev/null
if [ -z "$SKIP_PROBES" ]; then
  python3 $T/prep28Rely.py gen
  python3 $T/prep28Rely.py probe --jobs 14                  # runs A and B (separate fresh mGBA processes) of every scenario
  python3 $T/prep28Tie.py > /dev/null; python3 $T/prep28Rely.py retry; python3 $T/prep28Rely.py probe --jobs 14
fi
n=0; for a in $OUT/*-A.json; do cmp -s "$a" "${a%-A.json}-B.json" || { echo "A/B DIFF $a"; n=$((n+1)); }; done; echo "probe pairs not identical: $n"
python3 $T/prep28Tie.py --write | head -1
python3 $T/prep28Charge.py --write; python3 $T/prep28Events.py
# before (master src)
for s in 0 1 2 3; do node --experimental-strip-types $T/prep28RouteBlock.ts 150 "$s,$s,$s" $F/routescan-before-$s.json > /dev/null & done; wait
node --experimental-strip-types $T/prep28Replay.ts /tmp/p28-replay-before.json; node --experimental-strip-types $T/prep28SnoreCheck.ts /tmp/p28-snore-before.json
python3 $T/prep28Aggregate.py $F/ranked-gaps.json $F/ranked-gaps-weight.json $F/routescan-before-?.json > /dev/null
# after (temporary src experiment)
node --experimental-strip-types $T/prep28Patch.ts; git diff -- src > /tmp/p28-regenerated.patch; cmp /tmp/p28-regenerated.patch $F/prep28-temp-src.patch && echo "patch == committed patch"
git checkout -- src; git apply $F/prep28-temp-src.patch
for s in 0 1 2 3; do node --experimental-strip-types $T/prep28RouteBlock.ts 150 "$s,$s,$s" $F/routescan-after-$s.json > /dev/null & done; wait
node --experimental-strip-types $T/prep28Replay.ts /tmp/p28-replay-after.json; node --experimental-strip-types $T/prep28SnoreCheck.ts /tmp/p28-snore-after.json
git apply -R $F/prep28-temp-src.patch; git status --short src
echo done
