#!/usr/bin/env python3
"""doll81 `def` family: prep38Fixtures.py (CONTROL = first move-X body on the mon, TEST = first move-X body on the displayed doll) run
unchanged on the doll81 scenarios. prep38Fixtures.py reads each stem's scenario from the prep38 scenario dir; this wrapper redirects that
one path to tools/integration/fixtures/doll81/scenarios and feeds it the 6-column rows of the `def` stems.
usage: doll81DefFixtures.py <probe dir> <out dir> [stem ...]   -> <out dir>/<stem>-{control,test}.json"""
import sys, tempfile
from pathlib import Path
HERE = Path(__file__).resolve().parent
PROBES, OUT, only = sys.argv[1], sys.argv[2], set(sys.argv[3:])
rows = [l.rstrip("\n").split("\t") for l in open(HERE / "fixtures/doll81/scenarios/list.tsv")]
lst = Path(tempfile.mkdtemp()) / "list.tsv"
lst.write_text("".join("\t".join(r[:6]) + "\n" for r in rows if r[6] == "def" and (not only or r[0] in only)))
src = (HERE / "prep38Fixtures.py").read_text().replace('"tools/integration/fixtures/prep38/scenarios"', '"tools/integration/fixtures/doll81/scenarios"')
sys.argv = [str(HERE / "prep38Fixtures.py"), PROBES, OUT, str(lst)]
exec(compile(src, str(HERE / "prep38Fixtures.py"), "exec"), {"__name__": "__main__", "__file__": str(HERE / "prep38Fixtures.py")})
