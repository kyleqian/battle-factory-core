#!/bin/sh
# aud137 runner (docs/aud137-live-audit-28.md, live audit 28: Scene ON status-condition animations, pixels / timing / x2). Run from
# workspace/; direct mGBA only (never the shared HTTP oracles); every production read happens in a git-archive copy of the FIXED base
# dcf042dc7 inside the FRESH <out-dir> (refused if non-empty; must be inside the repo), overlaid with HEAD's aud137 files only.
#   sh tools/integration/aud137Run.sh <fresh-out-dir>      (~10 min)
# 1. archive copy <out>/base (dcf042dc7) + HEAD's tools/integration/aud137* and fixtures/aud137; its own git repo; node_modules / reference
#    linked;
# 2. aud137Stage.py == committed scenarios + scenario-index; aud137TimingStage.py (crit seed 12, the sweep's pick) == committed
#    timing-scenarios + timing-index;
# 3. pixel probes: 44 scenarios x {r1 (window dump), r2} (aud137Job.sh = aud137Probe.py, 8 parallel) == receipts/probe-sha256.json;
#    aud137Receipt.py r1 == r2, sha256 == receipts/rom-windows.sha256; aud137Forms.py == receipts/forms.json;
# 4. stq132NpzToRaw.py + aud137Compare.ts twice (r1 == r2 == receipts/production-compare.json) + --diag=ordinary-rest
#    (== receipts/diag-ordinary-rest.json);
# 5. timing probes: 10 timing routes + the 44 pixel scenarios x {r1, r2} (aud137TimingJob.sh = seg127Probe.py) ==
#    receipts/timing-probe-sha256.json; aud137Timing.py == receipts/timing.json;
# 6. next body: sar131Probes.sh on the 4 ONIX routes (next-body-index.json) == receipts/next-body-probe-sha256.txt, sar131Rom.py
#    r1 == r2 == receipts/next-body-rom.json, sar131NpzToRaw.py + aud137NextBodyX2.ts == receipts/next-body-x2.json.
# Raw frame dumps and the archive copy are deleted at the end (AUD137_KEEP=1 keeps them).
set -u
OUT=${1:?usage: aud137Run.sh <fresh-out-dir>}
BASE=dcf042dc7
W=$(pwd)
[ -f "$W/tools/integration/aud137Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
fail=0
NODE="node --experimental-strip-types --no-warnings"
FX=tools/integration/fixtures/aud137
R=$FX/receipts
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }

# 1. archive copy of the fixed base + HEAD's aud137 files
C="$OUT/base/workspace"
mkdir -p "$C"
git archive "$(git rev-parse "$BASE")" . | tar -x -C "$C"
git archive HEAD $(git ls-files 'tools/integration/aud137*' "$FX") | tar -x -C "$C"
ln -sfn "$W/node_modules" "$C/node_modules"
ln -sfn "$W/reference" "$C/reference"
[ -d "$W/artifacts" ] && ln -sfn "$W/artifacts" "$C/artifacts"
(cd "$C" && git init -q && git add -A > /dev/null && git -c user.email=aud137@local -c user.name=aud137 commit -qm copy \
  && git -c user.email=aud137@local -c user.name=aud137 commit -q --allow-empty -m extra)
echo "base $BASE production src $(git rev-parse "$BASE":workspace/src); aud137 files from $(git rev-parse --short HEAD)"
RUN="$OUT/run"
mkdir -p "$RUN"

# 2. staging
(cd "$C" && python3 tools/integration/aud137Stage.py "$RUN/stage/scenarios" > /dev/null)
diff -r "$C/$FX/scenarios" "$RUN/stage/scenarios" > /dev/null && echo "SAME scenarios ($(ls "$RUN/stage/scenarios" | wc -l | tr -d ' '))" || { echo "DIFF scenarios"; fail=1; }
check "$C/$FX/scenario-index.json" "$RUN/stage/scenario-index.json" scenario-index.json
(cd "$C" && python3 tools/integration/aud137TimingStage.py "$RUN/tstage/timing-scenarios" aud137t-zap-cannon-crit-ply-primeape-snorlax=12 > /dev/null)
diff -r "$C/$FX/timing-scenarios" "$RUN/tstage/timing-scenarios" > /dev/null && echo "SAME timing-scenarios ($(ls "$RUN/tstage/timing-scenarios" | wc -l | tr -d ' '))" || { echo "DIFF timing-scenarios"; fail=1; }
check "$C/$FX/timing-index.json" "$RUN/tstage/timing-index.json" timing-index.json

