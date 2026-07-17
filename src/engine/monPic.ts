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
// captureFrames every tick) of open/close transitions in
// tools/compare/traces/draft-menu.json (2 slots, 2 open+close cycles) and
// draft-menu-slot6.json (1 slot, every frame 0-65) found THREE distinct
// open timings (close only needs two so far):
//   - "A" variant: triggered right after a stretch of pure idle (no LEFT/
//     RIGHT/UP/DOWN yet processed this screen) - has a duplicate-hold tick
//     and a doubled window-growth step partway through.
//   - "B" variant: triggered after at least one LEFT/RIGHT/UP/DOWN has
//     already been processed, AND at least one ball has opened before this
//     one - a clean one-step-per-tick sequence, but with one extra held
//     tick at full flash width before the window starts growing.
//   - "C" variant: triggered after at least one LEFT/RIGHT/UP/DOWN has
//     already been processed, but this is still the session's very first
//     ball-open (draft-menu-slot6.json: LEFT then A) - same flash-phase
//     shape as A, but the window-growth hold/skip sit at different ticks
//     than either A or B (hold right at the start, skip right after).
// This is very likely a GPU-register-latch or task-scheduling artifact of
// interaction with reference/pokeemerald's incremental text-printer
// (RunTextPrinters, still draining glyphs for a few frames after the most
// recent redraw) - not re-derived from first principles, just pinned from
// the oracle per variant. Whichever LEFT/RIGHT/UP/DOWN last fired before
// OpenMonPic/CloseMonPic is what the real game keys off of; we approximate
// it with "has any such input ever fired yet", which is exact for every
// committed trace but may not generalize to an arbitrary interleaving - see
// ISSUES.md if a future trace exposes a gap.
//
// Separately (MonPicState.blended, NOT coupled to the A/B/C variant above):
// the flash bar's color is only the ball's flat native color (214,255,239)
// during the session's very first ball-open. Every flash after that
// (including the rest of that first open's own close, and every later
// open/close) instead renders as that color alpha-blended with whatever's
// underneath (ball OBJ or BG1) at the same EVA=11/EVB=4 ratio as the window
// - because the flash sprite's OAM entry is objMode=ST_OAM_OBJ_BLEND
// (forces it to participate in blending whenever BLDCNT's effect is
// active), and Task_OpenMonPic's case1 configures BLDCNT/BLDALPHA once and
// never resets them, so it stays configured for the rest of the screen's
// life once the first open reaches that point. draft-menu-slot6.json proved
// this is independent of the timing variant: its open is "C" (hasActed) but
// still unblended (still the session's first-ever open).

export type MonPicPhase = "closed" | "opening" | "open" | "closing";
type Variant = "A" | "B" | "C";

