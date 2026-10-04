#!/bin/sh
# usage: liveFixtureOne.sh <evidence-dir> <summary-dir> <fixture.json>
f="$3"; b=$(basename "$f" .json)
POKEBENCH_LIVE_EVIDENCE_DIR="$1" node --experimental-strip-types --no-warnings tools/integration/liveAdapterFramebuffer.ts "$f" > "$2/$b.out" 2> "$2/$b.err"
echo "$b exit=$?" >> "$2/status.txt"
