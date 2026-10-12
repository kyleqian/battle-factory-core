#!/bin/sh
# olnd113 runner (docs/olnd113-scene-off-pauses-live.md): the off108 receipts re-run against the LANDED Scene OFF pause / miss-hold change.
# Run from workspace/; direct mGBA only (never the shared HTTP oracles). Base = master bce86a4b0 (sc106 + soak111, no pause); final = <rev>
# (default HEAD). Both are git-archive copies inside the FRESH <out-dir> (refused if non-empty; must be inside the repo so the copies find
# ../oracle). Nothing outside <out-dir> is written or removed.
#   sh tools/integration/olnd113Run.sh <fresh-out-dir> [--census] [<final-rev>]
# 1. archive copies <out>/base (bce86a4b0) and <out>/final (<rev>); off108 + olnd113 tools / fixtures from this checkout copied into both;
# 2. re-stage the 15 off108 scenarios (== committed + scenario-index.json);
# 3. probes: 15 scenarios x {ON, OFF} x {r1, r2} in the base copy (idle94Probe.py, 6 parallel, a crashed job reruns once): r1 == r2 and
#    == off108 receipts/probe-sha256.json; off108Rom.py r1 == off108 receipts/rom-r1.json, r2 == r1  (ROM receipts: must be SAME);
# 4. off108Route.ts OFF seeds 0..399 and ON 0..99 in both copies; off108Classes.py on the base routes == off108 table/classes.{json,tsv};
#    off108Verify.py OFF / ON base vs final; olnd113Verify.py: the rule check with lead(STATS_CHANGE) = 1 + the joint target;
# 5. --census: liveShareCensus.ts (Scene ON) and off108Route.ts --scene=off, seeds 0..999, ten --index-from shards per copy;
#    hist73Merge.py per ON tree; off108CensusDelta.py base vs final;
# 6. <out>/olnd113-live-receipt.json (olnd113Receipt.py) == tools/integration/fixtures/olnd113-live-receipt.json when --census.
set -eu
OUT=${1:?usage: olnd113Run.sh <fresh-out-dir> [--census] [<final-rev>]}
CENSUS=${2:-}
FINAL=${3:-HEAD}
BASE=bce86a4b0
W=$(pwd)
[ -f "$W/tools/integration/olnd113Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
F=tools/integration/fixtures/off108
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
NODE="node --experimental-strip-types --no-warnings"
FINAL_SHA=$(git rev-parse "$FINAL")
echo "base $BASE  final $FINAL_SHA (src $(git rev-parse "$FINAL:workspace/src"))"
fail=0
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }

for t in base final; do
  rev=$BASE; [ "$t" = final ] && rev=$FINAL_SHA
  mkdir -p "$OUT/$t"
  git -C .. archive "$rev" workspace | tar -x -C "$OUT/$t"
  ln -s "$W/node_modules" "$OUT/$t/workspace/node_modules"
  ln -s "$W/reference" "$OUT/$t/workspace/reference"
  cp tools/integration/off108*.py tools/integration/off108*.ts tools/integration/olnd113*.py "$OUT/$t/workspace/tools/integration/"
  mkdir -p "$OUT/$t/workspace/$F" && cp -R "$F/." "$OUT/$t/workspace/$F/"
done
refs=$(grep -c sceneOffNoHitPauseFrames "$OUT/final/workspace/src/engine/battleResolutionPresentation.ts" || true)
echo "final: $refs sceneOffNoHitPauseFrames references"; [ "$refs" -gt 0 ] || { echo "final tree has no pause change"; exit 1; }

# 2. staging
python3 tools/integration/off108Stage.py "$OUT/stage/scenarios" > /dev/null
diff -r "$F/scenarios" "$OUT/stage/scenarios" > /dev/null && echo "SAME scenarios (15)" || { echo "DIFF scenarios"; fail=1; }
check "$F/scenario-index.json" "$OUT/stage/scenario-index.json" scenario-index

