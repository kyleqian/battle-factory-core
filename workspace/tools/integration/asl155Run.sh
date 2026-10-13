#!/bin/sh
# asl155 reproduction (docs/asl155-astonish-extrasensory-live.md). Run from workspace/ with a FRESH <out-dir> INSIDE the repo; direct mGBA only.
#   sh tools/integration/asl155Run.sh <fresh-out-dir>                       # A (census + windows) and B (windows), ~12 min
#   ASL155_PARTS="census-a windows-a" sh tools/integration/asl155Run.sh <dir> # a subset of census-a / windows-a / census-b / windows-b
# census-a + census-b share the landed census; each census arm is 10 shards (~10 min on a loaded machine).
# The LANDED tree is a git-archive copy of this checkout's HEAD. The A base arm is the same copy with ord149-astonish-words-unit.diff reversed
# (= before the Astonish landing); the B base arm reverses fixtures/asl155/asl155-extrasensory-later.diff (= before the Extrasensory D4 entry).
# Works from a fresh git-archive copy of the repo (needs `git init` + one commit there). Receipts land in <out-dir>/rec; `same` / `DIFF` lines
# compare them with tools/integration/fixtures/asl155/.
set -e
OUT=${1:?usage: asl155Run.sh <fresh-out-dir>}
[ ! -e "$OUT" ] || { echo "refusing: $OUT exists"; exit 1; }
mkdir -p "$OUT/rec"; OUT=$(cd "$OUT" && pwd); ROOT=$(pwd)
T=tools/integration; F=$T/fixtures/asl155; REC=$OUT/rec; ORD=$T/fixtures/ord149
part() { case " ${ASL155_PARTS:-census-a windows-a census-b windows-b} " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }
same() { if cmp -s "$1" "$2"; then echo "same $(basename "$2")"; else echo "DIFF $(basename "$2")"; fi; }
copy() {  # copy <dir> [reverse-diff]: git-archive copy of HEAD, node_modules / reference / artifacts linked
  d=$1
  git archive --format=tar HEAD . | (mkdir -p "$d" && tar -x -C "$d")
  for l in node_modules reference artifacts; do ln -sfn "$ROOT/$l" "$d/$l"; done
  if [ -n "$2" ]; then (cd "$d" && patch -s -R -p1 < "$ROOT/$2"); fi
}
copy "$OUT/landed"
if part census-a || part windows-a; then copy "$OUT/base-a" $ORD/ord149-astonish-words-unit.diff; fi
if part census-b || part windows-b; then copy "$OUT/base-b" $F/asl155-extrasensory-later.diff; fi
census() { [ -d "$OUT/census-$1" ] || sh $T/stg107Census.sh "$OUT/census-$1" "$OUT/$1"; }

# A: census 0..999 (10 shards, hist73Merge.py) base-a vs landed: attribution, per-command delta (ord149CensusDelta), land82CensusCheck
if part census-a; then
census base-a; census landed
python3 $T/ord124Attribution.py "$OUT/census-base-a/merged.jsonl" "$REC/asl155-attr-base-a.json" | tail -1
python3 $T/ord124Attribution.py "$OUT/census-landed/merged.jsonl" "$REC/asl155-attr-landed.json" | tail -1
python3 $T/ord149CensusDelta.py "$OUT/census-base-a/merged.jsonl" "$OUT/census-landed/merged.jsonl" "$REC/asl155-census-delta-a.json" | tail -1
python3 $T/land82CensusCheck.py "$OUT/census-base-a" "$OUT/census-base-a/merged.json" "$OUT/census-base-a/merged.jsonl" "$OUT/census-landed" \
  "$OUT/census-landed/merged.json" "$OUT/census-landed/merged.jsonl" "$REC/asl155-census-check-a.json" > /dev/null
# the committed receipts were measured at aef0c63c3 (before the B landing); on a later HEAD compare the A delta itself (status changes and
# reasons, without the gate source lines that move with any later edit): both arms carry every later change
python3 - "$F/asl155-census-delta-a.json" "$REC/asl155-census-delta-a.json" <<'PY'
import json, sys
st = lambda d: None if d is None else d.get("reason")
key = lambda p: (lambda d: (d["lifted"], d["regressed"], d["changedWithoutEarlierPlayerAstonish"], [(c["battle"], c["command"], c["move"], c["side"],
  c["before"][0], st(c["before"][1]), c["after"][0], st(c["after"][1])) for c in d["changed"]]))(json.load(open(p)))
print("same census-a delta (lifted / regressed / changed commands)" if key(sys.argv[1]) == key(sys.argv[2]) else "DIFF census-a delta")
PY
for f in asl155-attr-base-a.json asl155-attr-landed.json asl155-census-delta-a.json asl155-census-check-a.json; do same "$F/$f" "$REC/$f"; done
fi

