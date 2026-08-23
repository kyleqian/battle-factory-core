import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";

const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/spikes-evidence.json"), "utf8")) as Json;
const sha = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

function transitions(rows: readonly Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}

function taskRanges(rows: readonly Json[], name: string): readonly [number, number][] {
  // Several wait-and-play tasks overlap.  Their task slots distinguish each
  // instance, so retain each slot's own contiguous lifetime.
  const bySlot = new Map<number, number[]>();
  for (const [age, row] of rows.entries()) for (const task of row.tasks as Json[]) {
    if (task.func.symbol !== name) continue;
    const ages = bySlot.get(task.slot) ?? [];
    ages.push(age);
    bySlot.set(task.slot, ages);
  }
  const ranges: Array<[number, number]> = [];
  for (const ages of bySlot.values()) {
    let current: [number, number] | undefined;
    for (const age of ages) {
      if (current && age === current[1] + 1) current[1] = age;
      else { current = [age, age]; ranges.push(current); }
    }
  }
  return [...ranges].sort((left, right) => left[0] - right[0]);
}

function rgbMembers(path: string, rows: readonly Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", path], { encoding: "utf8" })
    .trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", path], { maxBuffer: 32 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  invariant(members.length === rows.length && bytes.length === rows.length * size, `${path}: raw RGB shape`);
  const byName = new Map(members.map((name, index) => [name.replace(/^\.\//u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => {
    const frame = byName.get(`${String(row.frame).padStart(5, "0")}.rgb`);
    invariant(frame, `${path}: missing frame ${row.frame}`);
    return frame;
  });
}

function effectSprites(row: Json): Json[] {
  return row.sprites.filter((sprite: Json) => sprite.template.symbol === "gSpikesSpriteTemplate");
}

function effectAt(rows: readonly Json[], slot: number, age: number): Json | undefined {
  return effectSprites(rows[age]!).find((sprite) => sprite.slot === slot);
}

function lifecycle(rows: readonly Json[]): { creates: readonly Json[]; destroys: readonly Json[] } {
  let prior = new Set<number>();
  const creates: Json[] = [];
  const destroys: Json[] = [];
  for (const [age, row] of rows.entries()) {
    const current = new Set(effectSprites(row).map((sprite) => sprite.slot));
    for (const slot of current) if (!prior.has(slot)) creates.push({ age, slot, sprite: effectAt(rows, slot, age) });
    for (const slot of prior) if (!current.has(slot)) destroys.push({ age, slot, prior: effectAt(rows, slot, age - 1) });
    prior = current;
  }
  return { creates, destroys };
}

function changeMap(side: Side, rows: readonly Json[], rgb: readonly Buffer[], predecessor: Json): string {
  const lifecycleRows = lifecycle(rows);
  const mapped = rows.map((row, age) => {
    let changedPixels = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset]
        && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1]
        && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      changedPixels += 1;
      const x = pixel % 240; const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return {
      age, frame: row.frame, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait, args: row.animArgs,
      active: row.animScriptActive, changedPixels, bounds: changedPixels ? [minX, minY, maxX, maxY] : null,
      effectSprites: effectSprites(row).map((sprite) => ({
        slot: sprite.slot, callback: sprite.callback.symbol, data: sprite.data, attr: sprite.attr,
        x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, invisible: sprite.invisible,
        matrixNum: sprite.matrixNum, matrix: sprite.matrix, animation: sprite.animation, subpriority: sprite.subpriority,
      })),
      tasks: row.tasks.map((task: Json) => ({ slot: task.slot, func: task.func.symbol, data: task.data })),
      visualTaskCount: row.visualTaskCount, soundTaskCount: row.soundTaskCount,
      audio: [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol],
      paletteTags: row.paletteTags, tileTags: row.tileTags, registers: row.registers, battleBg: row.battleBg,
    };
  });
  return `${JSON.stringify({
    schema: "spikes-normalized-change-map/v1", side,
    sourceWindow: { startFrame: rows[0]!.frame, endFrame: rows.at(-1)!.frame, frameCount: rows.length },
    sourceEntry: {
      predecessorFrame: predecessor.frame,
      hardwareOamEqualsPredecessorSoftware: same(rows[0]!.hardwareOam, predecessor.softwareOam),
      hardwareMatricesEqualsPredecessorSoftware: same(rows[0]!.hardwareMatrices, predecessor.softwareMatrices),
      hardwarePaletteEqualsPredecessorFaded: same(rows[0]!.hardwarePalette, predecessor.fadedPalette),
      hardwareOamEqualsCurrentSoftware: same(rows[0]!.hardwareOam, rows[0]!.softwareOam),
    },
    lifecycle: {
      creates: lifecycleRows.creates.map(({ age, slot }) => ({ age, slot })),
      destroys: lifecycleRows.destroys.map(({ age, slot }) => ({ age, slot })),
      updateMonBg: taskRanges(rows, "Task_UpdateMonBg"), clearMonBg: taskRanges(rows, "Task_ClearMonBg"),
      waitAndPlaySe: taskRanges(rows, "Task_WaitAndPlaySE"),
    },
    transitions: {
      animationRng: transitions(rows, (row) => row.animationRng),
      paletteTags: transitions(rows, (row) => row.paletteTags), tileTags: transitions(rows, (row) => row.tileTags),
      registers: Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions(rows, (row) => row.registers[key])]).filter(([, values]) => (values as number[]).length)),
      battleBg: Object.fromEntries(Object.keys(rows[0]!.battleBg).map((key) => [key, transitions(rows, (row) => row.battleBg[key])]).filter(([, values]) => (values as number[]).length)),
      audio: transitions(rows, (row) => [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol]),
    },
    latches: {
      hardwareOamEqualsPrecedingSoftware: `${rows.slice(1).filter((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)).length}/${rows.length - 1}`,
      hardwareMatricesEqualsPrecedingSoftware: `${rows.slice(1).filter((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)).length}/${rows.length - 1}`,
      hardwarePaletteEqualsPrecedingFaded: `${rows.slice(1).filter((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette)).length}/${rows.length - 1}`,
      paletteSameRowExceptions: rows.slice(1).flatMap((row, age) => !same(row.hardwarePalette, rows[age]!.fadedPalette) && same(row.hardwarePalette, row.fadedPalette) ? [age + 1] : []),
    },
    rows: mapped,
  }, null, 2)}\n`;
}

