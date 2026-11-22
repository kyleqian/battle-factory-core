import json,collections,sys,os
# usage: segstart.py SCENE [MINMASS] -> owned windows whose first nonzero step is the FIRST row of a resolution segment (prev=0, prevc=start), grouped by (cause, step): the per-move first-body constants
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'own.py')).read().split("res={}")[0])
sc=sys.argv[1]; mm=int(sys.argv[2]) if len(sys.argv)>2 else 30
S=steps(sc); seg=collections.defaultdict(list)
for r in S: seg[(r['seed'],r['si'])].append(r)
g=collections.defaultdict(lambda:[0,0,[]]); T=0
for k,l in seg.items():
    cur=None
    for r in l:
        if r['step']!=0:
            cur=(cause(r,sc),r['step']) if (r['prevc']=='start') else None
            if cur: g[cur][1]+=1; g[cur][2].append((r['seed'],r['si']//2))
        if cur: g[cur][0]+=abs(r['off'])
tot=sum(v[0] for v in g.values()); print('segment-start windows total mass',tot,'windows',sum(v[1] for v in g.values()))
bymv=collections.defaultdict(lambda:[0,0])
for (c,s),v in g.items(): bymv[c][0]+=v[0]; bymv[c][1]+=v[1]
for c,v in sorted(bymv.items(),key=lambda kv:-kv[1][0])[:25]: print(f"  {c:30} mass={v[0]:4} win={v[1]:3} steps="+','.join(f"{s:+d}x{g[(c,s)][1]}" for (cc,s) in g if cc==c))
