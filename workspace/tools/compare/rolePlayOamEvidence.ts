import { rolePlayAtAge, type RolePlaySide } from "../../src/animation/rolePlay.ts";

export const ROLE_PLAY_ADDITIONAL_MON_OAM_SLOT = 9;
export const ROLE_PLAY_ADDITIONAL_MON_RESOURCE_TAG = 55125;
export const ROLE_PLAY_ADDITIONAL_MON_PALETTE_SLOT = 7;
export const ROLE_PLAY_ADDITIONAL_MON_TILE_SLOT = 6;
export const ROLE_PLAY_ADDITIONAL_MON_ATTR2 = 305 | (2 << 10) | (ROLE_PLAY_ADDITIONAL_MON_PALETTE_SLOT << 12);

export type RolePlayOamPhase = "source" | "software" | "hardware";
export type OamAttrs = readonly [number, number, number];
export type AffineMatrix = readonly [number, number, number, number];

const IDENTITY_MATRIX: AffineMatrix = [256, 0, 0, 256];

function lifecycle(age: number, phase: RolePlayOamPhase): "normal" | "intermediate" | "double" | null {
  switch (phase) {
    case "source":
      if (age >= 54 && age <= 83) return "normal";
      if (age === 84) return "intermediate";
      return age >= 85 && age <= 91 ? "double" : null;
    case "software":
      if (age >= 54 && age <= 84) return "normal";
      return age >= 85 && age <= 92 ? "double" : null;
    case "hardware":
      if (age >= 55 && age <= 85) return "normal";
      return age >= 86 && age <= 93 ? "double" : null;
  }
}

/**
 * Dense Role Play rows prove this exact OAM lifecycle. `intermediate` is the
 * source-age-84 affine-mode flip before the next BuildOamBuffer position pass;
 * it never becomes a software or hardware OAM row.
 */
export function rolePlayAdditionalMonOamAtAge(
  age: number,
  center: Readonly<{ x: number; y: number }>,
  phase: RolePlayOamPhase,
): OamAttrs | null {
  const state = lifecycle(age, phase);
  if (state === null) return null;

  const affineMode = state === "normal" ? 1 : 3;
  const origin = state === "double" ? 64 : 32;
  const attr0 = ((center.y - origin) & 0xff) | (affineMode << 8) | (1 << 10);
  const attr1 = ((center.x - origin) & 0x1ff) | (3 << 14);
  const attr2 = ROLE_PLAY_ADDITIONAL_MON_ATTR2;
  return [attr0, attr1, attr2];
}

function sourceMatrixAtAge(
  age: number,
  side: RolePlaySide,
  center: Readonly<{ x: number; y: number }>,
): AffineMatrix {
  if (age < 0) return IDENTITY_MATRIX;
  const silhouette = rolePlayAtAge(age, side, center).silhouette;
  return silhouette === null
    ? IDENTITY_MATRIX
    : [silhouette.matrix.a, silhouette.matrix.b, silhouette.matrix.c, silhouette.matrix.d];
}

/** The BuildOamBuffer copy is one source display behind the live Sprite matrix. */
export function rolePlayAdditionalMonSoftwareMatrixAtAge(
  age: number,
  side: RolePlaySide,
  center: Readonly<{ x: number; y: number }>,
): AffineMatrix {
  return sourceMatrixAtAge(age - 1, side, center);
}

/** A freshly allocated affine matrix takes a second display to reach hardware. */
export function rolePlayAdditionalMonHardwareMatrixAtAge(
  age: number,
  side: RolePlaySide,
  center: Readonly<{ x: number; y: number }>,
): AffineMatrix {
  return sourceMatrixAtAge(age - 2, side, center);
}

function decodeU16(raw: string, byteOffset: number): number {
  const offset = byteOffset * 2;
  return Number.parseInt(raw.slice(offset + 2, offset + 4) + raw.slice(offset, offset + 2), 16);
}

function signed(value: number): number {
  return value >= 0x8000 ? value - 0x10000 : value;
}

export function decodeSoftwareOam(raw: string): OamAttrs {
  return [decodeU16(raw, 0), decodeU16(raw, 2), decodeU16(raw, 4)];
}

export function decodeSoftwareMatrices(softwareOam: readonly string[]): readonly AffineMatrix[] {
  return Array.from({ length: 32 }, (_, matrixNum) => {
    const base = matrixNum * 4;
    return [
      signed(decodeU16(softwareOam[base]!, 6)),
      signed(decodeU16(softwareOam[base + 1]!, 6)),
      signed(decodeU16(softwareOam[base + 2]!, 6)),
      signed(decodeU16(softwareOam[base + 3]!, 6)),
    ];
  });
}
