/**
 * S10A blocker evidence (Ice Ball 301 counters 1..4, Dive 291 attack body): the activation sprite order of a LATER body of these Random2 moves is
 * the earlier body's words-dependent shard / droplet y-sort, which the production order host (factoryRoundBattleOrchestrator's tracker, no
 * presentation-RNG access) cannot lend: SPRITE_ORDER_PRODUCTION_BODIES has no 301 / 291 plan, so the tracker invalidates after the earlier body.
 * Measured here, through the EXISTING renderer branches, against raw ROM RGB:
 *  (a) Ice Ball: carryLiveSpriteOrder from a body's TRUE activation order with the corpus SortSprites keys reproduces the ROM sSpriteOrder on every
 *      row (orderRowsExact), and the frames equal ROM (0 px, the prep26 prototype); carried from the words-free known-entry order instead
 *      (accepted body-1 activation order: what a lend that ignores the previous body's shard sort would give), the frames differ from ROM.
 *  (b) Dive: the accepted attack bodies rendered with the true spriteOrderSeed (row 15) vs the words-free seed (the setup body's activation order).
 * usage: npx vite-node tools/integration/s10aOrderLendBlocker.ts OUT.json [altIceBall.json:rgbDir:player|opponent ...]
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { sortGbaSpriteOrder } from "../../src/animation/gbaObjCompositor.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { carryLiveSpriteOrder } from "../../src/engine/liveMoveOamAssembler.ts";
import { diveConfigFor, diveRowsFor } from "../compare/diveFramebuffer.ts";
import { iceBallConfigFor, type IceBallWindow } from "../compare/iceBallProduction.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { assembleIceBallHardwareOam, chunkSlot, shardSlots } from "./prep26IceBallAssembler.ts";
import { iceBallModel } from "./prep26IceBallModel.ts";
process.env.PREP26_LIB = "1";
const { knownFor, loadBodies } = await import("./prep26IceBallCheck.ts");
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const [outPath, ...specs] = process.argv.slice(2);
const diff = (app: Uint8Array, raw: Uint8Array) => { let n = 0;
  for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) n += 1; return n; };
const SPECIES: Record<number, string> = { 347: "GLALIE", 76: "GOLEM", 403: "REGISTEEL", 345: "SPHEAL" };
const keysOf = (row: Json) => row.sprites.map((sp: Json) => ({ slot: sp.slot, attr: sp.attr, subpriority: sp.subpriority, visible: true, oamY: sp.attr[0] & 0xff }));
const carry = (rows: Json[], activation: readonly number[]) => { const out: number[][] = []; let order = activation;
  for (const row of rows) { order = carryLiveSpriteOrder(order, keysOf(row), sortGbaSpriteOrder); out.push([...order]); } return out; };
function iceBallFrames(side: "player" | "opponent", counter: number, rows: Json[], orderAt: (s: number) => readonly number[], raw: (row: Json) => Uint8Array, fallback: readonly string[]) {
  const other = side === "player" ? "opponent" : "player", names = [SPECIES[rows[0]!.battlers[side].species] ?? fallback[0]!, SPECIES[rows[0]!.battlers[other].species] ?? fallback[1]!];
  const { oam: known, model: mk } = knownFor(rows, side, counter); const model = iceBallModel(mk);
  const window = `${side === "player" ? "player-back" : "opponent-front"}-${counter + 1}` as IceBallWindow;
  const ages: number[] = []; let px = 0;
  for (let age = 1; age < rows.length; age += 1) {
    const oam = assembleIceBallHardwareOam(age, { known, spriteOrderAt: orderAt });
    const m = model[age]!, base = iceBallConfigFor(window, rows, age), ai = base.animationInputs;
    const art = (a: Json, species: string, attr: readonly [number, number, number]) => ({ ...a, displaySpecies: species, attr });
    const geometry = (g: Json, pic: { x: number; y: number }) => ({ ...g, animationCenter: pic, battlePositionCenter: pic });
    const bp = rows[age]!.battlers, pp = rows[age]!.parties;
    const fieldProfile = { ...base.fieldProfile, playerHp: bp.player.hp, playerMaxHp: bp.player.maxHp, opponentHp: bp.opponent.hp, opponentMaxHp: bp.opponent.maxHp,
      playerGender: pp.player[bp.player.partyIndex].gender, opponentGender: pp.opponent[bp.opponent.partyIndex].gender };
    const config = { ...base, fieldProfile, attacker: { ...base.attacker, species: names[0] as never, geometry: geometry(base.attacker.geometry, known.attackerPic) },
      target: { ...base.target, species: names[1] as never, geometry: geometry(base.target.geometry, known.targetPic) },
      animationInputs: { ...ai, attackerArt: art(ai.attackerArt, names[0]!, known.attackerAttr), targetArt: art(ai.targetArt, names[1]!, known.targetAttr),
        allocation: { ...ai.allocation, chunkSlot: chunkSlot(known), shardSlots: shardSlots(known) },
        buffers: { ...ai.buffers, hardwareOam: oam.oam, hardwareMatrices: oam.matrices },
        palette: { unfaded: m.unfadedPalette, faded: m.fadedPalette, hardware: m.hardwarePalette }, registers: m.registers,
        resources: { chunkTileBase: known.chunkTile, chunkLoaded: true, crystalsTileBase: known.crystalTile, crystalsLoaded: true }, tasks: m.tasks } };
    const n = diff(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config as never), age } as never }), raw(rows[age]!));
    if (n) { ages.push(age); px += n; }
  }
  return { rowsDiffering: ages.length, residualPixels: px, ages };
}
const tarRgb = (archive: string) => { const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((n) => n.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 256 * 1024 * 1024 }), size = 240 * 160 * 3;
  const byName = new Map(members.map((n, i) => [n.replace(/^\.\//u, ""), bytes.subarray(i * size, (i + 1) * size)]));
  return (row: Json) => byName.get(row.rgbFile)!; };
const accepted = (side: string) => resolve(root, `tools/compare/fixtures/ice-ball/${side}-dense.json.gz`);
const knownEntry: readonly number[] = loadBodies(accepted("player"))[0]![0]!.spriteOrder;
const iceBall: Json[] = [];
const sets: [string, string, "player" | "opponent", (row: Json) => Uint8Array][] = [
  ["accepted-player", accepted("player"), "player", tarRgb(resolve(root, "tools/compare/fixtures/ice-ball/player-rgb.tar.gz"))],
  ["accepted-opponent", accepted("opponent"), "opponent", tarRgb(resolve(root, "tools/compare/fixtures/ice-ball/opponent-rgb.tar.gz"))],
  ...specs.map((s) => { const [file, dir, side] = s.split(":"); return [file!.split("/").pop()!.replace(/-r1\.json$/, ""), file!, side as "player" | "opponent",
    (row: Json) => readFileSync(resolve(dir!, row.rgbFile))] as [string, string, "player" | "opponent", (row: Json) => Uint8Array]; }),
];
for (const [name, file, side, raw] of sets) loadBodies(file).forEach((rows: Json[], i: number) => {
  const truth = carry(rows, rows[0]!.spriteOrder), wordsFree = carry(rows, knownEntry);
  const orderRowsExact = truth.filter((o, s) => JSON.stringify(o) === JSON.stringify(rows[s]!.spriteOrder)).length;
  const names = name.startsWith("accepted") ? ["SPHEAL", "REGISTEEL"] : ["GLALIE", "GOLEM"];
  const t = iceBallFrames(side, i, rows, (s) => truth[Math.max(s, 0)]!, raw, names), w = iceBallFrames(side, i, rows, (s) => wordsFree[Math.max(s, 0)]!, raw, names);
  const entry = { window: `${name}-b${i + 1}`, counter: i, rows: rows.length, activationOrderIsKnownEntry: JSON.stringify(rows[0]!.spriteOrder) === JSON.stringify(knownEntry),
    orderRowsExact, trueActivationOrder: t, wordsFreeKnownEntryOrder: w };
  iceBall.push(entry);
  console.log("ICE_BALL", entry.window, `rows ${entry.rows} order ${orderRowsExact}/${entry.rows} true ${t.residualPixels} px (${t.rowsDiffering} rows) wordsFree ${w.residualPixels} px (${w.rowsDiffering} rows: ${w.ages.join(",")})`);
});
// Dive accepted attack bodies: true seed (row 15 order) vs the words-free seed (the setup body's activation order).
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/dive-evidence.json"), "utf8"));
const dive: Json[] = [];
for (const orientation of ["player-back", "opponent-front"] as const) {
  const item = fixture.orientations[orientation], scratch = createScratchDir(`pokebench-s10a-dive-${orientation}-`);
  execFileSync("tar", ["-xzf", resolve(root, item.rawRgbArchive), "-C", scratch]);
  const rgbOf = (frame: number) => { const name = `${String(frame).padStart(5, "0")}.rgb`;
    const found = execFileSync("find", [scratch, "-name", name], { encoding: "utf8" }).trim().split("\n")[0]!; return readFileSync(found); };
  const setup = diveRowsFor(orientation, "setup"), rows = diveRowsFor(orientation, "attack");
  const base = diveConfigFor(orientation, "attack", rows), profile = base.animationProfile;
  const free = setup[0]!.spriteOrder as number[];
  const slots = profile.spriteOrderSeed;
  const re = <T extends { slot: number; persistentOrder: number }>(a: T): T => ({ ...a, persistentOrder: free.indexOf(a.slot) });
  const wordsFreeProfile = { ...profile, spriteOrderSeed: free.filter((s) => slots.includes(s)), ball: re(profile.ball), splash: re(profile.splash),
    droplets: profile.droplets.map(re), impacts: profile.impacts.map((imp) => ({ ...re(imp), bubbles: imp.bubbles.map(re) as typeof imp.bubbles })) };
  const run = (config: typeof base) => { const stage = createSceneOnMovePresentation(config); const ages: number[] = []; let px = 0;
    rows.forEach((row, age) => { const n = diff(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } }), rgbOf(row.frame)); if (n) { ages.push(age); px += n; } });
    return { rowsDiffering: ages.length, residualPixels: px, ages }; };
  const t = run(base), w = run({ ...base, animationProfile: wordsFreeProfile });
  const entry = { window: `accepted-${orientation}-attack`, rows: rows.length, trueSeed: slots, wordsFreeSeed: wordsFreeProfile.spriteOrderSeed, trueSeedResult: t, wordsFreeSeedResult: w };
  dive.push(entry);
  console.log("DIVE", entry.window, `rows ${rows.length} true ${t.residualPixels} px wordsFree ${w.residualPixels} px (${w.rowsDiffering} rows: ${w.ages.slice(0, 16).join(",")})`);
}
writeFileSync(outPath!, `${JSON.stringify({ schema: "s10a-order-lend-blocker/v1", iceBall, dive }, null, 1)}\n`);
