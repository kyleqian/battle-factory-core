#!/bin/sh
# ord149 reproduction (docs/ord149-astonish-extrasensory.md). Run from workspace/ with a FRESH <out-dir> INSIDE the repo; direct mGBA only.
#   sh tools/integration/ord149Run.sh <fresh-out-dir>                     # A1 + A2 + B1 (~9 min)
#   ORD149_TYPECHECK=1 sh tools/integration/ord149Run.sh <fresh-out-dir>  # + `npm run typecheck` in the patched copy (~2 min)
#   ORD149_PARTS="a1 windows b1" sh tools/integration/ord149Run.sh <dir>   # a subset of the parts a1 / census / windows / b1 (default all)
# Trees are git-archive copies of the base d019cd6b4 (+ tools/integration/fixtures/ord149/ord149-astonish-words-unit.diff for the patched
# copy). Receipts land in <out-dir>/rec; `same` / `DIFF` lines compare them with tools/integration/fixtures/ord149/.
set -e
OUT=${1:?usage: ord149Run.sh <fresh-out-dir>}
[ ! -e "$OUT" ] || { echo "refusing: $OUT exists"; exit 1; }
mkdir -p "$OUT/rec"; OUT=$(cd "$OUT" && pwd); ROOT=$(pwd)
T=tools/integration; F=$T/fixtures/ord149; REC=$OUT/rec; BASE=d019cd6b4
MGBA_PY=${MGBA_PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
LIBMGBA_PY=${LIBMGBA_PY:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
part() { case " ${ORD149_PARTS:-a1 census windows b1} " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }
same() { if cmp -s "$1" "$2"; then echo "same $(basename "$2")"; else echo "DIFF $(basename "$2")"; fi; }
copy() {  # copy <dir> [diff...]: git-archive copy of BASE (+ the diffs), node_modules / reference / artifacts linked
  d=$1; shift
  git archive --format=tar $BASE . | (mkdir -p "$d" && tar -x -C "$d")
  for l in node_modules reference artifacts; do ln -s "$ROOT/$l" "$d/$l"; done
  for p in "$@"; do (cd "$d" && patch -s -p1 < "$ROOT/$p"); done
}
copy "$OUT/base"
copy "$OUT/patched" $F/ord149-astonish-words-unit.diff
if [ -n "$ORD149_TYPECHECK" ]; then (cd "$OUT/patched" && npm run typecheck > "$OUT/typecheck.log" 2>&1) && echo "patched copy typechecks" || echo "TYPECHECK FAILED"; fi

# A1: Astonish 310 sSpriteOrder probes (18 jobs, A / B per job), two fresh batches, units r1 == r2, then the words-law check per window
if part a1; then
for b in 1 2; do
  PYTHONPATH=$LIBMGBA_PY "$MGBA_PY" $T/ord149Probe.py "$OUT/probe$b" --jobs 12 | tail -1
  python3 $T/ord149Extract.py "$OUT/probe$b" "$OUT/units$b.json"
done
same "$OUT/units1.json" "$OUT/units2.json"; cp "$OUT/units1.json" "$REC/ord149-units.json"
node --experimental-strip-types --no-warnings $T/ord149Check.ts "$REC/ord149-check.json" "$REC/ord149-units.json" | head -3
for f in ord149-units.json ord149-check.json; do same "$F/$f" "$REC/$f"; done
fi

# A2: census 0..999 (10 shards, hist73Merge.py) in both copies, attribution, per-command delta, land82CensusCheck
if part census; then
sh $T/stg107Census.sh "$OUT/census-base" "$OUT/base"
sh $T/stg107Census.sh "$OUT/census-patched" "$OUT/patched"
python3 $T/ord124Attribution.py "$OUT/census-base/merged.jsonl" "$REC/ord149-attr-base.json" | tail -1
python3 $T/ord124Attribution.py "$OUT/census-patched/merged.jsonl" "$REC/ord149-attr-patched.json" | tail -1
python3 $T/ord149CensusDelta.py "$OUT/census-base/merged.jsonl" "$OUT/census-patched/merged.jsonl" "$REC/ord149-census-delta.json" | tail -1
python3 $T/land82CensusCheck.py "$OUT/census-base" "$OUT/census-base/merged.json" "$OUT/census-base/merged.jsonl" "$OUT/census-patched" \
  "$OUT/census-patched/merged.json" "$OUT/census-patched/merged.jsonl" "$REC/ord149-census-check.json" > /dev/null
for f in ord149-attr-base.json ord149-attr-patched.json ord149-census-delta.json ord149-census-check.json; do same "$F/$f" "$REC/$f"; done
fi

# A2: the windows AFTER the Astonish bodies (6 routes): two fresh probe batches (r1 == r2), CHAIN lend vs ROM in both copies, then
# audit21Check (aud110Align windows, two more fresh probes inside) through each copy's production renderer
if part windows; then
python3 $T/ord149Stage.py "$OUT/sc0" | tail -1
mkdir -p "$OUT/sc"; for f in "$OUT"/sc0/ord149-*.json; do cp "$f" "$OUT/sc/pb-$(basename "$f")"; done
for b in 1 2; do
  AUDIT20_JOBS=12 python3 $T/audit20Probes.py "$OUT/probe-w$b" "$OUT"/sc/*.json | grep -v " exit 0$" || true
  python3 $T/audit20Fixtures.py "$OUT/probe-w$b" "$OUT/fx$b" "$OUT/sc" > "$OUT/derive$b.txt"
  ls "$OUT/fx$b"/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename > "$OUT/names$b.txt"
  for tree in base patched; do
    (cd "$OUT/$tree" && while read n; do AUDIT20_LENDS_ONLY=1 node --experimental-strip-types --no-warnings $T/audit20Check.ts "$OUT/fx$b" "$n" /dev/null; done \
      < "$OUT/names$b.txt") > "$OUT/lends$b-$tree.jsonl"
  done
done
same "$OUT/derive1.txt" "$OUT/derive2.txt"; same "$OUT/lends1-base.jsonl" "$OUT/lends2-base.jsonl"; same "$OUT/lends1-patched.jsonl" "$OUT/lends2-patched.jsonl"
cp "$OUT/derive1.txt" "$REC/ord149-windows-derive.txt"
cp "$OUT/lends1-base.jsonl" "$REC/ord149-windows-lends-base.jsonl"; cp "$OUT/lends1-patched.jsonl" "$REC/ord149-windows-lends-patched.jsonl"
python3 $T/aud110Align.py "$OUT/fx1" "$OUT/fxa" > /dev/null
for tree in base patched; do
  STF115_CHECK=audit21Check sh $T/stf115Check.sh "$OUT/fxa" "$OUT/$tree" "$OUT/check-$tree"
  python3 $T/stf115Summary.py "$OUT/check-$tree" "$OUT/lends1-$tree.jsonl" > "$REC/ord149-windows-$tree.txt"
  grep "^TOTAL all" "$REC/ord149-windows-$tree.txt" | sed "s/^/$tree: /"
done
for f in ord149-windows-derive.txt ord149-windows-lends-base.jsonl ord149-windows-lends-patched.jsonl ord149-windows-base.txt ord149-windows-patched.txt; do
  same "$F/$f" "$REC/$f"
done
fi

# B1: Extrasensory per-row scanout split (instruction-stepped; 3 scan93 player routes, A / B fresh processes), then the analyses
if part b1; then
S=$T/fixtures/scan93/scenarios; mkdir -p "$OUT/xs" "$REC/xs"
for r in A B; do
  PYTHONPATH=$LIBMGBA_PY "$MGBA_PY" $T/ord149XsLineProbe.py $S/xs-pla-nuzleaf-shuckle-xs.json "$OUT/xs/xs-pla-xs-$r.json" > "$OUT/xs/xs-$r.log" 2>&1 &
  PYTHONPATH=$LIBMGBA_PY "$MGBA_PY" $T/ord149XsLineProbe.py $S/xs-pla-nuzleaf-shuckle-qa.json "$OUT/xs/xs-pla-qa-$r.json" > "$OUT/xs/qa-$r.log" 2>&1 &
  PYTHONPATH=$LIBMGBA_PY "$MGBA_PY" $T/ord149XsLineProbe.py $S/xs-pla-espeon-crobat-xs.json "$OUT/xs/xs-pla-crobat-xs-$r.json" > "$OUT/xs/crobat-$r.log" 2>&1 &
done
wait
for n in xs-pla-xs xs-pla-qa xs-pla-crobat-xs; do same "$OUT/xs/$n-A.json" "$OUT/xs/$n-B.json"; cp "$OUT/xs/$n-A.json" "$REC/xs/$n-A.json"; same "$F/xs/$n-A.json" "$REC/xs/$n-A.json"; done
python3 $T/ord149XsSplit.py "$REC/ord149-xs-split.json" "$REC/xs/xs-pla-xs-A.json" "$REC/xs/xs-pla-qa-A.json" "$REC/xs/xs-pla-crobat-xs-A.json" | grep -v "^ "
python3 $T/ord149XsJoin.py "$REC/ord149-xs-join.json" "$REC/xs" > /dev/null
python3 $T/ord149XsPredict.py "$REC/ord149-xs-predict.json" "$REC/xs"
for f in ord149-xs-split.json ord149-xs-join.json ord149-xs-predict.json; do same "$F/$f" "$REC/$f"; done
fi
