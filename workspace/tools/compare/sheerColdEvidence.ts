/** Strict hermetic verifier and normalized bank/change-map generator for MOVE_SHEER_COLD. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const file = (path: string): Buffer => readFileSync(resolve(root, path));
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`MOVE_SHEER_COLD evidence drift: ${message}`); }
function transitions(rows: Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}
function edgeValues(rows: Json[], select: (row: Json) => unknown): [number, unknown][] {
  return transitions(rows, select).map((age) => [age, select(rows[age]!)]);
}
function ranges(rows: Json[], key: "tasks" | "sprites", predicate: (entry: Json) => boolean): Json[] {
  const slots = new Map<number, number[]>();
  for (const [age, row] of rows.entries()) for (const entry of row[key]) if (predicate(entry)) {
    const ages = slots.get(entry.slot) ?? []; ages.push(age); slots.set(entry.slot, ages);
  }
  return [...slots].flatMap(([slot, ages]) => {
    const groups: number[][] = [];
    for (const age of ages) {
      const group = groups.at(-1);
      if (!group || age !== group.at(-1)! + 1) groups.push([age]); else group.push(age);
    }
    return groups.map((group) => ({ slot, start: group[0], end: group.at(-1), rows: group.length }));
  }).sort((a, b) => a.start - b.start || a.slot - b.slot);
}
function paletteBanks(palette: number[]): string[] {
  return Array.from({ length: 32 }, (_, bank) => sha(JSON.stringify(palette.slice(bank * 16, bank * 16 + 16))));
}
function rawFrames(path: string, rows: Json[]): Buffer[] {
  const names = execFileSync("tar", ["-tzf", resolve(root, path)], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const raw = execFileSync("tar", ["-xOzf", resolve(root, path)], { maxBuffer: 32 * 1024 * 1024 });
  const bytes = 240 * 160 * 3;
  invariant(names.length === rows.length && raw.length === rows.length * bytes, `${path}: raw RGB shape`);
  return rows.map((row, age) => {
    invariant(names[age]!.endsWith(`${String(row.frame).padStart(5, "0")}.rgb`), `${path}: raw member ${age}`);
    const frame = raw.subarray(age * bytes, (age + 1) * bytes);
    invariant(sha(frame) === row.sha256, `${path}: raw row ${age}`);
    return frame;
  });
}

const retained: Record<Side, Json> = {
  "player-back": { state: "tools/compare/evidence/sheer-cold-player-dense-state.json.gz", rgb: "tools/compare/evidence/sheer-cold-player-raw-rgb.tar.gz", map: "tools/compare/evidence/sheer-cold-changemap-player.json" },
  "opponent-front": { state: "tools/compare/evidence/sheer-cold-opponent-dense-state.json.gz", rgb: "tools/compare/evidence/sheer-cold-opponent-raw-rgb.tar.gz", map: "tools/compare/evidence/sheer-cold-changemap-opponent.json" },
};

function normalizedMap(side: Side, rows: Json[], rgb: Buffer[]): string {
  const mapped = rows.map((row, age) => {
    let changedPixels = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel++) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset] && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1] && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      changedPixels++; const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    const cube = row.sprites.find((entry: Json) => entry.template.symbol === "sFrozenIceCubeSpriteTemplate");
    return {
      age, frame: row.frame, active: row.animScriptActive, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait,
      changedPixels, bounds: changedPixels ? [minX, minY, maxX, maxY] : null,
      counts: { visual: row.visualTaskCount, sound: row.soundTaskCount },
      cube: cube ? { slot: cube.slot, callback: cube.callback.symbol, attr: cube.attr, x: cube.x, y: cube.y, x2: cube.x2, y2: cube.y2, data: cube.data, matrixNum: cube.matrixNum, matrix: cube.matrix, subpriority: cube.subpriority, flags: cube.flags } : null,
      cubeSubspriteOam: { software: row.softwareOam.slice(9, 13), hardware: row.hardwareOam.slice(9, 13) },
      spriteOrder: row.spriteOrder,
      tasks: row.tasks.map((entry: Json) => ({ slot: entry.slot, func: entry.func.symbol, data: entry.data })),
      oam: { software: sha(JSON.stringify(row.softwareOam)), hardware: sha(JSON.stringify(row.hardwareOam)) },
      matrices: { software: sha(JSON.stringify(row.softwareMatrices)), hardware: sha(JSON.stringify(row.hardwareMatrices)), allocation: row.resourceAllocators.matrixBitmap },
      palettes: { unfaded: paletteBanks(row.unfadedPalette), faded: paletteBanks(row.fadedPalette), hardware: paletteBanks(row.hardwarePalette) },
      resources: {
        iceCubeTileBank: row.tileTags.indexOf(10010), iceCubePaletteBank: row.paletteTags.indexOf(10010),
        allocatorSha256: sha(JSON.stringify(row.resourceAllocators)), matrixBitmap: row.resourceAllocators.matrixBitmap,
      },
      registers: row.registers, bg: { scroll: row.battleBg, vram: row.bgVram },
      audio: {
        se1: row.audio.SE1.songHeaderIdentity.symbol,
        se1Tracks: row.audio.SE1.tracks.map((track: Json) => ({ flags: track.flags, pan: track.pan, panX: track.panX })),
        se2: row.audio.SE2.songHeaderIdentity.symbol,
      },
      rng: { animation: row.animationRng, gameplay: row.rawBattleState.gameplayRng },
      state: { immutable: row.immutableState, rawBanks: Object.fromEntries(Object.entries(row.rawBattleState).map(([key, value]) => [key, sha(JSON.stringify(value))])) },
    };
  });
  return `${JSON.stringify({ schema: "sheer-cold-normalized-banked-change-map/v1", side, rows: mapped }, null, 2)}\n`;
}

const taskLives = {
  Task_UpdateMonBg: [{ slot: 1, start: 42, end: 152, rows: 111 }],
  AnimTask_FrozenIceCube_Step1: [{ slot: 0, start: 45, end: 53, rows: 9 }],
  AnimTask_FrozenIceCube_Step2: [{ slot: 0, start: 54, end: 99, rows: 46 }],
  AnimTask_FrozenIceCube_Step3: [{ slot: 0, start: 100, end: 109, rows: 10 }],
  AnimTask_FrozenIceCube_Step4: [{ slot: 0, start: 110, end: 148, rows: 39 }],
  Task_WaitAndPlaySE: [{ slot: 2, start: 45, end: 61, rows: 17 }],
  Task_ClearMonBg: [{ slot: 0, start: 150, end: 152, rows: 3 }],
};
const cursorEdges = [[1,[2,1]],[20,[7,1]],[39,[11,1]],[40,[11,0]],[42,[13,1]],[43,[13,0]],[45,[30,1]],[150,[35,1]]];
const alphaEdges = [[45,4096],[46,3841],[47,3586],[48,3331],[49,3076],[50,2821],[51,2566],[52,2311],[53,2056],[54,1801],[102,2056],[103,2311],[104,2566],[105,2821],[106,3076],[107,3331],[108,3586],[109,3841],[110,4096],[150,0]];
const cubePaletteEdges = [39,71,74,77,94,97,100];
const expectedSubsprites: Record<Side, string[]> = {
  "player-back": ["fd0480c0197a0000","3d4480c0597a0000","fd84c0c0797a0001","3d04c080997a0001"],
  "opponent-front": ["2f0418c0197a0000","6f4418c0597a0000","2f8458c0797a0001","6f045880997a0001"],
};

function verifySide(side: Side, config: Json): Json {
  const json = gunzipSync(file(config.denseState));
  const probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  const rgb = rawFrames(config.rawRgbArchive, rows), expectedRows = side === "player-back" ? 192 : 191;
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: twice-fresh semantic payload`);
  invariant(sha(Buffer.concat(rgb)) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: twice-fresh RGB payload`);
  invariant(probe.schema === "sheer-cold-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 329, `${side}: identity`);
  invariant(rows.length === expectedRows && same(probe.sourceWindow, config.sourceWindow), `${side}: complete window`);
  invariant(probe.sourcePointerContract.start === 0x082d5242 && probe.sourcePointerContract.endExclusive === 0x082d5267 && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer contract`);
  invariant(rows[0]!.animScriptActive && rows[0]!.scriptOffset === 0 && !rows.at(-1)!.animScriptActive && rows.at(-1)!.scriptOffset === 36, `${side}: first root through first inactive`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512), `${side}: retained hardware banks`);

  for (const [func, expected] of Object.entries(taskLives)) invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === func), expected), `${side}: ${func} life`);
  const restoreEnd = side === "player-back" ? 189 : 188;
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "Task_FadeToBg"), [{ slot: 0, start: 1, end: 37, rows: 37 }, { slot: 2, start: 150, end: restoreEnd, rows: restoreEnd - 149 }]), `${side}: BG_ICE fade/restore lives`);
  const cube = (entry: Json) => entry.template.symbol === "sFrozenIceCubeSpriteTemplate";
  invariant(same(ranges(rows, "sprites", cube), [{ slot: 3, start: 45, end: 146, rows: 102 }]), `${side}: FrozenIceCube sprite life`);
  invariant(rows.slice(45, 147).flatMap((row) => row.sprites.filter(cube)).every((entry: Json) => entry.callback.symbol === "SpriteCallbackDummy" && entry.matrixNum === 0 && same(entry.matrix, [256,0,0,256]) && entry.subpriority === 4 && entry.flags === 1), `${side}: cube parent/subsprite/affine facts`);
  invariant(rows.slice(45, 148).every((row) => same(row.softwareOam.slice(9, 13), expectedSubsprites[side])) && rows.slice(46, 149).every((row) => same(row.hardwareOam.slice(9, 13), expectedSubsprites[side])), `${side}: four subsprite OAM lives/ranks`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)), `${side}: whole OAM RAM+1`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)), `${side}: whole matrices RAM+1`);
  invariant(transitions(rows, (row) => row.resourceAllocators.matrixBitmap).length === 0, `${side}: no affine allocation`);
  invariant(rows.slice(1).flatMap((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette) ? [] : [age + 1]).every((age) => age === 42), `${side}: palette predecessor except monbg setup`);

  invariant(same(edgeValues(rows, (row) => [row.scriptOffset, row.scriptWait]), [...cursorEdges, [expectedRows - 1,[36,0]]]), `${side}: source cursor/waits`);
  invariant(same(edgeValues(rows, (row) => row.visualTaskCount), [[45,1],[149,0]]) && same(edgeValues(rows, (row) => row.soundTaskCount), [[45,1],[62,0]]), `${side}: visual/sound counts`);
  invariant(same(edgeValues(rows, (row) => row.registers.bldalpha), alphaEdges), `${side}: alpha lifecycle`);
  invariant(same(edgeValues(rows, (row) => row.registers.bldcnt), [[2,232],[38,0],[45,16192],[150,0],[151,232],[restoreEnd + 1,0]]), `${side}: blend lifecycle`);
  const initialBldy = [
    ...Array.from({ length: 16 }, (_, index) => [index + 3, index + 1]),
    ...Array.from({ length: 16 }, (_, index) => [index + 22, 15 - index]),
  ];
  const restoreRamp = [
    [152,1], ...Array.from({ length: 15 }, (_, index) => [index + 155, index + 2]),
    ...Array.from({ length: 16 }, (_, index) => [restoreEnd - 15 + index, 15 - index]),
  ];
  invariant(same(edgeValues(rows, (row) => row.registers.bldy), [...initialBldy, ...restoreRamp]), `${side}: BG_ICE fade BLDY lifecycle`);
  invariant(same(transitions(rows, (row) => paletteBanks(row.fadedPalette)[23]), cubePaletteEdges) && same(transitions(rows, (row) => paletteBanks(row.hardwarePalette)[23]), cubePaletteEdges.map((age) => age + 1)), `${side}: ice-cube palette rotations RAM+1`);
  invariant(same(transitions(rows, (row) => row.resourceAllocators), [39, expectedRows - 1]) && rows.slice(39, -1).every((row) => row.tileTags.includes(10010) && row.paletteTags.includes(10010)), `${side}: ICE_CUBE allocation life`);
  invariant(!rows[38]!.tileTags.includes(10010) && !rows.at(-1)!.tileTags.includes(10010) && !rows.at(-1)!.paletteTags.includes(10010), `${side}: ICE_CUBE allocation edges/cleanup`);
  invariant(same(transitions(rows, (row) => row.spriteOrder), [45,148]) && rows.slice(45,148).every((row) => row.spriteOrder[6] === 3), `${side}: stable cube painter order`);

  const bgPaletteRestore = side === "player-back" ? 172 : 171;
  invariant(same(transitions(rows, (row) => row.bgVram), [20,43,152,154,171]), `${side}: BG_ICE/monbg VRAM lifecycle`);
  invariant(same(transitions(rows, (row) => paletteBanks(row.fadedPalette)[2]), [20,bgPaletteRestore]) && same(transitions(rows, (row) => paletteBanks(row.hardwarePalette)[2]), [21,bgPaletteRestore + 1]), `${side}: BG_ICE palette lifecycle RAM+1`);
  const bgKey = side === "player-back" ? "gBattle_BG1_X" : "gBattle_BG2_X", bgReg = side === "player-back" ? "bg1hofs" : "bg2hofs";
  invariant(same(transitions(rows, (row) => row.battleBg[bgKey]), [42,153]), `${side}: target monbg RAM life`);
  invariant(same(transitions(rows, (row) => row.registers[bgReg]), side === "player-back" ? [42,154] : [43,154]), `${side}: independently banked target monbg display life`);
  invariant(same(edgeValues(rows, (row) => row.audio.SE1.songHeaderIdentity.symbol), [[20,"se_m_icy_wind"],[62,"se_m_hail"]]) && transitions(rows, (row) => row.audio.SE2.songHeaderIdentity.symbol).length === 0, `${side}: audio events`);
  invariant(rows[62]!.audio.SE1.tracks[0].panX === (side === "player-back" ? 63 : -63), `${side}: target-panned hail`);

  for (const key of ["playerParty","opponentParty","battleMons","battleOutcome","battleWeather","gameplayRng"]) invariant(rows.every((row) => same(row.rawBattleState[key], rows[0]!.rawBattleState[key])), `${side}: immutable ${key}`);
  invariant(rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), `${side}: immutable semantic state`);
  invariant(rows.every((row) => row.parties.player.slice(1).concat(row.parties.opponent.slice(1)).every((mon: Json) => mon.checksumValid)), `${side}: checksum-valid benches`);
  const attackerParty = side === "player-back" ? rows[0]!.parties.player[0] : rows[0]!.parties.opponent[0];
  invariant(attackerParty.species === 87 && attackerParty.moves.every((move: number) => move === 329) && attackerParty.pp.filter((pp: number) => pp === 4).length === 1, `${side}: legal Dewgong and one PP already spent`);
  invariant(transitions(rows, (row) => row.animationRng).length === 188 && transitions(rows, (row) => row.rawBattleState.gameplayRng).length === 0, `${side}: RNG separation`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && rows.at(-1)!.tasks.length === 0 && !rows.at(-1)!.sprites.some(cube) && rows.at(-1)!.registers.bldcnt === 0 && rows.at(-1)!.registers.bldalpha === 0 && rows.at(-1)!.registers.bldy === 0, `${side}: first fully clean inactive row`);
  invariant(normalizedMap(side, rows, rgb) === file(config.changeMap).toString("utf8"), `${side}: normalized map regeneration`);
  const changedRows = rgb.slice(1).filter((frame, age) => !frame.equals(rgb[age]!)).length;
  invariant(changedRows === 88, `${side}: raw RGB change count`);
  return { rows: expectedRows, changedRows, probeJsonSha256: sha(json), rawRgbSequenceSha256: sha(Buffer.concat(rgb)), cleanupAge: expectedRows - 1 };
}

export function verifySheerColdEvidence(): Json {
  const fixture = JSON.parse(file("tools/compare/fixtures/sheer-cold-evidence.json").toString("utf8")) as Json;
  invariant(fixture.schema === "sheer-cold-bilateral-evidence/v1" && fixture.status === "unsupported-evidence-checkpoint" && fixture.coverageCredit === false, "unsupported evidence boundary");
  for (const side of ["player-back","opponent-front"] as const) for (const key of ["scenario","denseState","rawRgbArchive","changeMap"]) invariant(sha(file(fixture.orientations[side][key])) === fixture.orientations[side][`${key}Sha256`], `${side}: ${key} digest`);
  for (const key of ["audit","probe","sharedProbe","stagingReceipt"]) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key}`);
  const audit = execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root });
  invariant(sha(audit) === fixture.source.auditRunSha256, "source audit output repeatability");
  const staging = JSON.parse(file(fixture.source.stagingReceipt).toString("utf8")) as Json;
  for (const side of ["player-back","opponent-front"] as const) invariant(
    staging.runs[side].romOutcome.moveResultFlags === 16
      && staging.runs[side].romOutcome.targetFinalPartyHp === 0
      && staging.runs[side].romOutcome.targetFinalBattleHp === 0
      && staging.runs[side].pp.spent === 1
      && staging.runs[side].benches.unchanged
      && staging.runs[side].benches.checksumValid,
    `${side}: linked legal PP/OHKO/bench receipt`,
  );
  return { schema: fixture.schema, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries((["player-back","opponent-front"] as const).map((side) => [side, verifySide(side, fixture.orientations[side])])) };
}

if (process.argv.includes("--write-maps")) {
  for (const side of ["player-back","opponent-front"] as const) {
    const probe = JSON.parse(gunzipSync(file(retained[side].state)).toString("utf8")) as Json;
    writeFileSync(resolve(root, retained[side].map), normalizedMap(side, probe.frames, rawFrames(retained[side].rgb, probe.frames)));
    console.log(`wrote ${retained[side].map}`);
  }
} else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifySheerColdEvidence(), null, 2));
