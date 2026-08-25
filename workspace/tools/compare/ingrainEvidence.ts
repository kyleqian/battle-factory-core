import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { ingrainAtAge } from "../../src/animation/ingrain.ts";
import {
  createSceneOnMovePresentation,
  sceneOnIngrainView,
  type SceneOnIngrainConfig,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/ingrain-evidence.json"), "utf8")) as Json;
const sha = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sourceBlock(path: string, start: string, end: string): string {
  const source = readFileSync(resolve(root, path), "utf8");
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  invariant(from >= 0 && to > from, `${start}: source bounds`);
  return source.slice(from, to);
}

function verifySource(): void {
  const script = sourceBlock("reference/pokeemerald/data/battle_anim_scripts.s", "Move_INGRAIN:", "Move_PRESENT:");
  invariant(script.length === 1382 && sha(script) === receipt.source.scriptTextSha256, "Ingrain script source drift");
  for (const token of [
    "loadspritegfx ANIM_TAG_ROOTS", "loadspritegfx ANIM_TAG_ORBS",
    "create_ingrain_root_sprite", "create_ingrain_orb_sprite",
    "SE_M_SCRATCH", "SE_M_BUBBLE3", "waitforvisualfinish",
  ]) invariant(script.includes(token), `missing ${token}`);
  const effects = sourceBlock(
    "reference/pokeemerald/src/battle_anim_effects_1.c",
    "const union AnimCmd gIngrainRootAnimCmds1[]",
    "const union AnimCmd gFallingBagAnimCmds[]",
  );
  invariant(effects.length === 2052 && sha(effects) === receipt.source.effectDefinitionsSha256, "Ingrain template source drift");
  for (const token of [
    "ANIMCMD_FRAME(48, 7, .hFlip = TRUE)", "ANIMCMD_JUMP(0)",
    "gOamData_AffineOff_ObjNormal_32x32", "gOamData_AffineOff_ObjNormal_8x8",
    "gIngrainRootSpriteTemplate", "gIngrainOrbSpriteTemplate",
  ]) invariant(effects.includes(token), `missing ${token}`);
  const callbacks = sourceBlock(
    "reference/pokeemerald/src/battle_anim_effects_1.c",
    "static void AnimIngrainRoot(struct Sprite *sprite)\n{",
    "static void InitItemBagData(struct Sprite *sprite, s16 c)",
  );
  invariant(callbacks.length === 2883 && sha(callbacks) === receipt.source.callbackDefinitionsSha256, "Ingrain callback source drift");
  for (const token of [
    "sprite->callback = AnimRootFlickerOut", "sprite->invisible = sprite->data[0] % 2",
    "sprite->x2 = sprite->data[1] * sprite->data[0]",
    "sprite->y2 = Sin((sprite->data[0] * 20) & 0xFF, sprite->data[2])",
  ]) invariant(callbacks.includes(token), `missing ${token}`);
}

function verifyScenario(side: Side, scenario: Json): void {
  invariant(
    scenario.schemaVersion === 1 && scenario.mode === "mechanicLab"
      && scenario.profile === "battle-scene-on" && scenario.level === 50
      && scenario.overrides?.parties && !scenario.overrides.battlers,
    `${side}: not a complete Scene-ON parties scenario`,
  );
  for (const key of ["player", "opponent"] as const) {
    const party = scenario.overrides.parties[key];
    invariant(Array.isArray(party) && party.length === 3, `${side}: ${key} must retain three Pokémon`);
    for (const mon of party) {
      invariant(
        mon.level === 50 && mon.ivs && mon.evs && Array.isArray(mon.moves) && mon.moves.length === 4
          && Array.isArray(mon.ppUps) && mon.ppUps.length === 4
          && Number.isInteger(mon.item) && Number.isInteger(mon.abilitySlot)
          && Number.isInteger(mon.friendship) && typeof mon.gender === "string"
          && typeof mon.shiny === "boolean",
        `${side}: incomplete ${key} party record`,
      );
    }
  }
  const attackerParty = scenario.overrides.parties[side === "player-back" ? "player" : "opponent"];
  const defenderParty = scenario.overrides.parties[side === "player-back" ? "opponent" : "player"];
  invariant(
    attackerParty[0].species === 345 && same(attackerParty[0].moves, [275, 275, 275, 275])
      && attackerParty.slice(1).every((mon: Json) => same(mon.moves, [33, 33, 33, 33]))
      && defenderParty.every((mon: Json) => same(mon.moves, [33, 33, 33, 33])),
    `${side}: first-use Ingrain / deterministic opponent decision staging drift`,
  );
}

function readRows(side: Side): { probe: Json; rows: Json[]; scenario: Json } {
  const item = receipt.orientations[side];
  const scenarioBytes = readFileSync(resolve(root, item.scenario));
  invariant(sha(scenarioBytes) === item.scenarioSha256, `${side}: scenario SHA`);
  const scenario = JSON.parse(scenarioBytes.toString("utf8")) as Json;
  verifyScenario(side, scenario);
  const gzip = readFileSync(resolve(root, item.denseState));
  invariant(sha(gzip) === item.denseStateSha256, `${side}: dense archive SHA`);
  const json = gunzipSync(gzip);
  invariant(sha(json) === item.probeJsonSha256, `${side}: dense JSON SHA`);
  const probe = JSON.parse(json.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  const archive = resolve(root, item.rawRgbArchive);
  invariant(sha(readFileSync(archive)) === item.rawRgbArchiveSha256, `${side}: raw archive SHA`);
  const names = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
    .trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 32 * 1024 * 1024 });
  const frameBytes = 240 * 160 * 3;
  invariant(names.length === 164 && bytes.length === names.length * frameBytes, `${side}: raw archive shape`);
  const byName = new Map(names.map((name, index) => [
    basename(name), bytes.subarray(index * frameBytes, (index + 1) * frameBytes),
  ]));
  const rgb = rows.map((row) => byName.get(`${String(row.frame).padStart(5, "0")}.rgb`));
  invariant(rgb.every(Boolean), `${side}: raw frame names`);
  const frames = rgb as Buffer[];
  invariant(sha(Buffer.concat(frames)) === item.rawRgbSequenceSha256, `${side}: raw sequence SHA`);
  invariant(frames.every((frame, index) => sha(frame) === rows[index]!.sha256), `${side}: per-row raw SHA`);
  invariant(sha(readFileSync(resolve(root, item.changeMap))) === item.changeMapSha256, `${side}: change-map SHA`);
  return { probe, rows, scenario };
}

