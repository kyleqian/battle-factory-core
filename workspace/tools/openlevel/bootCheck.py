"""Open Level bootstrap check (tools/openlevel/README.md, oracle/BOOTSTRAP.md "Open Level profiles").

Usage (cwd = workspace/):
  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/openlevel/bootCheck.py OUT.json PROFILE
PROFILE: lv50-on, lv50-off, open-on, open-off (one per process: a second mGBA core in the same process crashes).

Per profile: the bootstrap is replayed frame by frame; from frame 4400 on, a frame whose fast run drew Random() more than once is run
again from its saved start instruction by instruction, with traps at the entry and return of GenerateInitialRentalMons (battle_factory.o's
copy), GenerateOpponentMons, CreateFrontierFactorySelectableMons, GetNumPastRentalsRank and GetFactoryMonId, and at Random() (its caller).
Recorded: each entry and return (frame, gRngValue, sRandCount, arguments / result), the Random() callers inside them, and at the end the
canonical screen sha256 (checked against EmeraldOracle's own boot of the same file), SaveBlock2 frontier fields, the six rentals, the
trainer and its three sets, the six built select-screen Pokemon and gRngValue. Nothing is written into the ROM.
"""
import sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from romlib import Rom, REF, EmeraldOracle, write_json  # noqa: E402

WATCH = ("GenerateInitialRentalMons", "GenerateOpponentMons", "CreateFrontierFactorySelectableMons", "GetNumPastRentalsRank",
         "GetFactoryMonId", "GetRandomScaledFrontierTrainerId")
WATCH_DRAWS = ("GenerateInitialRentalMons", "GenerateOpponentMons", "CreateFrontierFactorySelectableMons")
STEP_FROM = 4400


def check(profile):
    t0 = time.time()
    rom = Rom(profile)
    events, draws, open_calls = [], [], {}  # open_calls: return pc -> (name, entry record)
    stepped = []

    def make_traps():
        traps = {}

        def entry(name):
            def cb():
                lr = rom.reg(14)
                rec = {"fn": name, "at": "entry", "frame": rom.frameno, "rng": hex(rom.rng()), "randCount": rom.rand_count(),
                       "args": [rom.reg(i) for i in range(4)]}
                events.append(rec)
                ret = (lr & ~1) + 2
                open_calls[ret] = (name, rec)

                def at_ret(ret=ret):
                    n, r = open_calls.pop(ret, (None, None))
                    if n is None:
                        return
                    events.append({"fn": n, "at": "return", "frame": rom.frameno, "rng": hex(rom.rng()), "randCount": rom.rand_count(),
                                   "result": rom.reg(0)})
                    traps.pop(ret, None)
                traps[ret] = at_ret
            return cb
        for n in WATCH:
            traps[rom.f[n] + 2] = entry(n)

        def at_random():
            inside = [n for n, _ in open_calls.values() if n in WATCH_DRAWS]
            if inside:
                lr = rom.reg(14)
                draws.append({"frame": rom.frameno, "in": inside[-1], "caller": "VBlankIntr" if rom.in_vblank(lr) else rom.caller(lr),
                              "rngBefore": hex(rom.rng())})
        traps[rom.f["Random"] + 2] = at_random
        return traps

    traps = make_traps()

    def per_frame(r, buttons):
        if r.frameno < STEP_FROM:
            return False
        if open_calls:  # a watched function is still running: keep stepping
            r.frame(buttons, traps)
            stepped.append(r.frameno - 1)
            return True
        pre, c0, n0 = r.state(), r.rand_count(), r.frameno
        r.fast(buttons)
        if r.rand_count() - c0 > 1:
            r.load(pre, n0)
            r.frame(buttons, traps)
            stepped.append(n0)
        return True

    total = rom.replay(per_frame=per_frame)
    sb1 = rom.sb1()
    out = {
        "profile": profile, "bootstrap": str(rom.path.name), "frames": total,
        "screenSha256": rom.screen_sha(), "rngAtEnd": hex(rom.rng()),
        "position": {"x": rom.s16(sb1), "y": rom.s16(sb1 + 2), "mapGroup": rom.u8(sb1 + 4), "mapNum": rom.u8(sb1 + 5)},
        "frontier": rom.frontier(), "rentals": rom.rentals(), "selectMons": rom.select_mons(),
        "events": events, "drawsInside": draws, "steppedFrames": stepped,
    }
    png = Path(sys.argv[1]).with_name(f"anchor-{profile}.png")
    png.write_bytes(rom.screen_png())
    out["anchorPng"] = str(png)
    t1 = time.time()
    o = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", rom.path)
    out["oracle"] = {"frames": o._bootstrap_frames, "canonicalScreenSha256": o.canonical_screen_sha256,
                     "sameSha": o.canonical_screen_sha256 == out["screenSha256"]}
    out["seconds"] = {"trapReplay": round(t1 - t0, 1), "oracleBoot": round(time.time() - t1, 1)}
    return out


def main():
    res = [check(sys.argv[2])]
    write_json(sys.argv[1], res)
    for r in res:
        f = r["frontier"]
        print(r["profile"], r["screenSha256"][:16], r["oracle"]["sameSha"], "lvl", f["lvlMode"], "trainer", f["trainer"], f["opponentSetIds"],
              [x["setId"] for x in r["rentals"]], r["rngAtEnd"], r["seconds"])
        for e in r["events"]:
            if e["fn"] != "GetFactoryMonId":
                print("  ", e)


if __name__ == "__main__":
    main()
