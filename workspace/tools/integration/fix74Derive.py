#!/usr/bin/env python3
"""fix74: derive one liveAdapterFramebuffer fixture per scenario from ONE tools/compare/bulkUpProbe.py run (its source window =
first grown frame .. first inactive, the accepted Bulk Up framing; HP / species from the probe's own battler snapshot).
  python3 tools/integration/fix74Derive.py <scenario-dir> <probe-dir> <fixture-dir>   (probe-dir holds <name>.json)"""
import json, sys
from pathlib import Path

SCN, PROBES, OUT = map(Path, sys.argv[1:])
OUT.mkdir(parents=True, exist_ok=True)
STATS = json.loads(Path("src/data/gen/species-stats.json").read_text())["species"]
NAMES = {s["id"]: s["name"].removeprefix("SPECIES_") for s in STATS}
RATIO = {s["id"]: s["genderRatio"] for s in STATS}

def gender(scenario: dict, side: str, species: int) -> str:
    """The displayed gender: fixed-ratio species by ratio (0 male, 254 female, 255 genderless), else the scenario's lead."""
    ratio = RATIO[species]
    if ratio in (0, 254, 255): return {0: "male", 254: "female", 255: "genderless"}[ratio]
    return scenario["overrides"]["parties"][side][0].get("gender", "male")
for scenario in sorted(SCN.glob("*.json")):
    name = scenario.stem
    lab = json.loads(scenario.read_text())
    probe = json.loads((PROBES / f"{name}.json").read_text())
    w = probe["sourceWindow"]
    first = probe["frames"][0]
    b = first["battlers"]
    side = "player" if "-ply-" in name else "opponent"
    other = "opponent" if side == "player" else "player"
    # The probe's own attacker check: GrowAndShrink's sprite belongs to the user's side (task data[15] = gBattlerSpriteIds[attacker]).
    fixture = {
        "schema": "fix74-bulk-up-live/v1", "scenario": str(scenario), "probe": "tools/compare/bulkUpProbe.py", "move": "BULK_UP",
        "denseWindow": {"startFrame": w["startFrame"], "endFrame": w["endFrame"]},
        "attacker": {"species": NAMES[b[side]["species"]], "geometry": {"side": side}},
        "target": {"species": NAMES[b[other]["species"]], "geometry": {"side": other}},
        "fieldProfile": {"playerHp": b["player"]["hp"], "playerMaxHp": b["player"]["maxHp"], "opponentHp": b["opponent"]["hp"],
                         "opponentMaxHp": b["opponent"]["maxHp"], "playerGender": gender(lab, "player", b["player"]["species"]),
                         "opponentGender": gender(lab, "opponent", b["opponent"]["species"])},
        "derive": {"frameCount": w["frameCount"], "evidenceRows": len(probe["frames"])},
    }
    (OUT / f"{name}.json").write_text(json.dumps(fixture, indent=1) + "\n")
    print(name, w, fixture["attacker"]["species"], fixture["target"]["species"], fixture["fieldProfile"])
