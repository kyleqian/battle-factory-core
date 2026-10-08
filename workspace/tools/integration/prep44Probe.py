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
