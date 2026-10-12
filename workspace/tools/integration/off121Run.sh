#!/bin/sh
# off121 (S10A timeline fidelity; docs/off121-status-command.md): rerun the Scene OFF `status` command evidence from scratch.
#   sh tools/integration/off121Run.sh <fresh-out-dir-inside-the-repo> [--census] [<final-rev>]     (from workspace/)
# 1. git-archive copies of the base 9d23a17c4 and <final-rev> (default HEAD), each its own two-commit git repo;
# 2. off121Stage.py == committed scenarios + scenario-index;
# 3. probes: 9 scenarios x {ON, OFF} x {r1, r2} (idle94Probe.py, direct mGBA, 6 parallel; a crashed job reruns once), r1 == r2 and
#    == receipts/probe-sha256.json; off121Rom.py r1 == committed receipts/rom-r1.json, r2 == r1;
# 4. vitest tests/off121StatusCommand.test.ts in the final copy;
# 5. --census: liveShareCensus.ts (Scene ON) + off108Route.ts (Scene OFF) + off121StatusCensus.ts (Scene OFF), seeds 0..999, ten
#    shards per copy; hist73Merge.py per ON tree; off121CensusDelta.py; off121Receipt.py == fixtures/off121-live-receipt.json.
set -u
OUT="$1"; CENSUS="${2:-}"; FINAL="${3:-HEAD}"
[ -e "$OUT" ] && { echo "refusing: $OUT exists"; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
W=$(pwd); F=tools/integration/fixtures/off121; BASE=9d23a17c4
FINAL_SHA=$(git rev-parse "$FINAL"); fail=0
check() { cmp -s "$1" "$2" && echo "SAME $3" || { echo "DIFF $3"; fail=1; }; }
for t in base final; do
  rev=$BASE; [ "$t" = final ] && rev=$FINAL_SHA
  mkdir -p "$OUT/$t/workspace"
  git archive "$rev" . | tar -x -C "$OUT/$t/workspace"
  ln -s "$W/node_modules" "$OUT/$t/workspace/node_modules"
  (cd "$OUT/$t/workspace" && git init -q && git add -A > /dev/null && git -c user.email=off121@local -c user.name=off121 commit -qm "$t" \
    && git -c user.email=off121@local -c user.name=off121 commit -q --allow-empty -m extra)
done
FW="$OUT/final/workspace"
# 2. staging
(cd "$FW" && python3 tools/integration/off121Stage.py "$OUT/stage/scenarios" > /dev/null)
diff -r "$FW/$F/scenarios" "$OUT/stage/scenarios" > /dev/null && echo "SAME scenarios (9)" || { echo "DIFF scenarios"; fail=1; }
check "$FW/$F/scenario-index.json" "$OUT/stage/scenario-index.json" "scenario-index"
# 3. probes
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2"
cat > "$OUT/job.sh" <<'JOB'
#!/bin/sh
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
o="$1/$(basename "$3" .json)-$2.json"
python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1; }
JOB
(cd "$FW" && for r in r1 r2; do for m in on off; do for s in "$F"/scenarios/*.json; do echo "$OUT/probes/$r $m $s"; done; done; done \
  | xargs -P 6 -n 3 sh "$OUT/job.sh")
n=0; same=0
for p in "$OUT/probes/r1"/*.json; do n=$((n + 1)); cmp -s "$p" "$OUT/probes/r2/$(basename "$p")" && same=$((same + 1)); done
echo "probes: $same / $n r1 == r2"; [ "$same" -eq "$n" ] && [ "$n" -eq 18 ] || fail=1
python3 - "$OUT" "$FW/$F/receipts/probe-sha256.json" <<'PYEOF' || fail=1
import hashlib, json, os, sys
out, rec = sys.argv[1], json.load(open(sys.argv[2]))
same = sum(hashlib.sha256(open(os.path.join(out, "probes", r, k), "rb").read()).hexdigest() == v[r] for k, v in rec.items() for r in ("r1", "r2"))
print(f"probe outputs == committed sha256: {same} / {2 * len(rec)}")
sys.exit(0 if same == 2 * len(rec) else 1)
PYEOF
(cd "$FW" && python3 tools/integration/off121Rom.py "$OUT/probes/r1" "$F/scenario-index.json" "$OUT/rom-r1.json" > /dev/null \
  && python3 tools/integration/off121Rom.py "$OUT/probes/r2" "$F/scenario-index.json" "$OUT/rom-r2.json" > /dev/null)
check "$FW/$F/receipts/rom-r1.json" "$OUT/rom-r1.json" "rom-r1.json"
check "$OUT/rom-r1.json" "$OUT/rom-r2.json" "rom r2 == r1"
# 4. test
(cd "$FW" && npx vitest run tests/off121StatusCommand.test.ts > "$OUT/vitest.log" 2>&1) && echo "off121StatusCommand: PASS" || { echo "off121StatusCommand: FAIL"; fail=1; }
# 5. census
if [ "$CENSUS" = "--census" ]; then
  NODE="node --experimental-strip-types --no-warnings"
  cp "$FW/tools/integration/off121StatusCensus.ts" "$OUT/base/workspace/tools/integration/"
  for t in base final; do
    mkdir -p "$OUT/census-$t" "$OUT/offcensus-$t" "$OUT/status-$t"
    for k in 0 1 2 3 4 5 6 7 8 9; do
      (cd "$OUT/$t/workspace" && $NODE tools/integration/liveShareCensus.ts --seeds=$((k * 100))..$((k * 100 + 99)) --index-from=$((k * 100)) \
        --out="$OUT/census-$t/r$k.json" --commands="$OUT/census-$t/r$k.jsonl" > "$OUT/census-$t/r$k.log" 2>&1) &
    done
  done
  wait
  for t in base final; do
    for k in 0 1 2 3 4 5 6 7 8 9; do
      (cd "$OUT/$t/workspace" && $NODE tools/integration/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=off --out="$OUT/offcensus-$t/off-$k.jsonl" > /dev/null 2>&1) &
    done
  done
  wait
  for t in base final; do
    for k in 0 1 2 3 4 5 6 7 8 9; do
      (cd "$OUT/$t/workspace" && $NODE tools/integration/off121StatusCensus.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=off --out="$OUT/status-$t/off-$k.jsonl" > /dev/null 2>&1) &
    done
  done
  wait
  for t in base final; do
    python3 tools/integration/hist73Merge.py "$OUT/census-$t" "$OUT/census-$t/merged.json" "$OUT/census-$t/merged.jsonl" > /dev/null
  done
  python3 tools/integration/off121CensusDelta.py "$OUT/census-base" "$OUT/census-final" "$OUT/offcensus-base" "$OUT/offcensus-final" "$OUT/census-delta.json"
  python3 tools/integration/off121Receipt.py "$OUT" "$(git rev-parse "$FINAL_SHA:workspace/src")" "$OUT/off121-live-receipt.json"
  check tools/integration/fixtures/off121-live-receipt.json "$OUT/off121-live-receipt.json" "off121-live-receipt.json"
fi
[ "$fail" -eq 0 ] && echo "off121Run: ALL SAME" || { echo "off121Run: FAILED"; exit 1; }
