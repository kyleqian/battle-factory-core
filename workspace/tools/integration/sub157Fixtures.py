#!/usr/bin/env python3
"""sub157 (ISSUES #153; substBodyFixtures.py with the Scene OFF cases): Scene OFF Substitute body (164) live fixtures from TWO fresh prep37Probes.sh runs (r1 == r2 bodies must agree): window = [first
Move_SUBSTITUTE row, first inactive row] (87 rows), fieldProfile = hp/maxHP at the activation row, genders from the scenario.
usage (from workspace/): python3 tools/integration/sub157Fixtures.py PROBEDIR   -> tools/integration/fixtures/sub157/sub157-off-*.json"""
import json, sys
from pathlib import Path
R = Path.cwd()
D = Path(sys.argv[1])
names = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
CASES = [("sub157-off-player-persian-slowbro", "prep37-off-player-persian-slowbro"),
         ("sub157-off-opponent-persian-slowbro", "sub157-off-opponent-persian-slowbro"),
         ("sub157-off-player-golem-opponent-onix", "sub157-off-player-golem-opponent-onix"),
         ("sub157-off-opponent-golem-player-onix", "sub157-off-opponent-golem-player-onix")]
def sym(i):
    s = names[i]
    return s["name"].replace("SPECIES_", "")
for name, scen in CASES:
    runs = [json.loads((D / f"{scen}-r{r}.json").read_text()) for r in (1, 2)]
    wins = []
    for p in runs:
        fr = p["frames"]
        i = next(k for k, r in enumerate(fr) if r["script"] == "Move_SUBSTITUTE")
        w = fr[i:i + 87]
        assert len(w) == 87 and all(r["frame"] == w[0]["frame"] + k for k, r in enumerate(w))
        assert all(r["script"] == "Move_SUBSTITUTE" and r["animScriptActive"] == 1 for r in w[:86]) and w[86]["animScriptActive"] == 0
        wins.append((w[0]["frame"], w[86]["frame"], w[0]["animAttacker"], [(b["species"], b["hp"], b["maxHP"]) for b in w[0]["battlers"]]))
    assert wins[0] == wins[1], (name, wins)
    start, end, att, b = wins[0]
    sc = json.loads((R / f"tools/battle-lab/{scen}.json").read_text())
    side = "player" if att == 0 else "opponent"; other = "opponent" if att == 0 else "player"
    sp = {"player": sym(b[0][0]), "opponent": sym(b[1][0])}
    fx = {"schema": "s10a-live-adapter-fixture/v1", "move": "SUBSTITUTE", "probe": "tools/probe/run-battle-lab-rgb.py",
          "scenario": f"tools/battle-lab/{scen}.json", "denseWindow": {"startFrame": start, "endFrame": end},
          "windowSource": f"window = [activation, first inactive row] of this scenario's first Move_SUBSTITUTE body (87 rows) from 2 fresh prep37Probes.sh runs (bodies agree); profile {runs[0]['profile']}",
          "attacker": {"species": sp[side], "geometry": {"side": side}}, "target": {"species": sp[other], "geometry": {"side": other}},
          "fieldProfile": {"playerHp": b[0][1], "playerMaxHp": b[0][2], "opponentHp": b[1][1], "opponentMaxHp": b[1][2],
                           "playerGender": sc["overrides"]["parties"]["player"][0]["gender"], "opponentGender": sc["overrides"]["parties"]["opponent"][0]["gender"]}}
    (R / f"tools/integration/fixtures/sub157/{name}.json").write_text(json.dumps(fx, indent=1) + "\n")
    print(name, start, end, sp, side)
