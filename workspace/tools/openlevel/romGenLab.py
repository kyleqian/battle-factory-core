"""ROM generation lab (tools/openlevel/README.md): the real ROM's Battle Factory deal (six rentals, then the opponent roll) and, with --build,
the draft screen's six built Pokemon, for given game inputs and RNG cursors, at Level 50 or Open Level.

Usage (cwd = workspace/):
  python3 tools/openlevel/romGenLab.py SAMPLES.json OUT.json [--build] [--keep-vblank]

SAMPLES.json: a list of {lvlMode: 0|1, winStreak, rentsCount, battleNum, dealCursor, opponentCursor?, constructionCursor?,
towerLv50Streak?, priorTrainerIds?, name?} (cursors are gRngValue as a number or a "0x..." string).

Method. Each level mode runs in its own child process (a second mGBA core in one process crashes). The child loads the level's bootstrap
(factory.json or factory-open.json) state saved just before frame 5795, the frame of the PreBattleRoom deal (cached under
.integration/openlevel-cache/), and per sample:
  1. writes the inputs the real game holds there: factoryWinStreaks[0][lvlMode], factoryRentsCount[0][lvlMode],
     curChallengeBattleNum, and if given towerWinStreaks[0][0] and trainerIds[0..battleNum-1]. lvlMode is never written: it is the
     profile's own (the OPEN LEVEL / LV. 50 choice in the Lobby). Outcomes are never written;
  2. steps the deal frame(s) instruction by instruction: at GenerateInitialRentalMons' entry gRngValue = dealCursor; at
     GenerateOpponentMons' entry gRngValue = opponentCursor when given (else the ROM's own, right after the six rentals); while inside
     either function a VBlankIntr Random() is undone (gRngValue put back at its return, as romRun.py's brain_traps); frames are stepped
     until GenerateOpponentMons returns, so a frame boundary between the two is handled;
  3. reads the six rental set ids, the trainer (gTrainerBattleOpponent_A and trainerIds[battleNum]), the three opponent set ids
     (gFrontierTempParty), gRngValue at each entry and return, and the trapped arguments / results of GetNumPastRentalsRank,
     GetFactoryMonId and GetRandomScaledFrontierTrainerId.
  4. --build: plays on with the bootstrap's own inputs (the attendant's comment pages; A taps every 66 frames after them if the script
     is late) until CreateFrontierFactorySelectableMons has run: at its entry gRngValue = constructionCursor when given (else the ROM's
     own), VBlankIntr draws inside it undone (--keep-vblank: kept, as the real game), then the six select-screen Pokemon are read.
Writes OUT.json: {"samples": [{inputs, rom results}], "seconds", ...}.
"""
import json, os, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEAL_FRAME = 5795  # 0-indexed frame of the deal in both bootstraps (bootCheck.py, oracle/BOOTSTRAP.md "Open Level profiles")
PROFILE_FOR_LEVEL = {0: "lv50-on", 1: "open-on"}  # the scene option is inert before battle; the deal and the draft build precede the OFF poke
INPUT_KEYS = ("name", "lvlMode", "winStreak", "rentsCount", "battleNum", "dealCursor", "opponentCursor", "constructionCursor",
              "towerLv50Streak", "priorTrainerIds")
MAX_DEAL_FRAMES, MAX_BUILD_FRAMES = 8, 2400


def num(v):
    if v is None:
        return None
    return int(v, 0) if isinstance(v, str) else int(v)


def validate(samples):
    out = []
    for i, s in enumerate(samples):
        bad = set(s) - set(INPUT_KEYS)
        if bad:
            raise SystemExit(f"sample {i}: unknown keys {sorted(bad)}")
        for k in ("lvlMode", "winStreak", "rentsCount", "battleNum", "dealCursor"):
            if k not in s:
                raise SystemExit(f"sample {i}: missing {k}")
        if s["lvlMode"] not in (0, 1):
            raise SystemExit(f"sample {i}: lvlMode must be 0 (Level 50) or 1 (Open Level)")
        if not 0 <= int(s["battleNum"]) <= 6:
            raise SystemExit(f"sample {i}: battleNum must be 0..6")
        if not 0 <= int(s["winStreak"]) <= 0xFFFF or not 0 <= int(s["rentsCount"]) <= 0xFFFF:
            raise SystemExit(f"sample {i}: winStreak / rentsCount are u16")
        prior = s.get("priorTrainerIds")
        if prior is not None and len(prior) > int(s["battleNum"]):
            raise SystemExit(f"sample {i}: priorTrainerIds holds the earlier battles' trainers (at most battleNum of them)")
        out.append(dict(s, index=i))
    return out


