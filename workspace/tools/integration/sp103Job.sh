#!/bin/sh
# sp103 probe job (docs/next-adapters-sp103.md): one fresh direct-mGBA ctl95Probe.py run (40-row RGB tail) of one lab; a crashed run
# (exit 138 / 139 without a parseable output) is rerun once. Run from workspace/.
# usage: sp103Job.sh <scenario-dir> <stem> <run 1|2> <probe-dir>
S=$1; N=$2; R=$3; P=$4
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
o=$P/$N-r$R.json
python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/ctl95Probe.py 40 "$S/$N.json" "$o" "$P/$N-r$R-rgb" > "$P/$N-r$R.out" 2>&1 \
  || { rm -rf "$o" "$P/$N-r$R-rgb"; python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/ctl95Probe.py 40 "$S/$N.json" "$o" "$P/$N-r$R-rgb" > "$P/$N-r$R.out" 2>&1; }
[ -s "$o" ] && echo "ok $N r$R" || echo "FAIL $N r$R"
