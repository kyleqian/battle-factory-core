#!/usr/bin/env python3
"""Live audit 21: LATER defender-doll bodies. prep38Fixtures.py (via audit21DollDefFixtures.py's redirect) with one change: every move-X
body whose defender is shown as a doll at the activation edge is a window (kind test<k>, k = 1, 2, ...: the doll's 2nd hit, the hit that
BREAKS it (General_SubstituteFade follows), and a re-subbed doll's hit (any doll tiles)), not only the first. kind test1 == prep38's test.
usage: audit21DollLater.py <probe dir> <out dir>   -> <out dir>/<stem>-test<k>.json"""
import sys, tempfile
from pathlib import Path
HERE = Path(__file__).resolve().parent
PROBES, OUT = sys.argv[1], sys.argv[2]
rows = [l.rstrip("\n").split("\t") for l in open(HERE / "fixtures/audit-21/doll/scenarios/list.tsv")]
lst = Path(tempfile.mkdtemp()) / "list.tsv"
lst.write_text("".join("\t".join(r[:6]) + "\n" for r in rows if r[6] == "def"))
src = (HERE / "prep38Fixtures.py").read_text().replace('"tools/integration/fixtures/prep38/scenarios"', '"tools/integration/fixtures/audit-21/doll/scenarios"')
old = '''    picks = {"control": next(((i, b) for i, b in ours if not b["prev"][dfn_b]["doll"]), None),
             "test": next(((i, b) for i, b in ours if b["prev"][dfn_b]["doll"] and b["prev"][dfn_b]["tiles"] == doll_tiles), None)}'''
new = '''    picks = {f"test{k + 1}": p for k, p in enumerate((i, b) for i, b in ours if b["prev"][dfn_b]["doll"])}'''
assert src.count(old) == 1 and src.count('"defenderDoll": kind == "test",') == 1
src = src.replace(old, new).replace('"defenderDoll": kind == "test",', '"defenderDoll": kind.startswith("test"),')
sys.argv = [str(HERE / "prep38Fixtures.py"), PROBES, OUT, str(lst)]
exec(compile(src, str(HERE / "prep38Fixtures.py"), "exec"), {"__name__": "__main__", "__file__": str(HERE / "prep38Fixtures.py")})
