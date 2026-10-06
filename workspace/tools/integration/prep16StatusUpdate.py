#!/usr/bin/env python3
"""Record the prep16 adapters in docs/animation-integration-live-status.json: Overheat 315 and Silver Wind 318 (exact, first body only;
implementedCount). usage: prep16StatusUpdate.py"""
import json, pathlib
p = pathlib.Path(__file__).resolve().parents[2] / "docs/animation-integration-live-status.json"
d = json.loads(p.read_text())
REC = "tools/integration/fixtures/prep16-live-adapter-receipt.json"
T = "tests/animation/livePrep16MoveAdapters.test.ts"
LATER = "later bodies (a battle's second and later animation unit) decline to the scene-off view: the activation BG registers/scroll after an earlier body need the BG-register tracker (prep16 s0.3 transition table, not built)"
SHINY = "shiny battlers decline (no shiny battle palette in the repo)"
new = [
 {"move": "MOVE_OVERHEAT", "id": 315, "sourceFieldEvidence": "../" + REC,
  "liveEvidence": ["dense 230/230 zero residual twice fresh through the production live renderer: SOLROCK -> SHUCKLE (player) and MAGCARGO -> SHUCKLE (opponent) first bodies + CHARIZARD -> GOLEM alternate (window = each scenario's own source window = activation + 0)",
                   "first-body gate: the order host's body counter (liveSpriteOrderHost.ts, LiveMoveSpriteOrderInput.firstBody); palettes = composeLivePalettes (assets only, liveMovePaletteComposite.ts); plan row 315 in live-animation-palette-resources.json",
                   "ordinary routes 4/14 MAGCARGO and 69/14 SOLROCK: first body reached, adapter active every age, following prompt reached, ON/OFF rules/RNG/boundary equal"],
  "remaining": [LATER, SHINY, "an opponent attacker/target whose front idle x2 is non-zero (ONIX / RATTATA right after a send-in) declines: the renderer draws no idle offset",
                "independent arbitrary-species/history framebuffer comparison"]},
 {"move": "MOVE_SILVER_WIND", "id": 318, "sourceFieldEvidence": "../" + REC,
  "liveEvidence": ["dense 193/193 (player) and 196/196 (opponent) zero residual twice fresh: BUTTERFREE -> ONIX player, the prep16 opponent FIRST-BODY capture (first-body registers bg1cnt 0x9c00, win0 240/161, splitBg1Cnt 0x9c01; NOT the accepted post-Tackle values), BEAUTIFLY -> GOLEM alternate",
                   "first-body gate, palette composite and plan row 318 as Overheat; attacker/target picture origins from the anchors, sparkle birth y shifted by the target picture y delta",
                   "ordinary routes 3/7 VOLBEAT and 8/7 VENOMOTH first body active every age; route 9/0 BUTTERFREE (a later body) falls back"],
  "remaining": [LATER, SHINY, "independent arbitrary-species/history framebuffer comparison"]}]
d["implementedAdapters"] = [e for e in d["implementedAdapters"] if e["id"] not in (315, 318)] + new
d["implementedCount"] = len(d["implementedAdapters"])
p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
print(d["implementedCount"], d["faithfulRandomCount"])
