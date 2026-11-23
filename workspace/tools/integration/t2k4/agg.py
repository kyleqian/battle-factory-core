import json,sys,collections,statistics
import os
O=os.environ.get('T2K4_DIR','.integration/evidence/t2k4')+'/'
mn={int(k):v for k,v in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'movenames.json'))).items()}
B4={'THUNDER_WAVE','STUN_SPORE','SLEEP_POWDER','SING','GRASSWHISTLE','LOVELY_KISS','WILL_O_WISP','GLARE','CONFUSE_RAY','CURSE','BRICK_BREAK'}
def cls(r):
    if r['fam']=='move-animation SE':
        return 'body' if r['mv'] not in (0,0xFFFF) else 'gen'
    if r['fam']=='battle-controller SE':
        return 'ctl-hit' if r['sid'] in (12,13,14) else 'ctl-chain'
    return {'cry':'cry','stat-change SE':'stat','bgm':'bgm'}.get(r['fam'],r['fam'])
def cause(r,scene):
    c=cls(r)
    if c=='body': return 'body:'+mn.get(r['mv'],str(r['mv']))
    if c=='gen': return f"gen:{r['sid']}"
    if scene=='off' or c in('ctl-hit','ctl-chain','cry','stat'):
        return f"{c}:{r['sid'] if c.startswith('ctl') or c=='stat' else ''}@{r['ecmd']}"
    return c
for scene in ('on','off'):
    rows=[r for r in json.load(open(O+f'attr-{scene}.json')) if r['tag']=='m']
    tot=sum(abs(r['off']) for r in rows)
    print('=====',scene,len(rows),tot,'exact',sum(1 for r in rows if r['off']==0))
    c=collections.defaultdict(lambda:[0,0,0])
    for r in rows:
        x=c[cls(r)];x[0]+=1;x[1]+=abs(r['off']);x[2]+= (r['off']==0)
    for k,v in sorted(c.items(),key=lambda kv:-kv[1][1]): print(f'  class {k:10} rows={v[0]} mass={v[1]} exact={v[2]} {100*v[1]/tot:.1f}%')
    big=[r for r in rows if abs(r['off'])>=20]
    print('  >=20 rows',len(big),sum(abs(r['off']) for r in big))
    # per cause
    g=collections.defaultdict(list)
    for r in rows: g[cause(r,scene)].append(r)
    print('  -- top causes')
    for k,l in sorted(g.items(),key=lambda kv:-sum(abs(r['off']) for r in kv[1]))[:40]:
        o=sorted(r['off'] for r in l); m=sum(abs(x) for x in o)
        print(f'  {k:36} rows={len(o):4} mass={m:5} {100*m/tot:4.1f}% med={o[len(o)//2]:4} exact={sum(1 for x in o if x==0)}')
    # windows (seed, si, cause)
    w=collections.defaultdict(list)
    for r in rows: w[(r['seed'],r['si'],cause(r,scene))].append(r)
    print('  -- top windows (seed,seg idx,cause)')
    for (s,si,k),l in sorted(w.items(),key=lambda kv:-sum(abs(r['off']) for r in kv[1]))[:35]:
        o=[r['off'] for r in l]
        print(f"  s{s} seg{si}({l[0]['seg']}) {k:32} rows={len(o)} mass={sum(map(abs,o))} offs={sorted(set(o))[:8]} first rom frame {min(r['rf'] for r in l)}")
