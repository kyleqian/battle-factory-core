#!/bin/sh
# x2-history #148: ROM front/back idle-rest x2/y2 for every species in the Factory pool (battle-frontier-mons.json), direct mGBA, one fresh process per species.
# usage (workspace root): sh tools/integration/x2HistorySpecies.sh <runTag>     raw outputs: /tmp/x2h/species/<runTag>/<id>.json
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
export PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
RUN=${1:-r1}; export FX=/tmp/x2h/species/$RUN; mkdir -p $FX
python3 - <<'PY' > $FX/ids.txt
import json,re
sp={m.group(1):int(m.group(2)) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)",open("reference/pokeemerald/include/constants/species.h").read())}
for s in sorted({e["species"][8:] for e in json.load(open("src/data/gen/battle-frontier-mons.json"))["entries"]}): print(sp[s])
PY
xargs -P 8 -n 1 sh -c 'python3 tools/run-mgba-probe.py $FX/$0.json -- $PY tools/integration/x2HistorySpeciesProbe.py $0 $FX/$0.json >/dev/null 2>&1' < $FX/ids.txt
ls $FX/*.json | wc -l
