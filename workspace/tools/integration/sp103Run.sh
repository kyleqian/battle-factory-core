#!/bin/sh
# sp103 reproduction (run from workspace/; docs/next-adapters-sp103.md): Shadow Punch 325's optional restore lag at body age 90, a D4
# phase census for a future faithful-timing entry (fp100 shape), on THIS checkout's code.
#  1. sp103Scenarios.py regenerates tools/integration/fixtures/sp103/scenarios (cmp'd: "same scenarios" / "DIFF scenarios");
#  2. fresh direct-mGBA probes, twice (sp103Job.sh: ctl95Probe.py, 40-row RGB tail; a crashed job (exit 138 / 139) rerun once),
#     gated r1 == r2 byte for byte;
#  3. production as committed: audit24LeadCheck.ts (lead rows A .. A+N-1) + ctl95ControlCheck.ts --shift=8 (the body window,
#     production ages) -> sp103Phase.py -> <out>/phase.tsv, and body-head.json / lead-head.json, each cmp'd with the receipts;
#  4. the temp patch: a git-archive copy of HEAD (<out>/copy) + tools/integration/fixtures/sp103/sp103-shadow-punch-d4.diff, the same
#     body render -> <out>/body-patch.json (cmp'd); with --tests also the related vitest files on the patched copy (<out>/patched-related.log).
# The out dir must be INSIDE the repo (the probe tools find ../oracle from there). The copy is removed at the end.
# usage: sh tools/integration/sp103Run.sh <fresh-out-dir> [--tests]
set -e
OUT=${1:?usage: sp103Run.sh <fresh-out-dir> [--tests]}; [ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)"; exit 2; }
WS=$PWD; FX=$WS/tools/integration/fixtures/sp103; S=$FX/scenarios
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd); PR=$OUT/probes; mkdir -p "$PR" "$OUT/scenarios"
echo "code $(git rev-parse HEAD) src $(git rev-parse HEAD:workspace/src) dirty-src $(git status --short src | wc -l | tr -d ' ')"
python3 tools/integration/sp103Scenarios.py "$OUT/scenarios" > /dev/null
diff -r "$OUT/scenarios" "$S" > /dev/null && echo "same scenarios" || echo "DIFF scenarios"
STEMS=$(cut -f1 "$S/list.tsv" | tr '\n' ' ')
for s in $STEMS; do for r in 1 2; do echo "$S $s $r $PR"; done; done > "$OUT/jobs.txt"
xargs -P 6 -n 4 sh tools/integration/sp103Job.sh < "$OUT/jobs.txt" > "$OUT/probes.log" 2>&1 || true
n=0; for s in $STEMS; do cmp -s "$PR/$s-r1.json" "$PR/$s-r2.json" && n=$((n + 1)) || echo "DIFF $s"; done; echo "probes: $n scenarios r1 == r2 byte-identical"
# the probe JSON also records the scenario path as given, so the receipt hashes the frame rows only
python3 -c 'import hashlib,json,sys; [print(hashlib.sha256(json.dumps(json.load(open(f"{sys.argv[1]}/{s}-r{r}.json"))["frames"], sort_keys=True).encode()).hexdigest(), f"{s}-r{r}") for s in sys.argv[2:] for r in (1, 2)]' "$PR" $STEMS > "$OUT/probe-sha256.txt"
cmp -s "$OUT/probe-sha256.txt" "$FX/receipts/probe-sha256.txt" && echo "same probe-sha256.txt" || echo "DIFF probe-sha256.txt"
node --experimental-strip-types --no-warnings tools/integration/audit24LeadCheck.ts --scenarios="$S" --move=SHADOW_PUNCH --out="$OUT/lead-head.json" "$PR" $STEMS > /dev/null
node --experimental-strip-types --no-warnings tools/integration/ctl95ControlCheck.ts --scenarios="$S" --move=SHADOW_PUNCH --shift=8 --out="$OUT/body-head.json" "$PR" $STEMS > /dev/null
python3 tools/integration/sp103Phase.py "$PR" "$OUT/lead-head.json" "$OUT/body-head.json" -- $STEMS > "$OUT/phase.tsv"
for f in phase.tsv lead-head.json body-head.json; do cmp -s "$OUT/$f" "$FX/receipts/$f" && echo "same $f" || echo "DIFF $f"; done
mkdir -p "$OUT/copy"
git -C "$(git rev-parse --show-toplevel)" archive --format=tar HEAD workspace | tar -x -C "$OUT/copy" --strip-components=1
ln -s "$WS/node_modules" "$OUT/copy/node_modules"
(cd "$OUT/copy" && git init -q && git apply "$FX/sp103-shadow-punch-d4.diff" && git apply --stat "$FX/sp103-shadow-punch-d4.diff" | tail -1 \
  && node --experimental-strip-types --no-warnings tools/integration/ctl95ControlCheck.ts --scenarios="$S" --move=SHADOW_PUNCH --shift=8 \
    --out="$OUT/body-patch.json" "$PR" $STEMS > /dev/null)
cmp -s "$OUT/body-patch.json" "$FX/receipts/body-patch.json" && echo "same body-patch.json" || echo "DIFF body-patch.json"
if [ "$2" = --tests ]; then
  (cd "$OUT/copy" && npx vitest run $(grep -rlE "SHADOW_PUNCH|shadowPunch|ShadowPunch|\b325\b|liveMoveTimingPolicy|faithfulTiming|FaithfulTiming|implementedCount|LIVE_MOVE_ANIMATION_IDS|remaining-adapters-census" tests | sort -u) \
    --reporter=dot > "$OUT/patched-related.log" 2>&1 || true)
  grep -E '^ +(Test Files|Tests) ' "$OUT/patched-related.log" || true
fi
rm -rf "$OUT/copy" "$PR"/*-rgb
python3 -c 'import json,sys; rs=json.load(open(sys.argv[1]))["results"]; [print(r["stem"], "b%d" % r["body"], r["romBodyRows"], "px", r["px"][0], ",".join(r["badAges"]) or "-") for r in rs]' "$OUT/body-patch.json"
