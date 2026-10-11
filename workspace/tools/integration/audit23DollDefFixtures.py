#!/usr/bin/env python3
"""Live audit 23: doll81DefFixtures.py (prep38Fixtures.py unchanged: CONTROL = the first move-X body on the mon, TEST = the first move-X body
on the displayed doll) with the scenario dir and its list.tsv given (audit23DollStage.py's), not doll81's.
usage: audit23DollDefFixtures.py <scenario dir> <probe dir> <out dir> [stem ...]   -> <out dir>/<stem>-{control,test}.json"""
import sys, tempfile
from pathlib import Path
HERE = Path(__file__).resolve().parent
SC, PROBES, OUT, only = sys.argv[1], sys.argv[2], sys.argv[3], set(sys.argv[4:])
rows = [l.rstrip("\n").split("\t") for l in open(Path(SC) / "list.tsv")]
lst = Path(tempfile.mkdtemp()) / "list.tsv"
lst.write_text("".join("\t".join(r[:6]) + "\n" for r in rows if r[6] == "def" and (not only or r[0] in only)))
src = (HERE / "prep38Fixtures.py").read_text().replace('"tools/integration/fixtures/prep38/scenarios"', repr(SC).replace("'", '"'))
sys.argv = [str(HERE / "prep38Fixtures.py"), PROBES, OUT, str(lst)]
exec(compile(src, str(HERE / "prep38Fixtures.py"), "exec"), {"__name__": "__main__", "__file__": str(HERE / "prep38Fixtures.py")})
