#!/bin/sh
# snd145 runner (docs/snd145-send-in-tail-live.md; ISSUES #146 remainder: the species-keyed Scene ON opponent send-in tail + the
# send-in ball-open fade / particles for every send-in). Run from workspace/ (this checkout or a fresh copy with node_modules,
# reference and bin/oracle); uses the shared HTTP oracles read-only (battle-scene-on 8012, battle-scene-off 8014: bin/oracle lab).
# Nothing outside <out-dir> is written.
#   sh tools/integration/snd145Run.sh <fresh-out-dir> [--census] [--soak]
# R1  snd145GenTable.py == src/data/sendInTail.ts; sendInTailModel.py exit 0 (338 / 338, no conflicts); tests/sendInTail.test.ts.
# R4  snd145Stage.py: 6 species (TAILLOW 304, SPHEAL 341, ONIX 95, SALAMENCE 397, TYPHLOSION 157, CASTFORM 385) x {faint
#     replacement, Roar} Scene ON + {TAILLOW, SPHEAL} Roar Scene OFF; every window twice fresh (r1 == r2 PNG digests ==
#     fixtures/snd145/rom-sha.json); snd145Compare.ts (production render path) on r1 and r2 -> snd145Summary.py == compare-summary.json.
#     snd145RouteProbe.ts seeds 0..5 (real production routes: faint-replacement blank / menu rows) == route-probe.json.
# R5  (--census) sar131Census.sh shards of 9f97eab40 (base) and HEAD, sar131CensusDelta.py + snd145CensusDelta.py == census-*.json.
#     (--soak) vanilla soak 0:20 --parallel 8 on both trees: per-seed outcome / battle / turn / carry / depth / last actions equal.
set -u
OUT="$1"; shift
CENSUS=0; SOAK=0
for a in "$@"; do [ "$a" = "--census" ] && CENSUS=1; [ "$a" = "--soak" ] && SOAK=1; done
[ -e "$OUT" ] && { echo "refusing: $OUT exists"; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
W=$(pwd); F=tools/integration/fixtures/snd145; BASE=9f97eab40; fail=0
check() { cmp -s "$1" "$2" && echo "SAME $3" || { echo "DIFF $3"; fail=1; }; }
# R1
python3 tools/integration/snd145GenTable.py "$OUT/sendInTail.ts" > /dev/null
check src/data/sendInTail.ts "$OUT/sendInTail.ts" "R1 generated table == src/data/sendInTail.ts"
python3 tools/integration/sendInTailModel.py > "$OUT/model.json" && echo "SAME R1 sendInTailModel.py exit 0" || { echo "DIFF R1 model"; fail=1; }
npx vitest run tests/sendInTail.test.ts > "$OUT/r1-tests.log" 2>&1 && echo "SAME R1 tests/sendInTail.test.ts passed" || { echo "DIFF R1 tests"; fail=1; }
# R4 ROM windows
SPECIES=304,341,95,397,157,385
python3 tools/integration/snd145Stage.py "$OUT/stage" $SPECIES > /dev/null
python3 tools/integration/snd145Stage.py "$OUT/stage-off" 304,341 --off > /dev/null
for r in r1 r2; do
  for f in "$OUT"/stage/*-a.json; do n=$(basename "$f" -a.json)
    for p in a b; do bin/oracle --profile battle-scene-on lab "$OUT/stage/$n-$p.json" -o "$OUT/$r/$n" > /dev/null 2>&1 || { echo "FAIL oracle $r $n $p"; fail=1; }; done
  done
  for f in "$OUT"/stage-off/*-a.json; do n=$(basename "$f" -a.json)
    for p in a b; do bin/oracle --profile battle-scene-off lab "$OUT/stage-off/$n-$p.json" -o "$OUT/$r/off-$n" > /dev/null 2>&1 || { echo "FAIL oracle $r off-$n $p"; fail=1; }; done
  done
done
python3 - "$OUT" > "$OUT/rom-sha.json" <<'EOF'
import hashlib, json, os, sys
out = sys.argv[1]; res = {}
for n in sorted(os.listdir(f"{out}/r1")):
    d = {}
    for r in ("r1", "r2"):
        h = hashlib.sha256()
        files = sorted(f for f in os.listdir(f"{out}/{r}/{n}") if f.startswith("frame-"))
        for f in files: h.update(open(f"{out}/{r}/{n}/{f}", "rb").read())
        d[r] = [len(files), h.hexdigest()[:16]]
    res[n] = {"frames": d["r1"][0], "sha": d["r1"][1], "r1EqualsR2": d["r1"] == d["r2"]}
print(json.dumps(res, indent=1))
EOF
check "$F/rom-sha.json" "$OUT/rom-sha.json" "R4 ROM windows (twice fresh, digests)"
mkdir -p "$OUT/cmp"
for r in r1 r2; do
  for f in "$OUT"/stage/*-a.json; do n=$(basename "$f" -a.json); k=${n%%-*}
    node --experimental-strip-types --no-warnings tools/integration/snd145Compare.ts "$f" "$OUT/$r/$n" "$k" "$OUT/cmp/$r-$n.json" > /dev/null || fail=1
  done
  for f in "$OUT"/stage-off/*-a.json; do n=$(basename "$f" -a.json)
    node --experimental-strip-types --no-warnings tools/integration/snd145Compare.ts "$f" "$OUT/$r/off-$n" roar "$OUT/cmp/$r-off-$n.json" --scene=off > /dev/null || fail=1
  done
  python3 tools/integration/snd145Summary.py "$OUT/compare-summary-$r.json" "$OUT"/cmp/$r-*.json > "$OUT/compare-summary-$r.txt"
done
check "$F/compare-summary.json" "$OUT/compare-summary-r1.json" "R4 production compare summary (r1)"
check "$OUT/compare-summary-r1.json" "$OUT/compare-summary-r2.json" "R4 production compare r2 == r1"
cat "$OUT/compare-summary-r1.txt"
node --experimental-strip-types --no-warnings tools/integration/snd145RouteProbe.ts --seeds=0:6 --bands --out="$OUT/route-probe.json" > /dev/null
check "$F/route-probe.json" "$OUT/route-probe.json" "R4 production routes (faint-replacement blank / menu rows)"
# R5
if [ $CENSUS = 1 ]; then
  sh tools/integration/sar131Census.sh shards "$OUT/census-base" "$BASE" > /dev/null 2>&1
  sh tools/integration/sar131Census.sh shards "$OUT/census-final" HEAD > /dev/null 2>&1
  python3 tools/integration/sar131CensusDelta.py "$OUT/census-base" "$OUT/census-final" "$OUT/census-delta.json" > /dev/null
  python3 tools/integration/snd145CensusDelta.py "$OUT/census-base" "$OUT/census-final" "$OUT/census-commands.json" > /dev/null
  check "$F/census-delta.json" "$OUT/census-delta.json" "R5 census delta (0 move-animation changes)"
  check "$F/census-commands.json" "$OUT/census-commands.json" "R5 census: only switch-in commands move"
fi
if [ $SOAK = 1 ]; then
  d=$W; REPO=""
  while [ "$d" != "/" ]; do
    if git -C "$d" cat-file -e "$BASE^{commit}" 2> /dev/null; then REPO=$(git -C "$d" rev-parse --show-toplevel); break; fi
    d=$(dirname "$d")
  done
  mkdir -p "$OUT/soakbase"
  git -C "$REPO" archive "$BASE" workspace/src workspace/tools workspace/package.json workspace/tsconfig.json | tar -x -C "$OUT/soakbase" --strip-components=1
  ln -s "$W/node_modules" "$OUT/soakbase/node_modules"
  (cd "$OUT/soakbase" && node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy vanilla --seeds 0:20 --parallel 8 --json "$OUT/soak-base.json" > "$OUT/soak-base.log" 2>&1) &
  node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy vanilla --seeds 0:20 --parallel 8 --json "$OUT/soak-final.json" > "$OUT/soak-final.log" 2>&1
  wait
  python3 - "$OUT" <<'EOF' || fail=1
import json, sys
o = sys.argv[1]; b = json.load(open(f"{o}/soak-base.json"))["results"]; f = json.load(open(f"{o}/soak-final.json"))["results"]
k = lambda r: (r["seed"], r["outcome"], r["battle"], r["turn"], r["maxCarriedWinStreak"], r["maxBattleDepth"], r["endState"], r["lastActions"])
ok = sum(r["outcome"] == "OK" for r in f); same = sum(k(x) == k(y) for x, y in zip(b, f))
print(f"{'SAME' if ok == len(f) == same else 'DIFF'} R5 soak vanilla 0:20: {ok} / {len(f)} OK, {same} / {len(f)} identical to base")
sys.exit(0 if ok == len(f) == same else 1)
EOF
  rm -rf "$OUT/soakbase"
fi
rm -rf "$OUT/r1" "$OUT/r2"
[ $fail = 0 ] && echo "ALL SAME" || echo "SOME DIFF"
exit $fail
