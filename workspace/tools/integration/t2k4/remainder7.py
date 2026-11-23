import json,collections,os
# usage: remainder7.py [N] -> t2k7: the rank6.py 'R remainder' windows grouped by own.py cause group (mass / windows / clean-start mass), ON then OFF
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'rank6.py')).read().split("T={}")[0])
import sys
N=int(sys.argv[1]) if len(sys.argv)>1 else 25
for sc in ('on','off'):
    S=steps(sc); seg=collections.defaultdict(list)
    for r in S: seg[(r['seed'],r['si'])].append(r)
    FP=fp_segments(sc); acc=collections.defaultdict(lambda:[0,0,0]); tot=0
    for k,l in seg.items():
        cur=None; g=None; cl=False
        for r in l:
            c=cause(r,sc)
            if r['step']!=0:
                g=grp(sc,c,r); cur=item(sc,c,g,r['prevc'],k in FP); cl=(r['prev']==0)
                if cur.startswith('R '): acc[g][1]+=1
            if cur and cur.startswith('R '):
                acc[g][0]+=abs(r['off']); acc[g][2]+=abs(r['off'])*cl; tot+=abs(r['off'])
    print('=====',sc,'remainder',tot)
    for g,v in sorted(acc.items(),key=lambda kv:-kv[1][0])[:N]: print(f'  {g:34} mass={v[0]:5} win={v[1]:3} clean-start={v[2]}')
