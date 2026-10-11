#!/bin/sh
# Live audit 21: doll81Probes.sh with the scenario dir SC=<dir> (default tools/integration/fixtures/audit-21/doll/scenarios); doll81: every scenario twice from fresh
# processes, direct mGBA only (never the shared HTTP oracles): prep38Probe.py for the `def` family (subbed DEFENDER), prep40Probe.py
# for `att` / `self` (subbed ATTACKER). run-mgba-probe.py may exit 138 on a teardown SIGBUS with complete output: the gate is
# r1 == r2 (cmp) on non-empty JSON.
# usage: OUT=<fresh dir> [JOBS=n] [SC=<dir>] sh tools/integration/audit21DollProbes.sh [stem ...]
[ -n "$OUT" ] || { echo "OUT=<dir> required"; exit 2; }
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python OUT
SC=${SC:-tools/integration/fixtures/audit-21/doll/scenarios}; export SC
mkdir -p "$OUT"
STEMS=${*:-$(cut -f1 $SC/list.tsv)}
for s in $STEMS; do fam=$(awk -F'\t' -v s="$s" '$1 == s {print $7}' $SC/list.tsv); for r in 1 2; do echo "$s $r $fam"; done; done |
 xargs -P ${JOBS:-14} -n 3 sh -c \
 'o="$OUT/$0-r$1.json"; [ ! -e "$o" ] || { echo "refusing to reuse $o"; exit 0; }; p=prep40Probe.py; [ "$2" = def ] && p=prep38Probe.py
  python3 tools/run-mgba-probe.py "$o" -- $PY tools/integration/$p "$SC/$0.json" "$o" "$OUT/$0-r$1-rgb" > "$OUT/$0-r$1.out" 2>&1 || true'
n=0; for s in $STEMS; do f="$OUT/$s-r1.json"; [ -s "$f" ] && [ -s "$OUT/$s-r2.json" ] || { echo "EMPTY $s"; continue; }; cmp -s "$f" "$OUT/$s-r2.json" && n=$((n + 1)) || echo "DIFF $s"; done
echo "probes: $n scenarios r1 == r2 byte-identical"
