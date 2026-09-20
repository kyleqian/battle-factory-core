/** Hermetic retained-row reducer/seam replay for every MOVE_RETURN selector branch. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  RETURN_IMPACT_TAG,
  returnAtAge,
  type ReturnLiveInputs,
  type ReturnState,
} from "../../src/animation/return.ts";
import {
  sceneOnReturnView,
  type SceneOnReturnPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type ReturnBranch = "weak" | "medium" | "strong" | "strongest";
export type ReturnOrientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const branches: readonly ReturnBranch[] = ["weak", "medium", "strong", "strongest"];
const orientations: readonly ReturnOrientation[] = ["player-back", "opponent-front"];
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const digest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_RETURN reducer drift: ${message}`);
}

const CONTRACT: Readonly<Record<ReturnBranch, Readonly<{
  friendship: number;
  rows: number;
  inactive: number;
  clearStart: number;
  vertical: readonly number[];
  horizontal: readonly number[];
  impacts: readonly number[];
  shakes: readonly number[];
  traces: readonly number[];
  blends: readonly number[];
}>>> = {
  weak: { friendship: 60, rows: 88, inactive: 87, clearStart: 83, vertical: [11, 47], horizontal: [], impacts: [54], shakes: [], traces: [], blends: [] },
  medium: { friendship: 61, rows: 100, inactive: 99, clearStart: 75, vertical: [11, 27], horizontal: [56], impacts: [64], shakes: [], traces: [], blends: [] },
  strong: { friendship: 200, rows: 125, inactive: 124, clearStart: 120, vertical: [11, 27, 43, 59], horizontal: [], impacts: [75, 85, 95, 105], shakes: [75, 85, 95, 105], traces: [], blends: [] },
  strongest: { friendship: 255, rows: 282, inactive: 281, clearStart: 277, vertical: [24, 60, 94, 120, 135, 157, 172, 187, 202], horizontal: [], impacts: [34, 67, 101, 120, 142, 157, 172, 187, 202, 217, 225, 233, 241], shakes: [67, 101, 120, 142, 157, 172, 187, 202, 217], traces: [120, 120, 142, 157, 172, 187, 202], blends: [11, 264] },
};

function stemFor(branch: ReturnBranch, orientation: ReturnOrientation): string {
  const side = orientation === "player-back" ? "player" : "opponent";
  return branch === "strongest" ? `return-${side}` : `return-${branch}-${side}`;
}

export function returnRowsFor(branch: ReturnBranch, orientation: ReturnOrientation): Json[] {
  return (JSON.parse(
    gunzipSync(readFileSync(resolve(
      root,
      `tools/compare/evidence/${stemFor(branch, orientation)}-dense-state.json.gz`,
    ))).toString("utf8"),
  ) as Json).frames;
}

function sidesFor(orientation: ReturnOrientation): Readonly<{ attacker: "player" | "opponent"; target: "player" | "opponent" }> {
  return orientation === "player-back"
    ? { attacker: "player", target: "opponent" }
    : { attacker: "opponent", target: "player" };
}

function taskAt(row: Json, symbol: string): Json | undefined {
  return row.tasks.find((entry: Json) => entry.func?.symbol === symbol);
}

function ownedSprites(row: Json, template: string): Json[] {
  return row.sprites.filter((entry: Json) => entry.template?.symbol === template)
    .sort((left: Json, right: Json) => left.slot - right.slot);
}

function bornSprite(rows: readonly Json[], age: number, template: string, ordinal = 0): Json {
  const present = ownedSprites(rows[age]!, template);
  const earlier = new Set(age === 0 ? [] : ownedSprites(rows[age - 1]!, template).map((entry) => entry.slot));
  const born = present.filter((entry) => !earlier.has(entry.slot));
  const chosen = born[ordinal] ?? present[ordinal];
  invariant(chosen, `age ${age}: missing ${template} allocation`);
  return chosen;
}

function artAt(entry: Json, species: string): ReturnLiveInputs["attackerArt"] {
  return {
    displaySpecies: species,
    slot: entry.slot,
    attr: [entry.attr[0], entry.attr[1], entry.attr[2]],
    subpriority: entry.subpriority,
    matrixNum: entry.matrixNum,
    matrix: [entry.matrix[0], entry.matrix[1], entry.matrix[2], entry.matrix[3]],
  };
}

function taskSlotsAtStarts(rows: readonly Json[], starts: readonly number[], symbol: string, initialRemaining?: number): number[] {
  return starts.map((start) => {
    const candidates = rows[start]!.tasks.filter((entry: Json) => entry.func?.symbol === symbol);
    const exact = initialRemaining === undefined ? candidates : candidates.filter((entry: Json) => entry.data?.[1] === initialRemaining);
    const chosen = exact.at(-1) ?? candidates.at(-1);
    invariant(chosen, `age ${start}: missing ${symbol}`);
    return chosen.slot;
  });
}

function traceSlotsAtStarts(rows: readonly Json[], starts: readonly number[], symbol: "task" | "clone"): number[] {
  const seen = new Map<number, number>();
  return starts.map((start) => {
    const index = seen.get(start) ?? 0;
    seen.set(start, index + 1);
    const candidates = symbol === "task"
      ? rows[start]!.tasks.filter((entry: Json) => entry.func?.symbol === "AnimTask_TraceMonBlended_Step")
        .sort((left: Json, right: Json) => left.slot - right.slot)
      : rows[start]!.sprites.filter((entry: Json) => entry.template?.symbol === "gMultiuseSpriteTemplate"
          && entry.callback?.symbol === "AnimMonTrace")
        .sort((left: Json, right: Json) => left.slot - right.slot);
    const chosen = candidates[index];
    invariant(chosen, `age ${start}: missing Return trace ${symbol}`);
    return chosen.slot;
  });
}

/** Builds a current live Scene-ON snapshot; retained recordings stay in this verifier only. */
export function returnInputsFor(
  branch: ReturnBranch,
  orientation: ReturnOrientation,
  rows: readonly Json[] = returnRowsFor(branch, orientation),
  age = 0,
): ReturnLiveInputs {
  const contract = CONTRACT[branch], current = rows[age]!, first = rows[0]!;
  const sides = sidesFor(orientation);
  const firstMonbg = taskAt(rows[4]!, "Task_UpdateMonBg")!;
  const clear = taskAt(rows[contract.clearStart]!, "Task_ClearMonBg")!;
  const currentMonbg = taskAt(current, "Task_UpdateMonBg") ?? firstMonbg;
  const currentClear = taskAt(current, "Task_ClearMonBg") ?? clear;
  const attackerSpecies = first.parties[sides.attacker][0].species as string;
  const targetSpecies = first.parties[sides.target][0].species as string;
  const impactAllocations = contract.impacts.map((start, sourceCreationOrder) => {
    const sprite = bornSprite(rows, start, "gBasicHitSplatSpriteTemplate");
    return { slot: sprite.slot, matrixNum: sprite.matrixNum,
      attr: [sprite.attr[0], sprite.attr[1], sprite.attr[2]] as const,
      subpriority: sprite.subpriority, sourceCreationOrder };
  });
  const verticalDip = contract.vertical.map((start) => bornSprite(rows, start, "gVerticalDipSpriteTemplate").slot);
  const tileIndex = current.tileTags.indexOf(RETURN_IMPACT_TAG);
  const paletteIndex = current.paletteTags.indexOf(RETURN_IMPACT_TAG);
  const layer = sides.target === "opponent" ? "bg1" as const : "bg2" as const;
  const scroll = layer === "bg1"
    ? { x: current.battleBg.gBattle_BG1_X, y: current.battleBg.gBattle_BG1_Y }
    : { x: current.battleBg.gBattle_BG2_X, y: current.battleBg.gBattle_BG2_Y };
  return {
    attackerSide: sides.attacker, targetSide: sides.target,
    attackerSpecies, targetSpecies, friendship: contract.friendship,
    attackerCenter: { x: first.battlerSprites.attacker.x, y: first.battlerSprites.attacker.y },
    targetCenter: { x: first.battlerSprites.target.x, y: first.battlerSprites.target.y },
    attackerInitialOffset: { x2: first.battlerSprites.attacker.x2, y2: first.battlerSprites.attacker.y2 },
    targetInitialOffset: { x2: first.battlerSprites.target.x2, y2: first.battlerSprites.target.y2 },
    attackerArt: artAt(current.battlerSprites.attacker, attackerSpecies),
    targetArt: artAt(current.battlerSprites.target, targetSpecies),
    taskSlots: {
      monbg: firstMonbg.slot, clearMonbg: clear.slot,
      shake: taskSlotsAtStarts(rows, contract.shakes, "AnimTask_ShakeMon_Step", undefined),
      trace: traceSlotsAtStarts(rows, contract.traces, "task"),
    },
    motionSlots: {
      verticalDip,
      horizontalLunge: contract.horizontal.length ? bornSprite(rows, contract.horizontal[0]!, "gHorizontalLungeSpriteTemplate").slot : 0,
    },
    impactAllocations,
    traceAllocations: traceSlotsAtStarts(rows, contract.traces, "clone").map((slot, sourceCreationOrder) => ({ slot, sourceCreationOrder })),
    spriteOrder: current.spriteOrder,
    buffers: {
      softwareOam: current.softwareOam, hardwareOam: current.hardwareOam,
      softwareMatrices: current.softwareMatrices, hardwareMatrices: current.hardwareMatrices,
    },
    palette: { unfaded: current.unfadedPalette, faded: current.fadedPalette, hardware: current.hardwarePalette },
    registers: current.registers,
    background: {
      current: current.battleBg, battle: first.battleBg, sourceScroll: scroll, layer,
      monbgTaskData: currentMonbg.data, clearTaskData: currentClear.data,
    },
    resources: {
      impactTag: RETURN_IMPACT_TAG,
      tileSlot: tileIndex >= 0 ? tileIndex : null,
      paletteSlot: paletteIndex >= 0 ? paletteIndex : null,
      paletteBank: paletteIndex >= 0 ? 16 + paletteIndex : null,
      tileRange: tileIndex >= 0 ? current.resourceAllocators.tileRanges[tileIndex] : null,
      allocator: current.resourceAllocators,
    },
    audio: {
      current: current.audio,
      attackerPan: sides.attacker === "player" ? -64 : 63,
      targetPan: sides.target === "player" ? -64 : 63,
    },
    liveCounts: { visualTasks: current.visualTaskCount, soundTasks: current.soundTaskCount,
      matrixBitmap: current.resourceAllocators.matrixBitmap },
    animationRng: current.animationRng,
    gameplayRng: current.rawBattleState.gameplayRng,
    gameplayState: current.immutableState,
  };
}

