#!/bin/sh
# BG-register history: full reproduction (workspace root; direct mGBA only, ~7 min per probe run on 8 jobs).
set -e
GL="mechanic-* prep16-* prep11-* gate6-* rollout-* postko-* issue* prep13-*"
sh tools/integration/bgHistoryRun.sh r1 $GL; sh tools/integration/bgHistoryRun.sh r2 $GL      # raw -> /tmp/bgh/r1, /tmp/bgh/r2 (780 scenarios)
FX=tools/integration/fixtures/bg-register-history
python3 tools/integration/bgHistoryAnalyze.py /tmp/bgh/r1 $FX | head -20
python3 tools/integration/bgHistoryUnits.py /tmp/bgh/r1 $FX/units-by-family.json
python3 tools/integration/bgHistoryCases.py /tmp/bgh/r1 /tmp/bgh/r2 $FX                       # r1 == r2 byte-identical receipt + per-consumer later-body cases
node --experimental-strip-types --no-warnings tools/integration/bgHistoryRouteBodies.ts /tmp/bgh/rb.json $(seq 100 199)
python3 tools/integration/bgHistoryRouteCoverage.py /tmp/bgh/r1 /tmp/bgh/rb.json $FX/route-coverage.json
