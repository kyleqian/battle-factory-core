#!/usr/bin/env python3
"""aud129 (docs/aud129-live-audit-27.md): one line per rendered window of <check-dir>/check-*.json (audit21Check.ts output): fixture, move,
attacker side, the order host's body class (first = chain.firstBody), the move's use in the battle (use1 = its first body, use2+ = later), ROM body rows (the probe body: activation .. first inactive frame),
rendered rows, px, residual rows as runs (age ranges), and a verdict:
  OK     0 px on every row;
  PHASE  a CPU-phase class (D4): the residual rows are exactly one of the move's measured one-frame phases (PHASES below: BG-write row,
         restore-fade rows, or every row from the shifted age on) and nothing else;
  OTHER  anything else (a defect candidate).
Then per (move, use) the ROM body-row tally. PHASES (source: docs/aud129-live-audit-27.md s1 / s2):
  MEGA_PUNCH  changebg BG_IMPACT_* write row 71 (SetImpactBackground's LoadMoveBg) and the restorebg fade rows 141..156 (Task_FadeToBg
              -> LoadDefaultBg lag absent: ROM body 159 rows);
  CRUNCH      the restorebg fade rows 123..138 (a13fix's lag at 121 absent: ROM body 141 rows);
  SMOKESCREEN every residual row is >= 49 and rows 0..48 are exact (the black-smoke flicker / drift one frame early: ROM body 124 rows;
              audit21Check.ts lists at most 40 residual rows, so the rule reads exactRows).
usage: aud129Phase.py <check-dir> <fixture-dir>   (the fixture dir the check rendered: the ROM body is bodyStart..bodyEnd)"""
import json, re, sys
from collections import Counter
from pathlib import Path

PHASES = {"MEGA_PUNCH": [set([71]), set(range(141, 157)), set([71]) | set(range(141, 157))],
          "CRUNCH": [set(range(123, 139))], "SMOKESCREEN": None}


def runs(ages):
    out, start, prev = [], None, None
    for a in ages:
        if start is None:
            start = prev = a
        elif a == prev + 1:
            prev = a
        else:
            out.append((start, prev)); start = prev = a
    if start is not None:
        out.append((start, prev))
    return ",".join(f"{a}" if a == b else f"{a}..{b}" for a, b in out) or "-"


tally, verdicts = Counter(), Counter()
for p in sorted(Path(sys.argv[1]).glob("check-*.json")):
    rows = sorted(json.loads(p.read_text())["rows"], key=lambda r: int(re.search(r"-c(\d+)\.json$", r["fixture"]).group(1)))
    uses = Counter()
    for r in rows:
        uses[r["move"]] += 1
        use = "use1" if uses[r["move"]] == 1 else "use2+"
        c, w = r["chain"], r["window"]
        dw = json.loads((Path(sys.argv[2]) / Path(r["fixture"]).name).read_text())["denseWindow"]
        body_rows = dw.get("bodyEndFrame", dw["endFrame"]) - dw.get("bodyStartFrame", dw["startFrame"]) + 1
        ages = [a for a, _ in c["residualRows"]]
        res = set(ages)
        if c["px"] == 0:
            v = "OK"
        elif r["move"] == "SMOKESCREEN" and min(res) == 49 and c["exactRows"] >= 49:
            v = "PHASE"
        elif r["move"] in PHASES and PHASES[r["move"]] and res in PHASES[r["move"]]:
            v = "PHASE"
        else:
            v = "OTHER"
        cls = "first" if c.get("firstBody") else "later"
        name = Path(r["fixture"]).name.replace(".json", "")
        print(f"{name:<40} {r['move']:<11} {r['side']:<8} {cls:<5} {use:<5} romBody={body_rows:<3} rows={c['rows']:<3} px={c['px']:<7} "
              f"residual={runs(ages)} {v}")
        tally[r["move"], use, body_rows] += 1
        verdicts[v] += 1
for (m, use, n), k in sorted(tally.items()):
    print(f"TALLY {m:<11} {use:<5} romBody={n:<3} windows={k}")
print("VERDICTS " + " ".join(f"{k}={verdicts[k]}" for k in ("OK", "PHASE", "OTHER")))
