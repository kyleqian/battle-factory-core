#!/bin/sh
# off108 runner (docs/off108-scene-off-pauses.md). Run from workspace/; direct mGBA only (never the shared HTTP oracles); the production
# change is applied ONLY to a git-archive copy of the fixed base 52c181d54 inside the FRESH <out-dir> (refused if non-empty; must be
# inside the repo so the copies find ../oracle). Nothing outside <out-dir> is written or removed.
#   sh tools/integration/off108Run.sh <fresh-out-dir> [--census]
# 1. archive copies: <out>/base (52c181d54) and <out>/patched (+ fixtures/off108/off108-scene-off-pauses.diff); the off108 tools and
#    fixtures from this checkout are copied into both;
# 2. re-stage the 15 scenarios (must equal the committed ones and scenario-index.json);
# 3. probes: 15 scenarios x {ON, OFF} x {r1, r2} (idle94Probe.py, 6 parallel; a crashed job reruns once), r1 == r2 byte for byte and
#    == receipts/probe-sha256.json; off108Rom.py r1 == committed receipts/rom-r1.json, r2 == r1;
# 4. production provenance routes (off108Route.ts): OFF seeds 0..399 in both copies, ON seeds 0..99 in both == receipts/route-sha256.json;
#    off108Classes.py == table/classes.{json,tsv}; off108Verify.py OFF / ON == receipts/verify-{off,on}.json;
# 5. --census: liveShareCensus.ts seeds 0..999 (ten --index-from shards, Scene ON) and off108Route.ts --scene=off seeds 0..999 (ten
#    shards) in both copies; off108CensusDelta.py == census-delta.json.
set -eu
OUT=${1:?usage: off108Run.sh <fresh-out-dir> [--census]}
CENSUS=${2:-}
W=$(pwd)
[ -f "$W/tools/integration/off108Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
F=tools/integration/fixtures/off108
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
NODE="node --experimental-strip-types --no-warnings"
fail=0
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }

for t in base patched; do
  mkdir -p "$OUT/$t"
  git -C .. archive 52c181d54 workspace | tar -x -C "$OUT/$t"
  ln -s "$W/node_modules" "$OUT/$t/workspace/node_modules"
  ln -s "$W/reference" "$OUT/$t/workspace/reference"
  cp tools/integration/off108*.py tools/integration/off108*.ts "$OUT/$t/workspace/tools/integration/"
  mkdir -p "$OUT/$t/workspace/$F" && cp -R "$F/." "$OUT/$t/workspace/$F/"
done
# patch(1), not git apply: inside the repo's tree git apply silently skips paths outside its cwd.
patch -s -p1 -d "$OUT/patched" < "$F/off108-scene-off-pauses.diff"
refs=$(grep -c sceneOffNoHitPauseFrames "$OUT/patched/workspace/src/engine/battleResolutionPresentation.ts" || true)
echo "patched: $refs sceneOffNoHitPauseFrames references"; [ "$refs" -gt 0 ] || { echo "patch not applied"; exit 1; }

# 2. staging
python3 tools/integration/off108Stage.py "$OUT/stage/scenarios" > /dev/null
diff -r "$F/scenarios" "$OUT/stage/scenarios" > /dev/null && echo "SAME scenarios (15)" || { echo "DIFF scenarios"; fail=1; }
check "$F/scenario-index.json" "$OUT/stage/scenario-index.json" scenario-index

