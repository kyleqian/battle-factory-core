/** Hermetic component-state verifier for Rapid Spin's reducer and typed seam. */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  rapidSpinAtAge,
  type RapidSpinLiveInputs,
} from "../../src/animation/rapidSpin.ts";
import {
  createSceneOnMovePresentation,
  sceneOnRapidSpinView,
  type SceneOnRapidSpinConfig,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
const task = (row: Json, symbol: string): Json | undefined =>
  row.tasks.find((entry: Json) => entry.func?.symbol === symbol);

function battler(species: "WARTORTLE" | "ONIX", side: "player" | "opponent", center: { x: number; y: number }) {
  return {
    species,
    geometry: {
      side,
      spriteCorner: { x: center.x - 32, y: center.y - 32 },
      animationCenter: center,
      battlePositionCenter: { x: center.x, y: side === "player" ? 80 : 40 },
    },
  } as const;
}

export function inputsFor(orientation: Orientation, rows: Json[]): RapidSpinLiveInputs {
  const player = orientation === "player-back";
  const monbg = task(rows[7]!, "Task_UpdateMonBg")!.data as number[];
  const targetSlot = player ? 8 : 6;
  const target = rows[0]!.sprites.find((sprite: Json) => sprite.slot === targetSlot)!;
  return {
    attackerSide: player ? "player" : "opponent",
    targetSide: player ? "opponent" : "player",
    attackerSpecies: "WARTORTLE", targetSpecies: "ONIX",
    attackerCenter: player ? { x: 72, y: 80 } : { x: 176, y: 40 },
    targetCenter: player ? { x: 176, y: 42 } : { x: 72, y: 88 },
    attackerSpriteSlot: monbg[0]!, targetSpriteSlot: targetSlot,
    rapidSpriteSlot: 3, impactSpriteSlot: 3, impactMatrixSlot: 0,
    elevationTaskSlot: 0, shakeTaskSlot: 0, monbgTaskSlot: 1,
    clearTaskSlot: 0, soundTaskSlot: 2,
    spriteOrder: rows[0]!.spriteOrder,
    paletteBanks: {
      impact: rows[1]!.paletteTags.indexOf(10135),
      rapidSpin: rows[4]!.paletteTags.indexOf(10229),
    },
    tileSlots: {
      impact: rows[1]!.tileTags.indexOf(10135),
      rapidSpin: rows[4]!.tileTags.indexOf(10229),
    },
    baseMatrixBitmap: rows[0]!.resourceAllocators.matrixBitmap,
    movePower: rows[0]!.animationMovePower,
    moveDamage: rows[0]!.animationMoveDamage,
    targetInitialOffset: { x: target.x2, y: target.y2 },
    animationRng: rows[0]!.animationRng,
    monbg: {
      layer: player ? "bg2" : "bg1", spriteX: monbg[1]!, spriteY: monbg[2]!,
      bgX: monbg[3]!, bgY: monbg[4]!, inBg2: Boolean(monbg[5]),
      battlerId: monbg[6] as 0 | 1,
    },
    initialScanlineSrcBuffer: rows[0]!.scanline.srcBuffer,
    initialScanlineBanks: rows[0]!.scanlineBuffers,
  };
}

function assertRow(orientation: Orientation, age: number, row: Json, input: RapidSpinLiveInputs): void {
  const reduced = rapidSpinAtAge(age, { ...input, animationRng: row.animationRng });
  const prefix = `${orientation} age ${age}`;
  if (!same(
    [reduced.source.owner, reduced.source.offset, reduced.source.pointer,
      reduced.source.pointerParity, reduced.source.wait, reduced.active],
    [row.scriptOwner, row.scriptOffset, row.scriptPtr, row.scriptPtrParity,
      row.scriptWait, row.animScriptActive],
  )) throw new Error(`${prefix}: source cursor drift`);

  for (const [actualName, expected, symbol] of [
    ["elevation", reduced.elevationTask, "RapinSpinMonElevation_Step"],
    ["shake", reduced.shakeTask, "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step"],
    ["monbg", reduced.monbgTask, "Task_UpdateMonBg"],
    ["clear", reduced.clearTask, "Task_ClearMonBg"],
    ["sound", reduced.soundTask, "Task_LoopAndPlaySE"],
  ] as const) {
    const actual = task(row, symbol);
    if (!same(actual ? { slot: actual.slot, data: actual.data } : null,
      expected ? { slot: expected.slot, data: expected.data } : null)) {
      throw new Error(`${prefix}: ${actualName} task drift`);
    }
  }

  const rapid = row.sprites.find((sprite: Json) =>
    sprite.template?.symbol === "gRapidSpinSpriteTemplate");
  if (!same(rapid ? {
    slot: rapid.slot, template: rapid.template.symbol,
    callback: rapid.callback?.symbol, x: rapid.x, y: rapid.y,
    x2: rapid.x2, y2: rapid.y2, animationFrame: rapid.animCmdIndex,
    animationDelay: rapid.animDelayCounter, data: rapid.data,
  } : null, reduced.rapidSpin)) throw new Error(`${prefix}: Rapid Spin sprite drift`);

  const impact = row.sprites.find((sprite: Json) =>
    sprite.template?.symbol === "gBasicHitSplatSpriteTemplate");
  if (!same(impact ? {
    slot: impact.slot, matrixSlot: impact.matrixNum,
    template: impact.template.symbol, callback: impact.callback?.symbol,
    x: impact.x, y: impact.y, animation: 2, matrix: impact.matrix,
    data: impact.data,
  } : null, reduced.impact)) throw new Error(`${prefix}: IMPACT sprite drift`);

  const target = row.sprites.find((sprite: Json) => sprite.slot === input.targetSpriteSlot)!;
  if (!same(reduced.targetOffset, { x: target.x2, y: target.y2 })) {
    throw new Error(`${prefix}: target shake axes drift`);
  }
  if (!same(reduced.scanline.banks, row.scanlineBuffers)
    || reduced.scanline.state !== row.scanline.state
    || reduced.scanline.srcBuffer !== row.scanline.srcBuffer) {
    const first = reduced.scanline.banks.flatMap((bank, bankIndex) =>
      bank.flatMap((value, index) => value !== row.scanlineBuffers[bankIndex][index]
        ? [{ bank: bankIndex, index, expected: row.scanlineBuffers[bankIndex][index], actual: value }]
        : [])).at(0);
    throw new Error(`${prefix}: scanline banks/state drift ${JSON.stringify(first)}`);
  }
  if (!same(reduced.monbg.registers, {
    bg1hofs: row.registers.bg1hofs, bg1vofs: row.registers.bg1vofs,
    bg2hofs: row.registers.bg2hofs, bg2vofs: row.registers.bg2vofs,
  }) || !same([reduced.monbg.bgX, reduced.monbg.bgY], [
    row.battleBg.gBattle_BG1_X || row.battleBg.gBattle_BG2_X,
    row.battleBg.gBattle_BG1_Y || row.battleBg.gBattle_BG2_Y,
  ])) throw new Error(`${prefix}: monbg registers drift`);

  if (reduced.resources.matrixBitmap !== row.resourceAllocators.matrixBitmap
    || reduced.resources.impactLoaded !== row.paletteTags.includes(10135)
    || reduced.resources.rapidSpinLoaded !== row.paletteTags.includes(10229)
    || reduced.visualTaskCount !== row.visualTaskCount
    || reduced.soundTaskCount !== row.soundTaskCount
    || reduced.animationRng !== row.animationRng) {
    throw new Error(`${prefix}: resource/count/RNG drift`);
  }
}

export function verifyRapidSpinReducer(): Record<Orientation, Json> {
  const result = {} as Record<Orientation, Json>;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const stem = orientation === "player-back" ? "player" : "opponent";
    const probe = JSON.parse(gunzipSync(readFileSync(
      `tools/compare/evidence/rapid-spin-${stem}-dense-state.json.gz`,
    )).toString("utf8")) as Json;
    const rows = probe.frames as Json[];
    const inputs = inputsFor(orientation, rows);
    const player = orientation === "player-back";
    const config: SceneOnRapidSpinConfig = {
      move: "RAPID_SPIN",
      attacker: battler("WARTORTLE", player ? "player" : "opponent", inputs.attackerCenter),
      target: battler("ONIX", player ? "opponent" : "player", inputs.targetCenter),
      fieldProfile: {
        playerHp: 100, playerMaxHp: 100, opponentHp: 100, opponentMaxHp: 100,
        playerGender: "male", opponentGender: "male",
      },
      animationInputs: (({
        attackerSide: _as, targetSide: _ts, attackerSpecies: _asp,
        targetSpecies: _tsp, attackerCenter: _ac, targetCenter: _tc, ...rest
      }) => rest)(inputs),
    };
    const stage = createSceneOnMovePresentation(config);
    for (const [age, row] of rows.entries()) {
      assertRow(orientation, age, row, inputs);
      const reduced = rapidSpinAtAge(age, { ...inputs, animationRng: row.animationRng });
      const view = sceneOnRapidSpinView({
        ...stage, age,
        config: { ...config, animationInputs: { ...config.animationInputs, animationRng: row.animationRng } },
      });
      const { attacker: _attacker, target: _target, ...seam } = view;
      if (!same(seam, reduced)) throw new Error(`${orientation} age ${age}: typed seam drift`);
    }
    result[orientation] = {
      reducerRows: rows.length, seamRows: rows.length,
      cleanup: { age: rows.length - 1, active: false },
    };
  }
  return result;
}

if (process.argv[1]?.endsWith("verifyRapidSpinReducer.ts")) {
  console.log(JSON.stringify(verifyRapidSpinReducer()));
}
