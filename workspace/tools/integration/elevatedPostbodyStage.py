#!/usr/bin/env python3
"""Stage elevated-OPPONENT-ATTACKER swaps of accepted opponent-attacker fixtures (docs/elevated-postbody-audit.md).
usage: elevatedPostbodyStage.py <list.txt> <outdir>   (list rows: <fixture>\t<SPECIES>\t<id>)
Sets opponent party[0] to SPECIES (gender male, speed EV 0); writes tools/battle-lab/elevated-postbody-<SPECIES>-<stem>.json + the fixture copy
tools/integration/fixtures/elevated-postbody/staged/<SPECIES>-<stem>.json and prints speciesAuditDerive list rows (k, orig, staged, scenario)."""
import json, sys, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
os.makedirs(f"{ROOT}/tools/integration/fixtures/elevated-postbody/staged", exist_ok=True)
for l in open(sys.argv[1]):
    if not l.strip(): continue
    orig, species, sid = l.rstrip("\n").split("\t")
    src = json.load(open(f"{ROOT}/{orig}"))
    if src.get("sourceFixture"): src = {**json.load(open(f"{ROOT}/{src['sourceFixture']}")), **src}
    stem = os.path.basename(orig)[:-5]
    sc = json.load(open(f"{ROOT}/{src['scenario']}"))
    p = sc["overrides"]["parties"]["opponent"][0]
    p["species"] = int(sid); p["gender"] = "male"
    p.get("evs", {})["speed"] = 0
    name = f"elevated-postbody-{species.lower()}-{stem}"
    with open(f"{ROOT}/tools/battle-lab/{name}.json", "w") as o: json.dump(sc, o, separators=(",", ":")); o.write("\n")
    f = dict(src); f["scenario"] = f"tools/battle-lab/{name}.json"
    f["attacker"] = {**src["attacker"], "species": species}
    f["fieldProfile"] = {**src["fieldProfile"], "opponentGender": "male"}
    f.pop("sourceFixture", None); f.pop("draft", None)
    k = f"{species.lower()}-{stem}"
    path = f"tools/integration/fixtures/elevated-postbody/staged/{k}.json"
    with open(f"{ROOT}/{path}", "w") as o: json.dump(f, o, indent=1); o.write("\n")
    print(f"{k}\t{orig}\t{path}\ttools/battle-lab/{name}.json")
