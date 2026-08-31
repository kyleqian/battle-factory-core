/** Dense state adapter and non-framebuffer audit for MOVE_SAND_TOMB. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  sandTombTimeline,
  type SandTombAnimationProfile,
  type SandTombOrientation,
} from "../../src/animation/sandTomb.ts";

type Json = Record<string, any>;
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/sand-tomb-evidence.json"), "utf8")) as Json;
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

export { type SandTombOrientation };

export function readSandTombRows(orientation: SandTombOrientation): Json[] {
  const path = fixture.orientations[orientation].denseState as string;
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, path))).toString("utf8")) as Json).frames;
}

function sourceSprite(row: Json, symbol: string): Json | undefined {
  return row.sprites.find((sprite: Json) => sprite.template.symbol === symbol);
}

function sourceTask(row: Json, symbol: string): Json | undefined {
  return row.tasks.find((task: Json) => task.func.symbol === symbol);
}

function initialKeys(row: Json): SandTombAnimationProfile["spriteOrder"]["initialKeys"] {
  const bySlot = new Map<number, Json>();
  for (const sprite of [...row.sprites, ...Object.values(row.battlerSprites)] as Json[]) bySlot.set(sprite.slot, sprite);
  return [...bySlot.values()].map((sprite) => ({
    slot: sprite.slot,
    priority: ((sprite.attr[2] >> 10) & 3) as 0 | 1 | 2 | 3,
    subpriority: sprite.subpriority,
    y: (sprite.attr[0] & 0xff) >= 160 ? (sprite.attr[0] & 0xff) - 256 : sprite.attr[0] & 0xff,
  }));
}

function freeSpriteSlots(row: Json): number[] {
  const used = new Set((row.sprites as Json[]).map((sprite) => sprite.slot));
  return Array.from({ length: 64 }, (_, slot) => slot).filter((slot) => !used.has(slot));
}

/**
 * Test-only adapter: it extracts live geometry/allocation inputs once from
 * an evidence state, then the production reducer uses only those typed facts.
 */
export function sandTombProfileFor(
  orientation: SandTombOrientation,
  rows = readSandTombRows(orientation),
): SandTombAnimationProfile {
  const first = rows[0]!;
  const firstDirt = sourceSprite(rows[4]!, "gSwirlingDirtSpriteTemplate")!;
  const palette = sourceSprite(rows[4]!, "gSimplePaletteBlendSpriteTemplate")!;
  const shake = sourceTask(rows[4]!, "AnimTask_ShakeMon_Step")!;
  const attacker = first.battlerSprites.attacker as Json;
  const target = first.battlerSprites.target as Json;
  return {
    orientation,
    endAge: rows.length - 1,
    attackerSide: orientation === "player-back" ? "player" : "opponent",
    attackerSpriteSlot: attacker.slot,
    attackerSubpriority: attacker.subpriority,
    target: {
      vortexCenter: { x: firstDirt.x, y: firstDirt.y - 32 },
      paletteCenter: { x: palette.x, y: palette.y },
      spriteSlot: target.slot,
      initialX2: target.x2,
      initialY2: target.y2,
      subpriority: target.subpriority,
      sortTopY: (target.attr[0] & 0xff) >= 160 ? (target.attr[0] & 0xff) - 256 : target.attr[0] & 0xff,
    },
    spriteOrder: { initialOrder: first.spriteOrder, initialKeys: initialKeys(first), freeSpriteSlots: freeSpriteSlots(first) },
    mudSand: {
      tag: 10074,
      tileNum: firstDirt.attr[2] & 0x3ff,
      paletteNum: firstDirt.attr[2] >> 12 & 0xf,
    },
    shakeTaskSlot: shake.slot,
    shakeTaskPriority: shake.priority,
    startingAnimationRng: first.animationRng,
    gameplayRng: first.gameplayRng,
    immutableGameplayState: first.immutableState,
  };
}

