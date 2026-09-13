/** Hermetic verifier for the complete, pre-production Sky Uppercut receipt. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSkyUppercutChangeMap, type SkySide } from "./skyUppercutChangeMap.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/sky-uppercut-evidence.json"), "utf8")) as Json;
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function path(name: string): string { return resolve(root, name); }
function fileHash(name: string, expected: string): void { const actual = sha(readFileSync(path(name))); invariant(actual === expected, `${name}: digest drift`); }
function ages(edges: Json[]): number[] { return edges.map((edge) => edge.age); }
function mapRanges(map: Json, kind: "sprites" | "tasks"): Json[] { return map.lifecycle[kind].map((life: Json) => [life.slot, life.name, life.start, life.end]); }

function verifyFrameMap(side: SkySide, map: Json, filename: string): void {
  const lines = readFileSync(path(filename), "utf8").trimEnd().split("\n");
  invariant(lines[0] === `# MOVE_SKY_UPPERCUT ${side} — 188 frames, 240x160`, `${side}: frame map header`);
  const events = new Map<number, Json>();
  for (const line of lines.slice(3)) {
    const first = line.match(/^(\d+)  \(first frame\)$/u); if (first) { events.set(+first[1]!, { first: true }); continue; }
    const changed = line.match(/^(\d+)\s+(\d+)\s+(\d+),(\d+)-(\d+),(\d+)$/u);
    if (changed) events.set(+changed[1]!, { changedPixels: +changed[2]!, bounds: changed.slice(3).map(Number) });
  }
  const expected = map.rgb.rows.filter((row: Json) => row.age === 0 || row.changedPixels !== 0);
  invariant(events.size === expected.length, `${side}: frame map event count`);
  for (const row of expected) { const event = events.get(row.frame); invariant(event && (row.age === 0 ? event.first : event.changedPixels === row.changedPixels && same(event.bounds, row.bounds)), `${side}: frame map row ${row.frame}`); }
}

function verifyMap(side: SkySide, map: Json): void {
  invariant(map.schema === "sky-uppercut-normalized-change-map/v1" && map.side === side, `${side}: map identity`);
  invariant(map.source.rows.length === 188 && map.source.ownerCounts.Move_SKY_UPPERCUT === 188, `${side}: source ownership`);
  invariant(same(map.source.rows.map((row: Json) => row.offset).filter((value: number, index: number, all: number[]) => index === 0 || value !== all[index - 1]), [0, 3, 5, 9, 23, 29, 48, 86, 111, 132, 153, 191, 210, 225, 242, 247, 248]), `${side}: source offsets`);
  invariant(same(mapRanges(map, "sprites"), [[3, "gSlideMonToOffsetSpriteTemplate", 85, 90], [4, "gBasicHitSplatSpriteTemplate", 91, 100], [3, "gBasicHitSplatSpriteTemplate", 94, 103], [5, "gBasicHitSplatSpriteTemplate", 97, 106], [7, "gBasicHitSplatSpriteTemplate", 100, 109], [4, "gBasicHitSplatSpriteTemplate", 103, 112], [9, "gSlideMonToOffsetSpriteTemplate", 103, 107], [3, "gSlideMonToOriginalPosSpriteTemplate", 141, 146], [4, "gSlideMonToOriginalPosSpriteTemplate", 147, 154]]), `${side}: owned sprite lifetimes`);
  invariant(same(mapRanges(map, "tasks"), [[1, "Task_UpdateMonBg", 4, 149], [0, "Task_FadeToBg", 7, 43], [2, "AnimTask_MoveSkyUppercutBg", 26, 167], [0, "AnimTask_ShakeMon2_Step", 91, 100], [0, "AnimTask_ShakeMonInPlace_Step", 109, 117], [0, "Task_ClearMonBg", 147, 149], [3, "Task_FadeToBg", 147, 185]]), `${side}: owned task lifetimes`);
  invariant(same(map.transfers.oam, { matches: "187/187", exceptions: [] }) && same(map.transfers.matrices, { matches: "187/187", exceptions: [] }) && same(map.transfers.palette, { matches: "186/187", exceptions: [4] }), `${side}: predecessor latches`);
  invariant(same(ages(map.transfers.resources.impact.tile), [0, 1, 187]) && same(ages(map.transfers.resources.impact.palette), [0, 1, 187]), `${side}: IMPACT resource lifetime`);
  invariant(same(map.transfers.paletteChanges.faded.map((row: Json) => row.age), [1, 4, 26, 168]) && same(map.transfers.paletteChanges.unfaded.map((row: Json) => row.age), [1, 4, 26, 168]) && same(map.transfers.paletteChanges.hardware.map((row: Json) => row.age), [2, 4, 27, 169]), `${side}: palette cadence`);
  const bg = side === "player-back" ? "gBattle_BG1" : "gBattle_BG2"; const reg = side === "player-back" ? "bg1" : "bg2";
  invariant(same(ages(map.background.vram.all), [0, 5, 26, 149, 151, 168]) && same(ages(map.background.battleBg[`${bg}_X`]).slice(1), [4, 91, 93, 95, 97, 99, 101, 103, 104, 105, 106, 147, 150]), `${side}: BG lifecycle`);
  invariant(ages(map.background.registers[`${reg}hofs`]).includes(5) && ages(map.background.registers[`${reg}hofs`]).includes(148) && ages(map.background.registers[`${reg}vofs`]).includes(151) && map.background.scanline.banks.length === 188, `${side}: BG/register/scanline retention`);
  invariant(same(map.audio.SE2.slice(0, 2).map((edge: Json) => [edge.age, edge.value[0]]), [[0, "se_select"], [26, "se_m_sky_uppercut"]]), `${side}: Sky Uppercut audio`);
  invariant(map.audio.SE1.some((edge: Json) => edge.age === 91 && edge.value[0] === "se_m_vital_throw2") && map.audio.SE1.some((edge: Json) => edge.age === 103 && edge.value[0] === "se_m_vital_throw2"), `${side}: Vital Throw audio`);
  invariant(map.state.partiesStable && map.state.battlersStable && map.state.engineStable && map.state.immutableStable && map.state.rawBattleStateStable && map.state.gameplayRng.length === 1 && map.state.animationRng.distinct === 186 && map.state.animationRng.edges.length === 186, `${side}: state/RNG isolation`);
  invariant(map.rgb.rows.length === 188 && map.rgb.changedRows === 170, `${side}: RGB rows`);
  invariant(same(map.cleanup, { age: 187, frame: side === "player-back" ? 269 : 273, active: false, scriptOffset: 248, visualTasks: 0, soundTasks: 0, tasks: 0, sprites: 0, impactTag: false, scanlineState: 0 }), `${side}: cleanup`);
}

function verifyOrientation(side: SkySide): Json {
  const config = fixture.orientations[side] as Json;
  for (const key of ["scenario", "denseState", "rawRgbArchive", "normalizedMap", "frameChangeMap"]) fileHash(config[key], config[`${key}Sha256`]);
  const dense = readFileSync(path(config.denseState)); const json = gunzipSync(dense); const probe = JSON.parse(json.toString("utf8")) as Json; const rows = probe.frames as Json[];
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: twice-fresh semantic receipt`);
  invariant(probe.schema === "sky-uppercut-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 327 && same(probe.sourceWindow, config.sourceWindow) && rows.length === 188, `${side}: dense identity/window`);
  invariant(rows.every((row, age) => row.frame === config.sourceWindow.startFrame + age && row.animScriptActive === (age < 187) && row.scriptPtr >= 0x082d6ed7 && row.scriptPtr < 0x082d6fd0 && row.scriptPtrParity === (row.scriptPtr & 1) && row.scriptOwner === "Move_SKY_UPPERCUT"), `${side}: contiguous pointer body`);
  invariant(rows[0]!.scriptOffset === 0 && rows.at(-1)!.scriptOffset === 248 && rows.at(-1)!.animScriptActive === false && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: entry/cleanup pointer contract`);
  for (const row of rows) {
    invariant(row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.scanlineBuffers.length === 2 && row.parties.player.length === 3 && row.parties.opponent.length === 3, `${side}: full state shape at ${row.frame}`);
    invariant(row.parties.player.every((mon: Json) => mon.checksumValid) && row.parties.opponent.every((mon: Json) => mon.checksumValid) && row.immutableState.battleOutcome === 0 && row.immutableState.weather === 0 && row.immutableState.sideStatuses.every((value: number) => value === 0), `${side}: legal transient-free state at ${row.frame}`);
  }
  const attacker = side === "player-back" ? "player" : "opponent"; const target = side === "player-back" ? "opponent" : "player"; const first = rows[0]!;
  invariant(first.battlers[attacker].species === 107 && first.battlers[target].species === 95 && first.engine.currentMove === 327 && first.engine.controllerExecFlags === (side === "player-back" ? 1 : 2), `${side}: legal orientation`);
  invariant(first.battlers[attacker].pp.filter((pp: number) => pp === 14).length === 1 && first.battlers[attacker].pp.filter((pp: number) => pp === 15).length === 3, `${side}: exactly one PP spent`);
  invariant(first.animationMovePower === 85 && first.animationMoveDamage === (side === "player-back" ? 87 : 91) && rows.every((row) => same(row.parties, first.parties) && same(row.battlers, first.battlers) && same(row.engine, first.engine) && same(row.immutableState, first.immutableState) && same(row.rawBattleState, first.rawBattleState)), `${side}: immutable gameplay state`);
  const map = buildSkyUppercutChangeMap(path(config.denseState), path(config.rawRgbArchive), side); const encoded = `${JSON.stringify(map, null, 2)}\n`;
  invariant(sha(Buffer.from(encoded)) === config.normalizedMapSha256 && readFileSync(path(config.normalizedMap), "utf8") === encoded, `${side}: normalized map reproducibility`);
  invariant(map.rgb.sequenceSha256 === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: twice-fresh RGB sequence`);
  verifyMap(side, map); verifyFrameMap(side, map, config.frameChangeMap);
  return { sourceWindow: probe.sourceWindow, rows: rows.length, rawRgbRows: map.rgb.rows.length, probeJsonSha256: sha(json), rawRgbSequenceSha256: map.rgb.sequenceSha256, normalizedMapSha256: sha(Buffer.from(encoded)), changedRows: map.rgb.changedRows, latches: { oam: map.transfers.oam, matrices: map.transfers.matrices, palette: map.transfers.palette }, cleanup: map.cleanup };
}

export function verifySkyUppercutEvidence(): Json {
  invariant(fixture.schema === "sky-uppercut-bilateral-evidence/v1" && fixture.oracleProfile === "battle-scene-on" && fixture.move === "MOVE_SKY_UPPERCUT" && fixture.moveId === 327 && fixture.status === "unsupported-evidence" && fixture.coverageCredit === false && fixture.evidenceScope.transientOverrides.length === 0 && fixture.evidenceScope.productionAnimationChanged === false && fixture.evidenceScope.coveragePromotion === false, "evidence-only boundary drift");
  for (const key of ["audit", "probe", "sharedProbe", "mapBuilder", "frameChangeMapBuilder"] as const) fileHash(fixture.source[key], fixture.source[`${key}Sha256`]);
  const auditOutput = execFileSync(process.execPath, ["--experimental-strip-types", path(fixture.source.audit)], { cwd: root }); invariant(sha(auditOutput) === fixture.source.auditRunSha256, "source audit output drift");
  const audit = JSON.parse(auditOutput.toString("utf8")) as Json; invariant(audit.status === "unsupported-evidence" && audit.coverageCredit === false && audit.source.pointerOwnedRoot.rom.start === "0x082d6ed7" && audit.source.pointerOwnedRoot.rom.endExclusive === "0x082d6fd0" && audit.carriers.all.length === 3, "source boundary drift");
  const coverage = JSON.parse(readFileSync(path("ANIMATION_COVERAGE.json"), "utf8")) as Json; invariant(same(coverage.queue, ["MOVE_SIGNAL_BEAM"]) && coverage.entries.some((entry: Json) => entry.move === "MOVE_SKY_UPPERCUT" && entry.status === "exact"), "coverage boundary drift");
  return { schema: fixture.schema, status: fixture.status, coverageCredit: false, sourceAuditRunSha256: sha(auditOutput), orientations: { "player-back": verifyOrientation("player-back"), "opponent-front": verifyOrientation("opponent-front") } };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifySkyUppercutEvidence(), null, 2));
