import json,sys
# usage: after.py attr-on.json [attr-on.json ...] -> for every end-of-turn tick, the offset of the tick's first row and of each following row up to the next 2 non-148 rows (ecmd / sid / off), per attr file side by side
fs=[json.load(open(f)) for f in sys.argv[1:]]
def ticks(a):
    out=[];seen=set()
    for i,r in enumerate(a):
        if r.get('tag')=='m' and r['sid'] in(148,180) and r['ecmd']=='status-animation' and r['mv']==0:
            k=(r['seed'],r['seg'],r['rf'])
            if k in seen: continue
            seen.add(k); out.append((k,i))
    return out
T=[ticks(a) for a in fs]
for n,(k,i) in enumerate(T[0]):
    line=f"s{k[0]} {k[1]:>6} rf{k[2]}:"
    for a,t in zip(fs,T):
        j=dict(t).get(k)
        if j is None: line+=' |-'; continue
        r=a[j]; seq=[f"{r['off']:+d}"]
        m=j+1; extra=0
        while m<len(a) and a[m]['seed']==r['seed'] and a[m]['seg']==r['seg'] and extra<3:
            x=a[m]
            if x.get('tag')=='m' and not(x['sid'] in(148,180) and x['ecmd']=='status-animation'): seq.append(f"{x['ecmd'][:6]}{x['sid']}:{x['off']:+d}"); extra+=1
            m+=1
        line+=' | '+' '.join(seq)
    print(line)
