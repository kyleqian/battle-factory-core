#!/usr/bin/env python3
"""shp116 (docs/shp116-shadow-lead-and-shadow-punch-d4.md): build <out>/shp116-live-receipt.json from a shp116Run.sh output dir and
compare it, section by section, with the committed receipt (the census section only when the run had --census).
usage: shp116Receipt.py <run-out-dir> <committed-receipt.json>
"""
import glob, hashlib, json, os, re, sys
from pathlib import Path

out, committed = Path(sys.argv[1]), Path(sys.argv[2])
W = Path(__file__).resolve().parents[2]
F105, F103 = W / "tools/integration/fixtures/shadow105", W / "tools/integration/fixtures/sp103"
frames = lambda f: hashlib.sha256(json.dumps(json.load(open(f))["frames"], sort_keys=True).encode()).hexdigest()

def probes(d):
    res = {}
    for f in sorted(glob.glob(f"{d}/*-r1.json")):
        s = os.path.basename(f)[:-8]
        a, b = frames(f), frames(f"{d}/{s}-r2.json")
        res[s] = {"r1": a, "same": a == b}
    return res

p105, p103 = probes(out / "p105"), probes(out / "p103")
bank105 = json.load(open(F105 / "receipts/probe-sha256.json"))["sha256"]
bank103 = dict(reversed(l.split()) for l in open(F103 / "receipts/probe-sha256.txt") if l.strip())
rec = {"schema": "shp116-live-receipt/v1", "base": "681da5c10",
       "probes": {"shadow105": {"labs": len(p105), "r1EqR2": sum(v["same"] for v in p105.values()),
                                "equalToBanked": all(bank105.get(s, {}).get("framesR1") == v["r1"] for s, v in p105.items())},
                  "sp103": {"labs": len(p103), "r1EqR2": sum(v["same"] for v in p103.values()),
                            "equalToBanked": all(bank103.get(f"{s}-r1") == v["r1"] for s, v in p103.items())}}}

lead = {}
for k in ("shadow-punch", "bite", "sludge-bomb", "twineedle"):
    rows = []
    for line in open(out / f"lead/lead-{k}.log"):
        m = re.match(r"(\S+) body(\d+) .* leadPx (\S+) / (\S+) bodyPx (\S+) exact (\S+) bad ?(\S*)", line.strip())
        if m: rows.append({"stem": m[1], "body": int(m[2]), "leadPxR1": m[3], "leadPxR2": m[4], "bodyPx": m[5], "exact": m[6], "badAges": m[7]})
    lead[k] = {"sameAsShadow105PatchedReceipt": (out / f"lead/lead-{k}.json").read_bytes() == (F105 / f"receipts/lead-patched-{k}.json").read_bytes(),
               "bodies": rows}
rec["shadow105LeadWindows"] = lead

body = json.load(open(out / "body-sp103.json"))["results"]
bank = json.load(open(F103 / "receipts/body-patch.json"))["results"]
rows = []
for x, y in zip(body, bank):
    da, db = dict(x["badPx"]), dict(y["badPx"])
    rows.append({"stem": x["stem"], "body": x["body"], "romBodyRows": x["romBodyRows"], "px": x["px"], "identicalR1R2": x["identical"],
                 "badAges": ",".join(x["badAges"]),
                 "changedVsSp103Patched": {str(r): [db.get(r, 0), da.get(r, 0)] for r in sorted(set(da) | set(db)) if da.get(r, 0) != db.get(r, 0)}})
rec["sp103Bodies"] = rows
rec["routes"] = json.load(open(out / "route-check.json"))
rec["parity"] = {"base": json.loads((out / "parity-base.json").read_text()), "final": json.loads((out / "parity-final.json").read_text())}
if (out / "census-delta.json").exists():
    d = json.load(open(out / "census-delta.json"))
    head = lambda t: {k: json.load(open(out / f"census-{t}-merged.json"))[k] for k in ("overall",)}
    rec["census"] = {"delta": {k: v for k, v in d.items() if k != "mismatches"}, "base": head("base"), "final": head("final")}
(out / "shp116-live-receipt.json").write_text(json.dumps(rec, indent=1) + "\n")

if not committed.exists():
    print("NEW receipt (no committed receipt to compare)"); sys.exit(0)
ref = json.load(open(committed)); fail = 0
for k, v in rec.items():
    same = ref.get(k) == v
    print(("SAME " if same else "DIFF ") + k); fail |= not same
print("shp116Run: ALL SAME" if not fail else "shp116Run: DIFFERENCES"); sys.exit(1 if fail else 0)
