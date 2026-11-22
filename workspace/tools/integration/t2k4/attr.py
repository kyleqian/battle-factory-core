import bisect, difflib, json, sys
from pathlib import Path
sys.path.insert(0, 'tools/audio')
src = open('tools/audio/t2Attribute.py').read().replace('main(sys.argv[1:])\n', '')
exec(compile(src, 't2Attribute', 'exec'))
def rows2(romdir, engdir, seed, scene):
    stem = f"{seed}-{scene}"
    eng = json.load(open(engdir / f"{stem}.engine.json"))
    drive, rom = (json.load(open(romdir / f"{stem}.{k}.json")) for k in ("drive", "snd"))
    tl = json.load(open(romdir / f"{stem}.tl.json"))["rows"]
    tf = [r[0] for r in tl]
    eng_a = [{"menuOpenFrame": d["menuOpenFrame"], "commitFrame": d["commitFrame"]} for d in eng["decisions"] if d["commitFrame"] is not None]
    rom_a = drive["drive"]["anchors"]
    n = min(len(eng_a), len(rom_a))
    ecmd = eng.get("cmds") or []
    cf = [c[0] for c in ecmd]
    e_rows = [(r[0], r[1], r[2], r[3]) for r in eng["sound"]]
    r_rows = [(e["frame"], e["kind"], e["id"], e["pan"]) for e in rom["events"]]
    e_end = max([r[0] for r in e_rows] + [a["commitFrame"] for a in eng_a]) + 1
    r_end = max([r[0] for r in r_rows] + [a["commitFrame"] for a in rom_a]) + 1
    out=[]; miss=extra=0
    for si,((name, elo, ehi), (_, rlo, rhi)) in enumerate(zip(segments(eng_a[:n], e_end), segments(rom_a[:n], r_end))):
        e, r = pick(e_rows, elo, ehi), pick(r_rows, rlo, rhi)
        sm = difflib.SequenceMatcher(None, [x[1:4] for x in e], [x[1:4] for x in r], autojunk=False)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag != "equal":
                miss += j2 - j1; extra += i2 - i1
                for j in range(j1,j2): out.append(dict(seed=seed,seg=name,si=si,rf=r[j][4],kind=r[j][1],sid=r[j][2],off=None,tag='missing'))
                for i in range(i1,i2): out.append(dict(seed=seed,seg=name,si=si,rf=e[i][4],kind=e[i][1],sid=e[i][2],off=None,tag='extra'))
                continue
            for i, j in zip(range(i1, i2), range(j1, j2)):
                kind, sid = e[i][1], e[i][2]
                fam = family(kind, sid, name)
                k = bisect.bisect_right(tf, r[j][4]) - 1
                mv = tl[k][1] if k >= 0 else 0
                kc = bisect.bisect_right(cf, e[i][4]) - 1
                ec = ecmd[kc] if kc >= 0 else None
                out.append(dict(seed=seed,seg=name,si=si,rf=r[j][4],ef=e[i][4],rel=r[j][0],kind=kind,sid=sid,fam=fam,mv=mv,off=e[i][0]-r[j][0],tag='m',
                    ecmd=(ec[3] if ec else 'pre'), eci=(ec[2] if ec else -1), ecf=(ec[0] if ec else None)))
    return out, miss, extra
if __name__=='__main__':
    scene=sys.argv[1]; romdir=Path(sys.argv[2]); engdir=Path(sys.argv[3]); outp=sys.argv[4]
    seeds = sorted(int(p.name.split("-")[0]) for p in romdir.glob(f"*-{scene}.snd.json"))
    allr=[]
    for s in seeds:
        r,m,x=rows2(romdir,engdir,s,scene); allr+=r
    json.dump(allr,open(outp,'w'))
    mm=[r for r in allr if r['tag']=='m']
    print(scene,len(mm),sum(abs(r['off']) for r in mm),sum(1 for r in mm if r['off']==0), [r for r in allr if r['tag']!='m'][:3])
