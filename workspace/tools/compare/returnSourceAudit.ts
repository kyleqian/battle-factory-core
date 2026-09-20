/** Authoritative pointer graph, carrier, and reachability audit for MOVE_RETURN. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const sha = (value: string): string => createHash("sha256").update(value).digest("hex");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const factory = read("reference/pokeemerald/src/battle_factory.c");
const factoryScreen = read("reference/pokeemerald/src/battle_factory_screen.c");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json")) as Json;
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json")) as Json;
const policy = JSON.parse(read("src/data/gen/factory-round-policy.json")) as Json;
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json")) as Json;

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

const expectedReturnBlocks = ["Move_RETURN", "ReturnWeak", "ReturnMedium", "ReturnStrong", "ReturnStrongest", "ReturnContinue", "ReturnStrongestHit"];
const expectedReturnComponents = ["asset:ANIM_TAG_IMPACT", "sprite:gHorizontalLungeSpriteTemplate", "sprite:gVerticalDipSpriteTemplate", "subroutine:ReturnContinue", "subroutine:ReturnMedium", "subroutine:ReturnStrong", "subroutine:ReturnStrongest", "subroutine:ReturnStrongestHit", "subroutine:ReturnWeak", "task:AnimTask_GetReturnPowerLevel", "task:AnimTask_ShakeMon", "task:AnimTask_TraceMonBlended", "task:SoundTask_PlaySE1WithPanning", "task:SoundTask_PlaySE2WithPanning", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:create_basic_hitsplat_sprite", "visualCommand:monbg", "visualCommand:setalpha", "visualCommand:simple_palette_blend"];
const expectedFlatterBlocks = ["Move_FLATTER", "CreateFlatterConfetti"];
const expectedFlatterComponents = ["asset:ANIM_TAG_CONFETTI", "asset:ANIM_TAG_SPOTLIGHT", "sprite:gFlatterConfettiSpriteTemplate", "sprite:gFlatterSpotlightSpriteTemplate", "sprite:gVerticalDipSpriteTemplate", "subroutine:CreateFlatterConfetti", "task:AnimTask_CreateSpotlight", "task:AnimTask_HardwarePaletteFade", "task:AnimTask_RemoveSpotlight", "task:SoundTask_PlaySE1WithPanning", "task:SoundTask_PlaySE2WithPanning"];
const returnGraph = graph.moves.find((entry: Json) => entry.move === "MOVE_RETURN");
const flatterGraph = graph.moves.find((entry: Json) => entry.move === "MOVE_FLATTER");
if (JSON.stringify(returnGraph?.blocks) !== JSON.stringify(expectedReturnBlocks) || JSON.stringify(returnGraph?.componentIds) !== JSON.stringify(expectedReturnComponents)) throw new Error("RETURN graph drifted");
if (JSON.stringify(flatterGraph?.blocks) !== JSON.stringify(expectedFlatterBlocks) || JSON.stringify(flatterGraph?.componentIds) !== JSON.stringify(expectedFlatterComponents)) throw new Error("FLATTER graph drifted");

const ranges = policy.rentalSelection.ranges.level50 as Array<{ start: number; end: number }>;
const legal = (index: number): boolean => ranges.some(({ start, end }) => index >= start && index <= end);
const carriers = mons.entries.filter((entry: Json) => legal(entry.index) && entry.moves.includes("MOVE_RETURN"));
const flatterCarriers = mons.entries.filter((entry: Json) => legal(entry.index) && entry.moves.includes("MOVE_FLATTER"));
const carrierIds = [288, 306, 355, 459, 534, 567, 747, 827];
if (JSON.stringify(carriers.map((entry: Json) => entry.index)) !== JSON.stringify(carrierIds)) throw new Error("RETURN Level-50 carrier census drifted");
if (JSON.stringify(flatterCarriers.map((entry: Json) => entry.index)) !== JSON.stringify([146, 147])) throw new Error("FLATTER Level-50 carrier census drifted");
if (!coverage.entries.some((entry: Json) => entry.move === "MOVE_RETURN" && entry.status === "exact")
  || !coverage.entries.some((entry: Json) => entry.move === "MOVE_FLATTER" && entry.status === "exact")) {
  throw new Error("RETURN / FLATTER independent exact coverage boundary drifted");
}

const returnBody = span(scripts, "Move_RETURN:\n", "Move_COSMIC_POWER:\n");
const flatterBody = span(scripts, "Move_FLATTER:\n", "Move_ROLE_PLAY:\n");
const selector = span(effects, "void AnimTask_GetReturnPowerLevel", "// Makes the mon run out of screen");
const rewrite = factory.slice(factory.indexOf("void SetMonMoveAvoidReturn"));
requireTokens("RETURN", returnBody, ["jumpreteq 0, ReturnWeak", "jumpreteq 1, ReturnMedium", "jumpreteq 2, ReturnStrong", "jumpreteq 3, ReturnStrongest", "AnimTask_TraceMonBlended", "SoundTask_PlaySE1WithPanning", "SoundTask_PlaySE2WithPanning", "simple_palette_blend selector=F_PAL_BG"]);
requireTokens("selector", selector, ["gBattleAnimArgs[ARG_RET_ID] = 0;", "gAnimFriendship < 60", "gAnimFriendship > 60 && gAnimFriendship < 92", "gAnimFriendship > 91 && gAnimFriendship < 201", "gAnimFriendship > 200"]);
requireTokens("Factory rewrite", `${rewrite}\n${factoryScreen}`, ["if (moveArg == MOVE_RETURN)", "move = MOVE_FRUSTRATION", "friendship = 0", "SetMonMoveAvoidReturn"]);

console.log(JSON.stringify({
  schema: "return-source-audit/v1", move: "MOVE_RETURN", moveId: 216, status: "exact", coverageCredit: true,
  source: { root: record("data/battle_anim_scripts.s", scripts, returnBody), selector: record("src/battle_anim_effects_3.c", effects, selector), factoryRewrite: record("src/battle_factory.c", factory, rewrite) },
  graph: { blocks: returnGraph.blocks, componentCount: returnGraph.componentIds.length, components: returnGraph.componentIds },
  level50Carriers: carriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves })),
  reachability: {
    authenticFactory: "unreachable: SetMonMoveAvoidReturn rewrites every catalogued RETURN to FRUSTRATION and Factory construction sets friendship to 0",
    completePartyOverride: { weak: "friendship 0..60 (60 keeps the initialized selector 0)", medium: "61..91", strong: "92..200", strongest: "201..255" },
    retainedEvidence: "all four reachable override branches retained bilaterally: weak 60, medium 61, strong 200, strongest 255",
  },
  sibling: { move: "MOVE_FLATTER", source: record("data/battle_anim_scripts.s", scripts, flatterBody), blocks: flatterGraph.blocks, componentCount: flatterGraph.componentIds.length, components: flatterGraph.componentIds, level50Carriers: flatterCarriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species })), credit: false },
  boundary: { reducer: true, typedSeam: true, compositor: true, productionAsset: false, framebufferAcceptance: true, coveragePromotion: true, trackCredit: true, siblingCredit: false, gameplayOwnership: false },
}, null, 2));
