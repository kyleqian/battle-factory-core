import json,collections,sys
import os
O=os.environ.get('T2K4_DIR','.integration/evidence/t2k4')+'/'
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'agg.py')).read().split("for scene in")[0])
def steps(scene):
    rows=[r for r in json.load(open(O+f'attr-{scene}.json')) if r['tag']=='m']
    seg=collections.defaultdict(list)
    for r in rows: seg[(r['seed'],r['si'])].append(r)
    out=[]
    for k,l in seg.items():
        l.sort(key=lambda r:(r['rf'],r['ef']))
        prev=0; pc='start'
        for r in l:
            d=r['off']-prev
            out.append(dict(r,step=d,prevc=pc,prev=prev))
            prev=r['off']; pc=cause(r,scene)
    return out
if __name__=='__main__':
    for scene in ('on','off'):
        s=steps(scene)
        T=sum(abs(r['step']) for r in s); M2=sum(abs(r['off']) for r in s)
        print('=====',scene,'mass',M2,'step mass',T,'rows with step!=0',sum(1 for r in s if r['step']))
        g=collections.defaultdict(list)
        for r in s: g[cause(r,scene)].append(r['step'])
        print(' -- step mass by cause of the row where the offset changes')
        for k,l in sorted(g.items(),key=lambda kv:-sum(map(abs,kv[1])))[:30]:
            print(f'  {k:34} rows={len(l):4} nonzero-steps={sum(1 for x in l if x):4} stepmass={sum(map(abs,l)):5} net={sum(l):5}')
