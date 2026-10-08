#!/usr/bin/env python3
"""prep40: compact committed receipts from two complete prep40Run.sh passes (no RGB, no mGBA logs).
usage: prep40Compact.py <OUT1> <REC1> <OUT2> <REC2> <dest dir>
Writes <dest>/summary.json + summary.txt (pass 1; asserted byte-identical to pass 2) and manifest.json: per scenario the sha256/16 of
both fresh probe runs of both passes, per (mode, stem) the sha256/16 of the check receipt in both passes, and the plain-window timing
of the first visible change after the first inactive row (romChangesAfter)."""
import hashlib, json, sys, collections
from pathlib import Path
out1, rec1, out2, rec2, dest = map(Path, sys.argv[1:6])
dest.mkdir(parents=True, exist_ok=True)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()[:16]  # noqa: E731
stems = [l.split("\t")[0] for l in (Path(__file__).resolve().parent / "fixtures/prep40/scenarios/list.tsv").read_text().splitlines()]
probes = {s: {"pass1": [sha(out1 / f"{s}-r1.json"), sha(out1 / f"{s}-r2.json")], "pass2": [sha(out2 / f"{s}-r1.json"), sha(out2 / f"{s}-r2.json")]} for s in stems}
assert all(len({*v["pass1"], *v["pass2"]}) == 1 for v in probes.values()), "probe digests differ"
checks = {}
for mode in ("patched", "fallback", "drop164", "firstbody"):
    for s in stems:
        a, b = sha(rec1 / mode / f"{s}.json"), sha(rec2 / mode / f"{s}.json")
        assert a == b, (mode, s)
        checks[f"{mode}/{s}"] = a
for n in ("summary.json", "summary.txt"):
    assert (rec1 / n).read_bytes() == (rec2 / n).read_bytes(), n
    (dest / n).write_bytes((rec1 / n).read_bytes())
plain = collections.Counter()
for s in stems:
    for r in json.loads((rec1 / "patched" / f"{s}.json").read_text())["results"]:
        if r["kind"] == "plain" and r.get("romChangesAfter"):
            plain[json.dumps(r["romChangesAfter"])] += 1
(dest / "manifest.json").write_text(json.dumps({"schema": "prep40-manifest/v1", "probes": probes, "checkReceipts": checks,
    "plainWindowRomChangesAfter": dict(plain.most_common()),
    "note": "every probe: 2 fresh runs x 2 passes byte-identical; every check receipt byte-identical across passes"}, indent=1) + "\n")
print("compact receipts ->", dest, len(probes), "scenarios", len(checks), "check receipts")
