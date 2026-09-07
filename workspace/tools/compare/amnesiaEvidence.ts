/** Strict hermetic verifier for the complete bilateral MOVE_AMNESIA checkpoint. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/amnesia-evidence.json"), "utf8")) as Json;
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const invariant: (value: unknown, message: string) => asserts value = (value, message) => { if (!value) throw new Error(message); };
const file = (path: string): Buffer => readFileSync(resolve(root, path));
const agesChanged = (rows: Json[], key: string): number[] => rows.slice(1).flatMap((row, i) => same(row[key], rows[i]![key]) ? [] : [i + 1]);
const lives = (rows: Json[], predicate: (entry: Json) => boolean, key: "sprites" | "tasks"): number[] => rows.flatMap((row, age) => row[key].some(predicate) ? [age] : []);

function verifyChangeMap(side: Side, config: Json, rows: Json[], raw: Buffer): number {
  const lines = file(config.changeMap).toString("utf8").trimEnd().split("\n");
  invariant(lines[0] === `# MOVE_AMNESIA ${side} — 216 frames, 240x160`, `${side}: change-map header`);
  const parsed = new Map<number, { count: number; bounds: number[] }>();
  for (const line of lines) {
    const hit = line.match(/^(\d+)\s+(\d+)\s+(\d+),(\d+)-(\d+),(\d+)$/u);
    if (hit) parsed.set(+hit[1]!, { count: +hit[2]!, bounds: hit.slice(3).map(Number) });
  }
  const frameBytes = 240 * 160 * 3;
  let changedRows = 0;
  for (let age = 1; age < rows.length; age++) {
    const before = raw.subarray((age - 1) * frameBytes, age * frameBytes);
    const current = raw.subarray(age * frameBytes, (age + 1) * frameBytes);
    let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel++) {
      const offset = pixel * 3;
      if (before[offset] === current[offset] && before[offset + 1] === current[offset + 1] && before[offset + 2] === current[offset + 2]) continue;
      count++; const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    const event = parsed.get(rows[age]!.frame);
    if (count === 0) invariant(event === undefined, `${side}: false changed row ${age}`);
    else { changedRows++; invariant(event?.count === count && same(event.bounds, [minX, minY, maxX, maxY]), `${side}: change-map row ${age}`); }
  }
  invariant(parsed.size === changedRows && changedRows === 142, `${side}: changed-row count`);
  return changedRows;
}

function verifySide(side: Side): Json {
  const config = fixture.orientations[side] as Json;
  for (const key of ["scenario", "denseState", "rawRgbArchive", "changeMap"]) invariant(sha(file(config[key])) === config[`${key}Sha256`], `${side}: ${key} SHA-256 drift`);
  const json = gunzipSync(file(config.denseState));
  invariant(sha(json) === config.probeJsonSha256 && config.probeJsonSha256 === config.repeatProbeJsonSha256, `${side}: twice-fresh probe digest`);
  const probe = JSON.parse(json.toString("utf8")) as Json, rows = probe.frames as Json[];
  invariant(probe.schema === "amnesia-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 133, `${side}: probe identity`);
  invariant(same(probe.sourceWindow, config.sourceWindow) && rows.length === 216 && rows.every((row, age) => row.frame === 205 + age), `${side}: complete dense window`);
  invariant(same(probe.sourcePointerContract, {
    start: 0x082cd055, endExclusive: 0x082cd079,
    observedAddresses: [0x082cd055, 0x082cd058, 0x082cd05f, 0x082cd06c, 0x082cd072, 0x082cd078, 0x082d7cd3, 0x082d7cdb, 0x082d7cde, 0x082d7ce3],
    observedParities: [0, 1],
  }), `${side}: pointer traversal`);
  invariant(same(probe.sourcePointerContracts, [{ start: 0x082cd055, endExclusive: 0x082cd079 }, { start: 0x082d7cd1, endExclusive: 0x082d7ce5 }]), `${side}: pointer-owned intervals`);
  invariant(rows[0]!.scriptOffset === 0 && rows[0]!.animScriptActive && rows.at(-1)!.scriptOffset === 35 && !rows.at(-1)!.animScriptActive, `${side}: entry/cleanup boundary`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4), `${side}: complete state shape`);

  const symbols = probe.sourceSymbols as Json;
  const qAges = lives(rows, (entry) => (entry.template.address & ~1) === symbols.gQuestionMarkSpriteTemplate, "sprites");
  const bgTaskAges = lives(rows, (entry) => (entry.func.address & ~1) === symbols.SetPsychicBackground_Step, "tasks");
  invariant(qAges.length === 123 && qAges[0] === 52 && qAges.at(-1) === 174, `${side}: question-mark lifecycle`);
  invariant(bgTaskAges.length === 172 && bgTaskAges[0] === 23 && bgTaskAges.at(-1) === 194, `${side}: psychic-background task lifecycle`);
  invariant(rows.slice(0, 215).every((row, age) => age === 0 || row.tileTags.includes(10093) && row.paletteTags.includes(10093)) && !rows[215]!.tileTags.includes(10093) && !rows[215]!.paletteTags.includes(10093), `${side}: ANIM_TAG_AMNESIA lifetime`);
  invariant(same(agesChanged(rows, "bgVram"), [23, 195]), `${side}: BG_PSYCHIC VRAM lifecycle`);
  invariant(same(agesChanged(rows, "unfadedPalette"), [1, 23, 196]), `${side}: unfaded palette edges`);
  invariant(rows.slice(1).every((row, i) => same(row.hardwareOam, rows[i]!.softwareOam)), `${side}: predecessor OAM transfer`);
  invariant(rows.slice(1).every((row, i) => same(row.hardwareMatrices, rows[i]!.softwareMatrices)), `${side}: predecessor matrix transfer`);
  invariant(rows.slice(1).every((row, i) => same(row.hardwarePalette, rows[i]!.fadedPalette)), `${side}: predecessor palette transfer`);

  const first = rows[0]!, attacker = side === "player-back" ? "player" : "opponent";
  invariant(first.battlers[attacker].species === 321 && first.engine.currentMove === 133 && first.battlers[attacker].pp.filter((pp: number) => pp === 19).length === 1, `${side}: live Torkoal Amnesia execution`);
  for (const key of ["battlers", "parties", "engine", "immutableState"]) invariant(rows.every((row) => same(row[key], first[key])), `${side}: immutable ${key}`);
  invariant(rows.every((row) => row.parties.player.every((mon: Json) => mon.checksumValid) && row.parties.opponent.every((mon: Json) => mon.checksumValid)), `${side}: party checksums`);
  invariant(rows.slice(1).every((row, i) => row.immutableState.rngValue === rows[i]!.immutableState.rngValue), `${side}: gameplay RNG stable`);
  invariant(rows.slice(1).filter((row, i) => row.animationRng !== rows[i]!.animationRng).length === 214, `${side}: animation RNG schedule`);
  invariant(!rows.at(-1)!.animScriptActive && rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0 && !rows.at(-1)!.sprites.some((entry: Json) => (entry.template.address & ~1) === symbols.gQuestionMarkSpriteTemplate) && !rows.at(-1)!.tasks.some((entry: Json) => (entry.func.address & ~1) === symbols.SetPsychicBackground_Step), `${side}: first inactive cleanup`);

  const names = execFileSync("tar", ["-tzf", resolve(root, config.rawRgbArchive)], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  invariant(names.length === 216 && names[0] === "rgb/00205.rgb" && names.at(-1) === "rgb/00420.rgb", `${side}: raw RGB archive members`);
  const raw = execFileSync("tar", ["-xOzf", resolve(root, config.rawRgbArchive)], { maxBuffer: 32 * 1024 * 1024 });
  invariant(raw.length === 216 * 240 * 160 * 3 && sha(raw) === config.rawRgbSequenceSha256 && config.rawRgbSequenceSha256 === config.repeatRawRgbSequenceSha256, `${side}: twice-fresh raw RGB sequence`);
  rows.forEach((row, age) => invariant(sha(raw.subarray(age * 115200, (age + 1) * 115200)) === row.sha256, `${side}: raw RGB row ${age}`));
  const changedRows = verifyChangeMap(side, config, rows, raw);
  return { rows: rows.length, sourceWindow: probe.sourceWindow, probeJsonSha256: sha(json), rawRgbSequenceSha256: sha(raw), changedRows, questionMark: [qAges[0], qAges.at(-1)], psychicTask: [bgTaskAges[0], bgTaskAges.at(-1)], cleanup: { age: 215, active: false } };
}

export function verifyAmnesiaEvidence(): Json {
  invariant(fixture.schema === "amnesia-bilateral-evidence/v1" && fixture.status === "unsupported-evidence" && fixture.coverageCredit === false, "evidence identity");
  invariant(fixture.evidenceScope.productionAnimationChanged === false && fixture.evidenceScope.reducerAdded === false && fixture.evidenceScope.typedSeamAdded === false && fixture.evidenceScope.compositorAdded === false && fixture.evidenceScope.componentTrackCredit === false && fixture.evidenceScope.latchPromotion === false && fixture.evidenceScope.coveragePromotion === false && fixture.evidenceScope.transientOverrides.length === 0, "unsupported-only boundary");
  for (const key of ["audit", "probe", "frameChangeMap"]) invariant(sha(file(fixture.source[key])) === fixture.source[`${key}Sha256`], `source ${key} SHA-256 drift`);
  const auditBytes = execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.audit], { cwd: root });
  invariant(sha(auditBytes) === fixture.source.auditRunSha256, "source audit output drift");
  const audit = JSON.parse(auditBytes.toString("utf8"));
  invariant(audit.move === "MOVE_AMNESIA" && audit.status === "unsupported" && audit.coverageCredit === false && audit.graph.components.length === 10 && audit.carriers.count === 13, "source boundary");
  return { schema: fixture.schema, status: fixture.status, coverageCredit: false, sourceAuditRunSha256: sha(auditBytes), orientations: { "player-back": verifySide("player-back"), "opponent-front": verifySide("opponent-front") } };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyAmnesiaEvidence(), null, 2));
