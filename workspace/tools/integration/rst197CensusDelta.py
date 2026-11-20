#!/usr/bin/env python3
"""rst197 census delta: lsd194Census output of two trees that BOTH carry the lsd194 drain (no inserted commands).
Per battle: digest + error equal, same command count/types; changed commands histogrammed by (type, prev type, next type, changed fields, moveText).

usage: rst197CensusDelta.py [--digest] <base-arm> <final-arm>      (arm = a tools/integration/lsd194Census.sh arm dir holding r0..r9.jsonl)
  --digest (cln10): ONE line instead of the histogram: seeds compared, eventsDigest identical n/N, errors identical, commands equal / changed battles, byte-identical shards k/n
  (the comparison the lsd194 / hcr1c / fsc1 steps wrote by hand). Exits 1 when any digest/error differs or a shard is missing.
  Works for any two census arms of the same scene; -h / --help prints this."""
import glob, json, os, sys
from collections import Counter, defaultdict
if "-h" in sys.argv or "--help" in sys.argv:
    raise SystemExit(__doc__)
DIGEST = "--digest" in sys.argv
b_dir, f_dir = [a for a in sys.argv[1:] if a != "--digest"][:2]
load = lambda p: {r["seed"]: r for r in map(json.loads, filter(None, open(p).read().split("\n")))}
res = Counter(); classes = defaultdict(lambda: {"n": 0, "frames": 0, "deltas": Counter(), "examples": []}); bad = []
missing = []
for bp in sorted(glob.glob(os.path.join(b_dir, "r[0-9].jsonl"))):
    if not os.path.exists(os.path.join(f_dir, os.path.basename(bp))):
        missing.append(os.path.basename(bp)); continue
    B, F = load(bp), load(os.path.join(f_dir, os.path.basename(bp)))
    for s in sorted(B):
        b, f = B[s], F[s]; res["battles"] += 1
        if b["eventsDigest"] != f["eventsDigest"] or b["error"] != f["error"]:
            bad.append({"seed": s, "kind": "digest/error", "b": [b["eventsDigest"], b["error"]], "f": [f["eventsDigest"], f["error"]]}); continue
        bc, fc = b["commands"], f["commands"]
        if [c[0] for c in bc] != [c[0] for c in fc]:
            bad.append({"seed": s, "kind": "typeSequence"}); continue
        changed = False
        for i, (x, y) in enumerate(zip(bc, fc)):
            res["commands"] += 1
            if x == y: continue
            changed = True
            fields = tuple(k for k in range(len(x)) if x[k] != y[k])
            key = (x[0], bc[i-1][0] if i else None, bc[i+1][0] if i + 1 < len(bc) else None, fields, x[10])
            c = classes[key]; c["n"] += 1; d = (y[18] or 0) - (x[18] or 0); c["frames"] += d; c["deltas"][(x[2], y[2], d)] += 1
            if len(c["examples"]) < 3: c["examples"].append(s)
        res["changedBattles" if changed else "identicalBattles"] += 1
if DIGEST:
    shards = sorted(glob.glob(os.path.join(b_dir, "r[0-9].jsonl")))
    same = sum(1 for bp in shards if os.path.exists(os.path.join(f_dir, os.path.basename(bp)))
               and open(bp, "rb").read() == open(os.path.join(f_dir, os.path.basename(bp)), "rb").read())
    digest_bad = sum(1 for x in bad if x["kind"] == "digest/error")
    n = res["battles"]
    print(f"eventsDigest+error identical {n - digest_bad}/{n}, type-sequence changes {sum(1 for x in bad if x['kind'] == 'typeSequence')}, "
          f"commands: {res['identicalBattles']} battles identical / {res['changedBattles']} changed ({res['commands']} commands), byte-identical shards {same}/{len(shards)}"
          + ("" if not missing else f", MISSING shards {missing}"))
    raise SystemExit(1 if (bad or missing) else 0)
print(json.dumps(dict(res)))
print("bad", len(bad), json.dumps(bad[:10]))
for k, v in sorted(classes.items(), key=lambda kv: -kv[1]["n"]):
    print(v["n"], v["frames"], k, dict(v["deltas"]), "seeds", v["examples"])
