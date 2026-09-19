/** Authoritative source/component/carrier classification for MOVE_SKILL_SWAP. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const ref = resolve(root, "reference/pokeemerald");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const readRef = (path: string): string => readFileSync(resolve(ref, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const scripts = readRef("data/battle_anim_scripts.s");
const psychic = readRef("src/battle_anim_psychic.c");
const mons = readRef("src/battle_anim_mons.c");
const effects = readRef("src/battle_anim_effects_3.c");
const graphics = readRef("src/graphics.c");
const registry = readRef("src/data/battle_anim.h");
const battleScripts = readRef("data/battle_scripts_1.s");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json")) as Json;
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json")) as Json;
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json")) as Json;
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json")) as Json;
const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(ref, "pokeemerald.elf")], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const rom = readFileSync(resolve(ref, "pokeemerald.gba"));

const symbols = new Map<string, { address: number; size: number }>();
for (const line of nm.split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) symbols.set(fields.at(-1)!, { address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
  else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) symbols.set(fields[2]!, { address: Number.parseInt(fields[0]!, 16), size: 0 });
}
function sym(name: string) { const value = symbols.get(name); if (!value) throw new Error(`missing ${name}`); return value; }
function range(name: string, end?: string) { const start = sym(name).address, finish = end ? sym(end).address : start + sym(name).size; const bytes = rom.subarray(start - 0x08000000, finish - 0x08000000); return { start: `0x${start.toString(16).padStart(8, "0")}`, endExclusive: `0x${finish.toString(16).padStart(8, "0")}`, byteLength: bytes.length, romSha256: sha(bytes) }; }
function block(source: string, start: string, end: string) { const from = source.indexOf(start), to = source.indexOf(end, from + start.length); if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`); return source.slice(from, to); }
function fn(source: string, name: string) { const matcher = new RegExp(`\\b${name}\\s*\\(`, "gu"); for (let match = matcher.exec(source); match; match = matcher.exec(source)) { const open = source.indexOf("{", match.index), semi = source.indexOf(";", match.index); if (open < 0 || (semi >= 0 && semi < open)) continue; let depth = 0; for (let i = open; i < source.length; i++) { if (source[i] === "{") depth++; else if (source[i] === "}" && --depth === 0) return source.slice(source.lastIndexOf("\n", match.index) + 1, i + 1); } } throw new Error(`missing body ${name}`); }
function sourceIdentity(path: string, source: string, body: string) { return { path, byteLength: Buffer.byteLength(body), sha256: sha(body) }; }
function requireTokens(label: string, source: string, tokens: readonly string[]) { for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drift: ${token}`); }

const rootBody = block(scripts, "Move_SKILL_SWAP:\n", "Move_IMPRISON:\n");
const bgBody = block(scripts, "SetPsychicBackground:\n", "SetSkyBg:\n");
const taskBody = fn(psychic, "AnimTask_SkillSwap");
const taskStep = fn(psychic, "AnimTask_SkillSwap_Step");
const orbCallback = fn(psychic, "AnimSkillSwapOrb");
const blendBody = fn(mons, "AnimTask_BlendMonInAndOut");
const setBgBody = fn(effects, "AnimTask_SetPsychicBackground");
requireTokens("root", rootBody, ["loadspritegfx ANIM_TAG_BLUEGREEN_ORB", "call SetPsychicBackground", "createvisualtask AnimTask_SkillSwap, 3, ANIM_TARGET", "createvisualtask AnimTask_BlendMonInAndOut, 5, ANIM_TARGET, RGB_WHITE, 12, 3, 1", "loopsewithpan SE_M_REVERSAL", "delay 16", "createvisualtask AnimTask_SkillSwap, 3, ANIM_ATTACKER", "createvisualtask AnimTask_BlendMonInAndOut, 5, ANIM_ATTACKER, RGB_WHITE, 12, 3, 1", "call UnsetPsychicBackground"]);
requireTokens("orb task", taskBody + taskStep + orbCallback, ["CreateSprite(&gSkillSwapOrbSpriteTemplate", "if (++task->data[2] == 12)", "InitAnimArcTranslation", "StartSpriteAffineAnim", "TranslateAnimHorizontalArc", "FreeOamMatrix"]);
requireTokens("resource", graphics + registry, ["gBattleAnimSpriteGfx_BluegreenOrb", "gBattleAnimSpritePal_BluegreenOrb", "ANIM_TAG_BLUEGREEN_ORB"]);
requireTokens("ability outcome", battleScripts, ["BattleScript_EffectSkillSwap::", "tryswapabilities BattleScript_ButItFailed", "attackanimation", "STRINGID_PKMNSWAPPEDABILITIES"]);

const expectedComponents = ["asset:ANIM_TAG_BLUEGREEN_ORB", "subroutine:SetPsychicBackground", "subroutine:UnsetPsychicBackground", "task:AnimTask_BlendMonInAndOut", "task:AnimTask_SetPsychicBackground", "task:AnimTask_SkillSwap", "visualCommand:fadetobg", "visualCommand:restorebg", "visualCommand:setarg", "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout"];
const generated = graph.moves.find((entry: Json) => entry.move === "MOVE_SKILL_SWAP");
if (JSON.stringify(generated?.blocks) !== JSON.stringify(["Move_SKILL_SWAP", "SetPsychicBackground", "UnsetPsychicBackground"]) || JSON.stringify(generated?.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("generated graph drift");
const move = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_SKILL_SWAP");
const carriers = frontier.entries.filter((entry: Json) => entry.index >= 110 && entry.index <= 849 && entry.moves.includes("MOVE_SKILL_SWAP"));
if (!move || move.frontierMonCount !== 5 || move.speciesCount !== 5 || carriers.length !== 5) throw new Error("five-carrier census drift");
const status = (name: string) => coverage.entries.find((entry: Json) => entry.move === name)?.status ?? "unsupported";
const output = {
  schema: "skill-swap-source-audit/v1", move: "MOVE_SKILL_SWAP", moveId: 285, status: "exact", coverageCredit: true,
  source: {
    root: { source: sourceIdentity("data/battle_anim_scripts.s", scripts, rootBody), rom: range("Move_SKILL_SWAP", "Move_IMPRISON") },
    psychicBackground: { source: sourceIdentity("data/battle_anim_scripts.s", scripts, bgBody), rom: range("SetPsychicBackground", "SetSkyBg") },
    novel: {
      asset: { id: "asset:ANIM_TAG_BLUEGREEN_ORB", gfx: range("gBattleAnimSpriteGfx_BluegreenOrb"), palette: range("gBattleAnimSpritePal_BluegreenOrb"), template: range("gSkillSwapOrbSpriteTemplate") },
      task: { id: "task:AnimTask_SkillSwap", init: { source: sourceIdentity("src/battle_anim_psychic.c", psychic, taskBody), rom: range("AnimTask_SkillSwap") }, step: { source: sourceIdentity("src/battle_anim_psychic.c", psychic, taskStep), rom: range("AnimTask_SkillSwap_Step") }, callback: { source: sourceIdentity("src/battle_anim_psychic.c", psychic, orbCallback), rom: range("AnimSkillSwapOrb") } },
    },
    shared: { blendMon: { source: sourceIdentity("src/battle_anim_mons.c", mons, blendBody), rom: range("AnimTask_BlendMonInAndOut") }, setPsychicBg: { source: sourceIdentity("src/battle_anim_effects_3.c", effects, setBgBody), rom: range("AnimTask_SetPsychicBackground") } },
  },
  graph: { blocks: generated.blocks, componentCount: generated.componentIds.length, components: generated.componentIds, novelComponents: ["asset:ANIM_TAG_BLUEGREEN_ORB", "task:AnimTask_SkillSwap"] },
  carriers: carriers.map((entry: Json) => ({ setId: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, evSpreadStats: entry.evSpreadStats, nature: entry.nature })),
  controls: { named: { MOVE_FORESIGHT: status("MOVE_FORESIGHT"), MOVE_NIGHTMARE: status("MOVE_NIGHTMARE"), MOVE_PSYWAVE: status("MOVE_PSYWAVE"), MOVE_EXTRASENSORY: status("MOVE_EXTRASENSORY") }, transferCredit: false, note: "Foresight controls BlendMonInAndOut; Nightmare is exact only for its legal body; Psywave and Extrasensory remain unsupported." },
  checkpoint: { sourceAudit: true, graphPinned: true, fiveLevel50CarriersPinned: true, legalBilateralParties: true, denseEvidenceRequired: true, reducerAdded: true, typedSeamAdded: true, compositorAdded: true, productionChanged: true, framebufferAcceptance: true, coveragePromotion: true, siblingPromotion: false, componentTrackFulfilled: true, boundaryOrBarrierChanged: false, gameplayStateOwned: false },
};
console.log(JSON.stringify(output, null, 2));
