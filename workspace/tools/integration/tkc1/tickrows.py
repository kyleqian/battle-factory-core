import json,sys,collections
# usage: tickrows.py attr-on.json -> one line per end-of-turn status tick (first row of a gen:148 / 180 status-animation command with mv 0) + the offset histogram
a=json.load(open(sys.argv[1])); seen=set(); hist=collections.Counter(); mass=0
for r in a:
    if r.get('tag')=='m': mass+=abs(r['off'])
for i,r in enumerate(a):
    if r.get('tag')!='m' or r['sid'] not in (148,180) or r['ecmd']!='status-animation' or r['mv']!=0: continue
    k=(r['seed'],r['seg'],r['ecf'])
    if k in seen: continue
    seen.add(k)
    p=a[i-1] if i>0 and a[i-1]['seed']==r['seed'] and a[i-1]['seg']==r['seg'] and a[i-1].get('tag')=='m' else None
    step=r['off']-(p['off'] if p else 0); hist[step]+=1
    print(f"s{r['seed']} {r['seg']:>6} si{r['si']:<3} rf{r['rf']:<6} sid{r['sid']} off{r['off']:+d} prev{(p['off'] if p else 0):+d} step{step:+d} prevc={p['ecmd']+':'+str(p['sid']) if p else 'start'}")
print('TICKS',len(seen),'step hist',dict(sorted(hist.items())),'TOTAL MASS',mass)
