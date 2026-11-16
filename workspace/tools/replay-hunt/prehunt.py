"""usage (cwd = workspace/): python3 tools/replay-hunt/prehunt.py STAGE.json OUTDIR FIRST_SEED COUNT
Like p4/stagehunt.py, but cheap: per lab seed do the request, the ROM setup and the ENGINE replay only, and look for the stage's `expect` rows in the
engine's own events. Only a seed whose engine battle has every row is driven on the ROM (the full wide replay). Stops at the first seed whose wide
replay matches the ROM and has the rows (OUTDIR/found.json).
rrh3: STALL-WARNING when an engine battle hits the frame budget or has 100+ decisions, or the ROM drive stops short of the engine's states; STALL-ABORT after 3 stalled seeds."""
import fcntl, gzip, json, os, subprocess, sys, time
stage_path, out, first, count = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
W = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, W + "/tools/audio")
os.chdir(W)
import romReplayTally
import romReplayCoverage, shutil
sys.path.insert(0, W + "/tools/replay-hunt")
import designcheck
os.makedirs(out, exist_ok=True)
base = json.load(open(stage_path))
bad = designcheck.problems(base)
if bad:
    print("REJECTED design:", *bad, sep="\n  ", flush=True)
    print("HUNT-END", flush=True)
    sys.exit(2)
design_errors = 0
stalls = 0


def drive_on_rom(sp):
    """The ROM drive; with PREHUNT_DRIVE_SLOTS=DIR:N at most N drives run at once across processes (luckHunt.sh: 2)."""
    slots = os.environ.get("PREHUNT_DRIVE_SLOTS")
    held = None
    if slots:
        d, n = slots.rsplit(":", 1)
        os.makedirs(d, exist_ok=True)
        while held is None:
            for i in range(int(n)):
                fh = open(f"{d}/slot{i}.lock", "a")
                try:
                    fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB); held = fh; break
                except OSError:
                    fh.close()
            if held is None:
                time.sleep(2)
    try:
        subprocess.run(["nice", "-n", "19", "tools/audio/romReplayWide.sh", "--stage", sp], cwd=W, env=env, capture_output=True)
    finally:
        if held:
            held.close()
STALL_DECISIONS = int(os.environ.get("PREHUNT_STALL_DECISIONS", "100"))  # the ROM drive stops at about 80000 frames, about 115+ states: a battle with this many engine decisions is likely to be cut short
env = {**os.environ, "REPLAY_OUT": out, "REPLAY_KEEP": "0", 
       "ROM_REPLAY_POLICY": "script", "ROM_REPLAY_SYMBOLS": "0"}
