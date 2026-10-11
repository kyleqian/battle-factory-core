#!/usr/bin/env python3
"""flat84: the census identity gate + Flatter / 260-stop summary for flat84Census.sh's sharded run (<out>/{base,patched}/r0..r9.json +
.jsonl, hist73Merge.py's census-{base,patched}.json / .jsonl). Gates: command count, the command KEY sequence (battle, kind, moveId, side,
attacker, target), frames per command, every shard's battleDigest AND battleDigestExcludingFrames identical, 0 live -> non-live
regressions, 0 render throws. Then: gained commands / live frames, overall shares, the gained commands by move and by BEFORE decline,
the Flatter 260 commands before / after, and the order-host stops naming body 260 before / after.
usage: flat84CensusCheck.py <census-out-dir>   (exit 1 on any failed gate)
"""
import json, sys
from collections import Counter
from pathlib import Path

out = Path(sys.argv[1])
load = lambda p: [json.loads(l) for l in open(p) if l.strip()]
before, after = load(out / "census-base.jsonl"), load(out / "census-patched.jsonl")
mb, ma = json.loads((out / "census-base.json").read_text()), json.loads((out / "census-patched.json").read_text())
sb = [json.loads((out / "base" / f"r{k}.json").read_text()) for k in range(10)]
sa = [json.loads((out / "patched" / f"r{k}.json").read_text()) for k in range(10)]
key = lambda c: (c["battle"], c["kind"], c.get("moveId"), c["side"], c["attacker"], c["target"])
checks = {
    "same command count": len(before) == len(after),
    "same KEY sequence": [key(c) for c in before] == [key(c) for c in after],
    "same frames per command": [c["frames"] for c in before] == [c["frames"] for c in after],
    "same battleDigest (10 shards)": [r["battleDigest"] for r in sb] == [r["battleDigest"] for r in sa],
    "same battleDigestExcludingFrames (10 shards)": [r["battleDigestExcludingFrames"] for r in sb] == [r["battleDigestExcludingFrames"] for r in sa],
    "0 render throws": mb["renderThrows"] == 0 and ma["renderThrows"] == 0,
}
regressions = [(b["battle"], b.get("moveId"), b["side"]) for b, a in zip(before, after) if b["status"] == "live" and a["status"] != "live"]
checks["0 live -> non-live regressions"] = not regressions
for k, ok in checks.items():
    print(("PASS " if ok else "FAIL ") + k)
dec = lambda c: (c.get("decline") or {}).get("detail") or f'{(c.get("decline") or {}).get("stage", "?")}: {(c.get("decline") or {}).get("reason", "?")}'
gained = [(b, a) for b, a in zip(before, after) if a["status"] == "live" and b["status"] != "live"]
print(f'gained commands {len(gained)} / live frames {sum(a["liveFrames"] - b["liveFrames"] for b, a in zip(before, after))}; regressions {regressions[:10]}')
for name, m in (("before", mb), ("after", ma)):
    print(f'{name}: {json.dumps(m["overall"], sort_keys=True)}')
print(f'battleDigest {mb["battleDigest"][:16]}  commandKeyDigest {mb["commandKeyDigest"][:16]} / {ma["commandKeyDigest"][:16]}')
print("gained by move:", dict(sorted(Counter(b.get("moveId") for b, _ in gained).items(), key=lambda kv: (kv[0] is None, kv[0] or 0))))
gd = Counter(); gf = Counter()
for b, a in gained:
    gd[dec(b)] += 1; gf[dec(b)] += a["liveFrames"] - b["liveFrames"]
for k in sorted(gd, key=lambda k: (-gf[k], k)):
    print(f"  gained from BEFORE decline {k!r}: {gd[k]} / {gf[k]}")
for name, rows in (("before", before), ("after", after)):
    fl = [c for c in rows if c.get("moveId") == 260 and c["kind"] == "move-animation"]
    st = Counter(c["status"] for c in fl)
    print(f'Flatter 260 {name}: {len(fl)} commands, status {dict(st)}, live frames {sum(c["liveFrames"] for c in fl)} of {sum(c["frames"] for c in fl)}')
    d = Counter(); f = Counter()
    for c in fl:
        if c["status"] != "live":
            d[dec(c)] += 1; f[dec(c)] += c["frames"] - c["liveFrames"]
    for k in sorted(d, key=lambda k: (-f[k], k)):
        print(f"  Flatter {name} decline {k!r}: {d[k]} / {f[k]}")
    s = Counter(); sf = Counter()
    for c in rows:
        if c["status"] != "live" and "260" in dec(c):
            s[dec(c)] += 1; sf[dec(c)] += c["frames"] - c["liveFrames"]
    for k in sorted(s, key=lambda k: (-sf[k], k)):
        print(f"  stops naming 260 {name}: {k!r}: {s[k]} / {sf[k]}")
sys.exit(0 if all(checks.values()) else 1)
