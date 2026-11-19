"""lse1 hpd2Probe window analysis (R / L / R->A / len / H / R->H); used by join.py, run from the evidence dir (ram/*.json)."""
import json,sys
def analyze(path,maxwin=4):
    d=json.load(open(path))['rows']
    wins=[];i=0
    while i<len(d):
        if d[i]['anim']==1:
            j=i
            while j<len(d) and d[j]['anim']==1: j+=1
            wins.append((i,j-i)); i=j
        else: i+=1
    out=[]
    for ws,wl in wins[:maxwin]:
        ex=ws-3
        i=0;runs=[]
        while i<=ex:
            if d[i]['exec']!=0:
                j=i
                while j<=ex and d[j]['exec']!=0: j+=1
                runs.append((i,j));i=j
            else:i+=1
        s,R=runs[-1]
        H=next((i for i in range(ws+wl+1,len(d)) if d[i]['exec']!=0 and d[i-1]['exec']==0),None)
        out.append(dict(R=R,ex=ex,A=ws,lead=ex-R,RtoA=ws-R,len=wl,H=H,RtoH=(H-R) if H else None,aToH=(H-ws) if H else None))
    return out
if __name__=='__main__':
    for p in sys.argv[1:]:
        print(p.split('/')[-1])
        for w in analyze(p): print('  ',w)
