#!/bin/sh
# r2-gates: production-renderer dense run (direct mGBA inside the harness, 2 fresh probe processes per fixture) of fixture dirs.
# usage (workspace root): r2GatesDense.sh <passTag> <fixtureDir>...   -> /tmp/r2g/dense/<passTag>/<dir>/<fixture>.out (JSON, one entry per fresh run)
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
T=$1; shift
for dir in "$@"; do
  D=/tmp/r2g/dense/$T/$(basename $dir); mkdir -p $D/ev
  ls $dir | grep '\.json$' | grep -v 'receipt\|activations' | sed 's/\.json$//' | xargs -P ${JOBS:-6} -n 1 sh -c 'POKEBENCH_LIVE_EVIDENCE_DIR='$D'/ev node --experimental-strip-types --no-warnings tools/integration/liveAdapterFramebuffer.ts '$dir'/$0.json > '$D'/$0.out 2> '$D'/$0.err'
done
