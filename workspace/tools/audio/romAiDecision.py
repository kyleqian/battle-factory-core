"""aud243c: the ROM's opponent decision state at the lab's first action menu (docs/aud243c-alignment.md).
Reads gBattleResources->ai (AI_ThinkingStruct: score[], aiFlags, simulatedRNG[]), the opponent's controller reply in gBattleBufferB[1]
(CONTROLLER_TWORETURNVALUES, action, move slot | target), gBattleCommunication[0..1], gRandomTurnNumber and gRngValue, and
optionally the per-frame gRngValue changes from new_session() to the menu (--rng-log).
  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/audio/romAiDecision.py OUT.json REQUEST.json [--profile on|off] [--rng-log]"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, validate_request  # noqa: E402

REF = (ROOT / "reference/pokeemerald").resolve()
PROFILES = {"on": ("battle-scene-on", "factory.json"), "off": ("battle-scene-off", "factory-battle-scene-off.json")}
BATTLE_MON_SIZE = 0x58
BUFFER_SIZE = 0x200


def main():
    out, req_path, rest = Path(sys.argv[1]), sys.argv[2], sys.argv[3:]
    profile, bootstrap = PROFILES[rest[rest.index("--profile") + 1] if "--profile" in rest else "on"]
    oracle = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle/bootstrap" / bootstrap)
    request = validate_request(dict(json.loads(Path(req_path).read_text()), profile=profile), profile)
    sym = oracle.symbols
    lab = BattleLab(oracle, profile)
    rng_log = []
    if "--rng-log" in rest:
        advance = oracle.advance

        def logged(buttons):
            before = oracle.read_u32(sym["gRngValue"])
            advance(buttons)
            after = oracle.read_u32(sym["gRngValue"])
            if after != before:
                rng_log.append([oracle.frame, before, after, oracle.read_u16(sym["gRandomTurnNumber"]), oracle.read_u8(sym["gBattleCommunication"]),
                                oracle.read_u8(sym["gBattleCommunication"] + 1)])
        oracle.advance = logged
    lab.prepare(request)
    ai = oracle.read_u32(oracle.read_u32(sym["gBattleResources"]) + 5 * 4)
    mons = sym["gBattleMons"]
    reply = sym["gBattleBufferB"] + BUFFER_SIZE
    out.write_text(json.dumps({
        "rng": oracle.read_u32(sym["gRngValue"]), "randomTurnNumber": oracle.read_u16(sym["gRandomTurnNumber"]),
        "battleCommunication": [oracle.read_u8(sym["gBattleCommunication"] + i) for i in range(2)],
        "ai": {"score": [((oracle.read_u8(ai + 4 + i) + 128) & 0xFF) - 128 for i in range(4)], "aiFlags": oracle.read_u32(ai + 12),
               "simulatedRNG": [oracle.read_u8(ai + 24 + i) for i in range(4)], "movesetIndex": oracle.read_u8(ai + 1),
               "aiAction": oracle.read_u8(ai + 16)},
        "opponentReply": [oracle.read_u8(reply + i) for i in range(4)],
        "opponentMoves": [oracle.read_u16(mons + BATTLE_MON_SIZE + 0x0C + 2 * i) for i in range(4)],
        "rngLog": rng_log,
    }))


if __name__ == "__main__":
    main()
