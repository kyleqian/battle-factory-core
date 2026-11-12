#!/bin/sh
# idle94 runner (docs/next-adapters-idle94.md). Run from workspace/; direct mGBA only (never the shared HTTP oracles); the production
# change is applied ONLY to a git-archive copy of the fixed base e3af65432 inside the FRESH <out-dir> (refused if non-empty; must be
# inside the repo so the copies find ../oracle). Nothing outside <out-dir> is written or removed.
#   sh tools/integration/idle94Run.sh <fresh-out-dir> [--census]
# 1. archive copies: <out>/base (e3af65432) and <out>/patched (+ fixtures/idle94/idle94-lead-rows.diff); the idle94 tools and fixtures
#    from this checkout are copied into both;
# 2. re-stage the 20 scenarios + the 98 lead-scan scenarios (must equal the committed ones);
# 3. the lead / trail table without census columns (lead / trail columns must equal the committed table.tsv);
# 4. probes: 20 scenarios x {ON, OFF} x {r1, r2} and 98 lead scans x {r1, r2} (8 parallel; a crashed job reruns once), r1 == r2 byte for
#    byte, idle94Compare.py == receipts/compare-r1.json, idle94LeadScan.py check == lead-scan/check-r1.json;
# 5. production routes: idle94RouteRender.ts in both copies x {r1, r2}; idle94RenderCheck.py == receipts/render-check.json;
# 6. --census: liveShareCensus.ts seeds 0..999 (ten --index-from shards) in both copies; hist73Merge.py; the full table (with census
#    columns) == table/table.tsv; idle94CensusDelta.py == census-delta.json.
set -eu
OUT=${1:?usage: idle94Run.sh <fresh-out-dir> [--census]}
CENSUS=${2:-}
W=$(pwd)
[ -f "$W/tools/integration/idle94Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
F=tools/integration/fixtures/idle94
PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
fail=0
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }

for t in base patched; do
  mkdir -p "$OUT/$t"
  git -C .. archive e3af65432 workspace | tar -x -C "$OUT/$t"
  ln -s "$W/node_modules" "$OUT/$t/workspace/node_modules"
  ln -s "$W/reference" "$OUT/$t/workspace/reference"
  cp tools/integration/idle94*.py tools/integration/idle94*.ts "$OUT/$t/workspace/tools/integration/"
  mkdir -p "$OUT/$t/workspace/$F" && cp -R "$F/." "$OUT/$t/workspace/$F/"
done
# patch(1), not git apply: inside the repo's tree git apply silently skips paths outside its cwd.
patch -s -p1 -d "$OUT/patched" < "$F/idle94-lead-rows.diff"
refs=$(grep -c LIVE_MOVE_IDLE_LEAD_ROWS "$OUT/patched/workspace/src/engine/battleResolutionPresentationRender.ts" || true)
echo "patched: $refs lead-map references"; [ "$refs" -gt 0 ] || { echo "patch not applied"; exit 1; }

# 2. staging
python3 tools/integration/idle94Stage.py "$OUT/stage/scenarios" > /dev/null
diff -r "$F/scenarios" "$OUT/stage/scenarios" > /dev/null && echo "SAME scenarios (20)" || { echo "DIFF scenarios"; fail=1; }
check "$F/scenario-index.json" "$OUT/stage/scenario-index.json" scenario-index
python3 tools/integration/idle94LeadScan.py stage "$F/table/table.tsv" "$OUT/lead-stage" > /dev/null
diff -r "$F/lead-scan/scenarios" "$OUT/lead-stage" > /dev/null && echo "SAME lead-scan scenarios" || { echo "DIFF lead-scan scenarios"; fail=1; }

# 3. table (lead / trail columns)
python3 tools/integration/idle94Table.py "$OUT/table-nocensus" > /dev/null
cut -f1-5 "$F/table/table.tsv" > "$OUT/table-committed-lead.tsv"; cut -f1-5 "$OUT/table-nocensus/table.tsv" > "$OUT/table-lead.tsv"
check "$OUT/table-committed-lead.tsv" "$OUT/table-lead.tsv" "table.tsv lead column (trail needs the census D: --census)"

