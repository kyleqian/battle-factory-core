#!/usr/bin/env python3
"""prep43 direct-mGBA sSpriteOrder probes for the order-host units of docs/next-adapters-prep43.md (never the HTTP oracles).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): prep43Probe.py <out-dir> [--jobs J=8] [--only <unit>]
Each job = (unit, move id, scenario): an existing tools/battle-lab scenario, or a species variant of one (the named side's lead
species replaced; everything else unchanged), written to <out-dir>/scenarios/<id>.json. Every job runs twice in separate fresh mGBA
processes (tools/compare/spriteOrderEventProbe.py through tools/run-mgba-probe.py) -> <out-dir>/raw/<id>-A.json / -B.json.
"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

LAB = Path("tools/battle-lab")
# (unit, id, move, base scenario, (side, lead species) or None)
JOBS = [
    # CONFUSION: the confused battler's side x lead species, Confuse Ray / Dizzy Punch / Confusion histories
    ("CONFUSION", "conf-opp-onix", 109, "mechanic-confuse-ray-player-chinchou-opponent-onix", None),
    ("CONFUSION", "conf-opp-snorlax", 109, "mechanic-confuse-ray-player-chinchou-opponent-onix", ("opponent", 143)),
    ("CONFUSION", "conf-opp-golbat", 109, "mechanic-confuse-ray-player-chinchou-opponent-onix", ("opponent", 42)),
    ("CONFUSION", "conf-opp-diglett", 109, "mechanic-confuse-ray-player-chinchou-opponent-onix", ("opponent", 50)),
    ("CONFUSION", "conf-ply-onix", 109, "mechanic-confuse-ray-opponent-chinchou-player-onix", None),
    ("CONFUSION", "conf-ply-snorlax", 109, "mechanic-confuse-ray-opponent-chinchou-player-onix", ("player", 143)),
    ("CONFUSION", "conf-ply-golbat", 109, "mechanic-confuse-ray-opponent-chinchou-player-onix", ("player", 42)),
    ("CONFUSION", "conf-ply-diglett", 109, "mechanic-confuse-ray-opponent-chinchou-player-onix", ("player", 50)),
    ("CONFUSION", "conf-dizzy-opp", 146, "mechanic-dizzy-punch-player-spinda-opponent-onix", None),
    ("CONFUSION", "conf-dizzy-ply", 146, "mechanic-dizzy-punch-opponent-spinda-player-onix", None),
    ("CONFUSION", "conf-kadabra-ply", 93, "mechanic-confusion-opponent-kadabra-player-onix", None),
    # PRZ: paralysis inflicted (Thunder Wave / Stun Spore / Glare) on either side, several target species
    ("PRZ", "prz-tw-opp-shuckle", 86, "mechanic-thunder-wave-player-flaaffy-opponent-shuckle", None),
    ("PRZ", "prz-tw-opp-snorlax", 86, "mechanic-thunder-wave-player-flaaffy-opponent-shuckle", ("opponent", 143)),
    ("PRZ", "prz-tw-opp-golbat", 86, "mechanic-thunder-wave-player-flaaffy-opponent-shuckle", ("opponent", 42)),
    ("PRZ", "prz-tw-ply-shuckle", 86, "mechanic-thunder-wave-opponent-flaaffy-player-shuckle", None),
    ("PRZ", "prz-tw-ply-snorlax", 86, "mechanic-thunder-wave-opponent-flaaffy-player-shuckle", ("player", 143)),
    ("PRZ", "prz-tw-ply-golbat", 86, "mechanic-thunder-wave-opponent-flaaffy-player-shuckle", ("player", 42)),
    ("PRZ", "prz-ss-opp", 78, "mechanic-stun-spore-player-hoppip-opponent-onix", None),
    ("PRZ", "prz-ss-ply", 78, "mechanic-stun-spore-opponent-hoppip-player-onix", None),
    ("PRZ", "prz-glare-opp", 137, "mechanic-glare-player-dunsparce-opponent-shuckle", None),
    ("PRZ", "prz-glare-ply", 137, "mechanic-glare-opponent-dunsparce-player-shuckle", None),
    # Giga Drain body 202: both sides, several defender species
    ("BODY202", "gd-ply-onix", 202, "mechanic-giga-drain-player-roselia-opponent-onix", None),
    ("BODY202", "gd-ply-snorlax", 202, "mechanic-giga-drain-player-roselia-opponent-onix", ("opponent", 143)),
    ("BODY202", "gd-ply-golbat", 202, "mechanic-giga-drain-player-roselia-opponent-onix", ("opponent", 42)),
    ("BODY202", "gd-opp-onix", 202, "mechanic-giga-drain-opponent-roselia-player-onix", None),
    ("BODY202", "gd-opp-snorlax", 202, "mechanic-giga-drain-opponent-roselia-player-onix", ("player", 143)),
    ("BODY202", "gd-opp-golbat", 202, "mechanic-giga-drain-opponent-roselia-player-onix", ("player", 42)),
    # Dig body 91 (setup + unleash): both sides, two attacker species
    ("BODY91", "dig-ply-vibrava", 91, "mechanic-dig-player-vibrava-opponent-chansey", None),
    ("BODY91", "dig-ply-snorlax", 91, "mechanic-dig-player-vibrava-opponent-chansey", ("opponent", 143)),
    ("BODY91", "dig-opp-vibrava", 91, "mechanic-dig-opponent-vibrava-player-chansey", None),
    ("BODY91", "dig-opp-snorlax", 91, "mechanic-dig-opponent-vibrava-player-chansey", ("player", 143)),
    # Rain Dance -> RAIN_CONTINUES end-turn; Sandstorm / Hail -> WEATHER_VAR (playanimation_var)
    ("RAIN", "rain-ply", 240, "mechanic-rain-dance-player-wooper-opponent-onix", None),
    ("RAIN", "rain-opp", 240, "mechanic-rain-dance-opponent-wooper-player-onix", None),
    ("RAIN", "rain-ply-snorlax", 240, "mechanic-rain-dance-player-wooper-opponent-onix", ("opponent", 143)),
    ("WEATHER_VAR", "sand-ply", 201, "mechanic-sandstorm-player-phanpy-opponent-onix", None),
    ("WEATHER_VAR", "sand-opp", 201, "mechanic-sandstorm-opponent-phanpy-player-onix", None),
    ("WEATHER_VAR", "hail-ply", 258, "mechanic-hail-player-delibird-opponent-onix", None),
    ("WEATHER_VAR", "hail-opp", 258, "mechanic-hail-opponent-delibird-player-onix", None),
    # Brick Break body 280 / Leech Seed drain
    ("BODY280", "bb-ply", 280, "mechanic-brick-break-player-lombre-opponent-onix", None),
    ("BODY280", "bb-opp", 280, "mechanic-brick-break-opponent-lombre-player-onix", None),
    ("BODY280", "bb-ply-snorlax", 280, "mechanic-brick-break-player-lombre-opponent-onix", ("opponent", 143)),
    ("LEECH", "ls-ply", 73, "mechanic-leech-seed-player-exeggcute-opponent-onix", None),
    ("LEECH", "ls-opp", 73, "mechanic-leech-seed-opponent-exeggcute-player-onix", None),
    # second batch: Brick Break without a screen, Giga Drain attacker species, Leech Seed defenders, Sandstorm traces run past the end turn
    ("BODY280", "bbn-ply", 280, "mechanic-brick-break-normal-player-lombre-opponent-onix", None),
    ("BODY280", "bbn-opp", 280, "mechanic-brick-break-normal-opponent-lombre-player-onix", None),
    ("BODY280", "bbn-ply-snorlax", 280, "mechanic-brick-break-normal-player-lombre-opponent-onix", ("opponent", 143)),
    ("BODY202", "gd-ply-atk-golbat", 202, "mechanic-giga-drain-player-roselia-opponent-onix", ("player", 42)),
    ("BODY202", "gd-ply-atk-diglett", 202, "mechanic-giga-drain-player-roselia-opponent-onix", ("player", 50)),
    ("BODY202", "gd-opp-atk-golbat", 202, "mechanic-giga-drain-opponent-roselia-player-onix", ("opponent", 42)),
    ("BODY202", "gd-opp-atk-diglett", 202, "mechanic-giga-drain-opponent-roselia-player-onix", ("opponent", 50)),
    ("LEECH", "ls-ply-snorlax", 73, "mechanic-leech-seed-player-exeggcute-opponent-onix", ("opponent", 143)),
    ("LEECH", "ls-ply-golbat", 73, "mechanic-leech-seed-player-exeggcute-opponent-onix", ("opponent", 42)),
    ("LEECH", "ls-opp-snorlax", 73, "mechanic-leech-seed-opponent-exeggcute-player-onix", ("player", 143)),
    ("LEECH", "ls-opp-golbat", 73, "mechanic-leech-seed-opponent-exeggcute-player-onix", ("player", 42)),
    ("WEATHER_VAR", "sand-ply-long", 201, "mechanic-sandstorm-player-phanpy-opponent-onix", ("extend", 900)),
    ("WEATHER_VAR", "sand-opp-long", 201, "mechanic-sandstorm-opponent-phanpy-player-onix", ("extend", 900)),
    ("WEATHER_VAR", "sand-ply-snorlax-long", 201, "mechanic-sandstorm-player-phanpy-opponent-onix", ("extend", 900, "opponent", 143)),
    # third batch: the PRZ / Brick Break / Leech Seed traces run on so a body edge follows the unit (cross-unit replay)
    ("PRZ", "prz-tw-opp-long", 86, "mechanic-thunder-wave-player-flaaffy-opponent-shuckle", ("extend", 600)),
    ("PRZ", "prz-tw-ply-long", 86, "mechanic-thunder-wave-opponent-flaaffy-player-shuckle", ("extend", 600)),
    ("PRZ", "prz-ss-opp-long", 78, "mechanic-stun-spore-player-hoppip-opponent-onix", ("extend", 600)),
    ("BODY280", "bb-ply-long", 280, "mechanic-brick-break-player-lombre-opponent-onix", ("extend", 600)),
    ("BODY280", "bbn-opp-long", 280, "mechanic-brick-break-normal-opponent-lombre-player-onix", ("extend", 600)),
    ("LEECH", "ls-ply-long", 73, "mechanic-leech-seed-player-exeggcute-opponent-onix", ("extend", 600)),
]


def scenario(out: Path, job) -> Path:
    unit, ident, move, base, variant = job
    path = LAB / f"{base}.json"
    if variant is None:
        return path
    data = json.loads(path.read_text())
    if variant[0] == "extend":  # run past the end turn: one more segment of idle frames, then an optional lead species swap
        data["trace"]["segments"].append({"frames": variant[1], "buttons": []})
        variant = variant[2:]
    if variant:
        side, species = variant
        data["overrides"]["parties"][side][0]["species"] = species
    target = out / "scenarios" / f"{ident}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    return target


def run(args):
    out, job, run_id = args
    _, ident, move, _, _ = job
    sc = scenario(out, job)
    dest = out / "raw" / f"{ident}-{run_id}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()
    subprocess.run([sys.executable, "tools/run-mgba-probe.py", str(dest), "--", sys.executable, "tools/compare/spriteOrderEventProbe.py",
                    str(move), str(sc), str(dest)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    log = Path(str(dest) + ".log")
    if log.exists():
        log.unlink()
    return ident, run_id, dest.exists()


if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 8
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    selected = [j for j in JOBS if only is None or j[0] in only]
    for job in selected:
        scenario(out, job)
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(run, [(out, j, r) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "probe runs;", "missing:", missing or "none")
