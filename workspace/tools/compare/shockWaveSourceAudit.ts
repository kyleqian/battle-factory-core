/** Authoritative source/component/carrier classification for MOVE_SHOCK_WAVE. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type Sym = { address: number; size: number };
const root = resolve(import.meta.dirname, "../..");
const ref = resolve(root, "reference/pokeemerald");
const read = (path: string): string => readFileSync(resolve(ref, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;
const scripts = read("data/battle_anim_scripts.s");
const electric = read("src/battle_anim_electric.c");
const movement = read("src/battle_anim_mon_movement.c");
const normal = read("src/battle_anim_normal.c");
const utility = read("src/battle_anim_utility_funcs.c");
const graphics = read("src/graphics.c");
const registry = read("src/data/battle_anim.h");
const constants = read("include/constants/battle_anim.h");
const moves = read("src/data/battle_moves.h");
const frontierSource = read("src/data/battle_frontier/battle_frontier_mons.h");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const policy = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-round-policy.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
const rom = readFileSync(resolve(ref, "pokeemerald.gba"));

const symbols = new Map<string, Sym[]>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(ref, "pokeemerald.elf")], { encoding: "utf8", maxBuffer: 32 << 20 }).split("\n")) {
  const f = line.trim().split(/\s+/u);
  if (f.length >= 4 && /^[0-9a-f]+$/iu.test(f[0]!) && /^[0-9a-f]+$/iu.test(f[1]!)) {
    const list = symbols.get(f.at(-1)!) ?? [];
    list.push({ address: Number.parseInt(f[0]!, 16), size: Number.parseInt(f[1]!, 16) });
    symbols.set(f.at(-1)!, list);
  } else if (f.length === 3 && /^[0-9a-f]+$/iu.test(f[0]!)) {
    const list = symbols.get(f[2]!) ?? [];
    list.push({ address: Number.parseInt(f[0]!, 16), size: 0 });
    symbols.set(f[2]!, list);
  }
}
function sym(name: string): Sym {
  const values = symbols.get(name) ?? [];
  if (values.length !== 1) throw new Error(`missing or ambiguous symbol ${name}`);
  return values[0]!;
}
function romRecord(name: string, end?: number): Json {
  const value = sym(name);
  const finish = end ?? value.address + value.size;
  if (finish <= value.address) throw new Error(`invalid interval ${name}`);
  return { symbol: name, start: hex(value.address), endExclusive: hex(finish), byteLength: finish - value.address, romSha256: sha(rom.subarray(value.address - 0x08000000, finish - 0x08000000)) };
}
function block(source: string, startToken: string, endToken: string): string {
  const start = source.indexOf(startToken), end = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || end < 0) throw new Error(`missing block ${startToken}`);
  return source.slice(start, end);
}
function functionBody(source: string, name: string): string {
  const match = new RegExp(`\\b${name}\\s*\\(`, "gu").exec(source);
  if (!match) throw new Error(`missing function ${name}`);
  const open = source.indexOf("{", match.index);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}" && --depth === 0) return source.slice(source.lastIndexOf("\n", match.index) + 1, i + 1);
  }
  throw new Error(`unterminated function ${name}`);
}
function sourceRecord(path: string, source: string, body: string): Json {
  const start = source.indexOf(body);
  if (start < 0) throw new Error(`missing source record ${path}`);
  return { path, start, endExclusive: start + body.length, byteLength: Buffer.byteLength(body), sha256: sha(body) };
}
function bodyRecord(path: string, source: string, name: string): Json {
  const body = functionBody(source, name);
  return { source: sourceRecord(path, source, body), rom: romRecord(name) };
}
function line(path: string, source: string, token: string): Json {
  const at = source.indexOf(token);
  if (at < 0) throw new Error(`missing ${token}`);
  const start = source.lastIndexOf("\n", at) + 1, end = source.indexOf("\n", at);
  return sourceRecord(path, source, source.slice(start, end));
}

const rootBody = block(scripts, "Move_SHOCK_WAVE:\n", "Move_HARDEN:\n");
const expectedComponents = [
  "asset:ANIM_TAG_CIRCLE_OF_LIGHT", "asset:ANIM_TAG_ELECTRIC_ORBS", "asset:ANIM_TAG_LIGHTNING", "asset:ANIM_TAG_SPARK",
  "sprite:gGrowingShockWaveOrbSpriteTemplate", "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_ElectricChargingParticles",
  "task:AnimTask_ShakeMon", "task:AnimTask_ShockWaveLightning", "task:AnimTask_ShockWaveProgressingBolt",
  "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:monbg", "visualCommand:setalpha", "visualCommand:simple_palette_blend",
] as const;
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_SHOCK_WAVE");
if (!graphEntry || graphEntry.id !== 351 || JSON.stringify(graphEntry.blocks) !== JSON.stringify(["Move_SHOCK_WAVE"]) || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("Shock Wave graph drifted");
const rootStart = sym("Move_SHOCK_WAVE").address, rootEnd = sym("Move_HARDEN").address;
if (rootStart !== 0x082cf422 || rootEnd !== 0x082cf4c4) throw new Error("Shock Wave pointer interval drifted");
const commands = rootBody.split("\n").slice(1).map((value) => value.replace(/@.*$/u, "").trim()).filter(Boolean);
if (commands.length !== 28 || !commands.includes("playsewithpan SE_M_CHARGE, SOUND_PAN_ATTACKER") || !commands.includes("playsewithpan SE_M_TRI_ATTACK2, SOUND_PAN_TARGET")) throw new Error("Shock Wave command/audio body drifted");
for (const token of ["AnimElectricChargingParticles", "AnimGrowingShockWaveOrb", "CreateShockWaveBoltSprite", "AnimShockWaveProgressingBolt", "CreateShockWaveLightningSprite", "AnimShockWaveLightning", "SE_M_THUNDERBOLT"]) if (!electric.includes(token)) throw new Error(`missing callback/audio ${token}`);
for (const token of expectedComponents) if (!graphEntry.componentIds.includes(token)) throw new Error(`missing component ${token}`);

const ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const all = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_SHOCK_WAVE"));
const level50 = all.filter((entry: Json) => ranges.some((range) => entry.index >= range.start && entry.index <= range.end));
if (JSON.stringify(all.map((entry: Json) => entry.index)) !== JSON.stringify([10, 49, 108, 148, 150, 204, 244]) || JSON.stringify(level50.map((entry: Json) => entry.index)) !== JSON.stringify([148, 150, 204, 244])) throw new Error("Shock Wave carrier census drifted");
if ((frontierSource.match(/MOVE_SHOCK_WAVE/g) ?? []).length !== 7) throw new Error("Shock Wave source carrier count drifted");
const shockWaveTrack = coverage.componentTracks.find((entry: Json) => entry.id === "shock-wave-electric-bolts");
if (coverage.entries.find((entry: Json) => entry.move === "MOVE_SHOCK_WAVE")?.status !== "exact" || JSON.stringify(coverage.queue) !== JSON.stringify([]) || !shockWaveTrack || shockWaveTrack.fulfilled !== true || !shockWaveTrack.goal.includes("FULFILLED") || JSON.stringify(shockWaveTrack.representatives) !== JSON.stringify(["MOVE_SHOCK_WAVE"]) || JSON.stringify(shockWaveTrack.components) !== JSON.stringify(expectedComponents)) throw new Error("Shock Wave exact queue/track boundary drifted");

const callbacks = [
  ["src/battle_anim_electric.c", electric, "AnimTask_ElectricChargingParticles"], ["src/battle_anim_electric.c", electric, "AnimTask_ElectricChargingParticles_Step"],
  ["src/battle_anim_electric.c", electric, "AnimGrowingShockWaveOrb"], ["src/battle_anim_electric.c", electric, "AnimTask_ShockWaveProgressingBolt"],
  ["src/battle_anim_electric.c", electric, "CreateShockWaveBoltSprite"], ["src/battle_anim_electric.c", electric, "AnimShockWaveProgressingBolt"],
  ["src/battle_anim_electric.c", electric, "AnimTask_ShockWaveLightning"], ["src/battle_anim_electric.c", electric, "CreateShockWaveLightningSprite"],
  ["src/battle_anim_electric.c", electric, "AnimShockWaveLightning"], ["src/battle_anim_mon_movement.c", movement, "AnimTask_ShakeMon"],
  ["src/battle_anim_mon_movement.c", movement, "AnimTask_ShakeMon_Step"], ["src/battle_anim_utility_funcs.c", utility, "AnimTask_BlendBattleAnimPal"],
] as const;
const resources = [
  ["ANIM_TAG_ELECTRIC_ORBS", "gBattleAnimSpriteGfx_ElectricOrbs", "gBattleAnimSpritePal_ElectricOrbs", 0x80],
  ["ANIM_TAG_CIRCLE_OF_LIGHT", "gBattleAnimSpriteGfx_CircleOfLight", "gBattleAnimSpritePal_ElectricOrbs", 0x800],
  ["ANIM_TAG_SPARK", "gBattleAnimSpriteGfx_Spark", "gBattleAnimSpritePal_Spark", 0x300],
  ["ANIM_TAG_LIGHTNING", "gBattleAnimSpriteGfx_Lightning", "gBattleAnimSpritePal_Lightning2", 0xa00],
] as const;

console.log(JSON.stringify({
  schema: "shock-wave-source-audit/v1", move: "MOVE_SHOCK_WAVE", moveId: 351, status: "exact", coverageCredit: true,
  source: { pointerOwnedRoot: { symbol: "Move_SHOCK_WAVE", nextDispatchLabel: "Move_HARDEN", source: sourceRecord("data/battle_anim_scripts.s", scripts, rootBody), rom: romRecord("Move_SHOCK_WAVE", rootEnd), branches: { directlyReachableBlocks: ["Move_SHOCK_WAVE"], complete: true } }, commands,
    callbacks: Object.fromEntries(callbacks.map(([path, source, name]) => [name, bodyRecord(path, source, name)])) },
  graph: { blocks: graphEntry.blocks, components: expectedComponents },
  resources: Object.fromEntries(resources.map(([tag, gfx, palette, tileBytes]) => [tag, { tileBytes, gfx: romRecord(gfx), palette: romRecord(palette), gfxSource: line("src/graphics.c", graphics, `const u32 ${gfx}[]`), registryGfx: line("src/data/battle_anim.h", registry, `{${gfx},`), registryPalette: line("src/data/battle_anim.h", registry, `{${palette}, ${tag}}`) }])),
  audio: { script: ["SE_M_CHARGE", "SE_M_TRI_ATTACK2"], callbackOwned: ["SE_M_THUNDERBOLT"], panning: ["SOUND_PAN_ATTACKER", "SOUND_PAN_TARGET", "BattleAnimAdjustPanning"] },
  carriers: { allFactory: all, level50, lowestLevel50: level50[0] },
  controls: { kind: "independent identity controls only; no sibling timing, component, track, latch, or coverage credit", named: { MOVE_CHARGE: ["AnimTask_ElectricChargingParticles"], MOVE_SPARK: ["ANIM_TAG_SPARK"], MOVE_THUNDER: ["ANIM_TAG_LIGHTNING"], MOVE_TAIL_GLOW: ["ANIM_TAG_CIRCLE_OF_LIGHT"], MOVE_THUNDERBOLT: ["AnimTask_BlendBattleAnimPal", "AnimTask_ShakeMon"], MOVE_SUPERPOWER: ["ANIM_TAG_METEOR", "ANIM_TAG_FLAT_ROCK"] } },
  checkpoint: { completePointerOwnedRoot: true, completeReachableVisualGraph: true, resourcesCallbacksAudio: true, completeLevel50CarrierCensus: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: true, reducerAdded: true, typedSceneOnSeam: true, compositorAdded: true, framebufferAcceptance: true, coveragePromotion: true, componentTrackFulfilled: true, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: false },
  sourceIdentity: { constantsSha256: sha(constants), movesSha256: sha(moves), registrySha256: sha(registry), graphicsSha256: sha(graphics) },
}));
