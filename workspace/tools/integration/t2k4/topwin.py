import json,collections,sys,os
# usage: topwin.py SCENE [N]  -> the N largest owned windows (one nonzero offset step to the next) with seed / segment / decision / step / carried / cause / move
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'own.py')).read().split("res={}")[0])
sc=sys.argv[1]; n=int(sys.argv[2]) if len(sys.argv)>2 else 40
S=steps(sc); seg=collections.defaultdict(list)
for r in S: seg[(r['seed'],r['si'])].append(r)
ws=[]
for k,l in seg.items():
    cur=None
    for r in l:
        if r['step']!=0:
            cur=dict(seed=r['seed'],si=r['si'],d=r['si']//2,rf=r['rf'],step=r['step'],prev=r['prev'],cause=cause(r,sc),prevc=r['prevc'],rows=0,mass=0,mv=mn.get(r['mv'],r['mv'])); ws.append(cur)
        if cur: cur['rows']+=1; cur['mass']+=abs(r['off'])
for w in sorted(ws,key=lambda w:-w['mass'])[:n]:
    print(f"s{w['seed']} d{w['d']} si{w['si']} rf{w['rf']} step{w['step']:+d} prev{w['prev']:+d} rows{w['rows']} mass{w['mass']} {w['cause']} mv={w['mv']} prevc={w['prevc']}")
