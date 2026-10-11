// General_StatsChange (B_ANIM_STATS_CHANGE): AnimTask_StatsChange
// (battle_anim_status_effects.c:482-540) -> InitStatsChangeAnimation ->
// StatsChangeAnimation_Step1..3 (battle_anim_utility_funcs.c:415-628).
//
// Pure reducer, not wired into production yet (stat102, ISSUES #166 slice a).
// `statsChangeParams` is the source switch; `statsChangeRow` replays Step3's
// state machine and maps its calls onto rows relative to the animation start
// (rel 0 = the gAnimScriptActive rise). Only the row anchors below come from
// the ROM receipts (tools/integration/fixtures/stat101/receipts/rows/*.tsv,
// identical in Scene ON and OFF); blend targets, hold, velocity and BG1 X are
// the source's.

export type StatsChangeDirection = "up" | "down";

/** Keys of `src/assets/gen/stat-anim-banner.json` `palettes`. */
export type StatsChangePaletteKey =
  | "attack"
  | "defense"
  | "speed"
  | "spAttack"
  | "spDefense"
  | "accuracy"
  | "evasion"
  | "multiple";

export interface StatsChangeParams {
  readonly animArg: number;
  readonly direction: StatsChangeDirection;
  readonly palette: StatsChangePaletteKey;
  readonly sharply: boolean;
  /** Step2 tTargetBlend: 13 sharply, else 10. */
  readonly targetBlend: number;
  /** Step2 tWaitTime: 30 sharply, else 20. */
  readonly waitTime: number;
  /** Step2 tVelocity, added to gBattle_BG1_Y on every Step3 call. */
  readonly velocity: number;
  /** Step2 gBattle_BG1_X: 64 selects the decrease half of the scroll. */
  readonly bg1X: number;
}

export interface StatsChangeRow {
  /** gAnimScriptActive. */
  readonly active: boolean;
  /** BLDALPHA as displayed; null before Step1's write is visible. */
  readonly eva: number | null;
  readonly evb: number | null;
  /** WINOUT / BLDCNT / OBJWIN as set by Step1 are displayed. */
  readonly windowRegsVisible: boolean;
  /** RAM gBattle_BG1_X / _Y; null before Step2 writes them (leftovers). */
  readonly bg1X: number | null;
  readonly bg1YRam: number | null;
  /** The scroll the screen shows: the previous row's RAM (VBlank copy). */
  readonly bg1XVisible: number | null;
  readonly bg1YVisible: number | null;
  /** The OBJ-window struct copy of the battler sprite holds a gSprites slot. */
  readonly copyAlive: boolean;
  /** The copy's OBJ-window OAM entry is displayed (the banner mask). */
  readonly maskOamVisible: boolean;
  /** Banner pixels are drawn: mask displayed, window regs on, EVA > 0. */
  readonly bannerVisible: boolean;
  /** SpriteCB_EnemyShadow hides an elevated opponent's shadow (gAnimScriptActive). */
  readonly enemyShadowHidden: boolean;
}

export interface StatsChangeSpan {
  /** Step3 state 3 row: copy freed, register restore written. */
  readonly state3Rel: number;
  /** E: the gAnimScriptActive fall. */
  readonly endRel: number;
  /** playanimation's next script instruction (no animation: rel 1). */
  readonly nextInstructionRel: number;
  /** Rows the played animation adds over the no-animation path. */
  readonly addedRows: number;
}

// include/constants/pokemon.h STAT_ATK..STAT_EVASION, in source order.
const STAT_PALETTES: readonly StatsChangePaletteKey[] = [
  "attack",
  "defense",
  "speed",
  "spAttack",
  "spDefense",
  "accuracy",
  "evasion",
];

// include/battle_anim.h:195-202.
const STAT_ANIM_PLUS1 = 14;
const STAT_ANIM_PLUS2 = 38;
const STAT_ANIM_MINUS1 = 21;
const STAT_ANIM_MINUS2 = 45;
const STAT_ANIM_MULTIPLE_PLUS1 = 55;
const STAT_ANIM_MULTIPLE_PLUS2 = 56;
const STAT_ANIM_MULTIPLE_MINUS1 = 57;
const STAT_ANIM_MULTIPLE_MINUS2 = 58;

