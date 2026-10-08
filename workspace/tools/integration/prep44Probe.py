#!/usr/bin/env python3
"""prep44: allocator net-zero probes for the census's top invalidating move bodies (docs/next-adapters-prep44.md).

usage: prep44Probe.py <out-dir> [--jobs N] [--list]
Runs tools/compare/allocatorNetZeroProbe.py (unchanged; the net-zero audit's probe and definition) twice in fresh processes
per (move, scenario) into <out-dir>/raw/<move>-<scenario-stem>-{0,1}.json. Scenarios are EXISTING accepted battle-lab scenarios
(no staging); the orientation is the side whose lead's four moves carry the move. Direct mGBA only (never the HTTP oracles).
Needs the mGBA venv: PYTHONPATH=<vendor>/libmgba-py, run with <vendor>/mgba-venv/bin/python or a python with mgba importable.
"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LAB = ROOT / "tools/battle-lab"
# Census rank order (fixtures/prep44/census-before-seeds0-299.json allocatorInvalidatingUnits), body units only.
MOVES = [
    (266, "FOLLOW_ME", ["mechanic-follow-me-player-togetic-opponent-onix", "mechanic-follow-me-opponent-togetic-player-onix"]),
    (104, "DOUBLE_TEAM", ["s10aside-double-team-player-onix-opponent-golbat", "s10aside-double-team-opponent-grovyle-player-onix"]),
    (58, "ICE_BEAM", ["mechanic-ice-beam-player-delcatty-opponent-shuckle", "mechanic-ice-beam-opponent-delcatty-player-shuckle"]),
    (225, "DRAGONBREATH", ["mechanic-dragon-breath-player-onix-opponent-murkrow", "mechanic-dragon-breath-opponent-onix-player-murkrow",
                           "fixtures/prep44/scenarios/dragon-breath-opponent-long"]),
    (332, "AERIAL_ACE", ["mechanic-aerial-ace-player-pidgeotto-onix", "mechanic-aerial-ace-pidgeotto-onix"]),
    (98, "QUICK_ATTACK", ["mechanic-quick-attack-player-pidgeotto-onix", "mechanic-quick-attack-pidgeotto-onix"]),
    (322, "COSMIC_POWER", ["mechanic-cosmic-power-player-lunatone-opponent-onix", "mechanic-cosmic-power-opponent-lunatone-player-onix"]),
    (157, "ROCK_SLIDE", ["s10aside-rock-slide-player-onix-opponent-grovyle", "fixtures/prep44/scenarios/rock-slide-opponent-onix-player-grovyle"]),
    (196, "ICY_WIND", ["mechanic-icy-wind-player-swinub-opponent-onix", "mechanic-icy-wind-opponent-swinub-player-onix"]),
    (352, "WATER_PULSE", ["mechanic-water-pulse-player-lombre-opponent-onix", "mechanic-water-pulse-opponent-lombre-player-onix"]),
    (85, "THUNDERBOLT", ["mechanic-thunderbolt-player-delcatty-opponent-shuckle", "mechanic-thunderbolt-opponent-delcatty-player-shuckle"]),
    (185, "FAINT_ATTACK", ["species-audit-golem-prep6-faint-attack-alt-base", "s10aside-faint-attack-opponent-grovyle-player-onix"]),
    (73, "LEECH_SEED", ["mechanic-leech-seed-player-exeggcute-opponent-onix", "mechanic-leech-seed-opponent-exeggcute-player-onix"]),
    (203, "ENDURE", ["mechanic-endure-player-eevee-opponent-onix", "mechanic-endure-opponent-eevee-player-onix"]),
    (89, "EARTHQUAKE", ["mechanic-earthquake-player-dugtrio-opponent-onix", "mechanic-earthquake-opponent-dugtrio-player-onix"]),
    (263, "FACADE", ["mechanic-facade-player-azumarill-opponent-onix", "mechanic-facade-opponent-azumarill-player-onix"]),
    (57, "SURF", ["mechanic-surf-player-wartortle-opponent-shuckle", "mechanic-surf-opponent-wartortle-player-shuckle"]),
    (240, "RAIN_DANCE", ["mechanic-rain-dance-player-wooper-opponent-onix", "mechanic-rain-dance-opponent-wooper-player-onix"]),
    (189, "MUD_SLAP", ["mechanic-mud-slap-player-pidgeotto-onix", "mechanic-mud-slap-pidgeotto-onix"]),
    (24, "DOUBLE_KICK", ["mechanic-double-kick-player-nidorina-opponent-onix", "mechanic-double-kick-opponent-nidorina-player-onix"]),
    (60, "PSYBEAM", ["mechanic-psybeam-player-spinda-opponent-onix", "mechanic-psybeam-opponent-spinda-player-onix"]),
    # Tier 2: next bodies by chain involvement (fixtures/prep44/chains-before-seeds0-299.json units), existing scenarios.
    (91, "DIG", ["mechanic-dig-player-vibrava-opponent-chansey", "mechanic-dig-opponent-vibrava-player-chansey"]),
    (258, "HAIL", ["mechanic-hail-player-delibird-opponent-onix", "mechanic-hail-opponent-delibird-player-onix"]),
    (184, "SCARY_FACE", ["mechanic-scary-face-player-rhyhorn-opponent-shuckle", "mechanic-scary-face-opponent-rhyhorn-player-shuckle"]),
    (28, "SAND_ATTACK", ["mechanic-sand-attack-player-pidgeotto-onix", "mechanic-sand-attack-pidgeotto-onix"]),
    (345, "MAGICAL_LEAF", ["mechanic-magical-leaf-player-roselia-opponent-onix", "mechanic-magical-leaf-opponent-roselia-player-onix"]),
    (273, "WISH", ["mechanic-wish-player-illumise-opponent-onix", "mechanic-wish-opponent-illumise-player-onix"]),
    (59, "BLIZZARD", ["mechanic-blizzard-player-pelipper-opponent-onix", "mechanic-blizzard-opponent-pelipper-player-onix"]),
    (142, "LOVELY_KISS", ["mechanic-lovely-kiss-player-jynx-opponent-onix", "mechanic-lovely-kiss-opponent-jynx-player-onix"]),
    (313, "FAKE_TEARS", ["mechanic-fake-tears-player-delcatty-opponent-shuckle", "mechanic-fake-tears-opponent-delcatty-player-shuckle"]),
    (86, "THUNDER_WAVE", ["mechanic-thunder-wave-player-flaaffy-opponent-shuckle", "mechanic-thunder-wave-opponent-flaaffy-player-shuckle"]),
    (202, "GIGA_DRAIN", ["mechanic-giga-drain-player-roselia-opponent-onix", "elevated-postbody-golbat-prep9-giga-drain-opponent"]),
    (53, "FLAMETHROWER", ["mechanic-flamethrower-player-onix-opponent-murkrow", "mechanic-flamethrower-opponent-onix-player-murkrow"]),
    (219, "SAFEGUARD", ["mechanic-safeguard-player-bayleef-opponent-onix", "mechanic-safeguard-opponent-bayleef-player-onix"]),
    (317, "ROCK_TOMB", ["mechanic-rock-tomb-player-grimer-opponent-onix", "mechanic-rock-tomb-opponent-grimer-player-onix"]),
    (173, "SNORE", ["mechanic-snore-player-sealeo-opponent-venomoth", "mechanic-snore-opponent-sealeo-player-venomoth"]),
    (248, "FUTURE_SIGHT", ["mechanic-future-sight-kadabra-onix", "mechanic-future-sight-opponent-kadabra-player-onix"]),
    (315, "OVERHEAT", ["lb21-oh2-p-growl", "lb21-oh2-o-growl"]),
    (52, "EMBER", ["mechanic-ember-player-onix-opponent-murkrow", "mechanic-ember-opponent-onix-player-murkrow"]),
    (236, "MOONLIGHT", ["mechanic-moonlight-player-gloom-opponent-onix", "mechanic-moonlight-opponent-gloom-player-onix"]),
    (250, "WHIRLPOOL", ["mechanic-status-whirlpool-player-wailmer-opponent-onix", "mechanic-status-whirlpool-opponent-wailmer-player-onix"]),
    (340, "BOUNCE", ["mechanic-bounce-player-spoink-onix", "mechanic-bounce-paralysis-spoink-onix"]),
    (226, "BATON_PASS", ["mechanic-baton-pass-player-aipom-opponent-onix", "mechanic-baton-pass-opponent-aipom-player-onix"]),
    (35, "WRAP", ["mechanic-wrap-player-tentacool-opponent-onix", "mechanic-wrap-opponent-tentacool-player-onix"]),
    (129, "SWIFT", ["mechanic-swift-player-staryu-opponent-onix", "elevated-postbody-pidgeot-prep8-swift-opponent"]),
    (80, "PETAL_DANCE", ["mechanic-petal-dance-player-gloom-opponent-onix", "mechanic-petal-dance-opponent-gloom-player-onix"]),
    (282, "KNOCK_OFF", ["mechanic-knock-off-shuppet-onix", "mechanic-knock-off-opponent-shuppet-player-onix"]),
    (133, "AMNESIA", ["mechanic-amnesia-player-torkoal-opponent-onix", "mechanic-amnesia-opponent-torkoal-player-onix"]),
    (291, "DIVE", ["mechanic-dive-player-chinchou-opponent-onix", "mechanic-dive-opponent-chinchou-player-onix"]),
    (19, "FLY", ["mechanic-fly-player-murkrow-onix", "mechanic-fly-murkrow-onix"]),
    (212, "MEAN_LOOK", ["mechanic-mean-look-player-murkrow-opponent-onix", "mechanic-mean-look-opponent-murkrow-player-onix"]),
]


def scenario(stem: str) -> Path:
    return ROOT / "tools/integration" / f"{stem}.json" if "/" in stem else LAB / f"{stem}.json"


def orientation(move: int, stem: str) -> str:
    o = json.loads(scenario(stem).read_text())["overrides"]
    lead = {s: (o["parties"][s][0] if "parties" in o else o["battlers"].get(s, {})).get("moves", []) for s in ("player", "opponent")}
    sides = [s for s in ("player", "opponent") if move in lead[s]]
    return "+".join(sides) or "none"


def jobs():
    return [(mid, name, stem, orientation(mid, stem)) for mid, name, stems in MOVES for stem in stems]


if __name__ == "__main__":
    out = Path(sys.argv[1]); raw = out / "raw"
    n = int(sys.argv[sys.argv.index("--jobs") + 1]) if "--jobs" in sys.argv else 8
    if "--list" in sys.argv:
        for j in jobs(): print(*j)
        raise SystemExit(0)
    raw.mkdir(parents=True, exist_ok=True)

    def run(job):
        mid, _, stem, _ = job
        for i in (0, 1):
            dst = raw / f"{mid}-{Path(stem).name}-{i}.json"
            r = subprocess.run([sys.executable, str(ROOT / "tools/compare/allocatorNetZeroProbe.py"), str(mid),
                                str(scenario(stem)), str(dst)], cwd=ROOT, capture_output=True, text=True)
            if r.returncode != 0 or not dst.is_file():
                (raw / f"{mid}-{Path(stem).name}-{i}.error.txt").write_text(r.stderr[-1500:])
                return job, f"FAIL run{i} rc {r.returncode}"
        return job, "ok"

    with ThreadPoolExecutor(n) as ex:
        for job, status in ex.map(run, jobs()):
            print(job[0], job[2], job[3], status, flush=True)