export function returnConfigFor(
  branch: ReturnBranch,
  orientation: ReturnOrientation,
  rows: readonly Json[] = returnRowsFor(branch, orientation),
  age = 0,
): SceneOnReturnPresentationState["config"] {
  const input = returnInputsFor(branch, orientation, rows, age);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, attackerCenter, targetCenter, ...animationInputs } = input;
  const first = rows[0]!;
  return {
    move: "RETURN",
    attacker: { species: attackerSpecies as never, geometry: {
      side: attackerSide, spriteCorner: { x: attackerCenter.x - 32, y: attackerCenter.y - 32 },
      animationCenter: attackerCenter, battlePositionCenter: attackerCenter,
    } },
    target: { species: targetSpecies as never, geometry: {
      side: targetSide, spriteCorner: { x: targetCenter.x - 32, y: targetCenter.y - 32 },
      animationCenter: targetCenter, battlePositionCenter: targetCenter,
    } },
    fieldProfile: {
      playerHp: first.parties.player[0].hp, playerMaxHp: first.parties.player[0].maxHp,
      opponentHp: first.parties.opponent[0].hp, opponentMaxHp: first.parties.opponent[0].maxHp,
      playerGender: first.parties.player[0].gender, opponentGender: first.parties.opponent[0].gender,
      playerStatus: first.parties.player[0].status.kind, opponentStatus: first.parties.opponent[0].status.kind,
    },
    animationInputs,
  };
}

