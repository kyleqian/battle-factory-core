import json,sys
# usage: seeddiff.py BASE.json NEW.json SCENE  (soundScoreboard.py --out files) -> per-seed mass that changed, and the total
a=json.load(open(sys.argv[1]))[sys.argv[3]]['perSeed']; b=json.load(open(sys.argv[2]))[sys.argv[3]]['perSeed']
m=lambda x:sum(f['mass'] for f in x['families'].values())
t=0
for k in a:
    if k in b and m(a[k])!=m(b[k]): print('seed',k,m(a[k]),'->',m(b[k]),m(b[k])-m(a[k])); t+=m(b[k])-m(a[k])
print('net',t)
