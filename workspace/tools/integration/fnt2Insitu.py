#!/usr/bin/env python3
"""fnt2: in-situ "fainted!" print start, ROM vs engine, per T2 seed. usage: fnt2Insitu.py EVDIR SCENE SEED...
EVDIR holds p/SEED-SCENE.rom.json (hcr3mProbe over the frozen drive) and eng/SEED-SCENE.{engine,drive}.json (soundCensusRomReplay --cmdtrace=1 --romdrive).
Per faint print: ROM printstring row (BattleScript_Faint{Target,Attacker}+0xc, first glyph = row + 1) and the engine's first message cmd after its faint cmd, both relative to the
segment's move-commit anchor, plus the previous script / command (what the turn did before the faint)."""
import bisect, json, sys
ev, scene, seeds = sys.argv[1], sys.argv[2], [int(s) for s in sys.argv[3:]]
out = []
for seed in seeds:
    rom = json.load(open(f"{ev}/p/{seed}-{scene}.rom.json")); eng = json.load(open(f"{ev}/eng/{seed}-{scene}.engine.json"))
    drive = json.load(open(f"{ev}/eng/{seed}-{scene}.drive.json"))["drive"]
    rc = [a["commitFrame"] for a in drive["anchors"]]
    ec = [d["commitFrame"] for d in eng["decisions"] if d["commitFrame"] is not None]
    n = min(len(rc), len(ec)); rc, ec = rc[:n], ec[:n]
    snd = json.load(open(f"{ev}/snd/{seed}-{scene}.snd.json"))["events"]
    rse = [(e["frame"], e["id"]) for e in snd if e["kind"] == "se"]
    ese = [(x[0], x[2]) for x in eng["sound"] if x[1] == "se"]
    def prior(se, f, ids, lo=0):
        c = [x for x in se if x[1] in ids and lo <= x[0] <= f]
        return c[-1][0] if c else None
    names = rom["names"]; rows = rom["rows"]
    nm = lambda r: names.get(hex(r[1]), "")
    romp = []
    for i, r in enumerate(rows):
        if nm(r).startswith(("BattleScript_FaintTarget+0xc", "BattleScript_FaintAttacker+0xc")) and (i == 0 or nm(rows[i - 1]) != nm(r)):
            fi = i
            while fi > 0 and not nm(rows[fi]).endswith(("FaintTarget+0x0", "FaintAttacker+0x0")): fi -= 1
            # previous distinct script label before the faint script
            pj = fi - 1
            while pj > 0 and nm(rows[pj]).split("+")[0] == nm(rows[fi]).split("+")[0]: pj -= 1
            # the last exec rising edge (0 -> nonzero) before the faint script = the HP drain's datahpupdate; ROM hp drain length = rise -> fall
            hj = fi - 1
            while hj > 0 and not (rows[hj][2] != 0 and rows[hj - 1][2] == 0): hj -= 1
            fall = next((x[0] for x in rows[hj:] if x[2] == 0), rows[fi][0])
            romp.append((r[0], rows[fi][0], nm(rows[pj]).split("+")[0], nm(rows[pj - 1]).split("+")[0] if pj else "", rows[hj][0], fall, nm(rows[hj])))
    engp = []
    cm = eng["cmds"]
    for i, c in enumerate(cm):
        if c[3] == "faint":
            j = i + 1
            while j < len(cm) and cm[j][3] != "message": j += 1
            hk = i - 1
            while hk > 0 and cm[hk][3] != "hp": hk -= 1
            if j < len(cm): engp.append((cm[j][0], c[0], cm[i - 1][3] if i else "", cm[i - 2][3] if i > 1 else "", cm[hk][0], c[0]))
    # pair by segment (decision) index
    def seg(frames, anchors): return lambda f: bisect.bisect_right(anchors, f) - 1
    rs, es = seg(None, rc), seg(None, ec)
    rb, eb = {}, {}
    for p in romp: rb.setdefault(rs(p[0]), []).append(p)
    for p in engp: eb.setdefault(es(p[0]), []).append(p)
    for k in sorted(rb):
        if k < 0 or k >= n: continue
        for a, b in zip(rb[k], eb.get(k, [])):
            r16, e16 = prior(rse, a[0], (16,)), prior(ese, b[0], (16,))
            rh, eh = prior(rse, r16 if r16 is not None else a[0], (12, 13, 14), rc[k]), prior(ese, e16 if e16 is not None else b[0], (12, 13, 14), ec[k])
            sd = dict(se16=(e16 - ec[k]) - (r16 - rc[k]) if r16 is not None and e16 is not None else None,
                      seHit=(eh - ec[k]) - (rh - rc[k]) if rh is not None and eh is not None else None,
                      rom16ToGlyph=a[0] + 1 - r16 if r16 is not None else None, eng16ToGlyph=b[0] - e16 if e16 is not None else None,
                      romHitTo16=r16 - rh if None not in (r16, rh) else None, engHitTo16=e16 - eh if None not in (e16, eh) else None)
            out.append(dict(seed=seed, seg=k, romRel=a[0] - rc[k], engRel=b[0] - ec[k], d=(b[0] - ec[k]) - (a[0] + 1 - rc[k]), romFaintRel=a[1] - rc[k], engFaintRel=b[1] - ec[k], romPrev=a[2], romPrev2=a[3], engPrev=b[2], engPrev2=b[3],
                            romHp=a[4] - rc[k], engHp=b[4] - ec[k], romDrain=a[5] - a[4], engDrain=b[5] - b[4], romHpToGlyph=a[0] + 1 - a[4], engHpToGlyph=b[0] - b[4], romHpName=a[6], **sd))
        if len(rb[k]) != len(eb.get(k, [])): out.append(dict(seed=seed, seg=k, note=f"count rom {len(rb[k])} eng {len(eb.get(k, []))}"))
for o in out: print(json.dumps(o))
