"""parity-mac fifth pass: which battle-rule code has a ROM-matched battle ever run (docs/parity-mac/rule-coverage.md).

  python3 tools/audio/romReplayCoverage.py collect OUT.cov DIR [DIR ...] [--stages DIR ...] [--jobs N] [--limit N] [--part K/N] [--skip-policy P]
  python3 tools/audio/romReplayCoverage.py merge OUT.cov A.cov B.cov ...
  python3 tools/audio/romReplayCoverage.py report IN.cov [--ai-cov AI.cov] [--classes CLASSES.json] [--json OUT.json] [--md OUT.md] [--worksheet DIR] [--all-files]
  python3 tools/audio/romReplayCoverage.py diff NEW.cov OLD.cov          what NEW runs that OLD does not (rule code only)
  python3 tools/audio/romReplayCoverage.py selfcheck SETUP_A STAGE_B SETUP_B   the offset proof (see the doc)

`collect` replays, engine side only, every battle of the DIRs whose `ID.summary.json` says `match` (a battle that did not match the ROM never counts), with
V8's precise block coverage (NODE_V8_COVERAGE). The engine side is deterministic: the replay is checked to produce the summary's number of turn states and decisions and its outcome,
else the battle is dropped. Per source file two bitmaps are kept, one cell per character: `seen` (V8 reported a range over it) and `hit` (some range
over it, innermost wins, had a count above 0 in some battle).

Offsets: Node's --experimental-strip-types replaces type syntax by blanks, so V8's character offsets are offsets into the .ts file as it is on disk
(checked by `selfcheck`, and by the name test in `report`: the text at a named function's offset is that function).

Scope (`RULE_PATTERNS`): the battle rules: every `battleScript*.ts` (the script machine, the opcode handlers, the rules context, turn admission,
move end, switch-in, faint handling), the end-turn orchestration, damage, stats, turn order, the RNG, the trainer AI (`factoryAi*.ts`,
`battleAiSwitchInto.ts`), the turn decision reducers (`factoryBattleScript*Decision.ts`), battle start, the decision boundary and the party order.
Left out on purpose: presentation, animation, sound, screens and menus, `factoryRoundBattleOrchestrator.ts` (it sequences a battle's screens around
the rules), the round flow, rental / opponent generation (the replay checks those against the ROM's own read-back), script loading and constants,
and `core.ts` (the app shell: the replay enters the engine below it, so it is not even loaded).
"""
import base64, collections, glob, hashlib, json, multiprocessing, os, re, subprocess, sys, tempfile, zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENGINE = "src/engine/"
RULE_PATTERNS = [
    r"battleScript(?!Presentation|Program|SourceConstants|Events)\w*\.ts", r"battleEndTurnOrchestration\.ts", r"battleActionFinished\.ts",
    r"battleAiSwitchInto\.ts", r"damageCalc\.ts", r"turnOrder\.ts", r"turnRng\.ts", r"stats\.ts", r"rng\.ts", r"factoryAi\w*\.ts",
    r"factoryBattleScript\w*Decision\.ts", r"factoryBattleStart\.ts", r"battleDecisionBoundary\.ts", r"battlePartyOrder\.ts",
]


def is_rule_file(rel):
    name = rel[len(ENGINE):] if rel.startswith(ENGINE) else rel
    return any(re.fullmatch(p, name) for p in RULE_PATTERNS)


# ----------------------------------------------------------------------------------------------------------------------------------- collect
def battles_of(dirs, stage_dirs):
    stages = {}
    for d in stage_dirs:
        for p in glob.glob(str(Path(d) / "*.json")):
            stages["stage-" + Path(p).stem] = p
    out, seen = [], set()
    for d in dirs:
        for p in sorted(glob.glob(str(Path(d) / "*.summary.json"))):
            try:
                s = json.loads(Path(p).read_text())
            except ValueError:
                continue
            if not s.get("match") or s["id"] in seen:
                continue
            setup = Path(d) / f"{s['id']}.setup.json"
            if not setup.exists():
                continue
            stage = stages.get(s["id"]) if "stage" in s else None
            if "stage" in s and stage is None:
                print(f"  skipped {s['id']}: its stage file is in none of the --stages directories", flush=True)
                continue
            seen.add(s["id"])
            challenge = re.search(r"-c(\d+)(-on)?$", s["id"])
            out.append({"id": s["id"], "seed": s["seed"], "policy": s["policy"], "symbols": s["symbols"], "scene": s["scene"], "setup": str(setup),
                        "stage": stage, "challenge": challenge.group(1) if challenge else None, "states": s["engineStates"],
                        "decisions": s["engineDecisions"], "outcome": (s.get("outcome") or {}).get("engine")})
    return out


