import json,collections,os
# usage: rank.py  -> the t2k5 ranked items: every row is owned by the window (one nonzero offset step to the next) that starts it, each window by one item; items + remainder = TOTAL
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'own.py')).read().split("res={}")[0])
def item(sc,c,g,prevc):
    if c=='ctl-chain:15@sprite-visibility' and prevc=='start': return '09 forced send-in SE 15 (segment start)'
    if g=='body:FIRE_BLAST': return '11 Fire Blast after a held-item heal'
    if g.startswith(('send-in/ball 15','faint 16','party-summary')): return '01 faint / send-in chain (SE 15 / 16 / 114, cry@faint)'
    if g=='gen held-item group': return '02 held-item group gen:152 / 228 / 102'
    if g.startswith('ctl-hit'): return '03 hit SE 12 / 13 / 14'
    if g=='gen:180': return '04 gen:180 Leech Seed drain'
    if g=='body:ROCK_SLIDE': return '05 Rock Slide body'
    if g=='gen:148': return '06 gen:148 poison / status tick'
    if g in('body:SOLAR_BEAM','body:DIG'): return '07 two-turn second family (Solar Beam, Dig)'
    if g in('body:PSYCHIC','body:CALM_MIND'): return '08 Psychic + Calm Mind (s97 d11 / d12)'
    if g in('body:CONFUSION','body:SUPERSONIC'): return '10 Confusion + Supersonic (status-animation / Dig no-effect)'
    if g.startswith('stat'): return '12 stat SE 239 / 245 / 23 / 24'
    if g=='B4 bodies': return 'B4 bodies'
    return 'R remainder'
T={}
for sc in ('on','off'):
    S=steps(sc); seg=collections.defaultdict(list)
    for r in S: seg[(r['seed'],r['si'])].append(r)
    acc=collections.defaultdict(lambda:[0,0,0]); cur=None
    for k,l in seg.items():
        for r in l:
            c=cause(r,sc)
            if r['step']!=0:
                cur=item(sc,c,grp(sc,c,r),r['prevc']); acc[cur][1]+=1
            elif cur is None: cur='exact-start'
            acc[cur][0]+=abs(r['off']); acc[cur][2]+=1
        cur=None
    T[sc]=acc
keys=sorted(set(T['on'])|set(T['off']))
print(f"{'item':62} {'ON mass':>8} {'ON win':>7} {'OFF mass':>9} {'OFF win':>8} {'sum':>6}")
for k in keys:
    a=T['on'].get(k,[0,0,0]); b=T['off'].get(k,[0,0,0]); print(f"{k:62} {a[0]:8} {a[1]:7} {b[0]:9} {b[1]:8} {a[0]+b[0]:6}")
print('TOTAL',sum(v[0] for v in T['on'].values()),sum(v[0] for v in T['off'].values()))
