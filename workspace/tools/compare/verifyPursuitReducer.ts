/** Strict retained-state replay for MOVE_PURSUIT's reducer and typed seam. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  PURSUIT_FIRST_INACTIVE_AGE,
  PURSUIT_IMPACT_TAG,
  pursuitAtAge,
  type PursuitLiveInputs,
  type PursuitState,
} from "../../src/animation/pursuit.ts";
import {
  sceneOnPursuitView,
  type SceneOnPursuitPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type PursuitWindow = "player-back" | "opponent-front" | "switchout-opponent-front";

const root = resolve(import.meta.dirname, "../..");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const digest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_PURSUIT reducer drift: ${message}`);
}

const OWNED_TASKS = new Set([
  "Task_FadeToBg",
  "Task_UpdateMonBg",
  "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step",
  "Task_ClearMonBg",
]);

function fileFor(window: PursuitWindow): string {
  switch (window) {
    case "player-back": return "tools/compare/evidence/pursuit-player-dense-state.json.gz";
    case "opponent-front": return "tools/compare/evidence/pursuit-opponent-dense-state.json.gz";
    case "switchout-opponent-front": return "tools/compare/evidence/pursuit-switchout-opponent-dense-state.json.gz";
  }
}

export function pursuitRowsFor(window: PursuitWindow): Json[] {
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, fileFor(window)))).toString("utf8")) as Json).frames;
}

function taskAt(row: Json, symbol: string): Json | undefined {
  return row.tasks.find((entry: Json) => entry.func?.symbol === symbol);
}

function completeTaskData(value: readonly number[] | undefined): readonly number[] {
  return value ?? Array.from({ length: 16 }, () => 0);
}

function branchFor(window: PursuitWindow): PursuitLiveInputs["branch"] {
  return window === "switchout-opponent-front" ? "switchout" : "normal";
}

function sidesFor(window: PursuitWindow): Readonly<{ attacker: "player" | "opponent"; target: "player" | "opponent" }> {
  return window === "player-back"
    ? { attacker: "player", target: "opponent" }
    : { attacker: "opponent", target: "player" };
}

/** Builds one live Scene-ON snapshot; retained rows never enter production. */
export function pursuitInputsFor(
  window: PursuitWindow,
  rows: readonly Json[] = pursuitRowsFor(window),
  age = 0,
): PursuitLiveInputs {
  const current = rows[age]!;
  const first = rows[0]!;
  const sides = sidesFor(window);
  const update = taskAt(rows[4]!, "Task_UpdateMonBg")!;
  const clear = taskAt(rows[59]!, "Task_ClearMonBg")!;
  const fadeToDark = taskAt(rows[7]!, "Task_FadeToBg")!;
  const restoreBattle = taskAt(rows[63]!, "Task_FadeToBg")!;
  const impact = rows[47]!.sprites.find((entry: Json) =>
    entry.template?.symbol === "gBasicHitSplatSpriteTemplate");
  invariant(impact, `${window}: missing IMPACT allocation`);
  const impactPaletteSlot = rows[1]!.paletteTags.indexOf(PURSUIT_IMPACT_TAG);
  const impactTileSlot = rows[1]!.tileTags.indexOf(PURSUIT_IMPACT_TAG);
  invariant(impactPaletteSlot >= 0 && impactTileSlot >= 0, `${window}: missing IMPACT resource allocation`);
  const currentFade = taskAt(current, "Task_FadeToBg")?.data;
  return {
    attackerSide: sides.attacker,
    targetSide: sides.target,
    attackerSpecies: "BEEDRILL",
    targetSpecies: "SHUCKLE",
    attackerCenter: { x: current.battlerSprites.attacker.x, y: current.battlerSprites.attacker.y },
    targetCenter: { x: current.battlerSprites.target.x, y: current.battlerSprites.target.y },
    targetImpactCenter: { x: impact.x, y: impact.y },
    branch: branchFor(window),
    attackerSpriteSlot: current.battlerSprites.attacker.slot,
    targetSpriteSlot: current.battlerSprites.target.slot,
    attackerAttr2: current.battlerSprites.attacker.attr[2],
    targetAttr2: current.battlerSprites.target.attr[2],
    targetInitialOffset: { x: first.battlerSprites.target.x2, y: first.battlerSprites.target.y2 },
    taskSlots: {
      fadeToDark: fadeToDark.slot,
      monbg: update.slot,
      shake: taskAt(rows[47]!, "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step")!.slot,
      clearMonbg: clear.slot,
      restoreBattle: restoreBattle.slot,
    },
    impact: {
      slot: impact.slot,
      matrixSlot: impact.matrixNum,
      attr: impact.attr,
      subpriority: impact.subpriority,
      paletteSlot: impactPaletteSlot,
      tileSlot: impactTileSlot,
      allocator: current.resourceAllocators,
    },
    monbg: {
      layer: sides.target === "player" ? "bg2" : "bg1",
      spriteX: update.data[1],
      spriteY: update.data[2],
      bgX: update.data[3],
      bgY: update.data[4],
      inBg2: Boolean(update.data[5]),
      battlerId: update.data[6] as 0 | 1,
    },
    spriteOrder: current.spriteOrder,
    buffers: {
      softwareOam: current.softwareOam,
      hardwareOam: current.hardwareOam,
      softwareMatrices: current.softwareMatrices,
      hardwareMatrices: current.hardwareMatrices,
    },
    palette: {
      unfaded: current.unfadedPalette,
      faded: current.fadedPalette,
      hardware: current.hardwarePalette,
    },
    registers: current.registers,
    background: {
      currentVram: current.bgVram,
      battleVram: first.bgVram,
      darkVram: rows[26]!.bgVram,
    },
    sharedTaskData: {
      fadeToDark: completeTaskData(currentFade ?? fadeToDark.data),
      restoreBattle: completeTaskData(currentFade ?? restoreBattle.data),
    },
    audio: {
      current: current.audio,
      targetPan: rows[47]!.audio.SE1.tracks[0]!.panX,
    },
    liveCounts: {
      visualTasks: current.visualTaskCount,
      soundTasks: current.soundTaskCount,
      matrixBitmap: current.resourceAllocators.matrixBitmap,
    },
    movePower: first.animationMovePower,
    moveDamage: first.animationMoveDamage,
    animationRng: current.animationRng,
    gameplayRng: current.rawBattleState.gameplayRng,
    gameplayState: current.immutableState,
  };
}