CELL_SEEN = bytes([0, 1, 1]) + bytes(253)
CELL_HIT = bytes([0, 0, 1]) + bytes(253)


def paint(result, texts, seen, hit, functions):
    """One process's coverage -> OR into the bitmaps. Ranges are painted outer first, so the innermost range decides a character."""
    for script in result:
        url = script["url"]
        k = url.find("/" + ENGINE)
        if k < 0:
            continue
        rel = url[k + 1:]
        if rel not in texts:
            text = (ROOT / rel).read_text(encoding="utf-8")
            texts[rel] = text
            seen[rel] = bytearray(len(text)); hit[rel] = bytearray(len(text))
            functions[rel] = sorted({(f["ranges"][0]["startOffset"], f["ranges"][0]["endOffset"], f["functionName"]) for f in script["functions"]})
        n = len(texts[rel])
        cell = bytearray(n)  # 0 unseen, 1 seen with count 0, 2 seen with a count
        for f in sorted(script["functions"], key=lambda f: (f["ranges"][0]["startOffset"], -f["ranges"][0]["endOffset"])):
            for r in f["ranges"]:
                a, b = r["startOffset"], min(r["endOffset"], n)
                cell[a:b] = (b"\x02" if r["count"] else b"\x01") * (b - a)
        seen[rel] = or_into(seen[rel], cell.translate(CELL_SEEN)); hit[rel] = or_into(hit[rel], cell.translate(CELL_HIT))


def run_chunk(args):
    battles, workdir = args
    texts, seen, hit, functions, done, dropped = {}, {}, {}, {}, [], []
    node = ["node", "--experimental-strip-types", "--no-warnings", "tools/integration/soundCensusRomReplay.ts", "replay"]
    for b in battles:
        with tempfile.TemporaryDirectory(dir=workdir) as tmp:
            env = {**os.environ, "NODE_V8_COVERAGE": tmp + "/cov", "ROM_REPLAY_POLICY": b["policy"], "ROM_REPLAY_SYMBOLS": str(b["symbols"]),
                   "ROM_REPLAY_CHALLENGE": b["challenge"] or ""}
            which = [f"--stage={b['stage']}"] if b["stage"] else [f"--seed={b['seed']}"]
            out = tmp + "/engine.json"
            proc = subprocess.run(node + which + [f"--scene={b['scene']}", f"--setup={b['setup']}", f"--out={out}", "--frame-budget=4000000"],
                                  cwd=ROOT, env=env, capture_output=True, text=True)
            try:
                engine = json.loads(Path(out).read_text())
                ok = (proc.returncode == 0 and engine["error"] is None and len(engine["timeline"]) - 1 == b["states"]
                      and len(engine["decisions"]) == b["decisions"] and engine["battleOutcome"] == b["outcome"])
            except (OSError, ValueError, KeyError):
                ok = False
            if not ok:
                dropped.append(b["id"])
                continue
            for cov in glob.glob(tmp + "/cov/coverage-*.json"):
                paint(json.loads(Path(cov).read_text())["result"], texts, seen, hit, functions)
            done.append(b["id"])
    return {"texts": {k: hashlib.sha1(v.encode()).hexdigest() for k, v in texts.items()}, "seen": {k: bytes(v) for k, v in seen.items()},
            "hit": {k: bytes(v) for k, v in hit.items()}, "functions": functions, "done": done, "dropped": dropped}


def pack(b):
    return base64.b64encode(zlib.compress(bytes(b), 6)).decode()


def unpack(s):
    return bytearray(zlib.decompress(base64.b64decode(s)))


def or_into(dst, src):
    n = len(dst)
    return bytearray((int.from_bytes(dst, "little") | int.from_bytes(src, "little")).to_bytes(n, "little"))


