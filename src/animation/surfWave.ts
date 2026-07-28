export type SurfWaveSide = "player" | "opponent";

export interface SurfWaveState {
  readonly active: boolean;
  readonly controllerPhase:
    | "idle"
    | "create"
    | "wave"
    | "clear"
    | "stopping"
    | "inactive";
  readonly visualTaskCount: 0 | 1;
  readonly bgLoaded: boolean;
  readonly bgScroll: Readonly<{ x: number; y: number }>;
  readonly blend: Readonly<{ eva: number; evb: number }>;
  readonly scanline: Readonly<{
    lower: number;
    upper: number;
    outsideEva: 0;
  }>;
  /** Number of source rotations of palette entries 1..7. */
  readonly paletteRotations: number;
  readonly soundRestart: "SE_M_SURF" | null;
  readonly soundPan: number | null;
}

export const SURF_WAVE_FRAME_COUNT = 144;

const wrap9 = (value: number) => ((value % 512) + 512) % 512;

/**
 * Pure source-relative port of `AnimTask_CreateSurfWave` and
 * `AnimTask_SurfWaveScanlineEffect`.
 *
 * Age zero is the first display at `Move_SURF`; age 143 is the first fully
 * inactive display after BG1, blend registers, and the scanline task clear.
 * All timing below is relative to that source event.
 */
export function surfWaveAtAge(
  age: number,
  attackerSide: SurfWaveSide,
): SurfWaveState {
  const player = attackerSide === "player";
  const step = Math.max(0, Math.min(133, age - 3));
  const halfStep = Math.ceil(step / 2);
  const risingEva = Math.min(13, halfStep);
  const eva = halfStep <= 54
    ? risingEva
    : Math.max(0, 67 - halfStep);
  const controllerPhase = age <= 0
    ? "idle"
    : age <= 3
      ? "create"
      : age <= 135
        ? "wave"
        : age <= 140
          ? "clear"
          : age <= 142
            ? "stopping"
            : "inactive";
  const bgLoaded = age >= 4 && age <= 141;
  const scrollStep = Math.max(0, Math.min(133, age - 4));
  const initialX = player ? 0 : -224;
  const initialY = player ? -48 : 256;
  const dx = player ? -2 : 2;
  const dy = player ? 1 : -1;
  const lower = player
    ? Math.max(0, 52 - age)
    : 0;
  const upper = player
    ? 112
    : Math.min(112, Math.max(0, age - 3));

  return {
    active: age >= 1 && age < SURF_WAVE_FRAME_COUNT - 1,
    controllerPhase,
    visualTaskCount: age >= 4 && age <= 141 ? 1 : 0,
    bgLoaded,
    bgScroll: age >= 4 && age <= 142
      ? {
          x: !player && age === 4
            ? 0
            : wrap9(initialX + dx * scrollStep),
          y: !player && age === 4
            ? 0
            : wrap9(initialY + dy * scrollStep),
        }
      : { x: 0, y: 0 },
    blend: age >= 4 && age <= 142
      ? { eva, evb: 16 - eva }
      : { eva: 0, evb: 16 },
    scanline: { lower, upper, outsideEva: 0 },
    paletteRotations: age >= 4
      ? Math.floor(Math.min(132, age - 3) / 4)
      : 0,
    soundRestart: age === 30 ? "SE_M_SURF" : null,
    soundPan: age === 30 ? (player ? -62 : 61) : null,
  };
}
