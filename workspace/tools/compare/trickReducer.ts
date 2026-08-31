/** Dense source-state adapter and reducer audit for MOVE_TRICK. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  trickAtAge,
  type TrickAnimationProfile,
  type TrickBattler,
  type TrickShakeTask,
  type TrickStretchTask,
} from "../../src/animation/trick.ts";

type Json = Record<string, any>;
export type TrickEvidenceOrientation = "player-back" | "opponent-front";

const root = resolve(import.meta.dirname, "../..");
const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/trick-evidence.json"), "utf8")) as Json;
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

function ownedBags(row: Json): Json[] {
  return row.sprites.filter((sprite: Json) => sprite.template?.symbol === "gTrickBagSpriteTemplate")
    .sort((left: Json, right: Json) => left.slot - right.slot);
}

function task(row: Json, symbol: string, spriteSlot?: number): Json {
  const match = row.tasks.find((entry: Json) => entry.func?.symbol === symbol
    && (spriteSlot === undefined || entry.data[0] === spriteSlot));
  if (!match) throw new Error(`missing ${symbol}`);
  return match;
}

export function readTrickRows(orientation: TrickEvidenceOrientation): Json[] {
  const path = receipt.orientations[orientation].denseState as string;
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, path))).toString("utf8")) as Json).frames;
}

/** Test-only extraction of allocator/task slots; production never selects a carrier pair. */
export function trickProfileFor(
  orientation: TrickEvidenceOrientation,
  rows = readTrickRows(orientation),
): TrickAnimationProfile {
  const bags = ownedBags(rows[7]!);
  const attacker = rows[25]!.battlerSprites.attacker;
  const target = rows[25]!.battlerSprites.target;
  return {
    bagSlots: [bags[0]!.slot, bags[1]!.slot],
    attacker: {
      spriteSlot: attacker.slot,
      stretchTaskSlot: task(rows[25]!, "AnimTask_StretchAttackerUp").slot,
      shakeTaskSlot: task(rows[173]!, "AnimTask_ShakeMon_Step", attacker.slot).slot,
    },
    target: {
      spriteSlot: target.slot,
      stretchTaskSlot: task(rows[25]!, "AnimTask_StretchTargetUp").slot,
      shakeTaskSlot: task(rows[173]!, "AnimTask_ShakeMon_Step", target.slot).slot,
    },
    orientation,
    gameplayRng: rows[0]!.gameplayRng,
    immutableGameplayState: rows[0]!.immutableState,
  };
}

function normalizedBag(sprite: Json): Json {
  return {
    slot: sprite.slot, callback: sprite.callback?.symbol,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    subpriority: sprite.subpriority, invisible: Boolean(sprite.invisible),
    matrix: sprite.matrix, data: sprite.data,
  };
}

function normalizedReducerBag(sprite: ReturnType<typeof trickAtAge>["sprites"][number]): Json {
  return {
    slot: sprite.slot, callback: sprite.callback,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    subpriority: sprite.subpriority, invisible: sprite.invisible,
    matrix: sprite.affine.matrix, data: sprite.data,
  };
}

function expectedAudio(age: number): string | null {
  if (age === 25) return "se_m_sketch";
  if ([57, 83, 101, 119, 137, 155].includes(age)) return "se_m_double_team";
  return age === 173 ? "se_m_attract" : null;
}

function activeStretch(frame: ReturnType<typeof trickAtAge>, battler: TrickBattler): TrickStretchTask | undefined {
  return frame.tasks.find((entry): entry is TrickStretchTask => entry.kind === "stretch" && entry.battler === battler);
}

function activeShake(frame: ReturnType<typeof trickAtAge>, battler: TrickBattler): TrickShakeTask | undefined {
  return frame.tasks.find((entry): entry is TrickShakeTask => entry.kind === "shake" && entry.battler === battler);
}

/**
 * Pure source/task/resource audit.  No RGB bytes enter this reducer proof;
 * the evidence verifier separately retains and checks the full raw sequence.
 */