function verifyScenario(path: string, side: Side): void {
  const scenario = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
  invariant(scenario.schemaVersion === 1 && scenario.mode === "mechanicLab" && scenario.profile === "battle-scene-on"
    && scenario.level === 50 && scenario.challengeNum === 1 && scenario.battleNum === 0, `${side}: scenario contract`);
  invariant(Object.keys(scenario.overrides).join(",") === "parties", `${side}: transient override present`);
  const parties = scenario.overrides.parties;
  invariant(parties.player.length === 3 && parties.opponent.length === 3, `${side}: incomplete parties`);
  const carrier = side === "player-back" ? parties.player[0] : parties.opponent[0];
  const target = side === "player-back" ? parties.opponent[0] : parties.player[0];
  invariant(carrier.species === 211 && carrier.nature === 8 && carrier.item === 133 && carrier.abilitySlot === 0
    && carrier.moves.every((move: number) => move === 191) && carrier.evs.spAttack === 255 && carrier.evs.spDefense === 255, `${side}: Qwilfish carrier drift`);
  invariant(target.species === 95 && target.nature === 23 && target.item === 200 && target.evs.hp === 255 && target.evs.spDefense === 255
    && target.moves.every((move: number) => move === 33), `${side}: durable Onix drift`);
  const required = ["species", "level", "nature", "ivs", "evs", "moves", "ppUps", "item", "abilitySlot", "friendship", "gender", "shiny"];
  for (const party of [parties.player, parties.opponent]) {
    invariant(new Set(party.map((mon: Json) => mon.species)).size === 3, `${side}: repeated species`);
    const items = party.map((mon: Json) => mon.item).filter(Boolean);
    invariant(new Set(items).size === items.length, `${side}: repeated held item`);
    for (const mon of party) {
      invariant(required.every((field) => Object.hasOwn(mon, field)) && mon.level === 50 && mon.moves.length === 4 && mon.ppUps.length === 4
        && mon.friendship === 70 && mon.shiny === false && Object.keys(mon.ivs).length === 6 && Object.keys(mon.evs).length === 6, `${side}: incomplete legal mon`);
      for (const transient of ["hp", "status", "statStages", "volatile", "weather", "outcome"]) invariant(!Object.hasOwn(mon, transient), `${side}: transient ${transient}`);
    }
  }
}

