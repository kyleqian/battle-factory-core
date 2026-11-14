"""usage (cwd = workspace/): huntq.py JOBS GLOB... : run prehunt.py for every stage file matching the GLOBs that has no hunt log yet, JOBS at a time.
Each stage: lab seeds 90000 + 1000 * k .. (k = the stage's position in the sorted list), as many as its "seeds" (default 60).
Options (anywhere): --max-seeds N caps the seeds per stage (the stage's own "seeds" is the other limit); --out DIR sets the evidence directory (default
.integration/evidence/rrh2). A design that designcheck.py rejects is not hunted (log "REJECTED").
Logs: DIR/chunt/<name>.log, outputs .../<name>/. Prints FOUND / ENGINE-ERROR / NOTE / REJECTED lines as they come."""
import glob, json, os, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
H = os.path.dirname(os.path.abspath(__file__))
args, max_seeds, P = sys.argv[1:], 200, os.path.abspath(".integration/evidence/rrh2")
if "--max-seeds" in args:
    i = args.index("--max-seeds"); max_seeds = int(args[i + 1]); del args[i:i + 2]
if "--out" in args:
    i = args.index("--out"); P = os.path.abspath(args[i + 1]); del args[i:i + 2]
jobs, globs = int(args[0]), args[1:]
files = sorted({f for g in globs for f in glob.glob(g)})
os.makedirs(P + "/chunt", exist_ok=True)
def run(item):
    k, f = item
    st = json.load(open(f)); name = st["name"]
    log = f"{P}/chunt/{name}.log"
    if os.path.exists(log) and "HUNT-END" in open(log).read():
        return name, "done before"
    n = min(int(st.get("seeds", 60)), max_seeds)
    with open(log, "w") as fh:
        subprocess.run(["python3", H + "/prehunt.py", f, f"{P}/chunt/{name}", str(90000 + 1000 * k), str(n)], stdout=fh, stderr=subprocess.STDOUT)
    text = open(log).read()
    tag = "REJECTED" if "REJECTED design" in text else "FOUND" if "FOUND seed" in text else ("ENGINE-ERROR" if "ENGINE-ERROR" in text else "none")
    if "DESIGN-ERROR" in text: tag += "+DESIGN-ERROR"
    if "NOTE:" in text: tag += "+NOTE"
    return name, tag
with ThreadPoolExecutor(jobs) as ex:
    for name, tag in ex.map(run, list(enumerate(files))):
        print(time.strftime("%H:%M:%S"), name, tag, flush=True)
print("HUNTQ-DONE", flush=True)
