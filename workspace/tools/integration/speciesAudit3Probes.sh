#!/bin/sh
# speciesAudit3: prep14Probe.py (direct mGBA, fresh process each, Scene ON) over every scenario in a list (orig + swapped), 8 parallel, cached.
# usage: speciesAudit3Probes.sh list.tsv outdir   (list rows: name, orig fixture, swapped scenario, side)
cd "$(dirname "$0")/../.." || exit 1
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python OUT=$2; mkdir -p $OUT
python3 - $1 2>/dev/null <<'PY' | sort -u | xargs -P ${JOBS:-8} -n 1 sh -c '[ -s "$OUT/$(basename $0)" ] || $PY tools/integration/prep14Probe.py "$0" "$OUT/$(basename $0)" >/dev/null 2>&1'
import json,sys
for l in open(sys.argv[1]):
    k,orig,sw,side=l.rstrip("\n").split("\t")
    f=json.load(open(orig))
    if f.get("sourceFixture"): f={**json.load(open(f["sourceFixture"])),**f}
    print(f["scenario"]); print(sw)
PY
ls $OUT | wc -l
