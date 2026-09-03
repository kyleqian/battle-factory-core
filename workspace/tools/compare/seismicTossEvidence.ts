/** Strict hermetic verifier for complete bilateral MOVE_SEISMIC_TOSS evidence. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { buildSeismicTossChangeMap } from "./seismicTossChangeMap.ts";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/seismic-toss-evidence.json"), "utf8")) as Json;
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const invariant = (value: unknown, message: string): asserts value => { if (!value) throw new Error(message); };
const paths = (side: Side) => fixture.orientations[side] as Json;

function hash(path: string, expected: string): void { invariant(sha(readFileSync(resolve(root, path))) === expected, `${path}: SHA-256 drift`); }
function ages(edges: readonly unknown[][]): number[] { return edges.map((edge) => edge[0] as number); }
function audioHeaders(edges: readonly unknown[][]): unknown[][] { return edges.filter((edge, i) => i === 0 || edge[1][0] !== edges[i - 1]![1][0]).map((edge) => [edge[0], edge[1][0]]); }

function verifyText(side: Side, map: Json, path: string): void {
  const lines = readFileSync(resolve(root, path), "utf8").trimEnd().split("\n");
  invariant(lines[0] === `# MOVE_SEISMIC_TOSS ${side} — 228 frames, 240x160`, `${side}: frame-map header`);
  const events = new Map<number, Json>();
  for (const line of lines.slice(3)) {
    const first = line.match(/^(\d+)  \(first frame\)$/u); if (first) { events.set(+first[1]!, { first: true }); continue; }
    const changed = line.match(/^(\d+)\s+(\d+)\s+(\d+),(\d+)-(\d+),(\d+)$/u);
    if (changed) events.set(+changed[1]!, { changedPixels: +changed[2]!, bounds: changed.slice(3).map(Number) });
  }
  const expected = map.rgb.rows.filter((row: Json) => row.age === 0 || row.changedPixels !== 0);
  invariant(events.size === expected.length, `${side}: frame-map event count`);
  for (const row of expected) { const event = events.get(row.frame); invariant(event && (row.age === 0 ? event.first : event.changedPixels === row.changedPixels && same(event.bounds, row.bounds)), `${side}: frame-map row ${row.frame}`); }
}

function verifyMap(side: Side, map: Json): void {
  invariant(map.schema === "seismic-toss-normalized-change-map/v1" && map.side === side, `${side}: map identity`);
  invariant(same(map.source.ownerCounts, { Move_SEISMIC_TOSS: 152, SeismicTossContinue: 44, SeismicTossWeak: 0, SeismicTossMedium: 32, SeismicTossStrong: 0, SeismicTossRockScatter1: 0, SeismicTossRockScatter2: 0 }), `${side}: Medium source ownership`);
  invariant(map.lifecycle.sprites.length === 15 && map.lifecycle.tasks.length === 9, `${side}: owned lifecycle count`);
  invariant(same(map.lifecycle.tasks.map((life: Json) => [life.slot, life.name, life.start, life.end]), [
    [1, "Task_UpdateMonBg", 7, 225], [0, "Task_FadeToBg", 13, 49], [2, "AnimTask_MoveSeismicTossBg", 32, 150],
    [0, "AnimTask_SeismicTossBgAccelerateDownAtEnd", 152, 202], [2, "AnimTask_ShakeMon_Step", 152, 159],
    [2, "AnimTask_ShakeMon_Step", 168, 175], [2, "AnimTask_ShakeMon_Step", 184, 191], [3, "Task_FadeToBg", 184, 221], [0, "Task_ClearMonBg", 223, 225],
  ]), `${side}: task slots/lifetimes`);
  invariant(map.lifecycle.sprites.filter((life: Json) => life.name === "gBasicHitSplatSpriteTemplate").length === 3 && map.lifecycle.sprites.filter((life: Json) => life.name === "gRockScatterSpriteTemplate").length === 12, `${side}: sprite lifetimes`);
  invariant(same(map.transfers.oam, { matches: "227/227", exceptions: [] }) && same(map.transfers.matrices, { matches: "227/227", exceptions: [] }) && same(map.transfers.palette, { matches: "226/227", exceptions: [7] }), `${side}: whole-buffer predecessor latches`);
  invariant(same(map.transfers.resources.impact, { tag: 10135, tile: [[0, false], [1, true], [227, false]], palette: [[0, false], [1, true], [227, false]] }) && same(map.transfers.resources.rocks, { tag: 10058, tile: [[0, false], [4, true], [227, false]], palette: [[0, false], [4, true], [227, false]] }), `${side}: resource tags`);
  invariant(same(map.transfers.paletteChanges.faded.map((row: Json) => row.age), [1, 4, 7, 32, 204]) && same(map.transfers.paletteChanges.unfaded.map((row: Json) => row.age), [1, 4, 7, 32, 204]) && same(map.transfers.paletteChanges.hardware.map((row: Json) => row.age), [2, 5, 7, 33, 205]), `${side}: palette transfer cadence`);
  invariant(same(ages(map.background.vram.all), [0, 8, 32, 203, 225, 227]) && same(ages(map.background.registers.bg3cnt), [0, 32, 204]), `${side}: BG_IN_AIR VRAM/control lifetime`);
  invariant(ages(map.background.battleBg.gBattle_BG3_Y).includes(32) && ages(map.background.registers.bg3vofs).includes(33) && ages(map.background.battleBg.gBattle_BG3_Y).includes(152) && ages(map.background.registers.bg3vofs).includes(153) && map.background.battleBg.gBattle_BG3_Y.at(-1)[0] === 203 && map.background.registers.bg3vofs.at(-1)[0] === 204, `${side}: Seismic Toss BG task RAM+1 scanout`);
  const targetBg = side === "player-back" ? "gBattle_BG1_Y" : "gBattle_BG2_Y", targetReg = side === "player-back" ? "bg1vofs" : "bg2vofs";
  const shakeAges = [154, 156, 158, 160, 170, 172, 174, 176, 186, 188, 190, 192];
  invariant(same(ages(map.battlerAxes.target).filter((age) => age >= 154), shakeAges) && same(ages(map.background.battleBg[targetBg]).filter((age) => age >= 154 && age <= 192), shakeAges) && same(ages(map.background.registers[targetReg]).filter((age) => age >= 155 && age <= 193), shakeAges.map((age) => age + 1)), `${side}: AnimTask_ShakeMon measured BG RAM+1 cadence`);
  invariant(same(audioHeaders(map.audio.SE1), [[0, "se_ball_open"], [152, "se_m_strength"], [168, "se_m_rock_throw"], [184, "se_m_strength"]]) && same(audioHeaders(map.audio.SE2), [[0, "se_select"], [32, "se_m_sky_uppercut"]]), `${side}: audio program`);
  invariant(map.state.partiesStable && map.state.battlersStable && map.state.engineStable && map.state.immutableStable && map.state.gameplayRngEdges.length === 1 && map.state.animationRngDistinct === 225 && map.state.animationRngEdges.length === 225, `${side}: immutable gameplay/animation RNG`);
  invariant(map.rgb.rows.length === 228 && map.rgb.changedRows === 196, `${side}: RGB rows`);
  invariant(same(map.cleanup, { age: 227, frame: side === "player-back" ? 304 : 308, active: false, visualTasks: 0, soundTasks: 0, ownedSprites: 0, ownedTasks: 0 }), `${side}: first inactive cleanup`);
}

function verifySide(side: Side): Json {
  const config = paths(side); for (const key of ["denseState", "rawRgbArchive", "normalizedMap", "frameChangeMap"]) hash(config[key], config[`${key}Sha256`]);
  hash(config.scenario, config.scenarioSha256 ?? sha(readFileSync(resolve(root, config.scenario))));
  const compressed = readFileSync(resolve(root, config.denseState)), json = gunzipSync(compressed), probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: twice-fresh dense state`);
  invariant(probe.schema === "seismic-toss-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 69 && same(probe.sourceWindow, config.sourceWindow), `${side}: dense identity`);
  invariant(rows.length === 228 && rows.every((row, age) => row.frame === config.sourceWindow.startFrame + age && row.scriptPtr >= 0x082d6b00 && row.scriptPtr < 0x082d6c5d), `${side}: complete contiguous source window`);
  invariant(rows[0]!.scriptOffset === 0 && rows.at(-1)!.animScriptActive === false && rows.at(-1)!.scriptOffset === 82 && same(probe.sourcePointerContract.observedParities, [0, 1]), `${side}: exclusive root/cleanup boundary`);
  for (const row of rows) invariant(row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4, `${side}: full state shape at ${row.frame}`);
  const first = rows[0]!, attacker = side === "player-back" ? "player" : "opponent", target = side === "player-back" ? "opponent" : "player";
  invariant(first.battlers[attacker].species === 352 && first.battlers[target].species === 95 && first.battlers[target].hp === 142 && first.engine.currentMove === 69 && first.engine.controllerExecFlags === (side === "player-back" ? 1 : 2), `${side}: legal Grumpig/Onix orientation`);
  invariant(first.battlers[attacker].pp.reduce((sum: number, pp: number) => sum + (pp === 19 ? 1 : 0), 0) === 1 && first.battlers[attacker].pp.filter((pp: number) => pp !== 19).every((pp: number) => pp === 20), `${side}: exactly one PP spent`);
  invariant(rows.every((row) => row.parties.player.every((mon: Json) => mon.checksumValid) && row.parties.opponent.every((mon: Json) => mon.checksumValid) && row.immutableState.battleOutcome === 0 && row.immutableState.weather === 0 && row.immutableState.sideStatuses.every((value: number) => value === 0)), `${side}: legal immutable party/gameplay state`);
  const map = buildSeismicTossChangeMap(resolve(root, config.denseState), resolve(root, config.rawRgbArchive)), bytes = Buffer.from(`${JSON.stringify(map, null, 2)}\n`);
  invariant(bytes.equals(readFileSync(resolve(root, config.normalizedMap))) && sha(bytes) === config.normalizedMapSha256, `${side}: reproducible normalized map`);
  invariant(map.rgb.sequenceSha256 === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: twice-fresh raw RGB`);
  verifyMap(side, map); verifyText(side, map, config.frameChangeMap);
  return { sourceWindow: probe.sourceWindow, rows: rows.length, probeJsonSha256: sha(json), rawRgbSequenceSha256: map.rgb.sequenceSha256, normalizedMapSha256: sha(bytes), changedRows: map.rgb.changedRows, latches: { oam: map.transfers.oam, matrices: map.transfers.matrices, palette: map.transfers.palette }, cleanup: map.cleanup };
}

function verify(): Json {
  invariant(fixture.schema === "seismic-toss-bilateral-evidence/v1" && fixture.status === "unsupported-evidence" && fixture.coverageCredit === false && fixture.evidenceScope.productionAnimationChanged === false && fixture.evidenceScope.coveragePromotion === false && fixture.evidenceScope.transientOverrides.length === 0, "evidence-only boundary");
  for (const key of ["probe", "mapBuilder", "frameChangeMapBuilder", "audit"]) hash(fixture.source[key], fixture.source[`${key}Sha256`]);
  const auditBytes = execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root }); invariant(sha(auditBytes) === fixture.source.auditRunSha256, "source audit output");
  const audit = JSON.parse(auditBytes.toString("utf8")); invariant(audit.move === "MOVE_SEISMIC_TOSS" && audit.status === "exact" && audit.damageBranch.thresholds[1].branch === "SeismicTossMedium" && audit.checkpoint.trackFulfilled === true, "source/coverage boundary");
  return { schema: fixture.schema, status: fixture.status, coverageCredit: false, sourceAuditRunSha256: sha(auditBytes), orientations: { "player-back": verifySide("player-back"), "opponent-front": verifySide("opponent-front") } };
}

console.log(JSON.stringify(verify(), null, 2));
