/** Source and bilateral dense-evidence audit for the unsupported Recycle checkpoint. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";

const root = resolve(new URL("../..", import.meta.url).pathname);
const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/recycle-evidence.json"), "utf8")) as Json;
const sha = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sourceBlock(path: string, start: string, end: string): string {
  const source = readFileSync(resolve(root, path), "utf8");
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  invariant(from >= 0 && to > from, `${start}: source bounds`);
  return source.slice(from, to);
}

function verifySource(): void {
  const script = sourceBlock("reference/pokeemerald/data/battle_anim_scripts.s", "Move_RECYCLE:", "Move_BRICK_BREAK:");
  invariant(sha(script) === receipt.source.scriptTextSha256, "Recycle script source drift");
  const body = script.trim().split("\n").slice(1).map((line) => line.trim()).filter(Boolean);
  invariant(body.length === 14, "Recycle root must retain its 14 executable body lines");
  invariant(same(body, [
    "loadspritegfx ANIM_TAG_RECYCLE",
    "monbg ANIM_ATTACKER",
    "setalpha 0, 16",
    "delay 1",
    "createsprite gRecycleSpriteTemplate, ANIM_ATTACKER, 2",
    "loopsewithpan SE_M_TAKE_DOWN, SOUND_PAN_ATTACKER, 24, 3",
    "waitforvisualfinish",
    "createvisualtask AnimTask_BlendMonInAndOut, 5, ANIM_ATTACKER, RGB_WHITE, 12, 2, 1",
    "playsewithpan SE_M_TAKE_DOWN, SOUND_PAN_ATTACKER",
    "waitforvisualfinish",
    "blendoff",
    "clearmonbg ANIM_ATTACKER",
    "delay 1",
    "end",
  ]), "Recycle root body drift");

  const template = sourceBlock(
    "reference/pokeemerald/src/battle_anim_effects_3.c",
    "const union AffineAnimCmd gRecycleSpriteAffineAnimCmds[]",
    "const union AffineAnimCmd gSlackOffSquishAffineAnimCmds[]",
  );
  invariant(sha(template) === receipt.source.templateTextSha256, "Recycle template source drift");
  for (const token of [
    "AFFINEANIMCMD_FRAME(0, 0, -4, 64)",
    "gOamData_AffineNormal_ObjBlend_64x64",
    ".tileTag = ANIM_TAG_RECYCLE",
    ".paletteTag = ANIM_TAG_RECYCLE",
    ".callback = AnimRecycle",
  ]) invariant(template.includes(token), `Recycle template missing ${token}`);

  const callback = sourceBlock(
    "reference/pokeemerald/src/battle_anim_effects_3.c",
    "static void AnimRecycle(struct Sprite *sprite)",
    "void AnimTask_GetWeather",
  );
  invariant(sha(callback) === receipt.source.callbackTextSha256, "Recycle callback source drift");
  for (const token of [
    "BATTLER_COORD_X_2",
    "BATTLER_COORD_ATTR_TOP",
    "if (sprite->y < 16)",
    "sprite->data[7] = 16",
    "SetGpuReg(REG_OFFSET_BLDALPHA",
    "DestroySpriteAndMatrix(sprite)",
  ]) invariant(callback.includes(token), `Recycle callback missing ${token}`);

  const blend = sourceBlock(
    "reference/pokeemerald/src/battle_anim_mons.c",
    "void AnimTask_BlendMonInAndOut(u8 task)",
    "// See AnimTask_BlendMonInAndOut. Same",
  );
  invariant(sha(blend) === receipt.source.blendTaskTextSha256, "BlendMonInAndOut source drift");
  for (const token of ["BlendPalette(task->data[0], 15", "task->data[3]", "task->data[5]", "DestroyAnimVisualTask"]) {
    invariant(blend.includes(token), `BlendMonInAndOut missing ${token}`);
  }

  const graphics = readFileSync(resolve(root, "reference/pokeemerald/src/graphics.c"), "utf8");
  invariant(graphics.includes('gBattleAnimSpriteGfx_Recycle[] = INCGFX_U32("graphics/battle_anims/sprites/recycle.png", ".4bpp.lz")'), "Recycle graphics source drift");
  invariant(graphics.includes('gBattleAnimSpritePal_Recycle[] = INCGFX_U32("graphics/battle_anims/sprites/recycle.png", ".gbapal.lz")'), "Recycle palette source drift");
  const inventory = readFileSync(resolve(root, "reference/pokeemerald/src/data/battle_anim.h"), "utf8");
  invariant(inventory.includes("{gBattleAnimSpriteGfx_Recycle, 0x0800, ANIM_TAG_RECYCLE}") && inventory.includes("{gBattleAnimSpritePal_Recycle, ANIM_TAG_RECYCLE}"), "Recycle tag inventory drift");

  const battleScript = sourceBlock("reference/pokeemerald/data/battle_scripts_1.s", "BattleScript_EffectRecycle::", "BattleScript_EffectRevenge::");
  invariant(battleScript.includes("tryrecycleitem BattleScript_ButItFailed\n\tattackanimation"), "Recycle animation is not after the item-success gate");
  const gate = sourceBlock("reference/pokeemerald/src/battle_script_commands.c", "static void Cmd_tryrecycleitem(void)\n{", "static void Cmd_settypetoenvironment(void)\n{");
  invariant(gate.includes("*usedHeldItem != ITEM_NONE && gBattleMons[gActiveBattler].item == ITEM_NONE") && gate.includes("gBattleMons[gActiveBattler].item = gLastUsedItem"), "Recycle item gate drift");

  const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
  const carrier = frontier.entries[168];
  invariant(same(carrier, {
    index: 168,
    label: "FRONTIER_MON_PORYGON_1",
    species: "SPECIES_PORYGON",
    moves: ["MOVE_PSYBEAM", "MOVE_ICY_WIND", "MOVE_RECYCLE", "MOVE_AGILITY"],
    itemTableId: 2,
    itemName: "BATTLE_FRONTIER_ITEM_SITRUS_BERRY",
    evSpread: 17,
    evSpreadStats: ["F_EV_SPREAD_SP_ATTACK", "F_EV_SPREAD_HP"],
    nature: "NATURE_RELAXED",
  }), "Recycle's sole Factory carrier drift");
  invariant(same(receipt.source.components, [
    "asset:ANIM_TAG_RECYCLE",
    "sprite:gRecycleSpriteTemplate",
    "task:AnimTask_BlendMonInAndOut",
    "visualCommand:blendoff",
    "visualCommand:clearmonbg",
    "visualCommand:monbg",
    "visualCommand:setalpha",
  ]), "Recycle component graph drift");
}

function readRows(side: Orientation): { probe: Json; rows: Json[]; rgb: Buffer[] } {
  const item = receipt.orientations[side] as Json;
  invariant(sha(readFileSync(resolve(root, item.scenario))) === item.scenarioSha256, `${side}: scenario SHA`);
  const gzip = readFileSync(resolve(root, item.denseState));
  invariant(sha(gzip) === item.denseStateSha256, `${side}: dense archive SHA`);
  const json = gunzipSync(gzip);
  invariant(sha(json) === item.probeJsonSha256, `${side}: probe JSON SHA`);
  const probe = JSON.parse(json.toString("utf8")) as Json;
  const archive = resolve(root, item.rawRgbArchive);
  invariant(sha(readFileSync(archive)) === item.rawRgbArchiveSha256, `${side}: raw archive SHA`);
  const names = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 32 * 1024 * 1024 });
  const frameBytes = 240 * 160 * 3;
  invariant(names.length === 203 && bytes.length === names.length * frameBytes, `${side}: raw archive shape`);
  const byName = new Map(names.map((name, index) => [basename(name), bytes.subarray(index * frameBytes, (index + 1) * frameBytes)]));
  const rgb = (probe.frames as Json[]).map((row) => byName.get(`${String(row.frame).padStart(5, "0")}.rgb`));
  invariant(rgb.every(Boolean), `${side}: raw frame names`);
  const frames = rgb as Buffer[];
  invariant(sha(Buffer.concat(frames)) === item.rawRgbSequenceSha256, `${side}: raw sequence SHA`);
  invariant(frames.every((frame, index) => sha(frame) === probe.frames[index]!.sha256), `${side}: per-row raw SHA`);
  invariant(sha(readFileSync(resolve(root, item.changeMap))) === item.changeMapSha256, `${side}: change-map SHA`);
  return { probe, rows: probe.frames as Json[], rgb: frames };
}

function scenarioParty(scenario: Json, side: "player" | "opponent"): Json[] {
  const party = scenario.overrides?.parties?.[side];
  invariant(Array.isArray(party) && party.length === 3, `${side}: must be a complete legal three-mon party`);
  return party;
}

function verifyLegalStaging(side: Orientation, rows: Json[]): void {
  const item = receipt.orientations[side] as Json;
  const scenario = JSON.parse(readFileSync(resolve(root, item.scenario), "utf8")) as Json;
  invariant(scenario.mode === "mechanicLab" && scenario.profile === "battle-scene-on", `${side}: wrong lab profile`);
  invariant(Object.keys(scenario.overrides ?? {}).length === 1 && scenario.overrides.parties && !scenario.overrides.battlers, `${side}: transient battle staging is forbidden`);
  const player = scenarioParty(scenario, "player");
  const opponent = scenarioParty(scenario, "opponent");
  const porygonSide = side === "player-back" ? player : opponent;
  const gyaradosSide = side === "player-back" ? opponent : player;
  const porygon = porygonSide[0]!;
  invariant(porygon.species === 137 && porygon.level === 50 && porygon.item === 142 && porygon.abilitySlot === 0, `${side}: Porygon/Sitrus legal stage drift`);
  invariant(gyaradosSide[0]!.species === 130 && same(gyaradosSide[0]!.moves, [70, 70, 70, 70]), `${side}: deterministic legal Gyarados choice drift`);
  if (side === "player-back") {
    invariant(same(porygon.moves, [60, 196, 278, 97]), "player-back: original Factory Porygon moves drift");
  } else {
    invariant(same(porygon.moves, [278, 278, 278, 278]), "opponent-front: Recycle-only legal AI constraint drift");
  }
  const rootPorygon = rows[0]!.battlers[side === "player-back" ? "player" : "opponent"];
  invariant(rootPorygon.species === 137 && rootPorygon.item === 142 && rootPorygon.hp === 7, `${side}: successful item restore state missing at animation root`);
  invariant(rootPorygon.pp.some((pp: number) => pp < 10), `${side}: no real Recycle action was spent`);
}

function arrow(row: Json): Json | undefined {
  return row.sprites.find((sprite: Json) => sprite.template?.symbol === "gRecycleSpriteTemplate");
}

function blendTask(row: Json): Json | undefined {
  return row.tasks.find((task: Json) => task.func?.symbol === "AnimTask_BlendMonInAndOut_Step");
}

function verifyOrientation(side: Orientation): Json {
  const item = receipt.orientations[side] as Json;
  const { probe, rows } = readRows(side);
  verifyLegalStaging(side, rows);
  invariant(probe.schema === "recycle-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 278, `${side}: schema/profile`);
  invariant(rows.length === 203 && rows[0]!.frame === item.window.startFrame && rows.at(-1)!.frame === item.window.endFrame, `${side}: complete window`);
  invariant(rows.every((row, age) => row.frame === item.window.startFrame + age), `${side}: non-consecutive rows`);
  invariant(rows.slice(0, -1).every((row) => row.animScriptActive) && !rows.at(-1)!.animScriptActive, `${side}: first inactive cleanup missing`);
  invariant(probe.sourcePointerContract.start === 0x082ce05e && probe.sourcePointerContract.endExclusive === 0x082ce092 && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: source interval/parities`);
  invariant(same(probe.sourcePointerContract.observedAddresses.map((address: number) => address - 0x082ce05e), [0, 3, 5, 10, 23, 45, 51]), `${side}: source offsets`);
  invariant(probe.topology.tasks.includes("AnimTask_BlendMonInAndOut_Step") && probe.topology.tasks.includes("Task_LoopAndPlaySE") && probe.topology.tasks.includes("Task_UpdateMonBg") && probe.topology.tasks.includes("Task_ClearMonBg"), `${side}: task topology`);
  invariant(probe.topology.templates.includes("gRecycleSpriteTemplate") && probe.topology.callbacks.includes("AnimRecycle_Step"), `${side}: sprite topology`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128), `${side}: dense surface inventory`);
  for (const key of ["battlers", "parties", "engine", "immutableState"]) invariant(rows.every((row) => same(row[key], rows[0]![key])), `${side}: mutable ${key}`);
  invariant(rows.every((row) => row.immutableState.rngValue === rows[0]!.immutableState.rngValue), `${side}: gameplay RNG changed`);
  const animationRngTransitions = rows.slice(1).filter((row, age) => row.animationRng !== rows[age]!.animationRng).length;
  invariant(animationRngTransitions === 200, `${side}: animation RNG cadence`);

  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)), `${side}: OAM is not RAM+1`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette)), `${side}: palette is not RAM+1`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)), `${side}: ongoing matrix transfer drift`);
  invariant(!arrow(rows[9]!) && !!arrow(rows[10]!) && !!arrow(rows[147]!) && !arrow(rows[148]!), `${side}: arrow lifecycle`);
  invariant(rows[9]!.sha256 === rows[10]!.sha256 && rows[10]!.sha256 !== rows[11]!.sha256, `${side}: fresh affine matrix did not require two displays to paint`);
  invariant(same(rows[11]!.hardwareMatrices[arrow(rows[10]!)!.matrixNum], rows[10]!.softwareMatrices[arrow(rows[10]!)!.matrixNum]), `${side}: fresh affine predecessor missing`);
  invariant(same(rows[148]!.hardwareOam, rows[147]!.softwareOam) && same(rows[149]!.hardwareOam, rows[148]!.softwareOam), `${side}: arrow removal is not plain OAM RAM+1`);
  invariant(rows[150]!.fadedPalette.some((value: number, index: number) => value !== rows[149]!.fadedPalette[index]) && same(rows[151]!.hardwarePalette, rows[150]!.fadedPalette), `${side}: BlendMonInAndOut palette RAM+1 candidate drift`);

  invariant(rows.findIndex((row) => arrow(row)) === 10 && rows.reduce((last, row, age) => arrow(row) ? age : last, -1) === 147, `${side}: arrow RAM rows`);
  invariant(rows.findIndex((row) => blendTask(row)) === 149 && rows.reduce((last, row, age) => blendTask(row) ? age : last, -1) === 195, `${side}: BlendMonInAndOut RAM rows`);
  const firstArrow = arrow(rows[10]!)!;
  invariant(firstArrow.callback.symbol === "AnimRecycle_Step" && same(firstArrow.matrix, [251, 49, -49, 251]) && same(firstArrow.data, [1, 0, 0, 0, 0, 0, 0, 16]), `${side}: first arrow callback state`);
  const finalArrow = arrow(rows[147]!)!;
  invariant(same(finalArrow.matrix, [120, 225, -225, 120]) && same(finalArrow.data, [0, 32, 3, 0, 0, 0, 0, 16]), `${side}: final arrow callback state`);
  invariant(same(blendTask(rows[149]!)!.data.slice(1, 8), [32767, 0, 12, 1, 2, 0, 1]) && same(blendTask(rows[172]!)!.data.slice(1, 8), [32767, 12, 12, 0, 2, 1, 1]) && same(blendTask(rows[195]!)!.data.slice(1, 8), [32767, 1, 12, 1, 2, 1, 1]), `${side}: BlendMonInAndOut source ramp`);
  for (const age of [10, 34, 59, 149]) invariant(rows[age]!.audio.SE2.songHeaderIdentity.symbol === "se_m_take_down" && rows[age]!.audio.SE2.status === 0, `${side}: SE_M_TAKE_DOWN source age ${age}`);
  const expectedPan = side === "player-back" ? -64 : 63;
  invariant(rows.slice(10).every((row) => row.audio.SE2.tracks[0]!.panX === expectedPan), `${side}: attacker pan drift`);
  return {
    pointerRows: 203,
    arrowRows: 138,
    blendTaskRows: 47,
    oamPredecessor: 202,
    palettePredecessor: 202,
    matrixPredecessor: 202,
    freshAffinePaintAge: 11,
    gameplayRngTransitions: 0,
    animationRngTransitions,
  };
}

function verifyControls(): void {
  const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
  const status = (move: string): string => coverage.entries.find((entry: Json) => entry.move === move)?.status ?? "unsupported";
  invariant(status("MOVE_RECYCLE") === "exact", "Recycle exact coverage regressed");
  invariant(status("MOVE_SUPER_FANG") === "exact", "BlendMonInAndOut exact control regressed");
  const scripts = readFileSync(resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"), "utf8");
  const superFang = scripts.slice(scripts.indexOf("Move_SUPER_FANG:"), scripts.indexOf("Move_SLASH:"));
  invariant(superFang.includes("AnimTask_BlendMonInAndOut, 2, ANIM_ATTACKER, RGB(31, 6, 1), 12, 4, 1"), "Super Fang BlendMonInAndOut control drift");
}

export function verifyRecycleEvidence(): Record<Orientation, Json> {
  invariant(receipt.status === "exact" && receipt.coverageCredit === true, "Recycle production acceptance regressed");
  verifySource();
  verifyControls();
  return {
    "player-back": verifyOrientation("player-back"),
    "opponent-front": verifyOrientation("opponent-front"),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyRecycleEvidence(), null, 2));
}