// Row anchors (ROM receipts, 20 / 20 windows).
/** Step1 runs; its SetGpuReg writes are displayed one row later. */
const STEP1_REL = 1;
/** Step2 allocates the copy sprite... */
const STEP2_START_REL = 2;
/** ...but its LZ decompressions overrun two VBlanks: BG1 X / Y land here. */
const STEP2_DONE_REL = 4;
/** The fade-out's last call (ResetBattleAnimBg) overruns two VBlanks too. */
const RESET_LAG_ROWS = 2;
/** SetGpuReg is buffered until VBlank. */
const REGISTER_LAG_ROWS = 1;
/** gSprites -> OAM buffer -> OAM: two rows after the RAM change. */
const OAM_LAG_ROWS = 2;
/** The script `end` waits for SE_M_STAT_INCREASE / DECREASE (Cmd_end IsSEPlaying). */
const SE_END_REL = 75;
/**
 * gAnimScriptActive rises in BattleMainCB1 (the controller's LaunchBattleAnimation), before CB2's AnimateSprites, so the shadow
 * callback hides the shadow in the same row's OAM build (displayed one row later). It falls in Task_ClearBitWhenBattleTableAnimDone
 * (CB2 RunTasks, after AnimateSprites), so the shadow is rebuilt one row later and displayed on E + 2 (stat102 pixel receipt).
 */
const SHADOW_HIDE_LAG_ROWS = 1;
const SHADOW_RETURN_LAG_ROWS = 2;

/** AnimTask_StatsChange's switch; null = the task is destroyed at once. */
export function statsChangeParams(animArg: number): StatsChangeParams | null {
  let direction: StatsChangeDirection;
  let palette: StatsChangePaletteKey;
  let sharply: boolean;
  // Switch order matters: PLUS1 + EVASION == MINUS1 + 0 == 21 is EVASION up.
  if (animArg > STAT_ANIM_PLUS1 && animArg <= STAT_ANIM_PLUS1 + 7) {
    [direction, palette, sharply] = ["up", STAT_PALETTES[animArg - STAT_ANIM_PLUS1 - 1], false];
  } else if (animArg > STAT_ANIM_MINUS1 && animArg <= STAT_ANIM_MINUS1 + 7) {
    [direction, palette, sharply] = ["down", STAT_PALETTES[animArg - STAT_ANIM_MINUS1 - 1], false];
  } else if (animArg > STAT_ANIM_PLUS2 && animArg <= STAT_ANIM_PLUS2 + 7) {
    [direction, palette, sharply] = ["up", STAT_PALETTES[animArg - STAT_ANIM_PLUS2 - 1], true];
  } else if (animArg > STAT_ANIM_MINUS2 && animArg <= STAT_ANIM_MINUS2 + 7) {
    [direction, palette, sharply] = ["down", STAT_PALETTES[animArg - STAT_ANIM_MINUS2 - 1], true];
  } else if (animArg === STAT_ANIM_MULTIPLE_PLUS1) {
    [direction, palette, sharply] = ["up", "multiple", false];
  } else if (animArg === STAT_ANIM_MULTIPLE_PLUS2) {
    [direction, palette, sharply] = ["up", "multiple", true];
  } else if (animArg === STAT_ANIM_MULTIPLE_MINUS1) {
    [direction, palette, sharply] = ["down", "multiple", false];
  } else if (animArg === STAT_ANIM_MULTIPLE_MINUS2) {
    [direction, palette, sharply] = ["down", "multiple", true];
  } else {
    return null;
  }
  return {
    animArg,
    direction,
    palette,
    sharply,
    targetBlend: sharply ? 13 : 10,
    waitTime: sharply ? 30 : 20,
    velocity: direction === "down" ? -3 : 3,
    bg1X: direction === "down" ? 64 : 0,
  };
}

interface Step3Trace {
  /** tBlend after Step3 call k (index k - 1); calls 1..resetCall. */
  readonly blendAfterCall: readonly number[];
  /** The call whose fade-out reaches 0 and runs ResetBattleAnimBg. */
  readonly resetCall: number;
}

const step3Traces = new Map<string, Step3Trace>();