def save(path, files, battles, dropped):
    Path(path).write_text(json.dumps({"schema": "rom-replay-rule-coverage/v1", "battles": sorted(battles), "dropped": sorted(dropped),
                                      "files": {rel: {"sha1": f["sha1"], "seen": pack(f["seen"]), "hit": pack(f["hit"]), "functions": f["functions"]}
                                                for rel, f in sorted(files.items())}}))


def load(path):
    d = json.loads(Path(path).read_text())
    files = {rel: {"sha1": f["sha1"], "seen": unpack(f["seen"]), "hit": unpack(f["hit"]), "functions": [tuple(x) for x in f["functions"]]} for rel, f in d["files"].items()}
    return files, set(d["battles"]), set(d.get("dropped", []))


def merge_files(dst, src):
    for rel, f in src.items():
        if rel not in dst:
            dst[rel] = {"sha1": f["sha1"], "seen": bytearray(f["seen"]), "hit": bytearray(f["hit"]), "functions": f["functions"]}
        else:
            if dst[rel]["sha1"] != f["sha1"]:
                raise SystemExit(f"{rel}: the source differs between the coverage files (re-collect on one engine)")
            dst[rel]["seen"] = or_into(dst[rel]["seen"], f["seen"]); dst[rel]["hit"] = or_into(dst[rel]["hit"], f["hit"])


def collect(argv):
    out = argv[0]
    opt = lambda name, default=None: argv[argv.index(name) + 1] if name in argv else default
    stage_dirs = [argv[i + 1] for i, a in enumerate(argv) if a == "--stages"]
    skip = set()
    for i, a in enumerate(argv):
        if a in ("--stages", "--jobs", "--limit", "--part", "--skip-policy"):
            skip.update((i, i + 1))
    dirs = [a for i, a in enumerate(argv[1:], 1) if i not in skip]
    battles = battles_of(dirs, stage_dirs)
    if opt("--skip-policy"):  # for the AI files: leave out the battles of a test player that runs the AI code itself (ai-v1)
        battles = [b for b in battles if b["policy"] != opt("--skip-policy")]
    files, have, dropped = ({}, set(), set())
    if Path(out).exists():
        files, have, dropped = load(out)
    if opt("--part"):  # K/N: every N-th battle starting at K, so several collectors can share one list
        k, n = (int(x) for x in opt("--part").split("/"))
        battles = battles[k::n]
    battles = [b for b in battles if b["id"] not in have and b["id"] not in dropped]
    if opt("--limit"):
        battles = battles[:int(opt("--limit"))]
    jobs = int(opt("--jobs", "4"))
    workdir = tempfile.mkdtemp(prefix="rulecov-")
    chunks = [battles[i:i + 25] for i in range(0, len(battles), 25)]
    print(f"{len(battles)} battles to replay with coverage, {jobs} lanes", flush=True)
    with multiprocessing.Pool(jobs) as pool:
        for n, res in enumerate(pool.imap_unordered(run_chunk, [(c, workdir) for c in chunks]), 1):
            merge_files(files, {rel: {"sha1": res["texts"][rel], "seen": res["seen"][rel], "hit": res["hit"][rel], "functions": res["functions"][rel]} for rel in res["texts"]})
            have.update(res["done"]); dropped.update(res["dropped"])
            if n % 8 == 0 or n == len(chunks):
                save(out, files, have, dropped)
                print(f"  {len(have)} merged, {len(dropped)} dropped", flush=True)
    save(out, files, have, dropped)
    print(f"{out}: {len(have)} battles, {len(dropped)} dropped (the engine replay did not reproduce the matched battle), {len(files)} engine files")


# ----------------------------------------------------------------------------------------------------------------------------------- report
def line_of(starts, offset):
    lo, hi = 0, len(starts) - 1
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if starts[mid] <= offset:
            lo = mid
        else:
            hi = mid - 1
    return lo + 1


def strip_comments(code):
    return re.sub(r"//[^\n]*", "", re.sub(r"/\*.*?\*/", "", code, flags=re.S))


