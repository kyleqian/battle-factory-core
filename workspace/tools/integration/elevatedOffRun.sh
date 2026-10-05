#!/bin/sh
# usage (workspace root): sh tools/integration/elevatedOffRun.sh   -> /tmp/eo/rom (2 fresh direct-mGBA Scene OFF runs per scenario) + /tmp/eo/*-cmp.json
# Needs the untracked patched copy for the "patched" columns: sh tools/integration/elevatedPostbodyPatch.sh (delete src/engine/battleScene.patched.ts afterwards).
V=$(dirname "$(realpath reference/pokeemerald)"); F=tools/integration/fixtures/prep11-live
python3 tools/integration/elevatedOffStage.py /tmp/eo/rom 900
for n in golbat butterfree onix; do for r in 0 1; do
  python3 tools/run-mgba-probe.py /tmp/eo/rom/$n-r$r.json -- "$V/mgba-venv/bin/python" tools/probe/run-battle-lab-rgb.py /tmp/eo/rom/$n.json /tmp/eo/rom/$n-r$r.json /tmp/eo/rom/$n-r$r-rgb >/dev/null 2>&1 &
done; done; wait
c(){ EP_PATCHED=src/engine/battleScene.patched.ts node --experimental-strip-types --no-warnings tools/integration/elevatedOffCompare.ts "$@"; }
c /tmp/eo/rom/golbat-r0-rgb $F/air-cutter-opponent-air-cutter-opponent-golbat-player-chansey.json /tmp/eo/golbat-cmp.json
c /tmp/eo/rom/butterfree-r0-rgb $F/whirlwind-opponent-whirlwind-opponent-butterfree-player-onix.json /tmp/eo/butterfree-cmp.json
c /tmp/eo/rom/onix-r0-rgb $F/foresight-player-foresight-player-machoke-opponent-onix.json /tmp/eo/onix-cmp.json
