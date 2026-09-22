/** Complete bilateral, evidence-drift-sensitive contract for the dev-time Revenge reducer. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { replayRevenge, type RevengeGeometry, type RevengeSide } from "./revengeReducer.ts";
import { verifyRevengeEvidence } from "./revengeEvidence.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const fail = (message: string): never => { throw new Error(`MOVE_REVENGE reducer: ${message}`); };
const expect = (value: unknown, message: string): asserts value => { if (!value) fail(message); };
const owned = new Set(["gRevengeSmallScratchSpriteTemplate", "gRevengeBigScratchSpriteTemplate", "gHorizontalLungeSpriteTemplate", "gPersistHitSplatSpriteTemplate"]);
const sourceAudit = JSON.parse(readFileSync(resolve(root, "tools/compare/evidence/revenge-source-audit.json"), "utf8")) as Json;
const assets = JSON.parse(readFileSync(resolve(root, "tools/compare/evidence/revenge-assets.json"), "utf8")) as Json;
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/revenge-evidence.json"), "utf8")) as Json;

function sprite(row: Json, template: string, nth = 0): Json {
  const value = row.sprites.filter((entry: Json) => entry.template?.symbol === template)[nth];
  if (!value) fail(`missing ${template} at frame ${row.frame}`);
  return value;
}
function optionalSprite(row: Json, template: string, nth = 0): Json | undefined { return row.sprites.filter((entry: Json) => entry.template?.symbol === template)[nth]; }
function sideRows(side: RevengeSide): Json[] {
  const stem = side === "player-back" ? "player" : "opponent";
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/revenge-${stem}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
}
function tag(row: Json): "PURPLE_SCRATCH" | "PURPLE_SWIPE" | "IMPACT" | null {
  if (row.tileTags.includes(10245) && row.paletteTags.includes(10245)) return "PURPLE_SCRATCH";
  if (row.tileTags.includes(10246) && row.paletteTags.includes(10246)) return "PURPLE_SWIPE";
  if (row.tileTags.includes(10135) && row.paletteTags.includes(10135)) return "IMPACT";
  return null;
}
function audio(row: Json): string | null {
  const names = [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol];
  const known = { se_m_take_down: "SE_M_TAKE_DOWN", se_m_swagger: "SE_M_SWAGGER", se_m_vital_throw2: "SE_M_VITAL_THROW2", se_m_mega_kick2: "SE_M_MEGA_KICK2" } as Record<string, string | undefined>;
  return names.map((name) => known[name]).find((name) => name !== undefined) ?? null;
}
function flipBits(spriteValue: Json): number { return spriteValue.attr[1] & 0x3000; }
function geometry(rows: Json[]): RevengeGeometry {
  const first = rows[0]!;
  const direction = first.animationBattlers.attacker === 0 ? 1 : -1;
  expect(first.animationBattlers.target === (direction === 1 ? 1 : 0), "singles orientation");
  const small = sprite(rows[7]!, "gRevengeSmallScratchSpriteTemplate");
  const big = sprite(rows[82]!, "gRevengeBigScratchSpriteTemplate");
  const hit = sprite(rows[99]!, "gPersistHitSplatSpriteTemplate");
  const second = sprite(rows[109]!, "gPersistHitSplatSpriteTemplate", 1);
  return {
    attacker: first.animationBattlers.attacker,
    target: first.animationBattlers.target,
    direction,
    attackerCenter: [small.x - direction * 10, small.y + 10],
    targetCenter: [big.x - direction * 10, big.y + 10],
    hitTargetOrigin: [hit.x + direction * 10, hit.y + 8],
    allocations: { smallMatrix: small.matrixNum, bigMatrix: big.matrixNum, firstHitMatrix: hit.matrixNum, secondHitMatrix: second.matrixNum },
  };
}
function verifySourceInputs(): void {
  expect(sourceAudit.schema === "revenge-source-audit/v1" && sourceAudit.moveId === 279, "source audit identity");
  expect(same(sourceAudit.behavior.smallScratch.frames, [[0, 4], [16, 4], [32, 4]]) && same(sourceAudit.behavior.bigScratch.frames, [[0, 6], [64, 6]]), "source scratch frames");
  expect(same(sourceAudit.behavior.lunge, [6, 4]) && same(sourceAudit.behavior.targetShake, [3, 0, 10, 1]) && same(sourceAudit.behavior.persistentHits, [[-10, -8, 1, 8], [10, 8, 1, 8]]), "source component arguments");
  expect(assets.schema === "revenge-purple-scratch-swipe-source-assets/v1" && assets.resources.purpleScratch.tagValue === 10245 && assets.resources.purpleSwipe.tagValue === 10246, "purple asset audit");
  expect(assets.resources.purpleScratch.layout.animations[0].frames[0].duration === 4 && assets.resources.purpleSwipe.layout.animations[0].frames[0].duration === 6, "purple frame programs");
}
function verifySide(side: RevengeSide): Json {
  const rows = sideRows(side); const geo = geometry(rows);
  expect(rows.length === 145 && rows[0]!.animScriptActive && !rows[144]!.animScriptActive, `${side} complete cleanup window`);
  let matched = 0;
  for (let age = 0; age < rows.length; age += 1) {
    const row = rows[age]!; const expected = replayRevenge(age, geo);
    expect(row.animScriptActive === expected.active, `${side} age ${age} script activity`);
    expect(tag(row) === expected.scratchTag, `${side} age ${age} resource tags`);
    expect(audio(row) === expected.audio, `${side} age ${age} audio`);
    const blend = row.tasks.find((task: Json) => task.func?.symbol === "AnimTask_BlendColorCycleLoop");
    expect((blend?.data[2] ?? null) === expected.blendY, `${side} age ${age} attacker blend`);
    expect(Boolean(row.tasks.find((task: Json) => task.func?.symbol === "Task_UpdateMonBg")) === expected.monbg && Boolean(row.tasks.find((task: Json) => task.func?.symbol === "Task_ClearMonBg")) === expected.clearingMonbg, `${side} age ${age} monbg lifecycle`);
    expect(same([row.registers.bldcnt, row.registers.bldalpha], expected.alpha[0] === 12 ? [16192, 2060] : [0, 0]), `${side} age ${age} alpha lifecycle`);
    const small = optionalSprite(row, "gRevengeSmallScratchSpriteTemplate");
    const big = optionalSprite(row, "gRevengeBigScratchSpriteTemplate");
    const lunge = optionalSprite(row, "gHorizontalLungeSpriteTemplate");
    const hits = row.sprites.filter((entry: Json) => entry.template?.symbol === "gPersistHitSplatSpriteTemplate");
    const component = (kind: string) => expected.components.filter((entry) => entry.kind === kind);
    const checkScratch = (actual: Json | undefined, kind: "small-scratch" | "big-scratch", template: string) => {
      const wanted = component(kind)[0]; expect(Boolean(actual) === Boolean(wanted), `${side} age ${age} ${kind} lifetime`); if (!actual || !wanted) return;
      const original = kind === "small-scratch" ? rows[7]! : rows[82]!;
      const frameOffset = actual.attr[2] - original.sprites.find((entry: Json) => entry.template?.symbol === template).attr[2];
      expect(same([actual.x, actual.y], wanted.position) && actual.animNum === wanted.animation && frameOffset === wanted.frame && flipBits(actual) === ((wanted.hFlip ? 0x1000 : 0) | (wanted.vFlip ? 0x2000 : 0)) && actual.matrixNum === wanted.matrix, `${side} age ${age} ${kind} state`);
      const owner = kind === "small-scratch" ? row.battlerSprites.attacker : row.battlerSprites.target;
      expect(actual.subpriority === owner.subpriority - 2 && row.spriteOrder.indexOf(actual.slot) < row.spriteOrder.indexOf(owner.slot), `${side} age ${age} ${kind} order`);
    };
    checkScratch(small, "small-scratch", "gRevengeSmallScratchSpriteTemplate");
    checkScratch(big, "big-scratch", "gRevengeBigScratchSpriteTemplate");
    const wantedLunge = component("lunge")[0]; expect(Boolean(lunge) === Boolean(wantedLunge) && (!wantedLunge || row.battlerSprites.attacker.x2 === wantedLunge.x2), `${side} age ${age} horizontal lunge`);
    const wantedShake = component("shake")[0]; expect(Boolean(row.tasks.find((task: Json) => task.func?.symbol === "AnimTask_ShakeMon2_Step")) === Boolean(wantedShake) && (!wantedShake || row.battlerSprites.target.x2 === wantedShake.x2), `${side} age ${age} target ShakeMon2`);
    const wantedHits = component("hitsplat"); expect(hits.length === wantedHits.length, `${side} age ${age} hitsplat count`);
    hits.forEach((actual: Json, index: number) => { const wanted = wantedHits[index]!; expect(same([actual.x, actual.y], wanted.position) && actual.data[0] === wanted.timer && actual.matrixNum === wanted.matrix && actual.subpriority === row.battlerSprites.target.subpriority - 3 && row.spriteOrder.indexOf(actual.slot) < row.spriteOrder.indexOf(row.battlerSprites.target.slot), `${side} age ${age} hitsplat ${index}`); });
    if (age > 0) expect(same(row.hardwareOam, rows[age - 1]!.softwareOam) && same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices), `${side} age ${age} OAM/matrix latch`);
    const allocated = row.resourceAllocators.tileRanges[row.resourceAllocators.tileTags.indexOf(expected.scratchTag === "PURPLE_SCRATCH" ? 10245 : expected.scratchTag === "PURPLE_SWIPE" ? 10246 : expected.scratchTag === "IMPACT" ? 10135 : -1)];
    if (expected.scratchTag === "PURPLE_SCRATCH") expect(same(allocated, [305, 48]), `${side} age ${age} scratch allocation`);
    if (expected.scratchTag === "PURPLE_SWIPE") expect(same(allocated, [537, 128]), `${side} age ${age} swipe allocation`);
    if (expected.scratchTag === "IMPACT") expect(same(allocated, [305, 16]), `${side} age ${age} impact allocation`);
    if (expected.cleanup) expect(row.visualTaskCount === 0 && row.soundTaskCount === 0 && row.sprites.filter((entry: Json) => owned.has(entry.template?.symbol)).length === 0 && expected.scratchTag === null, `${side} cleanup`);
    matched += 1;
  }
  return { rows: rows.length, matchedRows: matched, firstInactiveCleanupAge: 144, direction: geo.direction, geometry: geo };
}

export function verifyRevengeReducer(): Json {
  const evidence = verifyRevengeEvidence(); verifySourceInputs();
  expect(fixture.status === "unsupported-evidence" && fixture.coverageCredit === false && fixture.scope.reducerAdded === false, "unsupported boundary");
  const player = verifySide("player-back"); const opponent = verifySide("opponent-front");
  return { schema: "revenge-reference-reducer/v1", move: "MOVE_REVENGE", status: "unsupported-reference-contract", coverageCredit: false, sourceRelative: true, production: { changed: false, seam: false, compositor: false, framebufferCompared: false }, orientations: { "player-back": player, "opponent-front": opponent }, totalRows: player.rows + opponent.rows, matchedRows: player.matchedRows + opponent.matchedRows, evidence: { sourceAudit: "tools/compare/evidence/revenge-source-audit.json", assets: "tools/compare/evidence/revenge-assets.json", bilateral: evidence.orientations } };
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyRevengeReducer(), null, 2));