export function pursuitConfigFor(
  window: PursuitWindow,
  rows: readonly Json[] = pursuitRowsFor(window),
  age = 0,
): SceneOnPursuitPresentationState["config"] {
  const input = pursuitInputsFor(window, rows, age);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, attackerCenter, targetCenter, targetImpactCenter, ...animationInputs } = input;
  const first = rows[0]!;
  return {
    move: "PURSUIT",
    attacker: {
      species: attackerSpecies as never,
      geometry: {
        side: attackerSide,
        spriteCorner: { x: attackerCenter.x - 32, y: attackerCenter.y - 32 },
        animationCenter: attackerCenter,
        battlePositionCenter: attackerCenter,
      },
    },
    target: {
      species: targetSpecies as never,
      geometry: {
        side: targetSide,
        spriteCorner: { x: targetCenter.x - 32, y: targetCenter.y - 32 },
        animationCenter: targetCenter,
        battlePositionCenter: targetImpactCenter,
      },
    },
    fieldProfile: {
      playerHp: first.parties.player[0].hp,
      playerMaxHp: first.parties.player[0].maxHp,
      opponentHp: first.parties.opponent[0].hp,
      opponentMaxHp: first.parties.opponent[0].maxHp,
      playerGender: first.parties.player[0].gender,
      opponentGender: first.parties.opponent[0].gender,
    },
    animationInputs,
  };
}

function retainedTasks(row: Json): Json[] {
  return row.tasks
    .filter((entry: Json) => OWNED_TASKS.has(entry.func?.symbol))
    .map((entry: Json) => ({ slot: entry.slot, callback: entry.func.symbol, data: entry.data }))
    .sort((left: Json, right: Json) => left.slot - right.slot || left.callback.localeCompare(right.callback));
}

function reducedTasks(state: PursuitState): Json[] {
  return state.tasks.map((entry) => ({ slot: entry.slot, callback: entry.callback, data: entry.data }));
}

function retainedImpact(row: Json): Json | null {
  const entry = row.sprites.find((sprite: Json) => sprite.template?.symbol === "gBasicHitSplatSpriteTemplate");
  return entry ? {
    slot: entry.slot,
    template: entry.template.symbol,
    callback: entry.callback.symbol,
    matrixSlot: entry.matrixNum,
    matrix: entry.matrix,
    attr: entry.attr,
    subpriority: entry.subpriority,
    painterIndex: row.spriteOrder.indexOf(entry.slot),
    x: entry.x,
    y: entry.y,
    x2: entry.x2,
    y2: entry.y2,
    data: entry.data,
  } : null;
}

function reducedImpact(state: PursuitState): Json | null {
  const entry = state.impact;
  return entry ? {
    slot: entry.slot,
    template: entry.template,
    callback: entry.callback,
    matrixSlot: entry.matrixSlot,
    matrix: entry.matrix,
    attr: entry.attr,
    subpriority: entry.subpriority,
    painterIndex: entry.painterIndex,
    x: entry.x,
    y: entry.y,
    x2: entry.x2,
    y2: entry.y2,
    data: entry.data,
  } : null;
}

function wrapped(value: number): number {
  return ((value % 512) + 512) % 512;
}

