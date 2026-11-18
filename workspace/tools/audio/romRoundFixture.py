"""Round replay fixture (docs/parity-mac/round-replay.md, tests/parityMacRoundReplayFixtures.test.ts): one recorded real-ROM run, kept small enough for git.

Usage (cwd = workspace/): python3 tools/audio/romRoundFixture.py RUN NAME --note TEXT [--symbols 0|1] [--draft first|strongest] [--swap-override N:LIST]
  RUN is a tools/audio/romRoundReplay.sh output prefix (RUN.drive.json, RUN.d/setup-N.json, RUN.d/engine.json, RUN.cmp.json).
  Writes tests/fixtures/round-replay/NAME.json.gz.

Kept: the run's options; per battle the setup fields the engine reads (`soundCensusRomReplay.ts round`: the snapshot's RNG, both active battlers' HP and
status, both parties, the turn number, the opponent's reply and simulated AI RNG, the last moves, the round facts, battle 1's lab descriptor); per battle
the ROM drive fields `round-compare` reads (the wide states, the final wide state, the stop reason, the outcome, the swap record) and, of the ROM timeline,
the rows the recorded engine's turn states were found at (the turn compare looks the engine's states up in order: the ROM's state after every turn);
the alignment k and the try of every battle (so the replay needs no search). The recording must match in every check but the known one (finding 47).
If the engine's timeline ever records finer states than one per turn change, record the fixture again from a fresh run.
"""
import gzip, json, sys
from pathlib import Path

SETUP_KEYS = ("randomTurnNumber", "opponentReply", "opponentAiSimulatedRng", "lastMoves", "round")
DRIVE_KEYS = ("wide", "finalWide", "stop", "outcome", "frames")


def matched_rom_rows(engine_timeline, rom_timeline):
    key = lambda r: tuple(r[2:7])  # noqa: E731  (soundCensusRomReplay.ts compareBattle)
    at, keep = 0, []
    for row in engine_timeline[1:]:
        found = next((i for i in range(at, len(rom_timeline)) if key(rom_timeline[i]) == key(row)), None)
        if found is None:
            raise SystemExit(f"romRoundFixture: an engine state is not on the ROM timeline: {row}")
        if not keep or keep[-1] != found:
            keep.append(found)
        at = found
    return [rom_timeline[i] for i in keep]


def main():
    run, name, rest = sys.argv[1], sys.argv[2], sys.argv[3:]
    opt = lambda k, d=None: rest[rest.index(k) + 1] if k in rest else d  # noqa: E731
    drive = json.loads(Path(f"{run}.drive.json").read_text())
    engine = json.loads(Path(f"{run}.d/engine.json").read_text())
    cmp = json.loads(Path(f"{run}.cmp.json").read_text())
    if not cmp.get("matchExceptKnown"):
        raise SystemExit("romRoundFixture: the run does not match (but for the known difference); not a fixture")
    battles = engine["battles"]
    if len(battles) != len(drive["battles"]):
        raise SystemExit("romRoundFixture: engine and ROM battle counts differ")
    setups, rom = [], []
    for n, (b, d) in enumerate(zip(battles, drive["battles"])):
        s = json.loads(Path(f"{run}.d/setup-{n}.json").read_text())
        snap = s["snapshot"]
        kept = {"snapshot": {"rngValue": snap["rngValue"], "parties": snap["parties"],
                             "battlers": {side: {k: snap["battlers"][side][k] for k in ("hp", "maxHp", "status1")} for side in ("player", "opponent")}},
                **{k: s[k] for k in SETUP_KEYS}}
        if n == 0:
            kept["descriptor"] = s["descriptor"]
        setups.append(kept)
        between = d.get("between") or {}
        rom.append({"drive": {**{k: d["drive"][k] for k in DRIVE_KEYS}, "timeline": matched_rom_rows(b["timeline"], d["drive"]["timeline"])},
                    "between": {k: between[k] for k in ("newRound", "swap", "swapPrompt") if k in between} or None})
    fixture = {
        "schema": "round-replay-fixture/v1", "name": name, "note": opt("--note", ""),
        "recordedFrom": {"run": Path(run).name, "engineSeconds": None},
        "options": {"seed": drive["seed"], "scene": drive["scene"], "policy": drive["policy"], "swap": drive["swap"], "challenge": drive["challenge"],
                    "symbols": int(opt("--symbols", "0")), "draft": opt("--draft", "first"), "swapOverride": opt("--swap-override", "")},
        "knownK": [b["engineDrawsBeforeActionMenu"] for b in battles], "playerVariants": [b.get("playerVariant", 0) for b in battles],
        "expect": {"battles": len(battles), "knownDifferences": sum(1 for b in cmp["battles"] if b.get("knownDifference"))},
        "setups": setups, "rom": rom,
    }
    out = Path("tests/fixtures/round-replay") / f"{name}.json.gz"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(gzip.compress(json.dumps(fixture, separators=(",", ":")).encode(), mtime=0))
    print(f"{out}: {len(battles)} battles, {out.stat().st_size} bytes")


if __name__ == "__main__":
    main()
