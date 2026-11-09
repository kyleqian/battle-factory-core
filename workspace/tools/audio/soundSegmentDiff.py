#!/usr/bin/env python3
"""aud243d step 5: per-decision sound segment diff, engine census replay vs ROM `lab` hook run of the frozen driven trace.

usage: soundSegmentDiff.py ENGINE.json DRIVE.json ROM_EVENTS.json [--kinds se,cry] [--ignore-ids 5] [--out FILE]  (ignored ids = input-driven menu SEs, counted separately)
  ENGINE.json    soundCensusRomReplay replay output (`sound` rows [frame,kind,id,pan,...] and `decisions`, frame0-relative)
  DRIVE.json     `lab --drive` result (drive.anchors per decision: menuOpenFrame, commitFrame)
  ROM_EVENTS.json `lab` hook run of the frozen trace (`events` [{frame,kind,id,pan}])
Per decision k: menu k = [menuOpen_k, commit_k), resolution k = [commit_k, menuOpen_k+1). Each is compared as an ordered (kind,id,pan) list; frames are not compared
(the engine's presentation is shorter than the ROM's). Prints one line per segment and the first differing segment.
"""
import json, sys


def rows_engine(sound):
    return [(r[0], r[1], r[2], r[3]) for r in sound]


def rows_rom(events):
    return [(e["frame"], e["kind"], e["id"], e["pan"]) for e in events]


def segments(anchors, end):
    out = []
    for k, a in enumerate(anchors):
        nxt = anchors[k + 1]["menuOpenFrame"] if k + 1 < len(anchors) else end
        out.append((f"menu{k}", a["menuOpenFrame"], a["commitFrame"]))
        out.append((f"res{k}", a["commitFrame"], nxt))
    return out


def pick(rows, lo, hi, kinds, ignore=()):
    return [r[1:] for r in rows if lo <= r[0] < hi and (kinds is None or r[1] in kinds) and not (r[1] == "se" and r[2] in ignore)]


def diff(engine, drive, rom, kinds=None, ignore=()):
    eng_a = [{"menuOpenFrame": d["menuOpenFrame"], "commitFrame": d["commitFrame"]} for d in engine["decisions"] if d["commitFrame"] is not None]
    rom_a = drive["drive"]["anchors"] if "drive" in drive else drive["anchors"]
    n = min(len(eng_a), len(rom_a))
    e_rows, r_rows = rows_engine(engine["sound"]), rows_rom(rom["events"])
    e_end = max([r[0] for r in e_rows] + [a["commitFrame"] for a in eng_a]) + 1
    r_end = max([r[0] for r in r_rows] + [a["commitFrame"] for a in rom_a]) + 1
    report = []
    for (name, elo, ehi), (_, rlo, rhi) in zip(segments(eng_a[:n], e_end), segments(rom_a[:n], r_end)):
        e, r = pick(e_rows, elo, ehi, kinds, ignore), pick(r_rows, rlo, rhi, kinds, ignore)
        first = next((i for i in range(max(len(e), len(r))) if (e[i] if i < len(e) else None) != (r[i] if i < len(r) else None)), None)
        report.append({"segment": name, "engine": [elo, ehi], "rom": [rlo, rhi], "engineCount": len(e), "romCount": len(r), "same": first is None,
                       "firstDiff": None if first is None else {"index": first, "engine": e[first] if first < len(e) else None, "rom": r[first] if first < len(r) else None}})
    return {"decisions": {"engine": len(eng_a), "rom": len(rom_a)}, "segments": report, "firstDiffering": next((s["segment"] for s in report if not s["same"]), None)}


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    flags = {argv[i]: argv[i + 1] for i in range(len(argv) - 1) if argv[i].startswith("--")}
    if len(args) < 3:
        raise SystemExit(__doc__)
    engine, drive, rom = (json.load(open(p)) for p in args[:3])
    kinds = set(flags["--kinds"].split(",")) if "--kinds" in flags else None
    ignore = {int(x) for x in flags.get("--ignore-ids", "").split(",") if x}
    result = diff(engine, drive, rom, kinds, ignore)
    for s in result["segments"]:
        print(f'{s["segment"]:7} eng {s["engineCount"]:3} rom {s["romCount"]:3} {"same" if s["same"] else "DIFF " + json.dumps(s["firstDiff"])}')
    print("first differing segment:", result["firstDiffering"])
    if "--out" in flags:
        json.dump(result, open(flags["--out"], "w"), indent=1)


if __name__ == "__main__":
    main(sys.argv[1:])
