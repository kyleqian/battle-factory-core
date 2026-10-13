#!/usr/bin/env python3
"""stp128: fold the stp128Probe.py outputs into the committed per-window ROM table (tools/integration/fixtures/stp128/rom-windows.json)
that tests/stp128StatusConditionReducer.test.ts pins and stp128Compare.ts reads. Every row is expanded (no compaction):
  rel, act, x (controller busy), d ([px, x0, y0, x1, y1] vs rel -1 or [0]), scr (sha256[:16]),
  io {dispcnt, bg1cnt, bg2cnt, bldcnt, bldalpha}, bg [BG1 X, BG1 Y, BG2 X, BG2 Y] (RAM),
  bat [x, y, x2, y2, invisible] of the animated battler, sprites [[x, y, x2, y2, invisible, priority, subpriority, animNum,
  animCmdIndex, tile - first tile of the window, data0..7], ...] in slot order, p7 (OBJ bank 7 BGR555 words, only when it changed).
usage: stp128Receipt.py <probe-dir> <scenario-index.json> <out.json>
"""
import glob, json, os, sys

probe_dir, index_path, out = sys.argv[1:4]
index = json.load(open(index_path))
IO = ["dispcnt", "bg0cnt", "bg1cnt", "bg2cnt", "bg3cnt", "winin", "winout", "bldcnt", "bldalpha", "bldy"]
LABEL = {"Status_Curse": "CURSED", "Status_Nightmare": "NIGHTMARE", "Status_Confusion": "CONFUSION", "Status_Freeze": "FRZ"}
result = {"schema": "stp128-rom-windows/v1", "windows": {}}
for path in sorted(glob.glob(os.path.join(probe_dir, "*.json"))):
    name = os.path.basename(path)
    probe = json.load(open(path))
    meta = index[name]
    for k, w in enumerate(probe["windows"]):
        last, rows, tile0, prev_p7 = {}, [], None, None
        for r in w["rows"]:
            last.update({key: r[key] for key in r})
            io = dict(zip(IO, last["io"]))
            spr = []
            for s in last["spr"]:
                if tile0 is None:
                    tile0 = s[10]
                spr.append(s[1:10] + [s[10] - tile0] + s[11:])
            row = {"rel": r["rel"], "act": last["act"], "x": last["x"], "d": last["d"] if "d" in last else None, "scr": last["scr"],
                   "io": {key: io[key] for key in ("dispcnt", "bg1cnt", "bg2cnt", "bldcnt", "bldalpha")}, "bg": last["bg"],
                   "bat": last["bat"][w["battler"]][1:], "other": last["bat"][1 - w["battler"]][1:], "sprites": spr}
            if last["p7"] != prev_p7:
                row["p7"] = last["p7"]
                prev_p7 = last["p7"]
            rows.append(row)
        key = f"{name[:-5]}#{k}"
        result["windows"][key] = {"scenario": name, "animation": LABEL[w["label"]], "side": "player" if w["battler"] == 0 else "opponent",
                                  "battler": w["battler"], "rise": w["rise"], "E": w["E"], "seed": probe["seed"], "attackerSide": meta["attackerSide"],
                                  "rows": rows}
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
with open(out, "w") as f:
    f.write("{\"schema\":\"stp128-rom-windows/v1\",\"windows\":{\n")
    items = list(result["windows"].items())
    for i, (key, w) in enumerate(items):
        rows = w.pop("rows")
        f.write(json.dumps(key) + ":" + json.dumps(w, separators=(",", ":"))[:-1] + ",\"rows\":[\n")
        f.write(",\n".join(json.dumps(r, separators=(",", ":")) for r in rows))
        f.write("\n]}" + ("," if i + 1 < len(items) else "") + "\n")
    f.write("}}\n")
print(len(result["windows"]), "windows")
