#!/usr/bin/env python3
"""Dev-time extraction of the ROM front-animation tables (reference/pokeemerald/src/pokemon.c) keyed by species id.
Writes tools/integration/fixtures/send-in-tail/front-anim-tables.json: {species: [animId, delay]}."""
import json, re, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
ref = root / "reference/pokeemerald"
sp = {}
for m in re.finditer(r"#define (SPECIES_\w+)\s+(\d+|SPECIES_\w+)\b", (ref / "include/constants/species.h").read_text()):
    v = m.group(2)
    sp[m.group(1)] = int(v) if v.isdigit() else sp.get(v)
src = (ref / "src/pokemon.c").read_text()
def table(name):
    body = re.search(r"%s\[NUM_SPECIES - 1\] =\s*\{(.*?)\n\};" % name, src, re.S).group(1)
    return {sp[k]: v.strip() for k, v in re.findall(r"\[(SPECIES_\w+) - 1\]\s*=\s*(\w+)", body)}
ids, delay = table("sMonFrontAnimIdsTable"), table("sMonAnimationDelayTable")
out = {str(s): [ids.get(s), int(delay.get(s, 0))] for s in sorted(ids)}
dst = root / "tools/integration/fixtures/send-in-tail/front-anim-tables.json"
dst.write_text(json.dumps(out, indent=0, sort_keys=True) + "\n")
print(len(out), "species;", len({v[0] for v in out.values()}), "anim ids;", sum(1 for v in out.values() if v[1]), "with delay")
