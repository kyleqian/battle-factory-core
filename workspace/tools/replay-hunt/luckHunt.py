"""The luck hunt (luck1). Started by luckHunt.sh; read tools/replay-hunt/README.md ("luckHunt").
Round-robin over the lab designs in tools/replay-hunt/luck-designs/, one fresh lab seed per visit, engine first (prehunt.py, one seed at a time), and the ROM
drive only for a seed whose engine battle ran the design's `cover` code. Everything is written under LUCK_HUNT_OUT; the repository is not touched.

env: LUCK_HUNT_OUT (required, absolute directory), LUCK_HUNT_DEADLINE_EPOCH (no new seed starts after it; default: one hour after the start),
     LUCK_HUNT_JOBS (parallel seeds, default 3), LUCK_HUNT_DESIGNS (space-separated globs, default the committed designs),
     LUCK_HUNT_DAY (YYYYMMDD, seed day for tests; default today UTC), LUCK_HUNT_SEED_TIMEOUT (seconds per seed, default 1500).
Seeds: 1,000,000 + 20,000 * (days since 2026-11-16) + k, k = the task counter of the run (kept in OUT/state.json, so a restart in the same OUT goes on).
A day has room for 20,000 seeds (a seed is about 15 s), so two days never share one."""
import datetime, glob, json, os, shutil, signal, subprocess, sys, threading, time

H = os.path.dirname(os.path.abspath(__file__))
W = os.path.dirname(os.path.dirname(H))
sys.path.insert(0, H)
import designcheck

OUT = os.environ.get("LUCK_HUNT_OUT")
if not OUT or not os.path.isabs(OUT):
    sys.exit("luckHunt: set LUCK_HUNT_OUT to an absolute directory")
JOBS = max(1, int(os.environ.get("LUCK_HUNT_JOBS", "3")))
ROM_SLOTS = 2  # README: never more than two ROM drives at once, whatever JOBS says
START = time.time()
DEADLINE = float(os.environ.get("LUCK_HUNT_DEADLINE_EPOCH") or START + 3600)
SEED_TIMEOUT = int(os.environ.get("LUCK_HUNT_SEED_TIMEOUT", "1500"))
DISABLE_AFTER = 6  # consecutive seeds that fail before the engine battle is judged (lab / engine errors, stalls): the design is broken
DAY = os.environ.get("LUCK_HUNT_DAY") or datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d")
DAY_INDEX = (datetime.datetime.strptime(DAY, "%Y%m%d") - datetime.datetime(2026, 11, 16)).days
SEED_BASE = 1_000_000 + 20_000 * max(0, DAY_INDEX)
globs = os.environ.get("LUCK_HUNT_DESIGNS", "").split() or [H + "/luck-designs/*.json"]

os.makedirs(OUT, exist_ok=True)
os.makedirs(OUT + "/tmp", exist_ok=True)
os.makedirs(OUT + "/logs", exist_ok=True)
os.makedirs(OUT + "/hits", exist_ok=True)
CHILD_ENV = {**os.environ, "TMPDIR": OUT + "/tmp", "PREHUNT_DRIVE_SLOTS": f"{OUT}/locks:{ROM_SLOTS}", "PYTHONDONTWRITEBYTECODE": "1"}
CHILD_ENV.pop("NODE_V8_COVERAGE", None)

lock = threading.Lock()
stop = threading.Event()
children = set()
log_fh = open(OUT + "/hunt.log", "a", buffering=1)


def say(msg):
    line = f"{datetime.datetime.now(datetime.timezone.utc).strftime('%H:%M:%S')} {msg}"
    with lock:
        print(line, file=log_fh, flush=True)


def load_designs():
    designs, rejected = [], []
    for f in sorted({f for g in globs for f in glob.glob(g)}):
        try:
            d = json.load(open(f))
            bad = designcheck.problems(d)
        except Exception as e:  # unreadable file
            d, bad = {"name": os.path.basename(f), "rules": []}, [f"unreadable: {e}"]
        if bad:
            rejected.append({"design": d.get("name", f), "file": f, "problems": bad})
        else:
            designs.append({"name": d["name"], "rules": d.get("rules", []), "file": f, "stage": d})
    return designs, rejected


