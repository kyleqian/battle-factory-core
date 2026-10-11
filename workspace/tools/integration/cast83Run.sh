#!/bin/sh
# cast83 (ISSUES #143, docs/cast83-castform-forms.md) reproduction (run from workspace/; direct mGBA only, never the shared HTTP oracles).
#   sh tools/integration/cast83Run.sh <fresh-out-dir>      (nothing is written or deleted outside it)
# 1. re-stages the cast83 scenarios (must equal tools/integration/fixtures/cast83/scenarios/);
# 2. probes each once (audit19Probes.py: one fresh direct-mGBA process per scenario) and derives the fixtures (cast83Fixtures.py; must
#    equal fixtures/cast83/fixtures/);
# 3. cast83Check.ts (two more fresh probe processes per scenario, r1 == r2) on audit 19's 16 cast-* scenarios and the cast83 scenarios with
#    THIS tree's production code -> <out>/check/, receipt.json (cast83Receipt.py; must equal fixtures/cast83/receipt.json);
# 4. the same checks from a git-archive copy of HEAD inside <out> whose Castform gate is lifted for every known form (the measurement of
#    the residual keys; production src is NOT patched) -> <out>/lifted-check/, receipt-lifted.json (must equal fixtures/cast83/).
set -e
[ $# -ge 1 ] || { echo "usage: cast83Run.sh <fresh-out-dir>"; exit 2; }
OUT=$1; W=tools/integration/fixtures/cast83; A=tools/integration/fixtures/audit-19
[ ! -e "$OUT" ] || { echo "$OUT exists: give a fresh dir"; exit 2; }
mkdir -p "$OUT/check" "$OUT/lifted-check"
OUT=$(cd "$OUT" && pwd)
J=${CAST83_JOBS:-12}
python3 tools/integration/cast83Stage.py "$OUT/sc"
diff -r "$OUT/sc" $W/scenarios && echo "staged scenarios == committed"
AUDIT19_JOBS=$J python3 tools/integration/audit19Probes.py "$OUT/probe" $W/scenarios/*.json > "$OUT/probes.txt"
python3 tools/integration/cast83Fixtures.py "$OUT/probe" "$OUT/fx" > "$OUT/derive.txt"
diff -r "$OUT/fx" $W/fixtures && echo "derived fixtures == committed"
names() { ls $A/fixtures/cast-*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename | sed "s|^|$A/fixtures |"
          ls $W/scenarios/*.json | xargs -n 1 basename | sed 's/\.json$//' | sed "s|^|$W/fixtures |"; }
check() {  # <cast83Check.ts of a tree (its src is the production code measured; probes / fixtures resolve from workspace/)> <out-subdir>
  names | xargs -n 2 -P "$J" sh -c 'node --experimental-strip-types --no-warnings "'"$1"'" \
    "$0" "$1" "'"$OUT/$2"'/check-$1.json" > "'"$OUT/$2"'/$1.log" 2>&1 || echo "FAILED $1"'
}
check tools/integration/cast83Check.ts check
python3 tools/integration/cast83Receipt.py "$OUT/receipt.json" "$OUT"/check/check-*.json
cmp "$OUT/receipt.json" $W/receipt.json && echo "receipt == committed"
mkdir -p "$OUT/lifted-tree"
git archive HEAD | tar -x -C "$OUT/lifted-tree"
ln -s "$PWD/node_modules" "$OUT/lifted-tree/node_modules"
python3 - "$OUT/lifted-tree/src/engine/liveMoveAnimation.ts" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
old = '    const key = `${request.moveId}:${request.attacker === battler ? "by" : "at"}:${form}`;\n'
assert s.count(old) == 1
open(p, "w").write(s.replace(old, '    continue; // cast83Run.sh: every known form lifted (measurement only)\n' + old))
PY
check "$OUT/lifted-tree/tools/integration/cast83Check.ts" lifted-check
python3 tools/integration/cast83Receipt.py "$OUT/receipt-lifted.json" "$OUT"/lifted-check/check-*.json
cmp "$OUT/receipt-lifted.json" $W/receipt-lifted.json && echo "lifted receipt == committed"
