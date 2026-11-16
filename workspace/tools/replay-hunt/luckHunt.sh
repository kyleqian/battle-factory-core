#!/usr/bin/env bash
# The luck hunt: see tools/replay-hunt/README.md ("luckHunt"). Started by /srv/pokebench/ops/day-hunt.sh from workspace/ under nice -n 19.
# env: LUCK_HUNT_OUT (required), LUCK_HUNT_DEADLINE_EPOCH, LUCK_HUNT_JOBS (default 3), LUCK_HUNT_DESIGNS. Writes only under LUCK_HUNT_OUT.
set -uo pipefail
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$here/../.." || exit 1
: "${LUCK_HUNT_OUT:?set LUCK_HUNT_OUT to an absolute output directory}"
exec python3 -B "$here/luckHunt.py"
