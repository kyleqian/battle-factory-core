#!/usr/bin/env python3
"""b4l: per b4m lab, the engine's SEs (NAME.eng.json `se`) against the ROM's SE log, ids in order (difflib), SE_SELECT left out.
usage: b4lScore.py ENGDIR ROMSEDIR LAB...   ROMSEDIR (colon-separated list) holds NAME.json (audio-sound-events) or is tools/audio/fixtures (NAME without the -on suffix).
Prints per lab: the ROM-exact SE count of the lab, the matched count, the total, and the (ROM frame, id, engine - ROM) of every matched row that is off."""
import difflib, json, sys
from pathlib import Path

eng_dir, rom_dirs = Path(sys.argv[1]), [Path(d) for d in sys.argv[2].split(":")]
for name in sys.argv[3:]:
    p = next(q for d in rom_dirs for q in (d / f"{name}.json", d / f"{name.removesuffix('-on')}.json") if q.exists())
    rom = [(e["frame"], e["id"]) for e in json.load(open(p))["events"] if e["kind"] == "se" and e["id"] != 5]
    eng = [(f, i) for f, i, _ in json.load(open(eng_dir / f"{name}.eng.json"))["se"] if i != 5]
    sm = difflib.SequenceMatcher(None, [i for _, i in rom], [i for _, i in eng], autojunk=False)
    pairs = [(rom[a + k], eng[b + k]) for a, b, n in sm.get_matching_blocks() for k in range(n)]
    exact = sum(1 for r, e in pairs if r[0] == e[0])
    off = [(r[0], r[1], e[0] - r[0]) for r, e in pairs if r[0] != e[0]]
    print(f"{name}: exact {exact}/{len(rom)} (matched {len(pairs)}, engine rows {len(eng)}) off {off[:12]}")
