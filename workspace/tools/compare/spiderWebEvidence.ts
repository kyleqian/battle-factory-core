/** Strict retained-evidence verifier and normalized banked maps for MOVE_SPIDER_WEB. */
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
const sourceStart = 0x082d38e0;
const sourceEnd = 0x082d3981;
const webTag = 10180;
const spiderTag = 10181;
const components = [
  "asset:ANIM_TAG_SPIDER_WEB", "asset:ANIM_TAG_WEB_THREAD", "sprite:gSpiderWebSpriteTemplate",
  "subroutine:SpiderWebThread", "visualCommand:clearmonbg", "visualCommand:create_web_thread_sprite",
  "visualCommand:monbg", "visualCommand:simple_palette_blend", "visualCommand:splitbgprio",
];
const paths: Record<Side, Json> = {
  "player-back": {
    state: "tools/compare/evidence/spider-web-player-dense-state.json.gz",
    rgb: "tools/compare/evidence/spider-web-player-raw-rgb.tar.gz",
    map: "tools/compare/fixtures/spider-web-changemap-player.json",
    scenario: "tools/battle-lab/mechanic-spider-web-player-spinarak-opponent-onix.json",
  },
  "opponent-front": {
    state: "tools/compare/evidence/spider-web-opponent-dense-state.json.gz",
    rgb: "tools/compare/evidence/spider-web-opponent-raw-rgb.tar.gz",
    map: "tools/compare/fixtures/spider-web-changemap-opponent.json",
    scenario: "tools/battle-lab/mechanic-spider-web-opponent-spinarak-player-onix.json",
  },
};

function transitions(rows: Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}

function contiguousRanges(rows: Json[], key: "tasks" | "sprites", predicate: (entry: Json) => boolean): Json[] {
  const result: Json[] = [];
  const bySlot = new Map<number, number[]>();
  for (const [age, row] of rows.entries()) for (const entry of row[key]) if (predicate(entry)) {
    const ages = bySlot.get(entry.slot) ?? []; ages.push(age); bySlot.set(entry.slot, ages);
  }
  for (const [slot, ages] of bySlot) {
    let start = ages[0]!, previous = start;
    for (const age of [...ages.slice(1), -1]) {
      if (age !== previous + 1) {
        result.push({ slot, start, end: previous, rows: previous - start + 1 });
        start = age;
      }
      previous = age;
    }
  }
  return result.sort((a, b) => a.start - b.start || a.slot - b.slot);
}

function rawFrames(path: string, rows: Json[]): Buffer[] {
  const archive = resolve(root, path);
  const names = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const raw = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 32 * 1024 * 1024 });
  const bytes = 240 * 160 * 3;
  invariant(names.length === rows.length && raw.length === rows.length * bytes, `${path}: RGB shape`);
  return rows.map((row, age) => {
    invariant(names[age]!.endsWith(`${String(row.frame).padStart(5, "0")}.rgb`), `${path}: member ${age}`);
    const frame = raw.subarray(age * bytes, (age + 1) * bytes);
    invariant(sha(frame) === row.sha256, `${path}: row ${age}`);
    return frame;
  });
}

function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { count: 0, bounds: null };
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel++) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset] && current[offset + 1] === previous[offset + 1] && current[offset + 2] === previous[offset + 2]) continue;
    count++; const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { count, bounds: count ? [minX, minY, maxX, maxY] : null };
}

function compactSprite(entry: Json): Json {
  return {
    slot: entry.slot, template: entry.template.symbol, callback: entry.callback.symbol, visible: entry.visible,
    attr: entry.attr, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, data: entry.data,
    matrixNum: entry.matrixNum, matrix: entry.matrix,
  };
}

function compactTask(entry: Json): Json { return { slot: entry.slot, func: entry.func.symbol, data: entry.data }; }