def auto_class(body, lead):
    """The part of the classification a pattern can do.
    `error`   = the run only throws, reports a malformed script operand or snapshot, fails the validation of a decision, or hands on a stop raised
                below it (a guard: the replay would report an engine error if a battle reached it);
    `comment` = no code;
    `barrier` = the engine's explicit stop for a case it does not implement (`unsupportedBranch`). Whether a Factory battle can reach each one is
                recorded in docs/barrier-reachability-triage.md (all of them: no);
    `rule`    = everything else (a person classifies it)."""
    code = strip_comments(body)
    if not re.search(r"\w", code):
        return "comment"
    flat = re.sub(r"\s+", " ", code).strip().strip("{} ")
    lead_code = strip_comments(lead)
    if "unsupportedBranch(" in flat or re.search(r"unsupportedBranch\($", lead_code.strip()) or 'kind: "unsupported-branch"' in flat:
        return "barrier"
    if re.fullmatch(r"return (Object\.freeze\()?\{ ?kind: \"(barrier|opcode-barrier|case-barrier|unsupported)\"[^;]*;?", flat):
        return "error"  # the orchestration hands on a stop raised below it
    if re.search(r"kind === \"(barrier|opcode-barrier|case-barrier|unsupported)\"\)?$", lead_code.strip()) and re.fullmatch(r"return [\w.]+;?", flat):
        return "error"
    stop_call = r"(haltForInvalid\w*|haltForUnexpectedOperands|haltTransition|blockBattleScriptCommand|fail)\("
    if re.fullmatch(r"return (required|resolved|malformed|invalid)(\.transition)?;?", flat):
        return "error"  # hands on the halt of an operand check
    if re.match(r"(return )?(Object\.freeze\(\{ kind: \"transition\", transition: )?" + stop_call, flat) and flat.count(";") <= 1:
        return "error"  # one statement: the halt for a malformed script operand, or the block for a value the script needs and the host did not give
    if re.match(r"(export )?function (unavailable\w*Reason|invalid\w*Reason|haltFor\w+|unsupportedBranch|fail)\b", (lead_code.strip() + " " + flat).strip()):
        return "error"  # a helper that only builds such a stop
    statements = [s.strip() for s in re.split(r"[;{}]", code) if re.search(r"\w", s)]
    def is_stop(s):
        return (s.startswith("throw ") or re.match(r"return (haltForInvalid\w*|haltForUnexpectedOperands|haltTransition|fail)\(", s) is not None
                or re.match(r"(if|else if) \(.*\)\s*(throw |return (haltForInvalid\w*|haltForUnexpectedOperands|fail)\()", s) is not None)
    def is_filler(s):  # the text of a message, or a piece of an expression that changes nothing
        return re.match(r"(const|let) \w+ = `", s) is not None or not re.search(r"[=(]", s)
    if statements and any(is_stop(s) for s in statements) and all(is_stop(s) or is_filler(s) for s in statements):
        return "error"
    if re.search(r"(throw new Error|haltForInvalid\w*|haltForUnexpectedOperands|fail)\([^;]*$", lead_code):
        return "error"  # a piece of the message of a stop
    return "rule"


def uncovered_runs(rel, f):
    """[(function name, function start line, never called?, start line, end line, characters, first line of text)] for one file."""
    text = (ROOT / rel).read_text(encoding="utf-8")
    if hashlib.sha1(text.encode()).hexdigest() != f["sha1"]:
        raise SystemExit(f"{rel} changed since the coverage was collected")
    n = len(text)
    starts = [0] + [m.end() for m in re.finditer("\n", text)]
    owner = [-1] * n
    fns = sorted(f["functions"], key=lambda x: (x[0], -x[1]))
    for i, (a, b, _name) in enumerate(fns):
        owner[a:b] = [i] * (min(b, n) - a)
    seen, hit = f["seen"], f["hit"]
    runs, i = [], 0
    while i < n:
        if seen[i] and not hit[i]:
            j = i
            while j < n and seen[j] and not hit[j] and owner[j] == owner[i]:
                j += 1
            body = text[i:j]
            if body.strip():
                a, b, name = fns[owner[i]] if owner[i] >= 0 else (0, n, "")
                never = not any(hit[k] for k in range(a, min(b, n)) if owner[k] == owner[i])
                first = next((ln.strip() for ln in body.split("\n") if re.search(r"\w", ln)), body.strip())
                lead = text[starts[line_of(starts, i) - 1]:i].strip()  # what stands before the run on its first line (the condition of an untaken branch)
                runs.append({"function": name or "(module)", "functionLine": line_of(starts, a), "neverCalled": never, "line": line_of(starts, i),
                             "endLine": line_of(starts, j - 1), "chars": len(body.strip()), "text": first[:160], "lead": lead[-200:], "body": body.strip()[:1500],
                             "class": auto_class(body, lead)})
            i = j
        else:
            i += 1
    return runs


