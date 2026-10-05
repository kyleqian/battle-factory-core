#!/usr/bin/env python3
"""Before/after (move, side) verdict diff between committed plans and plans-ext, weighted by the Factory Level-50 set model (pure python3).
usage: spriteOrderPlanCoverageReport.py   -> markdown tables on stdout"""
import json, sys, collections
sys.path.insert(0, "tools/integration")
import spriteOrderPlanCoverageRank as R
A = json.loads((R.FIX / "sprite-order-body-plans.json").read_text()); B = json.loads((R.FIX / "sprite-order-body-plans-ext.json").read_text())
w = R.weights(); tot = sum(w.values()) * 2; names = {v: k for k, v in R.move_ids().items()}
pct = lambda x: f"{x / tot * 100:.2f}%"
def cov(P):
    c = collections.Counter()
    for m, x in w.items():
        for s in ("opponent", "player"): c[R.verdict(P, m, s)] += x
    return c
ca, cb = cov(A), cov(B)
print("| verdict (weighted uses) | before | after |\n|---|---|---|")
for v in ("EXACT", "NEEDS-KEYS", "NOT-OBSERVED"): print(f"| {v} | {pct(ca[v])} | {pct(cb[v])} |")
cells = lambda P, v: sum(R.verdict(P, m, s) == v for m in w for s in ("opponent", "player"))
print("| (move, side) cells EXACT / NEEDS-KEYS / NOT-OBSERVED (of %d) | %s | %s |" % (len(w) * 2, " / ".join(str(cells(A, v)) for v in ("EXACT", "NEEDS-KEYS", "NOT-OBSERVED")), " / ".join(str(cells(B, v)) for v in ("EXACT", "NEEDS-KEYS", "NOT-OBSERVED"))))
def row(m, s): return f"| {m} {names[m]} | {s} | {pct(w[m])} |"
print("\n### Newly EXACT (move, side)\n| move | side | weight |\n|---|---|---|")
new = [(m, s) for m in sorted(w, key=lambda m: -w[m]) for s in ("opponent", "player") if R.verdict(A, m, s) != "EXACT" and R.verdict(B, m, s) == "EXACT"]
for m, s in new: print(row(m, s))
print(f"\n{len(new)} cells, +{pct(sum(w[m] for m, s in new))}")
print("\n### Newly NEEDS-KEYS (were NOT-OBSERVED)\n| move | side | weight | reasons |\n|---|---|---|---|")
for m in sorted(w, key=lambda m: -w[m]):
    for s in ("opponent", "player"):
        if R.verdict(A, m, s) == "NOT-OBSERVED" and R.verdict(B, m, s) == "NEEDS-KEYS":
            b = B["bodies"][f"{m}:{s}"]
            why = sorted({R.__dict__.get('x', x) for x in b["keysReasons"]}) or ["plan varies between scenarios"]
            print(f"| {m} {names[m]} | {s} | {pct(w[m])} | {'; '.join(why)} (n={b['scenarios']}) |")
print("\n### Still NOT-OBSERVED, top 20 by weight\n| move | side | weight | live id |\n|---|---|---|---|")
rem = [(m, s) for m in sorted(w, key=lambda m: -w[m]) for s in ("opponent", "player") if R.verdict(B, m, s) == "NOT-OBSERVED"]
for m, s in rem[:20]: print(f"| {m} {names[m]} | {s} | {pct(w[m])} | {m in B['liveIds']} |")
print(f"\n{len(rem)} cells remain, {pct(sum(w[m] for m, s in rem))}")