/** StatsChangeAnimation_Step3 states 0..2, call by call. */
function step3Trace(params: StatsChangeParams): Step3Trace {
  const key = `${params.targetBlend}/${params.waitTime}`;
  const cached = step3Traces.get(key);
  if (cached) return cached;
  const blendAfterCall: number[] = [];
  let state = 0;
  let fadeTimer = 0;
  let waitTimer = 0;
  let blend = 0;
  while (state < 3) {
    switch (state) {
      case 0:
        if (fadeTimer++ > 0) {
          fadeTimer = 0;
          blend++;
          if (blend === params.targetBlend) state++;
        }
        break;
      case 1:
        if (++waitTimer === params.waitTime) state++;
        break;
      case 2:
        if (fadeTimer++ > 0) {
          fadeTimer = 0;
          blend--;
          if (blend === 0) state++;
        }
        break;
    }
    blendAfterCall.push(blend);
  }
  const trace = { blendAfterCall, resetCall: blendAfterCall.length };
  step3Traces.set(key, trace);
  return trace;
}

/** Step3 call k runs on this row (k = 1 .. resetCall + 1). */
function step3CallRel(trace: Step3Trace, call: number): number {
  return STEP2_DONE_REL + call + (call > trace.resetCall ? RESET_LAG_ROWS : 0);
}

export function statsChangeSpan(params: StatsChangeParams): StatsChangeSpan {
  const trace = step3Trace(params);
  const state3Rel = step3CallRel(trace, trace.resetCall + 1);
  const endRel = Math.max(state3Rel, SE_END_REL);
  return {
    state3Rel,
    endRel,
    nextInstructionRel: endRel + 2,
    addedRows: endRel + 2 - 1,
  };
}

function bg1Ram(
  params: StatsChangeParams,
  trace: Step3Trace,
  rel: number,
): { x: number; y: number } | null {
  if (rel < STEP2_DONE_REL) return null;
  const resetLands = step3CallRel(trace, trace.resetCall) + RESET_LAG_ROWS;
  if (rel < resetLands) {
    const calls = Math.min(rel - STEP2_DONE_REL, trace.resetCall);
    return { x: params.bg1X, y: calls === 0 ? 0 : params.velocity * calls };
  }
  // ResetBattleAnimBg zeroes both; state 3's call adds one more velocity.
  return { x: 0, y: rel < step3CallRel(trace, trace.resetCall + 1) ? 0 : params.velocity };
}

/** BLDALPHA (eva, evb) as written in RAM on `rel`; null before Step1. */
function blendRam(trace: Step3Trace, rel: number, state3Rel: number): [number, number] | null {
  if (rel < STEP1_REL) return null;
  if (rel >= state3Rel) return [0, 0];
  const calls = Math.min(rel - STEP2_DONE_REL, trace.resetCall);
  const blend = calls > 0 ? trace.blendAfterCall[calls - 1] : 0;
  return [blend, 16 - blend];
}

export function statsChangeRow(params: StatsChangeParams, rel: number): StatsChangeRow {
  const trace = step3Trace(params);
  const { state3Rel, endRel } = statsChangeSpan(params);
  const ram = bg1Ram(params, trace, rel);
  const shown = bg1Ram(params, trace, rel - 1);
  const alpha = blendRam(trace, rel - REGISTER_LAG_ROWS, state3Rel);
  const windowRegsVisible =
    rel >= STEP1_REL + REGISTER_LAG_ROWS && rel < state3Rel + REGISTER_LAG_ROWS;
  const maskOamVisible =
    rel >= STEP2_DONE_REL + OAM_LAG_ROWS && rel < state3Rel + OAM_LAG_ROWS;
  const eva = alpha ? alpha[0] : null;
  return {
    active: rel >= 0 && rel < endRel,
    eva,
    evb: alpha ? alpha[1] : null,
    windowRegsVisible,
    bg1X: ram ? ram.x : null,
    bg1YRam: ram ? ram.y : null,
    bg1XVisible: shown ? shown.x : null,
    bg1YVisible: shown ? shown.y : null,
    copyAlive: rel >= STEP2_START_REL && rel < state3Rel,
    maskOamVisible,
    bannerVisible: maskOamVisible && windowRegsVisible && (eva ?? 0) > 0,
    enemyShadowHidden: rel >= SHADOW_HIDE_LAG_ROWS && rel < endRel + SHADOW_RETURN_LAG_ROWS,
  };
}