# 3. pixel probes (direct mGBA, archive copy)
mkdir -p "$RUN/probes/r1" "$RUN/probes/r2" "$RUN/dump"
(cd "$C" && ls $FX/scenarios/*.json | while read -r s; do echo "$RUN/probes/r1 $s $RUN/dump"; done | xargs -P 8 -n 3 sh tools/integration/aud137Job.sh)
(cd "$C" && ls $FX/scenarios/*.json | while read -r s; do echo "$RUN/probes/r2 $s"; done | xargs -P 8 -n 2 sh tools/integration/aud137Job.sh)
python3 - "$RUN/probes" "$C/$R/probe-sha256.json" <<'PYEOF' || fail=1
import hashlib, json, os, sys
d, rec = sys.argv[1], json.load(open(sys.argv[2]))
same = sum(hashlib.sha256(open(os.path.join(d, r, k), "rb").read()).hexdigest() == v[r] for k, v in rec.items() for r in ("r1", "r2") if os.path.exists(os.path.join(d, r, k)))
print(f"pixel probes == committed sha256 (r1 == r2): {same} / {2 * len(rec)}")
sys.exit(0 if same == 2 * len(rec) == 88 else 1)
PYEOF
(cd "$C" && python3 tools/integration/aud137Receipt.py "$RUN/probes/r1" $FX/scenario-index.json "$RUN/rom-windows.json" > /dev/null \
  && python3 tools/integration/aud137Receipt.py "$RUN/probes/r2" $FX/scenario-index.json "$RUN/rom-windows-r2.json" > /dev/null)
check "$RUN/rom-windows.json" "$RUN/rom-windows-r2.json" "rom-windows r2 == r1"
(cd "$RUN" && shasum -a 256 rom-windows.json) > "$RUN/rom-windows.sha256"
check "$C/$R/rom-windows.sha256" "$RUN/rom-windows.sha256" rom-windows.sha256
(cd "$C" && python3 tools/integration/aud137Forms.py "$RUN/probes/r1" "$RUN/rom-windows.json" "$RUN/forms.json" > /dev/null)
check "$C/$R/forms.json" "$RUN/forms.json" forms.json

# 4. production compare (archive copy of the fixed base)
(cd "$C" && python3 tools/integration/stq132NpzToRaw.py "$RUN/dump" "$RUN/rom-windows.json" "$RUN/raw" > /dev/null)
(cd "$C" && $NODE tools/integration/aud137Compare.ts "$RUN/rom-windows.json" "$RUN/raw" "$RUN/cmp-r1.json" --forms="$RUN/forms.json" | tail -1)
(cd "$C" && $NODE tools/integration/aud137Compare.ts "$RUN/rom-windows.json" "$RUN/raw" "$RUN/cmp-r2.json" --forms="$RUN/forms.json" > /dev/null)
check "$RUN/cmp-r1.json" "$RUN/cmp-r2.json" "comparator r1 == r2"
check "$C/$R/production-compare.json" "$RUN/cmp-r1.json" production-compare.json
(cd "$C" && $NODE tools/integration/aud137Compare.ts "$RUN/rom-windows.json" "$RUN/raw" "$RUN/cmp-diag.json" --forms="$RUN/forms.json" --diag=ordinary-rest | tail -1 | sed "s/^/diag ordinary-rest: /")
python3 - "$RUN/cmp-diag.json" "$RUN/diag-ordinary-rest.json" <<'PYEOF'
import json, sys
d = json.load(open(sys.argv[1]))
json.dump({"summary": d["summary"], "windows": {k: v["fullScreen"]["px"] for k, v in d.items() if k != "summary"}}, open(sys.argv[2], "w"), indent=1)
open(sys.argv[2], "a").write("\n")
PYEOF
check "$C/$R/diag-ordinary-rest.json" "$RUN/diag-ordinary-rest.json" diag-ordinary-rest.json

# 5. timing (ROM gate / controller rows)
mkdir -p "$RUN/timing/r1" "$RUN/timing/r2"
for r in r1 r2; do
  (cd "$C" && ls $FX/timing-scenarios/*.json $FX/scenarios/*.json | while read -r s; do echo "$RUN/timing/$r $s"; done | xargs -P 8 -n 2 sh tools/integration/aud137TimingJob.sh)
done
python3 - "$RUN/timing" "$C/$R/timing-probe-sha256.json" <<'PYEOF' || fail=1
import hashlib, json, os, sys
d, rec = sys.argv[1], json.load(open(sys.argv[2]))
same = sum(hashlib.sha256(open(os.path.join(d, r, k), "rb").read()).hexdigest() == v[r] for k, v in rec.items() for r in ("r1", "r2") if os.path.exists(os.path.join(d, r, k)))
print(f"timing probes == committed sha256 (r1 == r2): {same} / {2 * len(rec)}")
sys.exit(0 if same == 2 * len(rec) == 108 else 1)
PYEOF
(cd "$C" && python3 tools/integration/aud137Timing.py "$RUN/timing" "$RUN/timing.json")
check "$C/$R/timing.json" "$RUN/timing.json" timing.json

# 6. next body after the status animation on the ONIX opponent
mkdir -p "$RUN/nb-scenarios"
python3 -c "import json,sys; [print(k) for k in json.load(open(sys.argv[1]))]" "$C/$FX/next-body-index.json" | while read -r s; do cp "$C/$FX/scenarios/$s" "$RUN/nb-scenarios/"; done
(cd "$C" && sh tools/integration/sar131Probes.sh "$RUN/nb" "$RUN/nb-scenarios" > /dev/null 2>&1)
cat "$RUN/nb/done"; grep -q "r1 == r2: 4 / 4" "$RUN/nb/done" || fail=1
(cd "$RUN/nb/probes" && for r in r1 r2; do for f in $r/*.json; do shasum -a 256 $f; done; done) > "$RUN/next-body-probe-sha256.txt"
check "$C/$R/next-body-probe-sha256.txt" "$RUN/next-body-probe-sha256.txt" next-body-probe-sha256.txt
(cd "$C" && python3 tools/integration/sar131Rom.py "$RUN/nb/probes/r1" $FX/next-body-index.json "$RUN/next-body-rom.json" > /dev/null \
  && python3 tools/integration/sar131Rom.py "$RUN/nb/probes/r2" $FX/next-body-index.json "$RUN/next-body-rom-r2.json" > /dev/null)
check "$RUN/next-body-rom.json" "$RUN/next-body-rom-r2.json" "next-body rom r2 == r1"
check "$C/$R/next-body-rom.json" "$RUN/next-body-rom.json" next-body-rom.json
(cd "$C" && python3 tools/integration/sar131NpzToRaw.py "$RUN/nb/dump" "$RUN/next-body-rom.json" "$RUN/nb-raw" > /dev/null)
(cd "$C" && $NODE tools/integration/aud137NextBodyX2.ts "$RUN/next-body-rom.json" "$RUN/nb-raw" "$RUN/next-body-x2.json" | tail -1)
check "$C/$R/next-body-x2.json" "$RUN/next-body-x2.json" next-body-x2.json

if [ "${AUD137_KEEP:-0}" != 1 ]; then rm -rf "$RUN/dump" "$RUN/raw" "$RUN/nb/dump" "$RUN/nb-raw" "$OUT/base"; fi
[ "$fail" -eq 0 ] && echo "aud137Run: ALL SAME" || { echo "aud137Run: FAILED"; exit 1; }
