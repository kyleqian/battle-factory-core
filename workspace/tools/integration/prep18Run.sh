#!/bin/sh
# prep18: reproduction of the probes (run from workspace/). Direct mGBA only. Every probe twice from fresh processes, cmp'd.
#   sh tools/integration/prep18Run.sh   (~10-15 min)
set -e
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
ACC="mechanic-dig-player-vibrava-opponent-chansey mechanic-dig-opponent-vibrava-player-chansey mechanic-megahorn-player-seaking-opponent-onix mechanic-megahorn-opponent-seaking-player-onix mechanic-will-o-wisp-player-shuppet-opponent-shuckle mechanic-will-o-wisp-opponent-shuppet-player-shuckle mechanic-fury-cutter-player-grovyle-opponent-blissey mechanic-fury-cutter-opponent-grovyle-player-blissey mechanic-return-player-dragonair-opponent-onix mechanic-return-opponent-dragonair-player-onix mechanic-return-weak-player-dragonair-opponent-onix mechanic-return-weak-opponent-dragonair-player-onix mechanic-return-medium-player-dragonair-opponent-onix mechanic-return-medium-opponent-dragonair-player-onix mechanic-return-strong-player-dragonair-opponent-onix mechanic-return-strong-opponent-dragonair-player-onix mechanic-pursuit-player-beedrill-opponent-shuckle mechanic-pursuit-opponent-beedrill-player-shuckle"
python3 tools/integration/prep18AltScenarios.py
STAGE=${STAGE:-all}
ALT=$(ls tools/battle-lab/prep18-*.json | xargs -n1 basename | sed 's/.json//')
JOBS=${JOBS:-12} sh tools/integration/prep14Probes.sh /tmp/p18 $ACC $ALT       # Random2 attribution probes x2 -> /tmp/p18/<scenario>-r{1,2}.json
for r in r1 r2; do mkdir -p /tmp/p18a/$r /tmp/p18b/$r; done
if [ $STAGE = all -o $STAGE = 2 ]; then for s in $ACC $ALT; do for r in r1 r2; do echo "$s $r"; done; done | xargs -P ${JOBS:-12} -n 2 sh -c '$PY tools/integration/prep13Probe.py "tools/battle-lab/$0.json" "/tmp/p18a/$1/$0.json" >/dev/null 2>&1 || true'; fi
if [ $STAGE = all -o $STAGE = 3 ]; then for s in $ACC $ALT; do for r in r1 r2; do echo "$s $r"; done; done | xargs -P ${JOBS:-12} -n 2 sh -c '$PY tools/integration/prep14Probe.py "tools/battle-lab/$0.json" "/tmp/p18b/$1/$0.json" >/dev/null 2>&1 || true'; fi
[ $STAGE = all -o $STAGE = 3 ] || exit 0
for d in p18a p18b; do for f in /tmp/$d/r1/*; do cmp -s $f /tmp/$d/r2/$(basename $f) || { echo "DIFF $f"; exit 1; }; done; done; echo "allocator/palette probes: r1 == r2 byte-identical"
python3 tools/integration/prep18Analyze.py /tmp/p18a/r1
echo done
