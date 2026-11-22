import json,collections,os
# usage: rank6.py -> the t2k6 ranked items (T2K4_DIR): every row owned by the window (one nonzero offset step to the next) that starts it, each window by one item; items + B4 + remainder = TOTAL
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'own.py')).read().split("res={}")[0])
def fp_segments(sc):
    s=set()
    for r in steps(sc):
        c=cause(r,sc)
        if c in ('gen:171','body:FOCUS_PUNCH'): s.add((r['seed'],r['si']))
    return s
def item(sc,c,g,prevc,fp):
    if fp and (g in ('gen held-item group','body:FOCUS_PUNCH','gen:171') or c.startswith('ctl-chain:90')): return 'Focus Punch segments (setup SE 171, lost-focus print, item rows after)'
    if g in('body:PSYCHIC',): return 'Psychic (s97 d11 natural thaw + Shell Bell rows)'
    if g in('gen:219','gen:242'): return 'weather tick: Sandstorm gen:219 / Hail gen:242'
    if g.startswith(('send-in/ball 15','faint 16','party-summary')): return 'faint / send-in chain (SE 15 / 16 / 114, cry@faint)'
    if g=='gen held-item group': return 'held-item group gen:152 / 228 / 102 (outside Focus Punch)'
    if g.startswith('ctl-hit'): return 'hit SE 12 / 13 / 14'
    if g=='gen:180': return 'gen:180 Leech Seed drain'
    if g=='body:ROCK_SLIDE': return 'Rock Slide body'
    if g=='gen:148': return 'gen:148 poison / status tick'
    if g in('body:CONFUSION','body:SUPERSONIC'): return 'Confusion + Supersonic'
    if g.startswith('stat'): return 'stat SE 239 / 245 / 23 / 24'
    if g=='B4 bodies': return 'B4 bodies'
    if g in('body:DIG','body:SOLAR_BEAM'): return 'two-turn second family (Dig, Solar Beam)'
    return 'R remainder'
T={}
for sc in ('on','off'):
    S=steps(sc); seg=collections.defaultdict(list)
    for r in S: seg[(r['seed'],r['si'])].append(r)
    FP=fp_segments(sc)
    acc=collections.defaultdict(lambda:[0,0,0,0]); cur=None; cl=False
    for k,l in seg.items():
        for r in l:
            c=cause(r,sc)
            if r['step']!=0:
                cur=item(sc,c,grp(sc,c,r),r['prevc'],k in FP); acc[cur][1]+=1; cl=(r['prev']==0)
            elif cur is None: cur='exact-start'
            acc[cur][0]+=abs(r['off']); acc[cur][2]+=1; acc[cur][3]+=abs(r['off'])*(1 if cl else 0)
        cur=None
    T[sc]=acc
keys=sorted(set(T['on'])|set(T['off']),key=lambda k:-(T['on'].get(k,[0])[0]+T['off'].get(k,[0])[0]))
print(f"{'item':72} {'ON mass':>8} {'ON win':>7} {'OFF mass':>9} {'OFF win':>8} {'sum':>6}")
for k in keys:
    a=T['on'].get(k,[0,0,0,0]); b=T['off'].get(k,[0,0,0,0]); print(f"{k:72} {a[0]:8} {a[1]:7} {b[0]:9} {b[1]:8} {a[0]+b[0]:6}  clean-start mass ON {a[3]} OFF {b[3]}")
print('TOTAL',sum(v[0] for v in T['on'].values()),sum(v[0] for v in T['off'].values()))
