#!/usr/bin/env python3
"""trn181: join trn181TraceFrames.ts output of the base tree and the final tree (compare:differential attribution).
usage: trn181TraceAttribution.py frames-head.json frames-base.json   [captureFrames.json]
Prints the first differing frame, the pause windows, and the time-shift check: head frame f == base frame f - (pause frames elapsed
before f). A scripted trace presses buttons at fixed frames, so after a shift an input can land on a different phase; the check reports
every shifted-equal run."""
import json, sys
h = {int(k): v for k, v in json.load(open(sys.argv[1])).items()}
b = {int(k): v for k, v in json.load(open(sys.argv[2])).items()}
fr = sorted(h)
first = next((f for f in fr if h[f][0] != b[f][0]), None)
pauses, cur = [], None
for f in fr:
    if h[f][1] and cur is None: cur = f
    if not h[f][1] and cur is not None: pauses.append((cur, f - cur)); cur = None
print("first differing frame:", first)
print("pauses:", len(pauses), "frames", sum(p[1] for p in pauses), "first", pauses[:6])
print("frames before the first pause identical:", all(h[f][0] == b[f][0] for f in fr if f < pauses[0][0]), "(first pause starts", pauses[0][0], ")")
shift = lambda f: sum(min(p[1], max(0, f - p[0])) for p in pauses)
eq = tot = 0; runs = []; run = None
for f in fr:
    g = f - shift(f)
    if g not in b: continue
    tot += 1
    ok = h[f][0] == b[g][0]
    eq += ok
    if ok and run is None: run = [f, f]
    elif ok: run[1] = f
    elif run is not None: runs.append(run); run = None
if run: runs.append(run)
print("shifted-equal frames:", eq, "of", tot, "; first shifted mismatch:", next((f for f in fr if (f - shift(f)) in b and h[f][0] != b[f - shift(f)][0]), None))
print("shifted-equal runs (head frames):", runs[:12], "count", len(runs))
if len(sys.argv) > 3:
    caps = json.load(open(sys.argv[3]))["captureFrames"]
    d = [c for c in caps if c in h and h[c][0] != b[c][0]]
    print("captures", len(caps), "differing", len(d), "of which in a pause window or after the first pause:", sum(1 for c in d if c >= pauses[0][0]))