function normalizedMap(side: Side, rows: Json[], rgb: Buffer[]): string {
  const mapped = rows.map((row, age) => {
    const focused = row.sprites.filter((entry: Json) => ["gWebThreadSpriteTemplate", "gSpiderWebSpriteTemplate", "gSimplePaletteBlendSpriteTemplate"].includes(entry.template.symbol)).map(compactSprite);
    const previous = rows[age - 1];
    return {
      age, frame: row.frame, active: row.animScriptActive, owner: row.scriptOwner, scriptPtr: row.scriptPtr,
      scriptParity: row.scriptPtrParity, scriptOffset: row.scriptOffset, scriptWait: row.scriptWait,
      rgb: changedPixels(rgb[age - 1], rgb[age]),
      tasks: row.tasks.map(compactTask), sprites: focused,
      banked: {
        oam: { software: sha(JSON.stringify(row.softwareOam)), hardware: sha(JSON.stringify(row.hardwareOam)), predecessor: age > 0 && same(row.hardwareOam, previous!.softwareOam) },
        matrices: { software: sha(JSON.stringify(row.softwareMatrices)), hardware: sha(JSON.stringify(row.hardwareMatrices)), predecessor: age > 0 && same(row.hardwareMatrices, previous!.softwareMatrices) },
        palette: {
          unfaded: sha(JSON.stringify(row.unfadedPalette)), faded: sha(JSON.stringify(row.fadedPalette)), hardware: sha(JSON.stringify(row.hardwarePalette)),
          predecessor: age > 0 && same(row.hardwarePalette, previous!.fadedPalette), sameRowFaded: same(row.hardwarePalette, row.fadedPalette),
        },
      },
      resources: {
        tileTags: row.tileTags.filter((tag: number) => [webTag, spiderTag].includes(tag)),
        paletteTags: row.paletteTags.filter((tag: number) => [webTag, spiderTag].includes(tag)),
        matrixBitmap: row.resourceAllocators?.matrixBitmap,
        tileBitmap: row.resourceAllocators?.tileBitmap,
      },
      bg: {
        battle: row.battleBg,
        vram: row.bgVram,
        registers: { bg1cnt: row.registers.bg1cnt, bg2cnt: row.registers.bg2cnt, bg1hofs: row.registers.bg1hofs, bg1vofs: row.registers.bg1vofs, bg2hofs: row.registers.bg2hofs, bg2vofs: row.registers.bg2vofs, bldcnt: row.registers.bldcnt, bldalpha: row.registers.bldalpha },
      },
      audio: Object.fromEntries(["SE1", "SE2"].map((name) => [name, { symbol: row.audio[name].songHeaderIdentity.symbol, panX: row.audio[name].tracks[0].panX }])),
      state: { parties: sha(JSON.stringify(row.parties)), battlers: sha(JSON.stringify(row.battlers)), engine: sha(JSON.stringify(row.engine)), immutable: sha(JSON.stringify(row.immutableState)), rawBattle: sha(JSON.stringify(row.rawBattleState)) },
      rng: { animation: row.animationRng, gameplay: row.rawBattleState.gameplayRng },
    };
  });
  return `${JSON.stringify({ schema: "spider-web-normalized-change-map/v1", side, rows: mapped }, null, 2)}\n`;
}

