#!/bin/sh
# Live audit 24 runner (docs/live-audit-24.md). Run from workspace/; direct mGBA only (never the shared HTTP oracles). Both dirs must be
# FRESH (absent or empty) and INSIDE the repo (the probe tools find ../oracle from there). Nothing outside them is written.
#   sh tools/integration/audit24Run.sh <fresh-receipt-dir> <fresh-scratch-dir>
# 1. audit24Stage.py -> <scratch>/scenarios, diff'd with tools/integration/fixtures/audit-24/scenarios;
# 2. fresh probes: 24 labs x {r1, r2} (audit24Job.sh: ctl95Probe.py, 40-row RGB tail, a crashed run rerun once; 8 parallel), r1 == r2 byte
#    for byte -> <receipt>/probe-sha256-s1.json;
# 3. land97 lead rows: audit24LeadCheck.ts per move, production as committed (--lead0=age0) and the temp patch's row 0 (--lead0=field)
#    -> <receipt>/lead-<lead0>-<move>.json; the Substitute-swap Bite bodies -> swap-lead.json; audit24RowDiff.ts -> rowdiff-shadow-punch.txt;
# 4. fp100: ctl95ControlCheck.ts --move=FOCUS_PUNCH + fp100Phase.py -> fp.json, fp-phase.tsv;
# 5. git-archive copies of BASE (master ae0eb8ed3, production src 8706d10c) and BASE + fixtures/audit-24/audit24-lead-row0.diff (patch -p1),
#    and of 64f0ae997 (land97's own base, before the lead rows): attdollLiveCheck.ts (production composite; the swap labs copied into
#    the copy's prep40 scenario dir) -> swap-attdoll.json; idle94RouteRender.ts on 4 census routes in both copies + audit24RouteCheck.py
#    -> route/route-check.json; idle94Route.ts battle 38 Scene OFF / ON in the three copies -> route/scene-off-b38.json;
# 6. every receipt cmp'd with the committed tools/integration/fixtures/audit-24/receipts (SAME / DIFF / NEW).
set -eu
REC=${1:?usage: audit24Run.sh <fresh-receipt-dir> <fresh-scratch-dir>}; SCR=${2:?usage: audit24Run.sh <fresh-receipt-dir> <fresh-scratch-dir>}
W=$(pwd); [ -f "$W/tools/integration/audit24Run.sh" ] || { echo "run from workspace/"; exit 2; }
for d in "$REC" "$SCR"; do mkdir -p "$d"; [ -z "$(ls -A "$d")" ] || { echo "refusing: $d is not empty"; exit 2; }; done
REC=$(cd "$REC" && pwd); SCR=$(cd "$SCR" && pwd)
for d in "$REC" "$SCR"; do case "$d" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $d is outside the repo"; exit 2;; esac; done
FX=tools/integration/fixtures/audit-24; BASE=ae0eb8ed3; PRE=64f0ae997
NODE="node --experimental-strip-types --no-warnings"
echo "code $(git rev-parse HEAD) src $(git rev-parse HEAD:workspace/src) base $BASE src $(git rev-parse $BASE:workspace/src)"

# 1. staging
python3 tools/integration/audit24Stage.py "$SCR/scenarios" > /dev/null
diff -r "$SCR/scenarios" "$FX/scenarios" > /dev/null && echo "SAME scenarios ($(wc -l < "$FX/scenarios/list.tsv" | tr -d ' '))" || echo "DIFF scenarios"
S=$SCR/scenarios; P=$SCR/probes; mkdir -p "$P" "$REC/route" "$SCR/route"

# 2. probes
cut -f1 "$S/list.tsv" | while read -r n; do for r in 1 2; do echo "$S $n $r $P"; done; done | xargs -P 8 -n 4 tools/integration/audit24Job.sh > "$SCR/probes.log"
grep -c '^ok' "$SCR/probes.log" | sed 's/^/probe jobs ok: /'
python3 - "$P" "$REC/probe-sha256-s1.json" <<'PY'
import hashlib, json, sys, glob, os
d, out = sys.argv[1], sys.argv[2]
res = {}
for f in sorted(glob.glob(f"{d}/*-r1.json")):
    s = os.path.basename(f)[:-8]
    raw = [open(f"{d}/{s}-r{r}.json", "rb").read() for r in (1, 2)]
    # the output also records the scenario path (the scratch dir); the receipt hashes the frame rows only (path-independent)
    fr = [hashlib.sha256(json.dumps(json.loads(x)["frames"], sort_keys=True).encode()).hexdigest() for x in raw]
    res[s] = {"framesR1": fr[0], "framesR2": fr[1], "fileSame": raw[0] == raw[1], "same": fr[0] == fr[1] and raw[0] == raw[1]}
json.dump({"schema": "audit24-probe-sha256/v2", "sha256": res}, open(out, "w"), indent=1); open(out, "a").write("\n")
print("probes r1 == r2 (byte for byte):", sum(v["same"] for v in res.values()), "/", len(res))
PY

