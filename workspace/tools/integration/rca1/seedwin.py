#!/usr/bin/env python3
"""rca1: per-window nonzero sound offsets of one T2 seed (engine - ROM, relative to each segment start), same alignment as soundScoreboard.py.
python3 tools/integration/rca1/seedwin.py ENGINE_DIR ROM_DIR SEED SCENE   (ENGINE_DIR: a scratchT2.sh / rescoreAll.sh output; ROM_DIR: the seeds dir with SEED-SCENE.{drive,snd}.json)"""
import difflib, json, sys
sys.path.insert(0, "tools/audio")
import soundScoreboard as sb
ns = {"segments": sb.segments, "pick": sb.pick}
eng_dir, rom_dir, seed, scene = sys.argv[1:5]
engine = json.load(open(f"{eng_dir}/{seed}-{scene}.engine.json")); drive = json.load(open(f"{rom_dir}/{seed}-{scene}.drive.json")); rom = json.load(open(f"{rom_dir}/{seed}-{scene}.snd.json"))
eng_a = [{"menuOpenFrame": d["menuOpenFrame"], "commitFrame": d["commitFrame"]} for d in engine["decisions"] if d["commitFrame"] is not None]
rom_a = drive["drive"]["anchors"]; n = min(len(eng_a), len(rom_a))
e_rows = [(r[0], r[1], r[2], r[3]) for r in engine["sound"]]; r_rows = [(e["frame"], e["kind"], e["id"], e["pan"]) for e in rom["events"]]
e_end = max([r[0] for r in e_rows] + [a["commitFrame"] for a in eng_a]) + 1; r_end = max([r[0] for r in r_rows] + [a["commitFrame"] for a in rom_a]) + 1
total = 0
for (name, elo, ehi), (_, rlo, rhi) in zip(ns["segments"](eng_a[:n], e_end), ns["segments"](rom_a[:n], r_end)):
    e, r = ns["pick"](e_rows, elo, ehi), ns["pick"](r_rows, rlo, rhi)
    sm = difflib.SequenceMatcher(None, [x[1:] for x in e], [x[1:] for x in r], autojunk=False)
    prev = None
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag != "equal": print(name, tag, "ROM", r[j1:j2], "ENG", e[i1:i2]); continue
        for i, j in zip(range(i1, i2), range(j1, j2)):
            d = e[i][0] - r[j][0]
            if d != 0: print(f"{name:7} {e[i][1]:4} {e[i][2]:4} ROM {r[j][0]:5} ENG {e[i][0]:5} {d:+4}"); total += abs(d)
print("mass", total)
