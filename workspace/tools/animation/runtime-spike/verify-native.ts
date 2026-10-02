import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import mudSandAsset from "../../../src/animation/assets/sand-tomb-mud-sand.json" with { type: "json" };
import {
  AnimationRuntime,
  type Context,
  type NativeResourceState,
  type NativeSpriteSeed,
  type SpriteState,
  type TaskSeed,
} from "../../../src/animation/nativeAnimationRuntime.ts";
import { extractPrograms } from "./extract.ts";

interface ResourceObservation extends NativeResourceState {
  mudTileStart: number | null;
  mudVram: number[];
  mudPalette: number[];
}
interface NativeRow extends Context {
  frame: number; pc: number; active: boolean; wait: number; args: number[];
  visual: number; sound: number; sePlaying: boolean;
  nativeSprites: NativeSpriteSeed[]; resources: ResourceObservation;
  softwareOam: number[][]; hardwareOam: number[][];
}
export interface NativeCase { fixture: string; move: "SPLASH" | "MUD_SPORT"; frames: NativeRow[] }

const registry = {
  resources: { 10074: { trueIndex: 74, tag: 10074, tileCount: 5 } },
  templates: {
    gMudsportMudSpriteTemplate: {
      callback: "AnimMudSportDirt", tileTag: 10074, paletteTag: 10074,
      priority: 2 as const, shape: 0 as const, size: 1 as const,
    },
  },
};
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const taskFields = (task: TaskSeed) => ({
  slot: task.slot, callback: task.callback, priority: task.priority,
  prev: task.prev, next: task.next, data: task.data,
});
const battlerFields = (sprite: SpriteState) => ({
  slot: sprite.slot, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
  attr: sprite.attr, matrixNum: sprite.matrixNum, matrix: sprite.matrix,
});
const resourceFields = (state: NativeResourceState) => ({
  reservedTileCount: state.reservedTileCount,
  tileAllocBitmap: state.tileAllocBitmap,
  tileRangeTags: state.tileRangeTags,
  tileRanges: state.tileRanges,
  reservedPaletteCount: state.reservedPaletteCount,
  paletteTags: state.paletteTags,
  loadedSpriteIndices: state.loadedSpriteIndices,
});
const owned = (sprites: readonly NativeSpriteSeed[]): NativeSpriteSeed[] => sprites
  .filter((sprite) => sprite.template === "gMudsportMudSpriteTemplate")
  .map((sprite) => structuredClone(sprite));

function packedMudBytes(): number[] {
  return mudSandAsset.tileset.tiles.flatMap((tile) => {
    const bytes: number[] = [];
    for (let index = 0; index < tile.length; index += 2) {
      bytes.push(tile[index]! | tile[index + 1]! << 4);
    }
    return bytes;
  });
}
function packedMudPalette(): number[] {
  return mudSandAsset.palette.map(({ r, g, b }) => (r >>> 3) | (g >>> 3) << 5 | (b >>> 3) << 10);
}