function assertSpikesLifecycle(side: Side, rows: readonly Json[]): void {
  const { creates, destroys } = lifecycle(rows);
  invariant(same(creates.map(({ age, slot }) => [age, slot]), [[7, 3], [19, 4], [31, 5]])
    && same(destroys.map(({ age, slot }) => [age, slot]), [[84, 3], [96, 4], [108, 5]]), `${side}: allocation lifecycle`);
  const expectedArgs = side === "player-back"
    ? [[20, 0, 0, 24, 30, 0, 0, 0], [20, 0, -24, 24, 30, 0, 0, 0], [20, 0, 24, 24, 30, 0, 0, 0]]
    : [[20, 0, 0, 24, 30, 0, 0, 0], [20, 0, 24, 24, 30, 0, 0, 0], [20, 0, -24, 24, 30, 0, 0, 0]];
  invariant(same([7, 19, 31].map((age) => rows[age]!.scriptOffset), [33, 61, 83])
    && same([7, 19, 31].map((age) => rows[age]!.scriptWait), [10, 10, 1])
    && same([7, 19, 31].map((age) => rows[age]!.animArgs), expectedArgs), `${side}: source cursor/waits/args`);
  for (const [index, start] of [7, 19, 31].entries()) {
    const slot = index + 3;
    const records = Array.from({ length: 77 }, (_, localAge) => effectAt(rows, slot, start + localAge));
    invariant(records.every(Boolean), `${side}: slot ${slot} contiguous lifetime`);
    const live = records as Json[];
    invariant(live.every((sprite) => ((sprite.attr[0] >> 8) & 3) === 0 && same(sprite.matrix, [256, 0, 0, 256])), `${side}: slot ${slot} unexpectedly affine`);
    invariant(live[0]!.callback.symbol === "AnimSpikes_Step1" && live[0]!.data[0] === 29 && live[0]!.data[5] === -50
      && live[0]!.data[6] === 1092 && live[0]!.data[7] === 1092, `${side}: slot ${slot} creation data`);
    invariant(live.slice(0, 30).every((sprite) => sprite.callback.symbol === "AnimSpikes_Step1")
      && live.slice(30, 61).every((sprite) => sprite.callback.symbol === "WaitAnimForDuration")
      && live.slice(61).every((sprite) => sprite.callback.symbol === "AnimSpikes_Step2"), `${side}: slot ${slot} callback lifecycle`);
    invariant(live[30]!.data[0] === 30 && live[30]!.data[1] === 0 && live[61]!.data[0] === 0 && live[61]!.data[1] === 0
      && live.at(-1)!.data[1] === 15, `${side}: slot ${slot} callback data`);
    for (const [localAge, sprite] of live.entries()) {
      const expectedInvisible = localAge >= 63 && Math.floor((localAge - 63) / 2) % 2 === 0;
      invariant(sprite.invisible === expectedInvisible, `${side}: slot ${slot} blink at local age ${localAge}`);
    }
  }
}

