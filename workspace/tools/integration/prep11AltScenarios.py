#!/usr/bin/env python3
"""prep11: alternate-species lab scenarios (player attacker, party[0] species swapped; INTERNAL species ids from species.h -- the lab files use
national-dex ids for some Hoenn species, prep10 PAPERCUT 1). One alternate per move, taken from the carrier species of tools/integration/fixtures/prep11-routes.json."""
import json, re, copy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sp = {m.group(1): int(m.group(2)) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)", (ROOT / "reference/pokeemerald/include/constants/species.h").read_text())}
ALT = {"roar": "VAPOREON", "whirlwind": "BEAUTIFLY", "baton-pass": "NINJASK", "leech-seed": "VENUSAUR", "tri-attack": "DUGTRIO", "destiny-bond": "GENGAR", "petal-dance": "VILEPLUME",
       "rollout": "WAILMER", "air-cutter": "CROBAT", "foresight": "HITMONLEE", "sky-uppercut": "COMBUSKEN", "spider-web": "ARIADOS", "fly": "SWELLOW", "bounce": "PONYTA", "recycle": "PORYGON2"}
for key, alt in ALT.items():
    srcs = sorted((ROOT / "tools/battle-lab").glob(f"mechanic-{key}-player-*.json")) or sorted((ROOT / "tools/battle-lab").glob(f"mechanic-{key}-*.json"))
    src = next((p for p in srcs if "off" not in p.stem.split("-")[-1:]), srcs[0])
    s = json.loads(src.read_text())
    if "parties" not in s["overrides"]:  # fly / bounce: battlers-only override (set-id species): build the party from the Leaf Blade base file, keep this file's move + trace
        base = json.loads((ROOT / "tools/battle-lab/mechanic-leaf-blade-player-sceptile-opponent-onix.json").read_text())["overrides"]["parties"]
        moves = s["overrides"]["battlers"]["player"]["moves"]; base["player"][0]["moves"] = moves
        s["overrides"] = {"parties": base}
    before = s["overrides"]["parties"]["player"][0]["species"]
    s["overrides"]["parties"]["player"][0]["species"] = sp[alt]
    if s["overrides"]["parties"]["player"][0].get("gender") == "genderless": s["overrides"]["parties"]["player"][0]["gender"] = "male"  # the source carrier (VOLTORB/PORYGON) is genderless
    (ROOT / f"tools/battle-lab/prep11-{key}-alt-{alt.lower()}.json").write_text(json.dumps(s, separators=(",", ":")) + "\n")
    print(key, src.name, before, "->", alt, sp[alt])
