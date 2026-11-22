import json,collections,sys,os
# usage: stepctx.py SCENE STEP  -> where the clean-start (prev 0) windows of one step value sit: (segment start / after a row, segment kind, cause) counts
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"own.py")).read().split("res={}")[0])
sc=sys.argv[1]; st=int(sys.argv[2])
S=steps(sc); seg=collections.defaultdict(list)
for r in S: seg[(r['seed'],r['si'])].append(r)
c=collections.Counter(); m=collections.Counter()
for k,l in seg.items():
    for i,r in enumerate(l):
        if r['step']==st and r['prev']==0:
            key=(r['prevc'] if r['prevc']=='start' else 'after-row', r['seg'][:3], cause(r,sc))
            c[key]+=1
            m[key]+=sum(abs(x['off']) for x in l[i:])  # upper bound to end of segment
for k,v in c.most_common(25): print(v,k)
