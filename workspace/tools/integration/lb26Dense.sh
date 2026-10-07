#!/bin/sh
# lb26: production-renderer dense run of the later-bodies-lb26 fixtures (direct mGBA inside the harness; fresh process per fixture).
# usage (workspace root): lb26Dense.sh <passTag> [fixture-tag ...]   -> /tmp/lb26/dense/<passTag>/<tag>.out (JSON, 2 fresh renders) .err
# WISP/PURSUIT need the temporary firstBody bypass (fixtures/later-bodies-lb26/lb26-temp-bypass.patch) applied in the working tree; CURSE runs unpatched.
T=$1; shift; D=/tmp/lb26/dense/$T; mkdir -p $D/ev
[ $# -eq 0 ] && set -- $(ls tools/integration/fixtures/later-bodies-lb26 | grep -v patch | sed 's/.json//')
printf '%s\n' "$@" | xargs -P ${JOBS:-8} -n 1 sh -c 'POKEBENCH_LIVE_EVIDENCE_DIR='$D'/ev node --experimental-strip-types --no-warnings tools/integration/liveAdapterFramebuffer.ts tools/integration/fixtures/later-bodies-lb26/$0.json > '$D'/$0.out 2> '$D'/$0.err'
