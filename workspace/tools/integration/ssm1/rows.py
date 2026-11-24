"""usage: rows.py DIR SEED  -> per segment, matched rows with delta != 0 (engine - ROM, from segment start) with ids"""
import difflib, json, sys
sys.path.insert(0, "tools/audio")
from soundScoreboard import pick, segments
d, seed = sys.argv[1], sys.argv[2]
engine = json.load(open(f"{d}/{seed}-on.engine.json")); drive = json.load(open(f"{d}/{seed}-on.drive.json")); rom = json.load(open(f"{d}/{seed}-on.snd.json"))
eng_a = [{"menuOpenFrame": x["menuOpenFrame"], "commitFrame": x["commitFrame"]} for x in engine["decisions"] if x["commitFrame"] is not None]
rom_a = drive["drive"]["anchors"]; n = min(len(eng_a), len(rom_a))
e_rows = [(r[0], r[1], r[2], r[3]) for r in engine["sound"]]; r_rows = [(e["frame"], e["kind"], e["id"], e["pan"]) for e in rom["events"]]
e_end = max([r[0] for r in e_rows] + [a["commitFrame"] for a in eng_a]) + 1; r_end = max([r[0] for r in r_rows] + [a["commitFrame"] for a in rom_a]) + 1
for (name, elo, ehi), (_, rlo, rhi) in zip(segments(eng_a[:n], e_end), segments(rom_a[:n], r_end)):
    e, r = pick(e_rows, elo, ehi), pick(r_rows, rlo, rhi)
    sm = difflib.SequenceMatcher(None, [x[1:] for x in e], [x[1:] for x in r], autojunk=False)
    out = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for i, j in zip(range(i1, i2), range(j1, j2)):
                if e[i][0] != r[j][0]: out.append(f"{e[i][2]}:{e[i][0]-r[j][0]:+d}@{r[j][0]}")
        else: out.append(f"[{tag} e{i1}-{i2} r{j1}-{j2}]")
    if out: print(name, " ".join(out))
