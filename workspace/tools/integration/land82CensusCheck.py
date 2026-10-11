#!/usr/bin/env python3
"""land82: doll81CensusCheck.py over hist73Merge.py output. The merged report lacks `config` and `battles.stalls`; this wrapper
restores them (plus the per-shard battleDigestExcludingFrames list) from the shard reports (battles.stalls union; config = the first shard's with seeds 0..999) and runs the doll81 check.
usage: land82CensusCheck.py <base-shard-dir> <base.json> <base.jsonl> <final-shard-dir> <final.json> <final.jsonl> <delta.json>"""
import glob, json, subprocess, sys
from pathlib import Path
bdir, bj, bl, adir, aj, al, out = sys.argv[1:8]
def augment(shards, merged):
    parts = [json.load(open(f)) for f in sorted(glob.glob(f"{shards}/r*.json"))]
    m = json.load(open(merged))
    m["config"] = {**parts[0]["config"], "seeds": "0..999"}
    m["battles"]["stalls"] = [s for p in parts for s in p["battles"].get("stalls", [])]
    m["battleDigestExcludingFrames"] = [p["battleDigestExcludingFrames"] for p in parts]  # per shard: the shard-8 entry holds seed 881's turns
    path = Path(out).with_name(Path(merged).stem + "-augmented.json")
    path.write_text(json.dumps(m))
    return str(path)
print(subprocess.run([sys.executable, str(Path(__file__).with_name("doll81CensusCheck.py")), augment(bdir, bj), bl, augment(adir, aj), al, out],
                     check=True, capture_output=True, text=True).stdout, end="")