export function verifyNativeCases(cases: readonly NativeCase[]) {
  const resources = extractPrograms([...new Set(cases.map((item) => `Move_${item.move}`))]);
  return cases.map((testcase) => {
    const first = testcase.frames[0]!;
    const context: Context = {
      attacker: first.attacker, target: first.target,
      sprites: structuredClone(first.sprites), tasks: structuredClone(first.tasks),
      occupiedSpriteSlots: first.occupiedSpriteSlots,
      spriteOrderSeed: first.spriteOrderSeed,
      battlerSubpriorities: first.battlerSubpriorities,
      battlerCoords: first.battlerCoords,
      resources: resourceFields(first.resources),
    };
    const initialContext = JSON.stringify(context);
    const runtime = new AnimationRuntime(
      resources.programs[`Move_${testcase.move}`]!, context, resources.sine,
      resources.affinePrograms, registry,
    );
    const mismatchCounts: Record<string, number> = {};
    const examples: string[] = [];
    const check = (label: string, actual: unknown, expected: unknown, age: number): boolean => {
      if (same(actual, expected)) return true;
      mismatchCounts[label] = (mismatchCounts[label] ?? 0) + 1;
      if (examples.length < 16) examples.push(`age ${age} ${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
      return false;
    };
    let sourceRows = 0, particleRows = 0, softwareRows = 0, hardwareRows = 0, resourceRows = 0;
    let peakParticles = 0;
    let particleBirths = 0, delayedSoundTaskBirths = 0, emittedSounds = 0;
    let previousParticleSlots = new Set<number>();
    let previousDelayedSoundSlots = new Set<number>();
    for (let age = 0; age < testcase.frames.length; age++) {
      const expected = testcase.frames[age]!;
      if (age) runtime.tick(expected.sePlaying);
      const actual = runtime.snapshot();
      let source = true;
      for (const key of ["pc", "active", "wait", "args", "visual", "sound"] as const) {
        source = check(key, actual[key], expected[key], age) && source;
      }
      source = check("tasks", actual.tasks.map(taskFields), expected.tasks.map(taskFields), age) && source;
      source = check("battlers", actual.sprites.map(battlerFields), expected.sprites.map(battlerFields), age) && source;
      const expectedParticles = owned(expected.nativeSprites);
      const particleSlots = new Set(expectedParticles.map((sprite) => sprite.slot));
      particleBirths += [...particleSlots].filter((slot) => !previousParticleSlots.has(slot)).length;
      previousParticleSlots = particleSlots;
      const delayedSoundSlots = new Set(expected.tasks
        .filter((task) => task.callback === "Task_WaitAndPlaySE").map((task) => task.slot));
      delayedSoundTaskBirths += [...delayedSoundSlots]
        .filter((slot) => !previousDelayedSoundSlots.has(slot)).length;
      previousDelayedSoundSlots = delayedSoundSlots;
      emittedSounds += actual.audioEvents.length;
      peakParticles = Math.max(peakParticles, expectedParticles.length);
      const particles = check("particles", actual.nativeSprites, expectedParticles, age);
      const resource = check("resources", resourceFields(actual.resources), resourceFields(expected.resources), age);
      let software = true, hardware = true;
      for (const sprite of actual.nativeSoftware) {
        software = check("softwareTransfer", expected.softwareOam.some((attr) => same(attr, sprite.attr)), true, age) && software;
      }
      for (const sprite of actual.nativeHardware) {
        hardware = check("hardwareTransfer", expected.hardwareOam.some((attr) => same(attr, sprite.attr)), true, age) && hardware;
      }
      if (expected.resources.mudVram.length) {
        check("mudVram", expected.resources.mudVram, packedMudBytes(), age);
      }
      if (expected.resources.mudPalette.length) {
        check("mudPalette", expected.resources.mudPalette, packedMudPalette(), age);
      }
      if (source) sourceRows++;
      if (particles) particleRows++;
      if (resource) resourceRows++;
      if (software) softwareRows++;
      if (hardware) hardwareRows++;
    }
    if (JSON.stringify(context) !== initialContext) throw new Error("runtime mutated caller context");
    return {
      fixture: testcase.fixture, move: testcase.move, rows: testcase.frames.length,
      sourceRows, particleRows, resourceRows, softwareRows, hardwareRows, peakParticles,
      particleBirths, delayedSoundTaskBirths, emittedSounds,
      distinctCommandsExecuted: new Set(runtime.commandAddressesExecuted).size,
      complete: !runtime.active, mismatchCounts, examples,
    };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error("verify-native.ts observations.json[.gz] receipt.json");
  const raw = readFileSync(input);
  const json = input.endsWith(".gz") ? gunzipSync(raw) : raw;
  const capture = JSON.parse(json.toString()) as { cases: NativeCase[] };
  const reports = verifyNativeCases(capture.cases);
  const receipt = {
    schema: "native-animation-runtime-receipt/v1",
    captureSha256: createHash("sha256").update(json).digest("hex"),
    scope: "Complete Splash/Mud Sport script, task, battler, particle, resource, and runtime-owned software/hardware OBJ transfers. Ambient OAM and framebuffers are excluded; audio busy is host input.",
    reports,
  };
  writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
  if (reports.some((report) => Object.keys(report.mismatchCounts).length)) process.exitCode = 1;
}