function assertOpaqueGameplay(window: PursuitWindow, age: number, row: Json, first: Json): void {
  for (const key of ["playerParty", "opponentParty", "battleMons", "battleOutcome", "battleWeather", "gameplayRng"]) {
    invariant(same(row.rawBattleState[key], first.rawBattleState[key]), `${window}/${age}: opaque gameplay ${key}`);
  }
  invariant(same(row.immutableState, first.immutableState), `${window}/${age}: immutable gameplay state`);
}

function compareRow(window: PursuitWindow, rows: readonly Json[], age: number): PursuitState {
  const row = rows[age]!;
  const input = pursuitInputsFor(window, rows, age);
  const state = pursuitAtAge(age, input);
  invariant(state.active === row.animScriptActive
    && state.source.pointer === row.scriptPtr
    && state.source.pointerOffset === row.scriptPtr - 0x082c_a980
    && state.source.wait === row.scriptWait
    && state.source.branch === branchFor(window), `${window}/${age}: root cursor/wait/branch`);
  invariant(same(state.animArgs, row.animArgs), `${window}/${age}: complete source anim args`);
  invariant(same(reducedTasks(state), retainedTasks(row)), `${window}/${age}: complete owned task slots/callbacks/data`);
  invariant(same(reducedImpact(state), retainedImpact(row)), `${window}/${age}: selected IMPACT branch/OAM/matrix/data`);
  invariant(same(state.battlers.attacker.center, { x: row.battlerSprites.attacker.x, y: row.battlerSprites.attacker.y })
    && same(state.battlers.target.center, { x: row.battlerSprites.target.x, y: row.battlerSprites.target.y }), `${window}/${age}: live geometry`);
  invariant(same(state.shake.targetOffset, { x: row.battlerSprites.target.x2, y: row.battlerSprites.target.y2 }), `${window}/${age}: source power-shake offset`);
  const bg = input.monbg.layer === "bg1" ? "gBattle_BG1_X" : "gBattle_BG2_X";
  const hofs = input.monbg.layer === "bg1" ? "bg1hofs" : "bg2hofs";
  invariant(state.shake.sourceScroll.x === row.battleBg[bg]
    && state.monbg.active === (age >= 4 && age <= 61)
    && state.monbg.clear === (age >= 59 && age <= 61), `${window}/${age}: target monbg source scroll`);
  if (age >= 5) {
    invariant(row.registers[hofs] === wrapped(rows[age - 1]!.battleBg[bg]), `${window}/${age}: selected monbg hardware HOFS lag`);
  }
  invariant(state.painterOrder === row.spriteOrder, `${window}/${age}: live source painter order`);
  invariant(same(state.buffers.softwareOam, row.softwareOam)
    && same(state.buffers.hardwareOam, row.hardwareOam)
    && same(state.buffers.softwareMatrices, row.softwareMatrices)
    && same(state.buffers.hardwareMatrices, row.hardwareMatrices), `${window}/${age}: whole OAM/matrix buffers`);
  invariant(same(state.palette.unfaded, row.unfadedPalette)
    && same(state.palette.faded, row.fadedPalette)
    && same(state.palette.hardware, row.hardwarePalette), `${window}/${age}: complete live palette buffers`);
  invariant(same(state.registers, row.registers) && same(state.background.vram, row.bgVram), `${window}/${age}: registers and BG VRAM`);
  const loaded = row.paletteTags.includes(PURSUIT_IMPACT_TAG) && row.tileTags.includes(PURSUIT_IMPACT_TAG);
  invariant(state.resources.impactLoaded === loaded
    && state.resources.paletteSlot === (loaded ? input.impact.paletteSlot : null)
    && state.resources.paletteBank === (loaded ? 16 + input.impact.paletteSlot : null)
    && state.resources.tileSlot === (loaded ? input.impact.tileSlot : null)
    && state.resources.matrixBitmap === row.resourceAllocators.matrixBitmap
    && same(state.resources.allocator, row.resourceAllocators), `${window}/${age}: IMPACT allocation history/resource lifecycle`);
  invariant(same(state.audio.live, row.audio), `${window}/${age}: live audio state`);
  const expectedAudio = age === 47 ? [{ channel: "SE1", sound: "SE_M_COMET_PUNCH", pan: row.audio.SE1.tracks[0]!.panX }] : [];
  invariant(same(state.audio.events, expectedAudio), `${window}/${age}: source audio command/pan`);
  invariant(state.rng.animation === row.animationRng && state.rng.gameplayUnchanged
    && same(state.rng.gameplay, row.rawBattleState.gameplayRng)
    && same(state.gameplay, row.immutableState), `${window}/${age}: presentation/gameplay RNG boundary`);
  invariant(state.cleanup.visualTasks === row.visualTaskCount
    && state.cleanup.soundTasks === row.soundTaskCount
    && state.cleanup.ownedSprites === Number(retainedImpact(row) !== null)
    && state.cleanup.firstInactive === (age === PURSUIT_FIRST_INACTIVE_AGE)
    && state.cleanup.resourcesReleased === (age >= PURSUIT_FIRST_INACTIVE_AGE), `${window}/${age}: inactive cleanup ownership`);
  assertOpaqueGameplay(window, age, row, rows[0]!);

  if (age === 0) {
    invariant(state.displayTransfer.oam === "initial"
      && state.displayTransfer.matrices === "initial"
      && state.displayTransfer.palette === "initial"
      && state.displayTransfer.monbgHofs === "initial", `${window}/0: initial transfer`);
  } else {
    const previous = rows[age - 1]!;
    invariant(same(row.hardwareOam, previous.softwareOam)
      && same(row.hardwareMatrices, previous.softwareMatrices), `${window}/${age}: predecessor OAM/matrix transfer`);
    const paletteExpected = age === 4 ? row.fadedPalette : previous.fadedPalette;
    invariant(same(row.hardwarePalette, paletteExpected)
      && state.displayTransfer.palette === (age === 4 ? "same-row-monbg" : "preceding-faded")
      && state.displayTransfer.oam === "preceding-software"
      && state.displayTransfer.matrices === "preceding-software"
      && state.displayTransfer.directBlendRegisters === "current-source", `${window}/${age}: palette/register latch`);
  }
  if (age >= 47 && age <= 58) {
    invariant(row.registers.bldcnt === 0x3f40 && row.registers.bldalpha === 0x080c,
      `${window}/${age}: direct setalpha schedule`);
  }
  if (age >= 59) invariant(row.registers.bldalpha === 0, `${window}/${age}: direct blendoff schedule`);
  return state;
}