def summarize(files, all_files=False):
    rows = {}
    for rel, f in sorted(files.items()):
        if not all_files and not is_rule_file(rel):
            continue
        seen = sum(f["seen"]); hit = sum(f["hit"])
        runs = uncovered_runs(rel, f)
        named = [x for x in f["functions"] if x[2]]
        rows[rel] = {"seenChars": seen, "hitChars": hit, "functions": len(named), "runs": runs,
                     "neverCalled": sorted({(r["function"], r["functionLine"]) for r in runs if r["neverCalled"]})}
    return rows


CLASS_TITLES = {
    "c": "(c) reachable in a Factory Level 50 singles battle",
    "a": "(a) cannot occur in a Factory Level 50 singles battle",
    "b": "(b) not a battle rule",
    "?": "not classified yet",
}


def classify(rows, classes_path):
    """Give every uncovered run its class. `error` and `comment` runs are (b) by pattern. A `rule` run takes the first entry of the classes file that
    names its file, optionally its function and optionally a piece of its text (`match`, looked for in the text before the run plus the run)."""
    entries = json.loads(Path(classes_path).read_text())["entries"] if classes_path else []
    entries = sorted(entries, key=lambda e: e.get("match") is None)  # an entry that names a text goes before an entry for a whole function
    used = [0] * len(entries)
    for rel, r in rows.items():
        name = rel[len(ENGINE):]
        for run in r["runs"]:
            if run["class"] == "error":
                run.update(klass="b", rule="engine stop / error path", reason="the run only throws or returns the engine's own stop (an engine error in the replay if a battle reached it)")
                continue
            if run["class"] == "barrier":
                run.update(klass="b", rule="engine stop: a case the engine does not implement",
                           reason="every such stop is classified one by one in docs/barrier-reachability-triage.md (pinned by tests/executableFrontierRatchet.test.ts): "
                                  "each either cannot be reached in a Factory singles battle or guards a script operand the committed script program never has")
                continue
            if run["class"] == "comment":
                run.update(klass="b", rule="no code", reason="")
                continue
            hay = run["lead"] + " => " + run["body"]
            run["kind"] = run["class"]
            # the entries that fit; the best is the one that names this line, then the one with the longest text, then a whole-function entry
            fits = [(i, e) for i, e in enumerate(entries)
                    if e["file"] == name and e.get("function") in (None, run["function"]) and (e.get("match") is None or e["match"] in hay)]
            if fits:
                i, e = max(fits, key=lambda ie: (ie[1].get("line") == run["line"], len(ie[1].get("match") or "")))
                run.update(klass=e["class"], rule=e["rule"], reason=e.get("reason", ""), how=e.get("how", ""), freq=e.get("freq", ""))
                used[i] += 1
            else:
                run.update(klass="?", rule="", reason="")
    return [e for e, n in zip(entries, used) if n == 0]


AI_FILE = re.compile(r"factoryAi\w*\.ts|battleAiSwitchInto\.ts")


