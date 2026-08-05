export type SurfWaveSide = "player" | "opponent";

export type SurfWavePalette = "surf" | "muddy-water";

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
  readonly soundRestart: "SE_M_SURF" | "SE_M_WHIRLPOOL" | null;
  readonly soundPan: number | null;
}

export const SURF_WAVE_FRAME_COUNT = 144;

const wrap9 = (value: number) => ((value % 512) + 512) % 512;

/**
 * Pure source-relative port of `AnimTask_CreateSurfWave` and
 * `AnimTask_SurfWaveScanlineEffect`, shared by the `Move_SURF` and
 * `Move_MUDDY_WATER` scripts (identical wave body; the muddy palette swap and
 * the preceding `panse SE_M_WHIRLPOOL` pan sweep are the only source-owned
 * differences).
 *
 * Age zero is the first display at the move's active script offset zero;
 * age 143 is the first fully inactive display after BG1, blend registers,
 * and the scanline task clear. All timing below is relative to that source
 * event.
 */
export function surfWaveAtAge(
  age: number,
  attackerSide: SurfWaveSide,
  params: Readonly<{ palette?: SurfWavePalette }> = {},
): SurfWaveState {
  const player = attackerSide === "player";
  const muddy = params.palette === "muddy-water";
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
  // The muddy script runs its `panse` before `createvisualtask`, so the
  // initial BG scroll write lands one display later: both orientations show
  // the origin at age 4 instead of the surf player's `(0, -48)`.
  const originAtAge4 = age === 4 && (!player || muddy);
  // The muddy `panse SE_M_WHIRLPOOL` plays from the first display and its
  // Task_PanFromInitialToTarget sweep is shown two displays behind the
  // task's own accumulator (same display latency as the surf sound).
  const whirlpoolTaskPan = (stepCount: number) => player
    ? Math.min(63, Math.max(-64, -64 + 2 * stepCount))
    : Math.max(-63, Math.min(63, 63 - 2 * stepCount));
  const whirlpoolPan = age < 1 ? null : whirlpoolTaskPan(Math.max(1, age - 2) - 1);

  return {
    active: age >= 1 && age < SURF_WAVE_FRAME_COUNT - 1,
    controllerPhase,
    visualTaskCount: age >= 4 && age <= 141 ? 1 : 0,
    bgLoaded,
    bgScroll: age >= 4 && age <= 142
      ? {
          x: originAtAge4
            ? 0
            : wrap9(initialX + dx * scrollStep),
          y: originAtAge4
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
    soundRestart: muddy
      ? age === 1
        ? "SE_M_WHIRLPOOL"
        : null
      : age === 30
        ? "SE_M_SURF"
        : null,
    soundPan: muddy
      ? whirlpoolPan
      : age === 30
        ? (player ? -62 : 61)
        : null,
  };
}