function replay(window: PursuitWindow) {
  const rows = pursuitRowsFor(window);
  invariant(rows.length === 103 && !rows.at(-1)!.animScriptActive, `${window}: complete 103-row cleanup`);
  const reducerDigests: string[] = [];
  const seamDigests: string[] = [];
  let reducerRows = 0;
  let seamRows = 0;
  for (let pass = 0; pass < 2; pass += 1) {
    const reducerHasher = createHash("sha256");
    const seamHasher = createHash("sha256");
    for (const [age] of rows.entries()) {
      const state = compareRow(window, rows, age);
      const config = pursuitConfigFor(window, rows, age);
      const seam = sceneOnPursuitView({ age, config } as SceneOnPursuitPresentationState);
      const { attacker, target, ...plainSeam } = seam;
      invariant(same(plainSeam, state), `${window}/${age}: narrow typed Scene-ON seam`);
      invariant(same(attacker, config.attacker) && same(target, config.target), `${window}/${age}: live seam battlers`);
      reducerHasher.update(JSON.stringify(state));
      seamHasher.update(JSON.stringify(plainSeam));
      reducerRows += 1;
      seamRows += 1;
    }
    reducerDigests.push(reducerHasher.digest("hex"));
    seamDigests.push(seamHasher.digest("hex"));
  }
  invariant(reducerDigests[0] === reducerDigests[1] && seamDigests[0] === seamDigests[1], `${window}: twice-run reducer/seam determinism`);
  const cleanup = pursuitAtAge(PURSUIT_FIRST_INACTIVE_AGE, pursuitInputsFor(window, rows, PURSUIT_FIRST_INACTIVE_AGE));
  invariant(!cleanup.active && cleanup.tasks.length === 0 && cleanup.impact === null && cleanup.cleanup.resourcesReleased,
    `${window}: first inactive cleanup`);
  return {
    retainedRows: rows.length,
    reducerRows,
    seamRows,
    reducerSha256: reducerDigests[0],
    seamSha256: seamDigests[0],
    framebufferCompared: false,
    coverageCredit: false,
  } as const;
}

/** Replays all 309 retained normal/switch-interception rows twice. */
export function verifyPursuitReducer() {
  const player = replay("player-back");
  const opponent = replay("opponent-front");
  const switchout = replay("switchout-opponent-front");
  return {
    "player-back": player,
    "opponent-front": opponent,
    "switchout-opponent-front": switchout,
    allWindows: {
      retainedRows: player.retainedRows + opponent.retainedRows + switchout.retainedRows,
      passes: 2,
      reducerRows: player.reducerRows + opponent.reducerRows + switchout.reducerRows,
      seamRows: player.seamRows + opponent.seamRows + switchout.seamRows,
      reducerSha256: digest([player.reducerSha256, opponent.reducerSha256, switchout.reducerSha256]),
      seamSha256: digest([player.seamSha256, opponent.seamSha256, switchout.seamSha256]),
      framebufferCompared: false,
      coverageCredit: false,
    },
  } as const;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyPursuitReducer(), null, 2));
}