function verifyOrientation(side: Side, contract: Json): Json {
  verifyScenario(contract.scenario, side);
  invariant(sha(readFileSync(resolve(root, contract.scenario))) === contract.scenarioSha256, `${side}: scenario SHA`);
  const zipped = readFileSync(resolve(root, contract.denseState));
  const dense = gunzipSync(zipped);
  invariant(sha(zipped) === contract.denseStateSha256 && sha(dense) === contract.probeJsonSha256
    && contract.repeatProbeJsonSha256 === contract.probeJsonSha256, `${side}: dense/repeat SHA`);
  const evidence = JSON.parse(dense.toString("utf8")) as Json;
  const rows = evidence.frames as Json[];
  invariant(evidence.schema === "spikes-dense-evidence/v1" && evidence.profile === "battle-scene-on" && evidence.move === 191, `${side}: schema`);
  invariant(same(evidence.sourceWindow, contract.sourceWindow) && rows.length === 114
    && rows.every((row, age) => row.frame === contract.sourceWindow.startFrame + age)
    && rows[0]!.animScriptActive && rows[0]!.scriptOffset === 0 && !rows.at(-1)!.animScriptActive, `${side}: pointer-bounded window`);
  invariant(same(evidence.observedPointerParities, [0, 1]) && evidence.sourceSymbols.Move_SPIKES === 0x082d18cd
    && evidence.sourceSymbols.Move_MEGAHORN === 0x082d1924 && evidence.sourceSymbols.gSpikesSpriteTemplate === 0x085ce11c, `${side}: source pointer parity`);
  const predecessor = evidence.sourceEntryPredecessor as Json;
  invariant(predecessor.frame === rows[0]!.frame - 1 && !predecessor.animScriptActive && predecessor.engine.currentMove === 191
    && same(rows[0]!.hardwareOam, predecessor.softwareOam) && same(rows[0]!.hardwareMatrices, predecessor.softwareMatrices)
    && same(rows[0]!.hardwarePalette, predecessor.fadedPalette) && !same(rows[0]!.hardwareOam, rows[0]!.softwareOam), `${side}: source-entry outgoing latches`);
  invariant(evidence.topology.tasks.includes("Task_UpdateMonBg") && evidence.topology.tasks.includes("Task_ClearMonBg")
    && evidence.topology.tasks.includes("Task_WaitAndPlaySE") && evidence.topology.templates.includes("gSpikesSpriteTemplate")
    && ["AnimSpikes_Step1", "AnimSpikes_Step2", "WaitAnimForDuration"].every((name) => evidence.topology.callbacks.includes(name)), `${side}: runtime topology`);
  assertSpikesLifecycle(side, rows);
  invariant(same(taskRanges(rows, "Task_UpdateMonBg"), [[4, 111]]) && same(taskRanges(rows, "Task_ClearMonBg"), [[109, 111]])
    && same(taskRanges(rows, "Task_WaitAndPlaySE"), [[7, 34], [19, 46], [31, 58]]), `${side}: monbg/audio task lifecycle`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128
    && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32
    && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512
    && row.paletteTags.length === 16 && row.tileTags.length === 128 && Object.keys(row.registers).length === 21), `${side}: complete buffers`);
  for (const field of ["battlers", "parties", "engine", "immutableState"]) invariant(rows.every((row) => same(row[field], rows[0]![field])), `${side}: immutable ${field}`);
  invariant(rows.every((row) => row.immutableState.rngValue === rows[0]!.immutableState.rngValue)
    && transitions(rows, (row) => row.animationRng).length === 111, `${side}: RNG domains`);
  const oam = rows.slice(1).filter((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)).length;
  const matrices = rows.slice(1).filter((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)).length;
  const palette = rows.slice(1).filter((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette)).length;
  invariant(oam === 113 && matrices === 113 && palette === 112 && !same(rows[4]!.hardwarePalette, rows[3]!.fadedPalette)
    && same(rows[4]!.hardwarePalette, rows[4]!.fadedPalette), `${side}: whole-buffer transfer latches`);
  invariant(rows[1]!.tileTags.includes(10152) && rows[1]!.paletteTags.includes(10152)
    && rows.slice(1, -1).every((row) => row.tileTags.includes(10152) && row.paletteTags.includes(10152))
    && !rows.at(-1)!.tileTags.includes(10152) && !rows.at(-1)!.paletteTags.includes(10152), `${side}: tag lifetime`);
  const background = side === "player-back" ? "BG1" : "BG2";
  const bgRegister = background.toLowerCase();
  invariant(same(transitions(rows, (row) => row.battleBg[`gBattle_${background}_X`]), [4, 112])
    && same(transitions(rows, (row) => row.battleBg[`gBattle_${background}_Y`]), [4, 112])
    && same(transitions(rows, (row) => row.registers[`${bgRegister}cnt`]), [5])
    && same(transitions(rows, (row) => row.registers[`${bgRegister}hofs`]), [5, 113])
    && same(transitions(rows, (row) => row.registers[`${bgRegister}vofs`]), [5, 113])
    && same(transitions(rows, (row) => row.registers.win0h), [1]) && same(transitions(rows, (row) => row.registers.win0v), [1]), `${side}: monbg register lifetime`);
  invariant(rows[7]!.audio.SE1.songHeaderIdentity.symbol === "se_m_jump_kick"
    && rows[35]!.audio.SE1.songHeaderIdentity.symbol === "se_m_horn_attack"
    && same(transitions(rows, (row) => row.soundTaskCount), [7, 19, 31, 35, 47, 59]), `${side}: audio lifecycle`);
  const archive = readFileSync(resolve(root, contract.rawRgbArchive));
  invariant(sha(archive) === contract.rawRgbArchiveSha256, `${side}: RGB archive SHA`);
  const rgb = rgbMembers(resolve(root, contract.rawRgbArchive), rows);
  invariant(sha(Buffer.concat(rgb)) === contract.rawRgbSequenceSha256 && rgb.every((frame, age) => sha(frame) === rows[age]!.sha256), `${side}: RGB sequence`);
  const normalized = changeMap(side, rows, rgb, predecessor);
  const mapPath = resolve(root, contract.changeMap);
  if (process.argv.includes("--write-maps")) writeFileSync(mapPath, normalized);
  else invariant(sha(readFileSync(mapPath)) === contract.changeMapSha256 && readFileSync(mapPath, "utf8") === normalized, `${side}: normalized map`);
  const last = rows.at(-1)!;
  invariant(last.tasks.length === 0 && last.visualTaskCount === 0 && last.soundTaskCount === 0 && effectSprites(last).length === 0, `${side}: first inactive cleanup`);
  return {
    sourceWindow: evidence.sourceWindow,
    lifecycle: { creates: "7/19/31", destroys: "84/96/108", sprites: 3 },
    latches: { oam: "113/113", matrices: "113/113", palette: "112/113 + same-row age 4 monbg" },
    sourceRows: 114, rawRgbRows: 114, gameplayRngTransitions: 0, animationRngTransitions: 111,
    framebufferCompared: false,
  };
}