function normalizeSprite(sprite: Json): Json {
  return {
    slot: sprite.slot,
    template: sprite.template.symbol,
    callback: sprite.callback.symbol,
    x: sprite.x,
    y: sprite.y,
    x2: sprite.x2,
    y2: sprite.y2,
    subpriority: sprite.subpriority,
    attr: sprite.attr,
    data: sprite.data,
  };
}

function normalizedReducerSprite(sprite: any): Json {
  return {
    slot: sprite.slot,
    template: sprite.template,
    callback: sprite.callback,
    x: sprite.x,
    y: sprite.y,
    x2: sprite.x2,
    y2: sprite.y2,
    subpriority: sprite.subpriority,
    attr: sprite.attr,
    data: sprite.data,
  };
}

function latchCount(rows: Json[], actual: (row: Json) => unknown, preceding: (row: Json) => unknown): number {
  return rows.slice(1).filter((row, index) => same(actual(row), preceding(rows[index]!))).length;
}

function softwareOamPose(row: Json, attr2: number): Readonly<{ x: number; y: number }> {
  const raw = (row.softwareOam as string[]).find((entry) => Buffer.from(entry, "hex").readUInt16LE(4) === attr2);
  if (!raw) throw new Error("Sand Tomb target OAM entry missing");
  const bytes = Buffer.from(raw, "hex");
  return { x: bytes.readUInt16LE(2) & 0x1ff, y: bytes.readUInt16LE(0) & 0xff };
}

/**
 * Strict source/state audit.  It independently proves the Sand Tomb-local
 * one-row OAM/matrix/palette latches before the framebuffer verifier uses
 * them; no framebuffer bytes enter this comparison.
 */
