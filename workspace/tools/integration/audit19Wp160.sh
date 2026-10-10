#!/bin/sh
# Live audit 19, ISSUES #160 receipts (run from workspace/; direct mGBA only). usage: audit19Wp160.sh <receipt-dir> <scratch-dir> (FRESH dirs)
#  dive70-check-before.jsonl  dive70Check.ts on the committed tools/integration/fixtures/dive70/var-whirlpool-opp.json (lendEqualsRom false:
#                             its wordsChain puts the turn-2 prompt AFTER the Whirlpool: units [250, hit, action-prompt, actions-committed]);
#  dive70-check-after.jsonl   the same on a scratch COPY patched with fixtures/audit-19/patches/issue160-dive70-var-whirlpool-opp-rom-turns.diff
#                             (the ROM's turn split: the prompt between the Dive setup and the Whirlpool) -> lendEqualsRom true;
#  rom-turns.txt              a fresh audit19Probe.py of wp160-opp-s1 / wp160b-ply-s1: gBattleResults.battleTurnCounter changes and every body;
#  lends-ablation.txt         audit19Check.ts AUDIT19_LENDS_ONLY on wp160-opp-s1-c2 (the ROM turns; lend == ROM) and on an ablation copy
#                             with dive70's turn split (the #160 misorder).
set -e
[ $# -ge 2 ] || { echo "usage: audit19Wp160.sh <receipt-dir> <scratch-dir>"; exit 2; }
REC=$1; T=$2; W=tools/integration/fixtures/audit-19
mkdir -p "$REC" "$T/abl" "$T/fx"
node --experimental-strip-types --no-warnings tools/integration/dive70Check.ts tools/integration/fixtures/dive70/var-whirlpool-opp.json > "$REC/dive70-check-before.jsonl"
cp tools/integration/fixtures/dive70/var-whirlpool-opp.json "$T/var-whirlpool-opp.json"
patch -s "$T/var-whirlpool-opp.json" $W/patches/issue160-dive70-var-whirlpool-opp-rom-turns.diff
node --experimental-strip-types --no-warnings tools/integration/dive70Check.ts "$T/var-whirlpool-opp.json" | sed "s|\"$T/var-whirlpool-opp.json\"|\"<scratch copy + issue160 patch>\"|" > "$REC/dive70-check-after.jsonl"
python3 tools/integration/audit19Probes.py "$T/probe" $W/scenarios/wp160-opp-s1.json $W/scenarios/wp160b-ply-s1.json > /dev/null
python3 - "$T/probe" > "$REC/rom-turns.txt" <<'PY'
import json, sys
from pathlib import Path
for p in sorted(Path(sys.argv[1]).glob("*.json")):
    d = json.loads(p.read_text())
    print(p.stem, "turn-counter changes (frame, turn):", [(t["frame"], t["turnCounter"]) for t in d["turns"]])
    for b in d["bodies"]:
        print(f"  {b['startFrame']:>5}..{b.get('endFrame')} turn {b['at']['turnCounter']} {b['label']} attacker {b['attacker']} moveTurn {b['moveTurn']}"
              f" invisible {[s['invisible'] for s in b['at']['battlerSprites']]}")
PY
cp $W/fixtures/wp160-opp-s1-c2.json "$T/fx/"
python3 - $W/fixtures/wp160-opp-s1-c2.json "$T/abl/wp160-opp-s1-dive70turns-c2.json" <<'PY'
import json, sys
f = json.loads(open(sys.argv[1]).read())
t0, t1 = f["precedingTurns"][0]["events"], f["precedingTurns"][1]["events"]
assert [e["arguments"][0] for e in t0] == ["291"] and [e.get("arguments", ["hit"])[0] if e["animationId"] != "HIT_ANIMATION" else "hit" for e in t1] == ["250", "hit", "291"]
f["precedingTurns"] = [{"events": t0 + t1[:2]}, {"events": t1[2:]}]  # dive70's split: the prompt after the Whirlpool + hit
open(sys.argv[2], "w").write(json.dumps(f, indent=1) + "\n")
PY
{ AUDIT19_LENDS_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/audit19Check.ts "$T/fx" wp160-opp-s1 /dev/null
  AUDIT19_LENDS_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/audit19Check.ts "$T/abl" wp160-opp-s1-dive70turns /dev/null; } > "$REC/lends-ablation.txt"
