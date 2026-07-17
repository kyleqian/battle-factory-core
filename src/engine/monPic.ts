// Draft-screen "ball-open" mon-pic reveal sub-state machine, reverse-
// engineered from reference/pokeemerald/src/battle_factory_screen.c:
// OpenMonPic/Task_OpenMonPic (4067/4202), CloseMonPic/Task_CloseMonPic
// (4100/4250), SpriteCB_Open/CloseMonPic (4175/4189), and
// Select_Task_HandleMenu's STATE_MENU_INIT/SHOW_OPTIONS/HANDLE_INPUT gating
// (1586) which delays the SUMMARY/RENT/OTHERS popup until the mon pic
// finishes opening and erases it immediately on B (ahead of the close
// animation).
//
// The per-tick window-growth/flash-width sequence does NOT follow a single
// clean "one step every frame" model. Dense oracle probing (bin/oracle run,
// captureFrames every tick) of both open/close transitions in
// tools/compare/traces/draft-menu.json (2 slots, 2 open+close cycles) found
// TWO distinct timings:
//   - "A" variant: triggered right after a stretch of pure idle (no LEFT/
//     RIGHT/UP/DOWN yet processed this screen) - has a duplicate-hold tick
//     and a doubled window-growth step partway through.
//   - "B" variant: triggered after at least one LEFT/RIGHT/UP/DOWN has
//     already been processed - a clean one-step-per-tick sequence, but with
//     one extra held tick at full flash width before the window starts
//     growing.
// Cycle 1 of draft-menu.json (open fresh from the anchor) hits variant A;
// its close (after 3 DOWN presses) and cycle 2's open (after 3 RIGHT
// presses) both hit variant B. This is very likely a GPU-register-latch or
// task-scheduling artifact of interaction with reference/pokeemerald's
// incremental text-printer (RunTextPrinters, still draining glyphs for a
// few frames after the most recent redraw) - not re-derived from first
// principles, just pinned from the oracle. Whichever LEFT/RIGHT/UP/DOWN
// last fired before OpenMonPic/CloseMonPic is what the real game keys off
// of; we approximate it with "has any such input ever fired yet", which is
// exact for every committed trace but may not generalize to an arbitrary
// interleaving - see ISSUES.md if a future trace exposes a gap.
//
// Separately, the flash bar's color is only the ball's flat native color
// (214,255,239) for the very first ball-open of the screen. Every
// subsequent flash (that same close, and every later open/close) instead
// renders as that color alpha-blended with whatever's underneath (ball OBJ
// or BG1) at the same EVA=11/EVB=4 ratio as the window - because the flash
// sprite's OAM entry is objMode=ST_OAM_OBJ_BLEND (forces it to participate
// in blending whenever BLDCNT's effect is active), and Task_OpenMonPic's
// case1 configures BLDCNT/BLDALPHA once and never resets them, so it stays
// configured for the rest of the screen's life once the first open reaches
// that point. Tracked independently of the timing variant above via
// `blendFlash` (false only until the very first open configures BLDCNT).

export type MonPicPhase = "closed" | "opening" | "open" | "closing";
type Variant = "A" | "B";

export interface MonPicState {
  phase: MonPicPhase;
  /** Ticks since this phase started (0 = the tick that triggered it). Meaningless for "closed"/"open". */
  elapsed: number;
  /** Which measured timing table this opening/closing run follows (meaningless for "closed"/"open"). */
  variant: Variant;
}

export interface MonPicVisual {
  /** 1px-tall flash bar at y=64, centered x=120, this many px wide. 0 = not shown. */
  flashWidth: number;
  /** Whether the flash bar is alpha-blended against what's underneath (see module comment) vs its flat native color. */
  flashBlended: boolean;
  /** WIN0 mon-pic-bg blend window in screen pixels, bottom exclusive. null = not shown. */
  window: { top: number; bottom: number } | null;
  spriteVisible: boolean;
  menuTextVisible: boolean;
  menuHighlightVisible: boolean;
}

const HIDDEN: MonPicVisual = {
  flashWidth: 0,
  flashBlended: false,
  window: null,
  spriteVisible: false,
  menuTextVisible: false,
  menuHighlightVisible: false,
};

const OPEN_STEADY: MonPicVisual = {
  flashWidth: 0,
  flashBlended: false,
  window: { top: 32, bottom: 96 },
  spriteVisible: true,
  menuTextVisible: true,
  menuHighlightVisible: true,
};

function flash(width: number, blended: boolean): MonPicVisual {
  return { ...HIDDEN, flashWidth: width, flashBlended: blended };
}

function win(top: number, bottom: number): MonPicVisual {
  return { ...HIDDEN, window: { top, bottom } };
}