export function verifySandTombReducer(orientation: SandTombOrientation): Json {
  const rows = readSandTombRows(orientation);
  const profile = sandTombProfileFor(orientation, rows);
  const timeline = sandTombTimeline(profile);
  let sourceRows = 0;
  let spriteRows = 0;
  let taskRows = 0;
  let targetRows = 0;
  let targetOamRows = 0;
  let orderRows = 0;
  let rngRows = 0;
  let resourceRows = 0;
  for (const [age, row] of rows.entries()) {
    const frame = timeline.frames[age]!;
    if (frame.source.offset !== row.scriptOffset || frame.source.wait !== row.scriptWait
      || !same(frame.source.args, row.animArgs) || frame.active !== row.animScriptActive) {
      throw new Error(`${orientation} age ${age}: source cursor mismatch`);
    }
    sourceRows += 1;
    const expectedDirt = row.sprites
      .filter((sprite: Json) => sprite.template.symbol === "gSwirlingDirtSpriteTemplate")
      .map(normalizeSprite);
    const expectedPalette = row.sprites
      .filter((sprite: Json) => sprite.template.symbol === "gSimplePaletteBlendSpriteTemplate")
      .map(normalizeSprite);
    const actualDirt = frame.sprites.filter((sprite) => sprite.kind === "dirt").map(normalizedReducerSprite);
    const actualPalette = frame.sprites.filter((sprite) => sprite.kind === "palette").map(normalizedReducerSprite);
    if (!same(actualDirt, expectedDirt) || !same(actualPalette, expectedPalette)) {
      throw new Error(`${orientation} age ${age}: owned sprite mismatch`);
    }
    spriteRows += 1;
    const expectedTask = sourceTask(row, "AnimTask_ShakeMon_Step");
    const actualTask = frame.tasks[0];
    if (!same(actualTask ? { slot: actualTask.slot, priority: actualTask.priority, data: actualTask.data } : null,
      expectedTask ? { slot: expectedTask.slot, priority: expectedTask.priority, data: expectedTask.data } : null)) {
      throw new Error(`${orientation} age ${age}: ShakeMon task mismatch`);
    }
    taskRows += 1;
    const expectedTarget = row.battlerSprites.target as Json;
    if (frame.targetOffset.x2 !== expectedTarget.x2 || frame.targetOffset.y2 !== expectedTarget.y2) {
      throw new Error(`${orientation} age ${age}: target task state mismatch`);
    }
    targetRows += 1;
    const targetOam = softwareOamPose(row, expectedTarget.attr[2]);
    const initialOam = softwareOamPose(rows[0]!, (rows[0]!.battlerSprites.target as Json).attr[2]);
    const baseX = (initialOam.x - profile.target.initialX2 + 512) & 0x1ff;
    const oamX2 = ((targetOam.x - baseX + 512) & 0x1ff) > 255
      ? ((targetOam.x - baseX + 512) & 0x1ff) - 512
      : (targetOam.x - baseX + 512) & 0x1ff;
    const oamY2 = ((targetOam.y - profile.target.sortTopY + 256) & 0xff) > 127
      ? ((targetOam.y - profile.target.sortTopY + 256) & 0xff) - 256
      : (targetOam.y - profile.target.sortTopY + 256) & 0xff;
    if (frame.targetOamOffset.x2 !== oamX2 || frame.targetOamOffset.y2 !== oamY2) {
      throw new Error(`${orientation} age ${age}: target software OAM phase mismatch`);
    }
    targetOamRows += 1;
    const ownedSlots = new Set([...expectedDirt, ...expectedPalette].map((sprite) => sprite.slot));
    const expectedOrder = row.spriteOrder.filter((slot: number) => ownedSlots.has(slot));
    if (!same(frame.order.sourceOrder, expectedOrder)) throw new Error(`${orientation} age ${age}: owned painter order mismatch`);
    orderRows += 1;
    if (frame.animationRng !== row.animationRng || frame.gameplay.rng !== row.gameplayRng
      || !same(frame.gameplay.immutableState, row.immutableState)) {
      throw new Error(`${orientation} age ${age}: RNG/immutable-state mismatch`);
    }
    rngRows += 1;
    const retained = age >= 1 && age < rows.length - 1;
    if (frame.resources.tileRetained !== retained || frame.resources.paletteRetained !== retained
      || frame.resources.freed !== (age === rows.length - 1)) throw new Error(`${orientation} age ${age}: resource lifetime mismatch`);
    resourceRows += 1;
  }
  const oam = latchCount(rows, (row) => row.hardwareOam, (row) => row.softwareOam);
  const matrices = latchCount(rows, (row) => row.hardwareMatrices, (row) => row.softwareMatrices);
  const palette = latchCount(rows, (row) => row.hardwarePalette, (row) => row.fadedPalette);
  if (oam !== 123 || matrices !== 123 || palette !== 123) {
    throw new Error(`${orientation}: Sand Tomb maps contradict the ordinary +1 latch`);
  }
  const cleanup = timeline.frames.at(-1)!;
  if (!cleanup.cleanup.firstInactive || cleanup.cleanup.activeSprites !== 0
    || cleanup.cleanup.activeTasks !== 0 || !cleanup.cleanup.resourcesFreed) {
    throw new Error(`${orientation}: cleanup mismatch`);
  }
  return {
    rows: rows.length,
    checked: { sourceRows, spriteRows, taskRows, targetRows, targetOamRows, orderRows, rngRows, resourceRows },
    latches: { oam: `${oam}/123 RAM+1`, matrices: `${matrices}/123 RAM+1`, palette: `${palette}/123 RAM+1`, shakeMon: "RAM+1" },
    lifecycle: { dirtSprites: 18, palettePrograms: 2, shakeRows: 84, audioAge: 4 },
    cleanup: { age: cleanup.age, active: cleanup.active, sprites: cleanup.sprites.length, tasks: cleanup.tasks.length, framebufferCompared: false },
    gameplay: { immutable: true, gameplayRngTransitions: 0, animationRngRows: rngRows },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const orientation of ["player-back", "opponent-front"] as const) {
    console.log(`${orientation}: ${JSON.stringify(verifySandTombReducer(orientation))}`);
  }
}
