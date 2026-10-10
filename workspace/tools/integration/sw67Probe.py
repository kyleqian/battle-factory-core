#!/usr/bin/env python3
"""sw67 direct-mGBA sSpriteOrder probes of the Shock Wave 351 prediction grid (docs/next-adapters-sw67.md; never the HTTP oracles).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): sw67Probe.py <out-dir> [--jobs J=12] [--predictions <predictions.json>]
The grid is fixtures/sw67/predictions.json (sw67Predict.ts, committed before these probes ran). Each job is plans48's Shock Wave scenario
of its side (the defender's lead knows only Mirror Coat, so Shock Wave is the first action) with the attacker's and the defender's lead
species replaced, each lead's gender set to one the species allows (species_info.h genderRatio: genderless / female-only / male-only;
otherwise unchanged), and the lab seed pinned (ISSUES #154). Every job runs twice in separate fresh mGBA processes within this one batch
(prep43Probe.run) -> raw/<id>-A.json / -B.json.
"""
import json, re, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Probe as P43

LAB = Path("tools/battle-lab")
BASE = {"player": "mechanic-shock-wave-player-flaaffy-opponent-corsola", "opponent": "mechanic-shock-wave-opponent-flaaffy-player-corsola"}
SEED = 305420351  # the base scenarios' own lab seed, pinned explicitly

SPECIES_ID = {m[0]: int(m[1]) for m in re.findall(r"#define (SPECIES_\w+) (\d+)", Path("reference/pokeemerald/include/constants/species.h").read_text())}
GENDER = {}
for name, body in re.findall(r"\[(SPECIES_\w+)\] =\s*\{(.*?)\n    \}", Path("reference/pokeemerald/src/data/pokemon/species_info.h").read_text(), re.S):
    ratio = re.search(r"\.genderRatio = (\w+(?:\([\d.]+\))?)", body)
    if ratio and name in SPECIES_ID:
        GENDER[SPECIES_ID[name]] = {"MON_GENDERLESS": "genderless", "MON_FEMALE": "female", "MON_MALE": "male"}.get(ratio.group(1))


def scenario(out: Path, job) -> Path:
    _, ident, _, base, row = job
    data = json.loads((LAB / f"{base}.json").read_text())
    data["seed"] = SEED
    for side in ("player", "opponent"):
        lead = data["overrides"]["parties"][side][0]
        lead["species"] = row[side]
        forced = GENDER.get(row[side])
        if forced is not None:
            lead["gender"] = forced
        elif lead["gender"] == "genderless":
            lead["gender"] = "male"
    target = out / "scenarios" / f"{ident}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    return target


P43.scenario = scenario  # prep43Probe.run resolves the scenario through its module global


def jobs(predictions: Path):
    rows = json.loads(predictions.read_text())["rows"]
    return [("BODY351", row["id"], 351, BASE[row["side"]], row) for row in rows]


if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    n = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 12
    predictions = Path(argv[argv.index("--predictions") + 1]) if "--predictions" in argv else Path("tools/integration/fixtures/sw67/predictions.json")
    selected = jobs(predictions)
    for job in selected:
        scenario(out, job)
    with ThreadPoolExecutor(n) as ex:
        results = list(ex.map(P43.run, [(out, j, r) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "probe runs;", "missing:", missing or "none")