def read_state():
    try:
        return json.load(open(OUT + "/state.json"))
    except Exception:
        return {"k": 0, "day": DAY}


def read_results():
    rows = []
    if os.path.exists(OUT + "/seeds.jsonl"):
        for line in open(OUT + "/seeds.jsonl"):
            try:
                rows.append(json.loads(line))
            except ValueError:
                pass
    return rows


def write_summary(designs, rejected, status):
    rows = read_results()
    per = {}
    for d in designs:
        per[d["name"]] = {"design": d["name"], "rules": d["rules"], "seeds": 0, "markerHits": 0, "romMatch": 0, "romDiffer": 0, "romStopped": 0,
                          "engineErrors": 0, "stalls": 0, "labFailures": 0, "disabled": None, "hits": [], "stageFilesReady": []}
    for r in rows:
        p = per.get(r["design"])
        if p is None:
            continue
        p["seeds"] += 1
        p["markerHits"] += bool(r.get("markerHit"))
        p["engineErrors"] += bool(r.get("engineError"))
        p["stalls"] += bool(r.get("stall"))
        p["labFailures"] += bool(r.get("labFailure"))
        if r.get("rom") == "match":
            p["romMatch"] += 1
        elif r.get("rom") == "differ":
            p["romDiffer"] += 1
        elif r.get("rom") == "stopped":
            p["romStopped"] += 1
        if r.get("markerHit"):
            p["hits"].append({k: r.get(k) for k in ("seed", "rom", "romClass", "matched", "engineStates", "stageFile", "dir")})
        if r.get("stageFile") and r.get("rom") == "match" and r.get("stageOk"):
            p["stageFilesReady"].append(r["stageFile"])
        if r.get("disabled"):
            p["disabled"] = r["disabled"]
    by_rule = {}
    for p in per.values():
        for rule in p["rules"]:
            q = by_rule.setdefault(rule, {"rule": rule, "designs": [], "seeds": 0, "markerHits": 0, "romMatch": 0, "romDiffer": 0, "romStopped": 0, "stageFilesReady": []})
            q["designs"].append(p["design"])
            for k in ("seeds", "markerHits", "romMatch", "romDiffer", "romStopped"):
                q[k] += p[k]
            q["stageFilesReady"] += p["stageFilesReady"]
    summary = {"status": status, "day": DAY, "start": datetime.datetime.fromtimestamp(START, datetime.timezone.utc).isoformat(),
               "end": datetime.datetime.now(datetime.timezone.utc).isoformat(), "deadlineEpoch": DEADLINE, "jobs": JOBS, "romDriveSlots": ROM_SLOTS,
               "seedBase": SEED_BASE, "out": OUT, "designsRun": len(designs), "rejectedDesigns": rejected,
               "totals": {"seeds": sum(p["seeds"] for p in per.values()), "markerHits": sum(p["markerHits"] for p in per.values()),
                          "romMatch": sum(p["romMatch"] for p in per.values()), "romDiffer": sum(p["romDiffer"] for p in per.values()),
                          "stageFilesReady": sum(len(p["stageFilesReady"]) for p in per.values())},
               "byRule": sorted(by_rule.values(), key=lambda q: q["rule"]), "byDesign": sorted(per.values(), key=lambda p: p["design"])}
    json.dump(summary, open(OUT + "/summary.json.tmp", "w"), indent=1)
    os.replace(OUT + "/summary.json.tmp", OUT + "/summary.json")
    t = summary["totals"]
    md = [f"# Luck hunt {DAY} ({status})", "",
          f"seeds {t['seeds']}, marker hits {t['markerHits']}, ROM match {t['romMatch']}, ROM differ {t['romDiffer']}, stage files ready to promote {t['stageFilesReady']}; "
          f"designs run {len(designs)}, rejected {len(rejected)}; jobs {JOBS} (ROM drives at most {ROM_SLOTS}); seeds {SEED_BASE}+k.", "",
          "| rule | designs | seeds | marker hits | ROM match | ROM differ | drive stopped | stage files ready |", "|---|---|---|---|---|---|---|---|"]
    for q in summary["byRule"]:
        md.append(f"| {q['rule']} | {', '.join(q['designs'])} | {q['seeds']} | {q['markerHits']} | {q['romMatch']} | {q['romDiffer']} | {q['romStopped']} | "
                  f"{', '.join(q['stageFilesReady']) or '-'} |")
    dis = [p for p in per.values() if p["disabled"]]
    if dis:
        md += ["", "Designs switched off during the run (the design is broken, fix it):", *[f"- {p['design']}: {p['disabled']}" for p in dis]]
    if rejected:
        md += ["", "Designs refused by designcheck.py:", *[f"- {r['design']}: {'; '.join(r['problems'])}" for r in rejected]]
    differ = [(p["design"], h) for p in per.values() for h in p["hits"] if h.get("rom") == "differ"]
    if differ:
        md += ["", "ROM DIFFERENCES (a real bug until shown otherwise; the stage file is in the hit directory):",
               *[f"- {n} seed {h['seed']}: class {h.get('romClass')}, {h.get('matched')}/{h.get('engineStates')} states, {h.get('stageFile')}" for n, h in differ]]
    open(OUT + "/summary.md.tmp", "w").write("\n".join(md) + "\n")
    os.replace(OUT + "/summary.md.tmp", OUT + "/summary.md")