# A: the windows AFTER the Astonish bodies (ord149Stage.py, 6 routes): two fresh probe batches (r1 == r2), CHAIN lend vs ROM in both arms,
# then audit21Check (aud110Align windows) through each arm's production renderer
if part windows-a; then
python3 $T/ord149Stage.py "$OUT/sc0" | tail -1
mkdir -p "$OUT/sc"; for f in "$OUT"/sc0/ord149-*.json; do cp "$f" "$OUT/sc/pb-$(basename "$f")"; done
for b in 1 2; do
  AUDIT20_JOBS=12 python3 $T/audit20Probes.py "$OUT/probe-w$b" "$OUT"/sc/*.json | grep -v " exit 0$" || true
  python3 $T/audit20Fixtures.py "$OUT/probe-w$b" "$OUT/fx$b" "$OUT/sc" > "$OUT/derive$b.txt"
  ls "$OUT/fx$b"/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename > "$OUT/names$b.txt"
  for tree in base-a landed; do
    (cd "$OUT/$tree" && while read n; do AUDIT20_LENDS_ONLY=1 node --experimental-strip-types --no-warnings $T/audit20Check.ts "$OUT/fx$b" "$n" /dev/null; done \
      < "$OUT/names$b.txt") > "$OUT/lends$b-$tree.jsonl"
  done
done
same "$OUT/derive1.txt" "$OUT/derive2.txt"; same "$OUT/lends1-base-a.jsonl" "$OUT/lends2-base-a.jsonl"; same "$OUT/lends1-landed.jsonl" "$OUT/lends2-landed.jsonl"
python3 $T/aud110Align.py "$OUT/fx1" "$OUT/fxa" > /dev/null
for tree in base-a landed; do
  STF115_CHECK=audit21Check sh $T/stf115Check.sh "$OUT/fxa" "$OUT/$tree" "$OUT/check-$tree"
  python3 $T/stf115Summary.py "$OUT/check-$tree" "$OUT/lends1-$tree.jsonl" > "$REC/asl155-windows-a-$tree.txt"
  grep "^TOTAL all" "$REC/asl155-windows-a-$tree.txt" | sed "s/^/$tree: /"
done
# the landed arm reproduces ord149's patched windows byte for byte, the base arm ord149's base windows
same "$ORD/ord149-windows-patched.txt" "$REC/asl155-windows-a-landed.txt"; same "$ORD/ord149-windows-base.txt" "$REC/asl155-windows-a-base-a.txt"
fi

# B: census 0..999 base-b vs landed (the Extrasensory player later landing; base-b = HEAD with asl155-extrasensory-later.diff reversed):
# per-command delta (asl155CensusDelta.py: status and frame changes confined to player Extrasensory), land82CensusCheck
if part census-b; then
census base-b; census landed
python3 $T/asl155CensusDelta.py "$OUT/census-base-b/merged.jsonl" "$OUT/census-landed/merged.jsonl" "$REC/asl155-census-delta-b.json"
python3 $T/land82CensusCheck.py "$OUT/census-base-b" "$OUT/census-base-b/merged.json" "$OUT/census-base-b/merged.jsonl" "$OUT/census-landed" \
  "$OUT/census-landed/merged.json" "$OUT/census-landed/merged.jsonl" "$REC/asl155-census-check-b.json" > /dev/null || true
python3 - "$F/asl155-census-delta-b.json" "$REC/asl155-census-delta-b.json" <<'PY'
import json, sys
key = lambda p: (lambda d: (d["lifted"], d["regressed"], d["changedOutsidePlayerExtrasensory"], d["frameChanges"], d["playerExtrasensory"],
  [(c["battle"], c["command"], c["before"], c["after"]) for c in d["changed"]]))(json.load(open(p)))
print("same census-b delta (lifted / regressed / frame changes / player Extrasensory statuses)" if key(sys.argv[1]) == key(sys.argv[2]) else "DIFF census-b delta")
PY
for f in asl155-census-delta-b.json asl155-census-check-b.json; do same "$F/$f" "$REC/$f"; done
fi

# B: the player Extrasensory windows (scan93 xs-pla-* + later58 extrasensory-pla-*) through the LANDED production renderer (later58Check.sh:
# two fresh direct-mGBA probes per scenario), then the per-row policy receipt from ord149's instruction-stepped split (asl155XsPolicy.py)
if part windows-b; then
mkdir -p "$OUT/sel-b"; cp $T/fixtures/scan93/live/xs-pla-*.json $T/fixtures/later58/live/extrasensory-pla-*.json "$OUT/sel-b/"
(cd "$OUT/landed" && OUT="$OUT/chk-b" JOBS=${JOBS:-8} sh $T/later58Check.sh "$OUT/sel-b" "$REC/asl155-windows-b.json" > "$OUT/windows-b.log" 2>&1)
python3 - "$F/asl155-windows-b.json" "$REC/asl155-windows-b.json" <<'PY'
import json, sys
key = lambda p: [(r["fixture"], r["live"], [(x["rows"], x["exactRows"], x["residualPixels"], x["digest"]) for x in r["runs"]]) for r in json.load(open(p))["rows"]]
print("same windows-b (fixture, live, rows, px, render digests)" if key(sys.argv[1]) == key(sys.argv[2]) else "DIFF windows-b")
PY
python3 $T/asl155XsPolicy.py "$REC/asl155-xs-policy.json" | tail -1
same "$F/asl155-xs-policy.json" "$REC/asl155-xs-policy.json"
fi
