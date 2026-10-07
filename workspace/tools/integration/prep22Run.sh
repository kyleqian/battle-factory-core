#!/bin/sh
# prep22: reproduction (run from workspace/). Direct mGBA only. NOTE tools/run-mgba-probe.py refuses to overwrite an existing output: use fresh OUT dirs.
set -e
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
python3 tools/integration/prep22Scenarios.py 1 2 11 >/dev/null; python3 tools/integration/prep22AltScenarios.py >/dev/null
# --- A. Fire Punch (burn / no-burn / faint, both orientations; each x2)
sh tools/integration/prep22Probes.sh /tmp/p22 2 prep22-fire-punch-player-seed11 prep22-fire-punch-opponent-seed2 prep22-fire-punch-player-seed1 prep22-fire-punch-opponent-seed1 prep22-fire-punch-faint-player prep22-fire-punch-faint-opponent
python3 tools/integration/prep22FirePunchReceipt.py /tmp/p22 /tmp/p22-fire-punch.json
for s in player opp; do for r in 1 2; do mkdir -p /tmp/p22fp/$s$r; done; done
for r in 1 2; do python3 tools/run-mgba-probe.py /tmp/p22fp/player$r.json -- $PY tools/probe/stage-fire-punch-portable-on.py /tmp/p22fp/player$r.json /tmp/p22fp/player$r >/dev/null 2>&1
  python3 tools/run-mgba-probe.py /tmp/p22fp/opp$r.json -- $PY tools/probe/stage-fire-punch-portable-on.py /tmp/p22fp/opp$r.json /tmp/p22fp/opp$r opponent >/dev/null 2>&1; done
diff -rq /tmp/p22fp/player1 /tmp/p22fp/player2; diff -rq /tmp/p22fp/opp1 /tmp/p22fp/opp2
node --experimental-strip-types tools/integration/prep22FirePunchBody.ts player /tmp/p22fp/player1 2340 27 0
node --experimental-strip-types tools/integration/prep22FirePunchBody.ts opponent /tmp/p22fp/opp1 1967 27 0
# --- B. seven moves: Random2 attribution probes (prep14Probes.sh, x2) + state probes (x2) + analyses
ACC=$(cat tools/integration/fixtures/prep22/accepted-scenarios.txt); ALT=$(ls tools/battle-lab/prep22-*-alt-*.json | xargs -n1 basename | sed 's/.json//')
JOBS=12 sh tools/integration/prep14Probes.sh /tmp/p22r2 $ACC $ALT
JOBS=12 sh tools/integration/prep22Probes.sh /tmp/p22s 2 $ACC $ALT
python3 tools/integration/prep22Analyze.py /tmp/p22s /tmp/p22r2 /tmp/p22out
node --experimental-strip-types tools/integration/prep22PaletteCheck.ts /tmp/p22s /tmp/p22out/palette-check.json
python3 tools/integration/prep22PaletteLoad.py /tmp/p22s /tmp/p22out/palette-load.json
python3 tools/integration/prep22LowestFree.py /tmp/p22s /tmp/p22out/lowest-free.json
python3 tools/integration/prep22Plans.py /tmp/p22r2 /tmp/p22out/plans.json
