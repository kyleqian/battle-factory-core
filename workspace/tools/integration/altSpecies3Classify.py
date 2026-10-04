#!/usr/bin/env python3
"""Add classification + attribution to altspecies3-results.json (after altSpecies3Receipt.ts) and print the markdown table."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
P = ROOT / "tools/integration/fixtures/altspecies3-results.json"
d = json.loads(P.read_text())
CLASS = {
 "body-slam-player-lickitung-opponent-golbat": "acceptance-142",
 "mega-punch-player-cacturne-opponent-magneton": "acceptance-142",
 "reflect-player-shuppet-opponent-golbat": "acceptance-142",
 "brick-break-player-lombre-opponent-haunter-shattered": "acceptance-142",
 "night-shade-player-ariados-opponent-golbat-hp160-notail": "acceptance-142",
 "karate-chop-player-primeape-opponent-golbat": "control-exact",
 "slash-player-charmeleon-opponent-magneton": "control-exact",
 "bite-player-meowth-opponent-magneton": "control-exact",
 "confusion-player-kadabra-opponent-magneton": "control-exact",
 "psychic-player-kadabra-opponent-golbat": "control-exact",
 "psychic-opponent-haunter-player-kadabra": "control-exact",
 "toxic-player-clamperl-opponent-ledian": "control-exact",
 "toxic-opponent-golbat-player-clamperl": "control-exact",
 "shadow-ball-player-sableye-opponent-magneton": "control-exact",
 "shadow-ball-opponent-golbat-player-sableye-notail": "control-exact",
 "calm-mind-player-lunatone-opponent-golbat": "control-exact",
 "brick-break-player-lombre-opponent-haunter": "superseded-staging-artifact (live fixture lacks body:shattered-wall)",
 "night-shade-player-ariados-opponent-golbat": "superseded-staging-artifact (fieldProfile playerHp 177, ROM 160)",
 "night-shade-player-ariados-opponent-golbat-hp160": "rom-tail-variance (restorebg fade 38 vs 39 frames; ages 209..224)",
 "shadow-ball-opponent-golbat-player-sableye": "rom-tail-variance (restorebg fade 39 vs 38 frames; ages 132..147)",
}
import re
DER = {r["case"]: r for r in json.loads((ROOT / "tools/integration/fixtures/altspecies3-derivation.json").read_text())}
for c in d["cases"]:
    base = re.sub(r"-(shattered|hp160|hp160-notail|notail)$", "", c["case"].removeprefix("altspecies3-"))
    c["derivation"] = DER[base]
    c["classification"] = CLASS[c["case"].removeprefix("altspecies3-")]
d["method"] = ("window start = move-script activation frame (gAnimScriptActive rising edge with sAnimMoveIndex == move, allocatorNetZeroProbe.py detection) "
               "+ the accepted fixture's own (window start - its scenario's activation); never live matching. 2 passes x 2 fresh direct-mGBA runs per case.")
P.write_text(json.dumps(d, indent=1) + "\n")
for c in d["cases"]:
    r = c["runs"]; w = c["window"]; dv = c.get("derivation") or {}
    rr = r[0].get("residualRows") or []
    box = "-" if not rr else f"age {rr[0]['age']} bbox {rr[0]['bbox']['x0']}..{rr[0]['bbox']['x1']},{rr[0]['bbox']['y0']}..{rr[0]['bbox']['y1']}"
    print(f"| {c['case'].removeprefix('altspecies3-')} | {c['move']} | {dv.get('acceptedStart','-')} / {dv.get('offset','-')} | {w['startFrame']} | {r[0]['rows']} | {'/'.join(str(x['residualPixels']) for x in r)} | {r[0]['residualRowSummary']['count']} | {box} | {c['classification'].split(' (')[0]} |")
