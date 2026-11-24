import json,collections,sys,os
# usage: T2K4_DIR=DIR classes.py [SCENE|both] [TOPN]  -> every owned window (rank6's ownership: one nonzero offset step to the next) classified by MECHANISM (what kind of command starts the
# window, not which move), with mass / windows / clean-start mass (previous offset 0 = the class's own rule; the rest is carried) / seeds / the largest windows. Needs attr-{on,off}.json (attr.py).
_H=os.path.dirname(os.path.abspath(__file__)); __file__=os.path.join(_H,'..','t2k4','own.py')  # own.py / step.py / agg.py locate their siblings by __file__
exec(open(__file__).read().split("res={}")[0])
__file__=os.path.join(_H,'classes.py')
HELD={'gen:152','gen:228','gen:102'}
TICK={'gen:148','gen:180','gen:219','gen:242','gen:179','gen:127','gen:189','gen:140','gen:142'}
def prevclass(pc):
    if pc=='start': return 'segment start (forced commit / A press)'
    if pc.startswith('ctl-hit'): return 'after a hit SE'
    if pc.startswith('stat'): return 'after a stat SE'
    if pc.startswith(('ctl-chain:15','cry:@switch','cry:@move')): return 'after a send-in / cry'
    if pc.startswith(('ctl-chain:16','cry:@faint')): return 'after a faint'
    if pc.startswith('ctl-chain:90'): return 'after an hp / SE 90 command'
    if pc.startswith('gen:'): return 'after a gen SE (item / tick / status)'
    if pc.startswith('body:'): return 'after a move body'
    return pc
def mech(sc,c,r,fp):
    if fp and (c in HELD or c in('gen:171','body:FOCUS_PUNCH') or c.startswith('ctl-chain:90')): return '04 Focus Punch setup / lost-focus / item rows'
    if c in('gen:171',): return '04 Focus Punch setup / lost-focus / item rows'
    if c in HELD: return '02 held-item / berry chain (SE 152 / 228 / 102)'
    if c.startswith(('ctl-chain:16','cry:@faint')): return '01a faint chain (SE 16, cry@faint)'
    if c.startswith(('ctl-chain:15','ctl-chain:114','cry:@switch','cry:')): return '01b send-in / recall / party summary (SE 15 / 114, cry)'
    if c.startswith('ctl-hit'): return '03 hit SE 12 / 13 / 14'
    if c.startswith('stat'): return '08 stat SE 239 / 245'
    if c in TICK or c.startswith('gen:'): return '05 end-of-turn tick / status animation (gen)'
    if c.startswith('ctl-chain:90') : return '09 SE 90 / hp command'
    if c in('body:DIG','body:SOLAR_BEAM','body:FLY','body:BOUNCE','body:SKY_ATTACK','body:SKULL_BASH','body:RAZOR_WIND'): return '06 two-turn charge / second turn body'
    if c.startswith('body:'):
        b=c[5:]
        if b in B4: return '07b status-application body (B4)'
        return '07a move body first row (per-move constant)'
    return '10 other '+c
def windows(sc):
    S=steps(sc); seg=collections.defaultdict(list)
    for r in S: seg[(r['seed'],r['si'])].append(r)
    FP=set()
    for k,l in seg.items():
        for r in l:
            if cause(r,sc) in('gen:171','body:FOCUS_PUNCH'): FP.add(k)
    ws=[]
    for k,l in seg.items():
        cur=None
        for r in l:
            c=cause(r,sc)
            if r['step']!=0 or cur is None:
                cur=dict(seed=r['seed'],d=int(r['seg'].lstrip('res')) if r['seg'].startswith('res') else r['seg'],si=r['si'],rf=r['rf'],step=r['step'],prev=r['prev'],cause=c,prevc=r['prevc'],ecmd=r['ecmd'],mv=mn.get(r['mv'],r['mv']),rows=0,mass=0)
                cur['cls']='00 exact-start' if r['step']==0 else mech(sc,c,r,k in FP)
                ws.append(cur)
            cur['rows']+=1; cur['mass']+=abs(r['off'])
    return ws
if __name__=='__main__':
    which=sys.argv[1] if len(sys.argv)>1 else 'both'; N=int(sys.argv[2]) if len(sys.argv)>2 else 3
    W={sc:windows(sc) for sc in ('on','off')}
    print(f"{'class':62} {'ON mass':>8} {'win':>4} {'clean':>6} {'OFF mass':>8} {'win':>4} {'clean':>6}")
    keys=sorted({w['cls'] for sc in W for w in W[sc]},key=lambda k:-sum(w['mass'] for sc in W for w in W[sc] if w['cls']==k))
    for k in keys:
        row=[]
        for sc in ('on','off'):
            l=[w for w in W[sc] if w['cls']==k]; row+= [sum(w['mass'] for w in l),len(l),sum(w['mass'] for w in l if w['prev']==0)]
        print(f"{k:62} {row[0]:8} {row[1]:4} {row[2]:6} {row[3]:8} {row[4]:4} {row[5]:6}")
    print('TOTAL',sum(w['mass'] for w in W['on']),sum(w['mass'] for w in W['off']))
    if which!='both' or True:
        for k in keys:
            for sc in ('on','off'):
                l=sorted([w for w in W[sc] if w['cls']==k],key=lambda w:-w['mass'])
                if not l: continue
                g=collections.Counter(); gm=collections.Counter()
                for w in l: g[prevclass(w['prevc'])]+=1; gm[prevclass(w['prevc'])]+=w['mass']
                print(f"== {k} [{sc}] windows={len(l)} by previous command: "+'; '.join(f"{p} {gm[p]}/{g[p]}" for p,_ in gm.most_common(4)))
                for w in l[:N]: print(f"     s{w['seed']} d{w['d']} step{w['step']:+d} prev{w['prev']:+d} rows{w['rows']} mass{w['mass']} {w['cause']} ecmd={w['ecmd']} prevc={w['prevc']}")
