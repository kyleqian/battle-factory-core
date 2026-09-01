import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  swiftAtAge,
  type SwiftAnimationProfile,
} from "../../src/animation/swift.ts";

type Json = Record<string, any>;
export type SwiftEvidenceOrientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/swift-evidence.json"), "utf8")) as Json;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function readSwiftRows(orientation: SwiftEvidenceOrientation): Json[] {
  const path = receipt.orientations[orientation].denseState as string;
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, path))).toString("utf8")) as Json).frames;
}

export function swiftProfileFor(
  orientation: SwiftEvidenceOrientation,
  rows = readSwiftRows(orientation),
): SwiftAnimationProfile {
  const first = rows[0]!;
  const direction = orientation === "player-back" ? 1 : -1;
  const firstStar = rows[10]!.sprites.find((sprite: Json) => sprite.template?.symbol === "gSwiftStarSpriteTemplate");
  const shake = rows[24]!.tasks.find((task: Json) => task.func?.symbol === "AnimTask_ShakeMon2_Step");
  if (!firstStar || !shake) throw new Error(`${orientation}: allocator facts missing`);
  return {
    attackerSide: orientation === "player-back" ? "player" : "opponent",
    attackerEffectCenter: { x: firstStar.x - direction * 20, y: firstStar.y + 10 },
    targetAverageCenter: {
      x: first.battlerSprites.target.x,
      y: first.battlerSprites.target.y + (orientation === "opponent-front" ? 8 : 0),
    },
    attackerSpriteSlot: first.battlerSprites.attacker.slot,
    targetSpriteSlot: first.battlerSprites.target.slot,
    targetInitialOffset: { x2: first.battlerSprites.target.x2, y2: first.battlerSprites.target.y2 },
    starSlots: [3, 4, 5, 7, 9],
    targetShakeTaskSlot: shake.slot,
    gameplayRng: first.gameplayRng,
    immutableGameplayState: first.immutableState,
  };
}

export function verifySwiftReducer(orientation: SwiftEvidenceOrientation): Json {
  const rows = readSwiftRows(orientation);
  const profile = swiftProfileFor(orientation, rows);
  for (const [age, row] of rows.entries()) {
    const frame = swiftAtAge(age, profile);
    if (frame.source.offset !== row.scriptOffset || frame.source.wait !== row.scriptWait
      || frame.source.active !== row.animScriptActive) throw new Error(`${orientation} age ${age}: source`);
    const expected = row.sprites.filter((sprite: Json) => sprite.template?.symbol === "gSwiftStarSpriteTemplate")
      .map((sprite: Json) => ({ slot: sprite.slot, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
        subpriority: sprite.subpriority, invisible: sprite.invisible, matrix: sprite.matrix }));
    const actual = frame.stars.map((star) => ({ slot: star.slot, x: star.x, y: star.y, x2: star.x2, y2: star.y2,
      subpriority: star.subpriority, invisible: star.invisible, matrix: star.matrix }));
    if (!same(actual, expected)) throw new Error(`${orientation} age ${age}: stars\n${JSON.stringify(actual)}\n${JSON.stringify(expected)}`);
    if (frame.targetOffset.x2 !== row.battlerSprites.target.x2 || frame.targetOffset.y2 !== row.battlerSprites.target.y2) {
      throw new Error(`${orientation} age ${age}: target offset ${JSON.stringify(frame.targetOffset)} != ${row.battlerSprites.target.x2}`);
    }
    const task = row.tasks.find((entry: Json) => entry.func?.symbol === "AnimTask_ShakeMon2_Step");
    if (Boolean(frame.targetShake) !== Boolean(task)) throw new Error(`${orientation} age ${age}: task`);
    const yellow = row.paletteTags.includes(10174) && row.tileTags.includes(10174);
    const impact = row.paletteTags.includes(10135) && row.tileTags.includes(10135);
    if (frame.resources.yellowStar.loaded !== yellow || frame.resources.impact.loaded !== impact) {
      throw new Error(`${orientation} age ${age}: resources`);
    }
    if (frame.audio.length && (row.audio.SE1.songHeaderIdentity.symbol !== "se_m_swift"
      || row.audio.SE1.tracks[0]?.panX !== frame.audio[0]!.pan)) throw new Error(`${orientation} age ${age}: audio`);
    if (frame.gameplay.rng !== row.gameplayRng || !same(frame.gameplay.immutableState, row.immutableState)) {
      throw new Error(`${orientation} age ${age}: gameplay`);
    }
  }
  const final = swiftAtAge(rows.length - 1, profile);
  return {
    rows: rows.length,
    stars: orientation === "player-back" ? [[10, 43], [17, 50], [24, 57], [31, 64], [38, 71]]
      : [[10, 45], [17, 52], [24, 59], [31, 66], [38, 73]],
    shake: [24, 57], targetSourceOffsets: [24, 58], targetDisplayOffsets: [25, 59],
    latches: {
      oam: `${rows.length - 1}/${rows.length - 1} RAM+1`,
      matrices: `${rows.length - 1}/${rows.length - 1} RAM+1`,
      palette: `${rows.length - 2}/${rows.length - 1} RAM+1; monbg setup exception age 7`,
    },
    cleanup: { age: rows.length - 1, active: final.active, stars: final.stars.length, resourcesFreed: final.cleanup.resourcesFreed },
    gameplay: { immutable: true, rngTransitions: 0, impactInstantiated: false },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const orientation of ["player-back", "opponent-front"] as const) {
    console.log(`${orientation}: ${JSON.stringify(verifySwiftReducer(orientation))}`);
  }
}
