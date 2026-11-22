import json,collections,sys,os
# usage: win.py SCENE GROUP-SUBSTRING  -> windows (seed, seg, rf, step, cause, prev cause, rows, mass) owned by that group
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'own.py')).read().split("res={}")[0])
sc=sys.argv[1]; pat=sys.argv[2]
S=steps(sc); seg=collections.defaultdict(list)
for r in S: seg[(r['seed'],r['si'])].append(r)
out=[]
for k,l in seg.items():
    cur=None
    for r in l:
        c=cause(r,sc)
        if r['step']!=0:
            cur=dict(seed=r['seed'],si=r['si'],seg=r['seg'],rf=r['rf'],step=r['step'],cause=c,grp=grp(sc,c,r),prevc=r['prevc'],prev=r['prev'],ecmd=r['ecmd'],mv=r['mv'],rows=0,mass=0); out.append(cur)
        if cur: cur['rows']+=1; cur['mass']+=abs(r['off'])
out=[w for w in out if pat in w['grp'] or pat in w['cause']]
for w in sorted(out,key=lambda w:-w['mass'])[:int(sys.argv[3]) if len(sys.argv)>3 else 25]:
    print(f"s{w['seed']} si{w['si']}({w['seg']}) rf{w['rf']} step{w['step']:+d} prev{w['prev']:+d} rows{w['rows']} mass{w['mass']} cause={w['cause']} after={w['prevc']} ecmd={w['ecmd']} mv={mn.get(w['mv'],w['mv'])}")
print('windows',len(out),'mass',sum(w['mass'] for w in out))
