#!/bin/sh
# Dumps per-frame sprites + sSpriteOrder over each accepted window (direct mGBA, prep6SpriteDump.py). Run from workspace root.
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
D=tools/integration/fixtures/prep6-sprites
python3 - <<'P' | xargs -P 4 -L 1 sh -c '"$0" tools/integration/prep6SpriteDump.py "$1" "$2" "$3" "$4" >/dev/null 2>&1' $PY
import json
cf = lambda n: json.load(open(f"tools/compare/fixtures/{n}.json"))
rows = []
for s, w in (("player-sudowoodo-opponent-shuckle", None), ("opponent-sudowoodo-player-shuckle", None)):
    f = cf("self-destruct-" + s); rows.append((f["scenario"], "self-destruct-" + s.split("-")[0], f["denseWindow"]["startFrame"], f["denseWindow"]["endFrame"]))
for n, side in (("knock-off-player-shuppet-opponent-onix", "player"), ("knock-off-opponent-onix-player-plusle", "opponent")):
    f = cf(n); rows.append((f["scenario"], "knock-off-" + side, f["denseWindow"]["startFrame"], f["denseWindow"]["endFrame"]))
for side in ("player", "opponent"):
    for k in ("one", "two", "three"):
        f = cf(f"swallow-{side}-pelipper-{k}-stockpile-checkpoint"); rows.append((f"tools/battle-lab/mechanic-swallow-{side}-pelipper-{k}-stockpile.json", f"swallow-{side}-{k}", f["sourceWindow"]["startFrame"], f["sourceWindow"]["endFrame"]))
for sc, name, a, b in rows: print(sc, "tools/integration/fixtures/prep6-sprites/" + name + ".json", a, b)
P
