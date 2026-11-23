#!/usr/bin/env python3
# fsl1m: the faint print -> party-summary leg. For every SE 16 (faint) in a T2 dir, the ROM and engine intervals SE16 -> press (SE 5) -> SE 114.
# usage: fsl1m.py T2DIR SCENE [--all] [--cmds DIR]   (T2DIR holds SEED-SCENE.{snd,engine}.json, e.g. .integration/evidence/t2final-20261123;
#   --cmds DIR holds SEED-SCENE.eng-cmd.json from `soundCensusRomReplay.ts replay --cmdtrace=1` and adds the engine faint command's lead, the SE16 lag (SE16 - cmd - lead - 2) and SE16 -> message start)
import glob, json, os, sys

def rows(d, scene):
    for f in sorted(glob.glob(os.path.join(d, f"*-{scene}.snd.json"))):
        seed = os.path.basename(f).split("-")[0]
        e = f.replace(".snd.json", ".engine.json")
        if not os.path.exists(e):
            continue
        rom = [(x["frame"], x["id"]) for x in json.load(open(f))["events"] if x["kind"] == "se"]
        eng = [(x[0], x[2]) for x in json.load(open(e))["sound"] if x[1] == "se"]
        yield seed, rom, eng

def legs(ev):
    out = []
    for i, (t, sid) in enumerate(ev):
        if sid != 16:
            continue
        p = next(((u, s) for u, s in ev[i + 1:] if s == 5 and u - t < 140), None)
        q = next(((u, s) for u, s in ev[i + 1:] if s == 114 and u - t < 160), None)
        out.append((t, p[0] if p else None, q[0] if q else None))
    return out

def faint_ctx(cmds_dir, seed, scene, t):
    f = os.path.join(cmds_dir, f"{seed}-{scene}.eng-cmd.json")
    if not os.path.exists(f):
        return "  -"
    cm = json.load(open(f))["cmds"]
    c = [x for x in cm if x[3] == "faint" and x[0] <= t + 1 and t - x[0] < 200]
    if not c:
        return "  -"
    c = c[-1]
    m = next((x for x in cm if x[0] > c[0] and x[3] == "message"), None)
    return f"lead {c[7]:>3} lag {t - c[0] - c[7] - 2:>2} SE16->msg {m[0] - t if m else '-'}"

def main():
    d, scene = sys.argv[1], sys.argv[2]
    show_all = "--all" in sys.argv
    cmds = sys.argv[sys.argv.index("--cmds") + 1] if "--cmds" in sys.argv else None
    n = exact = skipped = 0
    hist = {}
    print("seed  k  ROM(16->5, 5->114, 16->114)  ENG(...)  d(16->5) d(5->114) d(16->114)")
    for seed, rom, eng in rows(d, scene):
        r, e = legs(rom), legs(eng)
        if len(r) != len(e):
            skipped += 1
            continue
        for k, (a, b) in enumerate(zip(r, e)):
            if a[1] is None or a[2] is None or b[1] is None or b[2] is None:
                continue
            ra, rb, ea, eb = a[1] - a[0], a[2] - a[1], b[1] - b[0], b[2] - b[1]
            dd = (ra - ea, rb - eb, a[2] - a[0] - (b[2] - b[0]))
            n += 1
            hist[dd[2]] = hist.get(dd[2], 0) + 1
            if dd[2] == 0:
                exact += 1
            if show_all or dd[2] != 0:
                print(f"{seed:>5} {k:>2}  {ra:>3} {rb:>3} {a[2]-a[0]:>3}   {ea:>3} {eb:>3} {b[2]-b[0]:>3}   {dd[0]:>4} {dd[1]:>4} {dd[2]:>4}" + (f"   {faint_ctx(cmds, seed, scene, b[0])}" if cmds else ""))
    print(f"legs {n}, exact {exact}, seeds skipped (SE16 count differs) {skipped}")
    print("d(16->114) histogram:", dict(sorted(hist.items())))

main()