function rawOwnedTaskCount(row: Json): number {
  const owned = new Set(["Task_UpdateMonBg", "Task_ClearMonBg", "AnimTask_ShakeMon_Step", "AnimTask_TraceMonBlended_Step"]);
  return row.tasks.filter((entry: Json) => owned.has(entry.func?.symbol)).length;
}

function compact(state: ReturnState): unknown {
  return {
    age: state.age, active: state.active, source: state.source, selector: state.selector,
    args: state.animArgs, tasks: state.tasks, verticalDips: state.verticalDips,
    horizontalLunge: state.horizontalLunge, impacts: state.impacts, traces: state.traces,
    lifecycle: state.lifecycle, monbg: state.monbg, paletteBlend: state.paletteBlend,
    resources: state.resources, audio: state.audio, rng: state.rng,
    offsets: { attacker: state.battlers.attacker.offset, target: state.battlers.target.offset },
    displayTransfer: state.displayTransfer, cleanup: state.cleanup,
  };
}

function compareRow(
  branch: ReturnBranch,
  orientation: ReturnOrientation,
  age: number,
  rows: readonly Json[],
): void {
  const contract = CONTRACT[branch], row = rows[age]!;
  const input = returnInputsFor(branch, orientation, rows, age);
  const state = returnAtAge(age, input);
  invariant(state.active === row.animScriptActive, `${branch}/${orientation}/${age}: active`);
  invariant(state.source.pointer === row.scriptPtr && state.source.pointerOffset === row.scriptOffset
    && state.source.wait === row.scriptWait && state.source.owner === row.scriptOwner,
  `${branch}/${orientation}/${age}: source cursor`);
  invariant(state.animArgs[7] === row.animArgs[7]
    && state.selector.powerLevel === (branch === "weak" ? 0 : branch === "medium" ? 1 : branch === "strong" ? 2 : 3)
    && state.selector.friendship === contract.friendship, `${branch}/${orientation}/${age}: selector`);
  invariant(same(state.lifecycle.verticalDipStarts, contract.vertical)
    && same(state.lifecycle.horizontalLungeStarts, contract.horizontal)
    && same(state.lifecycle.hitsplatStarts, contract.impacts)
    && same(state.lifecycle.shakeStarts, contract.shakes)
    && same(state.lifecycle.traceStarts, contract.traces)
    && same(state.lifecycle.simplePaletteBlendStarts, contract.blends)
    && state.lifecycle.firstInactive === contract.inactive,
  `${branch}/${orientation}/${age}: source lifecycle`);
  invariant(state.tasks.length === rawOwnedTaskCount(row), `${branch}/${orientation}/${age}: task lifecycle`);
  invariant(state.verticalDips.length === ownedSprites(row, "gVerticalDipSpriteTemplate").length,
    `${branch}/${orientation}/${age}: vertical dip lifecycle`);
  invariant((state.horizontalLunge === null ? 0 : 1)
    === ownedSprites(row, "gHorizontalLungeSpriteTemplate").length,
  `${branch}/${orientation}/${age}: horizontal lunge lifecycle`);
  invariant(state.impacts.length === ownedSprites(row, "gBasicHitSplatSpriteTemplate").length,
    `${branch}/${orientation}/${age}: hitsplat lifecycle`);
  const rawTraces = row.sprites.filter((entry: Json) => entry.template?.symbol === "gMultiuseSpriteTemplate"
    && entry.callback?.symbol === "AnimMonTrace").length;
  invariant(state.traces.length === rawTraces, `${branch}/${orientation}/${age}: trace lifecycle`);
  invariant(same(state.battlers.attacker.offset,
    { x2: row.battlerSprites.attacker.x2, y2: row.battlerSprites.attacker.y2 }),
  `${branch}/${orientation}/${age}: attacker movement`);
  invariant(same(state.battlers.target.offset,
    { x2: row.battlerSprites.target.x2, y2: row.battlerSprites.target.y2 }),
  `${branch}/${orientation}/${age}: target shake`);
  const loaded = row.tileTags.includes(RETURN_IMPACT_TAG) && row.paletteTags.includes(RETURN_IMPACT_TAG);
  invariant(state.resources.loaded === loaded && state.resources.tag === (loaded ? RETURN_IMPACT_TAG : null),
    `${branch}/${orientation}/${age}: resource lifecycle`);
  invariant(state.monbg.active === (age >= 4 && age <= contract.clearStart + 2)
    && state.monbg.clear === (age >= contract.clearStart && age <= contract.clearStart + 2),
  `${branch}/${orientation}/${age}: monbg lifecycle`);
  invariant(state.paletteBlend.bgOnly === (branch === "strongest" && age >= 11 && age < contract.inactive),
    `${branch}/${orientation}/${age}: palette lifecycle`);
  invariant(state.rng.gameplayUnchanged && same(state.rng.gameplay, row.rawBattleState.gameplayRng)
    && same(state.gameplay, row.immutableState), `${branch}/${orientation}/${age}: gameplay opacity`);
  if (age === 0) {
    invariant(state.displayTransfer.oam === "initial" && state.displayTransfer.palette === "initial",
      `${branch}/${orientation}/${age}: initial latches`);
  } else {
    invariant(same(row.hardwareOam, rows[age - 1]!.softwareOam)
      && same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices),
    `${branch}/${orientation}/${age}: OAM/matrix predecessor latch`);
    invariant(state.displayTransfer.oam === "preceding-software"
      && state.displayTransfer.matrices === "preceding-software"
      && state.displayTransfer.palette === (age === 4 ? "same-row-monbg" : "preceding-faded"),
    `${branch}/${orientation}/${age}: declared transfer latch`);
  }
  const firstInactive = age === contract.inactive;
  invariant(state.cleanup.firstInactive === firstInactive
    && state.cleanup.resourcesReleased === firstInactive,
  `${branch}/${orientation}/${age}: first inactive cleanup`);
  if (firstInactive) {
    invariant(row.visualTaskCount === 0 && row.soundTaskCount === 0 && state.cleanup.ownedTasks === 0
      && state.cleanup.ownedSprites === 0, `${branch}/${orientation}/${age}: zero owned cleanup`);
  }
  const seam = sceneOnReturnView({ age,
    config: returnConfigFor(branch, orientation, rows, age) } as SceneOnReturnPresentationState);
  const { attacker, target, ...seamState } = seam;
  invariant(same(seamState, state) && attacker.geometry.side === input.attackerSide
    && target.geometry.side === input.targetSide, `${branch}/${orientation}/${age}: typed seam`);
}

