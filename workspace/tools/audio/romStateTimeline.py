"""aud243b: the ROM's battle state timeline for a lab request (docs/aud243b-rom-replay.md): one row [frame, gCurrentMove, hp0, hp1, rng] per frame where any of
gCurrentMove / the two active battlers' HP / gRngValue changed, over the request's trace window (frame 1 = the first advance after the action menu).
  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/audio/romStateTimeline.py OUT.json REQUEST.json [--profile on|off]"""
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
    request = json.loads(Path(req_path).read_text())
    request["profile"] = profile
    request = validate_request(request, profile)
    BattleLab(oracle, profile).prepare(request)
    sym = oracle.symbols
    mons = sym["gBattleMons"]

    def read():
        return (oracle.read_u16(sym["gCurrentMove"]), oracle.read_u16(mons + 0x28), oracle.read_u16(mons + 0x58 + 0x28),
                oracle.read_u32(sym["gRngValue"]))

    rows, last, frame = [], read(), 0
    rows.append([0, *last])
    for seg in request["trace"]["segments"]:
        for _ in range(seg["frames"]):
            oracle.advance(seg.get("buttons", []))
            frame += 1
            cur = read()
            if cur != last:
                rows.append([frame, *cur])
                last = cur
    out.write_text(json.dumps({"rows": rows}, separators=(",", ":")))


if __name__ == "__main__":
    main()
