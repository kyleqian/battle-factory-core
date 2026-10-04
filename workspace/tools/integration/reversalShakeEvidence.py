#!/usr/bin/env python3
"""Run reversalShakeProbe.py twice fresh per orientation (target = Chansey Super-Fang HP halving),
write raw + tools/integration/fixtures/reversal-shake-evidence.json with source/reducer verdicts."""
from __future__ import annotations
import hashlib, json, os, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
FIX = HERE / "fixtures"
RAW = FIX / "reversal-shake-raw"
RAW.mkdir(exist_ok=True)
PY = os.environ.get("MGBA_PY", "/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python")
env = dict(os.environ, PYTHONPATH="/Users/kyle/Developer/pokebench/vendor/libmgba-py", REVERSAL_TARGET_SPECIES="113")
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()


def source_x2(power: int, age: int) -> int:
    a = min(16, max(1, power // 12))
    if age < 155 or age > 168: return 0
    k = (age - 155) // 2
    return -(-a // 2) if k % 2 == 0 else -(a // 2)   # +ceil(A/2) / -floor(A/2)


def reducer_x2(power: int, age: int) -> int:
    a = min(16, max(1, power // 12))
    if age < 155 or age > 168: return 0
    return a if ((age - 155) // 2) % 2 == 0 else 0


rows, hashes = [], {}
for run in (1, 2):
    for orient in ("player", "opponent"):
        out = RAW / f"{orient}-run{run}.json"
        subprocess.run(f"{PY} {HERE}/reversalShakeProbe.py {orient} 7 {out} 2>&1 | tail -c 400 >/dev/null; test -s {out}", shell=True, env=env, check=True)  # mGBA logs segfault when stdout is /dev/null
        hashes.setdefault(orient, []).append(sha(out))
        d = json.loads(out.read_text())
        for b in d["bodies"]:
            obs = {a: x for a, x, y in b["x2"]}
            ys = {y for _, _, y in b["x2"]}
            ages = range(-1, max(obs) + 1)
            src = all(obs.get(a, 0) == source_x2(b["power"], a) for a in ages)
            red = all(obs.get(a, 0) == reducer_x2(b["power"], a) for a in ages)
            rows.append({"orientation": orient, "run": run, "activation": b["activation"], "power": b["power"], "dmg": b["dmg"],
                         "hp": b["hpAtActivation"], "A_power": min(16, max(1, b["power"] // 12)), "A_dmg": min(16, max(1, b["dmg"] // 12)),
                         "firstInactiveOffset": b["firstInactive"] - b["activation"], "yAlwaysZero": ys == {0},
                         "x2Sequence155to168": [obs.get(a, 0) for a in range(155, 169)],
                         "nonzeroX2Window": b["nonzeroX2Frames"] and [b["nonzeroX2Frames"][0] - b["activation"], b["nonzeroX2Frames"][1] - b["activation"]],
                         "matchesSourceFormula": src, "matchesAcceptedReducer": red})
ident = all(h[0] == h[1] for h in hashes.values())
ev = {"schema": "reversal-shake-evidence/v1", "oracleProfile": "battle-scene-on (Scene OFF skips move animations)",
      "probe": "tools/integration/reversalShakeProbe.py", "scenarioBase": "tools/battle-lab/mechanic-reversal-hp-bands-off.json",
      "staging": "Yanma(Reversal) vs Chansey(Super Fang x1 slot): Super Fang halves the user's real HP each turn; no HP injection",
      "romSha256": sha(HERE.parents[1] / "reference/pokeemerald/pokeemerald.gba"),
      "probeSha256": sha(HERE / "reversalShakeProbe.py"),
      "rawSha256": {k: v for k, v in sorted(((p.name, sha(p)) for p in RAW.glob("*.json")))},
      "freshRunsIdentical": ident, "rows": rows}
(FIX / "reversal-shake-evidence.json").write_text(json.dumps(ev, indent=1) + "\n")
for r in rows:
    if r["run"] == 1: print(r["orientation"], r["power"], r["dmg"], r["x2Sequence155to168"], r["matchesSourceFormula"], r["matchesAcceptedReducer"], r["firstInactiveOffset"])
print("identical", ident)
