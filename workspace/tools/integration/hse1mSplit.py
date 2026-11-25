#!/usr/bin/env python3
"""hse1m: split the Scene OFF hit SE 12 / 13 / 14 windows (t2k3 item 2) into pre-print / print / release->SE terms, ROM vs engine.

usage: hse1mSplit.py ATTR_OFF.json PROBE_DIR OUT.json
ATTR_OFF = t2k3 attr-off.json (rows: seed, si, rf, ef, off, sid, ecmd, ecf, tag m); PROBE_DIR holds SEED-full.{rom,eng-cmd}.json (probe_full.sh: hcr3mProbe --from 0 + the cmdtrace replay).
Per hit SE row (sid 12 / 13 / 14, engine command hit-animation, and move-animation / message variants): the ROM used print (attackstring row, ex > 0) start, its release (the
script's next row with ex 0), the SE frame; the engine's `message` command before the `move-animation` before the `hit-animation` command. Terms (frames, ENG - ROM):
  pre  = (engine print start - ROM print start) - previous matched row's offset   (everything between the previous SE and the used print)
  P    = print start -> release                                                  (print duration)
  R    = release -> SE                                                           (critcalc .. Pausex20 .. hitanimation)
and off = prev + pre + P + R."""
import collections
import json
import sys
from pathlib import Path

attr = json.load(open(sys.argv[1]))
pdir = Path(sys.argv[2])
rows = [r for r in attr if r["tag"] == "m" and (pdir / f"{r['seed']}-full.rom.json").exists()]
seg = collections.defaultdict(list)
for r in rows:
    seg[(r["seed"], r["si"])].append(r)
cache = {}


def load(seed):
    if seed not in cache:
        rom = json.load(open(pdir / f"{seed}-full.rom.json"))
        eng = json.load(open(pdir / f"{seed}-full.eng-cmd.json"))
        names = {int(k, 16): v for k, v in rom["names"].items()}
        cache[seed] = (rom["rows"], names, eng["cmds"])
    return cache[seed]


def label(names, ptr):
    return names.get(ptr, hex(ptr))


out = []
for (seed, si), lst in seg.items():
    lst.sort(key=lambda r: (r["rf"], r["ef"]))
    prev = 0
    for r in lst:
        step = r["off"] - prev
        isHit = r["fam"] == "battle-controller SE" and r["sid"] in (12, 13, 14)
        if isHit:
            rrows, names, cmds = load(seed)
            rf, ef = r["rf"], r["ef"]
            # ROM: walk back from the SE for the attackstring row (label *AtkString+0x1, ex > 0)
            idx = max(i for i, x in enumerate(rrows) if x[0] <= rf)
            start = None
            for i in range(idx, max(0, idx - 400), -1):
                lab = label(names, rrows[i][1])
                if "AtkString+0x1" in lab and rrows[i][2] > 0 or ("AtkString" in lab and rrows[i][2] > 0):
                    start = i
                    while start > 0 and label(names, rrows[start - 1][1]) == lab and rrows[start - 1][2] > 0:
                        start -= 1
                    break
            d = dict(seed=seed, si=si, rf=rf, ef=ef, off=r["off"], prev=prev, step=step, sid=r["sid"], mv=r["mv"], ecmd=r["ecmd"])
            if start is not None:
                rp = rrows[start][0]
                rel = next((x[0] for x in rrows[start + 1:] if x[0] > rp and x[2] == 0), None)
                d.update(rp=rp, rrel=rel, romLabel=label(names, rrows[start][1]))
                path = [label(names, x[1]).split("+")[0] for x in rrows[start + 1:] if rel is not None and rel <= x[0] <= rf]
                d["romPath"] = [p for i, p in enumerate(path) if i == 0 or p != path[i - 1]]
            # engine: the hit-animation command at ecf, then the two commands before it
            ci = next((i for i, c in enumerate(cmds) if c[0] == r["ecf"] and c[3] == r["ecmd"]), None)
            if ci is not None:
                d["engPrev"] = [(cmds[j][3], cmds[j][0], cmds[j][10]) for j in range(max(0, ci - 3), ci + 1)]
                # ohr1: the SE can sit on the last frame of the 42-frame move-animation itself (ecmd move-animation: message -> that move-animation)
                hitCmd = r["ecmd"] == "hit-animation" and ci >= 2 and cmds[ci - 1][3] == "move-animation" and cmds[ci - 2][3] == "message"
                maCmd = r["ecmd"] == "move-animation" and ci >= 1 and cmds[ci - 1][3] == "message"
                if hitCmd or maCmd:
                    mp, ms = (cmds[ci - 2][0], cmds[ci - 1][0]) if hitCmd else (cmds[ci - 1][0], cmds[ci][0])
                    d.update(ep=mp, ems=ms)
                    if start is not None and rel is not None:
                        ec = ef - r["off"] - r["rel"]  # engine commit, from off = (ef - ec) - (rf - rc), rel = rf - rc
                        rc = rf - r["rel"]
                        d["pre"] = ((mp - ec) - (rp - rc)) - prev
                        d["romStart"] = rp - rc
                        d["P"] = (ms - mp) - (rel - rp)
                        d["R"] = (ef - ms) - (rf - rel)
                        d["Rrom"] = rf - rel
                        d["Reng"] = ef - ms
                        d["Prom"] = rel - rp
                        d["Peng"] = ms - mp
            out.append(d)
        prev = r["off"]

# context signature of the pre-print span: ROM script labels (deduped) from the previous matched event / commit to the used print, and the engine commands in the span
if "--ctx" in sys.argv:
    for d in out:
        if "pre" not in d:
            continue
        rrows, names, cmds = load(d["seed"])
        rp = d["rp"]
        lo = rp - 140 if d["prev"] == 0 and d["pre"] == d["off"] else rp - 60
        labs = []
        for x in rrows:
            if lo <= x[0] < rp:
                l = label(names, x[1]).split("+")[0].replace("BattleScript_", "")
                if not labs or labs[-1] != l:
                    labs.append(l)
        d["ctxRom"] = labs
        d["ctxEng"] = [c[3] + ("*" if c[0] >= d["ep"] else "") for c in cmds if d["ep"] - 160 <= c[0] <= d["ep"]]
        if "--print" in sys.argv:
            print(d["seed"], d["si"], "mv", d["mv"], "pre", d["pre"], "ROM:", " > ".join(labs[-9:]), "| ENG:", " ".join(d["ctxEng"]))


json.dump(out, open(sys.argv[3], "w"), indent=0)
print(len(out), "hit rows;", sum(1 for d in out if "pre" in d), "decomposed")
