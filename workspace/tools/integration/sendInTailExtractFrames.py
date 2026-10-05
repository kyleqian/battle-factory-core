#!/usr/bin/env python3
"""Dev-time extraction of the per-species front sprite frame animation length (sAnim_<Name>_1: sum of ANIMCMD_FRAME durations)
from reference/pokeemerald/src/data/pokemon_graphics/front_pic_anims.h, via gMonFrontAnimsPtrTable species -> sAnims_<Name>.
Writes fixtures/send-in-tail/front-sprite-frames.json {species: frameTotal}."""
import json, re, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
ref = root / "reference/pokeemerald"
sp = {}
for m in re.finditer(r"#define (SPECIES_\w+)\s+(\d+|SPECIES_\w+)\b", (ref / "include/constants/species.h").read_text()):
    sp[m.group(1)] = int(m.group(2)) if m.group(2).isdigit() else sp.get(m.group(2))
h = (ref / "src/data/pokemon_graphics/front_pic_anims.h").read_text().lstrip("﻿")
anims = {}
for m in re.finditer(r"static const union AnimCmd (sAnim_\w+)\[\] =\s*\{(.*?)\};", h, re.S):
    anims[m.group(1)] = sum(int(d) for _, d in re.findall(r"ANIMCMD_FRAME\((\d+),\s*(\d+)", m.group(2)))
    assert "ANIMCMD_LOOP" not in m.group(2) and "ANIMCMD_JUMP" not in m.group(2)
tbl = h[h.index("gMonFrontAnimsPtrTable[]"):]
out = {}
for k, name in re.findall(r"\[(SPECIES_\w+)\]\s*=\s*sAnims_(\w+),", tbl):
    if k in sp and sp[k] and "sAnim_%s_1" % name in anims:
        out[str(sp[k])] = anims["sAnim_%s_1" % name]
(root / "tools/integration/fixtures/send-in-tail/front-sprite-frames.json").write_text(json.dumps(out, sort_keys=True, separators=(",", ":")) + "\n")
print(len(out), "species with a _1 frame animation")