def report(argv):
    files, battles, dropped = load(argv[0])
    opt = lambda name: argv[argv.index(name) + 1] if name in argv else None
    if opt("--ai-cov"):  # the trainer AI files count only battles in which the AI code ran for the opponent alone (collect --skip-policy ai-v1)
        ai_files, ai_battles, _ = load(opt("--ai-cov"))
        for rel in list(files):
            if AI_FILE.fullmatch(rel[len(ENGINE):]):
                if rel in ai_files:
                    files[rel] = ai_files[rel]
                else:
                    del files[rel]
        print(json.dumps({"aiFilesFrom": opt("--ai-cov"), "aiBattles": len(ai_battles)}))
    rows = summarize(files, "--all-files" in argv)
    unused = classify(rows, opt("--classes"))
    runs = [(rel, run) for rel, r in rows.items() for run in r["runs"]]
    never = sum(len(r["neverCalled"]) for r in rows.values())
    seen = sum(r["seenChars"] for r in rows.values()); hit = sum(r["hitChars"] for r in rows.values())
    by_class = collections.Counter(run["klass"] for _, run in runs)
    groups = collections.defaultdict(list)
    for rel, run in runs:
        groups[(run["klass"], run["rule"])].append((rel, run))
    print(json.dumps({"battles": len(battles), "dropped": len(dropped), "files": len(rows), "functions": sum(r["functions"] for r in rows.values()),
                      "functionsNeverCalled": never, "uncoveredRuns": len(runs), "codeChars": seen, "charsRun": hit, "runsByClass": by_class,
                      "rulesByClass": collections.Counter(k for k, _ in groups), "classEntriesThatMatchNothing": len(unused)}))
    for e in unused:
        print("  unused class entry:", json.dumps(e)[:200])
    if opt("--json"):
        Path(opt("--json")).write_text(json.dumps({"battles": len(battles), "files": rows}, indent=1))
    if opt("--worksheet"):  # what a person still has to classify, one file per source file
        out = Path(opt("--worksheet")); out.mkdir(parents=True, exist_ok=True)
        for rel, r in rows.items():
            todo = [{k: run[k] for k in ("function", "functionLine", "neverCalled", "line", "endLine", "kind", "lead", "body")} for run in r["runs"] if run["klass"] == "?"]
            if todo:
                (out / (rel[len(ENGINE):] + ".json")).write_text(json.dumps({"file": rel, "runs": todo}, indent=1))
    if opt("--md"):
        lines = []
        for klass in ("c", "a", "b", "?"):
            mine = sorted((rule, items) for (k, rule), items in groups.items() if k == klass)
            if not mine:
                continue
            lines += ["", f"### {CLASS_TITLES[klass]}", "", f"{len(mine)} rules, {sum(len(i) for _, i in mine)} pieces of code.", ""]
            if klass == "c":
                order = {"common": 0, "uncommon": 1, "rare": 2}
                mine.sort(key=lambda m: (min((order.get(run.get("freq", ""), 3) for _, run in m[1]), default=3), m[0]))
                lines += ["| rule | where | pieces | what a battle needs | how often a player meets it |", "|---|---|---|---|---|"]
            else:
                lines += ["| rule | where | pieces | why |", "|---|---|---|---|"]
            for rule, items in mine:
                where = collections.defaultdict(set)
                for rel, run in items:
                    where[rel[len(ENGINE):]].add(run["function"])
                spot = "; ".join(f"`{f}`: {', '.join(sorted(fn))[:120]}" for f, fn in sorted(where.items()))
                clean = lambda s: s.replace("|", "/").replace("\n", " ")
                if klass == "c":
                    how = next((run.get("how") or run["reason"] for _, run in items if run.get("how") or run["reason"]), "")
                    freq = sorted({run.get("freq", "") for _, run in items if run.get("freq")}, key=lambda f: {"common": 0, "uncommon": 1, "rare": 2}.get(f, 3))
                    lines.append(f"| {clean(rule) or '(none)'} | {spot[:300]} | {len(items)} | {clean(how)} | {', '.join(freq)} |")
                else:
                    reason = next((run["reason"] for _, run in items if run["reason"]), "")
                    lines.append(f"| {clean(rule) or '(none)'} | {spot[:300]} | {len(items)} | {clean(reason)} |")
        Path(opt("--md")).write_text("\n".join(lines) + "\n")


def diff(argv):
    new, _, _ = load(argv[0]); old, _, _ = load(argv[1])
    added = 0
    for rel, f in sorted(new.items()):
        if not is_rule_file(rel):
            continue
        o = old.get(rel)
        nh = int.from_bytes(f["hit"], "little")
        oh = int.from_bytes(o["hit"], "little") if o else 0
        extra = nh & ~oh
        if extra:
            cells = extra.to_bytes(len(f["hit"]), "little")
            text = (ROOT / rel).read_text(encoding="utf-8")
            starts = [0] + [m.end() for m in re.finditer("\n", text)]
            i, n = 0, len(cells)
            while i < n:
                if cells[i]:
                    j = i
                    while j < n and cells[j]:
                        j += 1
                    if text[i:j].strip():
                        added += 1
                        print(f"  {rel[len(ENGINE):]}:{line_of(starts, i)} {text[i:j].strip().splitlines()[0][:120]}")
                    i = j
                else:
                    i += 1
    print(json.dumps({"newlyRunRanges": added}))