# -- child: one level mode, one mGBA core ------------------------------------------------------------------------------------------------
def child(level, samples, build, keep_vblank):
    sys.path.insert(0, str(HERE))
    import hashlib
    from romlib import Rom, SB2_BATTLE_NUM, SB2_TRAINER_IDS, SB2_FACTORY_STREAK, SB2_FACTORY_RENTS, SB2_TOWER_STREAK_SINGLES_50, WORKSPACE
    rom = Rom(PROFILE_FOR_LEVEL[level])
    key = hashlib.sha256(json.dumps(rom.spec, sort_keys=True).encode()).hexdigest()[:12]
    cache = WORKSPACE / ".integration/openlevel-cache" / f"{rom.path.stem}-{key}-f{DEAL_FRAME}.state"
    t0 = time.time()
    if cache.is_file():
        rom.load(cache.read_bytes(), DEAL_FRAME)
        state = cache.read_bytes()
        boot = {"stateFrom": str(cache), "seconds": round(time.time() - t0, 2)}
    else:
        rom.replay(upto=DEAL_FRAME)
        state = rom.state()
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_bytes(state)
        boot = {"stateBuilt": str(cache), "seconds": round(time.time() - t0, 2)}
    frames, scripted, _ = rom.timeline()
    f, s = rom.f, rom.s
    results = []
    for smp in samples:
        t1 = time.time()
        rom.load(state, DEAL_FRAME)
        s2 = rom.sb2()
        if rom.frontier()["lvlMode"] != level:
            raise SystemExit(f"bootstrap {rom.path.name} is not lvlMode {level}")
        rom.w16(s2 + SB2_FACTORY_STREAK + 2 * level, int(smp["winStreak"]))
        rom.w16(s2 + SB2_FACTORY_RENTS + 2 * level, int(smp["rentsCount"]))
        rom.w16(s2 + SB2_BATTLE_NUM, int(smp["battleNum"]))
        if smp.get("towerLv50Streak") is not None:
            rom.w16(s2 + SB2_TOWER_STREAK_SINGLES_50, int(smp["towerLv50Streak"]))
        for i, tid in enumerate(smp.get("priorTrainerIds") or []):
            rom.w16(s2 + SB2_TRAINER_IDS + 2 * i, int(tid))
        before = rom.frontier()
        rec = {"inputs": {k: smp.get(k) for k in INPUT_KEYS if smp.get(k) is not None}, "index": smp["index"],
               "romBefore": {k: before[k] for k in ("trainerIds", "factoryWinStreaks", "factoryRentsCount", "towerWinStreakSingles50", "battleNum")}}
        st = {"deal": None, "dealRet": None, "opp": None, "oppRet": None, "rank": [], "monIdCalls": [], "trainerRolls": [],
              "vblankUndone": {"deal": 0, "opponent": 0, "construction": 0}, "drawsInside": {"deal": 0, "opponent": 0, "construction": 0},
              "build": None, "buildRet": None}
        inside = []  # names of the open watched functions (innermost last)
        traps = {}

        def ret_trap(name, on_ret):
            lr = rom.reg(14)
            ret = (lr & ~1) + 2

            def cb():
                traps.pop(ret, None)
                on_ret()
            traps[ret] = cb

        def at_girm():
            if st["deal"] is not None:
                return
            st["deal"] = {"frame": rom.frameno, "romRng": rom.rng()}
            rom.w32(s["gRngValue"], num(smp["dealCursor"]) & 0xFFFFFFFF)
            inside.append("deal")

            def done():
                st["dealRet"] = {"frame": rom.frameno, "rng": rom.rng(), "setIds": [r["setId"] for r in rom.rentals()]}
                inside.remove("deal")
            ret_trap("GenerateInitialRentalMons", done)

        def at_gom():
            if st["opp"] is not None or st["dealRet"] is None:
                return
            st["opp"] = {"frame": rom.frameno, "romRng": rom.rng(), "trainerIdsBefore": rom.frontier()["trainerIds"]}
            if smp.get("opponentCursor") is not None:
                rom.w32(s["gRngValue"], num(smp["opponentCursor"]) & 0xFFFFFFFF)
            st["opp"]["rngUsed"] = rom.rng()
            inside.append("opponent")

            def done():
                st["oppRet"] = {"frame": rom.frameno, "rng": rom.rng()}
                inside.remove("opponent")
            ret_trap("GenerateOpponentMons", done)

        def at_rank():
            ret_trap("GetNumPastRentalsRank", lambda: st["rank"].append({"in": inside[-1] if inside else None, "result": rom.reg(0)}))

        def at_monid():
            st["monIdCalls"].append((inside[-1] if inside else None, rom.reg(0) & 0xFF, rom.reg(1) & 0xFF, rom.reg(2) & 0xFF))

        def at_trainer():
            args = (rom.reg(0) & 0xFF, rom.reg(1) & 0xFF)
            ret_trap("GetRandomScaledFrontierTrainerId", lambda: st["trainerRolls"].append(
                {"challengeNum": args[0], "battleNum": args[1], "trainerId": rom.reg(0) & 0xFFFF}))

        def at_random():
            if not inside:
                return
            where = inside[-1]
            lr = rom.reg(14)
            if not rom.in_vblank(lr):
                st["drawsInside"][where] += 1
                return
            if where == "construction" and keep_vblank:
                st["drawsInside"][where] += 1
                return
            before_rng = rom.rng()
            ret = (lr & ~1) + 2

            def restore():
                rom.w32(s["gRngValue"], before_rng)
                st["vblankUndone"][where] += 1
                traps.pop(ret, None)
            traps[ret] = restore

        traps.update({f["GenerateInitialRentalMons"] + 2: at_girm, f["GenerateOpponentMons"] + 2: at_gom,
                      f["GetNumPastRentalsRank"] + 2: at_rank, f["GetFactoryMonId"] + 2: at_monid,
                      f["GetRandomScaledFrontierTrainerId"] + 2: at_trainer, f["Random"] + 2: at_random})
        n = 0
        while st["oppRet"] is None:
            if n >= MAX_DEAL_FRAMES:
                raise SystemExit(f"sample {smp['index']}: the deal did not finish within {MAX_DEAL_FRAMES} frames ({st})")
            rom.frame(frames[rom.frameno], traps)
            n += 1
        fr = rom.frontier()
        bn = int(smp["battleNum"])
        rec["deal"] = {
            "rentalSetIds": st["dealRet"]["setIds"],
            "rentalRank": [r["result"] for r in st["rank"] if r["in"] == "deal"],
            "getFactoryMonIdArgs": sorted({(c[1], c[2], c[3]) for c in st["monIdCalls"] if c[0] == "deal"}),
            "draws": st["drawsInside"]["deal"], "vblankUndone": st["vblankUndone"]["deal"],
            "entry": {"frame": st["deal"]["frame"], "romRng": hex(st["deal"]["romRng"]), "rng": hex(num(smp["dealCursor"]) & 0xFFFFFFFF)},
            "return": {"frame": st["dealRet"]["frame"], "rng": hex(st["dealRet"]["rng"])},
        }
        rec["opponent"] = {
            "trainerId": fr["trainer"], "trainerIdsSlot": fr["trainerIds"][bn] if bn < 6 else None,
            "opponentSetIds": fr["opponentSetIds"], "trainerRolls": st["trainerRolls"],
            "getFactoryMonIdArgs": sorted({(c[1], c[2], c[3]) for c in st["monIdCalls"] if c[0] == "opponent"}),
            "draws": st["drawsInside"]["opponent"], "vblankUndone": st["vblankUndone"]["opponent"],
            "trainerIdsBefore": st["opp"]["trainerIdsBefore"],
            "entry": {"frame": st["opp"]["frame"], "romRng": hex(st["opp"]["romRng"]), "rng": hex(st["opp"]["rngUsed"]),
                      "sameFrameAsDeal": st["opp"]["frame"] == st["deal"]["frame"]},
            "return": {"frame": st["oppRet"]["frame"], "rng": hex(st["oppRet"]["rng"])},
        }
        if build:
            rec["build"] = run_build(rom, smp, st, traps, inside, frames, scripted)
        rec["seconds"] = round(time.time() - t1, 2)
        results.append(rec)
    return {"boot": boot, "results": results}


