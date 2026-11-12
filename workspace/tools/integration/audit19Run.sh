#!/bin/sh
# Live audit 19 reproduction (run from workspace/; direct mGBA only, never the shared HTTP oracles; production src is NOT patched —
# a temp patch is applied only to a git-archive copy inside the scratch dir).
#   sh tools/integration/audit19Run.sh <receipt-dir> <scratch-dir>      (both FRESH caller-given dirs; nothing is deleted outside them)
# 1. re-stages the scenarios (must equal tools/integration/fixtures/audit-19/scenarios/);
# 2. probes every scenario once (audit19Probes.py) and derives the consumer fixtures (audit19Fixtures.py; must equal fixtures/);
# 3. audit19Check.ts per scenario on the COMMITTED fixtures (two more fresh probe processes each; CHAIN + ENTRY lends; r1 == r2) into
#    <receipt-dir>/check/, then summary.txt (audit19Summary.py) and verdicts.txt (audit19Verdicts.py: vs the no-unit controls);
# 4. lends.txt: every window's production lend (a deferred lend resolved as the render seam resolves it) vs the ROM free order at
#    activation (AUDIT19_LENDS_ONLY);
# 5. wp160/: ISSUES #160 (audit19Wp160.sh: the dive70 fixture's own lend vs the ROM, the ROM-turn history, and the patched copy);
#    ablation/: Castform sprite boxes masked, the Dive setup banner text, audit 18's all-turn missed-strike rule, a Dive setup consumer without its splash-birth context; coverage.txt
#    (audit19Coverage.py); needle/: the Needle Arm 302 per-frame order receipt (audit19NeedleFrames.py, r1 == r2);
# 6. compares <receipt-dir> with the committed receipts (audit19Compare.py).
set -e
[ $# -ge 2 ] || { echo "usage: audit19Run.sh <receipt-dir> <scratch-dir>"; exit 2; }
REC=$1; T=$2; W=tools/integration/fixtures/audit-19
mkdir -p "$REC/check" "$T"
J=${AUDIT19_JOBS:-10}
python3 tools/integration/audit19Stage.py "$T/sc" > /dev/null
diff -rq "$T/sc" $W/scenarios || { echo "staged scenarios differ from the committed ones"; exit 1; }
AUDIT19_JOBS=$J python3 tools/integration/audit19Probes.py "$T/probe" > "$T/probes.txt"
python3 tools/integration/audit19Fixtures.py "$T/probe" "$T/fx" > "$REC/derive.txt"
diff -rq "$T/fx" $W/fixtures > "$REC/derive-vs-committed.txt" && echo "derived fixtures == committed" >> "$REC/derive-vs-committed.txt" \
  || echo "WARNING: derived fixtures differ from the committed ones (see $REC/derive-vs-committed.txt)"
export REC T W
ls $W/fixtures/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 -P "$J" sh -c '
  n=$(basename "$0")
  node --experimental-strip-types --no-warnings tools/integration/audit19Check.ts $W/fixtures "$n" "$REC/check/check-$n.json" > "$T/check-$n.log" 2>&1 \
    || echo "FAILED $n (see $T/check-$n.log)"'
python3 tools/integration/audit19Summary.py "$REC/check" > "$REC/summary.txt"
python3 tools/integration/audit19Verdicts.py "$REC/check" > "$REC/verdicts.txt"
python3 tools/integration/audit19Coverage.py "$REC" $W/fixtures > "$REC/coverage.txt"
for n in $(ls $W/fixtures/*.json | sed 's/-c[0-9]*\.json$//' | sort -u); do
  AUDIT19_LENDS_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/audit19Check.ts $W/fixtures "$(basename "$n")" /dev/null
done > "$REC/lends.txt"
sh tools/integration/audit19Wp160.sh "$REC/wp160" "$T/wp160"
# ablations: Castform's sprite boxes masked (ISSUES #143: the residual is the weather form only); the Dive setup window with the move banner
# instead of BattleScriptFirstChargingTurn's empty string; audit 18's missed-strike rule in the consumer's own turn (wp160-opp-s1-c1)
mkdir -p "$REC/ablation" "$T/abl"
for n in cast-sun-swift-ply cast-sun-swift-opp cast-rain-swift-ply cast-rain-swift-opp; do
  AUDIT19_MASK=47:94:67:111,157:194:11:58 node --experimental-strip-types --no-warnings tools/integration/audit19Check.ts $W/fixtures "$n" "$REC/ablation/check-$n-mask-castform.json" > /dev/null 2>&1
done
python3 - $W/fixtures "$T/abl" <<'PY'
import json, sys
from pathlib import Path
src, dst = Path(sys.argv[1]), Path(sys.argv[2])
for p in sorted(src.glob("dive-clamperl-swift-ply-c*.json")):
    f = json.loads(p.read_text()); f.pop("messageLines", None)
    (dst / p.name.replace("dive-clamperl-swift-ply", "dive-clamperl-swift-ply-banner")).write_text(json.dumps(f, indent=1) + "\n")
PY
node --experimental-strip-types --no-warnings tools/integration/audit19Check.ts "$T/abl" dive-clamperl-swift-ply-banner "$REC/ablation/check-dive-clamperl-swift-ply-banner.json" > /dev/null 2>&1
AUDIT19_NO_SPLASH_CONTEXT=1 node --experimental-strip-types --no-warnings tools/integration/audit19Check.ts $W/fixtures dive-clamperl-swift-opp "$REC/ablation/check-dive-clamperl-swift-opp-no-splash-context.json" > /dev/null 2>&1
AUDIT19_MISS_RULE_ALL_TURNS=1 node --experimental-strip-types --no-warnings tools/integration/audit19Check.ts $W/fixtures wp160-opp-s1 "$REC/ablation/check-wp160-opp-s1-miss-rule-all-turns.json" > /dev/null 2>&1
python3 tools/integration/audit19Summary.py "$REC/ablation" > "$REC/ablation/summary.txt"
# the Needle Arm 302 latent defect: sSpriteOrder per frame through both Needle Arm bodies (two fresh runs; receipt only when r1 == r2)
mkdir -p "$REC/needle"
for k in 1 2; do
  python3 tools/run-mgba-probe.py "$T/naf$k.json" -- "${PY:-${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python}" tools/integration/audit19NeedleFrames.py \
    $W/scenarios/needle-cacnea-water-pulse-opp.json "$T/naf$k.json" > /dev/null 2>&1 || true
  python3 tools/integration/audit19NeedleFrames.py --summary "$T/naf$k.json" > "$T/naf$k.txt"
done
cmp -s "$T/naf1.txt" "$T/naf2.txt" && cp "$T/naf1.txt" "$REC/needle/needle-cacnea-water-pulse-opp-frames.txt" || echo "WARNING: Needle Arm frame runs differ"
[ -d $W/receipts/check ] && python3 tools/integration/audit19Compare.py "$REC" $W/receipts | tee "$T/receipts-vs-committed.txt" | tail -14 || true
