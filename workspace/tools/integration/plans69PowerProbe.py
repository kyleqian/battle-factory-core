#!/usr/bin/env python3
"""plans69: gAnimMovePower at every Magnitude 222 body start (direct mGBA, Scene ON lab; never the HTTP oracles).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): plans69PowerProbe.py <out-dir> [--jobs J=12]
Runs every plans69Probe MAGNITUDE job twice in separate fresh mGBA processes (tools/run-mgba-probe.py) -> power/<id>-A.json / -B.json:
{"bodies": [{"n": frame, "power": gAnimMovePower}]} for each frame where gAnimScriptActive rises with sAnimMoveIndex == 222 (the
frame counter n is spriteOrderEventProbe.py's, so it equals the unit's "frame" in units.json). Move_MAGNITUDE's branch is
AnimTask_IsPowerOver99 (battle_anim_effects_3.c: gBattleAnimArgs[15] = gAnimMovePower > 99).
Inner mode (run by run-mgba-probe.py): plans69PowerProbe.py --inner <scenario.json> <output.json>
"""
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path


def inner(scenario: Path, output: Path):
    root = Path(__file__).resolve().parents[2]
    harness = next(p for p in (root, *root.parents) if (p / "oracle" / "emerald_core.py").is_file())
    sys.path.insert(0, str(harness / "oracle"))
    from battle_lab import BattleLab, validate_request
    from emerald_core import EmeraldOracle
    request = validate_request(json.loads(scenario.read_text()), "battle-scene-on")
    ref = root / "reference" / "pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", harness / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    nm = subprocess.run(["arm-none-eabi-nm", "-a", "-n", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    names = {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}
    u8 = oracle.read_u8
    u16 = lambda a: u8(a) | u8(a + 1) << 8
    state = {"n": 0, "act": 0}
    bodies = []
    orig = oracle.advance

    def advance(buttons):
        r = orig(buttons)
        state["n"] += 1
        act = u8(names["gAnimScriptActive"])
        if act and not state["act"] and u16(names["sAnimMoveIndex"]) == 222:
            bodies.append({"n": state["n"], "power": u16(names["gAnimMovePower"])})
        state["act"] = act
        return r
    oracle.advance = advance
    lab.prepare(request)
    for seg in request["trace"]["segments"]:
        for _ in range(seg["frames"]):
            advance(seg.get("buttons", []))
    output.write_text(json.dumps({"schema": "plans69-power/v1", "bodies": bodies}, separators=(",", ":")) + "\n")


def run(args):
    out, job, run_id = args
    sys.path.insert(0, "tools/integration")
    import plans69Probe as J
    sc = J.scenario(out, job)
    dest = out / "power" / f"{job[1]}-{run_id}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()
    subprocess.run([sys.executable, "tools/run-mgba-probe.py", str(dest), "--", sys.executable, __file__, "--inner", str(sc), str(dest)],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    log = Path(str(dest) + ".log")
    if log.exists():
        log.unlink()
    return job[1], run_id, dest.exists()


if __name__ == "__main__":
    argv = sys.argv[1:]
    if argv[0] == "--inner":
        inner(Path(argv[1]), Path(argv[2]))
        sys.stdout.flush()
        os._exit(0)
    sys.path.insert(0, "tools/integration")
    import plans69Probe as J
    out = Path(argv[0])
    n = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 12
    selected = [j for j in J.JOBS if j[0] == "MAGNITUDE"]
    with ThreadPoolExecutor(n) as ex:
        results = list(ex.map(run, [(out, j, r) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "power runs;", "missing:", missing or "none")
