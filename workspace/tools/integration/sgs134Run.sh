#!/bin/sh
# sgs134 (S10A timeline fidelity; docs/sgs134-se-gate-other-requests.md): rerun every committed sgs134 receipt from scratch.
#   sh tools/integration/sgs134Run.sh <fresh-out-dir-inside-the-repo> [--delta] [<base-rev>]     (from workspace/)
# 1. a git-archive copy of <base-rev> (default 4f790c9d3, the fixed evidence base) in <out>/copy, overlaid with the sgs134 files of HEAD
#    (tools/integration/sgs134*, fixtures/sgs134, tests/sgs134*, docs/sgs134*); its own two-commit git repo; node_modules / reference /
#    artifacts linked;
# 2. sgs134Stage.py == committed scenarios (10) + scenario-index;
# 3. probes: 10 scenarios x Scene ON / OFF x {r1, r2} (seg127Probe.py, direct mGBA, 6 parallel, all r1 before any r2; a crashed job reruns
#    once); r1 == r2 and == receipts/probe{,-off}-sha256.json; sgs134Rom.py r1 == committed rom-r1.json / rom-off-r1.json, r2 == r1;
# 4. census exposure: sgs134Exposure.ts seeds 0..999 (ten shards, Scene ON kernel) + sgs134ExposureSummary.py == committed exposure.json;
# 5. production today: sgs134Production.ts seeds 0..199 (four shards per scene) + sgs134ProductionSummary.py == committed
#    production-{on,off}.json;
# 6. --delta: a second copy with fixtures/sgs134/sgs134-gate.diff applied (git apply), sgs134Production.ts --all seeds 0..999 in both
#    copies x both scenes (40 shards), sgs134CensusDelta.py ALL TRUE and == committed census-delta.json.
set -u
OUT="$1"; DELTA="${2:-}"; BASE="${3:-4f790c9d3}"
[ -e "$OUT" ] && { echo "refusing: $OUT exists"; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
W=$(pwd); F=tools/integration/fixtures/sgs134; fail=0
check() { cmp -s "$1" "$2" && echo "SAME $3" || { echo "DIFF $3"; fail=1; }; }
mkcopy() {
  mkdir -p "$1/workspace"
  git archive "$(git rev-parse "$BASE")" . | tar -x -C "$1/workspace"
  git archive HEAD $(git ls-files 'tools/integration/sgs134*' "$F" 'tests/sgs134*' 'docs/sgs134*') | tar -x -C "$1/workspace"
  ln -s "$W/node_modules" "$1/workspace/node_modules"
  ln -s "$W/reference" "$1/workspace/reference"
  ln -s "$W/artifacts" "$1/workspace/artifacts"
  (cd "$1/workspace" && git init -q && git add -A > /dev/null && git -c user.email=sgs134@local -c user.name=sgs134 commit -qm copy \
    && git -c user.email=sgs134@local -c user.name=sgs134 commit -q --allow-empty -m extra)
}
mkcopy "$OUT/copy"
CW="$OUT/copy/workspace"
# 2. staging
(cd "$CW" && python3 tools/integration/sgs134Stage.py "$OUT/stage/scenarios" > /dev/null)
diff -r "$CW/$F/scenarios" "$OUT/stage/scenarios" > /dev/null && echo "SAME scenarios ($(ls "$OUT/stage/scenarios" | wc -l | tr -d ' '))" \
  || { echo "DIFF scenarios"; fail=1; }
check "$CW/$F/scenario-index.json" "$OUT/stage/scenario-index.json" "scenario-index"
# 3. probes (both scenes)
cat > "$OUT/job.sh" <<'JOB'
#!/bin/sh
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
o="$1/$(basename "$2" .json)-$3.json"
python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/seg127Probe.py "$2" "$3" "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/seg127Probe.py "$2" "$3" "$o" > /dev/null 2>&1; }
rm -f "$o.log"
JOB
for mode in on off; do
  for r in r1 r2; do
    mkdir -p "$OUT/probes-$mode/$r"
    (cd "$CW" && for s in "$F"/scenarios/*.json; do echo "$OUT/probes-$mode/$r $s $mode"; done | xargs -P 6 -n 3 sh "$OUT/job.sh")
  done
  n=0; same=0
  for p in "$OUT/probes-$mode/r1"/*.json; do n=$((n + 1)); cmp -s "$p" "$OUT/probes-$mode/r2/$(basename "$p")" && same=$((same + 1)); done
  echo "probes $mode: $same / $n r1 == r2"; [ "$same" -eq "$n" ] && [ "$n" -eq 10 ] || fail=1
  sha="$CW/$F/receipts/probe-sha256.json"; rom=rom-r1; [ "$mode" = off ] && { sha="$CW/$F/receipts/probe-off-sha256.json"; rom=rom-off-r1; }
  python3 - "$OUT/probes-$mode" "$sha" <<'PYEOF' || fail=1
import hashlib, json, os, sys
out, rec = sys.argv[1], json.load(open(sys.argv[2]))
same = sum(hashlib.sha256(open(os.path.join(out, r, k), "rb").read()).hexdigest() == v[r] for k, v in rec.items() for r in ("r1", "r2"))
print(f"probe outputs == committed sha256: {same} / {2 * len(rec)}")
sys.exit(0 if same == 2 * len(rec) else 1)
PYEOF
  (cd "$CW" && python3 tools/integration/sgs134Rom.py "$OUT/probes-$mode/r1" "$F/scenario-index.json" "$OUT/$rom.json" $mode > /dev/null \
    && python3 tools/integration/sgs134Rom.py "$OUT/probes-$mode/r2" "$F/scenario-index.json" "$OUT/$rom-r2.json" $mode > /dev/null)
  check "$CW/$F/receipts/$rom.json" "$OUT/$rom.json" "$rom.json"
  check "$OUT/$rom.json" "$OUT/$rom-r2.json" "$rom r2 == r1"
done
# 4. census exposure
mkdir -p "$OUT/exposure"
for k in 0 1 2 3 4 5 6 7 8 9; do
  (cd "$CW" && node --experimental-strip-types --no-warnings tools/integration/sgs134Exposure.ts --seeds=$((k * 100))..$((k * 100 + 99)) \
    --out="$OUT/exposure/e$k.jsonl" > "$OUT/exposure/e$k.log" 2>&1) &
done
wait
(cd "$CW" && python3 tools/integration/sgs134ExposureSummary.py "$OUT/exposure" "$OUT/exposure.json" "$F/fixed-rows.json" > /dev/null)
check "$CW/$F/exposure.json" "$OUT/exposure.json" "exposure.json"
# 5. production today
mkdir -p "$OUT/prod"
for sc in on off; do
  for k in 0 1 2 3; do
    (cd "$CW" && node --experimental-strip-types --no-warnings tools/integration/sgs134Production.ts --seeds=$((k * 50))..$((k * 50 + 49)) \
      --scene=$sc --out="$OUT/prod/$sc$k.jsonl" > "$OUT/prod/$sc$k.log" 2>&1) &
  done
done
wait
for sc in on off; do
  (cd "$CW" && python3 tools/integration/sgs134ProductionSummary.py "$OUT/prod" "$F/fixed-rows.json" "$OUT/production-$sc.json" $sc > /dev/null)
  check "$CW/$F/production-$sc.json" "$OUT/production-$sc.json" "production-$sc.json"
done
# 6. the banked patch's census delta
if [ "$DELTA" = "--delta" ]; then
  mkcopy "$OUT/patched"
  PW="$OUT/patched/workspace"
  (cd "$PW" && git apply "$F/sgs134-gate.diff") && echo "patch applies" || { echo "patch does NOT apply"; fail=1; }
  mkdir -p "$OUT/delta"
  for tree in copy patched; do
    for sc in on off; do
      for k in 0 1 2 3 4 5 6 7 8 9; do
        (cd "$OUT/$tree/workspace" && node --experimental-strip-types --no-warnings tools/integration/sgs134Production.ts \
          --seeds=$((k * 100))..$((k * 100 + 99)) --scene=$sc --all --out="$OUT/delta/$( [ $tree = copy ] && echo base || echo patched )-$sc$k.jsonl" \
          > "$OUT/delta/$tree-$sc$k.log" 2>&1) &
      done
    done
  done
  wait
  (cd "$CW" && python3 tools/integration/sgs134CensusDelta.py "$OUT/delta" "$F/exposure.json" "$OUT/census-delta.json" > /dev/null) || fail=1
  check "$CW/$F/census-delta.json" "$OUT/census-delta.json" "census-delta.json"
fi
[ "$fail" -eq 0 ] && echo "sgs134Run: ALL SAME" || { echo "sgs134Run: FAILED"; exit 1; }
