#!/bin/sh
# aud129 reproduction (docs/aud129-live-audit-27.md, live audit 27). Run from workspace/ with a FRESH <out-dir> INSIDE the repo (the probes
# find ../oracle from there); direct mGBA processes only (never the shared HTTP oracles), explicit lab seeds; two fresh probe batches
# (derive / lends r1 == r2) and two more fresh probes per scenario inside audit21Check.ts (r1 == r2 per-row digests). Production = a
# git-archive copy of the FIXED base 1352d2130 inside <out-dir> only. Receipts land in <out-dir>/rec, compared with
# tools/integration/fixtures/aud129/ (`same` / `DIFF`).
#   sh tools/integration/aud129Run.sh <fresh-out-dir>                  (~8 min)
#   AUD129_CENSUS=1 sh tools/integration/aud129Run.sh <fresh-out-dir>  # + census 0..999 on the base (stg107Census.sh) -> exposure receipt
set -e
OUT=${1:?usage: aud129Run.sh <fresh-out-dir>}
[ ! -e "$OUT" ] || { echo "refusing: $OUT exists"; exit 1; }
mkdir -p "$OUT/rec"; OUT=$(cd "$OUT" && pwd); ROOT=$(pwd)
T=tools/integration; F=$T/fixtures/aud129; REC=$OUT/rec; BASE=1352d2130
same() { if cmp -s "$1" "$2"; then echo "same $(basename "$2")"; else echo "DIFF $(basename "$2")"; fi; }
git archive --format=tar $BASE . | (mkdir -p "$OUT/base" && tar -x -C "$OUT/base")
for l in node_modules reference artifacts; do ln -s "$ROOT/$l" "$OUT/base/$l"; done
(cd "$OUT/base" && git init -q && git add -A > /dev/null && git -c user.email=w@x -c user.name=w commit -qm copy \
  && git -c user.email=w@x -c user.name=w commit -q --allow-empty -m extra)

# scenarios: flag (ord124's two routes, byte-identical), iso (Mega Punch pairs), wide (elevated parties), ordl (Struggle / Stockpile after
# False Swipe / Odor Sleuth), iso2 (Spark / Smokescreen pairs), phase (the committed mechanic scenarios, seeds 0..3)
python3 $T/aud129Stage.py "$OUT/sc" | tail -1
for b in 1 2; do
  AUDIT20_JOBS=12 python3 $T/audit20Probes.py "$OUT/probe$b" "$OUT"/sc/*.json | grep -v " exit 0$" || true
  python3 $T/audit20Fixtures.py "$OUT/probe$b" "$OUT/fx$b" "$OUT/sc" > "$OUT/derive$b.txt"
  # bodies without a production live adapter (fallback) are history only
  awk '$2=="ODOR_SLEUTH"||$2=="FALSE_SWIPE"||$2=="TACKLE"{print $1}' "$OUT/derive$b.txt" | while read f; do rm "$OUT/fx$b/$f"; done
  ls "$OUT/fx$b"/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename > "$OUT/names$b.txt"
  (cd "$OUT/base" && while read n; do AUDIT20_LENDS_ONLY=1 node --experimental-strip-types --no-warnings $T/audit20Check.ts "$OUT/fx$b" "$n" /dev/null; done \
    < "$OUT/names$b.txt") > "$OUT/lends$b.jsonl"
done
same "$OUT/derive1.txt" "$OUT/derive2.txt"; same "$OUT/lends1.jsonl" "$OUT/lends2.jsonl"
cp "$OUT/derive1.txt" "$REC/aud129-derive.txt"; cp "$OUT/lends1.jsonl" "$REC/aud129-lends-base.jsonl"
# production's accepted windows: Harden / Taunt (aud110Align.py), Spark activation + 9 (aud129Align.py); everything else at the activation
python3 $T/aud110Align.py "$OUT/fx1" "$OUT/fxh" > /dev/null
python3 $T/aud129Align.py "$OUT/fxh" "$OUT/fxa"
STF115_CHECK=audit21Check sh $T/stf115Check.sh "$OUT/fxa" "$OUT/base" "$OUT/check"
python3 $T/stf115Summary.py "$OUT/check" "$OUT/lends1.jsonl" > "$REC/aud129-windows-base.txt"
python3 $T/aud129Phase.py "$OUT/check" "$OUT/fxa" > "$REC/aud129-phase-base.txt"
# the Spark ARTIFACT: the same Spark windows rendered from the activation (unaligned, as ord124-style checks render them)
mkdir -p "$OUT/fxu"; for n in $(grep -l '"move": "SPARK"' "$OUT"/fxh/*.json | sed 's/-c[0-9]*\.json$//' | sort -u); do cp "$n"-c*.json "$OUT/fxu/"; done
STF115_CHECK=audit21Check sh $T/stf115Check.sh "$OUT/fxu" "$OUT/base" "$OUT/check-unaligned"
python3 $T/stf115Summary.py "$OUT/check-unaligned" "$OUT/lends1.jsonl" | grep -E "SPARK|^TOTAL all" > "$REC/aud129-spark-unaligned.txt"
# every PHASE window is exactly the other one-frame phase: its shifted rows vs production one age off (aud129Shift.py), 0 px
python3 $T/aud129Shift.py "$OUT/fxa" "$REC/aud129-phase-base.txt" "$OUT/shift-tail" "$OUT/shift-write"
STF115_CHECK=audit21Check sh $T/stf115Check.sh "$OUT/shift-tail" "$OUT/base" "$OUT/check-shift-tail"
STF115_CHECK=audit21Check sh $T/stf115Check.sh "$OUT/shift-write" "$OUT/base" "$OUT/check-shift-write"
{ python3 $T/stf115Summary.py "$OUT/check-shift-tail"; python3 $T/stf115Summary.py "$OUT/check-shift-write"; } > "$REC/aud129-shift-base.txt"
for f in aud129-derive.txt aud129-lends-base.jsonl aud129-windows-base.txt aud129-phase-base.txt aud129-spark-unaligned.txt \
  aud129-shift-base.txt; do same "$F/$f" "$REC/$f"; done
grep "^TOTAL all" "$REC/aud129-windows-base.txt"; grep "^VERDICTS" "$REC/aud129-phase-base.txt"
if [ -n "$AUD129_CENSUS" ]; then
  sh $T/stg107Census.sh "$OUT/census" "$OUT/base"
  python3 $T/aud129Exposure.py "$OUT/census/merged.jsonl" "$REC/aud129-exposure-base-1352d2130.json" > /dev/null
  same "$F/aud129-exposure-base-1352d2130.json" "$REC/aud129-exposure-base-1352d2130.json"
fi
