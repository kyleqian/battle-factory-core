import json,collections,sys
import os
O=os.environ.get('T2K4_DIR','.integration/evidence/t2k4')+'/'
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'step.py')).read().split("if __name__")[0])
def grp(scene,c,r):
    if c.startswith('body:'):
        b=c[5:]
        if b in B4: return 'B4 bodies'
        return c
    if c in ('gen:152','gen:228','gen:102'): return 'gen held-item group'
    if c.startswith('gen:'): return c
    if c.startswith('ctl-hit'): return 'ctl-hit'+(':'+c.split('@')[1] if scene=='off' else '')
    if c.startswith('ctl-chain:114'): return 'party-summary 114'
    if c.startswith('ctl-chain:15'): return 'send-in/ball 15'+(':'+c.split('@')[1] if scene=='off' else '')
    if c.startswith('ctl-chain:16') or c.startswith('cry:@faint'): return 'faint 16 + cry@faint'
    if c.startswith('cry'): return 'cry'+(':'+c.split('@')[1] if scene=='off' else '')
    if c.startswith('stat:'): return 'stat'+c[4:7]
    if c.startswith('ctl-chain:90'): return 'ctl 90'
    return c
res={}
for sc in ('on','off'):
    S=steps(sc); seg=collections.defaultdict(list)
    for r in S: seg[(r['seed'],r['si'])].append(r)
    own=collections.defaultdict(lambda:dict(rows=0,mass=0,exact=0,seeds=set(),win=0,ex=[]))
    for k,l in seg.items():
        cur=None; wm=0
        for i,r in enumerate(l):
            c=cause(r,sc)
            if r['step']!=0 or cur is None:
                cur=grp(sc,c,r) if r['step']!=0 else 'exact-start'
                if r['step']!=0: own[cur]['win']+=1
                wstart=(r['seed'],r['si'],r['rf'],r['step'],c)
            x=own[cur]; x['rows']+=1; x['mass']+=abs(r['off']); x['exact']+=(r['off']==0); x['seeds'].add(r['seed'])
            if r['step']!=0: x['ex'].append((abs(r['step']),wstart))
    tot=sum(v['mass'] for v in own.values()); print('=====',sc,tot)
    for k,v in sorted(own.items(),key=lambda kv:-kv[1]['mass'])[:int(os.environ.get('TOP','45'))]:
        ex=sorted(v['ex'],reverse=True)[:2]
        print(f"  {k:34} rows={v['rows']:4} mass={v['mass']:5} exact={v['exact']:4} seeds={len(v['seeds']):2} win={v['win']:3} ex={[e[1][:4] for e in ex]}")