# 4. probes
cd "$OUT/base/workspace"
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2" "$OUT/leadscan/r1" "$OUT/leadscan/r2"
export IDLE94_OUT="$OUT" IDLE94_PY="$PY"
cat > "$OUT/job.sh" <<'EOF'
#!/bin/sh
# job.sh <run> <mode> <scenario> <dir>   (IDLE94_OUT / IDLE94_PY from idle94Run.sh)
o=$IDLE94_OUT/$4/$1/$(basename "$3" .json)-$2.json
python3 tools/run-mgba-probe.py "$o" -- "$IDLE94_PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$IDLE94_PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1; }
rm -f "$o.log"
EOF
chmod +x "$OUT/job.sh"
for r in r1 r2; do
  for m in on off; do for f in $F/scenarios/*.json; do echo "$r $m $f probes"; done; done | xargs -P 8 -n 4 "$OUT/job.sh"
  for f in $F/lead-scan/scenarios/idle94-lead-*.json; do echo "$r on $f leadscan"; done | xargs -P 8 -n 4 "$OUT/job.sh"
done
for d in probes leadscan; do
  n=0; same=0
  for f in "$OUT/$d/r1"/*.json; do n=$((n + 1)); cmp -s "$f" "$OUT/$d/r2/$(basename "$f")" && same=$((same + 1)); done
  echo "$d: $same / $n r1 == r2"; [ "$same" -eq "$n" ] || fail=1
done
cd "$W"
python3 - "$OUT" "$F/receipts/probe-sha256.json" <<'EOF' || fail=1
import hashlib, json, os, sys
out, rec = sys.argv[1], json.load(open(sys.argv[2]))["sha256"]
same = sum(hashlib.sha256(open(os.path.join(out, k.split("/")[0], "r1", k.split("/")[1]), "rb").read()).hexdigest() == v["r1"] for k, v in rec.items())
print(f"probe outputs == committed sha256: {same} / {len(rec)}")
sys.exit(0 if same == len(rec) else 1)
EOF
python3 tools/integration/idle94Compare.py "$OUT/probes/r1" "$OUT/compare-r1.json" | tail -1
check "$F/receipts/compare-r1.json" "$OUT/compare-r1.json" "compare-r1.json"
python3 tools/integration/idle94LeadScan.py check "$F/lead-scan/scenarios" "$OUT/leadscan/r1" "$OUT/leadscan-check-r1.json" | head -1
check "$F/lead-scan/check-r1.json" "$OUT/leadscan-check-r1.json" "lead-scan check"

# 5. production routes
mkdir -p "$OUT/render"
for t in base patched; do for r in r1 r2; do
  (cd "$OUT/$t/workspace" && while read -r b m sd; do
    node --experimental-strip-types --no-warnings tools/integration/idle94RouteRender.ts --seed="$b" --streak=$(( (b * 11) % 49 )) --move="$m" \
      --side="$sd" --out="$OUT/render/$t-$r-b$b-$m-$sd.json" > /dev/null
  done < "$W/$F/render-routes.txt")
done; done
python3 tools/integration/idle94RenderCheck.py "$OUT/render" "$F/render-routes.txt" "$OUT/render-check.json" | tail -1
check "$F/receipts/render-check.json" "$OUT/render-check.json" "render-check.json"

# 6. census (optional)
if [ "$CENSUS" = "--census" ]; then
  for t in base patched; do
    mkdir -p "$OUT/census-$t"
    (cd "$OUT/$t/workspace" && for k in 0 1 2 3 4 5 6 7 8 9; do
      node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=$((k * 100))..$((k * 100 + 99)) --index-from=$((k * 100)) \
        --out="$OUT/census-$t/r$k.json" --commands="$OUT/census-$t/r$k.jsonl" > "$OUT/census-$t/r$k.log" 2>&1 &
    done; wait)
  done
  python3 tools/integration/hist73Merge.py "$OUT/census-base" "$OUT/census-base-merged.json" "$OUT/census-base-merged.jsonl" | tail -1
  python3 tools/integration/idle94Table.py "$OUT/table" "$OUT/census-base-merged.jsonl" > /dev/null
  check "$F/table/table.tsv" "$OUT/table/table.tsv" "table.tsv (with census)"
  python3 tools/integration/idle94CensusDelta.py "$OUT/census-base" "$OUT/census-patched" "$F/idle94-lead-rows.diff" "$OUT/census-delta.json"
  check "$F/census-delta.json" "$OUT/census-delta.json" "census-delta.json"
fi
[ "$fail" -eq 0 ] && echo "idle94Run: ALL SAME" || { echo "idle94Run: DIFFERENCES (see above)"; exit 1; }
