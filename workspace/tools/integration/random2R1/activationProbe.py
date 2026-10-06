#!/usr/bin/env python3
"""Random2 R1 live lane: activation frame/value of each Move_<X> body in direct-mGBA random2RouteProbe runs.

usage: activationProbe.py LABEL BODY_LABEL RUN1.json RUN2.json
Prints JSON {label, bodyLabel, runsSha1 (both), bodies: [{activationFrame, activationValue(Hex), plan, words}]}.
Uses prep12Plans.py's Probe (value reconstruction asserted against every run end value) and replay(); the two fresh runs
must agree on every per-frame field (finalStateSha1 excluded, prep12 papercut).
"""
import json
import sys
from pathlib import Path

# Copied verbatim from prep12Plans.py (lcg, Probe, replay): importing that module runs its CLI and writes its OUT_JSON.
def lcg(x: int) -> int:
    return (x * 1103515245 + 24691) & 0xFFFFFFFF


def lcgn(x: int, n: int) -> int:
    for _ in range(n):
        x = lcg(x)
    return x


class Probe:
    def __init__(self, path: Path):
        d = json.loads(path.read_text())
        self.d = d
        n = d["frames"]
        self.steps = [0] * (n + 2)
        self.ctx = [None] * (n + 2)
        for r in d["runs"]:
            for f in range(r["from"], r["to"] + 1):
                self.steps[f] = r["steps"]
                self.ctx[f] = r["ctx"]
        self.val = [d["anchorRng2"]] + [0] * n
        for f in range(1, n + 1):
            self.val[f] = lcgn(self.val[f - 1], self.steps[f])
        assert all(self.val[r["to"]] == r["endValue"] for r in d["runs"]), "value reconstruction"
        self.draws = {x["frame"]: x for x in d["singleSteppedNonTrivial"]}

    def label(self, f):
        return self.ctx[f][3].split("+")[0] if self.ctx[f][2] else None

    def bodies(self, base):
        """[(A, lastActive)] for each contiguous anim-active stretch whose first label is `base`."""
        out, f, n = [], 1, self.d["frames"]
        while f <= n:
            if self.ctx[f][2] and self.label(f) == base and not (f > 1 and self.ctx[f - 1][2] and self.label(f - 1) == base):
                g = f
                while g + 1 <= n and self.ctx[g + 1][2]:
                    g += 1
                out.append((f, g))
                f = g
            f += 1
        return out

    def plan(self, a, end):
        """draw groups in [a, end]: offset, lag frames in (a, D), draw count, ordered call sites"""
        groups = []
        for f in sorted(self.draws):
            if a <= f <= end:
                cs = self.draws[f]["callers"]
                rfu = 1 if cs[0].startswith("RfuMain1") else 0
                assert rfu == 1 and self.steps[f] == len(cs), (f, cs, self.steps[f])
                groups.append({"ageOffset": f - a, "lagBefore": sum(1 for g in range(a + 1, f) if self.steps[g] == 0),
                               "count": len(cs) - 1, "sites": [c for c in cs[1:]]})
        return groups


def replay(v_a: int, groups: list[dict]) -> list[list[int]]:
    """words per group from the activation value and the plan alone"""
    out, prior, nonlag_prev = [], 0, 0
    for g in groups:
        nonlag = (g["ageOffset"] - 0) - g["lagBefore"]  # frames a+1..D that step once (D itself is non-lag, RfuMain1 first)
        v = lcgn(v_a, nonlag + prior)
        ws = []
        for _ in range(g["count"]):
            v = lcg(v)
            ws.append(v >> 16)
        out.append(ws)
        prior += g["count"]
    return out



label, body_label, p1, p2 = sys.argv[1:5]
a, b = (json.loads(Path(p).read_text()) for p in (p1, p2))
diff = [k for k in a if a[k] != b[k]]
assert diff in ([], ["finalStateSha1"]), f"fresh runs differ: {diff}"
probe = Probe(Path(p1))
bodies = []
for start, end in probe.bodies(body_label):
    groups = probe.plan(start, end)
    v = probe.val[start]
    bodies.append({
        "activationFrame": start, "lastActiveFrame": end, "activationValue": v, "activationValueHex": f"0x{v:08X}",
        "plan": [{"ageOffset": g["ageOffset"], "count": g["count"], "lagBefore": g["lagBefore"]} for g in groups],
        "words": replay(v, groups),
    })
print(json.dumps({"label": label, "bodyLabel": body_label, "runsSha1": a["runsSha1"], "runsSha1Run2": b["runsSha1"],
                  "frames": a["frames"], "bodies": bodies}))