const roots = (row: Json): Json[] => row.sprites.filter((sprite: Json) =>
  sprite.template?.symbol === "gIngrainRootSpriteTemplate",
);
const orbs = (row: Json): Json[] => row.sprites.filter((sprite: Json) =>
  sprite.template?.symbol === "gIngrainOrbSpriteTemplate",
);

function verifySpriteState(source: Json, expected: Json, kind: "root" | "orb", side: Side, age: number): void {
  const oamPriority = (source.attr[2] >>> 10) & 3;
  const hFlip = Boolean(source.attr[1] & 0x1000);
  if (kind === "root") {
    invariant(
      source.x === expected.x && source.y === expected.y && source.x2 === expected.x2 && source.y2 === expected.y2
        && source.subpriority === expected.subpriority && oamPriority === expected.oamPriority
        && source.animNum === expected.animation && source.animCmdIndex === expected.animationCommand
        && source.animDelayCounter === expected.animationDelay && source.data[0] === expected.counter
        && source.data[2] === expected.duration && source.invisible === expected.invisible && hFlip === expected.hFlip,
      `${side}: root reducer mismatch age ${age}`,
    );
  } else {
    invariant(
      source.x === expected.x && source.y === expected.y && source.x2 === expected.x2 && source.y2 === expected.y2
        && source.subpriority === expected.subpriority && oamPriority === expected.oamPriority
        && source.animCmdIndex === expected.animationCommand && source.animDelayCounter === expected.animationDelay
        && source.data[0] === expected.phase && source.data[1] === expected.velocityX
        && source.data[2] === expected.waveAmplitude && source.data[3] === expected.duration
        && source.invisible === expected.invisible,
      `${side}: orb reducer mismatch age ${age}`,
    );
  }
}

function sceneStateAtAge(
  age: number,
  side: Side,
  center: Readonly<{ x: number; y: number }>,
  attackerSubpriority: number,
): Json {
  const attackerIsPlayer = side === "player-back";
  const config: SceneOnIngrainConfig = {
    move: "INGRAIN",
    attacker: {
      species: "ARON",
      geometry: {
        side: attackerIsPlayer ? "player" : "opponent",
        spriteCorner: attackerIsPlayer ? { x: 38, y: 56 } : { x: 146, y: 12 },
        animationCenter: attackerIsPlayer ? { x: 70, y: 88 } : { x: 178, y: 44 },
        battlePositionCenter: center,
      },
    },
    target: {
      species: "GROVYLE",
      geometry: {
        side: attackerIsPlayer ? "opponent" : "player",
        spriteCorner: attackerIsPlayer ? { x: 146, y: 12 } : { x: 38, y: 56 },
        animationCenter: attackerIsPlayer ? { x: 178, y: 44 } : { x: 70, y: 88 },
        battlePositionCenter: attackerIsPlayer ? { x: 176, y: 40 } : { x: 72, y: 80 },
      },
    },
    fieldProfile: { playerHp: 100, playerMaxHp: 100, opponentHp: 100, opponentMaxHp: 100 },
    animationProfile: { attackerSubpriority },
  };
  const state = sceneOnIngrainView({ ...createSceneOnMovePresentation(config), age });
  const { attacker: _attacker, target: _target, ...body } = state;
  return body;
}

