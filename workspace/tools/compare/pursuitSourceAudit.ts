/** Authoritative source/component/resource/audio/callback classification for MOVE_PURSUIT. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const ref = resolve(root, "reference/pokeemerald");
const read = (path: string): string => readFileSync(resolve(ref, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const scripts = read("data/battle_anim_scripts.s");
const movement = read("src/battle_anim_mon_movement.c");
const normal = read("src/battle_anim_normal.c");
const runtime = read("src/battle_anim.c");
const registry = read("src/data/battle_anim.h");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const inventory = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-animation-inventory.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(ref, "pokeemerald.elf")], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const rom = readFileSync(resolve(ref, "pokeemerald.gba"));
const symbols = new Map<string, { address: number; size: number }>();
for (const line of nm.split("\n")) { const f = line.trim().split(/\s+/u); if (f.length >= 4 && /^[0-9a-f]+$/iu.test(f[0]!) && /^[0-9a-f]+$/iu.test(f[1]!)) symbols.set(f.at(-1)!, { address: Number.parseInt(f[0]!, 16), size: Number.parseInt(f[1]!, 16) }); else if (f.length === 3 && /^[0-9a-f]+$/iu.test(f[0]!)) symbols.set(f[2]!, { address: Number.parseInt(f[0]!, 16), size: 0 }); }
function sym(name: string) { const value = symbols.get(name); if (!value) throw new Error(`missing symbol ${name}`); return value; }
function range(name: string, end?: string) { const start = sym(name).address, finish = end ? sym(end).address : start + sym(name).size; const bytes = rom.subarray(start - 0x08000000, finish - 0x08000000); return { start: `0x${start.toString(16).padStart(8, "0")}`, endExclusive: `0x${finish.toString(16).padStart(8, "0")}`, byteLength: bytes.length, romSha256: sha(bytes) }; }
function fixedRange(name: string, byteLength: number) { const start = sym(name).address, bytes = rom.subarray(start - 0x08000000, start - 0x08000000 + byteLength); return { start: `0x${start.toString(16).padStart(8, "0")}`, endExclusive: `0x${(start + byteLength).toString(16).padStart(8, "0")}`, byteLength, romSha256: sha(bytes) }; }
function block(source: string, start: string, end: string) { const from = source.indexOf(start), to = source.indexOf(end, from + start.length); if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`); return source.slice(from, to); }
function fn(source: string, name: string) { const matcher = new RegExp(`\\b${name}\\s*\\(`, "gu"); for (let match = matcher.exec(source); match; match = matcher.exec(source)) { const open = source.indexOf("{", match.index), semi = source.indexOf(";", match.index); if (open < 0 || (semi >= 0 && semi < open)) continue; let depth = 0; for (let i = open; i < source.length; i++) { if (source[i] === "{") depth++; else if (source[i] === "}" && --depth === 0) return source.slice(source.lastIndexOf("\n", match.index) + 1, i + 1); } } throw new Error(`missing body ${name}`); }
function object(source: string, name: string) { const at = source.indexOf(name), open = source.indexOf("{", at), end = source.indexOf("};", open) + 2; if (at < 0 || open < 0 || end < 2) throw new Error(`missing object ${name}`); return source.slice(source.lastIndexOf("\n", at) + 1, end); }
const identity = (path: string, body: string) => ({ path, byteLength: Buffer.byteLength(body), sha256: sha(body) });
const requireTokens = (label: string, source: string, tokens: readonly string[]) => { for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drift: ${token}`); };

const rootBody = block(scripts, "Move_PURSUIT:\n", "Move_SPIKE_CANNON:\n");
const shakeInit = fn(movement, "AnimTask_ShakeTargetBasedOnMovePowerOrDmg");
const shakeStep = fn(movement, "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step");
const hitTemplate = object(normal, "gBasicHitSplatSpriteTemplate");
const hitCallback = fn(normal, "AnimHitSplatBasic");
const fadeTask = fn(runtime, "Task_FadeToBg");
const choose = fn(runtime, "Cmd_choosetwoturnanim");
requireTokens("root", rootBody, ["loadspritegfx ANIM_TAG_IMPACT", "monbg ANIM_TARGET", "fadetobg BG_DARK", "setalpha 12, 8", "choosetwoturnanim PursuitNormal, PursuitOnSwitchout", "animation=2", "animation=1", "AnimTask_ShakeTargetBasedOnMovePowerOrDmg, 5, FALSE, 1, 6, 1, 0", "clearmonbg ANIM_TARGET", "blendoff", "restorebg"]);
requireTokens("shake", shakeInit + shakeStep, ["gAnimMovePower", "gAnimMoveDmg", "GetAnimBattlerSpriteId(ANIM_TARGET)", "DestroyAnimVisualTask"]);
requireTokens("hitsplat", hitTemplate + hitCallback, ["ANIM_TAG_IMPACT", "AnimHitSplatBasic", "StartSpriteAffineAnim", "DestroyAnimSprite"]);
requireTokens("dark background", registry, ["[BG_DARK]", "gBattleAnimBgImage_Dark", "gBattleAnimBgPalette_Dark", "gBattleAnimBgTilemap_Dark"]);
requireTokens("route", choose, ["gAnimMoveTurn", "T2_READ_PTR"]);

const expectedComponents = ["asset:ANIM_TAG_IMPACT", "subroutine:PursuitContinue", "subroutine:PursuitNormal", "subroutine:PursuitOnSwitchout", "task:AnimTask_ShakeTargetBasedOnMovePowerOrDmg", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:create_basic_hitsplat_sprite", "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg", "visualCommand:setalpha", "visualCommand:waitbgfadein"];
const generated = graph.moves.find((entry: Json) => entry.move === "MOVE_PURSUIT");
if (JSON.stringify(generated?.blocks) !== JSON.stringify(["Move_PURSUIT", "PursuitNormal", "PursuitOnSwitchout", "PursuitContinue"]) || JSON.stringify(generated?.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("generated Pursuit graph drift");
const move = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_PURSUIT");
const carriers = frontier.entries.filter((entry: Json) => entry.index >= 110 && entry.index <= 849 && entry.moves.includes("MOVE_PURSUIT"));
if (!move || move.frontierMonCount !== 6 || move.speciesCount !== 6 || carriers.length !== 6) throw new Error("six-carrier census drift");
const status = coverage.entries.find((entry: Json) => entry.move === "MOVE_PURSUIT")?.status ?? "unsupported";
if (status !== "unsupported") throw new Error("evidence-only checkpoint must remain unsupported");

console.log(JSON.stringify({
  schema: "pursuit-source-audit/v1", move: "MOVE_PURSUIT", moveId: 228, status, coverageCredit: false,
  source: {
    root: { source: identity("data/battle_anim_scripts.s", rootBody), rom: range("Move_PURSUIT", "Move_SPIKE_CANNON") },
    branches: { normal: { hitsplatAffineAnimation: 2 }, switchout: { hitsplatAffineAnimation: 1 }, selector: { source: identity("src/battle_anim.c", choose), rom: range("Cmd_choosetwoturnanim") } },
    callbacks: { hitTemplate: { source: identity("src/battle_anim_normal.c", hitTemplate), rom: range("gBasicHitSplatSpriteTemplate") }, hit: { source: identity("src/battle_anim_normal.c", hitCallback), rom: range("AnimHitSplatBasic") }, shakeInit: { source: identity("src/battle_anim_mon_movement.c", shakeInit), rom: range("AnimTask_ShakeTargetBasedOnMovePowerOrDmg") }, shakeStep: { source: identity("src/battle_anim_mon_movement.c", shakeStep), rom: range("AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step") }, fade: { source: identity("src/battle_anim.c", fadeTask), rom: range("Task_FadeToBg") } },
    resources: { impactTemplate: range("gBasicHitSplatSpriteTemplate"), darkImage: range("gBattleAnimBgImage_Dark"), darkPalette: range("gBattleAnimBgPalette_Dark"), darkTilemap: range("gBattleAnimBgTilemap_Dark") },
    audio: { symbol: "se_m_comet_punch", rom: fixedRange("se_m_comet_punch", 12) },
  },
  graph: { blocks: generated.blocks, componentCount: generated.componentIds.length, components: generated.componentIds, novelComponents: [] },
  carriers: carriers.map((entry: Json) => ({ setId: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, evSpreadStats: entry.evSpreadStats, nature: entry.nature })),
  variants: { normal: { evidenceRequired: true, legalBilateralStage: true }, switchout: { evidenceRequired: true, legalCompletePartyStage: true, orientation: "opponent-front", trigger: "player selects a legal bench switch while the opponent is constrained to Pursuit" } },
  checkpoint: { sourceAudit: true, graphPinned: true, sixLevel50CarriersPinned: true, legalBilateralParties: true, allSourceBranchesStaged: true, denseEvidenceRequired: true, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, productionChanged: false, framebufferAcceptance: false, coveragePromotion: false, siblingPromotion: false, componentTrackFulfilled: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false },
}, null, 2));