def count_at(cov_dir, rel, snippet, root=ROOT):
    """How often the code at the first character of `snippet` (a text that occurs once in the file `rel`) ran, in the V8 coverage files of cov_dir.
    None when the file was not loaded. The innermost reported range decides."""
    text = (Path(root) / rel).read_text(encoding="utf-8")
    if text.count(snippet) != 1:
        raise SystemExit(f"{rel}: the snippet must occur exactly once (it occurs {text.count(snippet)} times): {snippet!r}")
    at = text.index(snippet)
    total = None
    for cov in glob.glob(str(Path(cov_dir) / "coverage-*.json")):
        script = next((s for s in json.loads(Path(cov).read_text())["result"] if s["url"].endswith("/" + rel)), None)
        if script is None:
            continue
        inner = None
        for f in script["functions"]:
            for r in f["ranges"]:
                if r["startOffset"] <= at < r["endOffset"] and (inner is None or r["endOffset"] - r["startOffset"] <= inner["endOffset"] - inner["startOffset"]):
                    inner = r
        if inner is not None:
            total = (total or 0) + inner["count"]
    return total


def selfcheck(argv):
    """The offset proof on one known branch: ppreduce's `: withActivePp` arm (a Transformed attacker) is not run by an ordinary battle (SETUP_A, a seed
    battle given as SEED:POLICY:SETUP) and is run by the staged Transform battle (STAGE_B with SETUP_B)."""
    seed, policy, setup_a = argv[0].split(":", 2)
    stage_b, setup_b = argv[1], argv[2]
    rel = ENGINE + "battleScriptHitChainOpcode.ts"
    text = (ROOT / rel).read_text(encoding="utf-8")
    at = text.index(": withActivePp;")
    results = []
    for which, setup, pol in (([f"--seed={seed}"], setup_a, policy), ([f"--stage={stage_b}"], setup_b, "script")):
        with tempfile.TemporaryDirectory() as tmp:
            env = {**os.environ, "NODE_V8_COVERAGE": tmp + "/cov", "ROM_REPLAY_POLICY": pol, "ROM_REPLAY_SYMBOLS": "0", "ROM_REPLAY_CHALLENGE": ""}
            subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "tools/integration/soundCensusRomReplay.ts", "replay", *which, "--scene=off",
                            f"--setup={setup}", f"--out={tmp}/e.json"], cwd=ROOT, env=env, check=True, capture_output=True)
            cov = json.loads(Path(glob.glob(tmp + "/cov/coverage-*.json")[0]).read_text())["result"]
            script = next(s for s in cov if s["url"].endswith("/" + rel))
            inner = None
            for f in script["functions"]:
                for r in f["ranges"]:
                    if r["startOffset"] <= at < r["endOffset"] and (inner is None or r["endOffset"] - r["startOffset"] <= inner["endOffset"] - inner["startOffset"]):
                        inner = r
            results.append((inner["startOffset"], inner["endOffset"], inner["count"], text[inner["startOffset"]:inner["endOffset"]]))
    for label, r in zip(("ordinary battle", "staged Transform battle"), results):
        print(f"{label}: offsets {r[0]}..{r[1]} count {r[2]} text {r[3]!r}")
    ok = results[0][2] == 0 and results[1][2] > 0 and results[0][3].strip().startswith(": withActivePp")
    print("offset proof", "OK" if ok else "FAILED")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    cmd, rest = sys.argv[1], sys.argv[2:]
    if cmd == "collect":
        collect(rest)
    elif cmd == "merge":
        files, battles, dropped = {}, set(), set()
        for p in rest[1:]:
            f, b, d = load(p)
            merge_files(files, f); battles |= b; dropped |= d
        save(rest[0], files, battles, dropped)
        print(f"{rest[0]}: {len(battles)} battles")
    elif cmd == "report":
        report(rest)
    elif cmd == "diff":
        diff(rest)
    elif cmd == "selfcheck":
        selfcheck(rest)
    else:
        raise SystemExit(__doc__)