export interface MonPicState {
  phase: MonPicPhase;
  /** Ticks since this phase started (0 = the tick that triggered it). Meaningless for "closed"/"open". */
  elapsed: number;
  /** Which measured timing table this opening/closing run follows (meaningless for "closed"/"open"). */
  variant: Variant;
  /**
   * Whether the flash sprite blends against its background this run (see
   * module comment). Captured once at open/close time, independent of
   * `variant`: it tracks Task_OpenMonPic's case1 (BLDCNT/BLDALPHA setup,
   * which runs once per open but whose *effect* - the flash sprite's
   * objMode=ST_OAM_OBJ_BLEND participating in blending - only becomes
   * observable once BLDCNT's blend effect has been configured at least once
   * this session, and then stays configured forever). False only during the
   * flash phase of the session's very first-ever open.
   */
  blended: boolean;
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

// Variant C: hasActed (a cursor move already fired) but this is still the
// session's very first ball-open - oracle-measured from
// draft-menu-slot6.json (dense every-frame capture). Same flash-phase shape
// as variant A (12 flash ticks, un-blended - see MonPicState.blended), but a
// differently-positioned window-growth hold/skip than either A or B: the
// hold comes right at the start (two ticks at top=60) and the skip comes
// right after (top=52, skipping 56), rather than A's hold-in-the-middle or
// B's extra pre-window flash hold. Not re-derived from first principles
// (same GPU-register-latch/task-scheduling caveat as A/B - see module
// comment); pinned from the oracle.
const OPEN_TABLE_C: MonPicVisual[] = [
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
  win(60, 69), // oracle-measured duplicate hold
  win(52, 77), // oracle-measured skip (top=56 never renders)
  win(48, 81),
  win(44, 85),
  win(40, 89),
  win(36, 93),
  win(36, 93), // oracle-measured duplicate hold
  win(32, 96),
  win(32, 96),
  { ...win(32, 96), spriteVisible: true, menuTextVisible: true },
  OPEN_STEADY,
];

// idx = ticks since the tick JOY_NEW(B) fired (idx0 = that same tick's
// render - CloseMonPic's immediate sprite-free/popup-erase effects only
// become visible starting idx1).
//
// idx1 in every table below overrides spriteVisible/menuHighlightVisible
// back to true: CloseMonPic destroys the front-sprite object and
// Select_ErasePopupMenu sets the highlight sprites' `invisible` flag in the
// same tick, and both clear the SUMMARY/RENT/OTHERS *text* (window copy,
// immediate) - but (same BuildOamBuffer-before-RunTasks ordering as the
// open tables' spriteVisible/menuTextVisible split, one tick apart) any
// *OAM* change (sprite destruction, `invisible` flag) lags 1 extra tick
// behind a window copy: oracle-measured (draft-menu-slot6.json dense
// probe), both the front sprite and the RENT/DESELECT row's highlight bar
// are still visible with no text at idx1, gone by idx2.
const CLOSE_TABLE_A: MonPicVisual[] = [
  OPEN_STEADY,
  { ...win(36, 92), spriteVisible: true, menuHighlightVisible: true },
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
  { ...win(36, 92), spriteVisible: true, menuHighlightVisible: true },
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

export const INITIAL_MON_PIC_STATE: MonPicState = { phase: "closed", elapsed: 0, variant: "A", blended: false };

function openTableFor(variant: Variant): MonPicVisual[] {
  if (variant === "A") return OPEN_TABLE_A;
  if (variant === "C") return OPEN_TABLE_C;
  return OPEN_TABLE_B;
}

// Close only needs two window-shrink shapes, but NOT a simple mirror of the
// open variant: dense-probing both draft-menu.json's first close (open
// variant A: hasActed was FALSE at open time, 3 DOWNs before the close) and
// draft-menu-slot6.json's close (open variant C: hasActed was true at open
// time, but still the session's first-ever open) found variant A's close
// uses the CLEAN shape (matching CLOSE_TABLE_B digit-for-digit, despite
// hasActed being true by the time either close fires - hasActed-at-close
// does NOT predict this), while variant C's close is the one that needs the
// skip+duplicate shape (CLOSE_TABLE_A). Variant B (already established) is
// clean too. So only variant C is special; A and B share CLOSE_TABLE_B.
function closeTableFor(variant: Variant): MonPicVisual[] {
  return variant === "C" ? CLOSE_TABLE_A : CLOSE_TABLE_B;
}

/**
 * OpenMonPic: called the same tick JOY_NEW(A) is handled. `hasActed` = has
 * any LEFT/RIGHT/UP/DOWN been processed yet this screen (picks the
 * window-growth timing table). `hasOpenedBefore` = has any ball-open
 * happened yet this session (picks the flash blend color - see
 * MonPicState.blended doc).
 */
export function openMonPic(hasActed: boolean, hasOpenedBefore: boolean): MonPicState {
  const variant: Variant = !hasActed ? "A" : hasOpenedBefore ? "B" : "C";
  return { phase: "opening", elapsed: 0, variant, blended: hasOpenedBefore };
}

/**
 * CloseMonPic: called the same tick JOY_NEW(B) (or A-on-OTHERS) is handled.
 * `variant` is the preserved `MonPicState.variant` from the matching open
 * (not re-derived from `hasActed`): a close's timing follows whichever
 * animation shape its open used (see closeTableFor), since the underlying
 * quirk tracks screen/session history, not the close action itself. Always
 * blended: a close can only follow an open, which always configures BLDCNT
 * first.
 */
export function closeMonPic(variant: Variant): MonPicState {
  return { phase: "closing", elapsed: 0, variant, blended: true };
}

/** Advance by one tick; call before applying this tick's input (open/closeMonPic override the result). */
export function advanceMonPic(state: MonPicState): MonPicState {
  if (state.phase === "opening") {
    const table = openTableFor(state.variant);
    const next = state.elapsed + 1;
    return next >= table.length
      ? { phase: "open", elapsed: 0, variant: state.variant, blended: state.blended }
      : { ...state, elapsed: next };
  }
  if (state.phase === "closing") {
    const table = closeTableFor(state.variant);
    const next = state.elapsed + 1;
    return next >= table.length
      ? { phase: "closed", elapsed: 0, variant: state.variant, blended: state.blended }
      : { ...state, elapsed: next };
  }
  return state;
}

export function getMonPicVisual(state: MonPicState): MonPicVisual {
  switch (state.phase) {
    case "closed":
      return HIDDEN;
    case "open":
      return OPEN_STEADY;
    case "opening": {
      const visual = openTableFor(state.variant)[state.elapsed] ?? OPEN_STEADY;
      return visual.flashWidth > 0 ? { ...visual, flashBlended: state.blended } : visual;
    }
    case "closing": {
      const visual = closeTableFor(state.variant)[state.elapsed] ?? HIDDEN;
      return visual.flashWidth > 0 ? { ...visual, flashBlended: state.blended } : visual;
    }
  }
}

/** Select_Task_HandleMenu's STATE_MENU_HANDLE_INPUT is only reached once the mon pic finishes opening. */
export function isMonPicInputReady(state: MonPicState): boolean {
  return state.phase === "open";
}

/**
 * Select_Task_HandleChooseMons (battle_factory_screen.c:1671-1673) early-
 * returns - dropping LEFT/RIGHT AND a fresh A-to-open alike, not just cursor
 * moves - for as long as `sFactorySelectScreen->monPicAnimating` is TRUE.
 * That flag is set the instant CloseMonPic fires (same tick as the
 * RENT/DESELECT confirm or B/OTHERS close) and only clears once
 * SpriteCB_CloseMonPic's flash-shrink affine anim ends - i.e. for this
 * engine's modeling, exactly the whole "closing" phase (RAM-verified via
 * direct `monPicAnimating` reads: replaying RENT_SLOT1 - confirm A at tick
 * 37 - a RIGHT sent tick 56 is silently dropped, cursorPos stays 0; sent
 * tick 57 (the tick `monPicAnimating` first reads FALSE, matching
 * `phase` flipping "closing"->"closed") it's accepted, cursorPos moves; see
 * tests/cursorInputGate.test.ts). Symmetric to isMonPicInputReady's
 * "opening" gate, just for the close side and the cursor-mode task instead
 * of the menu-mode one.
 */
export function isCursorInputReady(state: MonPicState): boolean {
  return state.phase === "closed";
}
