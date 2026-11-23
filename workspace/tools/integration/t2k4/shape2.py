import json,collections,sys
import os
O=os.environ.get('T2K4_DIR','.integration/evidence/t2k4')+'/'
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'agg.py')).read().split("for scene in")[0])
def wshape(o):
    mass=sum(map(abs,o)); sp=max(o)-min(o); mode=collections.Counter(o).most_common(1)[0][0]
    if mass==0: return 'exact'
    if mass>=20 and len(o)>=1 and (sp<=1 and abs(mode)>=20): return 'oneoff'
    if sp<=1: return 'const'
    return 'varies'
for scene in ('on','off'):
    rows=[r for r in json.load(open(O+f'attr-{scene}.json')) if r['tag']=='m']
    w=collections.defaultdict(list)
    for r in rows: w[(r['seed'],r['si'],cause(r,scene))].append(r)
    tab=collections.defaultdict(lambda:collections.defaultdict(lambda:[0,0]))
    for (s,si,c),l in w.items():
        o=[r['off'] for r in sorted(l,key=lambda r:r['rf'])]
        cl=cls(l[0])
        if scene=='on' and c.startswith('body:') and c[5:] in B4: cl='B4 bodies'
        sh=wshape(o); t=tab[cl][sh]; t[0]+=1; t[1]+=sum(map(abs,o))
    print('=====',scene)
    for cl,d in sorted(tab.items(),key=lambda kv:-sum(v[1] for v in kv[1].values())):
        print(f'  {cl:10} total={sum(v[1] for v in d.values()):5}',{k:tuple(v) for k,v in d.items()})
    # B4 bodies mass
    if scene=='on':
        b=collections.Counter()
        for r in rows:
            c=cause(r,scene)
            if c.startswith('body:') and c[5:] in B4: b[c[5:]]+=abs(r['off'])
        print('  B4',sum(b.values()),dict(b))