function verifyOrientation(side: Side): Json {
  const item = receipt.orientations[side];
  const { probe, rows } = readRows(side);
  const center = side === "player-back" ? { x: 72, y: 80 } : { x: 176, y: 40 };
  const attackerSubpriority = side === "player-back" ? 30 : 40;
  invariant(
    probe.schema === receipt.schema && probe.profile === receipt.oracleProfile && probe.move === 275,
    `${side}: schema/profile`,
  );
  invariant(
    rows.length === item.window.rows && rows[0]!.frame === item.window.startFrame
      && rows.at(-1)!.frame === item.window.endFrame
      && rows.every((row, age) => row.frame === item.window.startFrame + age),
    `${side}: dense window is incomplete or non-consecutive`,
  );
  invariant(
    rows.slice(0, -1).every((row) => row.animScriptActive) && !rows.at(-1)!.animScriptActive,
    `${side}: first inactive cleanup row missing`,
  );
  invariant(
    same(probe.sourcePointerContract, {
      start: receipt.sourcePointerContract.start,
      endExclusive: receipt.sourcePointerContract.endExclusive,
      observedAddresses: [
        137183456, 137183459, 137183462, 137183485, 137183508, 137183531,
        137183554, 137183573, 137183579, 137183602, 137183608, 137183631, 137183632,
      ],
      observedParities: receipt.sourcePointerContract.observedParities,
    }),
    `${side}: pointer interval/parity`,
  );
  invariant(
    same(probe.topology.tasks, []) && probe.topology.templates.includes("gIngrainRootSpriteTemplate")
      && probe.topology.templates.includes("gIngrainOrbSpriteTemplate")
      && probe.topology.callbacks.includes("AnimRootFlickerOut")
      && probe.topology.callbacks.includes("AnimIngrainOrb"),
    `${side}: script/task/sprite topology`,
  );
  invariant(rows.every((row) =>
    row.softwareOam.length === 128 && row.hardwareOam.length === 128
      && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32
      && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512
      && row.paletteTags.length === 16 && row.tileTags.length === 128
      && row.tasks.length === 0 && row.sprites.length >= 9 && row.sprites.length <= 16,
  ), `${side}: dense state inventory`);
  for (const key of ["battlers", "parties", "engine", "immutableState"]) {
    invariant(rows.every((row) => same(row[key], rows[0]![key])), `${side}: mutable ${key}`);
  }
  invariant(rows.every((row) => row.immutableState.rngValue === rows[0]!.immutableState.rngValue), `${side}: gameplay RNG changed`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareOam, rows[age]!.softwareOam)), `${side}: ordinary OAM RAM+1 latch failed`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwareMatrices, rows[age]!.softwareMatrices)), `${side}: ordinary matrix RAM+1 latch failed`);
  invariant(rows.slice(1).every((row, age) => same(row.hardwarePalette, rows[age]!.fadedPalette)), `${side}: ordinary palette RAM+1 latch failed`);
  invariant(rows.slice(1).every((row) => !same(row.hardwarePalette, row.unfadedPalette)), `${side}: faded palette distinction missing`);
  invariant(rows.every((row) => same(row.registers, rows[0]!.registers)), `${side}: unexpected register timing`);
  invariant(
    same(rows[0]!.paletteTags, rows.at(-1)!.paletteTags)
      && rows[1]!.paletteTags.includes(10223) && rows[1]!.tileTags.includes(10223)
      && rows[4]!.paletteTags.includes(10223) && rows[4]!.paletteTags.includes(10147)
      && rows[4]!.tileTags.includes(10223) && rows[4]!.tileTags.includes(10147)
      && rows.slice(5, -1).every((row, age) => same(row.paletteTags, rows[age + 4]!.paletteTags)
        && same(row.tileTags, rows[age + 4]!.tileTags))
      && !rows.at(-1)!.paletteTags.includes(10223) && !rows.at(-1)!.paletteTags.includes(10147)
      && !rows.at(-1)!.tileTags.includes(10223) && !rows.at(-1)!.tileTags.includes(10147),
    `${side}: ROOTS/ORBS resource lifetime`,
  );
  invariant(
    rows.slice(1).filter((row, age) => row.animationRng !== rows[age]!.animationRng).length === 163,
    `${side}: animation RNG cadence`,
  );
  const starts = rows.map((row, age) => ({ age, song: row.audio.SE1.songHeaderIdentity?.symbol, status: row.audio.SE1.status }))
    .filter((event) => event.status === 0 && ["se_m_scratch", "se_m_bubble3"].includes(event.song));
  invariant(same(starts, [
    { age: 7, song: "se_m_scratch", status: 0 }, { age: 19, song: "se_m_scratch", status: 0 },
    { age: 31, song: "se_m_scratch", status: 0 }, { age: 43, song: "se_m_scratch", status: 0 },
    { age: 92, song: "se_m_bubble3", status: 0 }, { age: 99, song: "se_m_bubble3", status: 0 },
    { age: 106, song: "se_m_bubble3", status: 0 }, { age: 113, song: "se_m_bubble3", status: 0 },
  ]), `${side}: source audio starts`);
  invariant(rows.every((row) => row.soundTaskCount === 0), `${side}: unexpected sound task`);

  for (let age = 0; age < rows.length; age++) {
    const expected = ingrainAtAge(age, center, { attackerSubpriority });
    const seam = sceneStateAtAge(age, side, center, attackerSubpriority);
    invariant(same(seam, expected), `${side}: typed seam mismatch age ${age}`);
    const sourceRoots = roots(rows[age]!);
    const sourceOrbs = orbs(rows[age]!);
    invariant(
      rows[age]!.animScriptActive === expected.active && rows[age]!.scriptOffset === expected.sourceOffset
        && rows[age]!.visualTaskCount === expected.visualSpriteCount
        && sourceRoots.length === expected.roots.length && sourceOrbs.length === expected.orbs.length,
      `${side}: reducer lifecycle mismatch age ${age}`,
    );
    sourceRoots.forEach((sprite, index) => verifySpriteState(sprite, expected.roots[index]!, "root", side, age));
    sourceOrbs.forEach((sprite, index) => verifySpriteState(sprite, expected.orbs[index]!, "orb", side, age));
  }
  invariant(
    rows.findIndex((row) => roots(row).length) === 7 && rows.reduce((last, row, age) => roots(row).length ? age : last, -1) === 161
      && rows.findIndex((row) => orbs(row).length) === 85 && rows.reduce((last, row, age) => orbs(row).length ? age : last, -1) === 129
      && Math.max(...rows.map((row) => roots(row).length)) === 4 && Math.max(...rows.map((row) => orbs(row).length)) === 3,
    `${side}: root/orb lifecycle`,
  );
  const componentSlots = rows[113]!.sprites
    .filter((sprite: Json) => ["gIngrainRootSpriteTemplate", "gIngrainOrbSpriteTemplate"].includes(sprite.template?.symbol))
    .map((sprite: Json) => sprite.slot);
  invariant(same(componentSlots, [3, 4, 5, 7, 9, 10, 11]), `${side}: component allocation order`);
  const drawOrder = rows[113]!.spriteOrder.filter((slot: number) => componentSlots.includes(slot));
  invariant(
    same(drawOrder, side === "player-back" ? [9, 11, 10, 3, 7, 5, 4] : [3, 7, 5, 4, 9, 11, 10]),
    `${side}: component overlap/OAM order`,
  );
  const activeBattler = side === "player-back" ? rows[0]!.battlers.player : rows[0]!.battlers.opponent;
  invariant(
    activeBattler.species === 345 && activeBattler.status3 === 1024 && activeBattler.pp.includes(19)
      && rows[0]!.parties[side === "player-back" ? "player" : "opponent"].every((mon: Json) => mon.checksumValid),
    `${side}: stock-ROM successful Ingrain state`,
  );
  return {
    pointerRows: rows.length,
    rootRows: 155,
    orbRows: 45,
    oamPredecessor: 163,
    matrixPredecessor: 163,
    palettePredecessor: 163,
    gameplayRngTransitions: 0,
    animationRngTransitions: 163,
    registerChanges: 0,
  };
}

function verifyControls(): void {
  const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
  const status = (move: string) => coverage.entries.find((entry: Json) => entry.move === move)?.status;
  invariant(status("MOVE_INGRAIN") === undefined, "Ingrain must remain unsupported");
  invariant(
    status("MOVE_ABSORB") === "exact" && status("MOVE_MEGA_DRAIN") === "exact"
      && status("MOVE_DREAM_EATER") === "exact" && status("MOVE_GIGA_DRAIN") === "exact",
    "shared ORBS controls drift",
  );
}

export function verifyIngrainEvidence(): Record<Side, Json> {
  invariant(receipt.status === "unsupported" && receipt.coverageCredit === false, "Ingrain must not receive exact credit");
  invariant(receipt.determinism.freshRunsPerOrientation === 2 && receipt.determinism.denseJsonByteIdentical && receipt.determinism.rawRgbSequenceByteIdentical, "fresh-run determinism receipt missing");
  verifySource();
  verifyControls();
  return {
    "player-back": verifyOrientation("player-back"),
    "opponent-front": verifyOrientation("opponent-front"),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyIngrainEvidence(), null, 2));
}
