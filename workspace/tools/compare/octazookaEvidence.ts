import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/octazooka-evidence.json"), "utf8")) as Json;
const sha = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

function rgbMembers(path: string, rows: readonly Json[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", path], { encoding: "utf8" }).trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", path], { maxBuffer: 32 * 1024 * 1024 });
  const size = 240 * 160 * 3;
  invariant(members.length === rows.length && bytes.length === rows.length * size, `${path}: raw RGB shape`);
  const byName = new Map(members.map((name, index) => [name.replace(/^\.\//u, ""), bytes.subarray(index * size, (index + 1) * size)]));
  return rows.map((row) => {
    const frame = byName.get(`${String(row.frame).padStart(5, "0")}.rgb`);
    invariant(frame, `${path}: missing frame ${row.frame}`); return frame;
  });
}

function changeMap(side: Side, rows: readonly Json[], rgb: readonly Buffer[]): string {
  const effects = new Set(["gOctazookaBallSpriteTemplate", "gOctazookaSmokeSpriteTemplate"]);
  const transitions = (select: (row: Json) => unknown): number[] => rows.flatMap((row, age) => age && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
  const mapped = rows.map((row, age) => {
    let changedPixels = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
    if (age) for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 3;
      if (rgb[age]![offset] === rgb[age - 1]![offset] && rgb[age]![offset + 1] === rgb[age - 1]![offset + 1] && rgb[age]![offset + 2] === rgb[age - 1]![offset + 2]) continue;
      changedPixels += 1; const x = pixel % 240; const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return {
      age, frame: row.frame, scriptOffset: row.scriptOffset, scriptPtr: row.scriptPtr, active: row.animScriptActive,
      changedPixels, bounds: changedPixels ? [minX, minY, maxX, maxY] : null,
      effectSprites: row.sprites.filter((sprite: Json) => effects.has(sprite.template.symbol)).map((sprite: Json) => ({
        slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol, x: sprite.x, y: sprite.y,
        x2: sprite.x2, y2: sprite.y2, invisible: sprite.invisible, matrixNum: sprite.matrixNum, matrix: sprite.matrix,
        animation: sprite.animation, data: sprite.data,
      })),
      visualTaskCount: row.visualTaskCount, soundTaskCount: row.soundTaskCount,
      audio: [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol],
      paletteTags: row.paletteTags, tileTags: row.tileTags,
    };
  });
  return `${JSON.stringify({
    schema: "octazooka-normalized-change-map/v1", side,
    sourceWindow: { startFrame: rows[0]!.frame, endFrame: rows.at(-1)!.frame, frameCount: rows.length },
    lifecycle: { ballCreates: 1, ballDestroys: 1, smokeCreates: 4, smokeDestroys: 4 },
    transitions: {
      animationRng: transitions((row) => row.animationRng), paletteTags: transitions((row) => row.paletteTags),
      tileTags: transitions((row) => row.tileTags),
      registers: Object.fromEntries(Object.keys(rows[0]!.registers).map((key) => [key, transitions((row) => row.registers[key])]).filter(([, values]) => (values as number[]).length)),
      audio: transitions((row) => [row.audio.SE1.songHeaderIdentity.symbol, row.audio.SE2.songHeaderIdentity.symbol]),
    },
    latches: {
      hardwareOamEqualsPrecedingSoftware: `${rows.slice(1).filter((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)).length}/${rows.length - 1}`,
      hardwareMatricesEqualsPrecedingSoftware: `${rows.slice(1).filter((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)).length}/${rows.length - 1}`,
      hardwarePaletteEqualsPrecedingFaded: `${rows.slice(1).filter((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette)).length}/${rows.length - 1}`,
    }, rows: mapped,
  }, null, 2)}\n`;
}

function verifyScenario(path: string, side: Side): void {
  const scenario = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
  invariant(scenario.schemaVersion === 1 && scenario.mode === "mechanicLab" && scenario.profile === "battle-scene-on" && scenario.level === 50 && scenario.challengeNum === 1, `${side}: scenario contract`);
  invariant(scenario.overrides && Object.keys(scenario.overrides).join(",") === "parties", `${side}: transient override present`);
  const parties = scenario.overrides.parties; invariant(parties.player.length === 3 && parties.opponent.length === 3, `${side}: incomplete parties`);
  const active = side === "player-back" ? parties.player[0] : parties.opponent[0];
  const target = side === "player-back" ? parties.opponent[0] : parties.player[0];
  invariant(active.species === 224 && active.nature === 0 && active.moves.every((move: number) => move === 190) && active.item === 219, `${side}: Octillery carrier drift`);
  invariant(target.species === 95 && target.nature === 23 && target.evs.hp === 255 && target.evs.spDefense === 255 && target.moves.every((move: number) => move === 33), `${side}: durable Onix drift`);
  const required = ["species", "level", "nature", "ivs", "evs", "moves", "ppUps", "item", "abilitySlot", "friendship", "gender", "shiny"];
  for (const party of [parties.player, parties.opponent]) {
    invariant(new Set(party.map((mon: Json) => mon.species)).size === 3, `${side}: repeated species`);
    const items = party.map((mon: Json) => mon.item).filter(Boolean); invariant(new Set(items).size === items.length, `${side}: repeated held item`);
    for (const mon of party) {
      invariant(required.every((field) => Object.hasOwn(mon, field)) && mon.level === 50 && mon.moves.length === 4 && mon.ppUps.length === 4, `${side}: incomplete legal mon`);
      invariant(Object.keys(mon.ivs).length === 6 && Object.keys(mon.evs).length === 6, `${side}: legal stat shape`);
      for (const transient of ["hp", "status", "statStages", "volatile", "weather", "outcome"]) invariant(!Object.hasOwn(mon, transient), `${side}: transient ${transient}`);
    }
  }
}

function verifyOrientation(side: Side, contract: Json): Json {
  verifyScenario(contract.scenario, side);
  invariant(sha(readFileSync(resolve(root, contract.scenario))) === contract.scenarioSha256, `${side}: scenario SHA`);
  const zipped = readFileSync(resolve(root, contract.denseState)); const dense = gunzipSync(zipped);
  invariant(sha(zipped) === contract.denseStateSha256 && sha(dense) === contract.probeJsonSha256 && contract.repeatProbeJsonSha256 === contract.probeJsonSha256, `${side}: dense/repeat SHA`);
  const evidence = JSON.parse(dense.toString("utf8")) as Json; const rows = evidence.frames as Json[];
  invariant(evidence.schema === "octazooka-dense-evidence/v1" && evidence.profile === "battle-scene-on" && evidence.move === 190, `${side}: evidence schema`);
  invariant(same(evidence.sourceWindow, contract.sourceWindow) && rows.length === 80 && rows.every((row, age) => row.frame === contract.sourceWindow.startFrame + age), `${side}: dense window`);
  invariant(rows[0]!.scriptOffset === 0 && rows[0]!.animScriptActive && rows.slice(0, -1).every((row) => row.animScriptActive) && !rows.at(-1)!.animScriptActive, `${side}: start/cleanup bounds`);
  invariant(same(evidence.observedPointerParities, [0, 1]) && same(evidence.topology.tasks, []), `${side}: pointer/task topology`);
  for (const name of ["gOctazookaBallSpriteTemplate", "gOctazookaSmokeSpriteTemplate"]) invariant(evidence.topology.templates.includes(name), `${side}: missing ${name}`);
  for (const name of ["AnimSpriteOnMonPos", "AnimTranslateLinear_WithFollowup", "DestroyAnimSprite"]) invariant(evidence.topology.callbacks.includes(name), `${side}: missing ${name}`);
  const names = ["gOctazookaBallSpriteTemplate", "gOctazookaSmokeSpriteTemplate"];
  const effectRows = rows.map((row) => row.sprites.filter((sprite: Json) => names.includes(sprite.template.symbol)));
  const starts = (name: string) => effectRows.reduce((count, current, age) => count + current.filter((sprite: Json) => sprite.template.symbol === name && !(effectRows[age - 1] ?? []).some((prior: Json) => prior.slot === sprite.slot)).length, 0);
  invariant(starts(names[0]!) === 1 && starts(names[1]!) === 4, `${side}: exact creation topology`);
  invariant(rows.every((row) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && Object.keys(row.registers).length === 21 && row.audio.SE1 && row.audio.SE2), `${side}: incomplete row`);
  for (const field of ["battlers", "parties", "engine", "immutableState"]) invariant(rows.every((row) => same(row[field], rows[0]![field])), `${side}: gameplay field changed: ${field}`);
  invariant(rows.every((row) => row.immutableState.rngValue === rows[0]!.immutableState.rngValue), `${side}: gameplay RNG changed`);
  invariant(rows.slice(1).every((row, age) => row.animationRng !== rows[age]!.animationRng), `${side}: animation RNG did not advance`);
  invariant(rows.some((row) => row.audio.SE1.songHeaderIdentity.symbol === "se_m_mega_kick2") && rows.some((row) => row.audio.SE1.songHeaderIdentity.symbol === "se_m_self_destruct"), `${side}: audio latch`);
  invariant(rows[1]!.tileTags.includes(10030) && rows[4]!.tileTags.includes(10017) && !rows.at(-1)!.tileTags.includes(10030) && !rows.at(-1)!.tileTags.includes(10017), `${side}: tag lifetime`);
  const oam = rows.slice(1).filter((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)).length;
  const matrices = rows.slice(1).filter((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)).length;
  const palette = rows.slice(1).filter((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette)).length;
  invariant(oam === 79 && matrices === 79 && palette === 79, `${side}: hardware latch`);
  const archive = readFileSync(resolve(root, contract.rawRgbArchive)); invariant(sha(archive) === contract.rawRgbArchiveSha256, `${side}: RGB archive SHA`);
  const rgb = rgbMembers(resolve(root, contract.rawRgbArchive), rows);
  invariant(sha(Buffer.concat(rgb)) === contract.rawRgbSequenceSha256 && rgb.every((frame, age) => sha(frame) === rows[age]!.sha256), `${side}: RGB sequence`);
  const normalized = changeMap(side, rows, rgb); const mapPath = resolve(root, contract.changeMap);
  if (process.argv.includes("--write-maps")) writeFileSync(mapPath, normalized);
  else invariant(sha(readFileSync(mapPath)) === contract.changeMapSha256 && readFileSync(mapPath, "utf8") === normalized, `${side}: change map`);
  const last = rows.at(-1)!; invariant(last.tasks.length === 0 && last.visualTaskCount === 0 && last.soundTaskCount === 0 && !last.sprites.some((sprite: Json) => names.includes(sprite.template.symbol)), `${side}: inactive cleanup`);
  return { orientation: side, sourceWindow: evidence.sourceWindow, lifecycle: { ballCreates: 1, ballDestroys: 1, smokeCreates: 4, smokeDestroys: 4 }, latches: { oam: "79/79", matrices: "79/79", palette: "79/79" }, sourceRows: 80, rawRgbRows: 80, gameplayRngTransitions: 0, animationRngTransitions: 79, framebufferCompared: false };
}

export function verifyOctazookaEvidence(): Record<string, Json> {
  invariant(fixture.schema === "octazooka-bilateral-evidence/v1" && fixture.oracleProfile === "battle-scene-on" && fixture.move === "MOVE_OCTAZOOKA" && fixture.status === "exact" && fixture.coverageCredit === true, "Octazooka evidence contract drift");
  invariant(fixture.evidenceScope.productionAnimationChanged === true && fixture.evidenceScope.reducerAdded === true && fixture.evidenceScope.typedSeamAdded === true && fixture.evidenceScope.compositorAdded === true && fixture.evidenceScope.framebufferCompared === true && fixture.evidenceScope.coveragePromotion === true, "Octazooka evidence scope drift");
  invariant(fixture.productionAcceptance.reducerRows === "160/160" && fixture.productionAcceptance.typedSeamRows === "160/160" && fixture.productionAcceptance.productionFramebufferRows === "160/160" && fixture.productionAcceptance.productionFramebufferResidualPixels === 0, "Octazooka exact acceptance drift");
  return Object.fromEntries((["player-back", "opponent-front"] as const).map((side) => [side, verifyOrientation(side, fixture.orientations[side])]));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyOctazookaEvidence(), null, 2));