function replay(branch: ReturnBranch, orientation: ReturnOrientation) {
  const rows = returnRowsFor(branch, orientation), contract = CONTRACT[branch];
  invariant(rows.length === contract.rows && rows.length === contract.inactive + 1,
    `${branch}/${orientation}: complete retained window`);
  const reducerStates = rows.map((_, age) => compact(returnAtAge(age, returnInputsFor(branch, orientation, rows, age))));
  const seamStates = rows.map((_, age) => {
    const seam = sceneOnReturnView({ age,
      config: returnConfigFor(branch, orientation, rows, age) } as SceneOnReturnPresentationState);
    const { attacker: _attacker, target: _target, ...state } = seam;
    return compact(state);
  });
  for (let pass = 0; pass < 2; pass += 1) {
    for (const [age] of rows.entries()) compareRow(branch, orientation, age, rows);
  }
  invariant(same(reducerStates, seamStates), `${branch}/${orientation}: complete seam equality`);
  return { retainedRows: rows.length, reducerRows: rows.length * 2, seamRows: rows.length * 2,
    reducerSha256: digest(reducerStates), seamSha256: digest(seamStates),
    framebufferCompared: false, coverageCredit: false };
}

export function verifyReturnReducer() {
  const byBranch = Object.fromEntries(branches.map((branch) => [branch,
    Object.fromEntries(orientations.map((orientation) => [orientation, replay(branch, orientation)]))])) as Record<ReturnBranch, Record<ReturnOrientation, ReturnType<typeof replay>>>;
  const all = Object.values(byBranch).flatMap((branch) => Object.values(branch));
  return {
    ...byBranch,
    allBranches: {
      retainedRows: all.reduce((sum, row) => sum + row.retainedRows, 0),
      passes: 2,
      reducerRows: all.reduce((sum, row) => sum + row.reducerRows, 0),
      seamRows: all.reduce((sum, row) => sum + row.seamRows, 0),
      reducerSha256: digest(all.map((row) => row.reducerSha256)),
      seamSha256: digest(all.map((row) => row.seamSha256)),
      framebufferCompared: false,
      coverageCredit: false,
    },
  } as const;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyReturnReducer(), null, 2));
}
