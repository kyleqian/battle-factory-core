#!/usr/bin/env python3
"""prep46: Random2 words the ROM drew in each animation body, read from RAM (prep46OrderRngProbe.py `rng2`, gRng2Value after every frame).

usage (from workspace/): prep46Words.py <out-dir> <words.json>
Per frame f the step count s(f) = the ISO_RANDOMIZE1 steps from gRng2Value(f-1) to gRng2Value(f) (searched up to 4096). The per-frame law
(docs/random2-trackability.md s1): RfuMain1 draws first in a non-lag frame, then the animation draws in source order, so a frame with
s > 1 drew s - 1 animation words = the upper halves of LCG^2..LCG^s(gRng2Value(f-1)). Bodies are gAnimScriptActive intervals (rising
edge = age 0, as prep43Extract / the production presentation host). Per body: activation value (gRng2Value at age 0, the host's
`activationValue`), lag ages (s = 0), draw rows [age, words...]. Runs A and B must be byte-identical files.
"""
import hashlib, json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep46Probe as J

M = 0xFFFFFFFF


def lcg(v):
    return (1103515245 * v + 24691) & M


def steps(a, b, limit=4096):
    v = a
    for k in range(limit + 1):
        if v == b:
            return k
        v = lcg(v)
    return None


def frames_of(raw):
    """per-frame (n, act, mv, rng) expanded from the compact rows (a row holds until the next one)."""
    rng = [int(raw["rng2"][i:i + 8], 16) for i in range(0, len(raw["rng2"]), 8)]
    first = raw["firstFrame"]
    rows = raw["rows"]
    out, r = [], 0
    for i, value in enumerate(rng):
        n = first + i
        while r + 1 < len(rows) and rows[r + 1][0] <= n:
            r += 1
        out.append((n, rows[r][4], rows[r][5], value))
    return out


def bodies(raw):
    fr = frames_of(raw)
    st = [None] + [steps(fr[i - 1][3], fr[i][3]) for i in range(1, len(fr))]
    out = []
    i = 0
    while i < len(fr):
        if fr[i][1] and (i == 0 or not fr[i - 1][1]):
            j = i
            while j < len(fr) and fr[j][1]:
                j += 1
            draws, lag = [], []
            for k in range(i, j):
                s = st[k]
                if s == 0:
                    lag.append(k - i)
                elif s is not None and s > 1:
                    v, ws = lcg(fr[k - 1][3]), []
                    for _ in range(s - 1):
                        v = lcg(v)
                        ws.append(v >> 16)
                    draws.append([k - i] + ws)
            out.append({"frame": fr[i][0], "mv": fr[i][2], "length": j - i, "activationValue": fr[i][3], "lagAges": lag,
                        "unresolvedAges": [k - i for k in range(i, j) if st[k] is None], "draws": draws})
            i = j
        else:
            i += 1
    return out


if __name__ == "__main__":
    out = Path(sys.argv[1])
    result = {"schema": "prep46-words/v1", "jobs": {}}
    for unit, ident, move, base, variant in J.JOBS:
        a, b = out / "raw" / f"{ident}-A.json", out / "raw" / f"{ident}-B.json"
        if not a.exists():
            continue
        raw = json.loads(a.read_text())
        result["jobs"][ident] = {"unit": unit, "move": move, "base": base, "variant": variant,
                                 "identicalAB": b.exists() and a.read_bytes() == b.read_bytes(),
                                 "rawSha256A": hashlib.sha256(a.read_bytes()).hexdigest(), "bodies": bodies(raw)}
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    for ident, job in result["jobs"].items():
        print(ident, "A==B" if job["identicalAB"] else "A!=B",
              " ".join(f"{b['mv']}@{b['frame']}+{b['length']}:draws{[d[0] for d in b['draws']]}/{sum(len(d) - 1 for d in b['draws'])}w lag{b['lagAges']}" for b in job["bodies"]))
