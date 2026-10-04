#!/usr/bin/env python3
"""Single-run sweep of every other audited manifest/NEEDS scenario (221) into <dir> (default /tmp/ev-extra); not committed.
usage (from workspace/, mGBA venv): spriteOrderEventExtraBatch.py [dir]   then   spriteOrderEventModel.py --write --extra <dir>
"""
import subprocess,sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
ROOT=Path.cwd(); sys.path.insert(0,'tools/integration')
import spriteOrderBatch as B, spriteOrderEventBatch as E
done={s for _,s in E.JOBS}
jobs=[j for j in B.jobs() if j[1] not in done]
OUT=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/ev-extra'); OUT.mkdir(exist_ok=True)
def run(j):
    mid,sc=j
    subprocess.run([sys.executable,'tools/compare/spriteOrderEventProbe.py',mid,sc,str(OUT)+f'/{mid}-{Path(sc).stem}-0.json'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
with ThreadPoolExecutor(4) as ex: list(ex.map(run,jobs))
print(len(jobs))
