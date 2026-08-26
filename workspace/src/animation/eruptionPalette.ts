/**
 * Pure source-relative presentation component for Move_ERUPTION's two
 * `simple_palette_blend` commands and the Warm Rock palette allocation that
 * determines their object-bank selection.
 *
 * The launch/falling rocks, shakes, audio, RNG, and framebuffer remain outside
 * this component. The containing move supplies source-command ages plus the
 * ordinary sprite-allocator and geometry snapshots; no species or evidence
 * identity is consulted here.
 */

export const ERUPTION_PALETTE_SELECTOR = 0x1f;
export const ERUPTION_BLEND_COLOR = 0x001f;
export const ERUPTION_WARM_ROCK_TAG = 10201;
export const ERUPTION_SOURCE_BASE = 0x082c_e30b;
export const ERUPTION_OPENING_COMMAND_OFFSET = 20;
export const ERUPTION_CLOSING_COMMAND_OFFSET = 204;

export interface EruptionPaletteGeometry {
  readonly x: number;
  readonly y: number;
  readonly openingSubpriority: number;
  readonly closingSubpriority: number;
}

export interface EruptionPaletteProfile {
  readonly closingCommandAge: number;
  readonly cleanupAge: number;
  readonly attackerBattler: number;
  readonly targetBattler: number;
  readonly visiblePartnerBattlers: readonly number[];
  readonly paletteSpriteSlots: Readonly<{ readonly opening: number; readonly closing: number }>;
  readonly geometry: EruptionPaletteGeometry;
  readonly warmRockPaletteSlot: number;
  readonly paletteTagsAtAge0: readonly number[];
  readonly unfadedPaletteAtAge0: readonly number[];
  readonly fadedPaletteAtAge0: readonly number[];
  readonly hardwarePaletteAtAge0: readonly number[];
  readonly warmRockPalette: readonly number[];
}

export interface EruptionPaletteSourceCursor {
  readonly owner: "Move_ERUPTION";
  readonly command: "opening" | "closing";
  readonly offset: 20 | 204;
  readonly pointer: number;
  readonly pointerParity: 1;
  readonly wait: 1;
  readonly args: readonly [31, 2 | 4, 0 | 4, 0 | 4, 31, 0, 0, 0];
}

export interface EruptionSimplePaletteSprite {
  readonly slot: number;
  readonly template: "gSimplePaletteBlendSpriteTemplate";
  readonly callback: "AnimSimplePaletteBlend_Step";
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly subpriority: number;
  readonly invisible: true;
  readonly data: readonly [0, 0, 0, 0, 0, 0, 0, 0];
  readonly attr: readonly [160, 304, 65535];
  readonly animNum: 0;
  readonly animCmdIndex: 0;
  readonly animDelayCounter: 0;
  readonly affineAnimCmdIndex: 0;
  readonly matrixNum: 0;
  readonly matrix: readonly [256, 0, 0, 256];
  readonly displayedInOam: false;
}

export interface EruptionPaletteState {
  readonly age: number;
  readonly source: EruptionPaletteSourceCursor | null;
  readonly sprite: EruptionSimplePaletteSprite | null;
  readonly selectedPaletteMask: number;
  readonly selectedPaletteBanks: readonly number[];
  readonly fade: Readonly<{
    readonly active: boolean;
    readonly color: 31;
    readonly coefficient: number;
    readonly backgroundCoefficient: number;
    readonly objectCoefficient: number;
    readonly delay: 2 | 4 | null;
    readonly delta: 2;
  }>;
  readonly palette: Readonly<{
    readonly unfaded: readonly number[];
    readonly softwareFaded: readonly number[];
    readonly hardware: readonly number[];
    readonly transferLagRows: 1;
    readonly hardwareEqualsPrecedingSoftwareFaded: boolean;
  }>;
  readonly resources: Readonly<{
    readonly paletteTags: readonly number[];
    readonly warmRockPaletteTag: 10201;
    readonly warmRockPaletteSlot: number;
    readonly warmRockPaletteBank: number;
    readonly warmRockPaletteAllocated: boolean;
  }>;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly paletteSpriteActive: boolean;
    readonly warmRockPaletteFreed: boolean;
  }>;
}

const OPENING_COMMAND_AGE = 4;
const OPENING_SPRITE_DESTROY_AGE = 18;

