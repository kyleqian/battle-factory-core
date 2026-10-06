#!/usr/bin/env python3
"""speciesAudit3 stage: swap the TARGET-side party[0] species (any original species) of accepted fixtures' scenarios.
usage: speciesAudit3Stage.py --species GOLBAT --id 42 --ev 0 --tag golbat --out DIR fixture.json...
Writes DIR/scenarios/<tag>-<stem>.json (swapped lab scenario) and prints rows: stem \t orig fixture \t swapped scenario \t target side."""
import json, sys, os, argparse
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
ap = argparse.ArgumentParser(); ap.add_argument("--species"); ap.add_argument("--id", type=int); ap.add_argument("--ev", type=int, default=0)
ap.add_argument("--tag"); ap.add_argument("--out"); ap.add_argument("--side", default=None); ap.add_argument("fixtures", nargs="+")
a = ap.parse_args()
os.makedirs(f"{a.out}/scenarios", exist_ok=True)
for fp in a.fixtures:
    src = json.load(open(fp))
    if src.get("sourceFixture"): src = {**json.load(open(f"{ROOT}/{src['sourceFixture']}")), **src}
    tside = src["target"]["geometry"]["side"]
    if a.side and tside != a.side: continue
    if src["target"]["species"] == a.species: print("skip-same", fp, file=sys.stderr); continue
    stem = os.path.basename(fp)[:-5]
    sc = json.load(open(f"{ROOT}/{src['scenario']}"))
    party = sc.get("overrides", {}).get("parties", {}).get(tside)
    if not party: print("skip-noparty", stem, file=sys.stderr); continue
    for p in party[:1]:
        p["species"] = a.id; ev = p.setdefault("evs", {e: 0 for e in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")}); ev["speed"] = a.ev
        for stat in ("attack", "spAttack", "defense", "spDefense"): ev[stat] = max(0, ev[stat] - max(0, sum(ev.values()) - 510))
    name = f"{a.tag}-{stem}"
    json.dump(sc, open(f"{a.out}/scenarios/{name}.json", "w"), separators=(",", ":")); open(f"{a.out}/scenarios/{name}.json", "a").write("\n")
    print(f"{name}\t{fp}\t{a.out}/scenarios/{name}.json\t{tside}")