# 3. probes (ROM; production-independent)
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2"
cat > "$OUT/job.sh" <<'JOB'
#!/bin/sh
# job.sh <outdir> <mode> <scenario>   (run from the base copy's workspace/; OLND113_PY)
o=$1/$(basename "$3" .json)-$2.json
python3 tools/run-mgba-probe.py "$o" -- "$OLND113_PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$OLND113_PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1; }
rm -f "$o.log"
JOB
chmod +x "$OUT/job.sh"
export OLND113_PY="$PY"
(cd "$OUT/base/workspace" && for r in r1 r2; do for m in on off; do for f in "$W/$F"/scenarios/*.json; do echo "$OUT/probes/$r $m $f"; done; done; done \
  | xargs -P 6 -n 3 "$OUT/job.sh")
n=0; same=0
for f in "$OUT/probes/r1"/*.json; do n=$((n + 1)); cmp -s "$f" "$OUT/probes/r2/$(basename "$f")" && same=$((same + 1)); done
echo "probes: $same / $n r1 == r2"; [ "$same" -eq "$n" ] && [ "$n" -eq 30 ] || fail=1
python3 - "$OUT" "$F/receipts/probe-sha256.json" <<'PYEOF' || fail=1
import hashlib, json, os, sys
out, rec = sys.argv[1], json.load(open(sys.argv[2]))["sha256"]
same = sum(hashlib.sha256(open(os.path.join(out, "probes", r, k), "rb").read()).hexdigest() == v[r] for k, v in rec.items() for r in ("r1", "r2"))
print(f"probe outputs == off108 committed sha256: {same} / {2 * len(rec)}")
sys.exit(0 if same == 2 * len(rec) else 1)
PYEOF
python3 tools/integration/off108Rom.py "$OUT/probes/r1" "$F/scenario-index.json" "$OUT/rom-r1.json" > /dev/null
python3 tools/integration/off108Rom.py "$OUT/probes/r2" "$F/scenario-index.json" "$OUT/rom-r2.json" > /dev/null
check "$F/receipts/rom-r1.json" "$OUT/rom-r1.json" "rom-r1.json"
check "$OUT/rom-r1.json" "$OUT/rom-r2.json" "rom r2 == r1"

# 4. production provenance routes, class table, verification
mkdir -p "$OUT/routes-off-base" "$OUT/routes-off-final" "$OUT/routes-on-base" "$OUT/routes-on-final"
for t in base final; do
  (cd "$OUT/$t/workspace" && for k in 0 1 2 3; do
    $NODE tools/integration/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=off --out="$OUT/routes-off-$t/off-$k.jsonl" > /dev/null &
  done
    $NODE tools/integration/off108Route.ts --seeds=0..99 --scene=on --out="$OUT/routes-on-$t/on-0.jsonl" > /dev/null &
    wait)
done
python3 tools/integration/off108Classes.py "$OUT/rom-r1.json" "$OUT/routes-off-base" "$OUT/table" | tail -1
check "$F/table/classes.json" "$OUT/table/classes.json" "table/classes.json (base bce86a4b0 routes)"
check "$F/table/classes.tsv" "$OUT/table/classes.tsv" "table/classes.tsv"
python3 tools/integration/off108Verify.py "$F/table/classes.json" "$OUT/routes-off-base" "$OUT/routes-off-final" "$OUT/verify-off.json" | tail -1
python3 tools/integration/off108Verify.py "$F/table/classes.json" "$OUT/routes-on-base" "$OUT/routes-on-final" "$OUT/verify-on.json" --scene=on | tail -1
python3 tools/integration/olnd113Verify.py "$OUT/rom-r1.json" "$OUT/verify-off.json" "$OUT/verify-on.json" "$OUT/routes-off-final" "$OUT/olnd113-verify.json"

# 5. census (optional)
if [ "$CENSUS" = "--census" ]; then
  for t in base final; do
    mkdir -p "$OUT/census-$t" "$OUT/offcensus-$t"
    (cd "$OUT/$t/workspace" && for k in 0 1 2 3 4 5 6 7 8 9; do
      $NODE tools/integration/liveShareCensus.ts --seeds=$((k * 100))..$((k * 100 + 99)) --index-from=$((k * 100)) \
        --out="$OUT/census-$t/r$k.json" --commands="$OUT/census-$t/r$k.jsonl" > "$OUT/census-$t/r$k.log" 2>&1 &
    done; wait)
    (cd "$OUT/$t/workspace" && for k in 0 1 2 3 4 5 6 7 8 9; do
      $NODE tools/integration/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=off --out="$OUT/offcensus-$t/off-$k.jsonl" > /dev/null 2>&1 &
    done; wait)
    python3 tools/integration/hist73Merge.py "$OUT/census-$t" "$OUT/census-$t/merged.json" "$OUT/census-$t/merged.jsonl" > /dev/null
  done
  python3 tools/integration/off108CensusDelta.py "$OUT/census-base" "$OUT/census-final" "$OUT/offcensus-base" "$OUT/offcensus-final" \
    "$OUT/census-delta.json" | head -1
  python3 tools/integration/olnd113Receipt.py "$OUT" "$(git rev-parse "$FINAL_SHA:workspace/src")" "$OUT/olnd113-live-receipt.json"
  if [ -f tools/integration/fixtures/olnd113-live-receipt.json ]; then
    check tools/integration/fixtures/olnd113-live-receipt.json "$OUT/olnd113-live-receipt.json" "olnd113-live-receipt.json"
  fi
fi
[ "$fail" -eq 0 ] && echo "olnd113Run: ALL SAME" || { echo "olnd113Run: DIFFERENCES (see above)"; exit 1; }
