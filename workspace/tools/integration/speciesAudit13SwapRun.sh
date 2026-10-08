#!/bin/sh
# speciesAudit13 attacker-swap check (run from workspace/): speciesAudit13SwapCheck.ts (= substSwapLiveCheck.ts + the shiny attacker's ROM
# personality) on BOTH fresh runs of every swapped scenario -> <REC>/<stem>-r{1,2}.json (+ .out). Production supplies no order lend after
# these histories, as in substSwapRun.sh (POKEBENCH_LIVE_ORDER_INPUT=none). Then one summary line per stem (r1 vs r2 digests).
# usage: sh tools/integration/speciesAudit13SwapRun.sh <probe dir> <receipt dir> [P]
[ $# -ge 2 ] || { echo "usage: speciesAudit13SwapRun.sh <probe dir> <receipt dir> [P]"; exit 2; }
PR=$1 REC=$2; W=tools/integration/fixtures/species-audit-13; mkdir -p "$REC"; export PR REC W POKEBENCH_LIVE_ORDER_INPUT=none
for s in $(cut -f1 $W/swap-scenarios/list.tsv); do for r in 1 2; do echo "$s $r"; done; done | xargs -P ${3:-12} -n 2 sh -c '
  side=$(grep "^$0	" $W/swap-scenarios/list.tsv | cut -f3); pers=$(grep "^$0 " $W/swap-personality.tsv | cut -d" " -f$([ "$side" = player ] && echo 2 || echo 3))
  S13_ATTACKER_PERSONALITY=$pers node --experimental-strip-types --no-warnings tools/integration/speciesAudit13SwapCheck.ts --out="$REC/$0-r$1.json" "$PR/$0-r$1.json:$PR/$0-r$1-rgb" > "$REC/$0-r$1.out" 2>&1 || true'
python3 - "$REC" $W/swap-scenarios/list.tsv <<'PY'
import json, sys
from pathlib import Path
rec = Path(sys.argv[1])
for line in open(sys.argv[2]):
    stem = line.split("\t")[0]
    try: a, b = (json.loads((rec / f"{stem}-r{r}.json").read_text())["results"] for r in (1, 2))
    except Exception: print(stem, "NO-RECEIPT", (rec / f"{stem}-r1.out").read_text().strip().splitlines()[-1][:160]); continue
    same = [x["digest"] for x in a] == [x["digest"] for x in b]
    print(stem, f"windows={len(a)}", f"identical={same}", *([" | ".join(
        f"{x.get('move')} rows={x.get('rows')} dur={x.get('duration', x.get('liveDuration'))} px={x['residualPixels']}/{y['residualPixels']}"
        for x, y in zip(a, b))] if a else ["no-window"]))
PY
