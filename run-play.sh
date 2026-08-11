#!/usr/bin/env bash
# Launch the interactive oracle player (browser page on :8022 by default).
# Separate process + port from the trace service, so runs are unaffected.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
VENV="$(cd .. && pwd)/vendor/mgba-venv"
[[ -x "$VENV/bin/python" ]] || { echo "error: run ./run-oracle.sh once first (creates the venv)" >&2; exit 1; }
exec "$VENV/bin/python" oracle/play-server.py