# 3. probes
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2"
cat > "$OUT/job.sh" <<'JOB'
#!/bin/sh
# job.sh <outdir> <mode> <scenario>   (run from the base copy's workspace/; OFF108_PY)
o=$1/$(basename "$3" .json)-$2.json
python3 tools/run-mgba-probe.py "$o" -- "$OFF108_PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$OFF108_PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1; }
rm -f "$o.log"
JOB
chmod +x "$OUT/job.sh"
export OFF108_PY="$PY"
(cd "$OUT/base/workspace" && for r in r1 r2; do for m in on off; do for f in "$W/$F"/scenarios/*.json; do echo "$OUT/probes/$r $m $f"; done; done; done \
  | xargs -P 6 -n 3 "$OUT/job.sh")
n=0; same=0
for f in "$OUT/probes/r1"/*.json; do n=$((n + 1)); cmp -s "$f" "$OUT/probes/r2/$(basename "$f")" && same=$((same + 1)); done
echo "probes: $same / $n r1 == r2"; [ "$same" -eq "$n" ] && [ "$n" -eq 30 ] || fail=1
python3 - "$OUT" "$F/receipts/probe-sha256.json" <<'PYEOF' || fail=1
import hashlib, json, os, sys
out, rec = sys.argv[1], json.load(open(sys.argv[2]))["sha256"]
same = sum(hashlib.sha256(open(os.path.join(out, "probes", r, k), "rb").read()).hexdigest() == v[r] for k, v in rec.items() for r in ("r1", "r2"))
print(f"probe outputs == committed sha256: {same} / {2 * len(rec)}")
sys.exit(0 if same == 2 * len(rec) else 1)
PYEOF
python3 tools/integration/off108Rom.py "$OUT/probes/r1" "$F/scenario-index.json" "$OUT/rom-r1.json" > /dev/null
python3 tools/integration/off108Rom.py "$OUT/probes/r2" "$F/scenario-index.json" "$OUT/rom-r2.json" > /dev/null
check "$F/receipts/rom-r1.json" "$OUT/rom-r1.json" "rom-r1.json"
check "$OUT/rom-r1.json" "$OUT/rom-r2.json" "rom r2 == r1"

# 4. production provenance routes, class table, verification
mkdir -p "$OUT/routes" "$OUT/routes-patched" "$OUT/routes-on-base" "$OUT/routes-on-patched"
(cd "$OUT/base/workspace" && for k in 0 1 2 3; do
  $NODE tools/integration/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=off --out="$OUT/routes/off-$k.jsonl" > /dev/null &
done
  $NODE tools/integration/off108Route.ts --seeds=0..99 --scene=on --out="$OUT/routes-on-base/on-0.jsonl" > /dev/null &
  wait)
(cd "$OUT/patched/workspace" && for k in 0 1 2 3; do
  $NODE tools/integration/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=off --out="$OUT/routes-patched/off-$k.jsonl" > /dev/null &
done
  $NODE tools/integration/off108Route.ts --seeds=0..99 --scene=on --out="$OUT/routes-on-patched/on-0.jsonl" > /dev/null &
  wait)
python3 - "$OUT" "$F/receipts/route-sha256.json" <<'PYEOF' || fail=1
import hashlib, json, os, sys
d, rec = sys.argv[1], json.load(open(sys.argv[2]))["sha256"]
same = sum(hashlib.sha256(open(os.path.join(d, k), "rb").read()).hexdigest() == v for k, v in rec.items())
print(f"routes == committed sha256: {same} / {len(rec)}")
sys.exit(0 if same == len(rec) else 1)
PYEOF
python3 tools/integration/off108Classes.py "$OUT/rom-r1.json" "$OUT/routes" "$OUT/table" | tail -1
check "$F/table/classes.json" "$OUT/table/classes.json" "table/classes.json"
check "$F/table/classes.tsv" "$OUT/table/classes.tsv" "table/classes.tsv"
python3 tools/integration/off108Verify.py "$F/table/classes.json" "$OUT/routes" "$OUT/routes-patched" "$OUT/verify-off.json" | tail -1
python3 tools/integration/off108Verify.py "$F/table/classes.json" "$OUT/routes-on-base" "$OUT/routes-on-patched" "$OUT/verify-on.json" --scene=on | tail -1
check "$F/receipts/verify-off.json" "$OUT/verify-off.json" "verify-off.json"
check "$F/receipts/verify-on.json" "$OUT/verify-on.json" "verify-on.json"

# 5. census (optional)
if [ "$CENSUS" = "--census" ]; then
  for t in base patched; do
    mkdir -p "$OUT/census-$t" "$OUT/offcensus-$t"
    (cd "$OUT/$t/workspace" && for k in 0 1 2 3 4 5 6 7 8 9; do
      $NODE tools/integration/liveShareCensus.ts --seeds=$((k * 100))..$((k * 100 + 99)) --index-from=$((k * 100)) \
        --out="$OUT/census-$t/r$k.json" --commands="$OUT/census-$t/r$k.jsonl" > "$OUT/census-$t/r$k.log" 2>&1 &
    done; wait)
    (cd "$OUT/$t/workspace" && for k in 0 1 2 3 4 5 6 7 8 9; do
      $NODE tools/integration/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=off --out="$OUT/offcensus-$t/off-$k.jsonl" > /dev/null 2>&1 &
    done; wait)
  done
  python3 tools/integration/off108CensusDelta.py "$OUT/census-base" "$OUT/census-patched" "$OUT/offcensus-base" "$OUT/offcensus-patched" \
    "$OUT/census-delta.json" | head -1
  check "$F/census-delta.json" "$OUT/census-delta.json" "census-delta.json"
fi
[ "$fail" -eq 0 ] && echo "off108Run: ALL SAME" || { echo "off108Run: DIFFERENCES (see above)"; exit 1; }
