#!/usr/bin/env python3
"""doll81 census check: prep43CensusDelta.py (base vs patched, seeds 0..999) plus the gates the fold needs:
- the command KEY sequence (battle, kind, moveId, side, attacker, target) and battleDigestExcludingFrames are identical, EXCEPT where a
  battle STALLED in both runs (liveShareCensus.ts FRAME_BUDGET 200000 reached, battles.stalls): presentation-only changes move a stalled
  battle's frame-budget cutoff (live bodies are longer than the 32-frame duration fallback), so its tail of commands / turn count may be
  shorter. Those tails are reported and dropped from the pairing (prep43CensusDelta.py needs equal lengths). The census report does
  not export per-battle records, so battleDigestExcludingFrames (which holds `turns`) is printed as is;
- live -> non-live regressions (0 required);
- per (move, side): commands / presented frames that became live; the Substitute-doll declines (reason containing "doll") before / after.
usage: doll81CensusCheck.py <base.json> <base.jsonl> <patched.json> <patched.jsonl> <delta.json>   -> stdout (+ delta.json, + the
       paired .jsonl copies next to delta.json)"""
import json, subprocess, sys
from collections import Counter
from pathlib import Path
bj, bl, aj, al, out = sys.argv[1:6]
load = lambda p: [json.loads(l) for l in open(p) if l.strip()]  # noqa: E731
before, after = load(bl), load(al)
rb, ra = json.load(open(bj)), json.load(open(aj))
key = lambda c: tuple(c.get(k) for k in ("battle", "kind", "moveId", "side", "attacker", "target"))  # noqa: E731
stalled = lambda r: {(s["seed"], s["streak"]) for s in r["battles"]["stalls"]}  # noqa: E731
both = stalled(rb) & stalled(ra)
# battle index i -> (seed, streak) = (from + i * seedStep, (i * streakMul) % 49) (liveShareCensus.ts)
cfg = rb["config"]; frm = int(cfg["seeds"].split("..")[0])
idx_stalled = {i for i in {c["battle"] for c in before} if (frm + i * cfg["seedStep"], (i * cfg["streakMul"]) % 49) in both}
def split(xs):
    by = {}
    for c in xs: by.setdefault(c["battle"], []).append(c)
    return by
bb, ba = split(before), split(after)
pb, pa, tails = [], [], []
for i in sorted(set(bb) | set(ba)):
    x, y = bb.get(i, []), ba.get(i, [])
    n = min(len(x), len(y))
    if len(x) != len(y):
        if i not in idx_stalled: raise SystemExit(f"battle {i}: command counts differ ({len(x)} vs {len(y)}) and it did not stall in both runs")
        tails.append({"battle": i, "baseCommands": len(x), "patchedCommands": len(y), "droppedTail": [key(c) for c in (x if len(x) > n else y)[n:]]})
    pb += x[:n]; pa += y[:n]
p = Path(out).with_suffix("")
for name, xs in (("base", pb), ("patched", pa)):
    Path(f"{p}-{name}-paired.jsonl").write_text("".join(json.dumps(c, separators=(",", ":")) + "\n" for c in xs))
print(subprocess.run([sys.executable, str(Path(__file__).with_name("prep43CensusDelta.py")), bj, f"{p}-base-paired.jsonl", aj,
                      f"{p}-patched-paired.jsonl", out], check=True, capture_output=True, text=True).stdout.splitlines()[1])
print("stalled in both runs:", sorted(both), "| truncated tails:", [(t["battle"], t["baseCommands"], t["patchedCommands"], t["droppedTail"]) for t in tails])
print("command keys identical (outside stalled tails)", [key(c) for c in pb] == [key(c) for c in pa],
      "| battleDigestExcludingFrames identical", rb["battleDigestExcludingFrames"] == ra["battleDigestExcludingFrames"],
      "| battles played / terminal / stalled", (rb["battles"]["played"], rb["battles"]["terminal"], rb["battles"]["stalled"]),
      "==", (ra["battles"]["played"], ra["battles"]["terminal"], ra["battles"]["stalled"]),
      "| live -> non-live", sum(b["status"] == "live" and a["status"] != "live" for b, a in zip(pb, pa)))
reason = lambda c: (c.get("decline") or {}).get("reason", "")  # noqa: E731
gained, doll_b, doll_a = Counter(), Counter(), Counter()
for b, a in zip(pb, pa):
    k = (b.get("moveId"), b["side"])
    if a["liveFrames"] > b["liveFrames"]:
        gained[k + ("commands",)] += 1; gained[k + ("frames",)] += a["liveFrames"] - b["liveFrames"]
for xs, ctr in ((before, doll_b), (after, doll_a)):
    for c in xs:
        if "doll" in reason(c):
            ctr[((c.get("moveId"), c["side"]), reason(c))] += 1; ctr["frames"] += c["frames"] - c["liveFrames"]; ctr["commands"] += 1
print(f"Substitute-doll declines (all commands): {doll_b['commands']} commands / {doll_b['frames']} frames -> {doll_a['commands']} / {doll_a['frames']}")
print("newly live (move, side): commands / live frames gained")
for (m, s) in sorted({x[:2] for x in gained}, key=lambda x: (-gained[x + ("frames",)], x)):
    print(f"  {m} {s}: {gained[(m, s, 'commands')]} / {gained[(m, s, 'frames')]}")
print("remaining doll declines (move, side, reason) >= 3:")
for (k, r), n in sorted(((k, n) for k, n in doll_a.items() if isinstance(k, tuple)), key=lambda kv: (-kv[1], kv[0])):
    if n >= 3: print(f"  {k[0]} {k[1]} {n}  {r}")
