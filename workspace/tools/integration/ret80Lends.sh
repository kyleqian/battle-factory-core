#!/bin/sh
# ret80 (docs/ret80-return-order.md): audit 20's 15 "Return 216 earlier in the history" order-lend windows (docs/live-audit-20.md s1.3)
# re-checked with the CURRENT production host -- the 8 Part B windows (committed partb/fixtures) and the 7 entry / visible-KO controls
# (staged, probed and derived exactly as audit20Extra.sh does: 2 fresh direct-mGBA probes per scenario, r1 == r2) -- after
# ret80Rekey.py sets each Return body's friendship argument to the staged 255 (the fixtures carry audit 19's "70").
# usage (from workspace/): sh tools/integration/ret80Lends.sh <fresh-out-dir>   (~2 min; never edits committed fixtures)
set -e
OUT=$1; [ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT"; W=tools/integration/fixtures/audit-20; J=${RET80_JOBS:-12}
NODE="node --experimental-strip-types --no-warnings"
lends() {  # $1 fixture dir, $2.. scenario names
  d=$1; shift
  for n in "$@"; do AUDIT20_LENDS_ONLY=1 $NODE tools/integration/audit20Check.ts "$d" "$n" /dev/null; done
}
echo "[1] Part B (committed fixtures, rekeyed)"
python3 tools/integration/ret80Rekey.py $W/partb/fixtures "$OUT/partb-fx"
lends "$OUT/partb-fx" $(ls $W/partb/fixtures/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename) > "$OUT/partb-lends.txt"
python3 tools/integration/audit20LendsPi.py "$OUT/partb-lends.txt" "$OUT/partb-fx" > "$OUT/partb-lends-pi.txt"
echo "[2] controls (audit20Extra.sh's staging; fresh probes)"
python3 - $W/partb/scenarios "$OUT/ctlsc" <<'PY'
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
AUDIT20_JOBS=$J python3 tools/integration/audit20Probes.py "$OUT/ctlprobe" "$OUT"/ctlsc/*.json > "$OUT/ctlprobes.txt"
python3 tools/integration/audit20Fixtures.py "$OUT/ctlprobe" "$OUT/ctlfx0" "$OUT/ctlsc" > "$OUT/controls-derive.txt"
python3 - "$OUT/ctlfx0" <<'PY'
import json, sys
from pathlib import Path
for p in Path(sys.argv[1]).glob("*.json"):
    if json.loads(p.read_text())["move"] == "GROWL":
        p.unlink()  # scratch copy only: no live adapter
PY
python3 tools/integration/ret80Rekey.py "$OUT/ctlfx0" "$OUT/ctlfx"
lends "$OUT/ctlfx" pb-vis-dig-jolteon-opp-s2 pb-vis-fly-taillow-opp-s2 pb-vis-fly-wingull-opp-s2 pb-ret-dig-jolteon-opp-s0 pb-ret-fly-wingull-opp-s2 \
  > "$OUT/controls-lends.txt"
python3 tools/integration/audit20LendsPi.py "$OUT/controls-lends.txt" "$OUT/ctlfx" > "$OUT/controls-lends-pi.txt"
echo "[3] windows with a Return 216 earlier in the history (before = audit 20's committed receipts, after = this run)"
echo "Part B before:"; python3 tools/integration/ret80LendsSummary.py $W/receipts-extra/partb/lends-pi.txt $W/partb/fixtures | tail -2
echo "Part B after:"; python3 tools/integration/ret80LendsSummary.py "$OUT/partb-lends-pi.txt" "$OUT/partb-fx" | tail -2
echo "controls before:"; python3 tools/integration/ret80LendsSummary.py $W/receipts-extra/controls-lends-pi.txt "$OUT/ctlfx0" | tail -2
echo "controls after:"; python3 tools/integration/ret80LendsSummary.py "$OUT/controls-lends-pi.txt" "$OUT/ctlfx" | tail -2
cmp -s "$OUT/controls-derive.txt" $W/receipts-extra/controls-derive.txt && echo "controls-derive.txt == audit 20's" || echo "controls-derive.txt DIFFERS from audit 20's"
