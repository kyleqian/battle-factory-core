"""aud243b: the ROM's gRandomTurnNumber / gRngValue at the action menu of a lab request (the AI tie-break input the engine's randomTurnNumber models).
  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/audio/romTurnNumber.py OUT.json REQUEST.json [--profile on|off]"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, validate_request  # noqa: E402

REF = (ROOT / "reference/pokeemerald").resolve()
PROFILES = {"on": ("battle-scene-on", "factory.json"), "off": ("battle-scene-off", "factory-battle-scene-off.json")}


def main():
    out, req_path, rest = Path(sys.argv[1]), sys.argv[2], sys.argv[3:]
    profile, bootstrap = PROFILES[rest[rest.index("--profile") + 1] if "--profile" in rest else "on"]
    oracle = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle/bootstrap" / bootstrap)
    request = validate_request(dict(json.loads(Path(req_path).read_text()), profile=profile), profile)
    BattleLab(oracle, profile).prepare(request)
    sym = oracle.symbols
    out.write_text(json.dumps({"randomTurnNumber": oracle.read_u16(sym["gRandomTurnNumber"]), "rng": oracle.read_u32(sym["gRngValue"])}))


if __name__ == "__main__":
    main()
