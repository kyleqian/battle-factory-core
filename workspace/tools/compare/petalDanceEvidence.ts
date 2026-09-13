/** Strict bilateral dense-evidence verifier and normalized banked-map writer. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";

const root = resolve(new URL("../..", import.meta.url).pathname);
const sourceStart = 0x082d281c;
const sourceEnd = 0x082d2954;
const flowerTag = 10159;
const impactTag = 10135;
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function file(path: string): Buffer { return readFileSync(resolve(root, path)); }
function transitions(rows: Json[], select: (row: Json) => unknown): number[] {
  return rows.slice(1).flatMap((row, age) => same(select(row), select(rows[age]!)) ? [] : [age + 1]);
}
function ranges(rows: Json[], kind: "sprites" | "tasks", predicate: (entry: Json) => boolean): Json[] {
  const slots = new Map<number, number[]>();
  for (const [age, row] of rows.entries()) for (const entry of row[kind]) if (predicate(entry)) {
    const ages = slots.get(entry.slot) ?? [];
    ages.push(age);
    slots.set(entry.slot, ages);
  }
  return [...slots].map(([slot, ages]) => ({ slot, start: ages[0], end: ages.at(-1), rows: ages.length }))
    .sort((left, right) => left.start - right.start || left.slot - right.slot);
}
function compactSprite(sprite: Json): Json {
  return {
    slot: sprite.slot, template: sprite.template?.symbol, callback: sprite.callback?.symbol,
    attr: sprite.attr, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    animNum: sprite.animNum, animCmdIndex: sprite.animCmdIndex, animDelayCounter: sprite.animDelayCounter,
    subpriority: sprite.subpriority, flags: sprite.flags, invisible: sprite.invisible,
    matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data,
  };
}
function compactTask(task: Json): Json { return { slot: task.slot, func: task.func?.symbol, data: task.data }; }
function bank(value: unknown): string { return sha(JSON.stringify(value)); }

function rawFrames(path: string, rows: Json[]): Buffer[] {
  const archive = resolve(root, path);
  const names = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n")
    .filter((name) => name.endsWith(".rgb"));
  const raw = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 64 * 1024 * 1024 });
  const bytesPerFrame = 240 * 160 * 3;
  invariant(names.length === rows.length && raw.length === rows.length * bytesPerFrame, `${path}: RGB shape`);
  return rows.map((row, age) => {
    invariant(names[age]!.endsWith(`${String(row.frame).padStart(5, "0")}.rgb`), `${path}: member ${age}`);
    const frame = raw.subarray(age * bytesPerFrame, (age + 1) * bytesPerFrame);
    invariant(sha(frame) === row.sha256, `${path}: RGB row ${age}`);
    return frame;
  });
}

function normalizedMap(side: Side, probe: Json, rgb: readonly Buffer[]): string {
  const rows = probe.frames as Json[];
  const mapRows = rows.map((row, age) => {
    let changedPixels = 0;
    let minX = 240, minY = 160, maxX = -1, maxY = -1;
    if (age > 0) for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset]
        && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1]
        && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      changedPixels += 1;
      const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    const moveSprites = row.sprites.filter((sprite: Json) => [
      "gPetalDanceBigFlowerSpriteTemplate", "gPetalDanceSmallFlowerSpriteTemplate",
      "gSlideMonToOffsetSpriteTemplate", "gSlideMonToOriginalPosSpriteTemplate", "gBasicHitSplatSpriteTemplate",
    ].includes(sprite.template?.symbol)).map(compactSprite);
    return {
      age, frame: row.frame, active: row.animScriptActive, scriptPtr: row.scriptPtr,
      scriptPtrParity: row.scriptPtrParity, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait,
      changedPixels, bounds: changedPixels ? [minX, minY, maxX, maxY] : null,
      moveSprites, tasks: row.tasks.map(compactTask),
      battlerAxes: { attacker: [row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2], target: [row.battlerSprites.target.x2, row.battlerSprites.target.y2] },
      banks: {
        softwareOam: bank(row.softwareOam), hardwareOam: bank(row.hardwareOam),
        softwareMatrices: bank(row.softwareMatrices), hardwareMatrices: bank(row.hardwareMatrices),
        unfadedPalette: bank(row.unfadedPalette), fadedPalette: bank(row.fadedPalette), hardwarePalette: bank(row.hardwarePalette),
        paletteTags: bank(row.paletteTags), tileTags: bank(row.tileTags), spriteOrder: bank(row.spriteOrder),
        resourceAllocators: bank(row.resourceAllocators), bgVram: row.bgVram.allSha256,
        registers: bank(row.registers), battleBg: bank(row.battleBg),
        audio: bank({ SE1: row.audio.SE1.songHeaderIdentity.symbol, SE2: row.audio.SE2.songHeaderIdentity.symbol,
          se1Pan: row.audio.SE1.tracks.map((track: Json) => track.panX), se2Pan: row.audio.SE2.tracks.map((track: Json) => track.panX) }),
        parties: bank(row.parties), battlers: bank(row.battlers), engine: bank(row.engine),
        rawBattleState: bank(row.rawBattleState), animationRng: String(row.animationRng), gameplayRng: String(row.rawBattleState.gameplayRng),
      },
    };
  });
  return `${JSON.stringify({ schema: "petal-dance-normalized-banked-change-map/v1", oracleProfile: "battle-scene-on", side,
    sourceWindow: probe.sourceWindow, sourcePointerContract: probe.sourcePointerContract,
    lifecycles: {
      bigFlowers: ranges(rows, "sprites", (entry) => entry.template?.symbol === "gPetalDanceBigFlowerSpriteTemplate"),
      smallFlowers: ranges(rows, "sprites", (entry) => entry.template?.symbol === "gPetalDanceSmallFlowerSpriteTemplate"),
      slideOffset: ranges(rows, "sprites", (entry) => entry.template?.symbol === "gSlideMonToOffsetSpriteTemplate"),
      slideOriginal: ranges(rows, "sprites", (entry) => entry.template?.symbol === "gSlideMonToOriginalPosSpriteTemplate"),
      hitsplat: ranges(rows, "sprites", (entry) => entry.template?.symbol === "gBasicHitSplatSpriteTemplate"),
      tasks: {
        ellipse: ranges(rows, "tasks", (entry) => entry.func?.symbol === "AnimTask_TranslateMonElliptical_Step"),
        shake: ranges(rows, "tasks", (entry) => entry.func?.symbol === "AnimTask_ShakeMon_Step"),
        monbgUpdate: ranges(rows, "tasks", (entry) => entry.func?.symbol === "Task_UpdateMonBg"),
        monbgClear: ranges(rows, "tasks", (entry) => entry.func?.symbol === "Task_ClearMonBg"),
      },
    },
    displayTransfer: {
      oam: rows.slice(1).filter((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)).length,
      matrices: rows.slice(1).filter((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)).length,
      palette: rows.slice(1).filter((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette)).length,
      paletteExceptionAges: rows.slice(1).flatMap((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette) ? [] : [age + 1]),
    },
    transitions: {
      sourcePtr: transitions(rows, (row) => row.scriptPtr), animationRng: transitions(rows, (row) => row.animationRng),
      paletteTags: transitions(rows, (row) => row.paletteTags), tileTags: transitions(rows, (row) => row.tileTags),
      matrixBitmap: transitions(rows, (row) => row.resourceAllocators.matrixBitmap), bgVram: transitions(rows, (row) => row.bgVram),
      registers: transitions(rows, (row) => row.registers), battleBg: transitions(rows, (row) => row.battleBg),
      fadedPalette: transitions(rows, (row) => row.fadedPalette), hardwarePalette: transitions(rows, (row) => row.hardwarePalette),
    },
    state: { gameplayRngValues: [...new Set(rows.map((row) => row.rawBattleState.gameplayRng))],
      animationRngDistinct: new Set(rows.map((row) => row.animationRng)).size,
      partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)),
      battlersStable: rows.every((row) => same(row.battlers, rows[0]!.battlers)),
      engineStable: rows.every((row) => same(row.engine, rows[0]!.engine)),
      rawBattleStateStable: rows.every((row) => same(row.rawBattleState, rows[0]!.rawBattleState)) },
    audio: { se1Starts: rows.flatMap((row, age) => age === 0 || row.audio.SE1.songHeaderIdentity.symbol !== rows[age - 1]!.audio.SE1.songHeaderIdentity.symbol
      ? [{ age, symbol: row.audio.SE1.songHeaderIdentity.symbol, panX: row.audio.SE1.tracks.map((track: Json) => track.panX) }] : []),
      se2Symbols: [...new Set(rows.map((row) => row.audio.SE2.songHeaderIdentity.symbol))] },
    cleanup: { age: rows.length - 1, frame: rows.at(-1)!.frame, active: rows.at(-1)!.animScriptActive,
      visualTasks: rows.at(-1)!.visualTaskCount, soundTasks: rows.at(-1)!.soundTaskCount, taskCount: rows.at(-1)!.tasks.length,
      moveSprites: rows.at(-1)!.sprites.filter((sprite: Json) => ["gPetalDanceBigFlowerSpriteTemplate", "gPetalDanceSmallFlowerSpriteTemplate",
        "gSlideMonToOffsetSpriteTemplate", "gSlideMonToOriginalPosSpriteTemplate", "gBasicHitSplatSpriteTemplate"].includes(sprite.template?.symbol)).length,
      flowerTag: rows.at(-1)!.paletteTags.includes(flowerTag) || rows.at(-1)!.tileTags.includes(flowerTag),
      impactTag: rows.at(-1)!.paletteTags.includes(impactTag) || rows.at(-1)!.tileTags.includes(impactTag) },
    rows: mapRows,
  }, null, 2)}\n`;
}

function verifyOrientation(side: Side, config: Json): Json {
  const compressed = file(config.denseState);
  invariant(sha(compressed) === config.denseStateSha256, `${side}: dense archive SHA`);
  const json = gunzipSync(compressed);
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: semantic fresh-run SHA`);
  const probe = JSON.parse(json.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  invariant(probe.schema === "petal-dance-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 80, `${side}: dense identity`);
  invariant(sha(file(config.scenario)) === config.scenarioSha256, `${side}: legal-party scenario SHA`);
  invariant(rows.length === 244 && same(probe.sourceWindow, config.sourceWindow) && probe.sourceWindow.frameCount === 244 && probe.sourceWindow.sourceFrameCount === 244, `${side}: complete dense window`);
  invariant(rows.every((row, age) => row.frame === probe.sourceWindow.startFrame + age), `${side}: chronological rows`);
  const offsets = [0, 3, 6, 8, 79, 126, 173, 205, 235, 255, 291, 294, 307, 311];
  invariant(same(probe.sourcePointerContract, { start: sourceStart, endExclusive: sourceEnd,
    observedAddresses: offsets.map((offset) => sourceStart + offset), observedParities: [0, 1] }), `${side}: source pointer contract`);
  invariant(rows.every((row, age) => row.scriptPtrParity === (row.scriptPtr & 1)
    && row.scriptOffset === row.scriptPtr - sourceStart && (age < 243 ? row.animScriptActive : !row.animScriptActive) && row.scriptOwner === "Move_PETAL_DANCE"
    && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32
    && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512
    && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.resourceAllocators.tileRanges.length === 64
    && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.rawBattleState.playerParty.length === 1200
    && row.rawBattleState.opponentParty.length === 1200), `${side}: dense row shape/source cursor`);
  invariant(same(ranges(rows, "sprites", (entry) => entry.template?.symbol === "gPetalDanceBigFlowerSpriteTemplate"), [
    { slot: 3, start: 10, end: 148, rows: 139 }, { slot: 7, start: 27, end: 165, rows: 139 }, { slot: 11, start: 44, end: 182, rows: 139 },
  ]), `${side}: big flower lifetimes`);
  invariant(same(ranges(rows, "sprites", (entry) => entry.template?.symbol === "gPetalDanceSmallFlowerSpriteTemplate"), [
    { slot: 4, start: 10, end: 108, rows: 99 }, { slot: 5, start: 10, end: 108, rows: 99 },
    { slot: 9, start: 27, end: 125, rows: 99 }, { slot: 10, start: 27, end: 125, rows: 99 },
    { slot: 12, start: 44, end: 142, rows: 99 }, { slot: 13, start: 44, end: 142, rows: 99 },
    { slot: 14, start: 76, end: 174, rows: 99 }, { slot: 15, start: 76, end: 174, rows: 99 },
    { slot: 16, start: 108, end: 186, rows: 79 }, { slot: 17, start: 108, end: 186, rows: 79 },
  ]), `${side}: small flower lifetimes`);
  invariant(same(ranges(rows, "sprites", (entry) => entry.template?.symbol === "gSlideMonToOffsetSpriteTemplate"), [{ slot: 3, start: 201, end: 206, rows: 6 }])
    && same(ranges(rows, "sprites", (entry) => entry.template?.symbol === "gSlideMonToOriginalPosSpriteTemplate"), [{ slot: 3, start: 231, end: 237, rows: 7 }])
    && same(ranges(rows, "sprites", (entry) => entry.template?.symbol === "gBasicHitSplatSpriteTemplate"), [{ slot: 4, start: 206, end: 214, rows: 9 }]), `${side}: impact lifetimes`);
  const moveSprites = rows.flatMap((row) => row.sprites.filter((entry: Json) => ["gPetalDanceBigFlowerSpriteTemplate", "gPetalDanceSmallFlowerSpriteTemplate",
    "gSlideMonToOffsetSpriteTemplate", "gSlideMonToOriginalPosSpriteTemplate", "gBasicHitSplatSpriteTemplate"].includes(entry.template?.symbol)));
  invariant(moveSprites.filter((entry) => entry.template?.symbol === "gPetalDanceBigFlowerSpriteTemplate").every((entry) => entry.callback?.symbol === "AnimPetalDanceBigFlower_Step")
    && moveSprites.filter((entry) => entry.template?.symbol === "gPetalDanceSmallFlowerSpriteTemplate").every((entry) => entry.callback?.symbol === "AnimPetalDanceSmallFlower_Step"), `${side}: flower callback bodies`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func?.symbol === "AnimTask_TranslateMonElliptical_Step"), [{ slot: 0, start: 10, end: 199, rows: 190 }])
    && same(ranges(rows, "tasks", (entry) => entry.func?.symbol === "AnimTask_ShakeMon_Step"), [{ slot: 0, start: 206, end: 219, rows: 14 }])
    && same(ranges(rows, "tasks", (entry) => entry.func?.symbol === "Task_UpdateMonBg"), [{ slot: 1, start: 7, end: 241, rows: 235 }])
    && same(ranges(rows, "tasks", (entry) => entry.func?.symbol === "Task_ClearMonBg"), [{ slot: 0, start: 239, end: 241, rows: 3 }]), `${side}: task lifetimes`);
  invariant(rows.every((row) => row.tasks.every((task: Json) => ["AnimTask_TranslateMonElliptical_Step", "AnimTask_ShakeMon_Step", "Task_UpdateMonBg", "Task_ClearMonBg"].includes(task.func?.symbol))), `${side}: unexpected task owner`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam) && same(row.hardwareMatrices, rows[age]!.softwareMatrices)), `${side}: OAM/matrix predecessor transfer`);
  invariant(same(rows.slice(1).flatMap((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette) ? [] : [age + 1]), [7]), `${side}: palette transfer exception`);
  invariant(same(transitions(rows, (row) => row.paletteTags), [1, 4, 243]) && same(transitions(rows, (row) => row.tileTags), [1, 4, 243])
    && same(transitions(rows, (row) => row.resourceAllocators.matrixBitmap), [206, 215]), `${side}: tag/matrix allocator lifetime`);
  invariant(same(transitions(rows, (row) => row.unfadedPalette), [1, 4, 7]) && same(transitions(rows, (row) => row.fadedPalette), [1, 4, 7])
    && same(transitions(rows, (row) => row.hardwarePalette), [2, 5, 7]), `${side}: palette/register transfer schedule`);
  invariant(same(transitions(rows, (row) => row.bgVram), [8, 241, 243]), `${side}: BG VRAM lifecycle`);
  const selectedBg = side === "player-back" ? "bg1" : "bg2";
  const expectedRegisters = side === "player-back" ? [8, 10, 207, 209, 211, 213, 215, 217, 219, 239, 243] : [8, 10, 209, 211, 213, 215, 217, 219, 239, 243];
  invariant(same(transitions(rows, (row) => row.registers), expectedRegisters), `${side}: BG/register schedule`);
  invariant(rows[8]!.registers[`${selectedBg}hofs`] !== 0 && rows[8]!.registers[`${selectedBg}vofs`] !== 0
    && rows.at(-1)!.registers[`${selectedBg}hofs`] === 0 && rows.at(-1)!.registers[`${selectedBg}vofs`] === 0, `${side}: selected monbg registers`);
  const audioStarts = rows.flatMap((row, age) => age === 0 || row.audio.SE1.songHeaderIdentity.symbol !== rows[age - 1]!.audio.SE1.songHeaderIdentity.symbol
    ? [{ age, symbol: row.audio.SE1.songHeaderIdentity.symbol, panX: row.audio.SE1.tracks[0]!.panX }] : []);
  invariant(same(audioStarts.map((entry) => [entry.age, entry.symbol]), [[0, "se_effective"], [10, "se_m_petal_dance"], [206, "se_m_mega_kick2"]])
    && same([...new Set(rows.map((row) => row.audio.SE2.songHeaderIdentity.symbol))], ["se_select"]), `${side}: audio lifecycle`);
  invariant(audioStarts[1]!.panX === (side === "player-back" ? -64 : 63) && audioStarts[2]!.panX === (side === "player-back" ? 63 : -63), `${side}: audio pan`);
  invariant(new Set(rows.map((row) => row.rawBattleState.gameplayRng)).size === 1 && transitions(rows, (row) => row.rawBattleState.gameplayRng).length === 0
    && new Set(rows.map((row) => row.animationRng)).size === 242 && transitions(rows, (row) => row.animationRng).length === 241, `${side}: RNG domains`);
  for (const key of ["parties", "battlers", "engine", "immutableState", "rawBattleState"] as const) invariant(rows.every((row) => same(row[key], rows[0]![key])), `${side}: stable ${key}`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && rows.at(-1)!.tasks.length === 0
    && !rows.at(-1)!.sprites.some((entry: Json) => ["gPetalDanceBigFlowerSpriteTemplate", "gPetalDanceSmallFlowerSpriteTemplate", "gSlideMonToOffsetSpriteTemplate", "gSlideMonToOriginalPosSpriteTemplate", "gBasicHitSplatSpriteTemplate"].includes(entry.template?.symbol))
    && !rows.at(-1)!.paletteTags.includes(flowerTag) && !rows.at(-1)!.paletteTags.includes(impactTag)
    && !rows.at(-1)!.tileTags.includes(flowerTag) && !rows.at(-1)!.tileTags.includes(impactTag), `${side}: first inactive cleanup`);
  const rgb = rawFrames(config.rawRgbArchive, rows);
  const rgbSequence = Buffer.concat(rgb);
  invariant(sha(rgbSequence) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: chronological RGB fresh-run SHA`);
  const map = normalizedMap(side, probe, rgb);
  invariant(sha(file(config.changeMap)) === config.changeMapSha256 && file(config.changeMap).toString("utf8") === map, `${side}: normalized banked map`);
  return { sourceWindow: probe.sourceWindow, denseRows: rows.length, rawRgbRows: rgb.length,
    displayTransfer: { oam: "243/243 predecessor", matrices: "243/243 predecessor", palette: "242/243 predecessor; age 7 same-row monbg" },
    lifecycles: { bigFlowers: ranges(rows, "sprites", (entry) => entry.template?.symbol === "gPetalDanceBigFlowerSpriteTemplate"), smallFlowers: ranges(rows, "sprites", (entry) => entry.template?.symbol === "gPetalDanceSmallFlowerSpriteTemplate"), ellipse: [10, 199], shake: [206, 219] },
    cleanup: { age: 243, active: false, visualTasks: 0, soundTasks: 0, tasks: 0, moveSprites: 0, tagsReleased: true },
  };
}

export function verifyPetalDanceEvidence(): Json {
  const fixture = JSON.parse(file("tools/compare/fixtures/petal-dance-evidence.json").toString("utf8")) as Json;
  invariant(fixture.schema === "petal-dance-bilateral-evidence/v1" && fixture.oracleProfile === "battle-scene-on"
    && fixture.move === "MOVE_PETAL_DANCE" && fixture.moveId === 80 && fixture.status === "unsupported-evidence" && fixture.coverageCredit === false, "fixture boundary");
  const audit = execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root });
  invariant(sha(audit) === fixture.source.auditRunSha256,
    `source audit output drift: ${sha(audit)} != ${fixture.source.auditRunSha256}`);
  for (const key of ["audit", "probe", "sharedProbe"] as const) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key} drift`);
  const parsedAudit = JSON.parse(audit.toString("utf8")) as Json;
  invariant(parsedAudit.pointerOwned.root.rom.start === "0x082d281c" && parsedAudit.pointerOwned.root.rom.endExclusive === "0x082d2954"
    && parsedAudit.graph.components.length === 13 && parsedAudit.scope.productionChanged === false && parsedAudit.scope.coveragePromotion === false, "source/component boundary");
  const coverage = JSON.parse(file("ANIMATION_COVERAGE.json").toString("utf8")) as Json;
  invariant(coverage.entries.some((entry: Json) => entry.move === "MOVE_PETAL_DANCE" && entry.status === "exact")
    && same(coverage.queue, ["MOVE_BONEMERANG"]), "exact promotion queue boundary");
  invariant(fixture.evidenceScope.productionAnimationChanged === false && fixture.evidenceScope.reducerAdded === false
    && fixture.evidenceScope.typedSeamAdded === false && fixture.evidenceScope.compositorAdded === false
    && fixture.evidenceScope.framebufferAcceptance === false && fixture.evidenceScope.coveragePromotion === false
    && fixture.evidenceScope.componentTrackCredit === false && fixture.evidenceScope.latchPromotion === false
    && fixture.evidenceScope.gameplayStateOwned === false, "evidence-only boundary");
  return { schema: fixture.schema, status: fixture.status, coverageCredit: fixture.coverageCredit,
    orientations: Object.fromEntries(([
      "player-back", "opponent-front",
    ] as Side[]).map((side) => [side, verifyOrientation(side, fixture.orientations[side])])) };
}

if (process.argv.includes("--write-maps")) {
  const fixture = JSON.parse(file("tools/compare/fixtures/petal-dance-evidence.json").toString("utf8")) as Json;
  for (const side of ["player-back", "opponent-front"] as Side[]) {
    const receipt = fixture.orientations[side];
    const probe = JSON.parse(gunzipSync(file(receipt.denseState)).toString("utf8")) as Json;
    writeFileSync(resolve(root, receipt.changeMap), normalizedMap(side, probe, rawFrames(receipt.rawRgbArchive, probe.frames)));
    console.log(`wrote ${receipt.changeMap}`);
  }
} else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyPetalDanceEvidence(), null, 2));
}
