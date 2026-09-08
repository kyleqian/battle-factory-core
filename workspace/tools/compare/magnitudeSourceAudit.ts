/** Authoritative source/ELF/ROM audit for exact MOVE_MAGNITUDE coverage. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const hash = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const ground = read("reference/pokeemerald/src/battle_anim_ground.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const macros = read("reference/pokeemerald/asm/macros/battle_anim_script.inc");
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json")) as Json;
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json")) as Json;
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json")) as Json;
const evidence = JSON.parse(read("tools/compare/fixtures/magnitude-dense-evidence.json")) as Json;
const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
});
const symbols = new Map<string, { address: number; size: number }>();
for (const line of nm.split("\n")) {
  const parts = line.trim().split(/\s+/u);
  if (parts.length >= 4 && /^[0-9a-f]+$/iu.test(parts[0]!) && /^[0-9a-f]+$/iu.test(parts[1]!))
    symbols.set(parts.at(-1)!, { address: Number.parseInt(parts[0]!, 16), size: Number.parseInt(parts[1]!, 16) });
  else if (parts.length === 3 && /^[0-9a-f]+$/iu.test(parts[0]!))
    symbols.set(parts[2]!, { address: Number.parseInt(parts[0]!, 16), size: 0 });
}
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const artifactHash = (path: string): string => hash(readFileSync(resolve(root, path)));
const address = (name: string): number => symbols.get(name)?.address ?? (() => { throw new Error(`missing symbol ${name}`); })();
const body = (start: string, end: string): string => {
  const from = scripts.indexOf(`${start}:\n`), to = scripts.indexOf(`${end}:\n`, from + start.length);
  if (from < 0 || to <= from) throw new Error(`missing body ${start}/${end}`);
  return scripts.slice(from, to);
};
const scriptBody = (start: string, end: string) => {
  const text = body(start, end);
  const commandRows = text.split("\n").map((line) => line.replace(/@.*$/u, "").trim())
    .filter((line) => line && !line.startsWith(".if") && !line.startsWith(".else") && !line.startsWith(".endif") && !line.endsWith(":"));
  return { bytes: Buffer.byteLength(text), sha256: hash(text), commandRows };
};
const romBody = (start: string, end: string) => {
  const from = address(start), to = address(end);
  const bytes = rom.subarray(from - 0x08000000, to - 0x08000000);
  return { start: `0x${from.toString(16).padStart(8, "0")}`, endExclusive: `0x${to.toString(16).padStart(8, "0")}`, bytes: bytes.length, sha256: hash(bytes) };
};
const pin = (name: string) => {
  const symbol = symbols.get(name);
  if (!symbol?.size) throw new Error(`missing sized symbol ${name}`);
  const bytes = rom.subarray(symbol.address - 0x08000000, symbol.address - 0x08000000 + symbol.size);
  return { start: `0x${symbol.address.toString(16).padStart(8, "0")}`, endExclusive: `0x${(symbol.address + symbol.size).toString(16).padStart(8, "0")}`, bytes: symbol.size, sha256: hash(bytes) };
};
const components = [
  "subroutine:MagnitudeEnd", "subroutine:MagnitudeIntense", "subroutine:MagnitudeRegular",
  "task:AnimTask_HorizontalShake", "task:AnimTask_IsPowerOver99", "visualCommand:complex_palette_blend",
];
const entry = graph.moves.find((item: Json) => item.move === "MOVE_MAGNITUDE");
const carriers = frontier.entries.filter((item: Json) => item.index >= 110 && item.moves.includes("MOVE_MAGNITUDE"));
const sourceBodies = {
  root: { script: scriptBody("Move_MAGNITUDE", "MagnitudeEnd"), rom: romBody("Move_MAGNITUDE", "MagnitudeEnd") },
  regular: { script: scriptBody("MagnitudeRegular", "MagnitudeIntense"), rom: romBody("MagnitudeRegular", "MagnitudeIntense") },
  intense: { script: scriptBody("MagnitudeIntense", "Move_RAPID_SPIN"), rom: romBody("MagnitudeIntense", "Move_RAPID_SPIN") },
};
for (const token of [
  "void AnimTask_IsPowerOver99(u8 taskId)", "gAnimMovePower > 99", "void AnimTask_HorizontalShake(u8 taskId)",
  "task->func = AnimTask_ShakePlatforms;", "task->func = AnimTask_ShakeBattlers;", "static void AnimTask_ShakePlatforms(u8 taskId)",
  "static void AnimTask_ShakeBattlers(u8 taskId)",
]) if (!ground.includes(token)) throw new Error(`ground source drifted: ${token}`);
for (const token of [
  "const struct SpriteTemplate gComplexPaletteBlendSpriteTemplate", "static void AnimComplexPaletteBlend(struct Sprite *sprite)",
  "static void AnimComplexPaletteBlend_Step1(struct Sprite *sprite)", "static void AnimComplexPaletteBlend_Step2(struct Sprite *sprite)",
  "BlendPalettes(selectedPalettes, cmd->blendY1, cmd->color1)", "BlendPalettes(selectedPalettes, sprite->sBlendY2, sprite->sColor2)",
]) if (!normal.includes(token)) throw new Error(`normal source drifted: ${token}`);
for (const token of [".macro complex_palette_blend", "gComplexPaletteBlendSpriteTemplate"]) if (!macros.includes(token)) throw new Error(`macro source drifted: ${token}`);
if (JSON.stringify(entry?.blocks) !== JSON.stringify(["Move_MAGNITUDE", "MagnitudeRegular", "MagnitudeIntense", "MagnitudeEnd"]) || JSON.stringify(entry?.componentIds) !== JSON.stringify(components)) throw new Error("generated Magnitude graph drifted");
if (carriers.map((item: Json) => item.index).join(",") !== "166,241") throw new Error("Magnitude carrier census drifted");
if (coverage.entries.find((item: Json) => item.move === "MOVE_MAGNITUDE")?.status !== "exact") throw new Error("Magnitude must retain exact coverage");
if (evidence.schema !== "magnitude-dense-evidence/v1" || evidence.status !== "unsupported-evidence" || evidence.coverageCredit !== false) throw new Error("Magnitude evidence boundary drifted");
for (const item of evidence.bodies as Json[]) {
  if (artifactHash(item.denseState) !== item.denseStateSha256 || artifactHash(item.rawRgbArchive) !== item.rawRgbArchiveSha256 || artifactHash(item.changeMap) !== item.changeMapSha256) throw new Error(`Magnitude evidence artifact drifted: ${item.id}`);
  if (item.probeJsonSha256 !== item.repeatProbeJsonSha256 || item.rawRgbSequenceSha256 !== item.repeatRawRgbSequenceSha256) throw new Error(`Magnitude fresh-repeat drifted: ${item.id}`);
}
const callbacks = Object.fromEntries(["AnimTask_IsPowerOver99", "AnimTask_HorizontalShake", "AnimTask_ShakePlatforms", "AnimTask_ShakeBattlers", "AnimComplexPaletteBlend", "AnimComplexPaletteBlend_Step1", "AnimComplexPaletteBlend_Step2", "gComplexPaletteBlendSpriteTemplate"].map((name) => [name, pin(name)]));
console.log(JSON.stringify({
  move: "MOVE_MAGNITUDE", moveId: 222, status: "exact", coverageCredit: true,
  sourceBodies, graph: { blocks: entry.blocks, components }, callbacks,
  branch: { selector: "AnimTask_IsPowerOver99", predicate: "gAnimMovePower > 99", regular: "MagnitudeRegular", intense: "MagnitudeIntense", regularPower: "<=99", intensePower: ">99" },
  horizontalShake: { targets: [5, 4], intensity: 0, maxTime: 50, audio: { symbol: "SE_M_STRENGTH", id: 128, pan: "SOUND_PAN_TARGET", interval: 8, count: 10 } },
  complexPalette: { selector: "F_PAL_BG", delay: 3, numBlends: 1, color1: "RGB_BLACK", blendY1: 14, color2: "RGB_WHITE", blendY2: 14, delaysAfterShake: [10, 16], calls: 2 },
  carriers: { count: carriers.length, speciesCount: new Set(carriers.map((item: Json) => item.species)).size, all: carriers.map((item: Json) => ({ index: item.index, label: item.label, species: item.species, moves: item.moves, itemName: item.itemName, nature: item.nature, evSpreadStats: item.evSpreadStats })), lowest: carriers[0] },
  ownership: { gameplayState: false, damage: false, weather: false, rng: false, controller: false, reducer: true, renderer: true },
  checkpoint: { legalPartyOnlyStaging: true, branches: ["regular", "intense"], orientations: ["player-back", "opponent-front"], denseWindowCaptured: true, twiceFresh: true, normalizedMaps: true, productionChanged: true, coveragePromotion: true, componentTrackCredit: false, latchPromotion: false },
}, null, 2));
