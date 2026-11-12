#!/bin/sh
# Live audit 18 reproduction (run from workspace/; direct mGBA only, never the shared HTTP oracles; production src is NOT patched).
#   sh tools/integration/audit18Run.sh <receipt-dir> <scratch-dir>      (both FRESH caller-given dirs; nothing is deleted outside them)
# 1. re-stages the scenarios (must equal tools/integration/fixtures/audit-18/scenarios/);
# 2. probes every scenario once (audit18Probes.py) and derives the consumer fixtures (audit18Fixtures.py; must equal fixtures/);
# 3. audit18Check.ts per scenario on the COMMITTED fixtures (two more fresh probe processes each; CHAIN + ENTRY lends; r1 == r2) into
#    <receipt-dir>/check/, then summary.txt (audit18Summary.py) and verdicts.txt (audit18Verdicts.py: vs the no-unit controls);
# 4. lag-frame counters for every window (audit18Lag.py: 2 fresh counter processes per scenario) -> lag.txt;
# 5. the Dive lends vs the ROM free order (AUDIT18_LENDS_ONLY) -> lends.txt; ablations (Iron Defense offset 0, audit 17's missed-strike
#    rule, audit 17's always-prompt turns, no hide) -> ablation/; battle 713 host census on this tree and on 82690e775 (git archive into
#    the scratch dir) -> c713/;
# 6. compares <receipt-dir> with the committed receipts (tools/integration/fixtures/audit-18/receipts/; audit18Compare.py): windows
#    identical / ROM-drift (a fresh probe run disagreeing with its pair: ISSUES #154 class) / DIFFERS, text receipts byte for byte.
set -e
[ $# -ge 2 ] || { echo "usage: audit18Run.sh <receipt-dir> <scratch-dir>"; exit 2; }
REC=$1; T=$2; W=tools/integration/fixtures/audit-18
mkdir -p "$REC/check" "$REC/ablation" "$REC/c713" "$T"
J=${AUDIT18_JOBS:-8}
python3 tools/integration/audit18Stage.py "$T/sc" > /dev/null
diff -rq "$T/sc" $W/scenarios || { echo "staged scenarios differ from the committed ones"; exit 1; }
AUDIT18_JOBS=$J python3 tools/integration/audit18Probes.py "$T/probe" > "$T/probes.txt"
python3 tools/integration/audit18Fixtures.py "$T/probe" "$T/fx" > "$REC/derive.txt"
diff -rq "$T/fx" $W/fixtures > "$REC/derive-vs-committed.txt" && echo "derived fixtures == committed" >> "$REC/derive-vs-committed.txt" \
  || echo "WARNING: derived fixtures differ from the committed ones (see $REC/derive-vs-committed.txt)"
export REC T W
ls $W/fixtures/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 -P "$J" sh -c '
  n=$(basename "$0")
  node --experimental-strip-types --no-warnings tools/integration/audit18Check.ts $W/fixtures "$n" "$REC/check/check-$n.json" > "$T/check-$n.log" 2>&1 \
    || echo "FAILED $n (see $T/check-$n.log)"'
python3 tools/integration/audit18Summary.py "$REC/check" > "$REC/summary.txt"
python3 tools/integration/audit18Verdicts.py "$REC/check" > "$REC/verdicts.txt"
AUDIT18_JOBS=$J python3 tools/integration/audit18Lag.py $W/fixtures "$T/lag" > "$REC/lag.txt"
for n in dive-snorlax-light-screen-ply dive-golem-light-screen-ply dive-snorlax-light-screen-opp dive-golem-light-screen-opp \
         dive-snorlax-double-team-ply dive-golem-double-team-opp dive-snorlax-ice-beam-ply dive-golem-ice-beam-opp; do
  AUDIT18_LENDS_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/audit18Check.ts $W/fixtures "$n" /dev/null
done > "$REC/lends.txt"
# ablations: Iron Defense at audit 17's offset 0; the per-turn missed-strike rule off; audit 17's always-prompt turns; no hide
mkdir -p "$T/abl"
python3 - $W/fixtures "$T/abl" <<'PY'
import json, sys
from pathlib import Path
src, dst = Path(sys.argv[1]), Path(sys.argv[2])
for n in ("ctl-snorlax-iron-defense-ply", "ctl-snorlax-iron-defense-opp"):
    for p in sorted(src.glob(f"{n}-c*.json")):
        f = json.loads(p.read_text()); f["denseWindow"].pop("ageOffset")
        (dst / p.name.replace(n, n + "-offset0")).write_text(json.dumps(f, indent=1) + "\n")
PY
for n in ctl-snorlax-iron-defense-ply-offset0 ctl-snorlax-iron-defense-opp-offset0; do
  node --experimental-strip-types --no-warnings tools/integration/audit18Check.ts "$T/abl" "$n" "$REC/ablation/check-$n.json" > /dev/null 2>&1
done
AUDIT18_NO_MISS_RULE=1 node --experimental-strip-types --no-warnings tools/integration/audit18Check.ts $W/fixtures bounce-golem-bulk-up-opp "$REC/ablation/check-bounce-golem-bulk-up-opp-no-miss-rule.json" > /dev/null 2>&1
AUDIT18_PROMPT_ALWAYS=1 node --experimental-strip-types --no-warnings tools/integration/audit18Check.ts $W/fixtures fly-snorlax-bulk-up-opp "$REC/ablation/check-fly-snorlax-bulk-up-opp-prompt-always.json" > /dev/null 2>&1
AUDIT18_NO_HIDE=1 node --experimental-strip-types --no-warnings tools/integration/audit18Check.ts $W/fixtures dig-snorlax-safeguard-ply "$REC/ablation/check-dig-snorlax-safeguard-ply-no-hide.json" > /dev/null 2>&1
python3 tools/integration/audit18Summary.py "$REC/ablation" > "$REC/ablation/summary.txt"
# battle 713 (target 3): per-command host state on this tree and on 82690e775 (git archive of src + tools/integration into the scratch dir)
node --experimental-strip-types --no-warnings tools/integration/audit18Census713.ts --seeds=713..713 --out="$T/c713-master.json" --commands="$REC/c713/master.jsonl" > /dev/null 2>&1
mkdir -p "$T/b50"
git archive 82690e775 src tools/integration package.json | tar -x -C "$T/b50"
ln -s "$PWD/node_modules" "$T/b50/node_modules"; ln -s "$PWD/reference" "$T/b50/reference"
python3 tools/integration/audit18CensusPatch.py "$T/b50/tools/integration/liveShareCensus.ts" "$T/b50/tools/integration/audit18Census713.ts"
B=$(cd "$REC/c713" && pwd)
(cd "$T/b50" && node --experimental-strip-types --no-warnings tools/integration/audit18Census713.ts --seeds=713..713 --out=c713.json --commands="$B/b50c4dabd.jsonl" > /dev/null 2>&1)
python3 tools/integration/audit18Battle713.py "$REC/c713/b50c4dabd.jsonl" "$REC/c713/master.jsonl" > "$REC/c713/diff.txt"
[ -d $W/receipts/check ] && python3 tools/integration/audit18Compare.py "$REC" $W/receipts | tee "$T/receipts-vs-committed.txt" | tail -12 || true
