#!/bin/sh
# lb21: production-renderer dense run of the later-bodies-bg-2 fixtures (direct mGBA inside the harness; fresh process per fixture).
# usage (workspace root): lb21Dense.sh <passTag> [fixture-tag ...]   -> /tmp/lb21/dense/<passTag>/<tag>.out (JSON summary) .err
# The first-body gate bypass for 315 / the opponent Psych Up inputs live in the working tree only (never committed; docs/later-bodies-overheat-psychup.md).
T=$1; shift; D=/tmp/lb21/dense/$T; mkdir -p $D/ev
[ $# -eq 0 ] && set -- $(ls tools/integration/fixtures/later-bodies-bg-2 | sed 's/.json//')
printf '%s\n' "$@" | xargs -P ${JOBS:-8} -n 1 sh -c 'POKEBENCH_LIVE_EVIDENCE_DIR='$D'/ev node --experimental-strip-types --no-warnings tools/integration/liveAdapterFramebuffer.ts tools/integration/fixtures/later-bodies-bg-2/$0.json > '$D'/$0.out 2> '$D'/$0.err'
