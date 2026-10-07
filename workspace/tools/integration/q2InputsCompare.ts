// Deep-compare the production Q2 input builders against the accepted corpus-built inputs (anchors taken from the corpus; first-body /
// later-body register rule applied by the corpus value).  usage: node --experimental-strip-types tools/integration/q2InputsCompare.ts snore
import { snoreInputsFor } from "../compare/verifySnoreReducer.ts";
import { liveHyperVoiceInputs, liveSnoreInputs } from "../../src/engine/liveQ2Moves.ts";
import snoreAsset from "../../src/animation/assets/snore.json" with { type: "json" };
import { hyperVoiceInputsFor } from "../compare/verifyHyperVoiceReducer.ts";
import paletteData from "../../src/data/gen/live-animation-palette-resources.json" with { type: "json" };
import { composeLivePalettes } from "../../src/engine/liveMovePaletteComposite.ts";

const diff = (a: any, b: any, path = ""): string[] => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].flatMap((k) => diff(a[k], b[k], `${path}/${k}`));
  }
  return [`${path}: built=${JSON.stringify(a)?.slice(0, 80)} corpus=${JSON.stringify(b)?.slice(0, 80)}`];
};
const move = process.argv[2];
if (move === "snore") {
  for (const o of ["player-back", "opponent-front"] as const) {
    const c: any = snoreInputsFor(o);
    const anchors = (sprite: any, origin: any, side: string) => ({ picOffsetPoint: origin, spriteCenter: { x: sprite.x, y: sprite.y }, frontIdleRest: { x2: sprite.x2, y2: sprite.y2 }, side });
    const attacker = anchors(c.attackerSprite, c.attackerPictureOrigin, c.attackerSide), target = anchors(c.targetSprite, c.targetPictureOrigin, c.targetSide);
    const palettes = { unfaded: c.palettes.unfaded, faded: c.palettes.faded, hardware: c.palettes.hardware };
    const built = liveSnoreInputs({ attackerSide: c.attackerSide, attacker, target, palettes, spriteOrder: c.allocator.spriteOrder, firstBody: false, snoreZPalette: (snoreAsset as any).snoreZ.palette });
    const d = diff(built, c).filter((l) => !/gameplay|animationRngSeed|\/data|animNum|animCmdIndex|animDelayCounter|activeOrderKeys\/2\/oamY|activeOrderKeys\/\d+\/oamY/.test(l));
    console.log(o, d.length ? d.join("\n") : "EQUAL");
    // composite vs corpus palette (banks the reducer reads)
    const comp = composeLivePalettes("SEALEO" === c.attackerSpecies && o === "player-back" ? "SEALEO" : "VENOMOTH", o === "player-back" ? "VENOMOTH" : "SEALEO");
    if (comp) for (const bank of [2, 3, 4, 16, 17]) console.log(" bank", bank, JSON.stringify(comp.unfaded.slice(bank * 16, bank * 16 + 16)) === JSON.stringify(c.palettes.unfaded.slice(bank * 16, bank * 16 + 16)));
  }
}

if (move === "hyper-voice") {
  for (const o of ["player-back", "opponent-front"] as const) {
    const c: any = hyperVoiceInputsFor(o);
    const anchors = (sprite: any, origin: any) => ({ picOffsetPoint: origin, spriteCenter: { x: sprite.x, y: sprite.y }, frontIdleRest: { x2: sprite.x2, y2: sprite.y2 } });
    const built = liveHyperVoiceInputs({ attackerSide: c.attackerSide, attacker: anchors(c.attackerSprite, c.attackerPictureOrigin), target: anchors(c.targetSprite, c.targetPictureOrigin),
      palettes: { unfaded: c.palettes.unfaded, faded: c.palettes.faded, hardware: c.palettes.hardware }, spriteOrder: c.spriteOrder, attackerSpeciesId: 372,
      thinRingPalette: (paletteData.resources as any).ANIM_TAG_THIN_RING.colors });
    const d = diff(built, c).filter((l) => !/gameplay|animationRngSeed|^\/(attacker|target)(Side|Species|PictureOrigin)/.test(l));
    console.log(o, d.length ? d.join("\n") : "EQUAL");
  }
}
