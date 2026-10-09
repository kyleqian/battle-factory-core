#!/usr/bin/env python3
"""prep45 direct-mGBA sSpriteOrder probes for the greedy order-chain units of docs/next-adapters-prep45.md (never the HTTP oracles).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): prep45Probe.py <out-dir> [--jobs J=10] [--only <unit,...>]
Each job = (unit, id, move, base scenario, variant): an existing tools/battle-lab scenario, or a variant of it written to
<out-dir>/scenarios/<id>.json. Variants: ("extend", N, ...) appends N idle frames (so an end-turn unit / next body follows);
(side, species) replaces that side's party lead species (overrides.parties); ("set", side, setId) replaces that side's first Factory
set id (scenarios whose overrides only patch battlers.<side>.moves). Every job runs twice in separate fresh mGBA processes
(tools/compare/spriteOrderEventProbe.py through tools/run-mgba-probe.py, prep43Probe.run) -> <out-dir>/raw/<id>-A.json / -B.json.
"""
import json, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Probe as P43

LAB = Path("tools/battle-lab")
LICKITUNG_SET, NOSEPASS_SET = 164, 150  # challenge-0 rental range (Level 50 range 0: 110..199), held items not repeated
E = ("extend", 600)
JOBS = [
    # BRN: Will-O-Wisp inflicts, end-turn burn damage replays Status_Burn (burned battler = the target)
    ("BRN", "brn-opp-shuckle", 261, "mechanic-will-o-wisp-player-shuppet-opponent-shuckle", E),
    ("BRN", "brn-opp-snorlax", 261, "mechanic-will-o-wisp-player-shuppet-opponent-shuckle", E + ("opponent", 143)),
    ("BRN", "brn-ply-shuckle", 261, "mechanic-will-o-wisp-opponent-shuppet-player-shuckle", E),
    ("BRN", "brn-ply-golbat", 261, "mechanic-will-o-wisp-opponent-shuppet-player-shuckle", E + ("player", 42)),
    # Sand-Attack 28 / Mud-Slap 189 (battlers-format scenarios: lead swapped through the Factory set id)
    ("BODY28", "sa-opp-onix", 28, "mechanic-sand-attack-pidgeotto-onix", None),
    ("BODY28", "sa-opp-lickitung", 28, "mechanic-sand-attack-pidgeotto-onix", ("set", "player", LICKITUNG_SET)),
    ("BODY28", "sa-ply-onix", 28, "mechanic-sand-attack-player-pidgeotto-onix", None),
    ("BODY28", "sa-ply-nosepass", 28, "mechanic-sand-attack-player-pidgeotto-onix", ("set", "opponent", NOSEPASS_SET)),
    ("BODY189", "ms-opp-onix", 189, "mechanic-mud-slap-pidgeotto-onix", None),
    ("BODY189", "ms-opp-lickitung", 189, "mechanic-mud-slap-pidgeotto-onix", ("set", "player", LICKITUNG_SET)),
    ("BODY189", "ms-ply-onix", 189, "mechanic-mud-slap-player-pidgeotto-onix", None),
    ("BODY189", "ms-ply-nosepass", 189, "mechanic-mud-slap-player-pidgeotto-onix", ("set", "opponent", NOSEPASS_SET)),
    # Hydro Pump 56
    ("BODY56", "hp-ply-onix", 56, "mechanic-hydro-pump-player-masquerain-opponent-onix", None),
    ("BODY56", "hp-ply-snorlax", 56, "mechanic-hydro-pump-player-masquerain-opponent-onix", ("opponent", 143)),
    ("BODY56", "hp-opp-onix", 56, "mechanic-hydro-pump-opponent-masquerain-player-onix", None),
    ("BODY56", "hp-opp-golbat", 56, "mechanic-hydro-pump-opponent-masquerain-player-onix", ("player", 42)),
    # TURN_TRAP: Fire Spin / Whirlpool / Sand Tomb end-turn damage (General_TurnTrap branches on the trap move)
    ("TURN_TRAP", "tt-fs-ply", 83, "mechanic-fire-spin-player-charmeleon-opponent-onix", E),
    ("TURN_TRAP", "tt-fs-ply-snorlax", 83, "mechanic-fire-spin-player-charmeleon-opponent-onix", E + ("opponent", 143)),
    ("TURN_TRAP", "tt-fs-opp", 83, "mechanic-fire-spin-opponent-charmeleon-player-onix", E),
    ("TURN_TRAP", "tt-fs-opp-golbat", 83, "mechanic-fire-spin-opponent-charmeleon-player-onix", E + ("player", 42)),
    ("TURN_TRAP", "tt-wp-ply", 250, "mechanic-whirlpool-player-wailmer-opponent-onix", E),
    ("TURN_TRAP", "tt-wp-opp", 250, "mechanic-whirlpool-opponent-wailmer-player-onix", E),
    ("TURN_TRAP", "tt-st-ply", 328, "mechanic-sand-tomb-player-dugtrio-opponent-onix", E),
    ("TURN_TRAP", "tt-st-opp", 328, "mechanic-sand-tomb-opponent-dugtrio-player-onix", E),
    # Attract 213
    ("BODY213", "at-ply-onix", 213, "mechanic-attract-player-eevee-opponent-onix", None),
    ("BODY213", "at-ply-golbat", 213, "mechanic-attract-player-eevee-opponent-onix", ("opponent", 42)),
    ("BODY213", "at-opp-onix", 213, "mechanic-attract-opponent-eevee-player-onix", None),
    ("BODY213", "at-opp-golbat", 213, "mechanic-attract-opponent-eevee-player-onix", ("player", 42)),
    # Reversal 179 (both scenario orientations; defender swaps)
    ("BODY179", "rv-a", 179, "mechanic-reversal-player-vigoroth-opponent-delcatty", None),
    ("BODY179", "rv-a-snorlax", 179, "mechanic-reversal-player-vigoroth-opponent-delcatty", ("opponent", 143)),
    ("BODY179", "rv-b", 179, "mechanic-reversal-player-delcatty-opponent-vigoroth", None),
    ("BODY179", "rv-b-snorlax", 179, "mechanic-reversal-player-delcatty-opponent-vigoroth", ("player", 143)),
    # Mega Drain 72
    ("BODY72", "md-ply-onix", 72, "mechanic-mega-drain-player-skiploom-opponent-onix", None),
    ("BODY72", "md-ply-snorlax", 72, "mechanic-mega-drain-player-skiploom-opponent-onix", ("opponent", 143)),
    ("BODY72", "md-opp-onix", 72, "mechanic-mega-drain-opponent-skiploom-player-onix", None),
    ("BODY72", "md-opp-golbat", 72, "mechanic-mega-drain-opponent-skiploom-player-onix", ("player", 42)),
    # WISH_HEAL (the turn after Wish)
    ("WISH_HEAL", "wh-ply", 273, "mechanic-wish-player-illumise-opponent-onix", E),
    ("WISH_HEAL", "wh-ply-snorlax", 273, "mechanic-wish-player-illumise-opponent-onix", E + ("player", 143)),
    ("WISH_HEAL", "wh-opp", 273, "mechanic-wish-opponent-illumise-player-onix", E),
    ("WISH_HEAL", "wh-opp-golbat", 273, "mechanic-wish-opponent-illumise-player-onix", E + ("opponent", 42)),
    # Magical Leaf 345
    ("BODY345", "ml-ply-onix", 345, "mechanic-magical-leaf-player-roselia-opponent-onix", None),
    ("BODY345", "ml-ply-snorlax", 345, "mechanic-magical-leaf-player-roselia-opponent-onix", ("opponent", 143)),
    ("BODY345", "ml-opp-onix", 345, "mechanic-magical-leaf-opponent-roselia-player-onix", None),
    ("BODY345", "ml-opp-golbat", 345, "mechanic-magical-leaf-opponent-roselia-player-onix", ("player", 42)),
    # Solar Beam 76 (choosetwoturnanim: setup / unleash)
    ("BODY76", "sb-ply-chansey", 76, "mechanic-solar-beam-player-gloom-opponent-chansey", None),
    ("BODY76", "sb-ply-snorlax", 76, "mechanic-solar-beam-player-gloom-opponent-chansey", ("opponent", 143)),
    ("BODY76", "sb-opp-chansey", 76, "mechanic-solar-beam-opponent-gloom-player-chansey", None),
    ("BODY76", "sb-opp-golbat", 76, "mechanic-solar-beam-opponent-gloom-player-chansey", ("player", 42)),
    # Softboiled 135 (self-target: the attacker's species varied)
    ("BODY135", "sbo-ply", 135, "mechanic-soft-boiled-player-chansey-opponent-onix", None),
    ("BODY135", "sbo-ply-snorlax", 135, "mechanic-soft-boiled-player-chansey-opponent-onix", ("player", 143)),
    ("BODY135", "sbo-opp", 135, "mechanic-soft-boiled-opponent-chansey-player-onix", None),
    ("BODY135", "sbo-opp-golbat", 135, "mechanic-soft-boiled-opponent-chansey-player-onix", ("opponent", 42)),
    # Overheat 315
    ("BODY315", "oh-ply", 315, "mechanic-overheat-player-solrock-opponent-shuckle", None),
    ("BODY315", "oh-ply-snorlax", 315, "mechanic-overheat-player-solrock-opponent-shuckle", ("opponent", 143)),
    ("BODY315", "oh-opp", 315, "mechanic-overheat-opponent-magcargo-player-shuckle", None),
    ("BODY315", "oh-opp-golbat", 315, "mechanic-overheat-opponent-magcargo-player-shuckle", ("player", 42)),
    # INGRAIN_HEAL (end turn after Ingrain)
    ("INGRAIN_HEAL", "ih-ply", 275, "mechanic-ingrain-player-lileep-opponent-onix", E),
    ("INGRAIN_HEAL", "ih-ply-snorlax", 275, "mechanic-ingrain-player-lileep-opponent-onix", E + ("player", 143)),
    ("INGRAIN_HEAL", "ih-opp", 275, "mechanic-ingrain-opponent-lileep-player-onix", E),
    ("INGRAIN_HEAL", "ih-opp-golbat", 275, "mechanic-ingrain-opponent-lileep-player-onix", E + ("opponent", 42)),
    # Perish Song 195
    ("BODY195", "ps-ply", 195, "mechanic-perish-song-player-murkrow-opponent-onix", None),
    ("BODY195", "ps-ply-snorlax", 195, "mechanic-perish-song-player-murkrow-opponent-onix", ("opponent", 143)),
    ("BODY195", "ps-opp", 195, "mechanic-perish-song-opponent-murkrow-player-onix", None),
    ("BODY195", "ps-opp-golbat", 195, "mechanic-perish-song-opponent-murkrow-player-onix", ("player", 42)),
    # Dragon Dance 349 (self-target: the attacker's species varied)
    ("BODY349", "dd-ply", 349, "mechanic-dragon-dance-player-dragonair-opponent-onix", None),
    ("BODY349", "dd-ply-snorlax", 349, "mechanic-dragon-dance-player-dragonair-opponent-onix", ("player", 143)),
    ("BODY349", "dd-opp", 349, "mechanic-dragon-dance-opponent-dragonair-player-onix", None),
    ("BODY349", "dd-opp-golbat", 349, "mechanic-dragon-dance-opponent-dragonair-player-onix", ("opponent", 42)),
]


def scenario(out: Path, job) -> Path:
    unit, ident, move, base, variant = job
    path = LAB / f"{base}.json"
    if variant is None:
        return path
    data = json.loads(path.read_text())
    if variant[0] == "extend":
        data["trace"]["segments"].append({"frames": variant[1], "buttons": []})
        variant = variant[2:]
    if variant and variant[0] == "set":
        data["playerSetIds" if variant[1] == "player" else "opponentSetIds"][0] = variant[2]
    elif variant:
        side, species = variant
        data["overrides"]["parties"][side][0]["species"] = species
    target = out / "scenarios" / f"{ident}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    return target


P43.scenario = scenario  # prep43Probe.run resolves the scenario through its module global

if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 10
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    selected = [j for j in JOBS if only is None or j[0] in only]
    for job in selected:
        scenario(out, job)
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(P43.run, [(out, j, r) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "probe runs;", "missing:", missing or "none")
