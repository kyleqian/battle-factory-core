"""One Frontier battle transition on the real ROM, every frame (docs/trn225-frontier-transitions.md).

Usage (cwd = workspace/, through tools/run-mgba-probe.py like every mGBA probe):
  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/audio/romFrontierTransition.py OUT.json --seed N [--profile off|on] [--challenge 2]
      [--presses tests/fixtures/noland-room/silver-first.json.gz] [--dump DIR] [--tail 90] [--probe-only] [--sound]

The lab stages the walk-up to Noland (as tools/audio/romNolandScene.py) and replays the presses of a recorded drive (the room's timeline does
not depend on the seed; the seed only moves the transition draw and Noland's team), then runs to the battle's first frames. The transition the
ROM drew is read from the live Task_BattleTransition (tTransitionId, data[1]). OUT.json: the table id, the frame the task is created on (t0),
the frame it is destroyed, the first frame CB2_InitBattle runs, and every frame's picture hash and RNG cursor. --dump DIR writes every frame
from t0 - 4 to the end of the run as rN.rgb (raw RGB888, the oracle's framebuffer); --probe-only stops as soon as the id is known. --sound steps with the m4a hooks (slow) and records the frame the battle BGM (471) is
requested on (bgmFrame), which is the clock the engine knows the transition by; without it the BGM is assumed to start on t0.
"""
import gzip, json, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import romNolandScene as rns  # noqa: E402
import soundEventProbe as sep  # noqa: E402


def main():
    out, rest = Path(sys.argv[1]), sys.argv[2:]
    if out.exists():
        raise SystemExit(f"romFrontierTransition: refusing stale output path (delete it first): {out}")
    opt = lambda name, default=None: rest[rest.index(name) + 1] if name in rest else default  # noqa: E731
    seed = int(opt("--seed"))
    challenge = int(opt("--challenge", "2"))
    scene = opt("--profile", "off")
    presses_path = opt("--presses", "tests/fixtures/noland-room/silver-first.json.gz" if challenge < 5 else "tests/fixtures/noland-room/gold-first.json.gz")
    tail = int(opt("--tail", "90"))
    dump_dir = opt("--dump")
    probe_only = "--probe-only" in rest
    sound = "--sound" in rest
    fixture = json.load(gzip.open(presses_path))["recording"]
    presses = {r["f"]: r["press"] for r in fixture["frames"] if r.get("press")}
    last_press = max(presses)
    if dump_dir:
        Path(dump_dir).mkdir(parents=True, exist_ok=True)
    profile, bootstrap = sep.PROFILES[scene]
    oracle = sep.EmeraldOracle(sep.REF / "pokeemerald.gba", sep.REF / "pokeemerald.map", sep.HARNESS / "oracle/bootstrap" / bootstrap)
    player_sets = [564, 565, 566] if challenge >= 5 else [267, 268, 269]
    request = sep.validate_request({"schemaVersion": 1, "mode": "factoryBrain", "profile": profile, "level": 50, "challengeNum": challenge, "walkup": True,
                                    "playerSetIds": player_sets, "rentalSwapCount": 0, "seed": seed,
                                    "trace": {"segments": [{"frames": 1, "buttons": []}], "captureFrames": [0]}}, profile)
    t_start = time.time()
    lab = sep.BattleLab(oracle, profile)
    lab.prepare(request)
    sc = rns.Scene(oracle, 6, sound)
    nm = rns.nm_symbols()
    task_fn = nm["Task_BattleTransition"][0] & ~1
    init_cb2 = nm["CB2_InitBattle"][0] & ~1
    gtasks = oracle.symbols["gTasks"]
    frames, t0, t_end, init_frame, tid, bgm_frame, n_events = [], None, None, None, None, None, 0
    enemy_party = None
    ring = []
    rng0 = oracle.read_u32(oracle.symbols["gRngValue"])
    frames.append({"f": 0, "sha": sc.sha(), "rng": rng0})
    record = {"symbols": lab._factory_symbol_count(), "heardBrainSpeech": {"silver": 0, "gold": 0}}
    while True:
        f = sc.frame + 1
        sc.step(presses.get(f, []))
        for e in sc.events[n_events:]:
            if bgm_frame is None and e.get("kind") == "bgm" and e.get("id") == 471 and not e.get("noop"):
                bgm_frame = f
        n_events = len(sc.events)
        raw = oracle.screen_rgb()
        row = {"f": f, "sha": sc.sha(), "rng": oracle.read_u32(oracle.symbols["gRngValue"])}
        if presses.get(f):
            row["press"] = presses[f]
        frames.append(row)
        task_id = next((i for i in range(rns.TASK_COUNT)
                        if oracle.read_u8(gtasks + i * rns.TASK_SIZE + 4) and (oracle.read_u32(gtasks + i * rns.TASK_SIZE) & ~1) == task_fn), None)
        if t0 is None:
            if dump_dir:
                ring.append((f, raw))
                ring = ring[-5:]
            if task_id is not None:
                t0 = f
                tid = oracle.read_u16(gtasks + task_id * rns.TASK_SIZE + 8 + 2)
                if probe_only:
                    break
                if dump_dir:
                    for rf, rraw in ring:
                        Path(dump_dir, f"r{rf}.rgb").write_bytes(rraw)
                    ring = []
        else:
            if dump_dir:
                Path(dump_dir, f"r{f}.rgb").write_bytes(raw)
            if task_id is None and t_end is None:
                t_end = f
            if init_frame is None and sc.cb2() == init_cb2:
                init_frame = f
                # Noland's party as CB2_InitBattle will see it (nrv1): species of the three members, the first RNG-dependent thing the battle shows
                enemy_party = [sep.read_party_member(oracle, oracle.symbols["gEnemyParty"] + i * 100)["species"] for i in range(3)]
            if init_frame is not None and f >= init_frame + tail:
                break
        if f > last_press + 600:
            break
    if t0 is not None and bgm_frame is None:
        # The task's first frame is not always the BGM's (seed 7: the BGM came a frame later, and so did the first gray step: --sound runs of seeds
        # 5 and 7 put the BGM exactly two frames before the first changed frame), so the clock is the first changed frame minus two.
        first = frames[t0]["sha"]
        onset = next((r["f"] for r in frames[t0 + 1:] if r["sha"] != first), None)
        bgm_frame = onset - 2 if onset is not None else t0
    if bgm_frame is not None:
        frames[bgm_frame].setdefault("sounds", []).append({"frame": bgm_frame, "kind": "bgm", "id": 471})
    result = {"schema": "rom-frontier-transition/v1", "seed": seed, "scene": scene, "challenge": challenge, "transitionId": tid, "t0": t0,
              "gateK": 6, "win": False, "recordStart": record, "rngStart": rng0,
              "bgmFrame": bgm_frame, "taskEnd": t_end, "initBattleFrame": init_frame, "enemyParty": enemy_party, "lastPress": last_press, "frames": frames, "seconds": round(time.time() - t_start, 1)}
    out.write_text(json.dumps(result, separators=(",", ":")))


if __name__ == "__main__":
    main()