// idx = ticks since the tick JOY_NEW(A) fired (idx0 = that same tick's
// render - still nothing visible; OpenMonPic's sprite creation and its
// affine "opening" anim's first visible step both lag a couple ticks).
const OPEN_TABLE_A: MonPicVisual[] = [
  HIDDEN,
  HIDDEN,
  HIDDEN,
  flash(1, false),
  flash(1, false),
  flash(4, false),
  flash(4, false),
  flash(8, false),
  flash(8, false),
  flash(16, false),
  flash(16, false),
  flash(32, false),
  flash(32, false),
  flash(64, false),
  flash(64, false),
  win(60, 69),
  win(56, 73),
  win(52, 77),
  win(48, 81),
  win(44, 85),
  win(44, 85), // oracle-measured duplicate hold
  win(36, 93), // oracle-measured double step (top=40/bottom=89 never renders)
  win(32, 96),
  win(32, 96),
  win(32, 96),
  { ...win(32, 96), spriteVisible: true, menuTextVisible: true },
  OPEN_STEADY,
];

const OPEN_TABLE_B: MonPicVisual[] = [
  HIDDEN,
  HIDDEN,
  HIDDEN,
  flash(1, true),
  flash(1, true),
  flash(4, true),
  flash(4, true),
  flash(8, true),
  flash(8, true),
  flash(16, true),
  flash(16, true),
  flash(32, true),
  flash(32, true),
  flash(64, true),
  flash(64, true),
  flash(64, true), // oracle-measured extra hold (variant A has only two flash(64) ticks)
  win(60, 69),
  win(56, 73),
  win(52, 77),
  win(48, 81),
  win(44, 85),
  win(40, 89),
  win(36, 93),
  win(32, 96),
  win(32, 96),
  { ...win(32, 96), spriteVisible: true, menuTextVisible: true },
  OPEN_STEADY,
];

// idx = ticks since the tick JOY_NEW(B) fired (idx0 = that same tick's
// render - CloseMonPic's immediate sprite-free/popup-erase effects only
// become visible starting idx1).
const CLOSE_TABLE_A: MonPicVisual[] = [
  OPEN_STEADY,
  win(36, 92),
  win(40, 88),
  win(44, 84),
  win(52, 76), // oracle-measured double step (top=48/bottom=80 never renders)
  win(56, 72),
  win(56, 72), // oracle-measured duplicate hold
  win(60, 68),
  win(64, 65),
  HIDDEN,
  flash(32, true),
  flash(32, true),
  flash(16, true),
  flash(16, true),
  flash(8, true),
  flash(8, true),
  flash(4, true),
  flash(4, true),
  flash(1, true),
  flash(1, true),
];

const CLOSE_TABLE_B: MonPicVisual[] = [
  OPEN_STEADY,
  win(36, 92),
  win(40, 88),
  win(44, 84),
  win(48, 80),
  win(52, 76),
  win(56, 72),
  win(60, 68),
  win(64, 65),
  HIDDEN,
  flash(32, true),
  flash(32, true),
  flash(16, true),
  flash(16, true),
  flash(8, true),
  flash(8, true),
  flash(4, true),
  flash(4, true),
  flash(1, true),
  flash(1, true),
];

export const INITIAL_MON_PIC_STATE: MonPicState = { phase: "closed", elapsed: 0, variant: "A" };

/** OpenMonPic: called the same tick JOY_NEW(A) is handled. `hasActed` = has any LEFT/RIGHT/UP/DOWN been processed yet this screen. */
export function openMonPic(hasActed: boolean): MonPicState {
  return { phase: "opening", elapsed: 0, variant: hasActed ? "B" : "A" };
}

/** CloseMonPic: called the same tick JOY_NEW(B) (or A-on-OTHERS) is handled. */
export function closeMonPic(hasActed: boolean): MonPicState {
  return { phase: "closing", elapsed: 0, variant: hasActed ? "B" : "A" };
}

/** Advance by one tick; call before applying this tick's input (open/closeMonPic override the result). */
export function advanceMonPic(state: MonPicState): MonPicState {
  if (state.phase === "opening") {
    const table = state.variant === "A" ? OPEN_TABLE_A : OPEN_TABLE_B;
    const next = state.elapsed + 1;
    return next >= table.length ? { phase: "open", elapsed: 0, variant: state.variant } : { ...state, elapsed: next };
  }
  if (state.phase === "closing") {
    const table = state.variant === "A" ? CLOSE_TABLE_A : CLOSE_TABLE_B;
    const next = state.elapsed + 1;
    return next >= table.length ? { phase: "closed", elapsed: 0, variant: state.variant } : { ...state, elapsed: next };
  }
  return state;
}

export function getMonPicVisual(state: MonPicState): MonPicVisual {
  switch (state.phase) {
    case "closed":
      return HIDDEN;
    case "open":
      return OPEN_STEADY;
    case "opening":
      return (state.variant === "A" ? OPEN_TABLE_A : OPEN_TABLE_B)[state.elapsed] ?? OPEN_STEADY;
    case "closing":
      return (state.variant === "A" ? CLOSE_TABLE_A : CLOSE_TABLE_B)[state.elapsed] ?? HIDDEN;
  }
}

/** Select_Task_HandleMenu's STATE_MENU_HANDLE_INPUT is only reached once the mon pic finishes opening. */
export function isMonPicInputReady(state: MonPicState): boolean {
  return state.phase === "open";
}
