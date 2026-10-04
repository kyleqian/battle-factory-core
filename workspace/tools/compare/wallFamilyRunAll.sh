#!/bin/bash
# Fresh double runs of the wall-family clock + allocator-call probes.
# usage: wallFamilyRunAll.sh <rawdir>   (rawdir must not already hold outputs)
set -e
RAW=${1:?rawdir}
SC=tools/integration/fixtures/wall-family-scenarios
B=tools/battle-lab
mkdir -p "$RAW"
run() { # move name scenario
  for fresh in 0 1; do
    python3 tools/run-mgba-probe.py "$RAW/$2-clock-$fresh.json" -- python3 tools/compare/wallFamilyClockProbe.py "$1" "$3" "$RAW/$2-clock-$fresh.json" >/dev/null
    python3 tools/run-mgba-probe.py "$RAW/$2-calls-$fresh.json" -- python3 tools/compare/wallFamilyAllocatorCallProbe.py "$3" "$RAW/$2-clock-$fresh.json" "$RAW/$2-calls-$fresh.json" >/dev/null
  done
}
for side in player opponent; do
  other=$([ $side = player ] && echo opponent || echo player)
  run 115 reflect-$side $B/mechanic-reflect-$side-shuppet-$other-shuckle.json
  run 112 barrier-$side $SC/wall-family-barrier-$side.json
  run 277 magic-coat-$side $B/mechanic-magic-coat-$side-spoink-$other-onix.json
  run 182 protect-$side $B/mechanic-protect-$side-houndour-$other-onix.json
  run 243 mirror-coat-$side $SC/wall-family-mirror-coat-$side.json
done
