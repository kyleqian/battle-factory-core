import json,collections,sys,os
# usage: stepclass.py SCENE [MINMASS]  -> owned windows grouped by (step, prev==0?) with count / mass / example windows (a recurring clean-start step = one engine rule candidate)
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'own.py')).read().split("res={}")[0])
sc=sys.argv[1]; mm=int(sys.argv[2]) if len(sys.argv)>2 else 40
S=steps(sc); seg=collections.defaultdict(list)
for r in S: seg[(r['seed'],r['si'])].append(r)
ws=[]
for k,l in seg.items():
    cur=None
    for r in l:
        if r['step']!=0:
            cur=dict(seed=r['seed'],si=r['si'],rf=r['rf'],step=r['step'],prev=r['prev'],cause=cause(r,sc),prevc=r['prevc'],rows=0,mass=0,ecmd=r['ecmd'],mv=mn.get(r['mv'],r['mv'])); ws.append(cur)
        if cur: cur['rows']+=1; cur['mass']+=abs(r['off'])
g=collections.defaultdict(list)
for w in ws: g[(w['step'],'clean' if w['prev']==0 else 'carried')].append(w)
for (st,c),l in sorted(g.items(),key=lambda kv:-sum(w['mass'] for w in kv[1])):
    m=sum(w['mass'] for w in l)
    if m<mm: break
    ex=sorted(l,key=lambda w:-w['mass'])[:3]
    print(f"step{st:+d} {c:7} win={len(l):3} mass={m:5} ex="+' | '.join(f"s{w['seed']}si{w['si']} {w['cause']} m{w['mass']}" for w in ex))
