# sta3: per-frame gBattlescriptCurrInstr + controller state of a battle-lab request (Scene ON/OFF), for tools/audio/fixtures/sta3-rom-windows.json.
# python3 tools/run-mgba-probe.py OUT.json -- /srv/pokebench/vendor/mgba-venv/bin/python tools/audio/sta3RomWindow.py OUT.json tools/battle-lab/<lab>.json on|off
import json, sys
from pathlib import Path
ROOT = Path.cwd()
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle
from battle_lab import BattleLab, validate_request
REF = (ROOT / "reference/pokeemerald").resolve()
PROFILES = {"on": ("battle-scene-on", "factory.json"), "off": ("battle-scene-off", "factory-battle-scene-off.json")}
out, req_path, prof = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
profile, bootstrap = PROFILES[prof]
oracle = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle/bootstrap" / bootstrap)
request = json.loads(Path(req_path).read_text()); request["profile"] = profile; request.pop("replay", None)
request = validate_request(request, profile)
BattleLab(oracle, profile).prepare(request)
S = oracle.symbols
def rd():
    comm = tuple(oracle.read_u8(S["gBattleCommunication"] + i) for i in range(8))
    return (oracle.read_u32(S["gBattlescriptCurrInstr"]), oracle.read_u32(S["gBattleControllerExecFlags"]), comm,
            oracle.read_u32(S["gBattleMainFunc"]), oracle.read_u8(S["gAnimScriptActive"]),
            tuple(oracle.read_u32(S["gBattlerControllerFuncs"] + 4 * i) for i in range(4)),
            oracle.read_u8(S["gBattlerAttacker"]), oracle.read_u8(S["gActiveBattler"]), oracle.read_u8(S["gCurrentActionFuncId"]))
rows, last, frame = [], None, 0
for seg in request["trace"]["segments"]:
    for _ in range(seg["frames"]):
        oracle.advance(seg.get("buttons", [])); frame += 1
        cur = rd()
        if cur != last: rows.append([frame, *[list(x) if isinstance(x, tuple) else x for x in cur]]); last = cur
out.write_text(json.dumps({"rows": rows}, separators=(",", ":")))