# 3. land97 lead rows
for m in SHADOW_PUNCH:shadow-punch BITE:bite RAZOR_LEAF:razor-leaf DIZZY_PUNCH:dizzy-punch HARDEN:harden EMBER:ember SLUDGE_BOMB:sludge-bomb; do
  M=${m%%:*}; k=${m#*:}; stems=$(grep -E "^audit24-lead-$k-" "$S/list.tsv" | cut -f1 | tr '\n' ' ')
  for l in age0 field; do $NODE tools/integration/audit24LeadCheck.ts --scenarios="$S" --move="$M" --lead0=$l --out="$REC/lead-$l-$k.json" "$P" $stems > /dev/null; done
done
$NODE tools/integration/audit24LeadCheck.ts --scenarios="$S" --move=BITE --out="$REC/swap-lead.json" "$P" audit24-swap-bite-player-raticate audit24-swap-bite-opponent-raticate > /dev/null
{ for spec in "opponent-haunter-skarmory 0,1,108,109,110" "opponent-haunter-lapras 0,1,108,109,110" "player-haunter-lapras 90,91,106,107" \
    "player-haunter-skarmory 112,113" "opponent-gengar-lapras 108,109,112"; do set -- $spec
    $NODE tools/integration/audit24RowDiff.ts --scenarios="$S" --move=SHADOW_PUNCH --rows="$2" "$P" "audit24-lead-shadow-punch-$1"; done; } > "$REC/rowdiff-shadow-punch.txt"

# 4. fp100
FP=$(grep -E '	fp	' "$S/list.tsv" | cut -f1 | tr '\n' ' ')
$NODE tools/integration/ctl95ControlCheck.ts --scenarios="$S" --move=FOCUS_PUNCH --out="$REC/fp.json" "$P" $FP > /dev/null
python3 tools/integration/fp100Phase.py "$P" "$REC/fp.json" -- $FP > "$REC/fp-phase.tsv"

# 5. production copies
for t in base patched preland97; do
  mkdir -p "$SCR/tree/$t"; rev=$BASE; [ $t = preland97 ] && rev=$PRE
  git -C .. archive $rev workspace/src workspace/tools workspace/package.json workspace/tsconfig.json | tar -x -C "$SCR/tree/$t"
  ln -s "$W/node_modules" "$SCR/tree/$t/workspace/node_modules"
  cp tools/integration/idle94Route.ts tools/integration/idle94RouteRender.ts "$SCR/tree/$t/workspace/tools/integration/"
done
patch -s -p1 -d "$SCR/tree/patched" < "$FX/audit24-lead-row0.diff"
grep -q "audit24: the first lead row" "$SCR/tree/patched/workspace/src/engine/battleResolutionPresentationRender.ts" || { echo "patch not applied"; exit 1; }
cp "$S"/audit24-swap-bite-*.json "$SCR/tree/base/workspace/tools/integration/fixtures/prep40/scenarios/"
(cd "$SCR/tree/base/workspace" && $NODE tools/integration/attdollLiveCheck.ts --out="$REC/swap-attdoll.json" "$P" audit24-swap-bite-player-raticate audit24-swap-bite-opponent-raticate > /dev/null)
ROUTES="38:44:opponent 4:188:opponent 154:339:player 31:337:opponent"
for t in base patched; do for r in $ROUTES; do b=${r%%:*}; rest=${r#*:}; mv=${rest%%:*}; sd=${rest#*:}
  (cd "$SCR/tree/$t/workspace" && $NODE tools/integration/idle94RouteRender.ts --seed=$b --streak=$(( (b * 11) % 49 )) --move=$mv --side=$sd \
    --out="$SCR/route/$t-b$b-$mv-$sd.json" > /dev/null)
done; done
python3 tools/integration/audit24RouteCheck.py "$SCR/route" "$REC/route/route-check.json" $ROUTES > /dev/null
for t in preland97 base patched; do for sc in off on; do
  (cd "$SCR/tree/$t/workspace" && $NODE tools/integration/idle94Route.ts --seed=38 --streak=26 --scene=$sc --out="$SCR/route/route-$t-b38-$sc.json" > /dev/null)
done; done
python3 - "$SCR/route" "$REC/route/scene-off-b38.json" <<'PY'
import json, sys, hashlib
V, out = sys.argv[1], sys.argv[2]
res = {}
for t in ("preland97", "base", "patched"):
    for s in ("off", "on"):
        d = json.load(open(f"{V}/route-{t}-b38-{s}.json"))
        res[f"{t}-{s}"] = {"frames": d["frames"], "commands": len(d["rows"]), "end": d["end"],
          "rowsSha": hashlib.sha256(json.dumps(d["rows"]).encode()).hexdigest()[:16],
          "keySha": hashlib.sha256(json.dumps([(r.get("type"), r.get("moveId"), r.get("attacker")) for r in d["rows"]]).encode()).hexdigest()[:16]}
json.dump({"schema": "audit24-scene-off-route/v1", "route": "census battle 38 (seed 38, streak 26), idle94Route.ts",
  "trees": {"preland97": "64f0ae997", "base": "ae0eb8ed3", "patched": "ae0eb8ed3 + audit24-lead-row0.diff"}, "runs": res}, open(out, "w"), indent=1)
open(out, "a").write("\n")
PY

# 6. compare
fail=0
for f in $(cd "$REC" && find . -type f | sort); do
  if [ ! -f "$FX/receipts/$f" ]; then echo "NEW $f"; elif cmp -s "$REC/$f" "$FX/receipts/$f"; then echo "SAME $f"; else echo "DIFF $f"; fail=1; fi
done
[ "$fail" -eq 0 ] && echo "audit24Run: ALL SAME (or NEW)" || { echo "audit24Run: DIFFERENCES"; exit 1; }
