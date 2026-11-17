#!/usr/bin/env bash
# Start the pokeemerald-factory oracle service (idempotent).
#
# Ensures the shared Python environment for mGBA exists (vendor/mgba-venv with
# cffi + pillow; the libmgba-py bindings live in vendor/libmgba-py and are
# self-contained), then runs oracle/server.py in the foreground. Profiles:
#   battle-scene-on   :8012 (legacy/current animation oracle)
#   battle-scene-off  :8014 (main logic/round-loop oracle)
# PORT overrides the profile default; PORT=0 picks a free port and honors
# POKEBENCH_ORACLE_PORT_FILE.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

PROFILE="${POKEBENCH_ORACLE_PROFILE:-battle-scene-on}"
if [[ "${1:-}" == "--profile" ]]; then
  PROFILE="${2:?--profile needs battle-scene-on or battle-scene-off}"
  shift 2
elif [[ "${1:-}" == --profile=* ]]; then
  PROFILE="${1#*=}"
  shift
fi
if [[ $# -ne 0 ]]; then
  echo "usage: ./run-oracle.sh [--profile battle-scene-on|battle-scene-off]" >&2
  exit 2
fi
case "$PROFILE" in
  battle-scene-on)  DEFAULT_PORT=8012 ;;
  battle-scene-off) DEFAULT_PORT=8014 ;;
  *)
    echo "run-oracle: unsupported profile '$PROFILE' (expected battle-scene-on or battle-scene-off)" >&2
    exit 2
    ;;
esac
export POKEBENCH_ORACLE_PROFILE="$PROFILE"
export PORT="${PORT:-$DEFAULT_PORT}"

VENDOR="$(cd .. && pwd)/vendor"
VENV="$VENDOR/mgba-venv"

if [[ ! -x "$VENV/bin/python" ]]; then
  echo "Creating mGBA python venv at $VENV ..."
  python3 -m venv "$VENV"
  "$VENV/bin/pip" -q install cffi pillow
fi
"$VENV/bin/python" -c "import cffi, PIL" 2>/dev/null || "$VENV/bin/pip" -q install cffi pillow

if [[ ! -f "$VENDOR/libmgba-py/mgba/_pylib.abi3.so" ]]; then
  echo "error: vendor/libmgba-py is missing — see oracle/SETUP.md for how to set it up" >&2
  exit 1
fi
if [[ ! -f reference/pokeemerald/pokeemerald.gba ]]; then
  echo "error: reference/pokeemerald/pokeemerald.gba missing — build the reference ROM first (see README.md)" >&2
  exit 1
fi

exec "$VENV/bin/python" oracle/server.py
