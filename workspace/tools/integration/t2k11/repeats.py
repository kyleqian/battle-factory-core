import sys,os,collections
# usage: T2K4_DIR=DIR repeats.py SCENE [MINWIN]  -> clean (prev 0) windows of every class grouped by (class, cause, previous-command class, ecmd, step): windows / distinct seeds / mass.
# A group over several seeds is a candidate rule (same context, same offset); a group inside one seed is that seed's phase (a loop that repeats the same turn shape), not a rule.
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','t2k10'))
import classes as C
sc=sys.argv[1]; MIN=int(sys.argv[2]) if len(sys.argv)>2 else 3
G=collections.defaultdict(list)
for w in C.windows(sc):
    if w['cls']=='00 exact-start' or w['prev']!=0: continue
    G[(w['cls'][:2],w['cause'],C.prevclass(w['prevc']),w['ecmd'],w['step'])].append(w)
for k,l in sorted(G.items(),key=lambda kv:-sum(w['mass'] for w in kv[1])):
    if len(l)<MIN: continue
    sd=collections.Counter(w['seed'] for w in l)
    print(f"{sum(w['mass'] for w in l):4} win {len(l):2} seeds {len(sd):2} {dict(sd.most_common(4))}  {k}")
