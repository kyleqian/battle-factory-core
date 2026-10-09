#!/bin/sh
# later58: run later58Check.ts over fixture-dir/<prefix>*.json, one node process per scenario (JOBS in parallel), and merge the receipts.
#   OUT=<scratch> [JOBS=8] sh tools/integration/later58Check.sh <fixture-dir> <receipt.json> [prefix] [--live-only]
set -e
: "${OUT:?set OUT=<scratch dir>}"
DIR=$1; REC=$2; PREFIX=${3:-}; export MODE=${4:-} CHECKOUT="$OUT/check"
mkdir -p "$CHECKOUT"; rm -f "$CHECKOUT"/*.json
export POKEBENCH_LIVE_PROBE_SHARE=1
ls "$DIR"/$PREFIX*.json | sed 's/-[0-9]*\.json$//' | sort -u | xargs -P "${JOBS:-8}" -n 1 sh -c \
  'node --experimental-strip-types --no-warnings tools/integration/later58Check.ts "$CHECKOUT/$(basename "$0").json" "$0"-[0-9]*.json $MODE 2>&1 | sed "s/^/  /"'
python3 - "$CHECKOUT" "$REC" <<'PY'
import json, sys
from pathlib import Path
rows = [r for p in sorted(Path(sys.argv[1]).glob("*.json")) for r in json.loads(p.read_text())["rows"]]
rows.sort(key=lambda r: r["fixture"])
Path(sys.argv[2]).write_text(json.dumps({"schema": "later58-check/v1", "rows": rows}, indent=0, separators=(",", ":")) + "\n")
print(f"{len(rows)} fixtures")
PY