def run_build(rom, smp, st, traps, inside, frames, scripted):
    f, s = rom.f, rom.s

    def at_cffsm():
        if st["build"] is not None:
            return
        st["build"] = {"frame": rom.frameno, "romRng": rom.rng()}
        if smp.get("constructionCursor") is not None:
            rom.w32(s["gRngValue"], num(smp["constructionCursor"]) & 0xFFFFFFFF)
        st["build"]["rngUsed"] = rom.rng()
        inside.append("construction")
        lr = rom.reg(14)
        ret = (lr & ~1) + 2

        def done():
            traps.pop(ret, None)
            st["buildRet"] = {"frame": rom.frameno, "rng": rom.rng()}
            inside.remove("construction")
        traps[ret] = done
    traps[f["CreateFrontierFactorySelectableMons"] + 2] = at_cffsm
    selscr = rom.d["sFactorySelectScreen"]
    late_taps = 0
    n = 0
    while st["buildRet"] is None:
        if n >= MAX_BUILD_FRAMES:
            raise SystemExit(f"sample {smp['index']}: the draft screen was not built within {MAX_BUILD_FRAMES} frames")
        if rom.frameno < scripted:
            buttons = frames[rom.frameno]
        else:  # the script is later than the bootstrap's own: tap A (6 frames) every 66 frames
            k = (rom.frameno - scripted) % 66
            buttons = ("A",) if k < 6 else ()
            late_taps += k == 0
        if st["build"] is not None or rom.u32(selscr):
            rom.frame(buttons, traps)  # the select screen exists: step until its six are built
        else:
            pre, n0 = rom.state(), rom.frameno
            rom.fast(buttons)
            if rom.u32(selscr):  # allocated during this frame: run it again, stepped
                rom.load(pre, n0)
                rom.frame(buttons, traps)
        n += 1
    mons = rom.select_mons()
    return {
        "mons": [{k: m[k] for k in ("setId", "speciesName", "species", "personality", "nature", "level", "experience", "ivs", "evs", "stats",
                                    "hp", "moves", "moveNames", "pp", "heldItem", "heldItemName", "abilityNum", "friendship", "otId",
                                    "checksumOk")} for m in mons],
        "entry": {"frame": st["build"]["frame"], "romRng": hex(st["build"]["romRng"]), "rng": hex(st["build"]["rngUsed"])},
        "return": {"frame": st["buildRet"]["frame"], "rng": hex(st["buildRet"]["rng"])},
        "rentalRank": [r["result"] for r in st["rank"] if r["in"] == "construction"],
        "draws": st["drawsInside"]["construction"], "vblankUndone": st["vblankUndone"]["construction"],
        "lateATaps": late_taps,
    }


