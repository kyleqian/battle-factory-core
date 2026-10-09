#!/usr/bin/env python3
"""plans48 direct-mGBA sSpriteOrder probes for the tail of the sprite-order host stops (docs/next-adapters-plans48.md; never the
HTTP oracles).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): prep48Probe.py <out-dir> [--jobs J=12] [--only <unit,...>]
Each job = (unit, id, move, base scenario, ops): an existing tools/battle-lab scenario, or a variant of it written to
<out-dir>/scenarios/<id>.json. ops (applied in order): ("extend", N) appends N idle frames (end-turn unit / next body);
("species", side, sp) replaces that side's party lead species; ("moves", side, mv) sets that side's lead moves to 4x mv (parties
format); ("item", side, it) sets that side's lead held item; ("set", side, setId) replaces that side's first Factory set id
(battlers-format scenarios); ("seed", n) sets the lab seed (gRngValue at battle start: FRZ staging). Every job runs twice in separate fresh mGBA processes (prep43Probe.run) -> raw/<id>-A.json / -B.json.
"""
import json, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Probe as P43

LAB = Path("tools/battle-lab")
LICKITUNG_SET, NOSEPASS_SET = 164, 150  # prep45's battlers-format lead swaps
E = ("extend", 600)
MP_P, MP_O = "mechanic-mega-punch-player-cacturne-opponent-onix", "mechanic-mega-punch-opponent-cacturne-player-onix"
JOBS = [
    # Ice Punch 8 (Mega Punch scenarios with the attacker's moves set to Ice Punch)
    ("BODY8", "ip-ply-onix", 8, MP_P, (("moves", "player", 8),)),
    ("BODY8", "ip-ply-snorlax", 8, MP_P, (("moves", "player", 8), ("species", "opponent", 143))),
    ("BODY8", "ip-opp-onix", 8, MP_O, (("moves", "opponent", 8),)),
    ("BODY8", "ip-opp-golbat", 8, MP_O, (("moves", "opponent", 8), ("species", "player", 42))),
    # NIGHTMARE (end-turn Status_Nightmare on the sleeping target)
    ("NIGHTMARE", "nm-ply", 171, "mechanic-nightmare-player-haunter-opponent-shuckle", (E,)),
    ("NIGHTMARE", "nm-ply-snorlax", 171, "mechanic-nightmare-player-haunter-opponent-shuckle", (E, ("species", "opponent", 143))),
    ("NIGHTMARE", "nm-opp", 171, "mechanic-nightmare-opponent-haunter-player-shuckle", (E,)),
    ("NIGHTMARE", "nm-opp-golbat", 171, "mechanic-nightmare-opponent-haunter-player-shuckle", (E, ("species", "player", 42))),
    # CURSED (end-turn Status_Curse on the cursed target)
    ("CURSED", "cu-ply", 174, "mechanic-curse-ghost-player-haunter-opponent-magikarp", (E,)),
    ("CURSED", "cu-ply-snorlax", 174, "mechanic-curse-ghost-player-haunter-opponent-magikarp", (E, ("species", "opponent", 143))),
    ("CURSED", "cu-opp", 174, "mechanic-curse-ghost-opponent-haunter-player-magikarp", (E,)),
    ("CURSED", "cu-opp-golbat", 174, "mechanic-curse-ghost-opponent-haunter-player-magikarp", (E, ("species", "player", 42))),
    # ITEM_KNOCKOFF (General_ItemKnockoff: the target must hold an item -> Leftovers 200)
    ("ITEM_KNOCKOFF", "ko-ply", 282, "mechanic-knock-off-shuppet-onix", (E, ("item", "opponent", 200))),
    ("ITEM_KNOCKOFF", "ko-ply-snorlax", 282, "mechanic-knock-off-shuppet-onix", (E, ("item", "opponent", 200), ("species", "opponent", 143))),
    ("ITEM_KNOCKOFF", "ko-opp", 282, "mechanic-knock-off-opponent-shuppet-player-onix", (E, ("item", "player", 200))),
    ("ITEM_KNOCKOFF", "ko-opp-golbat", 282, "mechanic-knock-off-opponent-shuppet-player-onix", (E, ("item", "player", 200), ("species", "player", 42))),
    # Razor Leaf 75
    ("BODY75", "rl-ply", 75, "mechanic-razor-leaf-player-weepinbell-opponent-shuckle", None),
    ("BODY75", "rl-ply-snorlax", 75, "mechanic-razor-leaf-player-weepinbell-opponent-shuckle", (("species", "opponent", 143),)),
    ("BODY75", "rl-opp", 75, "mechanic-razor-leaf-opponent-weepinbell-player-shuckle", None),
    ("BODY75", "rl-opp-golbat", 75, "mechanic-razor-leaf-opponent-weepinbell-player-shuckle", (("species", "player", 42),)),
    # Shock Wave 351
    ("BODY351", "sw-ply", 351, "mechanic-shock-wave-player-flaaffy-opponent-corsola", None),
    ("BODY351", "sw-ply-snorlax", 351, "mechanic-shock-wave-player-flaaffy-opponent-corsola", (("species", "opponent", 143),)),
    ("BODY351", "sw-opp", 351, "mechanic-shock-wave-opponent-flaaffy-player-corsola", None),
    ("BODY351", "sw-opp-golbat", 351, "mechanic-shock-wave-opponent-flaaffy-player-corsola", (("species", "player", 42),)),
    # Snore 173
    ("BODY173", "sn-ply", 173, "mechanic-snore-player-sealeo-opponent-venomoth", None),
    ("BODY173", "sn-ply-snorlax", 173, "mechanic-snore-player-sealeo-opponent-venomoth", (("species", "opponent", 143),)),
    ("BODY173", "sn-opp", 173, "mechanic-snore-opponent-sealeo-player-venomoth", None),
    ("BODY173", "sn-opp-golbat", 173, "mechanic-snore-opponent-sealeo-player-venomoth", (("species", "player", 42),)),
    # Grudge 288 (self-centred flames: the attacker's species varied too)
    ("BODY288", "gr-ply", 288, "mechanic-grudge-player-haunter-opponent-onix", None),
    ("BODY288", "gr-ply-snorlax", 288, "mechanic-grudge-player-haunter-opponent-onix", (("species", "player", 143),)),
    ("BODY288", "gr-opp", 288, "mechanic-grudge-opponent-haunter-player-onix", None),
    ("BODY288", "gr-opp-golbat", 288, "mechanic-grudge-opponent-haunter-player-onix", (("species", "opponent", 42),)),
    # Razor Wind 13 (choosetwoturnanim)
    ("BODY13", "rw-ply", 13, "mechanic-razor-wind-player-nuzleaf-opponent-onix", None),
    ("BODY13", "rw-ply-snorlax", 13, "mechanic-razor-wind-player-nuzleaf-opponent-onix", (("species", "opponent", 143),)),
    ("BODY13", "rw-opp", 13, "mechanic-razor-wind-opponent-nuzleaf-player-onix", None),
    ("BODY13", "rw-opp-golbat", 13, "mechanic-razor-wind-opponent-nuzleaf-player-onix", (("species", "player", 42),)),
    # Fly 19 (choosetwoturnanim; battlers-format scenarios: the defender swapped through the Factory set id)
    ("BODY19", "fl-ply", 19, "mechanic-fly-player-murkrow-onix", None),
    ("BODY19", "fl-ply-nosepass", 19, "mechanic-fly-player-murkrow-onix", (("set", "opponent", NOSEPASS_SET),)),
    ("BODY19", "fl-opp", 19, "mechanic-fly-murkrow-onix", None),
    ("BODY19", "fl-opp-lickitung", 19, "mechanic-fly-murkrow-onix", (("set", "player", LICKITUNG_SET),)),
    # ---- tier 2: more lead species per side (elevated opponent Golbat 42, Snorlax 143, Onix 95, Pichu 172) ----
    ("BODY8", "ip-ply-golbat", 8, MP_P, (("moves", "player", 8), ("species", "opponent", 42))),
    ("BODY8", "ip-ply-atk-pichu", 8, MP_P, (("moves", "player", 8), ("species", "player", 172))),
    ("BODY8", "ip-opp-snorlax", 8, MP_O, (("moves", "opponent", 8), ("species", "player", 143))),
    ("BODY8", "ip-opp-atk-golbat", 8, MP_O, (("moves", "opponent", 8), ("species", "opponent", 42))),
    ("NIGHTMARE", "nm-ply-golbat", 171, "mechanic-nightmare-player-haunter-opponent-shuckle", (E, ("species", "opponent", 42))),
    ("NIGHTMARE", "nm-opp-snorlax", 171, "mechanic-nightmare-opponent-haunter-player-shuckle", (E, ("species", "player", 143))),
    ("CURSED", "cu-ply-golbat", 174, "mechanic-curse-ghost-player-haunter-opponent-magikarp", (E, ("species", "opponent", 42))),
    ("CURSED", "cu-opp-snorlax", 174, "mechanic-curse-ghost-opponent-haunter-player-magikarp", (E, ("species", "player", 143))),
    ("ITEM_KNOCKOFF", "ko-ply-golbat", 282, "mechanic-knock-off-shuppet-onix", (E, ("item", "opponent", 200), ("species", "opponent", 42))),
    ("ITEM_KNOCKOFF", "ko-opp-snorlax", 282, "mechanic-knock-off-opponent-shuppet-player-onix", (E, ("item", "player", 200), ("species", "player", 143))),
    ("BODY75", "rl-ply-golbat", 75, "mechanic-razor-leaf-player-weepinbell-opponent-shuckle", (("species", "opponent", 42),)),
    ("BODY75", "rl-opp-snorlax", 75, "mechanic-razor-leaf-opponent-weepinbell-player-shuckle", (("species", "player", 143),)),
    ("BODY351", "sw-ply-golbat", 351, "mechanic-shock-wave-player-flaaffy-opponent-corsola", (("species", "opponent", 42),)),
    ("BODY351", "sw-ply-onix", 351, "mechanic-shock-wave-player-flaaffy-opponent-corsola", (("species", "opponent", 95),)),
    ("BODY351", "sw-ply-atk-snorlax", 351, "mechanic-shock-wave-player-flaaffy-opponent-corsola", (("species", "player", 143),)),
    ("BODY351", "sw-opp-snorlax", 351, "mechanic-shock-wave-opponent-flaaffy-player-corsola", (("species", "player", 143),)),
    ("BODY351", "sw-opp-onix", 351, "mechanic-shock-wave-opponent-flaaffy-player-corsola", (("species", "player", 95),)),
    ("BODY351", "sw-opp-atk-golbat", 351, "mechanic-shock-wave-opponent-flaaffy-player-corsola", (("species", "opponent", 42),)),
    ("BODY173", "sn-ply-golbat", 173, "mechanic-snore-player-sealeo-opponent-venomoth", (("species", "opponent", 42),)),
    ("BODY173", "sn-opp-snorlax", 173, "mechanic-snore-opponent-sealeo-player-venomoth", (("species", "player", 143),)),
    ("BODY288", "gr-ply-golbat", 288, "mechanic-grudge-player-haunter-opponent-onix", (("species", "player", 42),)),
    ("BODY288", "gr-ply-pichu", 288, "mechanic-grudge-player-haunter-opponent-onix", (("species", "player", 172),)),
    ("BODY288", "gr-opp-snorlax", 288, "mechanic-grudge-opponent-haunter-player-onix", (("species", "opponent", 143),)),
    ("BODY288", "gr-opp-onix", 288, "mechanic-grudge-opponent-haunter-player-onix", (("species", "opponent", 95),)),
    ("BODY13", "rw-ply-golbat", 13, "mechanic-razor-wind-player-nuzleaf-opponent-onix", (("species", "opponent", 42),)),
    ("BODY13", "rw-opp-snorlax", 13, "mechanic-razor-wind-opponent-nuzleaf-player-onix", (("species", "player", 143),)),
]
# FRZ: Ice Beam 58's 10 % freeze, staged by the lab seed (gRngValue at battle start); swept, the freezing seeds are the FRZ jobs
FRZ_SEEDS = range(1, 41)
JOBS += [("FRZ", f"fz-ply-s{s}", 58, "mechanic-ice-beam-player-delcatty-opponent-shuckle", (("seed", s),)) for s in FRZ_SEEDS]
JOBS += [("FRZ", f"fz-ply-snorlax-s{s}", 58, "mechanic-ice-beam-player-delcatty-opponent-shuckle", (("seed", s), ("species", "opponent", 143))) for s in FRZ_SEEDS]
JOBS += [("FRZ", f"fz-opp-s{s}", 58, "mechanic-ice-beam-opponent-delcatty-player-shuckle", (("seed", s),)) for s in FRZ_SEEDS]
JOBS += [("FRZ", f"fz-opp-golbat-s{s}", 58, "mechanic-ice-beam-opponent-delcatty-player-shuckle", (("seed", s), ("species", "player", 42))) for s in FRZ_SEEDS]


def scenario(out: Path, job) -> Path:
    unit, ident, move, base, ops = job
    path = LAB / f"{base}.json"
    if ops is None:
        return path
    data = json.loads(path.read_text())
    for op in ops:
        if op[0] == "extend":
            data["trace"]["segments"].append({"frames": op[1], "buttons": []})
            data["trace"].pop("captureFrames", None)
        elif op[0] == "seed":
            data["seed"] = op[1]
        elif op[0] == "set":
            data["playerSetIds" if op[1] == "player" else "opponentSetIds"][0] = op[2]
        else:
            lead = data["overrides"]["parties"][op[1]][0]
            if op[0] == "species":
                lead["species"] = op[2]
            elif op[0] == "moves":
                lead["moves"] = [op[2]] * 4
            elif op[0] == "item":
                lead["item"] = op[2]
            else:
                raise ValueError(op)
    target = out / "scenarios" / f"{ident}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    return target


P43.scenario = scenario  # prep43Probe.run resolves the scenario through its module global

if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 12
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    selected = [j for j in JOBS if only is None or j[0] in only]
    for job in selected:
        scenario(out, job)
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(P43.run, [(out, j, r) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "probe runs;", "missing:", missing or "none")
