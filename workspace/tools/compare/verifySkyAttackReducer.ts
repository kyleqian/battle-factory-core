/** Hermetic retained-row verifier for MOVE_SKY_ATTACK's reducer and seam. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import {
  SKY_ATTACK_BIRD_TAG, SKY_ATTACK_IMPACT_TAG, SKY_ATTACK_SETUP_FIRST_INACTIVE_AGE,
  SKY_ATTACK_UNLEASH_FIRST_INACTIVE_AGE, skyAttackAtAge, type SkyAttackBody, type SkyAttackLiveInputs,
} from "../../src/animation/skyAttack.ts";
import { sceneOnSkyAttackView, type SceneOnSkyAttackPresentationState } from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type SkyAttackOrientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const sha = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`MOVE_SKY_ATTACK reducer drift: ${message}`); }
function corpusFor(orientation: SkyAttackOrientation) {
  const side = orientation === "player-back" ? "player" : "opponent";
  const frames = (JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/sky-attack-${side}-dense-state.json.gz`))).toString("utf8")) as Json).frames as Json[];
  invariant(frames.length === 330, `${orientation}: expected setup+unleash retained corpus`);
  return { setup: frames.slice(0, 149), unleash: frames.slice(149) };
}
function battler(entry: Json): SkyAttackLiveInputs["attackerSprite"] { return { slot: entry.slot, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, attr: entry.attr, subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3, matrixNum: entry.matrixNum, matrix: entry.matrix, flags: entry.flags, animNum: entry.animNum, animCmdIndex: entry.animCmdIndex, animDelayCounter: entry.animDelayCounter, data: entry.data }; }
function task(row: Json, name: string): Json { const found = row.tasks.find((entry: Json) => entry.func?.symbol === name); invariant(found, `missing ${name}`); return found; }
function resource(row: Json, tag: number): SkyAttackLiveInputs["resources"]["impact"] {
  const tileSlot = row.tileTags.indexOf(tag), paletteAllocatorSlot = row.paletteTags.indexOf(tag); invariant(tileSlot >= 0 && paletteAllocatorSlot >= 0, `missing tag ${tag}`);
  return { tag, tileSlot, paletteAllocatorSlot, paletteBank: paletteAllocatorSlot, tileRange: row.resourceAllocators.tileRanges[tileSlot], palette: row.unfadedPalette.slice(paletteAllocatorSlot * 16, paletteAllocatorSlot * 16 + 16) };
}
export function skyAttackInputsFor(orientation: SkyAttackOrientation, corpus = corpusFor(orientation)): SkyAttackLiveInputs {
  const first = corpus.setup[0]!, setupBirth = corpus.setup[1]!, unleashBirth = corpus.unleash[45]!, birdRow = corpus.unleash[70]!;
  const attackerSide = orientation === "player-back" ? "player" : "opponent", targetSide = attackerSide === "player" ? "opponent" : "player";
  const setupBg = attackerSide === "player" ? 1 as const : 2 as const, unleashBg = setupBg === 1 ? 2 as const : 1 as const;
  const bird = birdRow.sprites[birdRow.sprites.length - 1]!;
  return { attackerSide, targetSide, attackerSpecies: "FEAROW", targetSpecies: "SHUCKLE", attackerPictureOrigin: { x: first.battlerSprites.attacker.x, y: first.battlerSprites.attacker.y }, targetPictureOrigin: { x: first.battlerSprites.target.x, y: first.battlerSprites.target.y }, attackerSprite: battler(first.battlerSprites.attacker), targetSprite: battler(first.battlerSprites.target),
    taskSlots: { monbg: task(setupBirth, "Task_UpdateMonBg").slot, blendSetup: task(corpus.setup[4]!, "AnimTask_BlendSpriteColor_Step2").slot, shake: task(corpus.setup[43]!, "AnimTask_ShakeBattlers").slot, sound: task(corpus.setup[43]!, "Task_LoopAndPlaySE").slot, fade: task(corpus.unleash[54]!, "AnimTask_AttackerFadeToInvisible_Step").slot, blendUnleash: task(corpus.unleash[48]!, "AnimTask_BlendSpriteColor_Step2").slot, birdShake: task(corpus.unleash[86]!, "AnimTask_ShakeMon2_Step").slot, slidingBg: task(corpus.unleash[26]!, "AnimTask_UpdateSlidingBg").slot, clearMonbg: task(corpus.unleash[140]!, "Task_ClearMonBg").slot, fadeBg: task(corpus.unleash[7]!, "Task_FadeToBg").slot },
    bird: { slot: bird.slot, matrixNum: bird.matrixNum, attr: bird.attr, subpriority: bird.subpriority, oamPriority: (bird.attr[2] >>> 10) & 3, flags: bird.flags }, resources: { impact: resource(unleashBirth, SKY_ATTACK_IMPACT_TAG), bird: resource(unleashBirth, SKY_ATTACK_BIRD_TAG) }, allocator: { matrixBitmap: first.resourceAllocators.matrixBitmap, spriteOrder: first.spriteOrder, activeOrderKeys: first.sprites.map((entry: Json) => ({ slot: entry.slot, subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3, oamY: entry.attr[0] & 0xff })) }, palettes: { unfaded: first.unfadedPalette, faded: first.fadedPalette, hardware: first.hardwarePalette }, background: { values: first.battleBg, registers: first.registers, monbg: { bg: setupBg, unleashBg, activeCnt: corpus.setup[2]!.registers[`bg${setupBg}cnt`], paletteBank: attackerSide === "player" ? 9 : 8 }, vram: {} }, animationRngSeed: first.animationRng, gameplayRng: first.rawBattleState.gameplayRng, gameplayState: first.immutableState };
}
export function skyAttackConfigFor(body: SkyAttackBody, input: SkyAttackLiveInputs): SceneOnSkyAttackPresentationState["config"] {
  const geometry = (side: "player" | "opponent", point: Readonly<{ x: number; y: number }>, species: string) => ({ species: species as never, geometry: { side, spriteCorner: { x: point.x - 32, y: point.y - 32 }, animationCenter: point, battlePositionCenter: side === "player" ? { x: 64, y: 92 } : { x: 176, y: 40 } } });
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, attackerPictureOrigin, targetPictureOrigin, ...animationInputs } = input;
  return { move: "SKY_ATTACK", body, attacker: geometry(attackerSide, attackerPictureOrigin, attackerSpecies), target: geometry(targetSide, targetPictureOrigin, targetSpecies), fieldProfile: { playerHp: 1, playerMaxHp: 1, opponentHp: 1, opponentMaxHp: 1 }, animationInputs };
}
function compare(body: SkyAttackBody, age: number, row: Json, input: SkyAttackLiveInputs): void {
  const state = skyAttackAtAge(body, age, input);
  invariant(state.active === row.animScriptActive && state.source.pointer === row.scriptPtr && state.source.pointerOffset === row.scriptOffset && state.source.wait === row.scriptWait, `${body}/${age}: source cursor`);
  invariant(same(state.animArgs, row.animArgs), `${body}/${age}: source args`);
  invariant(state.battlers.attacker.sprite.x2 === row.battlerSprites.attacker.x2 && state.battlers.target.sprite.x2 === row.battlerSprites.target.x2, `${body}/${age}: battler axes`);
  invariant(state.resources.impact.loaded === (row.tileTags.includes(SKY_ATTACK_IMPACT_TAG) && row.paletteTags.includes(SKY_ATTACK_IMPACT_TAG)), `${body}/${age}: impact tag`);
  invariant(state.resources.bird.loaded === (row.tileTags.includes(SKY_ATTACK_BIRD_TAG) && row.paletteTags.includes(SKY_ATTACK_BIRD_TAG)), `${body}/${age}: bird tag`);
  invariant(state.cleanup.firstInactive === (age === (body === "setup" ? SKY_ATTACK_SETUP_FIRST_INACTIVE_AGE : SKY_ATTACK_UNLEASH_FIRST_INACTIVE_AGE)), `${body}/${age}: cleanup`);
  invariant(same(state.rng.gameplay, row.rawBattleState.gameplayRng) && same(state.rng.gameplayState, row.immutableState) && state.rng.gameplayUnchanged, `${body}/${age}: opaque gameplay`);
}
function replay(orientation: SkyAttackOrientation) {
  const corpus = corpusFor(orientation), input = skyAttackInputsFor(orientation, corpus), digestRows: Record<string, unknown[]> = {};
  for (const [body, rows] of [["setup", corpus.setup], ["unleash", corpus.unleash]] as const) {
    const bodyInput = { ...input, gameplayRng: rows[0]!.rawBattleState.gameplayRng, gameplayState: rows[0]!.immutableState };
    const config = skyAttackConfigFor(body, bodyInput), reducer = rows.map((_, age) => skyAttackAtAge(body, age, bodyInput)), seam = rows.map((_, age) => sceneOnSkyAttackView({ age, config } as SceneOnSkyAttackPresentationState));
    for (let pass = 0; pass < 2; pass += 1) for (const [age, row] of rows.entries()) { compare(body, age, row!, bodyInput); const view = seam[age]!, { attacker, target, ...viewBody } = view; invariant(same(viewBody, reducer[age]) && attacker.species === config.attacker.species && target.species === config.target.species, `${body}/${age}: typed seam`); }
    digestRows[`${body}:reducer`] = reducer; digestRows[`${body}:seam`] = seam;
  }
  return { retainedRows: 330, reducerRows: 660, seamRows: 660, reducerSha256: sha(digestRows), seamSha256: sha({ orientation, digestRows }), framebufferCompared: false, coverageCredit: false } as const;
}
export function verifySkyAttackReducer() { const player = replay("player-back"), opponent = replay("opponent-front"); return { "player-back": player, "opponent-front": opponent, bilateral: { retainedRows: 660, passes: 2, reducerRows: 1320, seamRows: 1320, framebufferCompared: false, coverageCredit: false } } as const; }
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifySkyAttackReducer(), null, 2));
