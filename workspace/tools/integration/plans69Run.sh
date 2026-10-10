#!/bin/sh
# plans69 rerun (docs/next-adapters-plans69.md): direct-mGBA probes + Magnitude power probe -> units / check / plan rows, then the
# live-share census seeds 0..999 (base, base + temp-patch.diff, base + temp-patch-speed-boost.diff), deltas and chains, then the fold's
# test pins -- every artefact into a FRESH output dir and compared byte for byte with tools/integration/fixtures/plans69/.
# usage (from workspace/): tools/integration/plans69Run.sh <fresh-out-dir> [--base <commit>] [--skip-probe] [--skip-census] [--skip-tests]
#   --base: the census baseline (default e58597082, master at plans69's start). Its workspace tree is extracted with git archive into
#   <out>/base, <out>/patched and <out>/speed (node_modules symlinked); the temp patches are applied ONLY to those copies (patch -p2), so
#   no tracked file is ever modified (nothing to revert). Probes: direct mGBA (MGBA_PY / LIBMGBA_PY below), never the HTTP oracles.
#   Never removes anything outside <out-dir>.
set -eu
[ $# -ge 1 ] || { echo "usage: $0 <fresh-out-dir> [--base <commit>] [--skip-probe] [--skip-census] [--skip-tests]" >&2; exit 2; }
OUT=$1; shift
BASE=e58597082; PROBE=1; CENSUS=1; TESTS=1
while [ $# -gt 0 ]; do
  case $1 in
    --base) BASE=$2; shift 2 ;;
    --skip-probe) PROBE=0; shift ;;
    --skip-census) CENSUS=0; shift ;;
    --skip-tests) TESTS=0; shift ;;
    *) echo "unknown option $1" >&2; exit 2 ;;
  esac