export function verifyTrickReducer(orientation: TrickEvidenceOrientation): Json {
  const rows = readTrickRows(orientation);
  const profile = trickProfileFor(orientation, rows);
  let sourceRows = 0; let bagRows = 0; let stretchRows = 0; let shakeRows = 0;
  let resourceRows = 0; let audioRows = 0; let gameplayRows = 0;
  for (const [age, row] of rows.entries()) {
    const frame = trickAtAge(age, profile);
    if (frame.source.offset !== row.scriptOffset || frame.source.wait !== row.scriptWait
      || frame.source.active !== row.animScriptActive) {
      throw new Error(`${orientation} age ${age}: source cursor mismatch`);
    }
    sourceRows += 1;
    const expectedBags = ownedBags(row).map(normalizedBag);
    const actualBags = frame.sprites.map(normalizedReducerBag);
    if (!same(actualBags, expectedBags) || frame.visualTaskCount !== row.visualTaskCount) {
      throw new Error(`${orientation} age ${age}: Trick Bag/task-count mismatch`);
    }
    bagRows += 1;
    for (const battler of ["attacker", "target"] as const) {
      const stretchSymbol = battler === "attacker" ? "AnimTask_StretchAttackerUp" : "AnimTask_StretchTargetUp";
      const expectedStretch = row.tasks.find((entry: Json) => entry.func?.symbol === stretchSymbol);
      const actualStretch = activeStretch(frame, battler);
      if (expectedStretch) {
        const battlerSprite = row.battlerSprites[battler];
        if (!actualStretch || actualStretch.slot !== expectedStretch.slot
          || actualStretch.spriteSlot !== battlerSprite.slot
          || actualStretch.x2 !== battlerSprite.x2
          || !same(actualStretch.sourceMatrix, [expectedStretch.data[10], 0, 0, expectedStretch.data[11]])) {
          throw new Error(`${orientation} age ${age}: ${battler} Stretch mismatch`);
        }
      } else if (actualStretch) throw new Error(`${orientation} age ${age}: stale ${battler} Stretch`);
      stretchRows += 1;
      const battlerSprite = row.battlerSprites[battler];
      const expectedShake = row.tasks.find((entry: Json) => entry.func?.symbol === "AnimTask_ShakeMon_Step"
        && entry.data[0] === battlerSprite.slot);
      const actualShake = activeShake(frame, battler);
      if (expectedShake) {
        if (!actualShake || actualShake.slot !== expectedShake.slot || actualShake.spriteSlot !== battlerSprite.slot
          || actualShake.x2 !== battlerSprite.x2 || !same(actualShake.data, expectedShake.data.slice(0, 6))) {
          throw new Error(`${orientation} age ${age}: ${battler} ShakeMon mismatch`);
        }
      } else if (actualShake) throw new Error(`${orientation} age ${age}: stale ${battler} ShakeMon`);
      shakeRows += 1;
    }
    const itemBag = row.allocators.paletteTags.includes(10224) && row.allocators.tileTags.includes(10224);
    const speedDust = row.allocators.paletteTags.includes(10207) && row.allocators.tileTags.includes(10207);
    if (frame.resources.itemBag.loaded !== itemBag || frame.resources.speedDust.loaded !== speedDust
      || frame.resources.speedDust.used !== false) {
      throw new Error(`${orientation} age ${age}: resource lifecycle mismatch`);
    }
    resourceRows += 1;
    const song = expectedAudio(age);
    if (song) {
      if (frame.audio.length !== 1 || frame.audio[0]!.song !== song
        || row.audio.SE1.songHeaderIdentity.symbol !== song
        || !row.audio.SE1.tracks.filter((track: Json) => track.flags !== 0).every((track: Json) => track.pan === 0 && track.panX === 0)) {
        throw new Error(`${orientation} age ${age}: literal audio cadence mismatch`);
      }
      audioRows += 1;
    } else if (frame.audio.length) throw new Error(`${orientation} age ${age}: synthetic audio event`);
    if (frame.gameplay.rng !== row.gameplayRng || !same(frame.gameplay.immutableState, row.immutableState)
      || frame.gameplay.changed) throw new Error(`${orientation} age ${age}: gameplay ownership mismatch`);
    gameplayRows += 1;
  }
  const speedDustSprites = rows.flatMap((row) => row.sprites).filter(
    (sprite: Json) => sprite.template?.symbol === "gSpeedDustSpriteTemplate",
  ).length;
  const oam = rows.slice(1).filter((row, index) => same(row.hardwareOam, rows[index]!.softwareOam)).length;
  const palette = rows.slice(1).filter((row, index) => same(row.hardwarePalette, rows[index]!.fadedPalette)).length;
  const stretchMatrix = ["attacker", "target"].flatMap((battler) => rows.flatMap((row, age) => {
    const symbol = battler === "attacker" ? "AnimTask_StretchAttackerUp" : "AnimTask_StretchTargetUp";
    const sprite = row.battlerSprites[battler];
    return age >= 27 && row.tasks.some((entry: Json) => entry.func?.symbol === symbol)
      && same(row.hardwareMatrices[sprite.matrixNum], rows[age - 2]!.battlerSprites[battler].matrix) ? [age] : [];
  }));
  const cleanup = trickAtAge(224, profile);
  if (oam !== 224 || palette !== 224 || !same(stretchMatrix, [
    ...Array.from({ length: 18 }, (_, index) => index + 27),
    ...Array.from({ length: 18 }, (_, index) => index + 27),
  ]) || cleanup.source.active || !cleanup.cleanup.firstInactive || cleanup.sprites.length || cleanup.tasks.length
    || !cleanup.cleanup.resourcesFreed || speedDustSprites !== 0) {
    throw new Error(`${orientation}: display latch/resource/cleanup contract mismatch`);
  }
  return {
    rows: rows.length,
    checked: { sourceRows, bagRows, stretchRows, shakeRows, resourceRows, audioRows, gameplayRows },
    lifecycle: { bags: { start: 7, end: 198, count: 2 }, stretch: { start: 25, end: 44, paired: true }, shake: { start: 173, end: 191, paired: true }, speedDustSprites },
    latches: { oam: "224/224 RAM+1", palette: "224/224 RAM+1", stretchMatrices: "27..44 RAM+2", shakeMon: "RAM+1" },
    resources: { itemBag: "1..223", speedDust: "4..223 resource-only" },
    audio: { sketch: 25, doubleTeam: [57, 83, 101, 119, 137, 155], attract: 173 },
    cleanup: { age: 224, sourceActive: cleanup.source.active, bags: cleanup.sprites.length, tasks: cleanup.tasks.length, resourcesFreed: cleanup.cleanup.resourcesFreed, framebufferCompared: false },
    gameplay: { immutable: true, gameplayRngTransitions: 0 },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const orientation of ["player-back", "opponent-front"] as const) {
    console.log(`${orientation}: ${JSON.stringify(verifyTrickReducer(orientation))}`);
  }
}
