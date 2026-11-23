import json,collections,sys
import os
O=os.environ.get('T2K4_DIR','.integration/evidence/t2k4')+'/'
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'step.py')).read().split("if __name__")[0])
def gains(scene):
    s=steps(scene)
    seg=collections.defaultdict(list)
    for r in s: seg[(r['seed'],r['si'])].append(r)
    ev=[]
    for k,l in seg.items():
        offs=[r['off'] for r in l]
        for i,r in enumerate(l):
            st=r['step']
            if st==0: continue
            tail=offs[i:]
            # remove the step: shift the later rows until the end of the segment
            g=sum(map(abs,tail))-sum(abs(o-st) for o in tail)
            ev.append(dict(seed=r['seed'],si=r['si'],rf=r['rf'],cause=cause(r,scene),prevc=r['prevc'],step=st,gain=g,nrows=len(tail),seg=r['seg'],mv=r['mv'],ecmd=r['ecmd'],eci=r['eci']))
    return ev
if __name__=='__main__':
    for scene in ('on','off'):
        ev=gains(scene)
        print('=====',scene,'steps',len(ev),'sum pos gain',sum(e['gain'] for e in ev if e['gain']>0))
        g=collections.defaultdict(list)
        for e in ev: g[e['cause']].append(e)
        for k,l in sorted(g.items(),key=lambda kv:-sum(e['gain'] for e in kv[1] if e['gain']>0))[:28]:
            pos=sum(e['gain'] for e in l if e['gain']>0)
            print(f'  {k:34} steps={len(l):3} posgain={pos:5} netgain={sum(e["gain"] for e in l):5} steps:{sorted(e["step"] for e in l)[:6]}..{sorted(e["step"] for e in l)[-4:]}')
        json.dump(ev,open(O+f'gain-{scene}.json','w'))