# -- parent ------------------------------------------------------------------------------------------------------------------------------
def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    if "--child" in flags:
        level, inp, out = int(args[0]), Path(args[1]), Path(args[2])
        payload = json.loads(inp.read_text())
        res = child(level, payload["samples"], payload["build"], payload["keepVblank"])
        out.write_text(json.dumps(res))
        sys.stdout.flush()
        os._exit(0)  # skip libmgba-py's teardown (it can segfault after the work is done)
    if len(args) != 2:
        raise SystemExit(__doc__)
    t0 = time.time()
    samples = validate(json.loads(Path(args[0]).read_text()))
    out_path = Path(args[1])
    build, keep = "--build" in flags, "--keep-vblank" in flags
    tmp = out_path.parent / (out_path.name + ".parts")
    tmp.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ)
    vendor = next((p / "vendor/libmgba-py" for p in HERE.parents if (p / "vendor/libmgba-py").is_dir()), None)
    if vendor and str(vendor) not in env.get("PYTHONPATH", ""):
        env["PYTHONPATH"] = f"{vendor}{os.pathsep}{env['PYTHONPATH']}" if env.get("PYTHONPATH") else str(vendor)
    merged, boots = {}, {}
    for level in (0, 1):
        group = [s for s in samples if s["lvlMode"] == level]
        if not group:
            continue
        inp, part = tmp / f"in-{level}.json", tmp / f"out-{level}.json"
        inp.write_text(json.dumps({"samples": group, "build": build, "keepVblank": keep}))
        if part.exists():
            part.unlink()
        log = tmp / f"child-{level}.log"
        with open(log, "wb") as fh:
            rc = subprocess.run([sys.executable, str(Path(__file__).resolve()), str(level), str(inp), str(part), "--child"],
                                env=env, stdout=fh, stderr=subprocess.STDOUT).returncode
        if rc != 0 or not part.is_file():
            tail = log.read_bytes()[-3000:].decode(errors="replace")
            raise SystemExit(f"level {level} child failed (exit {rc}); log tail:\n{tail}")
        res = json.loads(part.read_text())
        boots[level] = res["boot"]
        for r in res["results"]:
            merged[r["index"]] = r
    out = {
        "tool": "tools/openlevel/romGenLab.py", "build": build, "keepVblank": keep,
        "bootstraps": {PROFILE_FOR_LEVEL[k]: v for k, v in boots.items()},
        "seconds": round(time.time() - t0, 1),
        "samples": [merged[i] for i in sorted(merged)],
    }
    out_path.write_text(json.dumps(out, indent=1) + "\n")
    per = [r["seconds"] for r in out["samples"]]
    print(f"{len(per)} samples in {out['seconds']} s (per sample {min(per)}-{max(per)} s, mean {sum(per) / len(per):.2f} s) -> {out_path}")


if __name__ == "__main__":
    main()
