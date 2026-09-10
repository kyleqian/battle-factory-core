/** Strict hermetic verifier and normalized-map generator for MOVE_DESTINY_BOND. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const file = (path: string): Buffer => readFileSync(resolve(root, path));

const paths: Record<Side, Json> = {
  "player-back": {
    state: "tools/compare/evidence/destiny-bond-player-dense-state.json.gz",
    rgb: "tools/compare/evidence/destiny-bond-player-raw-rgb.tar.gz",
    map: "tools/compare/evidence/destiny-bond-changemap-player.json",
  },
  "opponent-front": {
    state: "tools/compare/evidence/destiny-bond-opponent-dense-state.json.gz",
    rgb: "tools/compare/evidence/destiny-bond-opponent-raw-rgb.tar.gz",
    map: "tools/compare/evidence/destiny-bond-changemap-opponent.json",
  },
};

function transitions(rows: Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}
function edgeValues(rows: Json[], select: (row: Json) => unknown): [number, unknown][] {
  return transitions(rows, select).map((age) => [age, select(rows[age]!)]);
}
function ranges(rows: Json[], key: "tasks" | "sprites", predicate: (entry: Json) => boolean): Json[] {
  const bySlot = new Map<number, number[]>();
  for (const [age, row] of rows.entries()) for (const entry of row[key]) if (predicate(entry)) {
    const ages = bySlot.get(entry.slot) ?? []; ages.push(age); bySlot.set(entry.slot, ages);
  }
  return [...bySlot].flatMap(([slot, ages]) => {
    const groups: number[][] = [];
    for (const age of ages) {
      const group = groups.at(-1);
      if (!group || age !== group.at(-1)! + 1) groups.push([age]); else group.push(age);
    }
    return groups.map((group) => ({ slot, start: group[0], end: group.at(-1), rows: group.length }));
  }).sort((a, b) => a.start - b.start || a.slot - b.slot);
}
function rawFrames(path: string, rows: Json[]): Buffer[] {
  const names = execFileSync("tar", ["-tzf", resolve(root, path)], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const raw = execFileSync("tar", ["-xOzf", resolve(root, path)], { maxBuffer: 32 * 1024 * 1024 });
  const bytes = 240 * 160 * 3;
  invariant(names.length === rows.length && raw.length === rows.length * bytes, `${path}: RGB shape`);
  return rows.map((row, age) => {
    invariant(names[age]!.endsWith(`${String(row.frame).padStart(5, "0")}.rgb`), `${path}: member ${age}`);
    const frame = raw.subarray(age * bytes, (age + 1) * bytes);
    invariant(sha(frame) === row.sha256, `${path}: row ${age}`);
    return frame;
  });
}
function paletteBanks(palette: number[]): string[] {
  return Array.from({ length: 32 }, (_, bank) => sha(JSON.stringify(palette.slice(bank * 16, bank * 16 + 16))));
}
function normalizedMap(side: Side, rows: Json[], rgb: Buffer[]): string {
  const mapped = rows.map((row, age) => {
    let changedPixels = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel++) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset] && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1] && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      changedPixels++; const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    const white = row.sprites.find((entry: Json) => entry.template.symbol === "gDestinyBondWhiteShadowSpriteTemplate");
    const shake = row.tasks.find((entry: Json) => entry.func.symbol === "AnimTask_ShakeMonInPlace_Step");
    const blend = row.tasks.find((entry: Json) => entry.func.symbol === "AnimTask_BlendSpriteColor_Step2");
    return {
      age, frame: row.frame, active: row.animScriptActive, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait,
      changedPixels, bounds: changedPixels ? [minX, minY, maxX, maxY] : null,
      whiteShadow: white ? { slot: white.slot, callback: white.callback.symbol, attr: white.attr, x: white.x, y: white.y, x2: white.x2, y2: white.y2, data: white.data, matrixNum: white.matrixNum, matrix: white.matrix } : null,
      spriteOrder: row.spriteOrder,
      tasks: row.tasks.map((entry: Json) => ({ slot: entry.slot, func: entry.func.symbol, data: entry.data })),
      shake: shake?.data ?? null, blend: blend?.data ?? null,
      oam: { software: sha(JSON.stringify(row.softwareOam)), hardware: sha(JSON.stringify(row.hardwareOam)) },
      matrices: { software: sha(JSON.stringify(row.softwareMatrices)), hardware: sha(JSON.stringify(row.hardwareMatrices)) },
      palettes: { unfaded: paletteBanks(row.unfadedPalette), faded: paletteBanks(row.fadedPalette), hardware: paletteBanks(row.hardwarePalette) },
      resources: { tileTags: row.tileTags, paletteTags: row.paletteTags, allocators: row.resourceAllocators },
      registers: { bldcnt: row.registers.bldcnt, bldalpha: row.registers.bldalpha, bldy: row.registers.bldy },
      bg: { identity: row.battleBg, vramSha256: sha(JSON.stringify(row.bgVram)) },
      audio: [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol],
      rng: { animation: row.animationRng, gameplay: row.rawBattleState.gameplayRng },
    };
  });
  return `${JSON.stringify({ schema: "destiny-bond-normalized-banked-change-map/v1", side, rows: mapped }, null, 2)}\n`;
}

const bldalphaEdges = [[43,4096],[45,4097],[47,3841],[49,3842],[51,3586],[53,3587],[55,3331],[57,3332],[59,3076],[61,3077],[63,2821],[65,2822],[67,2566],[69,2567],[71,2311],[73,2312],[75,2056],[77,2057],[79,1801],[81,1802],[83,1546],[85,1547],[87,1291],[89,1292],[91,1036],[93,1035],[95,1291],[97,1290],[99,1546],[101,1545],[103,1801],[105,1800],[107,2056],[109,2055],[111,2311],[113,2310],[115,2566],[117,2565],[119,2821],[121,2820],[123,3076],[125,3075],[127,3331],[129,3330],[131,3586],[133,3585],[135,3841],[137,3840],[139,4096],[141,0]];
const shakeSourceEdges = [93,94,96,98,100,102,104,106,108,110,112,114,116,118,120,122,124,126,128,130,132,134,136,138];
const shakeSoftwareEdges = [93,95,97,99,101,103,105,107,109,111,113,115,117,119,121,123,125,127,129,131,133,135,137,139];
const shakeHardwareEdges = shakeSoftwareEdges.map((age) => age + 1);
const blendPaletteEdges = [95,97,99,101,103,105,107,109,111,113,115,117,121,123,125,127,129,131,133,135,137,139,141,143];

function oamAtRank(row: Json, rank: number, hardware: boolean): string {
  const bank = hardware ? row.hardwareOam : row.softwareOam;
  return bank[rank];
}
function oamX(row: Json, rank: number, hardware: boolean): number {
  const bytes = Buffer.from(oamAtRank(row, rank, hardware), "hex");
  return bytes.readUInt16LE(2) & 0x1ff;
}
function verifySide(side: Side, config: Json): Json {
  const compressed = file(config.denseState), json = gunzipSync(compressed);
  const probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  const raw = rawFrames(config.rawRgbArchive, rows);
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: twice-fresh semantic payload`);
  invariant(sha(Buffer.concat(raw)) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: twice-fresh RGB payload`);
  invariant(probe.schema === "destiny-bond-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 194, `${side}: identity`);
  invariant(rows.length === 188 && same(probe.sourceWindow, config.sourceWindow), `${side}: complete window`);
  invariant(probe.sourcePointerContract.start === 0x082cd62c && probe.sourcePointerContract.endExclusive === 0x082cd687 && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: pointer contract`);
  invariant(rows[0]!.scriptOffset === 0 && rows[0]!.animScriptActive && rows.at(-1)!.scriptOffset === 90 && !rows.at(-1)!.animScriptActive, `${side}: root entry through first inactive`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.parties.player.length === 3 && row.parties.opponent.length === 3), `${side}: retained shape`);

  const white = (entry: Json) => entry.template.symbol === "gDestinyBondWhiteShadowSpriteTemplate";
  invariant(same(ranges(rows, "sprites", white), [{ slot: 3, start: 43, end: 137, rows: 95 }]), `${side}: WHITE_SHADOW life`);
  invariant(rows.flatMap((row) => row.sprites.filter(white)).every((entry: Json) => entry.matrixNum === 0 && same(entry.matrix, [256, 0, 0, 256])), `${side}: WHITE_SHADOW neutral non-affine matrix`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "AnimTask_DestinyBondWhiteShadow_Step"), [{ slot: 0, start: 43, end: 139, rows: 97 }]), `${side}: white-shadow task`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "AnimTask_ShakeMonInPlace_Step"), [{ slot: 1, start: 93, end: 137, rows: 45 }]), `${side}: shake task`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "AnimTask_BlendSpriteColor_Step2"), [{ slot: 2, start: 93, end: 116, rows: 24 }, { slot: 2, start: 119, end: 142, rows: 24 }]), `${side}: palette tasks`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "Task_FadeToBg"), [{ slot: 0, start: 4, end: 41, rows: 38 }, { slot: 0, start: 144, end: 181, rows: 38 }]), `${side}: BG_GHOST fade/restore tasks`);
  invariant(same(ranges(rows, "tasks", (entry) => entry.func.symbol === "Task_ClearMonBg"), [{ slot: 0, start: 183, end: 183, rows: 1 }]), `${side}: clear mon BG`);

  invariant(rows.slice(1).every((row, index) => same(row.hardwareOam, rows[index]!.softwareOam)), `${side}: whole OAM RAM+1`);
  invariant(rows.slice(1).every((row, index) => same(row.hardwareMatrices, rows[index]!.softwareMatrices)), `${side}: whole matrices RAM+1`);
  invariant(rows.slice(1).every((row, index) => same(row.hardwarePalette, rows[index]!.fadedPalette)), `${side}: palette RAM+1`);
  invariant(rows.slice(44, 139).every((row, index) => oamAtRank(row, 11, true) === oamAtRank(rows[index + 43]!, 11, false)), `${side}: WHITE_SHADOW hardware rank 11 +1`);
  invariant(same(edgeValues(rows, (row) => row.registers.bldalpha), bldalphaEdges), `${side}: WHITE_SHADOW BLDALPHA`);
  invariant(same(edgeValues(rows, (row) => row.registers.bldcnt), [[5,232],[42,0],[43,16192],[141,0],[145,232],[182,0]]), `${side}: blend mode order`);

  const attackerRank = side === "player-back" ? 9 : 10;
  invariant(same(transitions(rows, (row) => row.battlerSprites.attacker.x2), shakeSourceEdges), `${side}: shake source timing`);
  invariant(same(transitions(rows, (row) => oamX(row, attackerRank, false)), shakeSoftwareEdges), `${side}: shake software timing`);
  invariant(same(transitions(rows, (row) => oamX(row, attackerRank, true)), shakeHardwareEdges), `${side}: shake hardware timing`);
  invariant(rows[93]!.battlerSprites.attacker.x2 === -2 && rows[94]!.battlerSprites.attacker.x2 === 2 && rows[138]!.battlerSprites.attacker.x2 === 0, `${side}: shake values/cleanup`);

  invariant(same(transitions(rows, (row) => paletteBanks(row.fadedPalette)[16]), blendPaletteEdges) && same(transitions(rows, (row) => paletteBanks(row.fadedPalette)[17]), blendPaletteEdges), `${side}: selector 6 visible battler banks`);
  invariant(rows.slice(93, 144).every((row) => paletteBanks(row.fadedPalette).slice(18).every((hash, index) => hash === paletteBanks(rows[92]!.fadedPalette)[index + 18])), `${side}: selector 6 excludes remaining OBJ banks`);
  invariant(same(transitions(rows, (row) => paletteBanks(row.hardwarePalette)[16]), blendPaletteEdges.map((age) => age + 1)), `${side}: blend hardware palette latch`);

  invariant(same(transitions(rows, (row) => row.bgVram), [23, 163]), `${side}: BG_GHOST VRAM load/restore`);
  invariant(same(transitions(rows, (row) => paletteBanks(row.fadedPalette)[2]), [24, 164]) && same(transitions(rows, (row) => paletteBanks(row.hardwarePalette)[2]), [25, 165]), `${side}: BG_GHOST palette load/restore and latch`);
  invariant(same(edgeValues(rows, (row) => row.registers.bldy), [[6,1],[7,2],[8,3],[9,4],[10,5],[11,6],[12,7],[13,8],[14,9],[15,10],[16,11],[17,12],[18,13],[19,14],[20,15],[21,16],[26,15],[27,14],[28,13],[29,12],[30,11],[31,10],[32,9],[33,8],[34,7],[35,6],[36,5],[37,4],[38,3],[39,2],[40,1],[41,0],[146,1],[147,2],[148,3],[149,4],[150,5],[151,6],[152,7],[153,8],[154,9],[155,10],[156,11],[157,12],[158,13],[159,14],[160,15],[161,16],[166,15],[167,14],[168,13],[169,12],[170,11],[171,10],[172,9],[173,8],[174,7],[175,6],[176,5],[177,4],[178,3],[179,2],[180,1],[181,0]]), `${side}: BG_GHOST BLDY schedule`);

  invariant(rows.slice(1, 187).every((row) => row.tileTags.includes(10188) && row.paletteTags.includes(10188)) && !rows[0]!.tileTags.includes(10188) && !rows[187]!.tileTags.includes(10188) && !rows[187]!.paletteTags.includes(10188), `${side}: WHITE_SHADOW resource life`);
  invariant(same(transitions(rows, (row) => row.resourceAllocators), [1,187]), `${side}: resource allocator edges`);
  invariant(same(rows[0]!.resourceAllocators.paletteTags, rows[187]!.resourceAllocators.paletteTags)
    && rows[187]!.resourceAllocators.tileTags[6] === 65535
    && rows[187]!.resourceAllocators.tileBitmap === rows[0]!.resourceAllocators.tileBitmap
    && rows[187]!.resourceAllocators.matrixBitmap === rows[0]!.resourceAllocators.matrixBitmap
    && same(rows[187]!.resourceAllocators.tileRanges[6], [305,32]), `${side}: allocator cleanup bookkeeping`);
  invariant(same(transitions(rows, (row) => row.spriteOrder), [43,139]) && rows.slice(43,139).every((row) => row.spriteOrder[8] === 3), `${side}: WHITE_SHADOW stable source order`);
  invariant(same([4, 43, 119].map((age) => rows[age]!.audio.SE1.songHeaderIdentity.symbol), ["se_m_psybeam", "se_m_confuse_ray", "se_m_nightmare"]), `${side}: audio order`);
  invariant(same(transitions(rows, (row) => row.audio.SE1.songHeaderIdentity.symbol), [4,43,119]), `${side}: audio edges`);
  for (const key of ["playerParty", "opponentParty", "battleMons", "battleOutcome", "battleWeather", "gameplayRng"]) invariant(rows.every((row) => same(row.rawBattleState[key], rows[0]!.rawBattleState[key])), `${side}: immutable ${key}`);
  invariant(rows.every((row) => same(row.immutableState, rows[0]!.immutableState)), `${side}: immutable gameplay state`);
  invariant(transitions(rows, (row) => row.animationRng).length === 185 && transitions(rows, (row) => row.rawBattleState.gameplayRng).length === 0, `${side}: animation/gameplay RNG split`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && rows.at(-1)!.tasks.length === 0 && !rows.at(-1)!.sprites.some(white) && rows.at(-1)!.registers.bldcnt === 0 && rows.at(-1)!.registers.bldalpha === 0 && rows.at(-1)!.registers.bldy === 0, `${side}: cleanup`);
  invariant(normalizedMap(side, rows, raw) === file(config.changeMap).toString("utf8"), `${side}: normalized map drift`);
  const changedRows = transitions(rows, (row) => row.sha256).length;
  invariant(changedRows === 161, `${side}: changed-row count`);
  return { rows: 188, changedRows, probeJsonSha256: sha(json), rawRgbSequenceSha256: sha(Buffer.concat(raw)), attackerRank };
}

export function verifyDestinyBondEvidence(): Json {
  const fixture = JSON.parse(file("tools/compare/fixtures/destiny-bond-evidence.json").toString("utf8")) as Json;
  invariant(fixture.schema === "destiny-bond-bilateral-evidence/v1" && fixture.status === "unsupported-evidence-checkpoint" && fixture.coverageCredit === false, "fixture unsupported boundary");
  for (const side of ["player-back", "opponent-front"] as const) for (const key of ["scenario", "denseState", "rawRgbArchive", "changeMap"]) invariant(sha(file(fixture.orientations[side][key])) === fixture.orientations[side][`${key}Sha256`], `${side}: ${key} digest`);
  for (const key of ["audit", "probe", "sharedProbe", "stagingReceipt"]) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key}`);
  const audit = execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root });
  invariant(sha(audit) === fixture.source.auditRunSha256, "audit output");
  return { schema: fixture.schema, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries((["player-back", "opponent-front"] as const).map((side) => [side, verifySide(side, fixture.orientations[side])])) };
}

if (process.argv.includes("--write-maps")) {
  for (const side of ["player-back", "opponent-front"] as const) {
    const probe = JSON.parse(gunzipSync(file(paths[side].state)).toString("utf8")) as Json;
    writeFileSync(resolve(root, paths[side].map), normalizedMap(side, probe.frames, rawFrames(paths[side].rgb, probe.frames)));
    console.log(`wrote ${basename(paths[side].map)}`);
  }
} else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyDestinyBondEvidence(), null, 2));
