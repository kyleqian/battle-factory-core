#!/bin/sh
# sta123 (S10A status-animation prep pack; docs/sta123-status-animations-design.md): rerun every committed receipt from scratch.
#   sh tools/integration/sta123Run.sh <fresh-out-dir-inside-the-repo> [--census] [<rev>]     (from workspace/)
# 1. a git-archive copy of <rev> (default HEAD) in <out>/copy, its own two-commit git repo (node_modules, reference/ linked);
# 2. sta123Stage.py == committed scenarios (18) + scenario-index;
# 3. probes: 18 scenarios x {ON, OFF} x {r1, r2} (idle94Probe.py, direct mGBA, 8 parallel, all r1 before any r2; a crashed job reruns
#    once); r1 == r2 and == receipts/probe-sha256.json; sta123Rom.py r1 == committed receipts/rom-r1.json, r2 == r1;
# 4. --census: sta123Exposure.ts seeds 0..999 (ten shards, Scene ON production kernel), sta123ExposureSummary.py == committed
#    exposure.json.
set -u
OUT="$1"; CENSUS="${2:-}"; REV="${3:-HEAD}"
[ -e "$OUT" ] && { echo "refusing: $OUT exists"; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
W=$(pwd); F=tools/integration/fixtures/sta123; fail=0
check() { cmp -s "$1" "$2" && echo "SAME $3" || { echo "DIFF $3"; fail=1; }; }
mkdir -p "$OUT/copy/workspace"
git archive "$(git rev-parse "$REV")" . | tar -x -C "$OUT/copy/workspace"
ln -s "$W/node_modules" "$OUT/copy/workspace/node_modules"
ln -s "$W/reference" "$OUT/copy/workspace/reference"
(cd "$OUT/copy/workspace" && git init -q && git add -A > /dev/null && git -c user.email=sta123@local -c user.name=sta123 commit -qm copy \
  && git -c user.email=sta123@local -c user.name=sta123 commit -q --allow-empty -m extra)
CW="$OUT/copy/workspace"
# 2. staging
(cd "$CW" && python3 tools/integration/sta123Stage.py "$OUT/stage/scenarios" > /dev/null)
diff -r "$CW/$F/scenarios" "$OUT/stage/scenarios" > /dev/null && echo "SAME scenarios (18)" || { echo "DIFF scenarios"; fail=1; }
check "$CW/$F/scenario-index.json" "$OUT/stage/scenario-index.json" "scenario-index"
# 3. probes
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2"
cat > "$OUT/job.sh" <<'JOB'
#!/bin/sh
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
o="$1/$(basename "$3" .json)-$2.json"
python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1; }
JOB
for r in r1 r2; do
  (cd "$CW" && for m in on off; do for s in "$F"/scenarios/*.json; do echo "$OUT/probes/$r $m $s"; done; done | xargs -P 8 -n 3 sh "$OUT/job.sh")
done
n=0; same=0
for p in "$OUT/probes/r1"/*.json; do n=$((n + 1)); cmp -s "$p" "$OUT/probes/r2/$(basename "$p")" && same=$((same + 1)); done
echo "probes: $same / $n r1 == r2"; [ "$same" -eq "$n" ] && [ "$n" -eq 36 ] || fail=1
python3 - "$OUT" "$CW/$F/receipts/probe-sha256.json" <<'PYEOF' || fail=1
import hashlib, json, os, sys
out, rec = sys.argv[1], json.load(open(sys.argv[2]))
same = sum(hashlib.sha256(open(os.path.join(out, "probes", r, k), "rb").read()).hexdigest() == v[r] for k, v in rec.items() for r in ("r1", "r2"))
print(f"probe outputs == committed sha256: {same} / {2 * len(rec)}")
sys.exit(0 if same == 2 * len(rec) else 1)
PYEOF
(cd "$CW" && python3 tools/integration/sta123Rom.py "$OUT/probes/r1" "$F/scenario-index.json" "$OUT/rom-r1.json" > /dev/null \
  && python3 tools/integration/sta123Rom.py "$OUT/probes/r2" "$F/scenario-index.json" "$OUT/rom-r2.json" > /dev/null)
check "$CW/$F/receipts/rom-r1.json" "$OUT/rom-r1.json" "rom-r1.json"
check "$OUT/rom-r1.json" "$OUT/rom-r2.json" "rom r2 == r1"
# 4. census exposure
if [ "$CENSUS" = "--census" ]; then
  mkdir -p "$OUT/exposure"
  for k in 0 1 2 3 4 5 6 7 8 9; do
    (cd "$CW" && node --experimental-strip-types --no-warnings tools/integration/sta123Exposure.ts --seeds=$((k * 100))..$((k * 100 + 99)) \
      --out="$OUT/exposure/e$k.jsonl" > "$OUT/exposure/e$k.log" 2>&1) &
  done
  wait
  (cd "$CW" && python3 tools/integration/sta123ExposureSummary.py "$OUT/exposure" "$OUT/exposure.json" > /dev/null)
  check "$CW/$F/exposure.json" "$OUT/exposure.json" "exposure.json"
fi
[ "$fail" -eq 0 ] && echo "sta123Run: ALL SAME" || { echo "sta123Run: FAILED"; exit 1; }
