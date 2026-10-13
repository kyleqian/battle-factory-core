#!/bin/sh
# seg127 (S10A / ISSUES #168 SA2 prep; docs/seg127-status-se-gate.md): rerun every committed receipt from scratch.
#   sh tools/integration/seg127Run.sh <fresh-out-dir-inside-the-repo> [--census] [<base-rev>]     (from workspace/)
# 1. a git-archive copy of <base-rev> (default cfe4e26ca, the fixed evidence base) in <out>/copy, overlaid with the seg127 files of HEAD
#    (tools/integration/seg127*, fixtures/seg127, the banked rule + its test, this doc); its own two-commit git repo; node_modules /
#    reference linked;
# 2. seg127Stage.py == committed scenarios (32) + scenario-index;
# 3. probes: 32 scenarios x Scene ON x {r1, r2} (seg127Probe.py, direct mGBA, 8 parallel, all r1 before any r2; a crashed job reruns
#    once); r1 == r2 and == receipts/probe-sha256.json; seg127Rom.py r1 == committed receipts/rom-r1.json, r2 == r1, 0 rule residuals;
# 4. --census: seg127Exposure.ts seeds 0..999 (ten shards, Scene ON production kernel), seg127ExposureSummary.py (+ the committed
#    rule.json projection) == committed exposure.json.
set -u
OUT="$1"; CENSUS="${2:-}"; BASE="${3:-cfe4e26ca}"
[ -e "$OUT" ] && { echo "refusing: $OUT exists"; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
W=$(pwd); F=tools/integration/fixtures/seg127; fail=0
check() { cmp -s "$1" "$2" && echo "SAME $3" || { echo "DIFF $3"; fail=1; }; }
mkdir -p "$OUT/copy/workspace"
git archive "$(git rev-parse "$BASE")" . | tar -x -C "$OUT/copy/workspace"
git archive HEAD $(git ls-files 'tools/integration/seg127*' "$F" src/engine/seg127StatusSeGate.ts tests/seg127StatusSeGate.test.ts \
  docs/seg127-status-se-gate.md) | tar -x -C "$OUT/copy/workspace"
ln -s "$W/node_modules" "$OUT/copy/workspace/node_modules"
ln -s "$W/reference" "$OUT/copy/workspace/reference"
(cd "$OUT/copy/workspace" && git init -q && git add -A > /dev/null && git -c user.email=seg127@local -c user.name=seg127 commit -qm copy \
  && git -c user.email=seg127@local -c user.name=seg127 commit -q --allow-empty -m extra)
CW="$OUT/copy/workspace"
# 2. staging
(cd "$CW" && python3 tools/integration/seg127Stage.py "$OUT/stage/scenarios" > /dev/null)
diff -r "$CW/$F/scenarios" "$OUT/stage/scenarios" > /dev/null && echo "SAME scenarios ($(ls "$OUT/stage/scenarios" | wc -l | tr -d ' '))" \
  || { echo "DIFF scenarios"; fail=1; }
check "$CW/$F/scenario-index.json" "$OUT/stage/scenario-index.json" "scenario-index"
# 3. probes
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2"
cat > "$OUT/job.sh" <<'JOB'
#!/bin/sh
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
o="$1/$(basename "$2" .json)-on.json"
python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/seg127Probe.py "$2" on "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/seg127Probe.py "$2" on "$o" > /dev/null 2>&1; }
rm -f "$o.log"
JOB
for r in r1 r2; do
  (cd "$CW" && for s in "$F"/scenarios/*.json; do echo "$OUT/probes/$r $s"; done | xargs -P 8 -n 2 sh "$OUT/job.sh")
done
n=0; same=0
for p in "$OUT/probes/r1"/*.json; do n=$((n + 1)); cmp -s "$p" "$OUT/probes/r2/$(basename "$p")" && same=$((same + 1)); done
echo "probes: $same / $n r1 == r2"; [ "$same" -eq "$n" ] && [ "$n" -eq 32 ] || fail=1
python3 - "$OUT" "$CW/$F/receipts/probe-sha256.json" <<'PYEOF' || fail=1
import hashlib, json, os, sys
out, rec = sys.argv[1], json.load(open(sys.argv[2]))
same = sum(hashlib.sha256(open(os.path.join(out, "probes", r, k), "rb").read()).hexdigest() == v[r] for k, v in rec.items() for r in ("r1", "r2"))
print(f"probe outputs == committed sha256: {same} / {2 * len(rec)}")
sys.exit(0 if same == 2 * len(rec) else 1)
PYEOF
(cd "$CW" && python3 tools/integration/seg127Rom.py "$OUT/probes/r1" "$F/scenario-index.json" "$OUT/rom-r1.json" \
  && python3 tools/integration/seg127Rom.py "$OUT/probes/r2" "$F/scenario-index.json" "$OUT/rom-r2.json" > /dev/null)
check "$CW/$F/receipts/rom-r1.json" "$OUT/rom-r1.json" "rom-r1.json"
check "$OUT/rom-r1.json" "$OUT/rom-r2.json" "rom r2 == r1"
python3 -c "import json,sys; r=json.load(open(sys.argv[1]))['residuals']; print(f'rule residuals: {len(r)}'); sys.exit(1 if r else 0)" "$OUT/rom-r1.json" || fail=1
# 4. census exposure
if [ "$CENSUS" = "--census" ]; then
  mkdir -p "$OUT/exposure"
  for k in 0 1 2 3 4 5 6 7 8 9; do
    (cd "$CW" && node --experimental-strip-types --no-warnings tools/integration/seg127Exposure.ts --seeds=$((k * 100))..$((k * 100 + 99)) \
      --out="$OUT/exposure/e$k.jsonl" > "$OUT/exposure/e$k.log" 2>&1) &
  done
  wait
  (cd "$CW" && python3 tools/integration/seg127ExposureSummary.py "$OUT/exposure" "$OUT/exposure.json" "$F/rule.json" > /dev/null)
  check "$CW/$F/exposure.json" "$OUT/exposure.json" "exposure.json"
fi
[ "$fail" -eq 0 ] && echo "seg127Run: ALL SAME" || { echo "seg127Run: FAILED"; exit 1; }
