#!/bin/sh
# speciesAudit: run prep11Probe.py (direct mGBA, Scene ON, fresh process each) over the original + swapped scenarios of a list.tsv
# (speciesAuditList.py) -> $OUT/<scenario>.json.  usage: speciesAuditBodies.sh list.tsv outdir
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
export PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
export OUT=$2; mkdir -p $OUT
python3 - $1 <<'PY' | sort -u | xargs -P 8 -n 1 sh -c '[ -s "$OUT/$(basename $0)" ] || $PY tools/integration/prep11Probe.py "$0" "$OUT/$(basename $0)" >/dev/null 2>&1'
import json,sys
for l in open(sys.argv[1]):
    k,orig,aud,sw=l.rstrip("\n").split("\t")
    f=json.load(open(orig))
    if f.get("sourceFixture"): f={**json.load(open(f["sourceFixture"])),**f}
    print(f["scenario"]); print(sw)
PY
ls $OUT | wc -l
