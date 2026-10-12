#!/bin/sh
# sdl119 reproduction (docs/sdl119-struggle-doll-live.md): the stf115 rung 1 + rung 2 receipts re-proved from a git-archive copy of the
# CHECKED-IN tree (HEAD, Struggle doll cells landed), not a patched base. Run from workspace/ with a FRESH <out-dir> INSIDE the repo; direct mGBA only.
#   sh tools/integration/sdl119Run.sh <fresh-out-dir>     (~7 min)
# Receipts land in <out-dir>/rec; `same` / `DIFF` compare them with tools/integration/fixtures/stf115/ (rung 1's 54 doll-free live windows are
# the doll-free subset of rung2-windows-patched.txt: live=59 = 54 + 5 defender-doll).
set -e
OUT=${1:?usage: sdl119Run.sh <fresh-out-dir>}
[ ! -e "$OUT" ] || { echo "refusing: $OUT exists"; exit 1; }
mkdir -p "$OUT/rec"; OUT=$(cd "$OUT" && pwd); ROOT=$(pwd)
T=tools/integration; F=$T/fixtures/stf115; REC=$OUT/rec
same() { if cmp -s "$1" "$2"; then echo "same $(basename "$2")"; else echo "DIFF $(basename "$2")"; fi; }
git archive --format=tar HEAD . | (mkdir -p "$OUT/final" && tar -x -C "$OUT/final")
for d in node_modules reference artifacts; do ln -s "$ROOT/$d" "$OUT/final/$d"; done
(cd "$OUT/final" && git init -q && git add -A > /dev/null && git -c user.email=w@x -c user.name=w commit -qm copy \
  && git -c user.email=w@x -c user.name=w commit -q --allow-empty -m extra)
python3 $T/stf115Stage.py "$OUT/sc0" | tail -1
mkdir -p "$OUT/sc"; for f in "$OUT"/sc0/*.json; do cp "$f" "$OUT/sc/pb-$(basename "$f")"; done
for b in 1 2; do
  AUDIT20_JOBS=11 python3 $T/audit20Probes.py "$OUT/probe$b" "$OUT"/sc/*.json | grep -v " exit 0$" || true
  python3 $T/audit20Fixtures.py "$OUT/probe$b" "$OUT/fx$b" "$OUT/sc" > "$OUT/derive$b.txt"
  ls "$OUT/fx$b"/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename > "$OUT/names$b.txt"
  (cd "$OUT/final" && while read n; do AUDIT20_LENDS_ONLY=1 node --experimental-strip-types --no-warnings $T/audit20Check.ts "$OUT/fx$b" "$n" /dev/null; done \
    < "$OUT/names$b.txt") > "$OUT/lends$b.jsonl"
done
same "$OUT/lends1.jsonl" "$OUT/lends2.jsonl"; same "$OUT/derive1.txt" "$OUT/derive2.txt"
cp "$OUT/lends1.jsonl" "$REC/rung1-lends.jsonl"; cp "$OUT/derive1.txt" "$REC/derive.txt"
python3 $T/aud110Align.py "$OUT/fx1" "$OUT/fxa"
STF115_CHECK=audit21Check sh $T/stf115Check.sh "$OUT/fxa" "$OUT/final" "$OUT/check-final"
python3 $T/stf115Summary.py "$OUT/check-final" "$OUT/lends1.jsonl" > "$REC/rung2-windows-patched.txt"
tail -2 "$REC/rung2-windows-patched.txt"
mkdir -p "$OUT/att" "$OUT/att-rec"
for n in stf115-ply-tsub-95-135 stf115-opp-tsub-143-95; do
  cp "$OUT/sc0/$n.json" "$OUT/final/tools/integration/fixtures/prep40/scenarios/$n.json"
  for r in 1 2; do
    (cd "$OUT/final" && PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py python3 tools/run-mgba-probe.py "$OUT/att/$n-r$r.json" -- \
      /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python tools/integration/prep40Probe.py tools/integration/fixtures/prep40/scenarios/$n.json \
      "$OUT/att/$n-r$r.json" "$OUT/att/$n-r$r-rgb" > "$OUT/att/$n-r$r.out" 2>&1) || echo "probe exit $n r$r"
  done
  if cmp -s "$OUT/att/$n-r1.json" "$OUT/att/$n-r2.json"; then echo "r1 == r2 $n"; else echo "R1 != R2 $n"; fi
  (cd "$OUT/final" && node --experimental-strip-types --no-warnings $T/attdollLiveCheck.ts --out="$OUT/att-rec/$n.json" "$OUT/att" $n > "$OUT/att-rec/$n.out" 2>&1)
done
python3 $T/stf115Summary.py --attdoll "$OUT/att-rec" > "$REC/rung2-attdoll.txt"
tail -1 "$REC/rung2-attdoll.txt"
for f in derive.txt rung2-windows-patched.txt rung2-attdoll.txt; do same "$F/$f" "$REC/$f"; done
# the lends differ from stf115's only in the 5 defender-doll lines (live now); sdl119's own copy is the reference
same tools/integration/fixtures/sdl119/lends.jsonl "$REC/rung1-lends.jsonl"
# rung 1: the 54 doll-free live windows (live=59 minus the 5 defender-doll) are 0 px
grep -c "live=1 .*px=0 " "$REC/rung2-windows-patched.txt" | sed 's/^/live 0px lines: /'