export function verifySpikesEvidence(): Record<Side, Json> {
  invariant(fixture.schema === "spikes-bilateral-evidence/v1" && fixture.oracleProfile === "battle-scene-on"
    && fixture.move === "MOVE_SPIKES" && fixture.moveId === 191 && fixture.status === "partial" && fixture.coverageCredit === false, "Spikes fixture contract");
  invariant(fixture.evidenceScope.productionAnimationChanged === false && fixture.evidenceScope.reducerAdded === false
    && fixture.evidenceScope.typedSeamAdded === false && fixture.evidenceScope.compositorAdded === false
    && fixture.evidenceScope.framebufferCompared === false && fixture.evidenceScope.coveragePromotion === false
    && fixture.evidenceScope.boundaryOrBarrierChanged === false && fixture.evidenceScope.gameplayStateOwned === false
    && fixture.evidenceScope.fullDenseRowsRetained === true && fixture.evidenceScope.twiceFreshByteIdentical === true, "Spikes evidence-only boundary");
  invariant(same(fixture.components, ["asset:ANIM_TAG_SPIKES", "sprite:gSpikesSpriteTemplate", "visualCommand:monbg", "visualCommand:clearmonbg"])
    && fixture.productionAcceptance.reducerRows === "0/228" && fixture.productionAcceptance.typedSeamRows === "0/228"
    && fixture.productionAcceptance.productionFramebufferRows === "0/228" && fixture.productionAcceptance.manualQueue === "MOVE_SPIKES", "Spikes no-production remainder");
  for (const [path, digest] of [[fixture.source.audit, fixture.source.auditSha256], [fixture.source.probe, fixture.source.probeSha256]] as const) {
    invariant(sha(readFileSync(resolve(root, path))) === digest, `${path}: source receipt`);
  }
  return Object.fromEntries(((["player-back", "opponent-front"] as Side[]).map((side) => [side, verifyOrientation(side, fixture.orientations[side])]))) as Record<Side, Json>;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifySpikesEvidence(), null, 2));
