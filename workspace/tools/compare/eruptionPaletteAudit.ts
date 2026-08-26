/** Strict retained-row audit for Eruption's banked simple-palette component. */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import {
  eruptionPaletteAtAge,
  type EruptionPaletteProfile,
  type EruptionSimplePaletteSprite,
} from "../../src/animation/eruptionPalette.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/eruption-evidence.json"), "utf8")) as Json;
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const fail = (message: string): never => { throw new Error(message); };

function loadRows(orientation: Orientation): Json[] {
  const path = fixture.orientations[orientation].denseState as string;
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, path))).toString("utf8")) as Json).frames;
}

function paletteSprite(row: Json): Json | null {
  return row.sprites.find((sprite: Json) => sprite.template.symbol === "gSimplePaletteBlendSpriteTemplate") ?? null;
}

function projectSprite(sprite: Json | null): EruptionSimplePaletteSprite | null {
  if (!sprite) return null;
  return {
    slot: sprite.slot,
    template: sprite.template.symbol,
    callback: sprite.callback.symbol,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    subpriority: sprite.subpriority, invisible: Boolean(sprite.invisible),
    data: sprite.data, attr: sprite.attr,
    animNum: sprite.animNum, animCmdIndex: sprite.animCmdIndex,
    animDelayCounter: sprite.animDelayCounter,
    affineAnimCmdIndex: sprite.affineAnimCmdIndex,
    matrixNum: sprite.matrixNum, matrix: sprite.matrix,
    displayedInOam: false,
  } as EruptionSimplePaletteSprite;
}

function profileFromTypedSnapshots(rows: Json[]): EruptionPaletteProfile {
  const opening = paletteSprite(rows[4]!)!;
  const closingCommandAge = rows.findIndex((row) => row.scriptOwner === "Move_ERUPTION" && row.scriptOffset === 204);
  const closing = paletteSprite(rows[closingCommandAge]!)!;
  const paletteTagsAtAge0 = rows[0]!.allocators.paletteTags as number[];
  const tagsAfterLoad = rows[1]!.allocators.paletteTags as number[];
  const warmRockPaletteSlot = tagsAfterLoad.findIndex((tag, slot) => tag !== paletteTagsAtAge0[slot]);
  if (closingCommandAge < 0 || warmRockPaletteSlot < 0) fail("missing typed Eruption palette snapshots");
  return {
    closingCommandAge,
    cleanupAge: rows.length - 1,
    attackerBattler: rows[0]!.animationBattlers.attacker,
    targetBattler: rows[0]!.animationBattlers.target,
    visiblePartnerBattlers: [],
    paletteSpriteSlots: { opening: opening.slot, closing: closing.slot },
    geometry: {
      x: opening.x, y: opening.y,
      openingSubpriority: opening.subpriority,
      closingSubpriority: closing.subpriority,
    },
    warmRockPaletteSlot,
    paletteTagsAtAge0,
    unfadedPaletteAtAge0: rows[0]!.unfadedPalette,
    fadedPaletteAtAge0: rows[0]!.fadedPalette,
    hardwarePaletteAtAge0: rows[0]!.hardwarePalette,
    warmRockPalette: rows[1]!.unfadedPalette.slice((16 + warmRockPaletteSlot) * 16, (17 + warmRockPaletteSlot) * 16),
  };
}

function audit(orientation: Orientation): Json {
  const rows = loadRows(orientation);
  const profile = profileFromTypedSnapshots(rows);
  const openingAges: number[] = [];
  const closingAges: number[] = [];
  const fadeEdges: Json[] = [];
  let priorCoefficients = "";
  for (let age = 0; age < rows.length; age += 1) {
    const actual = rows[age]!;
    const expected = eruptionPaletteAtAge(age, profile);
    const prefix = `${orientation} age ${age}`;
    if (!same(actual.unfadedPalette, expected.palette.unfaded)) fail(`${prefix}: gPlttBufferUnfaded drift`);
    if (!same(actual.fadedPalette, expected.palette.softwareFaded)) fail(`${prefix}: gPlttBufferFaded drift`);
    if (!same(actual.hardwarePalette, expected.palette.hardware)) fail(`${prefix}: hardware palette drift`);
    if (!same(actual.allocators.paletteTags, expected.resources.paletteTags)) fail(`${prefix}: palette-tag lifecycle drift`);
    if (!same(projectSprite(paletteSprite(actual)), expected.sprite)) fail(`${prefix}: simple-palette sprite drift`);
    if (age > 0) {
      if (!same(actual.hardwarePalette, rows[age - 1]!.fadedPalette)) fail(`${prefix}: palette predecessor transfer drift`);
      if (!same(actual.hardwareOam, rows[age - 1]!.softwareOam)) fail(`${prefix}: OAM predecessor transfer drift`);
    }
    if (expected.source) {
      if (actual.scriptOwner !== expected.source.owner
        || actual.scriptOffset !== expected.source.offset
        || actual.scriptPtr !== expected.source.pointer
        || actual.scriptPtrParity !== expected.source.pointerParity
        || actual.scriptWait !== expected.source.wait
        || !same(actual.animArgs, expected.source.args)) fail(`${prefix}: component-owned source cursor drift`);
      (expected.source.command === "opening" ? openingAges : closingAges).push(age);
    }
    if (expected.selectedPaletteMask !== 0x0003_000e
      || !same(expected.selectedPaletteBanks, [1, 2, 3, 16, 17])
      || expected.resources.warmRockPaletteBank !== 23) fail(`${prefix}: selector-derived palette banks drift`);
    const coefficients = `${expected.fade.coefficient}/${expected.fade.backgroundCoefficient}/${expected.fade.objectCoefficient}/${expected.fade.active}`;
    if (coefficients !== priorCoefficients) {
      fadeEdges.push({ age, coefficient: expected.fade.coefficient, bg: expected.fade.backgroundCoefficient, obj: expected.fade.objectCoefficient, active: expected.fade.active });
      priorCoefficients = coefficients;
    }
  }
  const cleanup = eruptionPaletteAtAge(rows.length - 1, profile);
  if (!cleanup.cleanup.firstInactive || cleanup.sprite !== null
    || !cleanup.cleanup.warmRockPaletteFreed || cleanup.resources.warmRockPaletteAllocated) fail(`${orientation}: cleanup drift`);
  return {
    rows: rows.length,
    openingCommandAges: { first: openingAges[0], last: openingAges.at(-1), count: openingAges.length },
    closingCommandAges: { first: closingAges[0], last: closingAges.at(-1), count: closingAges.length },
    spriteLives: [
      { first: 4, last: 17, count: 14, slot: profile.paletteSpriteSlots.opening },
      { first: profile.closingCommandAge, last: profile.closingCommandAge + 17, count: 18, slot: profile.paletteSpriteSlots.closing },
    ],
    selectedPaletteMask: 0x0003_000e,
    selectedPaletteBanks: [1, 2, 3, 16, 17],
    warmRock: { tag: 10201, slot: profile.warmRockPaletteSlot, bank: 23, allocationAge: 1, freeAge: profile.cleanupAge },
    fadeEdges,
    transfers: { palettePredecessor: `${rows.length - 1}/${rows.length - 1}`, oamPredecessor: `${rows.length - 1}/${rows.length - 1}` },
    cleanupAge: profile.cleanupAge,
  };
}

console.log(JSON.stringify({
  schema: "eruption-simple-palette-component-audit/v1",
  status: "banked-component-only-move-unsupported",
  "player-back": audit("player-back"),
  "opponent-front": audit("opponent-front"),
}, null, 2));
