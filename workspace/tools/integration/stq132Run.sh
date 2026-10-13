#!/bin/sh
# stq132 (S10A SLP / BRN / INFATUATION render prep; docs/stq132-status-condition-render-prep.md): rerun every committed receipt from scratch.
#   sh tools/integration/stq132Run.sh <fresh-out-dir-inside-the-repo> [<rev>]     (from workspace/)
# 1. a git-archive copy of <rev> (default HEAD) in <out>/copy, its own two-commit git repo (node_modules, reference/ linked);
# 2. stq132Stage.py == committed scenarios (13) + scenario-index.json;
# 3. probes: 13 scenarios x {r1, r2} (stq132Probe.py, direct mGBA, Scene ON, 7 parallel, all r1 before any r2; r1 dumps the window
#    frames; a crashed job reruns once); r1 == r2 and == probe-sha256.json; stq132Receipt.py r1 == committed rom-windows.json, r2 == r1;
# 4. tests/stq132StatusConditionReducer.test.ts + stp128's (unchanged) in the copy;
# 5. stq132NpzToRaw.py + stq132Compare.ts (main + 7 negative controls) -> stq132CompareReceipt.py == committed compare.json.
# Raw frame dumps (<out>/dump, <out>/raw: ~0.4 GB) are deleted at the end unless STQ132_KEEP_RAW=1, the archive copy (<out>/copy)
# unless STQ132_KEEP_COPY=1.
set -u
OUT="$1"; REV="${2:-HEAD}"
[ -e "$OUT" ] && { echo "refusing: $OUT exists"; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
W=$(pwd); F=tools/integration/fixtures/stq132; fail=0
check() { cmp -s "$1" "$2" && echo "SAME $3" || { echo "DIFF $3"; fail=1; }; }
mkdir -p "$OUT/copy/workspace"
git archive "$(git rev-parse "$REV")" . | tar -x -C "$OUT/copy/workspace"
ln -s "$W/node_modules" "$OUT/copy/workspace/node_modules"
ln -s "$W/reference" "$OUT/copy/workspace/reference"
(cd "$OUT/copy/workspace" && git init -q && git add -A > /dev/null && git -c user.email=stq132@local -c user.name=stq132 commit -qm copy \
  && git -c user.email=stq132@local -c user.name=stq132 commit -q --allow-empty -m extra)
CW="$OUT/copy/workspace"
# 2. staging
(cd "$CW" && python3 tools/integration/stq132Stage.py "$OUT/stage/scenarios" > /dev/null)
diff -r "$CW/$F/scenarios" "$OUT/stage/scenarios" > /dev/null && echo "SAME scenarios ($(ls "$OUT/stage/scenarios" | wc -l | tr -d ' '))" || { echo "DIFF scenarios"; fail=1; }
check "$CW/$F/scenario-index.json" "$OUT/stage/scenario-index.json" "scenario-index"
# 3. probes
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2" "$OUT/dump"
(cd "$CW" && ls "$F"/scenarios/*.json | while read -r s; do echo "$OUT/probes/r1 $s $OUT/dump"; done | xargs -P 7 -n 3 sh tools/integration/stq132Job.sh)
(cd "$CW" && ls "$F"/scenarios/*.json | while read -r s; do echo "$OUT/probes/r2 $s"; done | xargs -P 7 -n 2 sh tools/integration/stq132Job.sh)
n=0; same=0
for p in "$OUT/probes/r1"/*.json; do n=$((n + 1)); cmp -s "$p" "$OUT/probes/r2/$(basename "$p")" && same=$((same + 1)); done
echo "probes: $same / $n r1 == r2"; [ "$same" -eq "$n" ] && [ "$n" -eq 13 ] || fail=1
python3 - "$OUT" "$CW/$F/probe-sha256.json" <<'PYEOF' || fail=1
import hashlib, json, os, sys
out, rec = sys.argv[1], json.load(open(sys.argv[2]))
same = sum(hashlib.sha256(open(os.path.join(out, "probes", r, k), "rb").read()).hexdigest() == v[r] for k, v in rec.items() for r in ("r1", "r2"))
print(f"probe outputs == committed sha256: {same} / {2 * len(rec)}")
sys.exit(0 if same == 2 * len(rec) else 1)
PYEOF
(cd "$CW" && python3 tools/integration/stq132Receipt.py "$OUT/probes/r1" "$F/scenario-index.json" "$OUT/rom-windows.json" > /dev/null \
  && python3 tools/integration/stq132Receipt.py "$OUT/probes/r2" "$F/scenario-index.json" "$OUT/rom-windows-r2.json" > /dev/null)
check "$CW/$F/rom-windows.json" "$OUT/rom-windows.json" "rom-windows.json"
check "$OUT/rom-windows.json" "$OUT/rom-windows-r2.json" "rom-windows r2 == r1"
# 4. reducer pins
(cd "$CW" && npx vitest run --no-watch tests/stq132StatusConditionReducer.test.ts tests/stp128StatusConditionReducer.test.ts > "$OUT/test.log" 2>&1) && echo "reducer test: $(grep -E 'Tests ' "$OUT/test.log" | tr -s ' ')" \
  || { echo "reducer test FAILED"; fail=1; }
# 5. comparator
(cd "$CW" && python3 tools/integration/stq132NpzToRaw.py "$OUT/dump" "$F/rom-windows.json" "$OUT/raw" > /dev/null) || fail=1
mkdir -p "$OUT/cmp"
(cd "$CW" && node --experimental-strip-types --no-warnings tools/integration/stq132Compare.ts "$OUT/raw" "$OUT/cmp/main.json" | tail -1)
for c in age+1 wrong-side drop-one no-affine tie-swap index-order; do
  (cd "$CW" && node --experimental-strip-types --no-warnings tools/integration/stq132Compare.ts "$OUT/raw" "$OUT/cmp/$c.json" --neg=$c > /dev/null)
done
(cd "$CW" && node --experimental-strip-types --no-warnings tools/integration/stq132Compare.ts "$OUT/raw" "$OUT/cmp/no-occluders.json" --no-healthbox > /dev/null)
C="$OUT/cmp"
(cd "$CW" && python3 tools/integration/stq132CompareReceipt.py "$OUT/compare.json" "$C/main.json" "age+1=$C/age+1.json" "wrong-side=$C/wrong-side.json" \
  "drop-one=$C/drop-one.json" "no-affine=$C/no-affine.json" "tie-swap=$C/tie-swap.json" "index-order=$C/index-order.json" \
  "no-occluders=$C/no-occluders.json")
check "$CW/$F/compare.json" "$OUT/compare.json" "compare.json"
[ "${STQ132_KEEP_RAW:-0}" = 1 ] || rm -rf "$OUT/dump" "$OUT/raw"
# the archive copy (and its git repo) is deleted too; the receipts stay in <out>
[ "${STQ132_KEEP_COPY:-0}" = 1 ] || rm -rf "$OUT/copy"
[ "$fail" -eq 0 ] && echo "stq132Run: ALL SAME" || { echo "stq132Run: FAILED"; exit 1; }
