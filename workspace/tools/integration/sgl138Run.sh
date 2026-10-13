#!/bin/sh
# sgl138 (S10A timeline fidelity; docs/sgl138-se-gate-live.md): rerun every committed sgl138 receipt from scratch.
#   sh tools/integration/sgl138Run.sh <fresh-out-dir-inside-the-repo> [<base-rev>]     (from workspace/)
# 1. two git-archive copies in <out>: base = <base-rev> (default 86298bae3, master before sgl138) and final = HEAD; each its own
#    two-commit git repo; node_modules / reference / artifacts linked;
# 2. final: the anchor receipt (sgl138Live.ts) == fixtures/sgl138-live-receipt.json; tests/sgl138SeGateLive.test.ts +
#    tests/sgs134SeGateOtherRequests.test.ts green; the final src == the base src + sgs134's banked diff (patch -p1 on a third copy);
# 3. census 0..999 base vs final, both scenes (sgs134Production.ts --all, 10 shards per tree x scene = 40 processes),
#    sgs134CensusDelta.py ALL TRUE == fixtures/sgl138/census-delta.json, and its gate fields == sgs134's patched copy
#    (fixtures/sgs134/census-delta.json: ON 366 / 3,654, OFF 240 / 3,114, parity 106 / 78, 0 problems).
set -u
OUT="$1"; BASE="${2:-86298bae3}"
[ -e "$OUT" ] && { echo "refusing: $OUT exists"; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
W=$(pwd); fail=0
check() { cmp -s "$1" "$2" && echo "SAME $3" || { echo "DIFF $3"; fail=1; }; }
mkcopy() {
  mkdir -p "$1/workspace"
  git archive "$(git rev-parse "$2")" . | tar -x -C "$1/workspace"
  ln -s "$W/node_modules" "$1/workspace/node_modules"
  ln -s "$W/reference" "$1/workspace/reference"
  ln -s "$W/artifacts" "$1/workspace/artifacts"
  (cd "$1/workspace" && git init -q && git add -A > /dev/null && git -c user.email=sgl138@local -c user.name=sgl138 commit -qm copy \
    && git -c user.email=sgl138@local -c user.name=sgl138 commit -q --allow-empty -m extra)
}
mkcopy "$OUT/base" "$BASE"
mkcopy "$OUT/final" HEAD
BW="$OUT/base/workspace"; FW="$OUT/final/workspace"
# 2. the final tree: src == base + the banked diff; anchor receipt; tests
mkdir -p "$OUT/applied"
git archive "$(git rev-parse "$BASE")" src | tar -x -C "$OUT/applied"
(cd "$OUT/applied" && patch -s -p1 < "$FW/tools/integration/fixtures/sgs134/sgs134-gate.diff" && find . -name '*.orig' -delete) \
  && diff -r "$OUT/applied/src" "$FW/src" > /dev/null && echo "SAME final src == base src + sgs134-gate.diff" \
  || { echo "DIFF final src vs base src + sgs134-gate.diff"; fail=1; }
(cd "$FW" && node --experimental-strip-types --no-warnings tools/integration/sgl138Live.ts --out="$OUT/sgl138-live-receipt.json") || fail=1
check "$FW/tools/integration/fixtures/sgl138-live-receipt.json" "$OUT/sgl138-live-receipt.json" "sgl138-live-receipt.json"
(cd "$FW" && npm test -- --maxWorkers=4 tests/sgl138SeGateLive.test.ts tests/sgs134SeGateOtherRequests.test.ts > "$OUT/tests.log" 2>&1) \
  && echo "tests: $(grep -E '^ +Tests ' "$OUT/tests.log" | tr -s ' ')" || { echo "tests FAILED ($OUT/tests.log)"; fail=1; }
# 3. census delta base vs final, both scenes
mkdir -p "$OUT/delta"
for tree in base final; do
  for sc in on off; do
    for k in 0 1 2 3 4 5 6 7 8 9; do
      (cd "$OUT/$tree/workspace" && node --experimental-strip-types --no-warnings tools/integration/sgs134Production.ts \
        --seeds=$((k * 100))..$((k * 100 + 99)) --scene=$sc --all \
        --out="$OUT/delta/$( [ $tree = base ] && echo base || echo patched )-$sc$k.jsonl" > "$OUT/delta/$tree-$sc$k.log" 2>&1) &
    done
  done
done
wait
(cd "$FW" && python3 tools/integration/sgs134CensusDelta.py "$OUT/delta" tools/integration/fixtures/sgs134/exposure.json \
  "$OUT/census-delta.json" > /dev/null) || fail=1
check "$FW/tools/integration/fixtures/sgl138/census-delta.json" "$OUT/census-delta.json" "census-delta.json"
python3 - "$OUT/census-delta.json" "$FW/tools/integration/fixtures/sgs134/census-delta.json" <<'PYEOF' || fail=1
import json, sys
mine, sgs = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
keys = ["battles", "sameEndDigestCommandTypes", "gatedExact", "messageParity", "gatedCommands", "gateFrames", "problemCount", "projection"]
same = mine["ok"] is True and all(mine[s][k] == sgs[s][k] for s in ("on", "off") for k in keys)
for s in ("on", "off"):
    print(f"census {s}: gated {mine[s]['gatedCommands']} frames {mine[s]['gateFrames']} parity {mine[s]['messageParity']} "
          f"problems {mine[s]['problemCount']} frames {mine[s]['framesBase']} -> {mine[s]['framesPatched']}")
print("SAME census gate fields == sgs134's patched copy" if same else "DIFF census gate fields vs sgs134's patched copy")
sys.exit(0 if same else 1)
PYEOF
[ "$fail" -eq 0 ] && echo "sgl138Run: ALL SAME" || { echo "sgl138Run: FAILED"; exit 1; }