done
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
WS=$PWD
FX=$WS/tools/integration/fixtures/plans69
NODE="node --max-old-space-size=4096 --experimental-strip-types --no-warnings"
MGBA_PY=${MGBA_PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
LIBMGBA_PY=${LIBMGBA_PY:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
FAIL=0
same() { if cmp -s "$1" "$2"; then echo "  == $(basename "$2")"; else echo "  DIFFERS: $1 vs $2" >&2; FAIL=1; fi; }

if [ $PROBE = 1 ]; then
  echo "[1] probes: 104 jobs x 2 fresh direct-mGBA runs + 24 Magnitude power runs x 2 (~2 min at 12 jobs)"
  PYTHONPATH=$LIBMGBA_PY "$MGBA_PY" tools/integration/plans69Probe.py "$OUT/probe" --jobs 12
  PYTHONPATH=$LIBMGBA_PY "$MGBA_PY" tools/integration/plans69PowerProbe.py "$OUT/probe" --jobs 12
  python3 tools/integration/plans69Extract.py "$OUT/probe" "$OUT/units.json" | head -1
  same "$OUT/units.json" "$FX/units.json"
  echo "[2] per-frame check + plan rows"
  $NODE tools/integration/plans69Check.ts "$OUT/units.json" "$OUT/check.json" | head -1
  same "$OUT/check.json" "$FX/check.json"
  $NODE tools/integration/plans69PlanRows.ts "$OUT/check.json" "$OUT/plan-rows.json"
  same "$OUT/plan-rows.json" "$FX/plan-rows.json"
fi

tree() {  # $1 = dir name, $2 = patch file or "" : the $BASE workspace tree (+ patch) under $OUT/$1
  mkdir -p "$OUT/$1"
  git -C "$(git rev-parse --show-toplevel)" archive --format=tar "$BASE" workspace/src workspace/tests workspace/tools workspace/package.json \
    workspace/tsconfig.json workspace/vite.config.ts | tar -x -C "$OUT/$1" --strip-components=1
  ln -s "$WS/node_modules" "$OUT/$1/node_modules"
  [ -z "$2" ] || patch -s -p2 -d "$OUT/$1" < "$2"
  # the fold also adds plans69's plan rows (the regenerated table reads them)
  [ "$1" != patched ] || { mkdir -p "$OUT/$1/tools/integration/fixtures/plans69"; cp "$FX/plan-rows.json" "$OUT/$1/tools/integration/fixtures/plans69/"; }
}

if [ $CENSUS = 1 ]; then
  echo "[3] trees: base $BASE, patched (temp-patch.diff), speed (temp-patch-speed-boost.diff)"
  tree base ""; tree patched "$FX/temp-patch.diff"; tree speed "$FX/temp-patch-speed-boost.diff"
  echo "[4] live-share census 0..999 x 3 trees + order census on base (12 processes, ~4-5 min)"
  for r in 0..299 300..649 650..999; do
    t=$(echo $r | sed 's/\.\./-/')
    (cd "$OUT/base" && $NODE tools/integration/liveShareCensus.ts --seeds=$r --out="$OUT/before-$t.json" --commands="$OUT/before-$t.jsonl" > "$OUT/before-$t.log" 2>&1) &
    (cd "$OUT/patched" && $NODE tools/integration/liveShareCensus.ts --seeds=$r --out="$OUT/after-$t.json" --commands="$OUT/after-$t.jsonl" > "$OUT/after-$t.log" 2>&1) &
    (cd "$OUT/speed" && $NODE tools/integration/liveShareCensus.ts --seeds=$r --out="$OUT/speed-$t.json" --commands="$OUT/speed-$t.jsonl" > "$OUT/speed-$t.log" 2>&1) &
    (cd "$OUT/base" && $NODE tools/integration/prep61OrderCensus.ts --seeds=$r --out="$OUT/order-$t.json" --commands="$OUT/order-$t.jsonl" > "$OUT/order-$t.log" 2>&1) &
  done
  wait
  for t in 0-299 300-649 650-999; do
    same "$OUT/before-$t.json" "$FX/census-before-seeds$t.json"
    same "$OUT/after-$t.json" "$FX/census-after-seeds$t.json"
    same "$OUT/speed-$t.json" "$FX/census-speed-boost-seeds$t.json"
    python3 tools/integration/prep43CensusDelta.py "$OUT/before-$t.json" "$OUT/before-$t.jsonl" "$OUT/after-$t.json" "$OUT/after-$t.jsonl" "$OUT/delta-$t.json" | head -2
    same "$OUT/delta-$t.json" "$FX/census-delta-seeds$t.json"
    python3 tools/integration/prep43CensusDelta.py "$OUT/before-$t.json" "$OUT/before-$t.jsonl" "$OUT/speed-$t.json" "$OUT/speed-$t.jsonl" "$OUT/delta-speed-$t.json" | head -2
    same "$OUT/delta-speed-$t.json" "$FX/census-delta-speed-boost-seeds$t.json"
  done
  python3 - "$OUT" <<'PY'
import json, sys
out = sys.argv[1]
key = lambda p: [tuple(json.loads(l).get(k) for k in ("battle", "kind", "moveId", "side", "attacker", "target")) for l in open(p)]
for t in ("0-299", "300-649", "650-999"):
    b = json.load(open(f"{out}/before-{t}.json"))
    for arm in ("after", "speed"):
        a = json.load(open(f"{out}/{arm}-{t}.json"))
        print(f"  {t} {arm}: battle digest identical {b['battleDigest'] == a['battleDigest']}, command keys identical",
              key(f"{out}/before-{t}.jsonl") == key(f"{out}/{arm}-{t}.jsonl"), ", render throws", a["sanity"]["renderThrowCount"])
# one 0..999 stream per arm, battle ids offset by the range start (as the committed chains)
for arm, prefix in (("order", "order"), ("after", "after"), ("speed", "speed")):
    with open(f"{out}/{arm}-0-999.jsonl", "w") as w:
        for t, start in (("0-299", 0), ("300-649", 300), ("650-999", 650)):
            for l in open(f"{out}/{prefix}-{t}.jsonl"):
                d = json.loads(l); d["battle"] += start; w.write(json.dumps(d, separators=(",", ":")) + "\n")
PY
  echo "[5] chains (prep45Chains.py on the base order census)"
  MINE="body 176 CONVERSION_2|body 302 NEEDLE_ARM|body 222 MAGNITUDE|general animation CASTFORM_CHANGE"
  SB="no EXACT plan: stat animation 0|no EXACT plan: stat animation 3"
  TODAY="body 19 FLY|body 340 BOUNCE|body 291 DIVE|general animation SUBSTITUTE_FADE|body 351 SHOCK_WAVE"
  C="python3 tools/integration/prep45Chains.py"
  $C "$OUT/order-0-299.jsonl" "$OUT/chains-mine-0-299.json" --cleared "$MINE" --after "$OUT/after-0-299.jsonl" > /dev/null
  $C "$OUT/order-0-999.jsonl" "$OUT/chains-mine-0-999.json" --cleared "$MINE" --after "$OUT/after-0-999.jsonl" > /dev/null
  $C "$OUT/order-0-999.jsonl" "$OUT/chains-sb-only-0-999.json" --cleared "$SB" --after "$OUT/speed-0-999.jsonl" > /dev/null
  $C "$OUT/order-0-299.jsonl" "$OUT/chains-today-only-0-299.json" --cleared "$TODAY" > /dev/null
  $C "$OUT/order-0-299.jsonl" "$OUT/chains-today-0-299.json" --cleared "$MINE|$TODAY" > /dev/null
  $C "$OUT/order-0-999.jsonl" "$OUT/chains-today-only-0-999.json" --cleared "$TODAY" > /dev/null
  $C "$OUT/order-0-999.jsonl" "$OUT/chains-today-0-999.json" --cleared "$MINE|$TODAY" > /dev/null
  $C "$OUT/order-0-999.jsonl" "$OUT/chains-today-sb-0-999.json" --cleared "$MINE|$SB|$TODAY" > /dev/null
  $C "$OUT/order-0-999.jsonl" "$OUT/chains-today-sb-iceball-0-999.json" --cleared "$MINE|$SB|$TODAY|body 301 ICE_BALL" > /dev/null
  $C "$OUT/order-0-999.jsonl" "$OUT/chains-today-sb-iceball-mudslap-0-999.json" --cleared "$MINE|$SB|$TODAY|body 301 ICE_BALL|body 189 MUD_SLAP" > /dev/null
  for c in chains-mine-0-299 chains-mine-0-999 chains-sb-only-0-999 chains-today-only-0-299 chains-today-0-299 chains-today-only-0-999 \
    chains-today-0-999 chains-today-sb-0-999 chains-today-sb-iceball-0-999 chains-today-sb-iceball-mudslap-0-999; do
    same "$OUT/$c.json" "$FX/$c.json"
  done
fi

if [ $TESTS = 1 ]; then
  echo "[6] fold pins: tests/spriteOrderEventTransform.test.ts in the patched tree, without then with fold-test-pins.diff"
  [ -d "$OUT/patched" ] || tree patched "$FX/temp-patch.diff"
  if (cd "$OUT/patched" && npm test -- tests/spriteOrderEventTransform.test.ts > "$OUT/pins-before.log" 2>&1); then
    echo "  UNEXPECTED: passes without the pin moves" >&2; FAIL=1
  else echo "  without the pins: $(grep -c '^ FAIL ' "$OUT/pins-before.log") failing tests (expected 3)"; fi
  patch -s -p2 -d "$OUT/patched" < "$FX/fold-test-pins.diff"
  if (cd "$OUT/patched" && npm test -- tests/spriteOrderEventTransform.test.ts > "$OUT/pins-after.log" 2>&1); then echo "  with the pins: pass"
  else echo "  with the pins: FAILS (see $OUT/pins-after.log)" >&2; FAIL=1; fi
fi
for d in base patched speed; do [ -L "$OUT/$d/node_modules" ] && rm "$OUT/$d/node_modules"; done
[ $FAIL = 0 ] && echo "plans69Run: all comparisons equal -> $OUT" || { echo "plans69Run: DIFFERENCES (see above) -> $OUT" >&2; exit 1; }
