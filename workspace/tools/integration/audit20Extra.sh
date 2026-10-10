#!/bin/sh
# Live audit 20, the extra receipts (run from workspace/; direct mGBA only; production src is NOT patched):
#   sh tools/integration/audit20Extra.sh <receipt-dir> <scratch-dir>     (both FRESH caller-given dirs; nothing is deleted outside them)
# 1. partb/: land75 Part B (audit20PartBStage.py: the opponent's Fly / Dig user KO'd while hidden, the replacement's and the hitter's next
#    bodies): restage (== committed), probe, derive (== committed), audit20Check.ts (2 fresh probes per scenario), summary / verdicts /
#    lends;
# 2. ablation/: (a) Toxic windows aligned at the accepted window start (denseWindow.ageOffset = -the ROM's first bubble creation age);
#    (b) the Part B fixtures before their two fixture fixes (Fly setup with the move banner instead of the charging turn's empty box; the
#    replacement drawn with the lead's gender);
# 3. lag.txt: issue151Counters.sh (playTime pass counters, 2 fresh runs) on the Meteor Mash / Dive setup residual windows and comparators;
# 4. controls-*: the order-lend controls (a visible KO; Return at the entry state) and the lends under the post-KO relabel pi;
# 5. compares with the committed tools/integration/fixtures/audit-20/receipts-extra (audit20Compare.py for partb/, cmp for the rest).
set -e
[ $# -ge 2 ] || { echo "usage: audit20Extra.sh <receipt-dir> <scratch-dir>"; exit 2; }
REC=$1; T=$2; W=tools/integration/fixtures/audit-20
mkdir -p "$REC/partb/check" "$REC/ablation" "$T/abl"
J=${AUDIT20_JOBS:-12}
python3 tools/integration/audit20PartBStage.py "$T/pbsc" > /dev/null
diff -rq "$T/pbsc" $W/partb/scenarios || { echo "staged Part B scenarios differ from the committed ones"; exit 1; }
AUDIT20_JOBS=$J python3 tools/integration/audit20Probes.py "$T/pbprobe" $W/partb/scenarios/*.json > "$T/pbprobes.txt"
python3 tools/integration/audit20Fixtures.py "$T/pbprobe" "$T/pbfx" $W/partb/scenarios > "$REC/partb/derive.txt"
diff -rq "$T/pbfx" $W/partb/fixtures > "$REC/partb/derive-vs-committed.txt" && echo "derived fixtures == committed" >> "$REC/partb/derive-vs-committed.txt" \
  || echo "WARNING: derived Part B fixtures differ from the committed ones"
export REC T W
ls $W/partb/fixtures/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename | xargs -n 1 -P "$J" sh -c '
  node --experimental-strip-types --no-warnings tools/integration/audit20Check.ts $W/partb/fixtures "$0" "$REC/partb/check/check-$0.json" > "$T/pbcheck-$0.log" 2>&1 \
    || echo "FAILED $0"'
python3 tools/integration/audit20Summary.py "$REC/partb/check" > "$REC/partb/summary.txt"
python3 tools/integration/audit20Verdicts.py "$REC/partb/check" > "$REC/partb/verdicts.txt"
for n in $(ls $W/partb/fixtures/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename); do
  AUDIT20_LENDS_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/audit20Check.ts $W/partb/fixtures "$n" /dev/null
done > "$REC/partb/lends.txt"
# ablations: fixture copies in the scratch dir (the committed fixtures are never edited)
python3 - $W "$T/abl" <<'PY'
import json, sys
from pathlib import Path
w, dst = Path(sys.argv[1]), Path(sys.argv[2])
for n in ("dv-seel-barrier-ply", "dv-clamperl-barrier-opp"):
    for p in sorted((w / "fixtures").glob(n + "-c*.json")):
        f = json.loads(p.read_text())
        if f["move"] == "TOXIC":
            f["denseWindow"]["ageOffset"] = -f["rom"]["alloc"]["creates"][0][0]
        (dst / p.name.replace(n, n + "-toxic-accepted-start")).write_text(json.dumps(f, indent=1) + "\n")
lead = json.loads(Path("tools/battle-lab/prep18-return-altopp-snorlax-golem.json").read_text())["overrides"]["parties"]["opponent"][0]
for p in sorted((w / "partb/fixtures").glob("pb-fly-wingull-opp-s2-c*.json")):
    f = json.loads(p.read_text())
    b = json.loads(json.dumps(f)); b.pop("messageLines", None)
    (dst / p.name.replace("pb-fly-wingull-opp-s2", "pb-fly-wingull-opp-s2-banner")).write_text(json.dumps(b, indent=1) + "\n")
    g = json.loads(json.dumps(f)); g["fieldProfile"]["opponentGender"] = "male"  # the KO'd lead's gender, not the replacement's
    (dst / p.name.replace("pb-fly-wingull-opp-s2", "pb-fly-wingull-opp-s2-lead-gender")).write_text(json.dumps(g, indent=1) + "\n")
PY
for n in dv-seel-barrier-ply-toxic-accepted-start dv-clamperl-barrier-opp-toxic-accepted-start pb-fly-wingull-opp-s2-banner pb-fly-wingull-opp-s2-lead-gender; do
  echo "$n"
done | xargs -n 1 -P 4 sh -c 'node --experimental-strip-types --no-warnings tools/integration/audit20Check.ts "$T/abl" "$0" "$REC/ablation/check-$0.json" > /dev/null 2>&1 || echo "FAILED $0"'
python3 tools/integration/audit20Summary.py "$REC/ablation" > "$REC/ablation/summary.txt"
# lag frames (playTime pass delta 0) inside the residual windows (TIMING-PHASE evidence) and ZERO comparators
F=$W/fixtures
sh tools/integration/issue151Counters.sh "$T/lag" 6 $F/mm-clefable-barrier-opp-c5.json $F/mm-clefable-barrier-opp-c7.json $F/mm-metagross-barrier-opp-c7.json \
  $F/mm-metagross-light-screen-opp-c4.json $F/mm-metagross-light-screen-ply-c2.json $F/mm-clefable-barrier-opp-c3.json $F/mm-metagross-barrier-ply-c2.json \
  $F/dv-clamperl-barrier-opp-c1.json $F/dv-clamperl-magic-coat-opp-c1.json $F/dv-seel-barrier-opp-c1.json $F/dv-seel-magic-coat-opp-c1.json \
  $F/dv-clamperl-barrier-ply-c1.json > "$REC/lag.txt"
# order-lend controls (LENDS_ONLY, no render): the Part B scenarios with the two-turn user on GROWL 45 (the KO of a VISIBLE battler;
# Growl has no live adapter, so its windows are dropped) and with the replacement as the LEAD (Return 216 at the entry state); the
# lends of partb/ and of the controls under the post-KO relabel pi (audit20LendsPi.py)
python3 - $W/partb/scenarios "$T/ctlsc" <<'PY'
import json, sys
from pathlib import Path
src, dst = Path(sys.argv[1]), Path(sys.argv[2]); dst.mkdir(parents=True, exist_ok=True)
for n in ("pb-fly-wingull-opp-s2", "pb-fly-taillow-opp-s2", "pb-dig-jolteon-opp-s2"):
    s = json.loads((src / f"{n}.json").read_text())
    s["overrides"]["parties"]["opponent"][0]["moves"] = [45] * 4
    (dst / (n.replace("pb-", "pb-vis-") + ".json")).write_text(json.dumps(s, indent=1) + "\n")
for n in ("pb-fly-wingull-opp-s2", "pb-dig-jolteon-opp-s0"):
    s = json.loads((src / f"{n}.json").read_text())
    o = s["overrides"]["parties"]["opponent"]
    o[0], o[1] = o[1], o[0]
    (dst / (n.replace("pb-", "pb-ret-") + ".json")).write_text(json.dumps(s, indent=1) + "\n")
PY
AUDIT20_JOBS=$J python3 tools/integration/audit20Probes.py "$T/ctlprobe" "$T"/ctlsc/*.json > "$T/ctlprobes.txt"
python3 tools/integration/audit20Fixtures.py "$T/ctlprobe" "$T/ctlfx" "$T/ctlsc" > "$REC/controls-derive.txt"
python3 - "$T/ctlfx" <<'PY'
import json, sys
from pathlib import Path
for p in Path(sys.argv[1]).glob("*.json"):
    if json.loads(p.read_text())["move"] == "GROWL":
        p.unlink()  # scratch copy only: no live adapter
PY
for n in pb-vis-dig-jolteon-opp-s2 pb-vis-fly-taillow-opp-s2 pb-vis-fly-wingull-opp-s2 pb-ret-dig-jolteon-opp-s0 pb-ret-fly-wingull-opp-s2; do
  AUDIT20_LENDS_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/audit20Check.ts "$T/ctlfx" "$n" /dev/null
done > "$REC/controls-lends.txt"
python3 tools/integration/audit20LendsPi.py "$REC/partb/lends.txt" $W/partb/fixtures > "$REC/partb/lends-pi.txt"
python3 tools/integration/audit20LendsPi.py "$REC/controls-lends.txt" "$T/ctlfx" > "$REC/controls-lends-pi.txt"
if [ -d $W/receipts-extra/partb/check ]; then
  python3 tools/integration/audit20Compare.py "$REC/partb" $W/receipts-extra/partb | tail -8
  for f in lag.txt ablation/summary.txt controls-derive.txt controls-lends.txt controls-lends-pi.txt partb/lends-pi.txt $(cd $W/receipts-extra && ls ablation/check-*.json); do cmp -s "$REC/$f" "$W/receipts-extra/$f" && echo "$f: byte-identical" || echo "$f: DIFFERS"; done
fi
