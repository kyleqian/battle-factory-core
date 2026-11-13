"""usage (cwd = workspace/): python3 tools/replay-hunt/sets.py "EXPR over m" ...
Lists Factory sets (src/data/gen/battle-frontier-mons.json) for which EXPR is true. m.index, m.sp (species without SPECIES_), m.moves (names without MOVE_),
m.item, m.eff (move effects), m.ab (abilities), m.ty (types), m.spe (base speed), m.hp, m.ch (0-based challenges whose set range holds it). `moves` is the move table:
moves['X']['type'|'power'|'effect'|'accuracy'|'priority']."""
import json, os, sys, types
W = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
G = W + "/src/data/gen/"
mons = json.load(open(G + "battle-frontier-mons.json"))["entries"]
mv = {x["move"][5:]: x for x in json.load(open(G + "moves.json"))["moves"]}
sp = {x["name"]: x for x in json.load(open(G + "species-stats.json"))["species"]}
ty = json.load(open(G + "species-types.json"))
ty = ty.get("species", ty) if isinstance(ty, dict) else ty
tymap = {}
for t in (ty if isinstance(ty, list) else []):
    tymap[t.get("species") or t.get("name")] = t.get("types") or [t.get("type1"), t.get("type2")]
RANGES = [(110, 199), (162, 266), (267, 371), (372, 467), (468, 563), (564, 659), (660, 755), (372, 849)]
items = {e["itemName"]: e for e in json.load(open(G + "battle-frontier-held-items.json"))["entries"]}
out = []
for e in mons:
    s = sp.get(e["species"], {})
    m = types.SimpleNamespace(index=e["index"], sp=e["species"][8:], moves=[x[5:] for x in e["moves"]], eff=[mv[x[5:]]["effect"][7:] for x in e["moves"]],
                              item=items.get(e["itemName"], {}).get("item", "?")[5:], he=items.get(e["itemName"], {}).get("holdEffect", "?")[12:],
                              ab=[a[8:] for a in s.get("abilities", [])], ty=tymap.get(e["species"], []), spe=s.get("baseSpeed"), hp=s.get("baseHp"),
                              ch=[i for i, (a, b) in enumerate(RANGES) if a <= e["index"] <= b], nature=e["nature"][7:], evs=e.get("evSpreadStats"))
    out.append(m)
for expr in sys.argv[1:]:
    for m in out:
        if eval(expr, {"moves": mv, "m": m}):
            print(m.index, m.sp, m.moves, m.item, m.ab, m.ty, "spe", m.spe, m.nature, "ch", [c for c in m.ch])