def run_seed(design, seed):
    """One lab seed through prehunt.py (engine first, the ROM drive only on a marker hit). Returns the result row."""
    name = design["name"]
    work = f"{OUT}/work/{name}-{seed}"
    os.makedirs(work, exist_ok=True)
    log = f"{OUT}/logs/{name}.log"
    t0 = time.time()
    row = {"design": name, "rules": design["rules"], "seed": seed}
    with open(f"{work}/prehunt.log", "w") as fh:
        p = subprocess.Popen(["nice", "-n", "19", "python3", H + "/prehunt.py", design["file"], work, str(seed), "1"], cwd=W, env=CHILD_ENV,
                             stdout=fh, stderr=subprocess.STDOUT, start_new_session=True)
        with lock:
            children.add(p)
        try:
            p.wait(timeout=SEED_TIMEOUT)
        except subprocess.TimeoutExpired:
            row["timeout"] = True
            kill(p)
        finally:
            with lock:
                children.discard(p)
    text = open(f"{work}/prehunt.log").read()
    row["seconds"] = round(time.time() - t0, 1)
    if "REJECTED design" in text:
        row["labFailure"] = "rejected"
    elif "lab setup failed" in text or "request refused" in text or "engine replay failed" in text:
        row["labFailure"] = [l for l in text.splitlines() if "failed" in l or "refused" in l][0][:120]
    row["engineError"] = "ENGINE-ERROR" in text
    row["stall"] = "STALL-WARNING: engine" in text
    hit = os.path.exists(f"{work}/engine-hit-{seed}.json")
    row["markerHit"] = hit
    if hit:
        keep = f"{OUT}/hits/{name}/{seed}"
        os.makedirs(keep, exist_ok=True)
        os.replace(f"{work}/engine-hit-{seed}.json", f"{keep}/{name}.stage.json")
        row["stageFile"] = f"{keep}/{name}.stage.json"
        row["dir"] = keep
        wide = [l for l in text.splitlines() if "  wide:" in l]
        summ = f"{work}/seed-{seed}.summary.json"
        if os.path.exists(summ):
            s = json.load(open(summ))
            os.replace(summ, f"{keep}/rom.summary.json")
            row.update(matched=s.get("matched"), engineStates=s.get("engineStates"), romClass=s.get("class"), stageOk=bool(s.get("stage", {}).get("ok")))
            if s["match"]:
                row["rom"] = "match"
            elif s.get("divergence") is None and (s.get("drive") or {}).get("stop") != "outcome":
                row["rom"] = "stopped"  # the ROM drive hit its frame cap with no state differing: not an engine difference
            else:
                row["rom"] = "differ"
            if os.path.exists(f"{work}/found.json"):
                os.replace(f"{work}/found.json", f"{keep}/found.stage.json")
                row["stageFile"] = f"{keep}/found.stage.json"
        else:
            row["rom"] = "no-drive"
        open(f"{keep}/prehunt.log", "w").write(text)
        say(f"HIT {name} seed {seed}: ROM {row.get('rom')} {row.get('matched')}/{row.get('engineStates')} class {row.get('romClass')} ({wide[-1].strip() if wide else '-'})")
    with open(log, "a") as fh:
        fh.write(f"--- seed {seed} ({row['seconds']} s)\n{text}")
    if not hit and not row["engineError"]:
        shutil.rmtree(work, ignore_errors=True)
    else:
        for junk in ("pre-cov",):
            shutil.rmtree(f"{work}/{junk}", ignore_errors=True)
    return row


