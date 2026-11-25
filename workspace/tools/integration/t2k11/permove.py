import sys,os,collections
# usage: T2K4_DIR=DIR permove.py SCENE [MINMASS]  -> per (class, cause) group of the t2k10/classes.py windows: mass, windows, clean windows, step histogram of the clean windows, and the mass a constant at
# the clean windows' modal step would remove ("const gain": per window rows*(|step| - |step - mode|), kept only if > 0). A mode share near 100% = a per-move rule; a spread = D4 / VBlank phase or carried.
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','t2k10'))
import classes as C
sc=sys.argv[1]; MIN=int(sys.argv[2]) if len(sys.argv)>2 else 20
W=[w for w in C.windows(sc) if w['cls']!='00 exact-start']
G=collections.defaultdict(list)
for w in W: G[(w['cls'],w['cause'])].append(w)
out=[]
for (k,c),l in G.items():
    m=sum(w['mass'] for w in l)
    if m<MIN: continue
    cl=[w for w in l if w['prev']==0]
    h=collections.Counter(w['step'] for w in cl)
    mode,mc=(h.most_common(1)[0] if h else (0,0))
    gain=sum(max(0,w['rows']*(abs(w['step'])-abs(w['step']-mode))) for w in l) if mode else 0
    out.append((m,k,c,len(l),len(cl),dict(sorted(h.items())),mode,mc,gain))
for m,k,c,n,nc,h,mode,mc,g in sorted(out,reverse=True):
    print(f"{m:5} {k[:2]} {c:28} win {n:3} clean {nc:3} mode {mode:+d} x{mc}/{nc} constgain {g:4}  clean-steps {h}")
