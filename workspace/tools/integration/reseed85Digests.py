#!/usr/bin/env python3
"""reseed85: per-shard battleDigest / battleDigestExcludingFrames / commandDigest of the hist73LiveShareCensus.ts shards (r0..r9.json), base
vs patched copy. The gameplay identity gate: battleDigestExcludingFrames equal in every shard (battles, outcomes, turns, commands without
presentation frames); battleDigest equal too when the presented frames per command are unchanged.
usage: reseed85Digests.py <base-shard-dir> <patched-shard-dir>
"""
import json, sys
from pathlib import Path

a, b = Path(sys.argv[1]), Path(sys.argv[2])
ok = True
for i in range(10):
    x, y = json.loads((a / f"r{i}.json").read_text()), json.loads((b / f"r{i}.json").read_text())
    same = {k: x[k] == y[k] for k in ("battleDigest", "battleDigestExcludingFrames")}
    ok = ok and all(same.values())
    print(f"shard {i}: battleDigestExcludingFrames {x['battleDigestExcludingFrames'][:16]} {'same' if same['battleDigestExcludingFrames'] else 'DIFF'}"
          f" | battleDigest {x['battleDigest'][:16]} {'same' if same['battleDigest'] else 'DIFF'}"
          f" | commandDigest {'same' if x['commandDigest'] == y['commandDigest'] else 'differs (live status)'}")
print("PASS battle digests (with and excluding frames) identical in all 10 shards" if ok else "FAIL battle digests differ")
