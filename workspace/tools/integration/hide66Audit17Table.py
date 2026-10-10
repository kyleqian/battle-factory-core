"""hide66: audit-17 windows, production (no patch) vs the committed pre-fix receipts (receipts/main, receipts/dt60).
   python3 tools/integration/hide66Audit17Table.py <new-receipt-dir> > <table.txt>
Per window: chain px before -> after, rows, r1 == r2 (both fresh direct-mGBA runs; chain and entry digests), the hide replay."""
import glob, json, sys

A17 = "tools/integration/fixtures/audit-17/receipts"


def load(d):
    out = {}
    for f in sorted(glob.glob(d + "/check-*.json")):
        for r in json.load(open(f))["rows"]:
            out[r["fixture"]] = r
    return out


old = {**load(A17 + "/main"), **load(A17 + "/dt60")}
new = load(sys.argv[1])
same = lambda r, k: r[k]["digests"][0] == r[k]["digests"][1]
prev0 = [k for k in new if k in old and old[k]["chain"]["px"] == 0]
print(f"windows {len(new)}; r1 == r2 (chain and entry) {sum(same(r, 'chain') and same(r, 'entry') for r in new.values())}/{len(new)}")
print(f"0 px before {len(prev0)}, still 0 px {sum(new[k]['chain']['px'] == 0 for k in prev0)}; 0 px now {sum(r['chain']['px'] == 0 for r in new.values())}")
print(f"{'window':34s} {'move':12s} live  rows px-before px-after r1==r2 hidden[ply,opp]")
for k in sorted(new):
    n = new[k]["chain"]
    o = old.get(k, {}).get("chain")
    if o is not None and o["px"] == n["px"] and o["live"] == n["live"]:
        continue
    print(f"{k:34s} {new[k]['move']:12s} {str(o['live'] if o else '?')[0]}->{str(n['live'])[0]} {n['rows']:4d} {o['px'] if o else '?':>9} {n['px']:>8} "
          f"{same(new[k], 'chain')} {n['hidden']}")