function verifySide(side: Side, config: Json): Json {
  const compressed = file(config.denseState), json = gunzipSync(compressed), probe = JSON.parse(json.toString("utf8")) as Json;
  const rows = probe.frames as Json[], rgb = rawFrames(config.rawRgbArchive, rows);
  invariant(sha(compressed) === config.denseStateSha256 && sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: semantic payload digest`);
  invariant(sha(file(config.rawRgbArchive)) === config.rawRgbArchiveSha256 && sha(Buffer.concat(rgb)) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: RGB payload digest`);
  invariant(probe.schema === "spider-web-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 169, `${side}: identity`);
  invariant(rows.length === 207 && same(probe.sourceWindow, config.sourceWindow), `${side}: complete retained window`);
  invariant(same(probe.sourcePointerContract, { start: sourceStart, endExclusive: sourceEnd, observedAddresses: [sourceStart, sourceStart + 3, sourceStart + 6, sourceStart + 8, sourceStart + 10, sourceStart + 27, sourceStart + 106, sourceStart + 118, sourceStart + 123, sourceStart + 140, sourceStart + 160], observedParities: [0, 1] }), `${side}: pointer contract`);
  invariant(rows.every((row) => row.scriptOwner === "Move_SPIDER_WEB" && row.scriptPtr >= sourceStart && row.scriptPtr < sourceEnd && row.scriptOffset === row.scriptPtr - sourceStart && row.scriptPtrParity === (row.scriptPtr & 1)), `${side}: source ownership`);
  invariant(rows[0]!.scriptOffset === 0 && rows[0]!.animScriptActive && rows.at(-1)!.scriptOffset === 140 && !rows.at(-1)!.animScriptActive, `${side}: first active/inactive cleanup`);
  invariant(same(transitions(rows, (row) => row.scriptPtr), [1, 4, 7, 10, 12, 39, 81, 121, 174, 179]), `${side}: source cursor transitions`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.parties.player.length === 3 && row.parties.opponent.length === 3), `${side}: dense shape`);

  const web = (entry: Json) => entry.template.symbol === "gWebThreadSpriteTemplate";
  const spider = (entry: Json) => entry.template.symbol === "gSpiderWebSpriteTemplate";
  const simple = (entry: Json) => entry.template.symbol === "gSimplePaletteBlendSpriteTemplate";
  invariant(same(contiguousRanges(rows, "sprites", web), [
    [3, 39, 80], [4, 42, 83], [5, 45, 86], [7, 48, 89], [9, 51, 92], [10, 54, 95], [11, 57, 98], [12, 60, 101], [13, 63, 104], [14, 66, 107], [15, 69, 110], [16, 72, 113], [17, 75, 116], [18, 78, 119],
  ].map(([slot, start, end]) => ({ slot, start, end, rows: 42 }))), `${side}: web thread lifecycles`);
  invariant(rows.flatMap((row) => row.sprites.filter(web)).every((entry: Json) => entry.callback.symbol === "AnimTranslateWebThread_Step"), `${side}: web thread callback`);
  invariant(same(contiguousRanges(rows, "sprites", spider), [{ slot: 3, start: 121, end: 172, rows: 52 }]), `${side}: affine web lifecycle`);
  const spiderRows = rows.flatMap((row) => row.sprites.filter(spider));
  invariant(spiderRows[0]!.callback.symbol === "AnimSpiderWeb_Step" && spiderRows.at(-1)!.callback.symbol === "AnimSpiderWeb_End" && (spiderRows.at(-1)!.flags & 4) !== 0, `${side}: affine web teardown callback`);
  invariant(same(contiguousRanges(rows, "sprites", simple), [{ slot: 3, start: 12, end: 37, rows: 26 }, { slot: 3, start: 179, end: 204, rows: 26 }]), `${side}: palette blend lifecycles`);
  invariant(same(contiguousRanges(rows, "tasks", (entry) => entry.func.symbol === "Task_UpdateMonBg"), [{ slot: 1, start: 7, end: 176, rows: 170 }])
    && same(contiguousRanges(rows, "tasks", (entry) => entry.func.symbol === "Task_LoopAndPlaySE"), [{ slot: 0, start: 39, end: 87, rows: 49 }])
    && same(contiguousRanges(rows, "tasks", (entry) => entry.func.symbol === "Task_ClearMonBg"), [{ slot: 0, start: 174, end: 176, rows: 3 }]), `${side}: task lifecycles`);
  invariant(same(transitions(rows, (row) => row.tileTags.filter((tag: number) => [webTag, spiderTag].includes(tag))), [1, 4, 206])
    && same(transitions(rows, (row) => row.paletteTags.filter((tag: number) => [webTag, spiderTag].includes(tag))), [1, 4, 206])
    && same(transitions(rows, (row) => row.resourceAllocators.matrixBitmap), [121, 173]), `${side}: resource lifecycles`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)), `${side}: OAM predecessor RAM+1`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)), `${side}: matrix predecessor RAM+1`);
  invariant(same(rows.slice(1).map((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette) ? null : age + 1).filter((age) => age !== null), [7]), `${side}: palette exception map`);
  invariant(same(transitions(rows, (row) => row.unfadedPalette), [1, 4, 7])
    && same(transitions(rows, (row) => row.fadedPalette), [1, 4, 7, 15, 19, 23, 27, 31, 182, 186, 190, 194, 198])
    && same(transitions(rows, (row) => row.hardwarePalette), [2, 5, 7, 16, 20, 24, 28, 32, 183, 187, 191, 195, 199]), `${side}: palette banks`);
  invariant(same(transitions(rows, (row) => row.bgVram), [8, 176, 178]) && same(transitions(rows, (row) => row.battleBg), [7, 177]), `${side}: BG VRAM/scroll lifecycle`);
  invariant(same(transitions(rows, (row) => [row.registers.bldcnt, row.registers.bldalpha]), [121, 142, 144, 146, 148, 150, 152, 154, 156, 158, 160, 162, 164, 166, 168, 170, 172, 173]), `${side}: blend register lifecycle`);
  invariant(rows[39]!.audio.SE1.songHeaderIdentity.symbol === "se_m_string_shot" && rows[39]!.audio.SE1.tracks[0].panX === (side === "player-back" ? -64 : 63)
    && rows[121]!.audio.SE1.songHeaderIdentity.symbol === "se_m_string_shot2" && rows[121]!.audio.SE1.tracks[0].panX === (side === "player-back" ? 63 : -63), `${side}: orientation audio`);
  invariant(rows.every((row) => same(row.parties, rows[0]!.parties) && same(row.battlers, rows[0]!.battlers) && same(row.engine, rows[0]!.engine) && same(row.immutableState, rows[0]!.immutableState) && same(row.rawBattleState, rows[0]!.rawBattleState)), `${side}: immutable battle/gameplay state`);
  invariant(new Set(rows.map((row) => row.rawBattleState.gameplayRng)).size === 1 && transitions(rows, (row) => row.animationRng).length === 204 && new Set(rows.map((row) => row.animationRng)).size === 205, `${side}: RNG boundary`);
  invariant(rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && rows.at(-1)!.tasks.length === 0 && !rows.at(-1)!.sprites.some((entry: Json) => [webTag, spiderTag].includes(entry.template?.tileTag)) && !rows.at(-1)!.tileTags.includes(webTag) && !rows.at(-1)!.tileTags.includes(spiderTag), `${side}: exact inactive cleanup`);
  const map = normalizedMap(side, rows, rgb);
  invariant(map === file(config.changeMap).toString("utf8"), `${side}: normalized map drift`);
  return {
    rows: rows.length, sourceRows: rows.filter((row) => row.scriptOwner === "Move_SPIDER_WEB").length,
    sourceWindow: probe.sourceWindow, rawRgbSequenceSha256: sha(Buffer.concat(rgb)), probeJsonSha256: sha(json), changedRgbRows: transitions(rows, (row) => row.sha256).length,
    tasks: { monbg: "7..176", loopse: "39..87", clear: "174..176" }, sprites: { webThreads: 14, affineWeb: "3:121..172", paletteBlend: ["12..37", "179..204"] },
    latches: { oam: "206/206 predecessor", matrices: "206/206 predecessor", palette: "205/206 predecessor; age 7 same-row" }, cleanupAge: 206,
  };
}

