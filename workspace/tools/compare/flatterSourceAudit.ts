/** Authoritative source/component/carrier and legal staging audit for MOVE_FLATTER. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const sha = (value: string): string => createHash("sha256").update(value).digest("hex");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const utility = read("reference/pokeemerald/src/battle_anim_utility_funcs.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json")) as Json;
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json")) as Json;
const policy = JSON.parse(read("src/data/gen/factory-round-policy.json")) as Json;
const playerStage = JSON.parse(read("tools/battle-lab/mechanic-flatter-player-nidorina-opponent-onix.json")) as Json;
const opponentStage = JSON.parse(read("tools/battle-lab/mechanic-flatter-opponent-nidorina-player-onix.json")) as Json;

function span(source: string, start: string, end: string): string {
  const left = source.indexOf(start), right = source.indexOf(end, left + start.length);
  if (left < 0 || right < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(left, right);
}
function record(path: string, source: string, body: string): Json {
  const start = source.indexOf(body);
  return { path, start, endExclusive: start + body.length, bytes: Buffer.byteLength(body), sha256: sha(body) };
}
function requireTokens(name: string, body: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!body.includes(token)) throw new Error(`${name} drifted: ${token}`);
}

const expectedBlocks = ["Move_FLATTER", "CreateFlatterConfetti"];
const expectedComponents = ["asset:ANIM_TAG_CONFETTI", "asset:ANIM_TAG_SPOTLIGHT", "sprite:gFlatterConfettiSpriteTemplate", "sprite:gFlatterSpotlightSpriteTemplate", "sprite:gVerticalDipSpriteTemplate", "subroutine:CreateFlatterConfetti", "task:AnimTask_CreateSpotlight", "task:AnimTask_HardwarePaletteFade", "task:AnimTask_RemoveSpotlight", "task:SoundTask_PlaySE1WithPanning", "task:SoundTask_PlaySE2WithPanning"];
const moveGraph = graph.moves.find((entry: Json) => entry.move === "MOVE_FLATTER");
if (JSON.stringify(moveGraph?.blocks) !== JSON.stringify(expectedBlocks) || JSON.stringify(moveGraph?.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("FLATTER graph drifted");

const ranges = policy.rentalSelection.ranges.level50 as Array<{ start: number; end: number }>;
const legal = (index: number): boolean => ranges.some(({ start, end }) => index >= start && index <= end);
const carriers = mons.entries.filter((entry: Json) => legal(entry.index) && entry.moves.includes("MOVE_FLATTER"));
if (JSON.stringify(carriers.map((entry: Json) => entry.index)) !== JSON.stringify([146, 147])) throw new Error("FLATTER Level-50 carrier census drifted");
for (const [name, stage] of [["player-back", playerStage], ["opponent-front", opponentStage]] as const) {
  if (stage.mode !== "mechanicLab" || stage.profile !== "battle-scene-on") throw new Error(`${name} profile drifted`);
  for (const side of ["player", "opponent"] as const) {
    if (stage.overrides.parties[side].length !== 3) throw new Error(`${name} ${side} party incomplete`);
    for (const mon of stage.overrides.parties[side]) {
      const complete = mon.level === 50 && Object.keys(mon.ivs).length === 6 && Object.keys(mon.evs).length === 6
        && mon.moves.length === 4 && mon.ppUps.length === 4 && Number.isInteger(mon.item)
        && Number.isInteger(mon.abilitySlot) && Number.isInteger(mon.friendship)
        && typeof mon.gender === "string" && typeof mon.shiny === "boolean";
      if (!complete) throw new Error(`${name} ${side} record incomplete`);
    }
  }
}
if (playerStage.overrides.parties.player[0].species !== 30 || !playerStage.overrides.parties.player[0].moves.every((move: number) => move === 260)
  || opponentStage.overrides.parties.opponent[0].species !== 30 || !opponentStage.overrides.parties.opponent[0].moves.every((move: number) => move === 260)) throw new Error("FLATTER bilateral actor drifted");

const moveBody = span(scripts, "Move_FLATTER:\n", "Move_ROLE_PLAY:\n");
const confetti = span(effects, "static void AnimFlatterConfetti(struct Sprite *sprite)\n", "static void AnimFlatterSpotlight(struct Sprite *sprite)\n");
const spotlight = span(effects, "static void AnimFlatterSpotlight(struct Sprite *sprite)\n", "// Spins an orb around the attacking mon");
const spotlightTasks = span(effects, "void AnimTask_CreateSpotlight(u8 taskId)\n", "void AnimTask_SquishAndSweatDroplets(u8 taskId)\n");
const paletteFade = span(utility, "void AnimTask_HardwarePaletteFade(u8 taskId)\n", "// Used to leave blended traces of a mon");
const verticalDip = span(movement, "const struct SpriteTemplate gVerticalDipSpriteTemplate", "const struct SpriteTemplate gSlideMonToOriginalPosSpriteTemplate");
requireTokens("FLATTER script", moveBody, ["ANIM_TAG_SPOTLIGHT", "ANIM_TAG_CONFETTI", "AnimTask_CreateSpotlight", "AnimTask_HardwarePaletteFade", "gFlatterSpotlightSpriteTemplate", "gVerticalDipSpriteTemplate", "SoundTask_PlaySE1WithPanning", "CreateFlatterConfetti", "AnimTask_RemoveSpotlight"]);
requireTokens("confetti", confetti, ["Random2() % 12", "Random2() & 0x1FF", "Random2() & 0xFF", "sprite->data[3] == 31"]);
requireTokens("spotlight", spotlight, ["ST_OAM_OBJ_WINDOW", "affineAnimEnded", "ChangeSpriteAffineAnim(sprite, 1)", "DestroyAnimSprite(sprite)"]);
requireTokens("spotlight tasks", spotlightTasks, ["REG_OFFSET_WININ", "REG_OFFSET_WINOUT", "REG_OFFSET_DISPCNT", "DISPCNT_OBJWIN_ON"]);
requireTokens("palette fade", paletteFade, ["BeginHardwarePaletteFade", "gPaletteFade.active", "DestroyAnimVisualTask(taskId)"]);

console.log(JSON.stringify({
  schema: "flatter-source-staging-audit/v1", move: "MOVE_FLATTER", moveId: 260,
  status: "unsupported-staging", coverageCredit: false,
  source: {
    script: record("data/battle_anim_scripts.s", scripts, moveBody),
    confetti: record("src/battle_anim_effects_3.c", effects, confetti),
    spotlight: record("src/battle_anim_effects_3.c", effects, spotlight),
    spotlightTasks: record("src/battle_anim_effects_3.c", effects, spotlightTasks),
    hardwarePaletteFade: record("src/battle_anim_utility_funcs.c", utility, paletteFade),
    verticalDip: record("src/battle_anim_mon_movement.c", movement, verticalDip),
  },
  graph: { blocks: moveGraph.blocks, componentCount: moveGraph.componentIds.length, components: moveGraph.componentIds },
  level50Carriers: carriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves })),
  staging: {
    oracleProfile: "battle-scene-on", mode: "mechanicLab", completeLegalParties: true,
    orientations: {
      "player-back": { scenario: "tools/battle-lab/mechanic-flatter-player-nidorina-opponent-onix.json", sha256: sha(read("tools/battle-lab/mechanic-flatter-player-nidorina-opponent-onix.json")) },
      "opponent-front": { scenario: "tools/battle-lab/mechanic-flatter-opponent-nidorina-player-onix.json", sha256: sha(read("tools/battle-lab/mechanic-flatter-opponent-nidorina-player-onix.json")) },
    },
    carrier: { setId: 146, species: "SPECIES_NIDORINA" }, target: { setId: 307, species: "SPECIES_ONIX" },
  },
  boundary: { productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false, gameplayOwnership: false },
}, null, 2));