function assertProfile(profile: Readonly<EruptionPaletteProfile>): void {
  if (profile.closingCommandAge <= OPENING_SPRITE_DESTROY_AGE
    || profile.cleanupAge <= profile.closingCommandAge + 18
    || profile.paletteTagsAtAge0.length !== 16
    || profile.unfadedPaletteAtAge0.length !== 512
    || profile.fadedPaletteAtAge0.length !== 512
    || profile.hardwarePaletteAtAge0.length !== 512
    || profile.warmRockPalette.length !== 16
    || profile.warmRockPaletteSlot < 0
    || profile.warmRockPaletteSlot >= 16) {
    throw new Error("invalid Eruption palette component profile");
  }
}

/** Source `UnpackSelectedBattlePalettes` for the subset used by Eruption. */
export function eruptionSelectedPaletteBanks(
  profile: Readonly<EruptionPaletteProfile>,
): readonly number[] {
  const banks = [1, 2, 3];
  if (ERUPTION_PALETTE_SELECTOR & 2) banks.push(16 + profile.attackerBattler);
  if (ERUPTION_PALETTE_SELECTOR & 4) banks.push(16 + profile.targetBattler);
  if (ERUPTION_PALETTE_SELECTOR & 8) {
    const partner = profile.attackerBattler ^ 2;
    if (profile.visiblePartnerBattlers.includes(partner)) banks.push(16 + partner);
  }
  if (ERUPTION_PALETTE_SELECTOR & 16) {
    const partner = profile.targetBattler ^ 2;
    if (profile.visiblePartnerBattlers.includes(partner)) banks.push(16 + partner);
  }
  return [...new Set(banks)].sort((a, b) => a - b);
}

function maskOf(banks: readonly number[]): number {
  return banks.reduce((mask, bank) => (mask | (1 << bank)) >>> 0, 0);
}

function sourceAtAge(age: number, profile: Readonly<EruptionPaletteProfile>): EruptionPaletteSourceCursor | null {
  if (age >= OPENING_COMMAND_AGE && age < 19) {
    const pointer = ERUPTION_SOURCE_BASE + ERUPTION_OPENING_COMMAND_OFFSET;
    return {
      owner: "Move_ERUPTION", command: "opening", offset: 20,
      pointer, pointerParity: 1, wait: 1,
      args: [31, 2, 0, 4, 31, 0, 0, 0],
    };
  }
  if (age >= profile.closingCommandAge) {
    const pointer = ERUPTION_SOURCE_BASE + ERUPTION_CLOSING_COMMAND_OFFSET;
    return {
      owner: "Move_ERUPTION", command: "closing", offset: 204,
      pointer, pointerParity: 1, wait: 1,
      args: [31, 4, 4, 0, 31, 0, 0, 0],
    };
  }
  return null;
}

function spriteAtAge(age: number, profile: Readonly<EruptionPaletteProfile>): EruptionSimplePaletteSprite | null {
  const opening = age >= OPENING_COMMAND_AGE && age < OPENING_SPRITE_DESTROY_AGE;
  const closing = age >= profile.closingCommandAge && age < profile.closingCommandAge + 18;
  if (!opening && !closing) return null;
  return {
    slot: opening ? profile.paletteSpriteSlots.opening : profile.paletteSpriteSlots.closing,
    template: "gSimplePaletteBlendSpriteTemplate",
    callback: "AnimSimplePaletteBlend_Step",
    x: profile.geometry.x, y: profile.geometry.y, x2: 0, y2: 0,
    subpriority: opening ? profile.geometry.openingSubpriority : profile.geometry.closingSubpriority,
    invisible: true, data: [0, 0, 0, 0, 0, 0, 0, 0], attr: [160, 304, 65535],
    animNum: 0, animCmdIndex: 0, animDelayCounter: 0, affineAnimCmdIndex: 0,
    matrixNum: 0, matrix: [256, 0, 0, 256], displayedInOam: false,
  };
}

