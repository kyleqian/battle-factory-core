import json,collections,sys,os
# usage: winitem.py SCENE [N] -> the N largest owned windows per rank6.py item (T2K4_DIR): seed / decision / step / carried offset / rows / mass / cause / move / previous row's cause
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'rank6.py')).read().split("T={}")[0])
sc=sys.argv[1]; n=int(sys.argv[2]) if len(sys.argv)>2 else 8
S=steps(sc); seg=collections.defaultdict(list)
for r in S: seg[(r['seed'],r['si'])].append(r)
FP=fp_segments(sc); W=collections.defaultdict(list)
for k,l in seg.items():
    cur=None
    for r in l:
        c=cause(r,sc)
        if r['step']!=0:
            cur=dict(seed=r['seed'],d=r['si']//2,step=r['step'],prev=r['prev'],cause=c,prevc=r['prevc'],rows=0,mass=0,mv=mn.get(r['mv'],r['mv']),item=item(sc,c,grp(sc,c,r),r['prevc'],k in FP)); W[cur['item']].append(cur)
        if cur is None: continue
        cur['rows']+=1; cur['mass']+=abs(r['off'])
for it,l in sorted(W.items(),key=lambda kv:-sum(w['mass'] for w in kv[1])):
    print(f"== {it}  mass={sum(w['mass'] for w in l)} windows={len(l)}")
    for w in sorted(l,key=lambda w:-w['mass'])[:n]:
        print(f"   s{w['seed']} d{w['d']} step{w['step']:+d} prev{w['prev']:+d} rows{w['rows']} mass{w['mass']} {w['cause']} mv={w['mv']} prevc={w['prevc']}")
if os.environ.get('CTX'):  # CTX=1: per item, its windows grouped by the previous row's cause (mass / windows / net step)
    import re
    for it,l in sorted(W.items(),key=lambda kv:-sum(w['mass'] for w in kv[1])):
        if it.startswith('R '): continue
        d=collections.defaultdict(lambda:[0,0,0])
        for w in l:
            k=re.sub(r'@.*','',w['prevc']); k='body' if k.startswith('body:') else k
            x=d[k]; x[0]+=w['mass']; x[1]+=1; x[2]+=w['step']
        print('== ctx',it[:44],sum(w['mass'] for w in l))
        for k,v in sorted(d.items(),key=lambda kv:-kv[1][0])[:7]: print(f'   prev {k:18} mass {v[0]:4} win {v[1]:3} net-step {v[2]:+4}')
