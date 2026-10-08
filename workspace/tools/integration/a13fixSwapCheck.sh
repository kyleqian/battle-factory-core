#!/bin/sh
# a13fix (rung b): speciesAudit13SwapCheck.ts (production, the attacker's ROM personality from swap-personality.tsv) on both fresh runs of the given
# speciesAudit13 swap scenarios (probes: speciesAudit13SwapProbes.sh) + one summary line per stem. Shiny attackers now DECLINE (dur=None).
# usage (from workspace/): sh tools/integration/a13fixSwapCheck.sh <probe dir> <receipt dir> stem...
PR=$1 REC=$2; shift 2; W=tools/integration/fixtures/species-audit-13; mkdir -p "$REC"; export PR REC W POKEBENCH_LIVE_ORDER_INPUT=none
for s in "$@"; do for r in 1 2; do echo "$s $r"; done; done | xargs -P 12 -n 2 sh -c '
  side=$(grep "^$0	" $W/swap-scenarios/list.tsv | cut -f3); pers=$(grep "^$0 " $W/swap-personality.tsv | cut -d" " -f$([ "$side" = player ] && echo 2 || echo 3))
  F=; [ "$(grep "^$0	" $W/swap-scenarios/list.tsv | cut -f5)" = plain ] && F="--plain --attribute"
  S13_ATTACKER_PERSONALITY=$pers node --experimental-strip-types --no-warnings tools/integration/speciesAudit13SwapCheck.ts $F --out="$REC/$0-r$1.json" "$PR/$0-r$1.json:$PR/$0-r$1-rgb" > "$REC/$0-r$1.out" 2>&1 || echo "FAIL $0 $1"'
python3 - "$REC" "$@" <<'PY'
import json, sys
from pathlib import Path
rec = Path(sys.argv[1])
for stem in sys.argv[2:]:
    try: a, b = (json.loads((rec / f"{stem}-r{r}.json").read_text())["results"] for r in (1, 2))
    except Exception: print(stem, "NO-RECEIPT", (rec / f"{stem}-r1.out").read_text().strip().splitlines()[-1][:200]); continue
    same = [x["digest"] for x in a] == [x["digest"] for x in b]
    print(stem, f"windows={len(a)}", f"identical={same}", *([" | ".join(
        f"{x.get('move')} rows={x.get('rows')} dur={x.get('productionDuration')} {x['kind']} px={x['residualPixels']}/{y['residualPixels']} swapRows={x.get('swapRowsResidual')} bodyRows={x.get('bodyRowsResidual')}"
        for x, y in zip(a, b))] if a else ["no-window"]))
PY