def kill(p):
    try:
        os.killpg(p.pid, signal.SIGTERM)
        try:
            p.wait(10)
        except subprocess.TimeoutExpired:
            os.killpg(p.pid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):
        pass


def on_signal(signum, _frame):
    stop.set()
    say(f"signal {signum}: no new seeds, stopping children")
    with lock:
        alive = list(children)
    for p in alive:
        kill(p)


def main():
    signal.signal(signal.SIGTERM, on_signal)
    signal.signal(signal.SIGINT, on_signal)
    designs, rejected = load_designs()
    state = read_state()
    if state.get("day") != DAY:  # the same OUT reused on another day: the seed base moved, so start the counter again
        state = {"k": 0, "day": DAY}
    say(f"start day {DAY} seeds {SEED_BASE}+k from k={state['k']}, {len(designs)} designs ({len(rejected)} rejected), jobs {JOBS}, deadline "
        f"{datetime.datetime.fromtimestamp(DEADLINE, datetime.timezone.utc).strftime('%H:%M:%S')}Z")
    write_summary(designs, rejected, "running")
    dstate = {d["name"]: {"done": False, "fails": 0} for d in designs}
    cursor = {"i": 0}

    def next_task():
        with lock:
            if stop.is_set() or time.time() >= DEADLINE:
                return None
            live = [d for d in designs if not dstate[d["name"]]["done"]]
            if not live:
                return None
            names = [d["name"] for d in designs]
            while True:  # round-robin: the next live design after the cursor
                d = designs[cursor["i"] % len(designs)]
                cursor["i"] += 1
                if not dstate[d["name"]]["done"]:
                    break
            seed = SEED_BASE + state["k"]
            state["k"] += 1
            json.dump(state, open(OUT + "/state.json.tmp", "w"))
            os.replace(OUT + "/state.json.tmp", OUT + "/state.json")
            return d, seed

    def worker():
        while True:
            task = next_task()
            if task is None:
                return
            d, seed = task
            try:
                row = run_seed(d, seed)
            except Exception as e:  # a bug here must not end the hunt
                row = {"design": d["name"], "rules": d["rules"], "seed": seed, "labFailure": f"luckHunt: {e!r}"[:200]}
            with lock:
                st = dstate[d["name"]]
                if row.get("rom") in ("match", "differ"):
                    st["done"] = True  # the rule is covered (or a bug is found): the rest of the run goes to the other designs
                broken = row.get("labFailure") or row.get("engineError") or row.get("stall")
                st["fails"] = st["fails"] + 1 if broken else 0
                if st["fails"] >= DISABLE_AFTER and not st["done"]:
                    st["done"] = True
                    row["disabled"] = f"{DISABLE_AFTER} seeds in a row with a lab failure, engine error or stall (last seed {seed})"
                    print(f"{time.strftime('%H:%M:%S')} DISABLED {d['name']}: {row['disabled']}", file=log_fh, flush=True)
                with open(OUT + "/seeds.jsonl", "a") as fh:
                    fh.write(json.dumps(row) + "\n")
            write_summary(designs, rejected, "running")

    threads = [threading.Thread(target=worker, daemon=True) for _ in range(JOBS)]
    for t in threads:
        t.start()
    for t in threads:
        while t.is_alive():
            t.join(timeout=5)
    write_summary(designs, rejected, "stopped by signal" if stop.is_set() else "finished at the deadline" if time.time() >= DEADLINE else "finished: every design done")
    say(f"end: {len(read_results())} seeds")


if __name__ == "__main__":
    main()
