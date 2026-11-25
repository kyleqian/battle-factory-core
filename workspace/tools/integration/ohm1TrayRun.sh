#!/usr/bin/env bash
# ohm1: per-frame ROM tray probe (ait1TrayProbe.py --all, battler 1) over one frozen real-play trace; then ohm1TrayTable.py reads the rows.
# usage: ohm1TrayRun.sh FROZEN.json off|on OUT.json     (skips a finished OUT)
set -uo pipefail
F=$1; P=$2; O=$3
[ -s "$O" ] && exit 0
nice -n 10 python3 tools/run-mgba-probe.py "$O" -- python3 tools/integration/ait1TrayProbe.py "$O" "$F" --profile "$P" --from 1 --to 99999 --all > /dev/null 2>&1