export function verifySpiderWebEvidence(): Json {
  const fixture = JSON.parse(file("tools/compare/fixtures/spider-web-evidence.json").toString("utf8")) as Json;
  invariant(fixture.schema === "spider-web-bilateral-evidence/v1" && fixture.status === "exact" && fixture.coverageCredit === true, "fixture boundary");
  invariant(fixture.acceptance.productionFramebuffer === true
    && fixture.acceptance.productionFramebufferRows === "414/414"
    && fixture.acceptance.productionFramebufferResidualPixels === 0
    && fixture.acceptance.actualCoreVerifier === "tools/compare/spiderWebActualCore.ts"
    && fixture.acceptance.actualCoreRenderPasses === 2
    && fixture.acceptance.alteredLiveControl === true
    && fixture.acceptance.coveragePromotion === true
    && fixture.acceptance.componentTrackPromotion === true, "production acceptance boundary");
  invariant(same(fixture.components, components) && fixture.oracleProfile === "battle-scene-on" && fixture.acceptance.freshRunsPerOrientation === 2, "fixture components/oracle");
  for (const side of ["player-back", "opponent-front"] as const) for (const key of ["scenario", "denseState", "rawRgbArchive", "changeMap"])
    invariant(sha(file(fixture.orientations[side][key])) === fixture.orientations[side][`${key}Sha256`], `${side}: ${key} digest`);
  for (const key of ["probe", "sharedProbe"]) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key} digest`);
  invariant(sha(file(fixture.source.audit)) === fixture.source.auditSha256, "source audit script digest");
  const audit = execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root });
  invariant(sha(audit) === fixture.source.auditRunSha256, "source audit output drift");
  const auditJson = JSON.parse(audit.toString("utf8")) as Json;
  invariant(auditJson.status === "exact" && auditJson.coverageCredit === false && auditJson.source.pointerOwnedRoot.rom.start === "0x082d38e0" && auditJson.source.pointerOwnedRoot.rom.endExclusive === "0x082d3981", "source audit boundary");
  invariant(same(auditJson.graph.components, components) && auditJson.carrierSource.lowestLegalLevel50Set === 27 && auditJson.carriers[0].setId === 27, "source audit graph/carrier");
  const coverage = JSON.parse(file("ANIMATION_COVERAGE.json").toString("utf8")) as Json;
  invariant(same(coverage.queue, ["MOVE_SHOCK_WAVE"]) && coverage.entries.some((entry: Json) =>
    entry.move === "MOVE_SPIDER_WEB" && entry.status === "exact"), "coverage queue boundary");
  return { schema: fixture.schema, status: fixture.status, coverageCredit: fixture.coverageCredit, orientations: Object.fromEntries((["player-back", "opponent-front"] as const).map((side) => [side, verifySide(side, fixture.orientations[side])])) };
}

if (process.argv.includes("--write-maps")) {
  for (const side of ["player-back", "opponent-front"] as const) {
    const probe = JSON.parse(gunzipSync(file(paths[side].state)).toString("utf8")) as Json;
    writeFileSync(resolve(root, paths[side].map), normalizedMap(side, probe.frames, rawFrames(paths[side].rgb, probe.frames)));
    console.log(`wrote ${basename(paths[side].map)}`);
  }
} else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifySpiderWebEvidence(), null, 2));