env.pop("ROM_REPLAY_CHALLENGE", None)
NODE = ["nice", "-n", "19", "node", "--experimental-strip-types", "--no-warnings", "tools/integration/soundCensusRomReplay.ts"]
T = f"{out}/pre"
for seed in range(first, first + count):
    stage = {**base, "seed": seed}
    sp = f"{out}/try.stage.json"
    json.dump(stage, open(sp, "w"), indent=1)
    for suffix in (".req.json", ".setup.json", ".engine.json", ".setup-probe.json"):
        if os.path.exists(T + suffix):
            os.unlink(T + suffix)
    if subprocess.run(NODE + ["request", f"--stage={sp}", "--scene=off", f"--out={T}.req.json"], cwd=W, env=env, capture_output=True).returncode:
        print(seed, "request refused", flush=True); continue
    subprocess.run(["nice", "-n", "19", "python3", "tools/run-mgba-probe.py", "--max-log-bytes", "8192", f"{T}.setup-probe.json", "--", "python3", "tools/audio/soundEventProbe.py",
                    f"{T}.setup-probe.json", "lab", f"{T}.req.json", "--profile", "off", "--frames", "1", "--setup-out", f"{T}.setup.json"], cwd=W, env=env, capture_output=True)
    if not os.path.exists(T + ".setup.json"):
        print(seed, "lab setup failed", flush=True); continue
    cover = [c for c in base.get("cover", []) if c]  # [{"file": "src/engine/X.ts", "text": "a snippet that occurs once"}]: code that the engine battle must have run
    covdir = f"{out}/pre-cov"
    shutil.rmtree(covdir, ignore_errors=True)
    subprocess.run(NODE + ["replay", f"--stage={sp}", "--scene=off", f"--setup={T}.setup.json", f"--out={T}.engine.json", "--events=1"], cwd=W,
                   env={**env, "NODE_V8_COVERAGE": covdir} if cover else env, capture_output=True)
    if not os.path.exists(T + ".engine.json"):
        print(seed, "engine replay failed", flush=True); continue
    e = json.load(open(T + ".engine.json")); setup = json.load(open(T + ".setup.json"))
    facts = {"id": "pre", "seed": seed, "policy": "script", "symbols": 0, "scene": "off", "outcome": e.get("battleOutcome"), "mode": setup["descriptor"].get("mode"),
             "challengeNum": setup["descriptor"].get("challengeNum"), "trainerId": setup["descriptor"].get("trainerId"),
             "decisions": [{k: v for k, v in d.items() if k in ("kind", "slot", "partyIndex", "forced", "voluntary", "source")} for d in e["decisions"]],
             "wide": e["wide"], "finalWide": e["finalWide"], "turnEvents": e.get("turnEvents", []),
             "parties": {side: [{k: m[k] for k in ("species", "ability", "item", "moves", "types")} for m in setup["snapshot"]["parties"][side]] for side in ("player", "opponent")}}
    counts = romReplayTally.tally_battle(facts)
    got = {row: romReplayTally.covered(row, counts) > 0 for row in base.get("expect", [])}
    watch = {row: counts.get(row + "#used", 0) for row in base.get("watch", [])}
    for i, c in enumerate(cover):
        got[f"ran:{i}:" + c["file"].split("/")[-1] + ":" + c["text"][c.get("at", 0):c.get("at", 0) + 30].strip()] = (romReplayCoverage.count_at(covdir, c["file"], c["text"], root=W, at=c.get("at", 0)) or 0) > 0
    print(seed, "engine", "error" if e.get("error") else "ok", "decisions", len(e["decisions"]), got, watch, flush=True)
    if e.get("error"):
        json.dump({**stage, "engineError": str(e.get("error"))[:2000]}, open(f"{out}/engine-error-{seed}.json", "w"), indent=1)
        print("ENGINE-ERROR", seed, str(e.get("error"))[:300], flush=True)
        if "is not legal" in str(e.get("error")):
            design_errors += 1
            if design_errors >= 3:
                print("DESIGN-ERROR: the script names a slot the engine does not offer (3 seeds); fix the design", flush=True)
                break
    if "frame budget" in str(e.get("error")) or len(e["decisions"]) >= STALL_DECISIONS:
        stalls += 1
        print(seed, f"STALL-WARNING: engine battle {'hit the frame budget' if e.get('error') else 'has ' + str(len(e['decisions'])) + ' decisions'}; the design may stall (a Protect/Rest/Recover/Double Team loop). Give the stage a team that cannot stall.", flush=True)
        if stalls >= 3:
            print("STALL-ABORT: 3 stalled seeds; fix the design", flush=True)
            break
    ran = [k for k in got if k.startswith("ran:") and got[k]]
    rows_ok = all(v for k, v in got.items() if not k.startswith("ran:"))
    covers_ok = (len(ran) > 0) if base.get("coverAny") else all(v for k, v in got.items() if k.startswith("ran:"))
    if not (rows_ok and covers_ok) or e.get("error"):
        continue
    if cover:
        json.dump(stage, open(f"{out}/engine-hit-{seed}.json", "w"), indent=1)
    drive_on_rom(sp)
    summary = f"{out}/stage-{base['name']}.summary.json"
    if not os.path.exists(summary):
        print(seed, "  wide: no summary", flush=True); continue
    s = json.load(open(summary)); st = s.get("stage", {})
    print(seed, "  wide:", "match" if s["match"] else f"class {s['class']}", "states", f"{s['matched']}/{s['engineStates']}", "expect", st.get("expect"), flush=True)
    os.rename(summary, f"{out}/seed-{seed}.summary.json")
    if st.get("ok"):
        json.dump(stage, open(f"{out}/found.json", "w"), indent=1)
        print("FOUND seed", seed, flush=True)
        break
    if s["matched"] < s["engineStates"]:
        print(f"   STALL-WARNING: the ROM drive matched {s['matched']} of {s['engineStates']} engine states and stopped (frame cap about 80000); a ROM-side stop is not an engine difference", flush=True)
    if not s["match"]:
        print("   NOTE: a staged battle that does not match the ROM:", s["class"], json.dumps(s.get("divergence"))[:200], flush=True)
print("HUNT-END", flush=True)
