#!/bin/sh
# prep14: full reproduction (run from workspace/). Direct mGBA only (never the shared HTTP oracles). Probes run twice from fresh processes and are cmp'd.
#   sh tools/integration/prep14Run.sh            ~3 min on 16 cores
set -e
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
ACC="mechanic-rain-dance-player-wooper-opponent-onix mechanic-rain-dance-opponent-wooper-player-onix mechanic-overheat-player-solrock-opponent-shuckle mechanic-overheat-opponent-magcargo-player-shuckle mechanic-curse-ghost-player-haunter-opponent-magikarp mechanic-curse-ghost-opponent-haunter-player-magikarp mechanic-curse-stat-player-snorlax-opponent-magikarp mechanic-curse-stat-opponent-snorlax-player-magikarp mechanic-silver-wind-player-butterfree-opponent-onix mechanic-silver-wind-opponent-butterfree-player-onix mechanic-water-pulse-player-lombre-opponent-onix mechanic-water-pulse-opponent-lombre-player-onix mechanic-psych-up-player-jumpluff-opponent-ninjask mechanic-psych-up-opponent-jumpluff-player-ninjask mechanic-hail-player-delibird-opponent-onix mechanic-hail-opponent-delibird-player-onix"
python3 tools/integration/prep14AltScenarios.py                      # writes tools/battle-lab/prep14-*-alt-*.json (curse-stat MILTANK is female-only: gender patched by hand, see the doc papercuts)
ALT=$(ls tools/battle-lab/prep14-*.json | xargs -n1 basename | sed 's/.json//')
JOBS=16 sh tools/integration/prep14Probes.sh /tmp/p14 $ACC $ALT       # Random2 attribution probes x2 -> /tmp/p14/<scenario>-r{1,2}.json
for r in r1 r2; do mkdir -p /tmp/p14a/$r /tmp/p14b/$r; done          # allocator-state probes x2 (+ palette-bank snapshots at ages 1,2,3,5,8,12)
for s in $ACC $ALT; do for r in r1 r2; do echo "$s $r"; done; done | xargs -P 16 -n 2 sh -c '$PY tools/integration/prep13Probe.py "tools/battle-lab/$0.json" "/tmp/p14a/$1/$0.json" >/dev/null 2>&1 || true'
for s in $ACC $ALT; do for r in r1 r2; do echo "$s $r"; done; done | xargs -P 16 -n 2 sh -c '$PY tools/integration/prep14Probe.py "tools/battle-lab/$0.json" "/tmp/p14b/$1/$0.json" >/dev/null 2>&1 || true'
for d in p14a p14b; do for f in /tmp/$d/r1/*; do cmp -s $f /tmp/$d/r2/$(basename $f) || { echo "DIFF $f"; exit 1; }; done; done; echo "allocator/palette probes: r1 == r2 byte-identical"
python3 tools/integration/prep14Analyze.py /tmp/p14a/r1 > /dev/null
python3 tools/integration/prep14Plans.py /tmp/p14 /tmp/p14a/r1 tools/integration/fixtures/prep14/plans.json
python3 tools/integration/prep14Constants.py /tmp/p14a/r1 tools/integration/fixtures/prep14/prep14-constants.json > /dev/null
python3 tools/integration/prep14Palette.py /tmp/p14b/r1 tools/integration/fixtures/prep14/prep14-palette.json > /dev/null
python3 tools/integration/prep14Receipts.py
for t in RainDanceCheck WaterPulseCheck HailCheck OverheatCheck SilverWindCheck GeometryProvenance OverheatRngLag; do npx vite-node tools/integration/prep14$t.ts > /dev/null; done
echo done