function coefficientsAtAge(age: number, closingAge: number): Readonly<{
  background: number; object: number; coefficient: number; active: boolean; delay: 2 | 4 | null;
}> {
  if (age < OPENING_COMMAND_AGE) return { background: 0, object: 0, coefficient: 0, active: false, delay: null };
  if (age < closingAge) {
    const local = age - OPENING_COMMAND_AGE;
    return {
      background: local < 3 ? 0 : local < 7 ? 2 : 4,
      object: local < 4 ? 0 : local < 8 ? 2 : 4,
      coefficient: local < 4 ? 0 : local < 8 ? 2 : 4,
      active: local < 13,
      delay: local < 14 ? 2 : null,
    };
  }
  const local = age - closingAge;
  return {
    background: local < 5 ? 4 : local < 11 ? 2 : 0,
    object: local < 6 ? 4 : local < 12 ? 2 : 0,
    coefficient: local < 6 ? 4 : local < 12 ? 2 : 0,
    active: local < 17,
    delay: local < 18 ? 4 : null,
  };
}

function blendColor(color: number, coefficient: number): number {
  const blend = (component: number, target: number): number =>
    component + (((target - component) * coefficient) >> 4);
  return blend(color & 31, 31)
    | (blend((color >> 5) & 31, 0) << 5)
    | (blend((color >> 10) & 31, 0) << 10);
}

function paletteBuffersAtAge(
  age: number,
  profile: Readonly<EruptionPaletteProfile>,
  selectedBanks: readonly number[],
): Readonly<{ unfaded: number[]; faded: number[] }> {
  if (age <= 0) {
    return { unfaded: [...profile.unfadedPaletteAtAge0], faded: [...profile.fadedPaletteAtAge0] };
  }
  const unfaded = [...profile.unfadedPaletteAtAge0];
  const faded = [...profile.fadedPaletteAtAge0];
  const warmOffset = (16 + profile.warmRockPaletteSlot) * 16;
  unfaded.splice(warmOffset, 16, ...profile.warmRockPalette);
  faded.splice(warmOffset, 16, ...profile.warmRockPalette);
  const coefficients = coefficientsAtAge(age, profile.closingCommandAge);
  for (const bank of selectedBanks) {
    const coefficient = bank < 16 ? coefficients.background : coefficients.object;
    const offset = bank * 16;
    for (let index = 0; index < 16; index += 1) {
      faded[offset + index] = blendColor(unfaded[offset + index]!, coefficient);
    }
  }
  return { unfaded, faded };
}

export function eruptionPaletteAtAge(
  age: number,
  profile: Readonly<EruptionPaletteProfile>,
): EruptionPaletteState {
  assertProfile(profile);
  const selectedPaletteBanks = eruptionSelectedPaletteBanks(profile);
  const buffers = paletteBuffersAtAge(age, profile, selectedPaletteBanks);
  const prior = age > 0 ? paletteBuffersAtAge(age - 1, profile, selectedPaletteBanks) : null;
  const coefficients = coefficientsAtAge(age, profile.closingCommandAge);
  const warmRockPaletteAllocated = age >= 1 && age < profile.cleanupAge;
  const paletteTags = [...profile.paletteTagsAtAge0];
  if (warmRockPaletteAllocated) paletteTags[profile.warmRockPaletteSlot] = ERUPTION_WARM_ROCK_TAG;
  const sprite = spriteAtAge(age, profile);
  return {
    age,
    source: sourceAtAge(age, profile),
    sprite,
    selectedPaletteMask: maskOf(selectedPaletteBanks),
    selectedPaletteBanks,
    fade: {
      active: coefficients.active, color: ERUPTION_BLEND_COLOR,
      coefficient: coefficients.coefficient,
      backgroundCoefficient: coefficients.background,
      objectCoefficient: coefficients.object,
      delay: coefficients.delay, delta: 2,
    },
    palette: {
      unfaded: buffers.unfaded,
      softwareFaded: buffers.faded,
      hardware: age === 0 ? [...profile.hardwarePaletteAtAge0] : prior!.faded,
      transferLagRows: 1,
      hardwareEqualsPrecedingSoftwareFaded: age > 0,
    },
    resources: {
      paletteTags,
      warmRockPaletteTag: ERUPTION_WARM_ROCK_TAG,
      warmRockPaletteSlot: profile.warmRockPaletteSlot,
      warmRockPaletteBank: 16 + profile.warmRockPaletteSlot,
      warmRockPaletteAllocated,
    },
    cleanup: {
      firstInactive: age === profile.cleanupAge,
      paletteSpriteActive: sprite !== null,
      warmRockPaletteFreed: age >= profile.cleanupAge,
    },
  };
}
