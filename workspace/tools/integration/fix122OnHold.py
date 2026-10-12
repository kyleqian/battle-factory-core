#!/usr/bin/env python3
"""fix122 (docs/fix122-audit26-defects.md): aud118OnHold.py generalised to every fix122OnStage.py class, both scenes. ROM (off108Rom.py):
every player use whose pointer runs include BattleScript_Pausex20 (Cmd_attackanimation's MOVE_RESULT_NO_EFFECT branch, or Scene OFF's
HITMARKER_NO_ANIMATIONS branch); its glyph = the first screen change after that run, rows after the opener's FINAL glyph (off108Rom's
`lastChange`: production's used-move hold counts from print completion). off108Rom's G = the opener run's release row - 2, which is the final
glyph except where a `pause` directly follows attackstring (Leech Seed: the pause run swallows the print, G = final glyph + 31), so
glyph = (first change - G) + (G - lastChange); `rawGlyph` keeps the G-relative row. Production (off108Route.ts): every use of
the class's move whose first message after the opener is one of the class's failure strings; its start in frames after G + 1 = the
opener's holdFrames + every command between (minimumFrames + holdFrames). residual = start - (glyph - 1).
usage: fix122OnHold.py <rom-r1.json> <route-dir> [<route-dir> ...]   (a ROM line per scenario, then one JSON line per route dir)"""
import collections, glob, json, os, sys

rom = json.load(open(sys.argv[1]))["scenarios"]
FAIL = {182: ["STRINGID_BUTITFAILED"], 197: ["STRINGID_BUTITFAILED"], 203: ["STRINGID_BUTITFAILED"], 219: ["STRINGID_BUTITFAILED"],
        241: ["STRINGID_BUTITFAILED"], 201: ["STRINGID_BUTITFAILED"], 258: ["STRINGID_BUTITFAILED"], 254: ["STRINGID_PKMNCANTSTOCKPILE"],
        73: ["STRINGID_PKMNEVADEDATTACK", "STRINGID_ITDOESNTAFFECT"], 113: ["STRINGID_BUTITFAILED"], 115: ["STRINGID_BUTITFAILED"],
        240: ["STRINGID_BUTITFAILED"]}


def failing(stem, mode):
    res = []
    for k, u in enumerate([x for x in rom[stem][mode] if x["atk"] == 0]):
        p = next((i for i, r in enumerate(u["runs"]) if r[0].startswith("BattleScript_Pausex20")), None)
        if p is None:
            continue
        g = next((r for r in u["runs"][p + 1:] if r[5]), None)
        shift = u["G"] - u["lastChange"]
        res.append({"use": k, "pausex20": u["runs"][p][:3], "glyph": g[5][0] + shift if g else None, "rawGlyph": g[5][0] if g else None,
                    "anchorShift": shift, "glyphRun": g[0] if g else None,
                    "earlierPause": [r[0] for r in u["runs"][:p] if r[2] >= 30]})
    return res


glyphs = {}
for stem in sorted(rom):
    rec = {"stem": stem, "move": rom[stem]["move"]}
    for mode in ("on", "off"):
        rec[mode] = failing(stem, mode)
    print(json.dumps(rec, sort_keys=True))
    for mode in ("on", "off"):
        for f in rec[mode]:
            glyphs.setdefault((rom[stem]["move"], mode), set()).add(f["glyph"])
for rdir in sys.argv[2:]:
    out = {"routes": os.path.basename(os.path.normpath(rdir))}
    for scene in ("on", "off"):
        res, other = collections.defaultdict(collections.Counter), collections.defaultdict(collections.Counter)
        for f in sorted(glob.glob(os.path.join(rdir, f"{scene}-*.jsonl"))):
            for line in open(f):
                if not line.strip():
                    continue
                u = json.loads(line)
                if u["move"] not in FAIL:
                    continue
                c = u["commands"]
                n = next((x for x in u["follow"] if x[1] == "message"), None)
                if n is None or n[2] not in FAIL[u["move"]]:
                    other[u["move"]][n[2] if n else None] += 1
                    continue
                start = c[0][3] or 0
                for x in c[1:]:
                    if x[0] == n[0]:
                        break
                    start += (x[2] or 0) + (x[3] or 0)
                g = sorted(glyphs.get((u["move"], scene), {None}), key=str)
                key = f"{n[2]}:" + ",".join("na" if x is None else str(start - (x - 1)) for x in g)
                res[u["move"]][key] += 1
        out[scene] = {str(m): {"romGlyph": sorted(glyphs.get((m, scene), {None}), key=str), "residuals": dict(sorted(res[m].items())),
                               "otherFirstMessages": sum(other[m].values())} for m in sorted(set(res) | set(other))}
    print(json.dumps(out, sort_keys=True))
