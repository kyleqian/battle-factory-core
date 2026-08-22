import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/lovely-kiss-evidence.json"), "utf8")) as Json;
const sha = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function rgbMembers(path: string, rows: readonly Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", path], { encoding: "utf8" })
    .trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", path], { maxBuffer: 32 * 1024 * 1024 });
  const frameSize = 240 * 160 * 3;
  invariant(members.length === rows.length && bytes.length === rows.length * frameSize, `${path}: raw RGB shape`);
  const byName = new Map(members.map((name, index) => [name.replace(/^\.\//u, ""), bytes.subarray(index * frameSize, (index + 1) * frameSize)]));
  return rows.map((row) => {
    const name = `${String(row.frame).padStart(5, "0")}.rgb`;
    const frame = byName.get(name);
    if (!frame) throw new Error(`${path}: missing ${name}`);
    return frame;
  });
}

function changeMap(side: Side, rows: readonly Json[], rgb: readonly Buffer[]): string {
  const effectTemplates = new Set(["gDevilSpriteTemplate", "gPinkHeartSpriteTemplate"]);
  const transitions = (select: (row: Json) => unknown): number[] => rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
  const mapRows = rows.map((row, age) => {
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
    const effects = row.sprites.filter((sprite: Json) => effectTemplates.has(sprite.template.symbol)).map((sprite: Json) => ({
      slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol,
      x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, invisible: sprite.invisible,
      matrixNum: sprite.matrixNum, matrix: sprite.matrix, animation: sprite.animation, data: sprite.data,
    }));
    return {
      age, frame: row.frame, scriptOffset: row.scriptOffset, scriptPtr: row.scriptPtr,
      active: row.animScriptActive, changedPixels,
      bounds: changedPixels ? [minX, minY, maxX, maxY] : null,
      effectSprites: effects,
      visualTaskCount: row.visualTaskCount, soundTaskCount: row.soundTaskCount,
      audio: [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol],
      paletteTags: row.paletteTags, tileTags: row.tileTags,
    };
  });
  return `${JSON.stringify({
    schema: "lovely-kiss-normalized-change-map/v1", side,
    sourceWindow: rows.length ? { startFrame: rows[0]!.frame, endFrame: rows.at(-1)!.frame, frameCount: rows.length } : null,
    lifecycle: { devilCreates: 1, pinkHeartCreates: 4, devilDestroys: 1, pinkHeartDestroys: 4 },
    transitions: { animationRng: transitions((row) => row.animationRng), paletteTags: transitions((row) => row.paletteTags), tileTags: transitions((row) => row.tileTags), registers: Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions((row) => row.registers[key])]).filter(([, values]) => (values as number[]).length)) },
    latches: { hardwareOamEqualsPrecedingSoftware: `${rows.slice(1).filter((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)).length}/${rows.length - 1}`, hardwareMatricesEqualsPrecedingSoftware: `${rows.slice(1).filter((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)).length}/${rows.length - 1}`, hardwarePaletteEqualsPrecedingFaded: `${rows.slice(1).filter((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette)).length}/${rows.length - 1}` },
    rows: mapRows,
  }, null, 2)}\n`;
}

function verifyScenario(path: string, side: Side): void {
  const scenario = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
  invariant(scenario.schemaVersion === 1 && scenario.mode === "mechanicLab" && scenario.profile === "battle-scene-on" && scenario.level === 50 && scenario.challengeNum === 3, `${side}: scenario contract`);
  invariant(scenario.overrides && Object.keys(scenario.overrides).join(",") === "parties", `${side}: transient/battler override present`);
  const parties = scenario.overrides.parties;
  invariant(parties.player.length === 3 && parties.opponent.length === 3, `${side}: incomplete parties`);
  const active = side === "player-back" ? parties.player[0] : parties.opponent[0];
  const target = side === "player-back" ? parties.opponent[0] : parties.player[0];
  invariant(active.species === 124 && active.moves.every((move: number) => move === 142) && active.item === 219, `${side}: Jynx carrier drift`);
  invariant(target.species === 95 && target.moves.every((move: number) => move === 33), `${side}: Onix target drift`);
  const required = ["species", "level", "nature", "ivs", "evs", "moves", "ppUps", "item", "abilitySlot", "friendship", "gender", "shiny"];
  for (const mon of [...parties.player, ...parties.opponent]) {
    invariant(required.every((field) => Object.hasOwn(mon, field)), `${side}: incomplete legal party record`);
    invariant(mon.level === 50 && mon.moves.length === 4 && mon.ppUps.length === 4, `${side}: legal party shape`);
    invariant(Object.keys(mon.ivs).length === 6 && Object.keys(mon.evs).length === 6, `${side}: legal stat shape`);
    for (const transient of ["hp", "status", "statStages", "volatile", "weather", "outcome"]) invariant(!Object.hasOwn(mon, transient), `${side}: transient ${transient} injected`);
  }
}

function verifyOrientation(side: Side, row: Json): Json {
  verifyScenario(row.scenario, side);
  invariant(sha(readFileSync(resolve(root, row.scenario))) === row.scenarioSha256, `${side}: scenario SHA`);
  const denseGzip = readFileSync(resolve(root, row.denseState));
  const denseBytes = gunzipSync(denseGzip);
  invariant(sha(denseGzip) === row.denseStateSha256 && sha(denseBytes) === row.probeJsonSha256, `${side}: dense SHA`);
  const evidence = JSON.parse(denseBytes.toString("utf8")) as Json;
  const rows = evidence.frames as Json[];
  invariant(evidence.schema === "lovely-kiss-dense-evidence/v1" && evidence.profile === "battle-scene-on" && evidence.move === 142, `${side}: evidence schema`);
  invariant(same(evidence.sourceWindow, row.sourceWindow) && rows.length === 153, `${side}: dense source window`);
  invariant(rows.every((item, age) => item.frame === row.sourceWindow.startFrame + age), `${side}: non-dense frame sequence`);
  invariant(rows[0]!.scriptOffset === 0 && rows[0]!.animScriptActive === true, `${side}: source start`);
  invariant(rows.slice(0, -1).every((item) => item.animScriptActive === true) && rows.at(-1)!.animScriptActive === false, `${side}: first inactive cleanup`);
  invariant(same(evidence.topology.tasks, []), `${side}: unexpected visual task topology`);
  for (const callback of ["AnimDevil", "AnimPinkHeart", "AnimPinkHeart_Step"]) invariant(evidence.topology.callbacks.includes(callback), `${side}: missing callback ${callback}`);
  for (const template of ["gDevilSpriteTemplate", "gPinkHeartSpriteTemplate"]) invariant(evidence.topology.templates.includes(template), `${side}: missing template ${template}`);
  const effectRows = rows.map((item) => item.sprites.filter((sprite: Json) => ["gDevilSpriteTemplate", "gPinkHeartSpriteTemplate"].includes(sprite.template.symbol)));
  const starts = (template: string): number => effectRows.reduce((count, current, age) => count + current.filter((sprite: Json) => sprite.template.symbol === template && !(effectRows[age - 1] ?? []).some((previous: Json) => previous.slot === sprite.slot)).length, 0);
  invariant(starts("gDevilSpriteTemplate") === 1 && starts("gPinkHeartSpriteTemplate") === 4, `${side}: effect lifecycle`);
  invariant(rows.every((item) => item.softwareOam.length === 128 && item.hardwareOam.length === 128 && item.softwareMatrices.length === 32 && item.hardwareMatrices.length === 32 && item.fadedPalette.length === 512 && item.unfadedPalette.length === 512 && item.hardwarePalette.length === 512 && item.paletteTags.length === 16 && item.tileTags.length === 128 && Object.keys(item.registers).length === 21 && item.audio.SE1 && item.audio.SE2), `${side}: incomplete dense row`);
  for (const field of ["battlers", "parties", "engine", "immutableState"]) invariant(rows.every((item) => same(item[field], rows[0]![field])), `${side}: mutable gameplay field ${field}`);
  invariant(rows.every((item) => item.immutableState.rngValue === rows[0]!.immutableState.rngValue), `${side}: gameplay RNG changed`);
  invariant(rows.filter((item) => item.animationRng !== rows[0]!.animationRng).length === 152, `${side}: animation RNG receipt`);
  invariant(rows.some((item) => item.audio.SE1.songHeaderIdentity.symbol === "se_m_psybeam2") && rows.some((item) => item.audio.SE1.songHeaderIdentity.symbol === "se_m_attract"), `${side}: audio identity`);
  invariant(rows[1]!.tileTags[6] === 10219 && rows[4]!.tileTags[7] === 10221 && rows.at(-1)!.tileTags[6] === 65535 && rows.at(-1)!.tileTags[7] === 65535, `${side}: tagged asset lifetime`);
  const oamRows = rows.slice(1).filter((item, age) => same(item.hardwareOam, rows[age]!.softwareOam)).length;
  const matrixRows = rows.slice(1).filter((item, age) => same(item.hardwareMatrices, rows[age]!.softwareMatrices)).length;
  const paletteRows = rows.slice(1).filter((item, age) => same(item.hardwarePalette, rows[age]!.fadedPalette)).length;
  invariant(oamRows === 152 && matrixRows === 152 && paletteRows === 152, `${side}: hardware latch`);
  const archive = readFileSync(resolve(root, row.rawRgbArchive));
  invariant(sha(archive) === row.rawRgbArchiveSha256, `${side}: RGB archive SHA`);
  const rgb = rgbMembers(resolve(root, row.rawRgbArchive), rows);
  invariant(sha(Buffer.concat(rgb)) === row.rawRgbSequenceSha256 && rgb.every((bytes, age) => sha(bytes) === rows[age]!.sha256), `${side}: RGB rows`);
  const mapPath = resolve(root, row.changeMap); const normalized = changeMap(side, rows, rgb);
  if (process.argv.includes("--write-maps")) writeFileSync(mapPath, normalized);
  else invariant(sha(readFileSync(mapPath)) === row.changeMapSha256 && readFileSync(mapPath, "utf8") === normalized, `${side}: change map`);
  const last = rows.at(-1)!;
  invariant(last.tasks.length === 0 && last.visualTaskCount === 0 && last.soundTaskCount === 0 && !last.sprites.some((sprite: Json) => ["gDevilSpriteTemplate", "gPinkHeartSpriteTemplate"].includes(sprite.template.symbol)), `${side}: cleanup topology`);
  return { orientation: side, sourceWindow: evidence.sourceWindow, lifecycle: { devilCreates: 1, pinkHeartCreates: 4 }, latches: { oam: `${oamRows}/${rows.length - 1}`, matrices: `${matrixRows}/${rows.length - 1}`, palette: `${paletteRows}/${rows.length - 1}` }, sourceRows: rows.length, rawRgbRows: rgb.length, gameplayRngTransitions: 0, animationRngTransitions: 152, framebufferCompared: false };
}

export function verifyLovelyKissEvidence(): Record<string, Json> {
  invariant(fixture.schema === "lovely-kiss-bilateral-evidence/v1" && fixture.oracleProfile === "battle-scene-on" && fixture.move === "MOVE_LOVELY_KISS" && fixture.status === "exact" && fixture.coverageCredit === true, "Lovely Kiss exact contract drift");
  invariant(fixture.evidenceScope.productionAnimationChanged === true && fixture.evidenceScope.reducerAdded === true && fixture.evidenceScope.typedSeamAdded === true && fixture.evidenceScope.compositorAdded === true && fixture.evidenceScope.framebufferCompared === true, "Lovely Kiss exact scope drift");
  const results = {} as Record<string, Json>;
  for (const side of ["player-back", "opponent-front"] as const) results[side] = verifyOrientation(side, fixture.orientations[side]);
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyLovelyKissEvidence(), null, 2));
