#!/usr/bin/env bash
# usage: perseed.sh TAG [SEEDS...] -> TOTAL mass per seed of .integration/evidence/ihm1/all-TAG (symlink dirs under /tmp-free .integration/evidence/ihm1/ps-TAG)
cd "$(dirname "$0")/../../.."
T=$1; shift; D=.integration/evidence/ihm1/all-$T
for s in ${*:-$(ls $D/*-off.engine.json | sed 's#.*/##; s#-off.*##')}; do P=.integration/evidence/ihm1/ps-$T-$s; rm -rf $P; mkdir -p $P; for f in $D/$s-off.*; do ln -s $PWD/$f $P/$(basename $f); done
  echo "s$s $(python3 tools/audio/soundScoreboard.py $P 2>&1 | grep -E '^TOTAL' | tr -s ' ')"; done
