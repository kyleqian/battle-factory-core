#!/bin/sh
# offs152 runner (docs/offs152-scene-off-send-in-tail.md; ISSUES #146 items 4/5 + remainder: Scene OFF forced switch-out and send-in
# tail, Scene ON genderless / male-only tail, SOLROCK's matrix). Run from workspace/ (this checkout or a fresh copy with node_modules,
# reference and bin/oracle); direct mGBA (the vendor venv; PYTHONPATH -> vendor/libmgba-py) and the shared HTTP oracles read-only
# (battle-scene-off 8014, battle-scene-on 8012: bin/oracle lab). Nothing outside <out-dir> is written.
#   sh tools/integration/offs152Run.sh <fresh-out-dir> [--census] [--soak]
# R1  forcedSwitchSweep.py (forcedSwitchRomProbe.py) x {Scene OFF opponent target, Scene OFF player target, Scene ON genderless
#     (FS_GENDER=genderless), Scene ON male-only (FS_GENDER=male)}, each twice fresh: r1 == r2 == fixtures/offs152/species-sweep-*.txt.
# R2  offs152GenTable.py == src/data/sendInTailOff.ts; offs152AnimTerminal.ts == fixtures/offs152/anim-duration-terminal.json;
#     snd145GenTable.py == src/data/sendInTail.ts; tests (offs152SendInTailOff, offs152SceneOffForcedSwitch, sendInTail).
# R0/R3  snd145Stage.py --off: 15 species' Scene OFF Roar windows twice fresh (r1 == r2 == fixtures/offs152/rom-sha.json); offs152Compare.ts
#     (production render path; + --base controls for TAILLOW / SPHEAL) on r1 and r2 -> offs152Summary.py == compare-summary.json (r2 == r1).
# R5/R6  SOLROCK's Scene ON Roar window (genderless) twice fresh == rom-sha-on-solrock.json; fra151Compare.ts == solrock-on-compare.json.
# R4  (--census) sar131Census.sh shards of 16ae4522e (base) and HEAD, ON: every shard file byte-identical except switch-in commands of the
#     R5 species (reported); (--soak) vanilla soak 0:20 --parallel 5 on both trees: per-seed outcome / battle / turn / carry / depth / last
#     actions equal, all OK.
set -u
OUT="$1"; shift
CENSUS=0; SOAK=0
for a in "$@"; do [ "$a" = "--census" ] && CENSUS=1; [ "$a" = "--soak" ] && SOAK=1; done
[ -e "$OUT" ] && { echo "refusing: $OUT exists"; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
W=$(pwd); F=tools/integration/fixtures/offs152; BASE=16ae4522e; fail=0
PY=${OFFS152_PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
export PYTHONPATH=${OFFS152_MGBA_PY:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
NODE="node --experimental-strip-types --no-warnings"
check() { cmp -s "$1" "$2" && echo "SAME $3" || { echo "DIFF $3"; fail=1; }; }
# R1 sweeps (two fresh runs each, in parallel)
sweep() { # sweep <tag> <profile> <scenario> <side> <species.json> [gender]
  for r in r1 r2; do
    (FS_TMP="$OUT/fs" PY=$PY FS_PROFILE=$2 FS_WINDOW=${FS_WINDOW_OVERRIDE:-230} FS_SPECIES=$5 FS_GENDER=${6:-} \
      "$PY" tools/integration/forcedSwitchSweep.py "$3" "$4" "offs152-$1-$r" 1 > "$OUT/sweep-$1-$r.txt" 2> /dev/null) &
  done
}
sweep opp-off battle-scene-off mechanic-roar-player-houndour-opponent-onix opponent tools/integration/fixtures/forced-switch/factory-species-ids.json
sweep ply-off battle-scene-off mechanic-roar-opponent-houndour-player-onix player tools/integration/fixtures/forced-switch/factory-species-ids.json
wait
python3 -c "import json; ids=json.load(open('$F/genderless-species-ids.json')); st={r['id']: r['genderRatio'] for r in json.load(open('src/data/gen/species-stats.json'))['species']}; json.dump([i for i in ids if st[i] == 255], open('$OUT/gl.json', 'w')); json.dump([i for i in ids if st[i] == 0], open('$OUT/male.json', 'w'))"
FS_WINDOW_OVERRIDE=300 sweep gl-on battle-scene-on mechanic-roar-player-houndour-opponent-onix opponent "$OUT/gl.json" genderless
FS_WINDOW_OVERRIDE=300 sweep m-on battle-scene-on mechanic-roar-player-houndour-opponent-onix opponent "$OUT/male.json" male
wait
for p in "opp-off species-sweep-opponent-target-off" "ply-off species-sweep-player-target-off" \
         "gl-on species-sweep-opponent-target-genderless-on" "m-on species-sweep-opponent-target-male-only-on"; do
  set -- $p
  check "$OUT/sweep-$1-r1.txt" "$OUT/sweep-$1-r2.txt" "R1 sweep $1 r1 == r2"
  check "$F/$2.txt" "$OUT/sweep-$1-r1.txt" "R1 sweep $1 == fixtures/offs152/$2.txt"
done
rm -rf "$OUT/fs"
# R2 tables + tests
python3 tools/integration/offs152GenTable.py "$OUT/sendInTailOff.ts" > /dev/null
check src/data/sendInTailOff.ts "$OUT/sendInTailOff.ts" "R2 generated cry table == src/data/sendInTailOff.ts"
$NODE tools/integration/offs152AnimTerminal.ts "$OUT/anim-duration-terminal.json" > /dev/null
check "$F/anim-duration-terminal.json" "$OUT/anim-duration-terminal.json" "R5 reducer-terminal A == fixture"
python3 tools/integration/snd145GenTable.py "$OUT/sendInTail.ts" > /dev/null
check src/data/sendInTail.ts "$OUT/sendInTail.ts" "R5 regenerated ON table == src/data/sendInTail.ts"
npx vitest run tests/offs152SendInTailOff.test.ts tests/offs152SceneOffForcedSwitch.test.ts tests/sendInTail.test.ts tests/off148SceneOffPauses.test.ts \
  > "$OUT/tests.log" 2>&1 && echo "SAME R0-R6 tests passed" || { echo "DIFF R0-R6 tests"; fail=1; }
# R0 / R3 dense Scene OFF windows
SPECIES=304,341,95,157,385,308,161,19,215,20,12,54,10,153,290
python3 tools/integration/snd145Stage.py "$OUT/stage-off" $SPECIES --off > /dev/null
python3 tools/integration/snd145Stage.py "$OUT/stage-on" 349 > /dev/null
rm -f "$OUT"/stage-on/faint-*
python3 -c "import json, glob
for f in glob.glob('$OUT/stage-on/roar-349-*.json'):
    d = json.load(open(f)); d['overrides']['parties']['opponent'][1]['gender'] = 'genderless'; json.dump(d, open(f, 'w'))"
for r in r1 r2; do
  for f in "$OUT"/stage-off/*-a.json; do n=$(basename "$f" -a.json)
    for p in a b; do bin/oracle --profile battle-scene-off lab "$OUT/stage-off/$n-$p.json" -o "$OUT/$r/$n" > /dev/null 2>&1 \
      || bin/oracle --profile battle-scene-off lab "$OUT/stage-off/$n-$p.json" -o "$OUT/$r/$n" > /dev/null 2>&1 || { echo "FAIL oracle $r $n $p"; fail=1; }; done
  done
  for p in a b; do bin/oracle --profile battle-scene-on lab "$OUT/stage-on/roar-349-$p.json" -o "$OUT/$r-on/roar-349" > /dev/null 2>&1 \
    || bin/oracle --profile battle-scene-on lab "$OUT/stage-on/roar-349-$p.json" -o "$OUT/$r-on/roar-349" > /dev/null 2>&1 || { echo "FAIL oracle $r on 349 $p"; fail=1; }; done
done
digests() { python3 - "$OUT" "$1" <<'PYEOF'
import hashlib, os, json, sys
out, suffix = sys.argv[1], sys.argv[2]; res = {}
for n in sorted(os.listdir(f"{out}/r1{suffix}"), key=lambda x: int(x.split("-")[1])):
    d = {}
    for r in ("r1", "r2"):
        h = hashlib.sha256(); fs = sorted(f for f in os.listdir(f"{out}/{r}{suffix}/{n}") if f.startswith("frame-"))
        for f in fs: h.update(open(f"{out}/{r}{suffix}/{n}/{f}", "rb").read())
        d[r] = [len(fs), h.hexdigest()[:16]]
    res[n] = {"frames": d["r1"][0], "sha": d["r1"][1], "r1EqualsR2": d["r1"] == d["r2"]}
print(json.dumps(res, indent=1))
PYEOF
}
digests "" > "$OUT/rom-sha.json"; digests "-on" > "$OUT/rom-sha-on-solrock.json"
check "$F/rom-sha.json" "$OUT/rom-sha.json" "R0/R3 Scene OFF windows (15, twice fresh, digests)"
check "$F/rom-sha-on-solrock.json" "$OUT/rom-sha-on-solrock.json" "R6 SOLROCK Scene ON window (twice fresh, digest)"
mkdir -p "$OUT/cmp"
for r in r1 r2; do
  for f in "$OUT"/stage-off/*-a.json; do n=$(basename "$f" -a.json)
    $NODE tools/integration/offs152Compare.ts "$f" "$OUT/$r/$n" "$OUT/cmp/$r-$n.json" > /dev/null || fail=1
  done
  for n in roar-304 roar-341; do $NODE tools/integration/offs152Compare.ts "$OUT/stage-off/$n-a.json" "$OUT/$r/$n" "$OUT/cmp/$r-base-$n.json" --base > /dev/null || fail=1; done
  python3 tools/integration/offs152Summary.py "$OUT/compare-summary-$r.json" "$OUT"/cmp/$r-*.json > "$OUT/compare-summary-$r.txt"
  $NODE tools/integration/fra151Compare.ts "$OUT/stage-on/roar-349-a.json" "$OUT/$r-on/roar-349" roar "$OUT/cmp/on-$r-349.json" > /dev/null || fail=1
done
check "$F/compare-summary.json" "$OUT/compare-summary-r1.json" "R0/R3 production compare summary (r1)"
check "$OUT/compare-summary-r1.json" "$OUT/compare-summary-r2.json" "R0/R3 production compare r2 == r1"
cat "$OUT/compare-summary-r1.txt"
python3 -c "import json
f = json.load(open('$F/solrock-on-compare.json'))
for r in ('r1', 'r2'):
    d = json.load(open('$OUT/cmp/on-' + r + '-349.json')); got = {k: d[k] for k in ('slideStart', 'duration', 'romNextText', 'rows', 'zeroRows', 'px')}
    print(('SAME' if got == f[r] else 'DIFF') + ' R5/R6 SOLROCK Scene ON compare ' + r + ': ' + json.dumps(got['px']))
    assert got == f[r]" || fail=1
rm -rf "$OUT"/r1 "$OUT"/r2 "$OUT"/r1-on "$OUT"/r2-on
# R4
if [ $CENSUS = 1 ]; then
  sh tools/integration/sar131Census.sh shards "$OUT/census-base" "$BASE" > /dev/null 2>&1
  sh tools/integration/sar131Census.sh shards "$OUT/census-final" HEAD > /dev/null 2>&1
  python3 tools/integration/offs152CensusDelta.py "$OUT/census-base" "$OUT/census-final" "$OUT/census-on-delta.json" \
    && echo "SAME R4 Scene ON census: only R5 species' switch-in commands move" || { echo "DIFF R4 census"; fail=1; }
fi
if [ $SOAK = 1 ]; then
  mkdir -p "$OUT/soakbase"
  git -C .. archive "$BASE" workspace/src workspace/tools workspace/package.json workspace/tsconfig.json | tar -x -C "$OUT/soakbase" --strip-components=1
  ln -s "$W/node_modules" "$OUT/soakbase/node_modules"
  (cd "$OUT/soakbase" && node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy vanilla --seeds 0:20 --parallel 5 --json "$OUT/soak-base.json" > "$OUT/soak-base.log" 2>&1) &
  node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy vanilla --seeds 0:20 --parallel 5 --json "$OUT/soak-final.json" > "$OUT/soak-final.log" 2>&1
  wait
  python3 tools/integration/offs152SoakCompare.py "$OUT/soak-base.json" "$OUT/soak-final.json" || fail=1
  rm -rf "$OUT/soakbase"
fi
[ $fail = 0 ] && echo "ALL SAME" || echo "SOME DIFF"
exit $fail
