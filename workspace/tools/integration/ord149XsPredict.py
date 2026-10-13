#!/usr/bin/env python3
"""ord149 B1: the later-body residual rows of a player attacker's Extrasensory (opponent SHUCKLE-class target) predicted from the ROM split.
Renderer split R per write row: lines <= 28 at stage index 2, data[1] 4 (src/animation/extrasensory.ts splitScanout: the post-increment
data[1] === 5), else none. ROM split S per write row (ord149XsLineProbe.py). A row differs on screen when the lines between R and S
reach the target's first visible monbg line V = 27 (prep30 s1.4: SHUCKLE exact at every S <= 26), stage-start rows excluded (data[1] 0:
the previous word is the stop state). Compared with scan93's gate-lifted (patch B) residual row counts (fixtures/scan93/check-B.json
`affectedAges` (n)); qa-0 / qa-1 also carry patch B's 16 player-later lag rows 143..158 (their measured lag is `no-event`).
usage: ord149XsPredict.py <out.json> <probe-dir>"""
import json, sys
from pathlib import Path

V = 27
PROBE = {"xs-pla-nuzleaf-shuckle-xs": "xs-pla-xs-A", "xs-pla-nuzleaf-shuckle-qa": "xs-pla-qa-A"}
check = json.loads(Path("tools/integration/fixtures/scan93/check-B.json").read_text())["rows"]


def bodies(name):
    rows = [r for r in json.loads((Path(sys.argv[2]) / f"{name}.json").read_text())["rows"] if r[1] == 0 and isinstance(r[7], list)]
    out, prev = [], None
    for r in rows:
        if prev is None or r[0] - prev > 5:
            out.append([])
        prev = r[0]; out[-1].append(r)
    return out


def predicted(body):
    rows, stage = [], -1
    for r in body:
        stage += r[2] == 0
        s = max(r[7]) if r[7] else r[3] - 1
        rr = 28 if stage == 2 and r[2] == 4 else r[3] - 1
        if r[2] != 0 and max(rr, s) >= V and rr != s:
            rows.append({"traceFrame": r[0], "stage": stage, "data1": r[2], "romSplit": s, "rendererSplit": rr})
    return rows


out = {"schema": "ord149-xs-predict/v1", "visibleLine": V, "windows": []}
for name in PROBE.values():
    for b in bodies(name):
        win = next((c for c in check if c["move"] == "EXTRASENSORY" and c["side"] == "player" and c["fixture"].startswith(
            next(k for k, v in PROBE.items() if v == name)) and c["window"][0] <= b[0][0] <= c["window"][1]), None)
        rows = predicted(b)
        lag = 16 if win is not None and win["timing"]["measured"]["optional-lag-age"] == "no-event" else 0
        observed = None if win is None else int(win["affectedAges"].split("(")[1].rstrip(")"))
        # a write row displays one row later (extrasensory.ts displayedAge = age - 1): its displayed age is traceFrame - window[0] + 1
        ages = [] if win is None else [r["traceFrame"] - win["window"][0] + 1 for r in rows]
        span = None if win is None else list(map(int, win["affectedAges"].split(" ")[0].split("..")))
        out["windows"].append({"probe": name, "firstWriteFrame": b[0][0], "fixture": None if win is None else win["fixture"],
                               "displayedAges": ages, "scan93Span": span,
                               "agesInSpan": span is None or (all(span[0] <= a <= span[1] for a in ages) and (lag > 0 or ages[0] == span[0] and ages[-1] == span[1])),
                               "predictedSplitRows": len(rows), "lagRows": lag, "scan93AffectedRows": observed,
                               "same": observed is None and len(rows) == 0 or observed == len(rows) + lag, "rows": rows})
for w in out["windows"]:
    print(f"{w['probe']} @{w['firstWriteFrame']} {w['fixture'] or '(first body: accepted 0 px)'}: predicted {w['predictedSplitRows']} split + {w['lagRows']} lag"
          f" vs scan93 {w['scan93AffectedRows']} -> {'same' if w['same'] else 'DIFF'}; displayed ages {w['displayedAges']} in span {w['scan93Span']}: {w['agesInSpan']}")
Path(sys.argv[1]).write_text(json.dumps(out, indent=1) + "\n")
