#!/usr/bin/env python3
"""speciesAudit: stage a species-swapped copy of accepted fixtures (opponent target OR player attacker's back sprite -> see --side).
usage: speciesAuditStage.py --species GOLEM --id 76 --hp 155 [--speed-ev 252] [--tag golem] <list.tsv>   (rows: stem, orig fixture, -, -)
Opponent-target mode (default): the opponent party[0] (ONIX 95) -> SPECIES; its speed EVs are raised so the turn order (opponent Tackle first) is kept.
Writes tools/battle-lab/species-audit-<tag>-<stem>.json and tools/integration/fixtures/species-audit/staged/<tag>-<stem>.json (fixture copy)."""
import json, sys, os, argparse
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
ap = argparse.ArgumentParser(); ap.add_argument("--species"); ap.add_argument("--id", type=int); ap.add_argument("--hp", type=int)
ap.add_argument("--speed-ev", type=int, default=0); ap.add_argument("--tag"); ap.add_argument("--gender", default=None); ap.add_argument("list")
a = ap.parse_args()
os.makedirs(f"{ROOT}/tools/integration/fixtures/species-audit/staged", exist_ok=True)
for l in open(a.list):
    k, orig = l.rstrip("\n").split("\t")[:2]
    src = json.load(open(f"{ROOT}/{orig}"))
    if src.get("sourceFixture"): src = {**json.load(open(f"{ROOT}/{src['sourceFixture']}")), **src}
    if src["target"]["species"] != "ONIX" or src["target"]["geometry"]["side"] != "opponent": print("skip", k); continue
    if src.get("precedingTurns"): print("skip (precedingTurns)", k); continue
    sc = json.load(open(f"{ROOT}/{src['scenario']}"))
    party = sc.get("overrides", {}).get("parties", {}).get("opponent")
    if not party or party[0]["species"] != 95: print("skip (no explicit ONIX party[0])", k); continue
    party[0]["species"] = a.id; party[0].setdefault("evs", {e: 0 for e in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")})["speed"] = a.speed_ev
    ev = party[0]["evs"]  # lab limit: total <= 510 -> trim attack/spAttack/defense/spDefense (never hp: it sets the target HP)
    for stat in ("attack", "spAttack", "defense", "spDefense"):
        ev[stat] = max(0, ev[stat] - max(0, sum(ev.values()) - 510))
    name = f"species-audit-{a.tag}-{k}"
    json.dump(sc, open(f"{ROOT}/tools/battle-lab/{name}.json", "w"), separators=(",", ":")); open(f"{ROOT}/tools/battle-lab/{name}.json", "a").write("\n")
    f = dict(src); f["scenario"] = f"tools/battle-lab/{name}.json"; f["target"] = {**src["target"], "species": a.species}
    f["fieldProfile"] = {**src["fieldProfile"], "opponentHp": a.hp, "opponentMaxHp": a.hp}
    if a.gender: f["fieldProfile"]["opponentGender"] = a.gender
    f.pop("sourceFixture", None); f.pop("note", None)
    json.dump(f, open(f"{ROOT}/tools/integration/fixtures/species-audit/staged/{a.tag}-{k}.json", "w"), indent=1)
    open(f"{ROOT}/tools/integration/fixtures/species-audit/staged/{a.tag}-{k}.json", "a").write("\n")
    print(f"{k}\t{orig}\ttools/integration/fixtures/species-audit/staged/{a.tag}-{k}.json\ttools/battle-lab/{name}.json")
