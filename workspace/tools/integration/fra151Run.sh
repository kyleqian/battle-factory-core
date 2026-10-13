#!/bin/sh
# fra151 runner (docs/fra151-front-send-in-animation.md; ISSUES #146 / #71 remainder: the Scene ON opponent send-in draws the species
# front animation). Run from workspace/ (this checkout or a fresh copy with node_modules, reference and bin/oracle); uses the shared HTTP
# oracle read-only (battle-scene-on 8012: bin/oracle lab, retried on transient failures). Nothing outside <out-dir> is written.
#   sh tools/integration/fra151Run.sh <fresh-out-dir> [--census]
# R1  snd145Stage.py: snd145's 6 species (TAILLOW 304, SPHEAL 341, ONIX 95, SALAMENCE 397, TYPHLOSION 157, CASTFORM 385) x {faint
#     replacement, Roar}, Scene ON.
# R2  snd145Stage.py Roar windows of 57 sibling species (other front animIds incl. affine rotation / stretch, delayed, palette, flicker).
#     Every window twice fresh (r1 == r2 PNG digests == fixtures/fra151/rom-sha.json; the 12 R1 digests also == fixtures/snd145/rom-sha.json),
#     fra151Compare.ts (production render path + the production post-send-in x2 history) on r1 and r2 -> fra151Summary.py
#     == fixtures/fra151/compare-summary.json (r2 == r1).
# R3  tests/fra151FrontSendIn.test.ts (incl. the 376-species terminal rest == speciesFrontIdleRestOffset == the ROM rest receipt).
#     (--census) sar131Census.sh shards of the base 877580fde and HEAD: sar131CensusDelta.py + snd145CensusDelta.py
#     == fixtures/fra151/census-{delta,commands}.json (0 move-animation / command / switch-in changes).
set -u
OUT="$1"; shift
CENSUS=0
for a in "$@"; do [ "$a" = "--census" ] && CENSUS=1; done
[ -e "$OUT" ] && { echo "refusing: $OUT exists"; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
F=tools/integration/fixtures/fra151; BASE=877580fde; fail=0
check() { cmp -s "$1" "$2" && echo "SAME $3" || { echo "DIFF $3"; fail=1; }; }
R1=304,341,95,397,157,385
R2=24,307,109,116,90,352,10,297,327,384,123,230,25,92,93,310,99,18,76,214,20,5,58,181,77,329,376,202,89,94,211,21,309,378,381,174,305,331,149,302,361,336,96,48,177,225,288,345,171,87,51,130,129,184,27,15,46
python3 tools/integration/snd145Stage.py "$OUT/stage" $R1 > /dev/null
python3 tools/integration/snd145Stage.py "$OUT/stage2" $R2 > /dev/null
rm -f "$OUT"/stage2/faint-*
cp "$OUT"/stage2/roar-* "$OUT/stage/"; rm -rf "$OUT/stage2"
# labrun.sh <scenario-a.json> <dir>: the -a and -b halves into <dir>/<name>, retrying transient oracle failures (shared service load).
cat > "$OUT/labrun.sh" <<'SH'
n=$(basename "$1" -a.json); s=$(dirname "$1")
for p in a b; do ok=0; for t in 1 2 3 4 5 6 7 8; do
  bin/oracle --profile battle-scene-on lab "$s/$n-$p.json" -o "$2/$n" > /dev/null 2>&1 && { ok=1; break; }; sleep 4; done
  [ $ok = 1 ] || { echo "FAIL oracle $2 $n $p"; exit 1; }; done
SH
for r in r1 r2; do
  ls "$OUT"/stage/*-a.json | xargs -P 10 -I{} sh "$OUT/labrun.sh" {} "$OUT/$r" || fail=1
done
python3 - "$OUT" > "$OUT/rom-sha.json" <<'PY'
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
PY
check "$F/rom-sha.json" "$OUT/rom-sha.json" "R1+R2 ROM windows (twice fresh, digests)"
python3 - "$OUT/rom-sha.json" tools/integration/fixtures/snd145/rom-sha.json <<'PY' || fail=1
import json, sys
a, b = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
same = [k for k in b if not k.startswith("off-") and a.get(k) == b[k]]
ok = len(same) == 12
print(f"{'SAME' if ok else 'DIFF'} R1 12 Scene ON ROM windows == snd145's committed digests ({len(same)} / 12)")
sys.exit(0 if ok else 1)
PY
mkdir -p "$OUT/cmp"
for r in r1 r2; do
  ls "$OUT"/stage/*-a.json | xargs -P 8 -n 1 sh -c 'n=$(basename "$0" -a.json); k=${n%%-*}; node --experimental-strip-types --no-warnings tools/integration/fra151Compare.ts "$0" "'"$OUT/$r"'/$n" $k "'"$OUT/cmp/$r"'-$n.json" > /dev/null || echo "FAIL compare $n"'
  python3 tools/integration/fra151Summary.py "$OUT/compare-summary-$r.json" "$OUT"/cmp/$r-*.json > "$OUT/compare-summary-$r.txt"
done
check "$F/compare-summary.json" "$OUT/compare-summary-r1.json" "R1+R2 production compare summary (r1)"
check "$OUT/compare-summary-r1.json" "$OUT/compare-summary-r2.json" "R1+R2 production compare r2 == r1"
cat "$OUT/compare-summary-r1.txt"
npx vitest run tests/fra151FrontSendIn.test.ts > "$OUT/r3-tests.log" 2>&1 && echo "SAME R3 tests/fra151FrontSendIn.test.ts passed" || { echo "DIFF R3 tests"; fail=1; }
if [ $CENSUS = 1 ]; then
  sh tools/integration/sar131Census.sh shards "$OUT/census-base" "$BASE" > /dev/null 2>&1
  sh tools/integration/sar131Census.sh shards "$OUT/census-final" HEAD > /dev/null 2>&1
  python3 tools/integration/sar131CensusDelta.py "$OUT/census-base" "$OUT/census-final" "$OUT/census-delta.json" > /dev/null
  python3 tools/integration/snd145CensusDelta.py "$OUT/census-base" "$OUT/census-final" "$OUT/census-commands.json" > /dev/null
  check "$F/census-delta.json" "$OUT/census-delta.json" "R3 census delta (0 move-animation changes)"
  check "$F/census-commands.json" "$OUT/census-commands.json" "R3 census: 0 command / switch-in changes"
fi
rm -rf "$OUT/r1" "$OUT/r2"
[ $fail = 0 ] && echo "ALL SAME" || echo "SOME DIFF"
exit $fail
