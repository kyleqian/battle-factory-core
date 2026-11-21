// Canonical-recorded battle replay constants split out of battleScene.ts
// (docs/battlescene-canonical-split-design.md §6). battleScene.ts re-exports
// everything moved here so no caller changes until the final slice.
/** Trace tick every widget's entrance slide has settled (docs/battle-interface-assets.md). */
export const BALL_WIDGETS_SETTLED_TICK = 1292;
export const TURN5_SITRUS_RING_RENDER_LAG = 1;

// --- slice 2: self-contained literal constants (docs/battlescene-canonical-split-design.md §6) ---
/**
 * Battle 2's action-menu handoff timing (formerly battle2ActionMenu.ts,
 * retired at the #39 rank-1 flip -- docs/battle-scene-retirement-
 * inventory.md). `PlayerHandleChooseAction` is scheduled from the
 * encounter's send-out handoff. Battle 2 clears B_WIN_MSG at handoff+325,
 * waits six displayed frames for the off-screen BG0 DMA, and reveals the
 * input-ready action menu at handoff+331.
 */
export const ACTION_MENU_BLANK_START_OFFSET = 325;

export const BATTLE2_ROCK_SLIDE_REUSE_SHIFT = 380;

export const PIDGEOTTO_CORNER = { x: 144, y: 19 };

export const MURKROW_CORNER = { x: 144, y: 19 };

export const LINE1 = "BUG CATCHER DESTIN";

export const SUBSEQUENT_BATTLE_SUMMARY_EVA_PHASE_AGE = 14;

export const GROVYLE_MATERIALIZE_TICK = 1544;

export const GROVYLE_CORNER = { x: 144, y: 12 };

export const GROVYLE_FRONT_ANIM_START_OFFSET = 35;

export const GROVYLE_STRETCH_TABLE: readonly { xScale: number; yScale: number; y2: number }[] = [
  { xScale: 263, yScale: 239, y2: -2 }, { xScale: 264, yScale: 236, y2: -2 }, { xScale: 265, yScale: 234, y2: -2 },
  { xScale: 266, yScale: 231, y2: -3 }, { xScale: 267, yScale: 221, y2: -4 }, { xScale: 268, yScale: 222, y2: -4 },
  { xScale: 268, yScale: 229, y2: -3 }, { xScale: 269, yScale: 231, y2: -3 }, { xScale: 270, yScale: 222, y2: -4 },
  { xScale: 270, yScale: 213, y2: -5 }, { xScale: 271, yScale: 215, y2: -5 }, { xScale: 271, yScale: 223, y2: -4 },
  { xScale: 271, yScale: 225, y2: -3 }, { xScale: 271, yScale: 218, y2: -4 }, { xScale: 272, yScale: 209, y2: -5 },
  { xScale: 271, yScale: 212, y2: -5 }, { xScale: 271, yScale: 222, y2: -4 }, { xScale: 271, yScale: 226, y2: -3 },
  { xScale: 271, yScale: 219, y2: -4 }, { xScale: 270, yScale: 213, y2: -5 }, { xScale: 270, yScale: 216, y2: -5 },
  { xScale: 269, yScale: 227, y2: -3 }, { xScale: 269, yScale: 232, y2: -3 }, { xScale: 268, yScale: 227, y2: -3 },
  { xScale: 267, yScale: 228, y2: -3 }, { xScale: 266, yScale: 230, y2: -3 }, { xScale: 265, yScale: 233, y2: -2 },
  { xScale: 264, yScale: 235, y2: -2 }, { xScale: 263, yScale: 238, y2: -2 }, { xScale: 262, yScale: 241, y2: -1 },
  { xScale: 261, yScale: 244, y2: -1 }, { xScale: 259, yScale: 247, y2: -1 }, { xScale: 258, yScale: 250, y2: 0 },
  { xScale: 257, yScale: 253, y2: 0 }, { xScale: 256, yScale: 256, y2: 0 }, { xScale: 256, yScale: 256, y2: 0 },
];

export const GROVYLE_STRETCH_EARLY_TABLE: readonly { xScale: number; yScale: number; y2: number }[] = [
  { xScale: 256, yScale: 256, y2: 0 }, // RAM 1496 raw (0,0,0) not yet latched - see doc comment above
  { xScale: 256, yScale: 256, y2: 0 },
  { xScale: 257, yScale: 254, y2: 0 },
  { xScale: 258, yScale: 251, y2: 0 },
  { xScale: 259, yScale: 248, y2: -1 },
  { xScale: 260, yScale: 245, y2: -1 },
  { xScale: 262, yScale: 241, y2: -1 },
];

export const BALL_OAM_PRIORITY = 2;

export const PARTICLE_OAM_PRIORITY = 1;

export const PARTICLE_OAM_SUBPRIORITY = 28;

export const ROCK_SLIDE_MOVE_POWER = 75;

export const DRAGON_BREATH_MOVE_POWER = 60;

export const DRAGONBREATH_KICKOFF_LINE2 = "DRAGONBREATH!";

export const DRAGONBREATH_TEXT_START_DELAY = 192;

export const DRAGONBREATH_HP_DRAIN_START_DELAY = 353;

export const DRAGONBREATH_HIT_FLASH_ANCHOR_DELAY = 318;

export const TURN2_OFF_DRAGONBREATH_HIT_FLASH_ANCHOR_DELAY = 219;

export const TURN2_OFF_DRAGONBREATH_HP_DRAIN_START_DELAY = 254;

export const TURN2_OFF_DRAGONBREATH_TEXT_CLEAR_DELAY = 285;

export const TURN3_CONFIRM_PRESS_TICK = 3891;

export const TURN2_OFF_ENDEAVOR_HP_DRAIN_START_DELAY = 116;

export const TURN2_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START = 81;

export const TURN2_OFF_ENDEAVOR_TEXT_CLEAR_DELAY = 155;

export const TURN2_OFF_DRAGONBREATH_TEXT_START_DELAY = 155;

export const TURN3_OFF_ENDEAVOR_HP_DRAIN_START_DELAY = 116;

export const TURN3_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START = 81;

export const TURN3_ROCKSLIDE_PRESS_TICK = 3687;

export const TURN3_OFF_ROCKSLIDE_TEXT_DELAY = 356;

export const TURN3_OFF_ROCKSLIDE_HP_DRAIN_START_DELAY = 453;

export const TURN3_OFF_ROCKSLIDE_TEXT_CLEAR_DELAY = 518;

export const TURN3_OFF_ROCKSLIDE_MENU_REDRAW_DELAY = 525;

export const TURN4_CONFIRM_PRESS_TICK = 4925;

export const TURN4_OFF_STATS_BANNER_START_DELAY = 80;

export const TURN4_OFF_STATS_BANNER_END_DELAY = 146;

export const TURN4_OFF_STATS_BANNER_BG1_Y_ANCHOR_DELAY = 83;

export const TURN4_OFF_STAT_ROSE_TEXT_DELAY = 156;

export const TURN4_ROCKSLIDE_MENU_REDRAW_DELAY = 661;

export const TURN4_OFF_ROCKSLIDE_TEXT_DELAY = 265;

export const TURN4_OFF_ROCKSLIDE_HP_DRAIN_START_DELAY = 362;

export const TURN4_OFF_ROCKSLIDE_TEXT_CLEAR_DELAY = 420;

export const TURN4_OFF_ROCKSLIDE_MENU_REDRAW_DELAY = 427;

export const TURN5_CONFIRM_PRESS_TICK = 5959;

export const TURN5_LEGACY_PRESENTATION_CONTINUATION_LAG = 234;

export const TURN5_ROCKSLIDE_PRESS_TICK = 5829;

/**
 * ISSUES #97-B (docs/turn5-family-class3-diagnosis.md §14/§15/§17 item 1):
 * a scoped OFF-profile override of `rockSlideTextStartTick`'s shared
 * `delay` param, turn-5-only - the shared helper's default
 * (`ROCK_SLIDE_TEXT_DELAY`=393) and every OTHER turn's own call
 * (3/4/6/7/9/10/11/12, each already scoped the same way or unaffected)
 * are untouched. RAM-confirmed exact this session
 * (`dump-turn5-resolve-grovyle-side-driver.py`, ticks 6180-6295): the real
 * oracle's "ONIX used\nROCK SLIDE!" message starts at tick 6184, not the
 * unscoped default's 6222 (`TURN5_ROCKSLIDE_PRESS_TICK`+393) - a -38 tick
 * correction, so `pressTick`+355 = 6184.
 */
export const TURN5_OFF_ROCKSLIDE_TEXT_DELAY = 355;

/**
 * ISSUES #97-B (docs/turn5-family-class3-diagnosis.md §16/§17 item 2): a
 * scoped OFF-profile override of `rockSlideOpponentHp`'s shared
 * `startDelay` param, turn-5-only (mirrors turns 9/10/11's own existing
 * per-turn overrides of this same shared default,
 * `TURN9_ROCKSLIDE_HP_DRAIN_START_DELAY`/`TURN10_OFF_ROCKSLIDE_HP_DRAIN_
 * START_DELAY`/`TURN11_OFF_ROCKSLIDE_HP_DRAIN_START_DELAY`). GROVYLE's own
 * hp is a single-unit STEP (startHp=1 -> endHp=0, not a live multi-tick
 * drain - RAM-confirmed this session: the real oracle holds hp=1 flat from
 * 6184 through 6284, then hp=0 at 6285 exactly, no intermediate values).
 * `pressTick`+455+1 = 6285 reproduces that exact step tick (the unscoped
 * default, 597, steps at 6427 instead - 142 ticks late).
 */
export const TURN5_OFF_ROCKSLIDE_HP_DRAIN_START_DELAY = 455;

/**
 * ISSUES #97-B (docs/turn5-family-class3-diagnosis.md §16/§17 item 2):
 * RAM-confirmed exact this session (same probe/window as above) that the
 * real oracle's fainted-flash/healthbox-sink event family clusters around
 * the real fainted-text-start tick (6378), not the prior 6502 anchor (145
 * ticks late, §15). Re-anchored by preserving this cluster's own existing
 * internal delta (the prior code's opponentHp-zero-to-sink-start gap, +75
 * ticks) against the NEW RAM-confirmed opponentHp-zero tick (6285) rather
 * than an independent probe of the sink animation's own OAM state (not run
 * this session, time) - 6285+75=6360. This lands `GROVYLE_HEALTHBOX_VANISH_
 * TICK` (computed below, unchanged formula) at 6360+19=6379, within 1 tick
 * of the RAM-confirmed real fainted-text-start (6378) - convergent, not
 * independently verified for the sink's own visual start.
 */
export const GROVYLE_FAINT_SINK_START_TICK = 6360;

export const TURN5_BG_FADE_START_TICK = 6746;

export const TURN5_SITRUS_HEAL_TEXT_START_TICK = 7078;

export const TURN5_SITRUS_TEXT_CLEAR_TICK = 7216;

export const TURN5_SITRUS_MENU_REDRAW_TICK = 7222;

/**
 * ISSUES #97-B (docs/turn5-family-class3-diagnosis.md §17 item 3): the
 * three ticks above are all confirmed WRONG for this trace family
 * (RAM-confirmed this session, `dump-turn5-resolve-grovyle-side-driver.py`
 * dense sweeps 6800-7000: real Sitrus-heal message start is tick 6850, not
 * 7078 - 228 ticks late; real "What will ONIX do?" menu redraw is tick
 * 6991, not 7222 - 231 ticks late; no intermediate blank-text state was
 * observed in `gDisplayedStringBattle` between the two, so the real
 * transition is a direct hard-cut, same shape `turn5FaintedTextStartTick`'s
 * own doc already established for the fainted text one phase earlier).
 * Left UNCHANGED here (not "fixed in place") because `TURN5_SITRUS_MENU_
 * REDRAW_TICK` is a load-bearing upstream anchor for MANY later turns' own
 * `TURN{9,10,11,12,13}_REGIME{4,5,6,7,8}_TO_REGIME1_SHIFT`/`TURN14_MENU_
 * REDRAW_RESET_SHIFT` relative-tick math (`battleScene.ts`) - editing it
 * here would cascade into turns 9-14, entirely out of this fix's scope and
 * verification budget. Corrected via a SCOPED override
 * (`TURN5_OFF_SITRUS_*` below, turn-5-dispatch-gate-only) instead, per the
 * same "scoped override if shared" rule §17 item 1 already used.
 */
export const TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK = 6850;
export const TURN5_OFF_SITRUS_TEXT_CLEAR_TICK = 6989;
export const TURN5_OFF_SITRUS_MENU_REDRAW_TICK = 6995;

/**
 * ISSUES #97 remainder residual (B) (`docs/turn5-confirmb-resolved-
 * residuals.md` §2.2): `turn5SitrusOnixHp`/`turn5SitrusHealTextVisibleChars`
 * still key off the separate, older `ONIX_SITRUS_IDENTITY_RENDER_TICK`
 * epoch (6874) that item 3's dispatch-gate overrides above never swept -
 * their downstream age-offset consumers (`heldItemHeal.ts`'s
 * `SITRUS_ITEM_*_FIRST_AGE`) reconstruct the same superseded 7078-era
 * anchor. This turn5-off-scoped jump tick is the real hard step
 * RAM-confirmed fresh this session (`tools/probe/dump-turn5-resolve-offd-
 * onixhp-ram.py`, dense sweep 6975-6995 against `turn5-resolve-off-d.json`):
 * ONIX's own `gBattleMons[0].hp` holds flat at 1 through 6983, then reads 31
 * from 6984 on - a genuine single-tick step, not a live ramp (matching the
 * established Scene-OFF precedent, GROVYLE's own drain above) - confirming
 * the diagnosis doc's own given ground truth exactly, no contradiction.
 */
export const TURN5_OFF_SITRUS_ONIX_HP_JUMP_TICK = 6984;

/**
 * `docs/turn5-confirmb-resolved-residuals.md` §8 (2026-08-18, ISSUES #97
 * remainder): the DISPLAYED bar is not a mirror of the RAM hard step above -
 * fresh oracle-vs-oracle pixel-diffing this session
 * (`npm run compare -- turn5-resolve-off-d --capture-range`, a per-tick
 * diff of the HP-digit crop `[172,92]-[216,101]`) shows the digit is
 * UNCHANGED through render tick 6952, then changes on EVERY single tick
 * 6953-6982 inclusive (30 consecutive nonzero diffs, no skips, no repeats),
 * then flat again 6982-6984+ (bbox moves off the digit region entirely by
 * 6989, confirming the climb is done well before this file's own JUMP_TICK
 * RAM anchor). Combined with 3 independently oracle-read HP digits (6953->2,
 * 6960->9, 6980->29, all exactly `t-6951`), this pins the SAME live-climb
 * shape `endeavorHp`/GROVYLE's own drain already use (1 HP/tick, sentinel
 * tick shows the pre-climb value, first visible change one tick later) -
 * `1 + (t - 6952)`, clamped to `[TURN5_SITRUS_HEAL_HP_START,
 * TURN5_SITRUS_HEAL_HP_END]`, reaches the cap at exactly t=6982 (`1+30=31`).
 * A NEW scoped anchor, not derived from `TURN5_OFF_SITRUS_ONIX_HP_JUMP_TICK`
 * or `ONIX_SITRUS_PROC_TRIGGER_RAM_TICK`(6872)/`TURN5_OFF_SITRUS_HEAL_TEXT_
 * START_TICK`(6850) by any clean relative offset found this session (80/102
 * ticks respectively, neither a round or previously-seen delta) - minted
 * directly from the pixel-confirmed absolute tick, same as the jump tick
 * above.
 */
export const TURN5_OFF_SITRUS_ONIX_HP_CLIMB_START_TICK = 6952;

/**
 * ISSUES #97-B (docs/turn5-family-class3-diagnosis.md §14/§15/§17 item 2):
 * RAM-confirmed exact this session - the real oracle's "Foe GROVYLE
 * fainted!" message starts at tick 6378, not the old 6523
 * (`TURN5_ROCKSLIDE_PRESS_TICK`+694) - 145 ticks late. `pressTick`+549 =
 * 6378.
 */
export const TURN5_FAINTED_TEXT_DELAY = 549;

export const TURN5_ICONBAR_CREATE_TICK = 6587;

export const TURN5_ICONBAR_FADE_START_TICK = 6725;

export const TURN5_ICONBAR_DESTROY_TICK = 6742;

export const TURN5_OPPONENT_ICON_STATES: readonly string[] = ["Empty", "Empty", "Empty", "Full", "Full", "Statused"];

export const TURN13_ICONBAR_CREATE_AFTER_DISMISS = 26;

export const TURN13_ICONBAR_FADE_START_AFTER_DISMISS = 162;

export const TURN13_ICONBAR_DESTROY_AFTER_DISMISS = 179;

export const TURN13_OPPONENT_ICON_STATES: readonly string[] = ["Empty", "Empty", "Empty", "Statused", "Full", "Statused"];

export const SWITCHIN_SENTOUT_LINE1 = "BUG CATCHER DESTIN sent";

export const SWITCHIN_SENTOUT_TEXT_START_TICK = 6687;

/**
 * `docs/turn5-resolve-offc-tail-diagnosis.md` §11d (2026-08-18, ISSUES #97
 * remainder): still consumed by `tools/probe/analyze-turn5-resolve-offc-
 * tail-app-series.ts`'s own receipt, but no longer by `drawTurn5PidgeottoMaterialize`
 * -- the RAM-flat affine matrix this tick used to gate a settle-wobble
 * table (`TURN5_STRETCH_TABLE`, since deleted, no RAM basis) never engaged.
 */
export const TURN5_STRETCH_TICK = 6786;

export const TURN13_BALL_HANDOFF_AFTER_DISMISS = 164;

export const TURN13_MURKROW_SETTLE_AFTER_DISMISS = 249;

export const TURN13_MURKROW_STRETCH_AFTER_DISMISS = 199;

export const TURN13_MURKROW_WOBBLE_TABLE: readonly { xScale: number; yScale: number; y2: number }[] = [
  { xScale: 256, yScale: 256, y2: 0 },
  { xScale: 250, yScale: 262, y2: 0 },
  { xScale: 244, yScale: 268, y2: 1 },
  { xScale: 239, yScale: 273, y2: 2 },
  { xScale: 234, yScale: 278, y2: 2 },
  { xScale: 230, yScale: 282, y2: 3 },
  { xScale: 227, yScale: 285, y2: 3 },
  { xScale: 225, yScale: 287, y2: 3 },
  { xScale: 224, yScale: 288, y2: 4 },
  { xScale: 225, yScale: 287, y2: 3 },
  { xScale: 227, yScale: 285, y2: 3 },
  { xScale: 230, yScale: 282, y2: 3 },
  { xScale: 234, yScale: 278, y2: 2 },
  { xScale: 239, yScale: 273, y2: 2 },
  { xScale: 244, yScale: 268, y2: 1 },
  { xScale: 250, yScale: 262, y2: 0 },
  { xScale: 256, yScale: 256, y2: 0 },
  { xScale: 263, yScale: 249, y2: -1 },
  { xScale: 269, yScale: 243, y2: -3 },
  { xScale: 274, yScale: 238, y2: -5 },
  { xScale: 279, yScale: 233, y2: -7 },
  { xScale: 283, yScale: 229, y2: -8 },
  { xScale: 286, yScale: 226, y2: -9 },
  { xScale: 288, yScale: 224, y2: -9 },
  { xScale: 288, yScale: 224, y2: -10 },
  { xScale: 288, yScale: 224, y2: -9 },
  { xScale: 286, yScale: 226, y2: -9 },
  { xScale: 283, yScale: 229, y2: -8 },
  { xScale: 279, yScale: 233, y2: -7 },
  { xScale: 274, yScale: 238, y2: -5 },
  { xScale: 269, yScale: 243, y2: -3 },
  { xScale: 263, yScale: 249, y2: -1 },
  { xScale: 256, yScale: 256, y2: -1 },
  { xScale: 250, yScale: 262, y2: -1 },
  { xScale: 244, yScale: 268, y2: 0 },
  { xScale: 239, yScale: 273, y2: 1 },
  { xScale: 234, yScale: 278, y2: 1 },
  { xScale: 230, yScale: 282, y2: 2 },
  { xScale: 227, yScale: 285, y2: 2 },
  { xScale: 225, yScale: 287, y2: 2 },
  { xScale: 224, yScale: 288, y2: 3 },
  { xScale: 225, yScale: 287, y2: 2 },
  { xScale: 227, yScale: 285, y2: 2 },
  { xScale: 230, yScale: 282, y2: 2 },
  { xScale: 234, yScale: 278, y2: 1 },
  { xScale: 239, yScale: 273, y2: 1 },
  { xScale: 244, yScale: 268, y2: 0 },
  { xScale: 250, yScale: 262, y2: -1 },
  { xScale: 256, yScale: 256, y2: -1 },
  { xScale: 256, yScale: 256, y2: 0 },
];

export const TURN13_MURKROW_FRAME_FLIP_AFTER_DISMISS = 213;

export const TURN13_SWITCHIN_SENTOUT_TEXT_AFTER_DISMISS = 126;

export const TURN13_SWITCHIN_TEXT_CLEAR_AFTER_DISMISS = 285;

export const TURN13_SETTLED_BOUNCE_PHASE_SHIFT = -9890;

export const TURN6_BOUNCE_FREEZE_ANCHOR_OFFSET = 4;

export const TURN6_FEATHERDANCE_LINE1 = "Foe PIDGEOTTO used";

export const TURN6_FEATHERDANCE_LINE2 = "FEATHERDANCE!";

export const TURN8_BIND_TEXT_DELAY = 421;

export const TURN8_BIND_PRESS_TICK = 9425;

export const TURN8_MISS_TEXT_DELAY = 471;

export const TURN8_TEXT_CLEAR_DELAY = 566;

export const LEGACY_PIDGEOTTO_ONIX_MAX_HP = 117;

/**
 * S7 slice R (docs/turn9-notes.md): "Foe PIDGEOTTO used\nQUICK ATTACK!" -
 * Pidgeotto's own move switch (NOT a 4th FEATHER_DANCE - the dossier's own
 * pinned falsifiable test came back negative this turn). Delay fit directly
 * against `tools/compare/traces/turn9-menu.json`'s own real script (this
 * turn's real confirm pressTick, `TICK0 + sm.confirmElapsed`): the fresh
 * capture's first changing tick past the settled submenu is 10878, and the
 * text settles fully-typed at 10930 (oracle-confirmed sha `6de9da748618` -
 * byte-identical to `turn6-notes.md`'s own cited sha for this exact tick in
 * an unrelated turn's own different text, a coincidence of the settled
 * "held plateau" hash region, not a content match).
 */
export const TURN9_QUICKATTACK_LINE1 = "Foe PIDGEOTTO used";

export const TURN9_QUICKATTACK_LINE2 = "QUICK ATTACK!";

export const TURN9_QUICKATTACK_TEXT_DELAY = 11;

export const OPPONENT_BATTLE_TERRAIN_VISIBLE_BOTTOM = 74;

export const TURN9_EP2_HEALTHBOX_WOBBLE_RENDER_LAG = 1;

export const TURN9_EP2_HEALTHBOX_WOBBLE_START = 84;

export const TURN9_EP2_HEALTHBOX_WOBBLE_TICKS = 20;

export const TURN9_EP2_FLICKER_RENDER_LAG = 1;

export const TURN9_EP2_FLICKER_START = 85;

export const TURN9_EP2_FLICKER_TOTAL_TICKS = 32;

export const TURN9_EP2_FLICKER_PERIOD = 8;

export const TURN9_EP2_FLICKER_ON_TICKS = 4;

export const TURN9_HP_DRAIN_START_DELAY = 119;

export const TURN9_NOTVERYEFFECTIVE_LINE = "It’s not very effective…";

export const TURN9_ROCKSLIDE_PRESS_TICK = 10715;

export const TURN9_SUPER_EFFECTIVE_TEXT_DELAY = 517;

export const TURN9_ROCKSLIDE_HP_DRAIN_START_DELAY = 490;

export const TURN9_ROCKSLIDE_TEXT_CLEAR_DELAY = 614;

export const TURN9_QUICKATTACK_PRESS_TICK = 10871;

export const TURN9_PIDGEOTTO_AFTER_ROCKSLIDE_HP = 61;

export const TURN10_AERIALACE_LINE1 = "Foe PIDGEOTTO used";

export const TURN10_AERIALACE_LINE2 = "AERIAL ACE!";

export const TURN10_AERIALACE_TEXT_DELAY = 11;

export const TURN10_AERIALACE_HP_DRAIN_START_DELAY = 136;

export const TURN10_OFF_AERIALACE_HP_DRAIN_START_DELAY = 117;

export const TURN10_NOTVERYEFFECTIVE_TEXT_DELAY = 152;

export const TURN10_OFF_NOTVERYEFFECTIVE_TEXT_DELAY = 133;

export const TURN10_OFF_ONIX_HEALTHBOX_WOBBLE_START = 82;

export const TURN10_OFF_ONIX_FLICKER_START = 83;

export const TURN10_ROCKSLIDE_PRESS_TICK = 12169;

export const TURN10_OFF_ROCKSLIDE_PRESS_TICK = 12150;

export const TURN10_OFF_ROCKSLIDE_HP_DRAIN_START_DELAY = 490;

export const TURN10_PIDGEOTTO_AFTER_ROCKSLIDE_HP = 38;

export const TURN10_SUPER_EFFECTIVE_TEXT_DELAY = 626;

export const TURN10_OFF_SUPER_EFFECTIVE_TEXT_DELAY = 519;

export const TURN10_OFF_ROCKSLIDE_TEXT_CLEAR_DELAY = 616;

export const TURN10_OFF_ROCKSLIDE_MENU_REDRAW_DELAY = 623;

export const TURN11_ATKFLOOR_TEXT_START_DELAY = 83;

export const TURN11_ROCKSLIDE_PRESS_TICK = 13137;

export const TURN11_PIDGEOTTO_AFTER_ROCKSLIDE_HP = 16;

export const TURN11_OFF_ROCKSLIDE_HP_DRAIN_START_DELAY = 490;

export const TURN11_SUPER_EFFECTIVE_TEXT_DELAY = 625;

export const TURN11_OFF_SUPER_EFFECTIVE_TEXT_DELAY = 518;

export const TURN11_OFF_ROCKSLIDE_TEXT_CLEAR_DELAY = 615;

export const TURN11_OFF_ROCKSLIDE_MENU_REDRAW_DELAY = 622;

export const TURN12_OFF_ONIX_FLICKER_START = 83;

export const TURN12_OFF_ONIX_HEALTHBOX_WOBBLE_START = 82;

export const TURN12_OFF_AERIALACE_HP_DRAIN_START_DELAY = 117;

export const TURN12_OFF_NOTVERYEFFECTIVE_TEXT_DELAY = 133;

export const TURN12_ROCKSLIDE_PRESS_TICK = 14237;

export const TURN12_OFF_ROCKSLIDE_PRESS_TICK = 14218;

export const TURN12_ROCKSLIDE_MISS_TEXT_DELAY = 449;

export const TURN12_ROCKSLIDE_TEXT_CLEAR_DELAY = 544;

export const TURN13_SANDATTACK_TEXT_DELAY = 13;

export const TURN13_ACCFELL_TEXT_DELAY = 189;

export const TURN13_SANDATTACK_SLIDE_START_OFFSET = 56;

export const TURN13_SANDATTACK_SLIDE_X2: readonly number[] = [3, 6, 9, 9, 9, 4, 0];

export const TURN13_SANDATTACK_DIRT_ORIGIN = { x: 161, y: 66 };

export const TURN13_SANDATTACK_DIRT_WAVE_ANCHOR_OFFSET = 61;

export const TURN13_SANDATTACK_DIRT_SPAWN_STRIDE = 4;

export const TURN13_SANDATTACK_DIRT_LIFETIME = 21;

export const TURN13_SANDATTACK_DIRT_TABLE: readonly { slot: number; xStep: number; yStep: number }[] = [
  // wave 1 (RAM 15480)
  { slot: 4, xStep: 985, yStep: 242 },
  { slot: 7, xStep: 1267, yStep: 230 },
  { slot: 8, xStep: 1217, yStep: 256 },
  { slot: 9, xStep: 1063, yStep: 408 },
  { slot: 10, xStep: 1191, yStep: 216 },
  // wave 2 (RAM 15484)
  { slot: 3, xStep: 1089, yStep: 344 },
  { slot: 11, xStep: 1217, yStep: 242 },
  { slot: 12, xStep: 999, yStep: 280 },
  { slot: 13, xStep: 1319, yStep: 216 },
  { slot: 14, xStep: 1305, yStep: 102 },
  // wave 3 (RAM 15488)
  { slot: 15, xStep: 947, yStep: 192 },
  { slot: 16, xStep: 1331, yStep: 128 },
  { slot: 17, xStep: 1177, yStep: 306 },
  { slot: 18, xStep: 947, yStep: 204 },
  { slot: 19, xStep: 935, yStep: 434 },
  // wave 4 (RAM 15492)
  { slot: 20, xStep: 1305, yStep: 344 },
  { slot: 21, xStep: 1037, yStep: 358 },
  { slot: 22, xStep: 1063, yStep: 166 },
  { slot: 23, xStep: 1229, yStep: 486 },
  { slot: 24, xStep: 1089, yStep: 448 },
  // wave 5 (RAM 15496)
  { slot: 25, xStep: 1063, yStep: 128 },
  { slot: 26, xStep: 1025, yStep: 242 },
  { slot: 27, xStep: 1267, yStep: 320 },
  { slot: 28, xStep: 1075, yStep: 344 },
  { slot: 29, xStep: 1241, yStep: 486 },
  // wave 6 (RAM 15500)
  { slot: 30, xStep: 1127, yStep: 216 },
  { slot: 31, xStep: 1255, yStep: 408 },
  { slot: 32, xStep: 1011, yStep: 294 },
  { slot: 33, xStep: 999, yStep: 472 },
  { slot: 34, xStep: 1011, yStep: 408 },
];

export const TURN13_FAINT_SINK_START_TICK = 15960;

export const TURN1_OFF_STATS_BANNER_START_DELAY = 80;

export const TURN1_OFF_STATS_BANNER_END_DELAY = 146;

export const TURN1_OFF_STATS_BANNER_BG1_Y_ANCHOR_DELAY = 83;

export const TURN1_OFF_STAT_ROSE_TEXT_DELAY = 156;

export const TURN1_OFF_ROCKSLIDE_TEXT_DELAY = 265;

export const TURN1_OFF_ROCKSLIDE_HP_DRAIN_START_DELAY = 362;

export const TURN1_OFF_ROCKSLIDE_TEXT_CLEAR_DELAY = 422;

/**
 * FLY-up ball sprite per-tick affine table (RAM-truthed,
 * `tools/probe/dump-fly-anim.py` re-run this session, docs/turn14-notes.md's
 * worktree-lane addendum). Index 0 = RAM tick 17780 (ball spawn/Murkrow's
 * own mon sprite invisible-flip, same tick, one function's own two-line
 * body per source); index 23 = RAM tick 17803 (last tick alive - destroyed
 * by RAM 17804). `x2` is always 0 (no horizontal motion) - only `a`
 * (x-scale)/`d` (y-scale)/`y2` (vertical offset) vary. Render tick `t` shows
 * RAM tick `t-1` (this session's own dense bisection: pixel first diverges
 * at render 17781, one tick after the RAM-pinned spawn at 17780 - the same
 * "render T shows RAM T-1" lag class `GROVYLE_STRETCH_TABLE`'s own doc
 * already established for a different affine mechanism).
 */
export const TURN14_FLY_BALL_RAM_START = 17780;

export const TURN14_FLY_BALL_TABLE: readonly { a: number; d: number; y2: number }[] = [
  { a: 1170, d: 256, y2: 0 }, // RAM 17780
  { a: 682, d: 256, y2: 0 }, // RAM 17781
  { a: 481, d: 256, y2: 0 }, // RAM 17782
  { a: 372, d: 256, y2: 0 }, // RAM 17783
  { a: 303, d: 256, y2: 0 }, // RAM 17784
  { a: 256, d: 256, y2: 0 }, // RAM 17785
  { a: 256, d: 292, y2: 0 }, // RAM 17786
  { a: 256, d: 341, y2: 0 }, // RAM 17787
  { a: 256, d: 409, y2: 0 }, // RAM 17788
  { a: 256, d: 512, y2: 0 }, // RAM 17789
  { a: 256, d: 682, y2: 0 }, // RAM 17790
  { a: 273, d: 512, y2: 0 }, // RAM 17791
  { a: 292, d: 409, y2: 0 }, // RAM 17792
  { a: 315, d: 341, y2: -1 }, // RAM 17793
  { a: 341, d: 292, y2: -3 }, // RAM 17794
  { a: 372, d: 256, y2: -6 }, // RAM 17795
  { a: 409, d: 227, y2: -11 }, // RAM 17796
  { a: 455, d: 204, y2: -17 }, // RAM 17797
  { a: 512, d: 186, y2: -24 }, // RAM 17798
  { a: 585, d: 170, y2: -33 }, // RAM 17799
  { a: 682, d: 157, y2: -43 }, // RAM 17800
  { a: 682, d: 157, y2: -54 }, // RAM 17801
  { a: 682, d: 157, y2: -67 }, // RAM 17802
  { a: 682, d: 157, y2: -81 }, // RAM 17803
];

export const TURN14_FLYUP_TEXT_START_TICK = 17823;

export const TURN14_DRAGONBREATH_TEXT_START_TICK = 17928;

export const TURN14_MISSED_TEXT_START_TICK = 17986;

export const TURN14_MENU_TEXT_CLEAR_TICK = 18080;

export const TURN15_FLY_STRIKE_TEXT_START_TICK = 19007;

export const TURN15_STRIKE_RENDER_LAG = 1;

export const TURN15_FLY_BALL_RAM_START = 19045;

export const TURN15_FLY_BALL_TABLE: readonly { x: number; y: number }[] = [
  { x: 262, y: -26 }, // RAM 19045
  { x: 252, y: -20 }, // RAM 19046
  { x: 242, y: -14 }, // RAM 19047
  { x: 232, y: -8 }, // RAM 19048
  { x: 222, y: -2 }, // RAM 19049
  { x: 212, y: 4 }, // RAM 19050
  { x: 202, y: 10 }, // RAM 19051
  { x: 192, y: 16 }, // RAM 19052
  { x: 182, y: 22 }, // RAM 19053
  { x: 172, y: 28 }, // RAM 19054
  { x: 162, y: 34 }, // RAM 19055
  { x: 152, y: 40 }, // RAM 19056
  { x: 142, y: 46 }, // RAM 19057
  { x: 132, y: 52 }, // RAM 19058
  { x: 122, y: 58 }, // RAM 19059
  { x: 112, y: 64 }, // RAM 19060
  { x: 102, y: 70 }, // RAM 19061
  { x: 92, y: 76 }, // RAM 19062
  { x: 82, y: 82 }, // RAM 19063
  { x: 72, y: 88 }, // RAM 19064
  { x: 62, y: 94 }, // RAM 19065
  { x: 52, y: 100 }, // RAM 19066
  { x: 42, y: 106 }, // RAM 19067
  { x: 32, y: 112 }, // RAM 19068
  { x: 22, y: 118 }, // RAM 19069
  { x: 12, y: 124 }, // RAM 19070
  { x: 2, y: 130 }, // RAM 19071
  { x: -8, y: 136 }, // RAM 19072
  { x: -18, y: 142 }, // RAM 19073
  { x: -28, y: 148 }, // RAM 19074
];

export const TURN15_FLY_BALL_MATRIX = { pa: 142, pb: 212, pc: -212, pd: 142 };

export const TURN15_STRIKE_TARGET_INVISIBLE_PULSE_START_TICK = 19107;

export const TURN15_STRIKE_TARGET_INVISIBLE_PULSE_END_TICK = 19134;

export const TURN15_STRIKE_TARGET_INVISIBLE_PULSE_PERIOD = 4;

export const TURN15_STRIKE_ATTACKER_REVEAL_TICK = 19075;

export const TURN15_ONIX_SHAKE_X2 = 6;

export const TURN15_HEALTHBOX_WOBBLE_RAM_START = 19106;

export const TURN15_HEALTHBOX_WOBBLE_TICKS = 20;

export const TURN15_HITSPLAT_CENTER = { x: 72, y: 88 };

export const TURN15_HITSPLAT_RAM_START = 19067;

export const TURN15_HITSPLAT_RAM_END = 19075;

export const TURN15_HP_DRAIN_START_TICK = 19141;

export const TURN15_NOTVERYEFFECTIVE_TEXT_START_TICK = 19151;

export const TURN15_ONIX_SINK_START_TICK = 19308;

export const TURN15_ONIX_SINK_RATE = 5;

export const TURN15_ONIX_HEALTHBOX_VANISH_TICK = 19326;

export const TURN16_FIGHT_SUBMENU_REVEAL_DELAY = 5;

export const TURN16_FAINT_ATTACK_TEXT_DELAY = 11;

export const TURN16_FAINT_ATTACK_LINE1 = "Foe MURKROW used";

export const TURN16_FAINT_ATTACK_LINE2 = "FAINT ATTACK!";

export const TURN16_FIRE_PUNCH_LINE1 = "MAGBY used";

export const TURN16_FIRE_PUNCH_LINE2 = "FIRE PUNCH!";

export const TURN17_OUTCOME_LINE2 = "BUG CATCHER DESTIN!";

export const TURN17_LOSS_LINE1 = "PLEASE I NEED";

export const TURN17_LOSS_LINE2 = "SOME WATER";

export const TURN17_LOSS_INPUT_READY_DELAY = 79;

import { stageBattle2Turn1Kernel } from "./battle2CommandAdapter.ts";
import { BALL_CLOSED_TILESET, KABUTO_SENDOUT_BATTLER, LINE2_ORIGIN, MATERIALIZE_TINT_COLOR, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS, onixSitrusIdentityRenderTick, OPPONENT_CORNER, PARTY_ENTRY_FADE_IN, PARTY_ENTRY_FADE_OUT, PARTY_SENDOUT_FADE_OUT, PLAYER_CORNER, TURN10_REGIME5_TO_REGIME1_SHIFT, TURN11_REGIME6_TO_REGIME1_SHIFT, TURN12_REGIME7_TO_REGIME1_SHIFT, turn13DragonbreathFaintLines, turn13DragonbreathFaintTextTotal, turn13DragonbreathHp, turn13DragonbreathKickoffLines, TURN13_DRAGONBREATH_PRESS_TICK, turn13FaintedCursorStartDelay, turn13FaintedCursorX, turn13FaintSinkSteps, turn13HealthboxVanishTick, TURN13_HIT_FLASH_PRESS_TICK, TURN13_MURKROW_MATERIALIZE_AFTER_DISMISS, TURN13_REGIME8_TO_REGIME1_SHIFT, TURN13_SWITCHIN_MENU_REDRAW_AFTER_DISMISS, TURN13_SWITCHIN_RESET_AFTER_DISMISS_SHIFT, turn13SwitchinSentoutLine2, TURN14_MENU_REDRAW_RESET_SHIFT, TURN14_MENU_REDRAW_TICK, turn15FaintedCursorStartTick, turn15FaintedCursorX, turn15FaintedLine1, turn15FaintedLine2, TURN15_FAINTED_TEXT_START_TICK, turn15FaintedTextTotal, actionMenuAge, getAnchorOpponentAfterTurn2Hp, getAnchorOpponentAfterTurnHp, getAnchorPlayerAfterTurnHp, getAnchorPlayerBattler, battleBg, battleWindow, brendan, brendanSettledTileset, brendanThrowTilesets, charmap, cursorState, drawBallIcons, drawBallOpenParticles, drawBattle2ActionMenuWindow, drawComposedPlayerHealthbox, drawCursor, drawFightSubmenuChromeFromLatest, drawFightSubmenuChromeFromLiveState, drawGrantingStarsAtAge, drawGrovyleSettled, drawKabutoHSlideWobble, drawOpponentHealthboxWobble, drawOpponentSummaryExit, drawPlayerBallOpen, drawPlayerBallOpenParticles, drawPlayerMaterializeSettle, drawRockSprite, drawSendOutBall, drawSpriteSheetAffineTintedBlend, drawStaticBgShiftedY, drawTileBg, drawTileBgFaded, drawTurn13MurkrowSettled, drawTurn13SandAttackAccBanner, drawTurn15ForcedSwitchBall, drawTurn15ForcedSwitchRelease, drawTurn15MagbyHealthbox, drawTurn15PartyListObjMask, drawTurn15PartySelectList, drawTurn16FightSubmenuWindow, drawTurn5SitrusSettledMenuChrome, fadeTurn15PartyFramebuffer, font, getMenuHealthboxPlayerContentMask, healthboxBackgroundColorAt, introTrainer, kabutoHealthboxContent, kabutoHealthboxContentForHp, menuHealthboxPlayer, menuIdleBlank, murkrowFrontSprite, getMurkrowHealthboxContent, onixPlayerHealthboxContent, getOpponentHealthboxContent, pidgeottoFrontSprite, pidgeottoHealthboxContentForHp, playerSendOutClock, playerTrainerSendOutClock, sendOutBgFadeY, setPixel, summaryBall, trainerExitX, turn13SandAttackAccEva, turn15ReleaseFieldPalette } from "./battleScene.ts";

// --- slice 4 batch 9 reconnection imports ---
import { playerHealthboxHpOverlayAssets } from "./battleScene.ts";

// --- slice 4 batch 8 reconnection imports ---
import { TURN7_ROCKSLIDE_TEXT_CLEAR_DELAY, turn7SuperEffectiveTextStartTick, turn7SuperEffectiveTextVisibleChars, turn7RockSlideResettledBounceTick, TURN6_ROCKSLIDE_TEXT_CLEAR_DELAY, turn6SuperEffectiveTextStartTick, turn6SuperEffectiveTextVisibleChars, turn6RockSlideResettledBounceTick, rockSlideResettledBounceTick, turn6StatFallEva, turn6AtkFellTextStartTick, turn6AtkFellTextVisibleChars, PLAYER_BALL_OPEN_VISIBLE_BOTTOM, endeavorHp, turn2KickoffTextVisibleChars, TURN_KICKOFF_LINE1, TURN_KICKOFF_LINE2, TURN2_KICKOFF_LINE2 } from "./battleMenu.ts";
import { TURN14_BARE_SCENE_DELAY, getAnchorOpponentBattler, switchinSentoutLine2, turn5FaintedCursorX, getPidgeottoHealthboxContent, drawTurn8FeatherDanceKickoffText, drawTurn7FeatherDanceKickoffText, drawTurn6FeatherSprites, turn6FeatherdanceStatPalette, TURN5_BG_FADE_Y, TURN13_MURKROW_BG_FADE_START_AFTER_DISMISS, TURN13_MURKROW_RAMP_RENDER_AFTER_DISMISS, TURN5_MATERIALIZE_FLAT_COEFF, TURN5_MATERIALIZE_RAMP_COEFF, drawTurn5PidgeottoSettled, turn10BgDarkPalette, drawSpriteSheetTopRows, ONIX_SITRUS_TINT_COLOR, drawSpriteSheetTopClipped, turn10OnixDarkPalette, battleAnimItemHeal, eraseSpriteFootprint, getAnchorPlayerAfterTurn3Hp, turn5SitrusOnixHp, TURN9_REGIME4_TO_REGIME1_SHIFT, TURN5_SWITCHIN_PARTICLE_STALL_LOGICAL_TICK, turn5PidgeottoSettleTick, turn5MaterializeCoeff, onixSitrusRotateMatrix, onixSitrusTintCoeff, turn5SitrusRingMatrix, endeavorOnixInvisible, endeavorHealthboxBounceY2 } from "./battleScene.ts";
import turn15FieldPpuAsset from "../assets/gen/turn15-field-ppu-20302.json" with { type: "json" };
import { noteCanonicalSample } from "./drawRecord.ts";
import { drawBattleCommandActionChrome, renderBattleCommandPresentation } from "./battleCommandPresentationRender.ts";
import { FIGHT_CONFIRM_TEXT_DELAY, FIGHT_SUBMENU_REOPEN_BOUNCE_SHIFT, FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT, GO_TEXT, GO_TEXT_START_TICK, PLAYER_THROW_BALL_START_TICK, ROCK_SLIDE_LINE2, STAT_ROSE_LINE1, STAT_ROSE_LINE2, brendanThrowDx, brendanThrowFrame, goTextVisibleChars, menuIdleBounce, playerHealthboxSlideDx, playerMaterializeBgFadeY, playerThrowBallSpin, playerThrowBallTopLeft, rockSlideBg3Y, rockSlideDrawOrder, rockSlideHealthboxWobbleY2, rockSlideMonBlinkInvisible, rockSlideMonShakeY2, rockSlideOpponentHp, rockSlideRockState, rockSlideTextStartTick, rockSlideTextVisibleChars, statRoseTextStartTick, statRoseTextVisibleChars, turn2KickoffBounceTick, turn2KickoffTextStartTick, turn2SubmenuBounceTickFromPresentationEpochAge, turnKickoffBounceTick, turnKickoffTextStartTick, turnKickoffTextVisibleChars } from "./battleMenu.ts";
import type { BattleSceneResolutionOwner } from "./battleSceneResolutionOwner.ts";
import { fightCommandSettledBounceEpochTick, fightCommandSubmenuBounceEpochTick, retainedFightCommandResolutionOwner } from "./fightCommandPresentation.ts";
import { drawText } from "./font.ts";
import { drawMode0Ppu } from "./gbaPpu.ts";
import { isLatestCompletedCommandHandoffReady, isLatestCompletedCommandLifecycleActive, latestCompletedCommandPresentationEpoch } from "./nextCommandHandoff.ts";
import { opponentFaintContinuationElapsed } from "./opponentFaintPresentationOwner.ts";
import type { OpponentFaintPresentationOwner } from "./opponentFaintPresentationOwner.ts";
import { bgFadeY, objFadeY } from "./paletteFade.ts";
import { PARTY_ENTRY_FADE_IN_START, PARTY_ENTRY_FADE_OUT_START, PARTY_SENDOUT_FADE_OUT_START, PARTY_SENDOUT_GO_TEXT, partySelectEntryPhase, partySendOutBattleFadeBldy, partySendOutGoTextVisibleChars, partySendOutHealthboxDx, partySendOutMenuBounceTick, partySendOutPhase, partySendOutReleaseLogicalTick } from "./partySelect.ts";
import { TURN1_CHOOSE_ACTION_RESET_AFTER_CONFIRM } from "./turn1ChooseActionReset.ts";
import { isTurn2LatestCompletedCommandLifecycleActive, turn2FightCommandPresentationFromLatest } from "./turn2ResolutionAdapter.ts";
import { isTurn3LatestCompletedCommandLifecycleActive, turn3FightCommandPresentationFromLatest } from "./turn3ResolutionAdapter.ts";
import { isTurn4LatestCompletedCommandLifecycleActive, turn4FightCommandPresentationFromLatest } from "./turn4ResolutionAdapter.ts";
import { CLOSED_FIGHT_SUBMENU_STATE, FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY, FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT, HIT_FLASH_RAM_ANCHOR_DELAY, MENU_IDLE_BLANK_END_TICK, ROCK_SLIDE_ANIMATION_PROFILE, ROCK_SLIDE_LINE1, TURN6_ROCKSLIDE_MENU_REDRAW_DELAY, TURN6_ROCKSLIDE_PRESS_TICK, TURN7_ROCKSLIDE_MENU_REDRAW_DELAY, TURN7_ROCKSLIDE_PRESS_TICK } from "./battleMenu.ts";
import { fightCommandKickoffBounceEpochTick, type FightCommandPresentation } from "./fightCommandPresentation.ts";
import { composePlayerHealthboxHpOverlay } from "./healthboxAssembly.ts";
import { latestCompletedCommandPresentationEpochElapsedSinceReset, type LatestCompletedCommandHandoff } from "./nextCommandHandoff.ts";
import { TURN10_AERIALACE_HP } from "./turn10ResolutionAdapter.ts";
import { TURN12_AERIALACE_HP } from "./turn12ResolutionAdapter.ts";
import { canonicalOpponentFlyResolution } from "./turn15FlyResolutionAdapter.ts";
import { resolveTurn1RockSlideHpEndpoints } from "./turn1RockSlidePresentationStaging.ts";
import { resolveTurn2EndeavorHpEndpoints } from "./turn2EndeavorPresentationStaging.ts";
import { resolveTurn3RockSlideHpEndpoints } from "./turn3RockSlidePresentationStaging.ts";
import { resolveTurn4RockSlideHpEndpoints } from "./turn4RockSlidePresentationStaging.ts";
import { resolveTurn5EndeavorHpEndpoints } from "./turn5EndeavorPresentationStaging.ts";
import { resolveTurn5FaintWindowKoHp, resolveTurn5FaintWindowLines } from "./turn5FaintPresentationStaging.ts";
import { BRENDAN_THROW_START_TICK } from "./battleMenu.ts";
import { resolveTurn5FaintSinkGeometry, resolveTurn5SitrusAdapter } from "./turn5ResolutionAdapter.ts";
import { resolveTurn6RockSlideHpEndpoints, resolveTurn7RockSlideHpEndpoints } from "./turn67RockSlidePresentationStaging.ts";
import { TURN9_QUICKATTACK_HP } from "./turn9ResolutionAdapter.ts";
import { resolveTurn1RockSlideAttackLines, resolveTurn1DoubleTeamKickoffLines } from "./turn1RockSlidePresentationStaging.ts";
import { resolveTurn2EndeavorAttackLines } from "./turn2EndeavorPresentationStaging.ts";
import { resolveTurn4DoubleTeamKickoffLines } from "./turn4DoubleTeamPresentationStaging.ts";
import { resolveTurn5EndeavorAttackLines } from "./turn5EndeavorPresentationStaging.ts";
import { resolveTurn8BindKickoffLines, resolveTurn8MissLines } from "./turn8BindPresentationStaging.ts";
import { resolveTurn13AccFellLines, resolveTurn13SandAttackKickoffLines } from "./turn13SandAttackPresentationStaging.ts";
import { resolveTurn6AtkFellLines, resolveTurn6FeatherDanceKickoffLines } from "./turn6FeatherDancePresentationStaging.ts";
import { resolveTurn6RockSlideAttackLines, resolveTurn7RockSlideAttackLines } from "./turn67RockSlidePresentationStaging.ts";
import { resolveTurn7AtkFellLines, resolveTurn7FeatherDanceKickoffLines, resolveTurn8AtkFellLines, resolveTurn8FeatherDanceKickoffLines } from "./turn78FeatherDancePresentationStaging.ts";
import { resolveTurn11AtkFloorLines } from "./turn11FeatherDancePresentationStaging.ts";
import { type BattleSceneState } from "./battleScene.ts";
import { ACTION_MENU_BLANK_END_OFFSET, BALL_OPEN_START_OFFSET, HEALTHBOX_SLIDE_START_DX, KABUTO_CORNER, MATERIALIZE_END_OFFSET, MATERIALIZE_START_OFFSET, MATERIALIZE_Y2_TABLE, ONIX_MATERIALIZE_CORNER, OPP_BAR_X2, PARTICLE_ORIGIN, pidgeottoMaxHp, PLAYER_MATERIALIZE_ACCUMULATOR_LEAD, PLAYER_MATERIALIZE_END_TICK, PLAYER_MATERIALIZE_START_TICK, TICK0, TURN10_ROCKSLIDE_MENU_REDRAW_DELAY, TURN11_ROCKSLIDE_MENU_REDRAW_DELAY, TURN12_ROCKSLIDE_MENU_REDRAW_DELAY, TURN13_FAINTED_TEXT_DELAY, TURN5_BALL_HANDOFF_TICK, turn5Switchin, TURN8_MENU_REDRAW_DELAY, TURN9_MENU_REDRAW_DELAY, actionMenuBounceTick, affineEmergeAccumulator, ballDisplay, ballStateTileIndex, battleAnimFlyBall, battleAnimHitsplat, battleAnimMudSand, battleAnimTables, battleIntroEncounterParams, battleSendOutEncounterParams, blendedSetPixel, drawBallStatusBar, drawCleanSwitchinParticles, drawFrontBackMaterialize, drawMessageTextLines, drawPlayerSideAffineMaterialize, drawRect, drawSendOutHealthbox, drawSpriteSheet, drawSpriteSheetAffineRotate, drawSpriteSheetAffineStretch, drawSpriteSheetBlendedOverFb, drawStatDecreaseBannerForBattlerPalette, drawStatIncreaseBannerForBattler, generatedBattleIntroSourceClock, generatedBattleStartPressTick, grovyleFrontSprite, healthboxSlideDx, kabutoFrontSprite, menuIdleBase, onixBackSprite, opponentHealthboxContentForHp, presentationForEncounter, sendOutTextStartTick, statAnimBanner, tableX2 } from "./battleScene.ts";
import type { RgbColor } from "./bg.ts";
import type { FactoryTrainerPresentation } from "./factoryTrainerPresentation.ts";
import type { FactoryBattleStartIntroState } from "./factoryBattleStartIntro.ts";
import { KABUTO_FRONT_ANIM_START_OFFSET } from "./kabutoSendOut.ts";
import { FIGHT_SUBMENU_OPEN_DELAY, FIGHT_SUBMENU_CLOSE_DELAY, type FightSubmenuState, statsBannerEva, statsBannerBg1Y, turn6StatFallBg1Y } from "./battleMenu.ts";
import type { BattleCommandPresentationPhase, BattleCommandPresentationState } from "./battleCommandPresentation.ts";
import { createBattle2CommandAdapterCommand } from "./battle2CommandAdapter.ts";

// --- slice 3: remaining canonical-only leaves (import-referencing consts + external-only function leaves) ---



/**
 * Battle 2 turn 1's ROCK SLIDE mechanism/RNG timing (formerly
 * battle2Turn1.ts, retired at the #39 rank-1 flip). Anchored to the real
 * A-confirm edge, never to an absolute trace tick. Canonical frame citations
 * are the accepted confirm=33071 replay in docs/battle2-opening-notes.md.
 * Battle 1's ROCK SLIDE mechanisms begin 380 frames later because GROVYLE
 * uses DOUBLE TEAM first; supplying this rebased press to the existing pure
 * rock/shake/hit/drain helpers preserves their proven internal clocks while
 * placing the direct, ONIX-first animation on Battle 2's timeline.
 */


export function battle2RockSlideMechanismPressTick(confirmTick: number): number {
  return confirmTick - BATTLE2_ROCK_SLIDE_REUSE_SHIFT;
}


/** Region A (onix) / region B (healthbox)'s two "raised" bounce states (`y2=1`/`y2=2`, docs/battle-menu-idle-notes.md §1) - same bbox, two pixel contents each (ISSUES #22, docs/battle-menu-notes.md §8c: region A needs the same y1/y2 split region B already had - its own rare y2=2 sine-peak state paints different pixels than y2=1, not a safe degrade). */
export interface MenuIdleBounceTwoStateAsset {
  x: number;
  y: number;
  width: number;
  height: number;
  y1: number[];
  y2: number[];
}



/**
 * S7 slice H (docs/battle-turn-notes.md §13/§21): Grovyle's kernel-derived
 * post-turn-3 ROCK_SLIDE hp (41), from that staged hit's `hp-change`.
 */


/**
 * S7 slice I (docs/battle-turn-notes.md §13/§22): Grovyle's own post-turn-4-
 * ROCK_SLIDE hp (a 1-HP survival, not a faint - §13's own ledger already
 * flags this as "entirely a matter of which spread-roll value landed").
 * This session's own fresh `tools/probe/ram-probe.py` run (not sourced from
 * a committed RAM-dump JSON, unlike the turn-2/3 anchors above - no fixture
 * happened to snapshot exactly this boundary tick) confirms `gBattleMons[1]
 * .hp` updates 41->**1** at tick 5564, independently cross-checked against
 * a dense oracle pixel sweep of the same window (0-diff against this
 * literal in `npm run compare`).
 */


/**
 * Presentation-seam retirement, the turn-4 settle staging gap
 * (`docs/presentation-seam-scout.md` §9.3/§9.4 step 5's own named residual,
 * entries 465/468/487): the former bare post-turn-4 HP literal now has an
 * independent staged proof (`turn4RockSlidePresentationStaging.ts`),
 * byte-identical (41 -> 1). Both the drain and turn-5 steady-state consumers
 * read this typed endpoint.
 */
export const turn4RockslideHp = lazyValue(resolveTurn4RockSlideHpEndpoints);



/**
 * Presentation-seam retirement (`docs/presentation-seam-scout.md` §10.2/
 * §10.3 step 1): turn 3's own ROCK_SLIDE HP endpoints (88 -> 41), now with an
 * independent staged proof (`turn3RockSlidePresentationStaging.ts`),
 * byte-identical to the completed-turn-2/turn-3 HP handoffs.
 * `drawTurn3RockSlideAttack`/`drawTurn3RockSlideTurnEndSettledMenu` read this
 * staging pair while their settled boundary consumes the turn-3 receipt.
 */
export const turn3RockslideHp = lazyValue(resolveTurn3RockSlideHpEndpoints);



/** Same memoization shape as `opponentHealthboxContentByHp` - only the 17 distinct integer HPs `endeavorHp` ever produces (117 down to 101) are ever requested. */
export const playerHealthboxHpOverlayByHp = new Map<number, ReturnType<typeof composePlayerHealthboxHpOverlay>>();



export const INITIAL_BATTLE_SCENE_STATE: BattleSceneState = {
  elapsed: 0,
  sendOutPressElapsed: null,
  turn5FaintDismissElapsed: null,
  fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE,
  latestCompletedCommandHandoff: null,
  opponentFaintPresentationOwner: null,
  resolutionOwner: null,
  battleOutcome: 0,
  terminalResolution: null,
};


export function frontSpriteAnimFrame(steps: readonly { frame: 0 | 1; duration: number }[], localOffset: number): 0 | 1 {
  let consumed = 0;
  for (const step of steps) {
    if (localOffset < consumed + step.duration) return step.frame;
    consumed += step.duration;
  }
  return steps[steps.length - 1]!.frame;
}



/**
 * §7.22/§7.23: mechanism 5's matrix write starts 7 RAM ticks before render
 * 1504 (`GROVYLE_STRETCH_TABLE[0]`'s own tick) - RAM ticks 1496-1502 (et
 * 35-41 via the established +1 render lag), read from the same already-
 * committed `sendout-grovyle-stretch.json` probe run (just further into its
 * existing output, no new spec needed). `GROVYLE_STRETCH_EARLY_TABLE[i]` is
 * RAM tick `1496+i`'s post-tick `(d4, d5, y2)`, literal, same "RAM ground
 * truth over curve-fit" precedent as `GROVYLE_STRETCH_TABLE`, EXCEPT entry 0
 * (RAM 1496, the exact tick the sprite callback switches, §7.17): the raw
 * field read is `(0,0,0)`, but feeding that literally into
 * `drawSpriteSheetAffineStretch` (`mx=my=0`) degenerates to sampling a
 * single source texel for the ENTIRE destination box - a real-hardware
 * affine-matrix artifact, but one that's provably not what's actually
 * latched for this render: render 1497's own oracle pixels (checked
 * directly, `tools/compare/scratch/band_diag.mjs`) are a near-exact match
 * (3px, the already-known ball-occlusion residual, §7.21) to mechanism 4's
 * OWN saturated-neutral tail silhouette, not a solid tint block - i.e. the
 * `data[4]/data[5]` C-level fields have been reset for the callback switch
 * this tick, but the OAM matrix register itself (`gOamMatrices[2]`) hasn't
 * been recomputed from them YET (an extra one-tick lag on top of the
 * already-established RAM-to-render lag, specific to a callback's first
 * tick) - so render 1497 still shows whatever was latched last: the neutral
 * matrix. Substituting neutral (256,256,0) for this one entry (rather than
 * the literal (0,0,0) capture) reproduces that exactly, verified pixel-exact
 * against the oracle below. RAM 1503's value `(263,239,-2)` is bit-exact
 * `GROVYLE_STRETCH_TABLE[0]`, confirming the two probe reads agree at the
 * seam and this table needs no 8th entry.
 */

/** handoffTick+42 through +56 (15 ticks): tCoeff 15 down to 1 (RAM-probed, see the module doc above); et>56 is the true normal palette. */
export function grovyleStretchTintCoeff(localOffset: number): number {
  return Math.max(0, 15 - localOffset);
}



/**
 * Real kernel-staged Battle 2 turn 1 (ISSUES #39 rank 1 flip,
 * battle2CommandAdapter.ts): computed once and reused by both the command
 * and resolution phases below, matching the kernel's own idempotent replay.
 */
export const battle2Turn1Kernel = lazyValue(stageBattle2Turn1Kernel);



/**
 * Generic sibling of the retired `currentPresentationEpochAge` (typeref-
 * retirement slice 7b). Every cross-command bounce clock consumes the
 * source reset's semantic age directly off `latest` - production never had
 * a real positional-only fallback (§2.3: the legacy positional argument was
 * always itself reconstructed from `latest` one call frame up), so the
 * throw below is the same "no semantic epoch content" guard the legacy
 * function's own unreachable-fallback branch guarded.
 */
export function currentEpochPresentationAgeFromLatest(
  latest: LatestCompletedCommandHandoff | null,
  currentElapsed: number,
): number {
  const age = latestCompletedCommandPresentationEpochElapsedSinceReset(latest, currentElapsed);
  if (age === null) {
    throw new Error("current command bounce requires semantic presentation epoch content");
  }
  return age;
}



/**
 * S7 slice E2a (docs/dragon-breath-notes.md): DRAGON_BREATH's own kickoff
 * message, "ONIX used\nDRAGONBREATH!" - line 1 reuses `ROCK_SLIDE_LINE1`
 * verbatim (same attacker, Onix, same `STRINGID_USEDMOVE` template turn 1's
 * ROCK_SLIDE kickoff already established), line 2 is `moves.json`'s own
 * `MOVE_DRAGON_BREATH` display name ("DRAGONBREATH", no space) + "!". Unlike
 * `turnKickoffTextStartTick`/`turn2KickoffTextStartTick` (both a fixed delay
 * off the A-confirm press), this kickoff has no press to anchor from - it's
 * gated on Grovyle's ENDEAVOR fully resolving first (bookkeeping through
 * render 3136, `gBattleControllerExecFlags` bit0), so the start tick is kept
 * as a literal pixel-fit delay off the same `pressTick` turn 2's other
 * timings use (`docs/dragon-breath-notes.md`'s phase table: RAM 3136 sets
 * the busy flag, render = RAM+1 = 3137 = pressTick(2945)+192).
 */

export const DRAGONBREATH_KICKOFF_TEXT_TOTAL = ROCK_SLIDE_LINE1.length + DRAGONBREATH_KICKOFF_LINE2.length;




export function dragonBreathTextStartTick(pressTick: number, startDelay: number = DRAGONBREATH_TEXT_START_DELAY): number {
  return pressTick + startDelay;
}



export function dragonBreathHp(t: number, pressTick: number, startHp: number, endHp: number, startDelay: number = DRAGONBREATH_HP_DRAIN_START_DELAY): number {
  const d = t - (pressTick + startDelay);
  return Math.max(endHp, startHp - Math.max(d, 0));
}


export const DRAGONBREATH_HIT_FLASH_OFFSET = DRAGONBREATH_HIT_FLASH_ANCHOR_DELAY - HIT_FLASH_RAM_ANCHOR_DELAY;



/**
 * Turn 3's reopened submenu consumes the immutable turn-2 choose-action
 * reset epoch. Its age continues from the settled menu's local origin and
 * applies the regular FIGHT DMA-open correction plus the independently
 * RAM-pinned Family-B one-tick retardation.
 *
 * Family B fix (`docs/turn3-residual-probe-notes.md` "Family B, continued"):
 * a pointer-chase to the real invisible bouncer sprites' own raw `sSinIndex`
 * (`gBattleSpritesDataPtr`->`healthBoxesData[0]`->bouncer sprite id->
 * `gSprites[].data[]`) proved THIS composition's resultant phase is
 * uniformly exactly one RAM tick more advanced than the real hardware,
 * zero exceptions over 41 probed ticks x 2 regions
 * (`tools/probe/verify-turn3-menu-bounce-rule.py`) - not a "hardware quirk"
 * as previously catalogued. The extra `-1` below retards this composition's
 * phase by that one tick. Scoped to THIS composition only, NOT the shared
 * `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` constant: turn 2's own reopen windows
 * (ticks 2135/3465/3721, all green) are proven correctly calibrated with
 * `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` unshifted, and a uniform shift there
 * would break them.
 *
 * Exported for a direct Tier-1 pin against the committed RAM pointer-chase
 * dump (`tests/fixtures/data/turn3-menu-bouncer-raw-probe.json`,
 * `tools/probe/verify-turn3-menu-bounce-rule.py`'s own source).
 */
export function turn3SubmenuBounceTickFromPresentationEpochAge(
  presentationEpochAge: number,
): number {
  return MENU_IDLE_BLANK_END_TICK + 1
    + presentationEpochAge
    - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT
    - 1;
}



/**
 * S7 slice G (docs/battle-turn-notes.md §20): the onix/healthbox idle-bounce
 * overlay's frozen state for turn 3's own confirm (cursor 0, ROCK_SLIDE
 * selected, but Grovyle's ENDEAVOR resolves first) - same "`DoBounceEffect`
 * stops being polled the instant the A-press hands off" rule
 * `turnKickoffBounceTick`/`turn2KickoffBounceTick` already established for
 * turns 1/2, live for `FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY` ticks from the
 * turn-2 receipt epoch, then frozen. Oracle-pixel-
 * confirmed (this session, `turn3-menu.json`'s own trace extended past its
 * prior 3896 cutoff): the onix/healthbox sprite region is byte-identical to
 * `pressTick`(3891) through at least `pressTick`+9 - i.e. this window's own
 * plateau happens to already be flat under the LIVE formula too, so the
 * frozen value below is the receipt-age mapping evaluated at the freeze tick
 * itself (unlike turns 1/2, whose own frozen plateaus were pixel-fit to
 * a DIFFERENT value than their live formula's freeze-moment reading - not
 * assumed here, directly oracle-confirmed for this specific window instead).
 */
/** Turn 3's own A-confirm press tick (RAM/render 3891, the canonical A hold's last frame). */


/**
 * The turn-3 confirm keeps the turn-2 receipt's live epoch through the
 * controller wait, then freezes at that same epoch's confirmed plateau.
 * No move-local redraw delay owns either clock. `fightCommandKickoffBounceEpochTick`
 * is the generic form of this same pre-freeze/frozen formula (already the
 * live production path below - the retired legacy branch was an
 * unreachable fallback, see the differential proof this slice's commit
 * cites).
 */
export function turn3KickoffBounceTick(
  currentElapsed: number,
  confirmElapsed: number,
  turn2Content: FightCommandPresentation,
): number {
  return fightCommandKickoffBounceEpochTick(
    turn2Content,
    currentElapsed,
    confirmElapsed,
  );
}


export const turn2EndeavorHp = lazyValue(resolveTurn2EndeavorHpEndpoints);


/**
 * ISSUES #39 rank-6 slice 2: Onix's own `endeavorOnixInvisible` hit-flash
 * flicker (`struct Sprite.invisible`) is ALSO class (b), not just the
 * healthbox wobble - missed by the prior attempt, which skipped
 * `drawEndeavorSquish` (including this flicker) entirely and left Onix
 * always-visible against the flat `menuIdleBase` harvest. RAM-confirmed
 * (`tools/probe/dump-turn2-dragonbreath-off.py`, extended with an
 * `onixInvisible` field this session): `invisible` first true at RAM tick
 * 3027, ONE tick after the wobble's own first flip (RAM tick 3026) - the
 * exact same +1 relationship the ON fit's own anchors already show
 * (`ENDEAVOR_HEALTHBOX_BOUNCE_START`=118, `ENDEAVOR_FLICKER_START`=119), so
 * this is `TURN2_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START`+1, not the same value.
 * Cycle shape (4-on/4-off, 4 cycles, 1-tick render lag) is unchanged from
 * the ON fit, only the anchor moves.
 */
export const TURN2_OFF_ENDEAVOR_FLICKER_START = TURN2_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START + 1;


export const TURN3_OFF_ENDEAVOR_FLICKER_START = TURN3_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START + 1;


export const TURN3_OFF_ROCKSLIDE_ANIMATION_PROFILE = {
  ...ROCK_SLIDE_ANIMATION_PROFILE,
  hitFlashAnchorAge: 418, // RAM tick 4105 (healthbox wobble's own first +1 write) - pressTick(3687)
};


export const TURN4_OFF_ROCKSLIDE_ANIMATION_PROFILE = {
  ...ROCK_SLIDE_ANIMATION_PROFILE,
  hitFlashAnchorAge: 327, // RAM tick 5252 (healthbox wobble's own first +1 write) - pressTick(4925)
};


/**
 * `docs/turn5-resolve-ab-pools-diagnosis.md` §4 (2026-08-18, ISSUES #97
 * remainder): `drawTurn5RockSlideAttack` was the one sibling in this family
 * still calling the shared hit-reaction helpers with no scoped profile (the
 * generic default's `hitFlashAnchorAge=562` places its blink/wobble window
 * entirely past this trace's own capture range). All 8 measured blink
 * transitions (real oracle, `pressTick=TURN5_ROCKSLIDE_PRESS_TICK=5829`)
 * solve exactly against `age=418` (anchor RAM tick 6247). The real GROVYLE
 * sprite's own top row is pixel-flat for the entire window whenever visible
 * (no shake) - `targetShakeStartAge: 0, targetShakeEndAge: -1` disables
 * `rockSlideMonShakeY2` unconditionally (`t < start || t > end` is always
 * true for `t >= 0` against this range).
 */
export const TURN5_OFF_ROCKSLIDE_ANIMATION_PROFILE = {
  ...ROCK_SLIDE_ANIMATION_PROFILE,
  hitFlashAnchorAge: 418, // RAM/pixel tick 6247 (blink+wobble anchor) - pressTick(5829)
  targetShakeStartAge: 0,
  targetShakeEndAge: -1, // real GROVYLE never shakes during this hit - disables rockSlideMonShakeY2
};


export const turn5EndeavorHp = lazyValue(resolveTurn5EndeavorHpEndpoints);


/**
 * `docs/turn5-confirm-pools-diagnosis.md` §1/§2 (2026-08-18, ISSUES #97
 * remainder): turn 5's own `drawTurn5EndeavorText` was the last remaining
 * caller of `drawEndeavorSquish` (turn 2/turn 3 already dropped it per
 * ISSUES #39) and its own `endeavorHp` call passed no `startDelay`
 * override, silently defaulting to the shared `ENDEAVOR_HP_DRAIN_START_
 * DELAY`(153). Both values below are bit-for-bit the same turn2/turn3-
 * precedent constants (`TURN2/3_OFF_ENDEAVOR_HP_DRAIN_START_DELAY`=116,
 * `TURN2/3_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START`=81), re-derived independently
 * this session from 4 oracle-read HP digits (§2.2) and a 33-tick flicker
 * sweep (§1.3) - not shared with turn 2/3's own constants, per this
 * family's own "mint a scoped constant, don't touch the shared default"
 * convention.
 */
export const TURN5_OFF_ENDEAVOR_HP_DRAIN_START_DELAY = 116;

export const TURN5_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START = 81;

export const TURN5_OFF_ENDEAVOR_FLICKER_START = TURN5_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START + 1;


export const grovyleFaintSink = lazyValue(resolveTurn5FaintSinkGeometry);



/**
 * ISSUES #39 rank-3 flip, half 2 (species-dossier slice 7 extension): the
 * real Sitrus-heal fact source (`turn5ResolutionAdapter.ts`'s
 * `resolveTurn5SitrusAdapter`), chaining Onix's own real held-item proc
 * (`runBattleEndTurnOrchestration`'s already-ported `HOLD_EFFECT_RESTORE_HP`
 * case) instead of independently re-stating the heal's HP endpoints/message
 * text here - reused below for `TURN5_SITRUS_HEAL_LINE1`/`_LINE2` and
 * `TURN5_SITRUS_HEAL_HP_START`/`_END`, same "module-level constant derived
 * once at import time" discipline `TURN5_SWITCHIN` already established.
 * Hoisted ahead of the rotate/ring/star timing block below (species-dossier
 * slice 7, docs/species-render-entry-point-retirement-design.md §4 row 7):
 * every one of the seven family-B wrappers' shared age epoch now derives
 * from this adapter's own `procTriggerRamTick`/`onFieldCenter`, not an
 * independently hand-derived battleScene.ts literal.
 */
export const turn5Sitrus = lazyValue(resolveTurn5SitrusAdapter);



/**
 * The settled turn-6 menu's own idle bounce - the SAME `menuIdleBounce`
 * cycle every other resettled menu in this file already reuses (§ `rock
 * SlideResettledBounceTick`'s own doc), re-anchored so `TURN5_SITRUS_MENU_
 * REDRAW_TICK` (7222, the tick the interactive chrome first appears) lines
 * up with `MENU_IDLE_BLANK_END_TICK+1` (1748, every other epoch's own
 * fresh-restart point) - grid-searched this session (`tools/compare/
 * scratch/sitrus_bounce_anchor_search.mjs`) against the 17-sample healthbox
 * y2 sequence the PNG-crop match above surfaced as a side effect
 * (0/1/2-valued, period-9-ish): exactly ONE shift (-5474) reproduces every
 * sample with zero mismatches, and `7222 - 5474 === 1748` exactly - not a
 * coincidence, the same re-init story as every turn before it.
 */
export function turn5SitrusResettledBounceTick(t: number): number {
  return t - TURN5_SITRUS_MENU_REDRAW_TICK + (MENU_IDLE_BLANK_END_TICK + 1);
}



/**
 * The battlefield base for turn 5's own ROCK_SLIDE window - same shape as
 * `drawTurn3RockSlideAttack`/`drawTurn4RockSlideAttack` (shake/rocks/hit-
 * flash mechanisms reused with ZERO code changes, only the new synthetic
 * anchor), plus the two genuinely new pieces this turn needs since Grovyle
 * actually FAINTS here: the sink (`faintSinkRowsAndY2`) replaces the
 * plain sprite draw once active, and the opponent healthbox stops drawing
 * entirely past its own vanish tick.
 */
/**
 * S7 slice R rung (c3)/(c4): `onixX2`/`onixInvisible` (both default to the
 * neutral no-op value, every pre-existing caller unaffected) let turn 9's
 * own post-QUICK_ATTACK window drive Onix's own on-field sprite (region A,
 * the SAME explicit-redraw call the doc above already establishes is never
 * baked into the static harvest) through its own x2 shake (episode 1) and
 * visibility flicker (episode 2) - same "generalize a hardcoded value into
 * a defaulted param" idiom `onixHp`/`bounceTick`/`beforeMonSprite` already
 * use on this same call chain.
 */
/**
 * Presentation-seam wiring, window 3 (`docs/presentation-seam-scout.md`
 * §9.4 rung 5): Grovyle's own settle at the end of this window's
 * `rockSlideOpponentHp` drain (below) is the SAME KO
 * `turn5FaintPresentationStaging.ts` already stages for the fainted-branch
 * window (§7) -- this is a second, EARLIER consumption point of that
 * identical staged chain, not a new staged run. The `from` endpoint, formerly
 * a bare literal (named as §9.4 rung 5's own residual gap, entries
 * 465/468/487), now reads `TURN4_ROCKSLIDE_HP.to` --
 * `turn4RockSlidePresentationStaging.ts`'s own independent staged proof of
 * that exact settle (41 -> 1), not circular: that module stages Grovyle's
 * PRE-turn-4 hp (41) and independently computes the turn-4 hit's own
 * settle, it does not consume this window's value.
 */
export const turn5RockslideOpponentToHp = lazyValue(resolveTurn5FaintWindowKoHp);



/** Ticks from `TURN5_ROCKSLIDE_PRESS_TICK` to this text's own clear+first-glyph tick - pixel-confirmed this session (dense oracle sweep: the message box hard-cuts from the held "ONIX used\nROCK SLIDE!" text to this one in a single tick, 1660px, at trace tick 6523 = `PRESS_TICK`+694). Unlike turns 3/4's own ROCK_SLIDE text (which auto-clears to blank via `ROCK_SLIDE_TEXT_CLEAR_DELAY` then hard-cuts to the resettled menu), this turn's text never clears to blank at all - it holds through the ENTIRE hit-flash+drain+sink window, then transitions DIRECTLY into this fainted text (still automatic, no button yet - only the fainted text's own post-print hold is button-gated, see `turn5RockSlideKoDismissEligible`). */


export function turn5FaintedTextStartTick(pressTick: number): number {
  return pressTick + TURN5_FAINTED_TEXT_DELAY;
}


/**
 * NOT `cursorState`'s own perpetual 4-phase BOUNCE - dense oracle re-check
 * this session (`turn5-faint.json`'s own compare run) shows this cursor
 * instead CLIMBS once (offset 0->1->2 over two 9-tick steps: rows 143-147 at
 * 6543-6551, 142-146 at 6552-6560, 141-145 from 6561 on) and then HOLDS at
 * offset 2 for the rest of this trace's own window (through its own
 * stopping tick 6587, 26 ticks past the KO-dismiss press with zero further
 * change) - it never visibly bounces back down to 1 inside this slice's own
 * scope. Whether it eventually resumes a bounce loop past 6587 (like the S6
 * intro's own cursor, which persists through a much longer uninterrupted
 * wait) is NOT known - this slice's own window doesn't run long enough past
 * the press to observe it, so this is deliberately a plain climb-then-hold,
 * not generalized into a perpetual cycle the pixels don't support yet.
 *
 * `docs/turn5-resolve-ab-pools-diagnosis.md` §6 (2026-08-18, ISSUES #97
 * remainder) proposed replacing this with a plain `cursorState(t, cursorStart)`
 * reuse, predicting `resolve-off-b` 88/196 -> 196/196. Landing that swap DID
 * close the doc's own targeted 6426-6560 span exactly as predicted (with a
 * `t-1` display-basis correction the doc's own §6c flagged as likely
 * needed), but ALSO regressed the previously-exact `turn5-resolve-off-c`
 * hard guard 195/196 -> 140/196 - that trace's own capture window
 * (6614-6958) shares this exact code path and, empirically, is NOT disjoint
 * from it as the doc's own §7 PASS/FAIL table assumed. Fresh pixel
 * inspection past the KO-dismiss `A` press (trace tick 6561-6562, the same
 * tick as this doc comment's own "6561" climb-then-hold anchor) shows the
 * real cursor does NOT simply freeze at a fixed offset there (ruled out:
 * the mismatch pattern still varies by phase, not a constant offset) - it
 * looks like a genuine re-anchor/second-cycle event tied to the real
 * dismiss-input tick, the same class of mechanism turn 13's own analogous
 * cursor already solves via `opponentFaintPresentationOwner.dismiss`
 * (`drawTurn13SwitchinWindow`, `frozenCursorTick`/`dismiss.cursor.
 * frozenAtElapsed`) - NOT reproducible from a fixed pixel/RAM constant the
 * way this function's own table is, since the real freeze/re-anchor point
 * depends on when the (real, per-session) dismiss input actually lands.
 * Reverted to this bespoke function pending that dismiss-aware plumbing
 * being threaded into `drawTurn5RockSlideWindow` (mirroring turn 13's own
 * pattern) - next instrument for a future session, not guessed here.
 */
export function turn5FaintedCursorYOffset(t: number, start: number): number {
  return Math.min(2, Math.floor((t - start) / 9));
}




/**
 * S7 slice L (docs/faint-switch-notes.md §9 RAM-probed this session, RAM-
 * confirmed, NOT curve-fit): the opponent party-icon-bar's SWITCH-IN
 * re-trigger. `switchin-iconbar-slidein.json`'s own probe (`gSprites[]`
 * x2 for the bar's own reused slot 3 and the 6 icons' fresh slots 54-59,
 * every tick 6580-6614) shows all SEVEN sprites share the IDENTICAL x2
 * sequence every tick, zero stagger - bit-for-bit `OPP_BAR_X2` itself
 * (creation at RAM tick 6587, `x2` walks its 20 entries -95..0 through RAM
 * tick 6606) - unlike the S6 intro's own per-icon-staggered `OPP_ICON_X2`
 * tables. This corrects docs §9's own open item 1 (which guessed a
 * "9-value ease-out tail" and hit a real residual) - the true shape is the
 * full 20-step bar curve, applied uniformly to bar AND icons alike, no new
 * table needed.
 */


/**
 * `switchin-iconbar-transient.json`'s own probe (this session): at RAM
 * tick 6725 - the SAME tick as docs §9's own flagged "unexplained tick-6727
 * transient" (render lag `rt=t-1` puts render 6727 one tick after RAM
 * 6725's own first-visible render 6726) - all 7 icon-bar sprites (bar +
 * 6 icons) flip their OAM `objMode` from NORMAL to BLEND simultaneously
 * (`oam0`'s raw u32 jumps by exactly `0x400` for all 7, one shared tick),
 * then are ALL destroyed together at RAM tick 6742 (`flags`/`x`/`y`
 * reset to the dead-sprite default `304,160,0` for all 7 in the same
 * tick). This is `Task_HidePartyStatusSummary`'s own alpha-blend-then-
 * destroy shape (already modeled for the PLAYER bar's own intro exit,
 * `playerSummaryFadeEva`) applied to the OPPONENT bar here - a flat
 * 1-unit-per-tick ramp (not the player exit's "every OTHER tick" cadence)
 * fits the 16-render-tick window (6727-6742) `switchin-iconbar-transient.json`
 * covers exactly: `eva` holds 16 (unblended) through render 6726, ramps
 * 16->0 over renders 6727-6742, and the sprites vanish outright at 6743 -
 * resolving docs §9's own "alternating 1091/1087px, render 6727-6742"
 * finding as this exact hardware alpha-blend ramp, not a new position/
 * palette mechanism. The freed slot 3 is reused by the open-particle
 * burst's own first spawn at RAM 6744 (docs §8d, unrelated to this bar).
 */



/** GROVYLE's own former slot (index 5) flips `"Full"` -> `"Statused"` (docs §9's own pixel correction) - the other 5 slots are unchanged from `ballIcons`' own opponent-side array. */


export function turn5IconBarEva(t: number, fadeStartTick: number = TURN5_ICONBAR_FADE_START_TICK): number | null {
  const rt = t - 1;
  if (rt < fadeStartTick) return null;
  return Math.max(0, 16 - (rt - fadeStartTick));
}



/**
 * S7 slice L-3: Pidgeotto's own materialize - pixel- and RAM-verified this
 * session directly against `battle1-switchin-materialize-tint-probe.json`/
 * `battle1-switchin-b1-sprite-probe.json` (not curve-fit), correcting docs
 * §9's own "two clean anchors, 24 ticks apart" guess - the real shape has
 * THREE phases sharing the ball's own `TURN5_BALL_HANDOFF_TICK` clock for
 * the first two:
 *
 * 1. **Growing silhouette + coefficient ramp** (render 6746-6785, unified
 *    into ONE per-pixel-blend draw call - see S7 slice L-4 correction
 *    below): bit-for-bit the SAME `affineEmergeAccumulator`/
 *    `MATERIALIZE_Y2_TABLE` mechanism 4 already uses for Grovyle drives the
 *    shrink-sampling geometry throughout (pixel width climbs 1->44px over
 *    exactly 12 render ticks, 6746-6757, matching `affineEmerge`'s own
 *    `duration=12` precisely; RAM `y2` reads 14,13,...,2,0 over RAM
 *    6745-6757, bit-exact to `MATERIALIZE_Y2_TABLE`) - just extended past
 *    S6's own `GROVYLE_FRONT_ANIM_START_OFFSET(35)` cutoff, since
 *    Pidgeotto's own front-anim (`animNum` 0->1 at RAM 6760) starts BEFORE
 *    the tint even begins ramping down (a real sequencing difference from
 *    Grovyle, docs §7b's own flag). **S7 slice L-4 correction** (root-
 *    caused via direct RAM probing, `tools/probe/dump-switchin-materialize-
 *    affine.py` for the OAM side, a targeted `gPlttBufferFaded`/`Unfaded`
 *    reprobe at the CORRECT palette offset for the color side): docs §10
 *    flagged a ~3% residual in render 6768-6782 even after a same-tick lag
 *    fix. Probing `oam.affineMode`/`gOamMatrices` directly across RAM
 *    6767-6783 found the OAM matrix pinned at pure identity `(256,0,0,256)`
 *    and `affineMode=ST_OAM_AFFINE_NORMAL` the ENTIRE growing+ramp span
 *    (never `DOUBLE`) - ruling out geometry entirely, so the residual had
 *    to be in the tint coefficient's own value or timing. The PRIOR
 *    session's own `TURN5_MATERIALIZE_RAMP_COEFF` sequence (`[13,13,11,11,
 *    9,9,8,6,6,4,4,2,2,1,0]`) and its "same render tick, no +1 lag" finding
 *    turned out to be corrupted: it was decoded from OBJ-palette-bank-1
 *    color indices 1-4 (`gPlttBufferFaded+0x222..0x228`), whose specific
 *    true (unfaded) colors sit close enough to `MATERIALIZE_TINT_COLOR`
 *    that MULTIPLE adjacent coefficients (e.g. 15 and 16, or 13 and 14)
 *    resolve to the IDENTICAL faded output - `BlendPalette`'s `(t5-c5)*
 *    coeff>>4` integer-truncates, so a small `t5-c5` delta collapses
 *    several coefficients onto the same result. Reprobing the SAME buffers
 *    at `+0x230` (color index 8 of the same bank - identified via
 *    `battle1-switchin-pidgeotto-palettenum-probe.json`'s own `paletteNum
 *    =1`, `struct OamData`'s `paletteNum:4` field at oam+3 bits 4-7 -
 *    whose true color `(214,49,24)` sits far enough from the tint that
 *    every coefficient 0-16 produces a DISTINCT faded output, confirmed by
 *    cross-checking three separate channels) gives the real, perfectly
 *    LINEAR sequence: coefficient 16 (flat, fully opaque) for RAM ticks
 *    6744-6766, then exactly `6782 - ramTick` for RAM 6767-6782 (i.e.
 *    15,14,13,...,1,0, one integer step per tick, no doubling), 0
 *    thereafter - not curve-fit, read directly, cross-validated against
 *    3 independent oracle pixels' own true palette colors (verified exact,
 *    not approximate). The render lag is the ordinary **+1 tick** every
 *    other mechanism in this dossier already carries (RAM tick T's value
 *    first visible render T+1) - the earlier "same-tick" finding was a
 *    false positive from testing against the ALSO-WRONG coefficient table
 *    at a single tick where the two errors partially canceled.
 *    `drawSpriteSheetAffineTinted`'s flat-tint shortcut (its own doc
 *    comment: "correct only for ... coefficient 16") is mathematically
 *    identical to a coefficient-16 call of the new per-pixel-blend sibling
 *    `drawSpriteSheetAffineTintedBlend` (at `coeff=16`, `BlendPalette`'s
 *    formula always reduces to the target color exactly, no truncation) -
 *    so this whole phase now makes ONE draw call across the full span with
 *    `turn5MaterializeCoeff(t)` supplying 16 during the flat portion and
 *    the ramp value afterward, sharing the same accumulator-driven
 *    geometry throughout (no phase seam). `affineEmergeAccumulator`
 *    saturates to 256 (full size) well before the ramp starts, and the
 *    sprite's own scale stays neutral throughout (the stretch driver's
 *    `data4`/`data5` don't engage until RAM 6785, several ticks after the
 *    ramp reaches coefficient 0).
 * 2. **~~Wobble table~~ - CORRECTED 2026-08-18, ISSUES #97 remainder**
 *    (`docs/turn5-resolve-offc-tail-diagnosis.md` §11, superseding this
 *    item's original claim below): the "RAM ground truth" cited here was
 *    wrong. A direct RAM reprobe of `gBattlerSpriteIds[1]`'s own affine
 *    matrix (`dump-turn5-pidgeotto-materialize-settle-probe.py`) found
 *    `a=d=256,y2=0` FLAT from RAM 6756 clear through RAM 6835+ - thirty
 *    render ticks before this item's own `render 6786` start and eighty-
 *    plus past its own `6826` end. There is no stretch driver, no wobble,
 *    no `doubled` affine mode engaged anywhere in this window; the sprite's
 *    own idle callback (`SpriteCB_OpponentMonFromBall` ->
 *    `SpriteCallbackDummy`) flips at RAM 6760 (render 6761), not RAM 6827.
 *    `TURN5_STRETCH_TABLE` (the literal table this item used to describe)
 *    has been deleted; phase 1's own tinted-blend formula now runs
 *    unconditionally through the whole materialize window instead and
 *    already saturates to this exact flat end-state for large `t` - see
 *    `drawTurn5PidgeottoMaterialize`'s own doc comment in battleScene.ts.
 *    Original (wrong) text, kept for the forensic record: once the stretch
 *    driver's own callback engages (RAM 6784), `data4`/`data5`/`y2`
 *    (`xScale`/`yScale`/`y2`) oscillate in a small, non-monotonic band
 *    around neutral (256, max deviation ~272/209, i.e. an ~6% wobble, not a
 *    real stretch) before returning to exactly `(256,256,0)` at the last
 *    entry - RAM ground truth, not curve-fit, same precedent as
 *    `GROVYLE_STRETCH_TABLE`. Palette coefficient is 0 (true colors) for
 *    this entire phase (confirmed via the same palette probe). Settles to
 *    the plain, untransformed sprite at `TURN5_PIDGEOTTO_SETTLE_TICK` (RAM
 *    6827's own idle callback, visible render 6828) - species-dossier slice
 *    7: now `TURN5_SWITCHIN.materializeSettleTick`,
 *    `turn5ResolutionAdapter.ts`'s own adapter-owned fact, not an
 *    independently hand-derived literal here.
 *
 * Front-sprite frame selection (`turn5PidgeottoFrame`, this dossier's own
 * former claim below) - REMOVED 2026-08-18 (ISSUES #97 remainder, landing
 * `docs/turn5-resolve-offc-tail-diagnosis.md` §11d/§11f). The claimed
 * RAM-confirmed `animCmdIndex` transitions at renders 6766/6776/6786/6821
 * are contradicted by this session's own denser RAM reprobe (§11a,
 * `dump-turn5-pidgeotto-materialize-settle-probe.py`): the real sprite is
 * dead static - zero change of ANY kind, affine matrix and callback alike -
 * from RAM 6756 clear through the probe's own end (6835+), spanning every
 * one of those claimed transition ticks. Confirmed independently this
 * session by direct RGB sampling of the oracle's own captured PNGs
 * (`turn5-resolve-off-c`, renders 6784-6809, coordinates `(175,30)`/
 * `(190,50)`): the real captures hold pixel-identical at every sampled
 * tick, while this function's own frame-2 branch flip produced a
 * different, wrong color starting exactly at render 6786 - forcing frame 0
 * unconditionally closes that entire span to 0px (`npm run compare --
 * turn5-resolve-off-c`, landing exactly at §11f's own predicted 173/196).
 * `drawTurn5PidgeottoMaterialize` now uses `pidgeottoFrontSprite.tileset`
 * (frame 0) unconditionally; `pidgeottoFrontSprite.frame2` was never a real
 * frame this call site should have reached. Original (wrong) claim, kept
 * for the forensic record: uses the RAM-confirmed `animCmdIndex` transition
 * ticks directly (render = RAM+1: 6761, 6766, 6776, 6786, 6821) with an
 * even/odd-index parity heuristic (no species-specific frame-duration
 * table was extracted for Pidgeotto this session, unlike Grovyle's own
 * `battleAnimTables.grovyleFrontAnim`) - verified empirically against the
 * oracle's own pixels in this window (see `turn5-switchin.json`'s own
 * 0-diff verification), not assumed.
 */



/**
 * docs/turn13-notes.md, "MURKROW's own materialize/wobble table" (2026-07-21
 * worktree probe): the real double-affine wobble engages RAM 17019, visible
 * render 17020 - NOT `SETTLE_TICK`-minus-table-length (17030), which was
 * Pidgeotto's own anchor math reused without RAM confirmation.
 */

/**
 * RAM-read directly off `pa`/`pd`/`y2` (the literal affine-matrix registers,
 * the same representation `drawSpriteSheetAffineStretch`'s `xScale`/
 * `yScale`/`y2` params consume) - Murkrow's own front-sprite entrance is
 * driven by a linear angle counter (`data4` +8/tick), a genuinely different
 * mechanism than Pidgeotto's `TURN5_STRETCH_TABLE` literal scale curve, not
 * the same table at a new anchor. Entries 0-48 are RAM 17019-17067 read
 * directly; entry 49 is RAM 17068's own flat identity, appended explicitly
 * so the table spans exactly through the last frame before settlement -
 * clamp-repeating entry 48 instead regresses the final wobble frame by 1px
 * (`y2=-1` instead of the oracle's flat `0`).
 */

/**
 * Front-sprite frame selection has a one-render lead over the affine/OAM
 * state: direct VRAM reads swap at RAM 17019/17034 while the table/matrix is
 * visible one render later. Thus `frame2` is rendered in the closed interval
 * [stretch - 1, frame-flip - 1]. This is an asset-transfer timing rule on
 * the owner continuation's local clock; see docs/turn13-murkrow-boundaries.md.
 */

export function turn13MurkrowFrame(continuationElapsed: number): 0 | 1 {
  return continuationElapsed >= TURN13_MURKROW_STRETCH_AFTER_DISMISS - 1
    && continuationElapsed < TURN13_MURKROW_FRAME_FLIP_AFTER_DISMISS
    ? 1
    : 0;
}



/**
 * S7 slice N rung (a) (docs/turn6-notes.md §5): turn 6's own FIGHT submenu -
 * cursor rests at slot 0 (ROCK_SLIDE, unchanged since turn 3 - no nav
 * needed, same "no nav needed" finding every reopen since has shown) with PP
 * read 6/10 (the completed turn-5 handoff's immutable PP receipt,
 * `currentPPForActiveMon`'s own doc). Deliberately stops short of
 * dispatching into the FEATHER_DANCE kickoff text (rung (b), out of this
 * session's scope) - the confirm press and its own short post-confirm hold
 * render identical submenu content (§5: "reverts to submenu-open pixels"),
 * so no separate confirm branch is needed yet.
 */
/**
 * S7 slice N rung (a) (docs/turn6-notes.md §5): the confirm press's own
 * bounce-freeze - same "`DoBounceEffect` stops being polled the instant the
 * A-press hands off" rule `turnKickoffBounceTick`/`turn5KickoffBounceTick`
 * et al. already establish. **[CORRECTED, S7 slice N rung (b)]** rung (a)'s
 * own anchor (`pressTick`, `d=0`) only happened to be right for region B
 * (the healthbox) - RAM-probed fresh this session
 * (`gSprites[gBattlerSpriteIds[0]]`/`gSprites[gHealthboxSpriteIds[0]]`'s own
 * `y2`, both flat **0** for the entire post-confirm hold, 7347 onward) and
 * cross-checked against this file's own closed-form `menuIdleBounce`: at
 * `pressTick` (7345) the formula gives `{onixY2:1, healthboxY2:0}` - region
 * B matches by coincidence, region A (the on-field ONIX sprite itself) does
 * not, and was silently masked because rung (a) excluded exactly the ticks
 * this shows on (7348-7350) rather than diagnosing it. `pressTick -
 * TURN6_BOUNCE_FREEZE_ANCHOR_OFFSET` lands both regions on the SAME 0/0
 * plateau `menuIdleBounce`'s own cycle already has nearby (scanned
 * `tools/compare/scratch/scan-bounce.mjs`, 7333-7341 and 7370-7378 both
 * all-zero) - closes the entire named residual, not just this session's own
 * new ticks (verified: 7348-7350 now 0-diff too, see battle-turn-notes.md
 * §28).
 */


/**
 * ISSUES #97 (docs/turn5-bounce-recalibration-probe.md §10b): the raw
 * (not-yet-frozen) branch was missing the same `- FIGHT_SUBMENU_OPEN_
 * BOUNCE_SHIFT` term `drawTurn6FightSubmenuWindow`'s own sibling `else`
 * branch (the pre-confirm idle regime, one line above this function's
 * only call site) already applies - both regimes drive the SAME live
 * `DoBounceEffect` cycle, RAM-confirmed continuous across the press
 * (receipt: `tests/fixtures/data/turn5-6-reopen-bounce-probe.json`, raw sine
 * index step of 7/tick with zero discontinuity at the press tick).
 */
export function turn6KickoffBounceTick(t: number, pressTick: number): number {
  if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) return t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  return pressTick - TURN6_BOUNCE_FREEZE_ANCHOR_OFFSET;
}



/**
 * S7 slice N rung (b) (docs/turn6-notes.md §5/§6): "Foe PIDGEOTTO used\nFEATHERDANCE!" -
 * the FIRST opponent-targeted stat-down kickoff this dossier models
 * end-to-end. Timing constant fit directly against
 * `battle1-turn6-dense.json`'s own real script (re-probed this session,
 * `tools/compare/scratch/turn6-fd-probe-out/manifest.json`): the confirm
 * hold (`b0b3f93f96f2`) stays flat through 7357, the FIRST changing tick is
 * 7358, and the message settles to its held sha (`ae11c7f00fbd`) at 7388
 * flat - NOT `turn2KickoffTextStartTick`'s own reopened-submenu `pressTick+9`
 * correction (would start at 7354, 4 ticks early - turn 6's own reopen
 * dispatches through a dedicated function, not the Grovyle-shaped
 * `turn2KickoffText` chain, so there's no reason to expect the same fixed
 * offset without checking, and it doesn't match here).
 */


export const TURN6_FEATHERDANCE_TEXT_TOTAL = TURN6_FEATHERDANCE_LINE1.length + TURN6_FEATHERDANCE_LINE2.length;



export function turn6FeatherDanceTextStartTick(pressTick: number): number {
  return pressTick + 13;
}



/**
 * ISSUES #39 rank-4 slice 1 (`docs/rank4-prep-scout.md` slice 1): Pidgeotto's
 * own HP after turn 6's ROCK_SLIDE (`docs/turn6-notes.md` §4, RAM-confirmed:
 * 156->113, -43 - matches `gBattleMoveDamage`'s own RAM lock at tick 7790),
 * now re-derived from `turn67RockSlidePresentationStaging.ts`'s own staged
 * real hit chain (`BattleScript_HitFromAtkCanceler`, Onix's real
 * already-lowered ATK stage from this turn's own FEATHER_DANCE) via
 * `presentationEventWindowBridge.ts`'s existing
 * `resolveRockSlidePresentationWindowContent` - byte-identical to the former
 * bare literal, but now identified from provenance, not asserted.
 */
export const turn6PidgeottoAfterRockslideHp = lazyValue(() => resolveTurn6RockSlideHpEndpoints().to);



/**
 * S7 slice O (docs/turn7-notes.md, docs/battle-turn-notes.md §32): turn 7's
 * own FIGHT submenu - cursor rests at slot 0 (ROCK_SLIDE, unchanged since
 * turn 3, no nav needed - turn7-notes §5's own "cursor persistence
 * confirmed") with PP read 5/10 from the completed turn-6 handoff.
 * Structurally identical to
 * `drawTurn6FightSubmenuWindow` - reuses `drawTurn6FieldBase` UNCHANGED
 * (same battlers, same on-field corners) - only the PP flag and the
 * downstream text/ROCK_SLIDE dispatch (`drawTurn7FeatherDanceKickoffText`)
 * differ.
 */
/**
 * The `turn5SitrusResettledBounceTick`(regime 1)-to-`turn6RockSlideResettled
 * BounceTick`(regime 2) anchor shift: `drawTurn6FieldBase` always applies
 * regime 1 internally (its own fixed formula, not swappable per-caller), so
 * this converts a regime-2-space raw tick into whatever regime-1-space
 * value produces the SAME `menuIdleBounce` result - solving
 * `t2 - (TURN6_ROCKSLIDE_PRESS_TICK+750) === t1 - TURN5_SITRUS_MENU_REDRAW_TICK`
 * for the constant `t1 - t2` offset. Oracle-caught this session (turn 7's
 * own idle/browsing window is the FIRST time this codebase has ever needed
 * to render past a resettled-menu's OWN redraw reset while ALSO needing
 * `drawTurn6FieldBase`'s Grovyle/Onix-only sprite layer - every earlier
 * caller either predates turn 6's own redraw or bypasses `drawTurn6FieldBase`
 * entirely once past it, e.g. `drawTurn6RockSlideTurnEndSettledMenu`).
 */
export const TURN7_REGIME2_TO_REGIME1_SHIFT = TURN5_SITRUS_MENU_REDRAW_TICK - (TURN6_ROCKSLIDE_PRESS_TICK + TURN6_ROCKSLIDE_MENU_REDRAW_DELAY);



/** `turn6KickoffBounceTick`'s own turn-7 analogue, in regime-2 space (`drawTurn7FieldBase`'s own domain) - freezes at the regime-2 anchor tick itself (`TURN6_ROCKSLIDE_PRESS_TICK+TURN6_ROCKSLIDE_MENU_REDRAW_DELAY`, i.e. local phase 0 by construction, the same "real {0,0} plateau" turn 6's own freeze anchor was independently bisected to land on). */
export function turn7KickoffBounceTick(t: number, pressTick: number): number {
  if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) return t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  return TURN6_ROCKSLIDE_PRESS_TICK + TURN6_ROCKSLIDE_MENU_REDRAW_DELAY;
}



/**
 * ISSUES #39 rank-4 slice 1: Pidgeotto's own HP after turn 7's ROCK_SLIDE
 * (`docs/turn7-notes.md` §4, RAM-confirmed: 113->82, -31), now re-derived
 * from `turn67RockSlidePresentationStaging.ts`'s own staged run (real
 * cumulative -4 ATK stage from turns 6+7's own FEATHER_DANCE uses) - same
 * flip as turn 6's own HP endpoint above, re-derived from this turn's own
 * staged facts, not copied from turn 6's.
 */
export const turn7PidgeottoAfterRockslideHp = lazyValue(() => resolveTurn7RockSlideHpEndpoints().to);



/**
 * S7 slice P (docs/turn8-notes.md, docs/battle-turn-notes.md §33): turn 8's
 * own FIGHT submenu - cursor persists at slot 0 (ROCK_SLIDE) from turn 7's
 * own reopen, then one `RIGHT` press moves it onto BIND (slot 1, `moveFightCursor`'s
 * existing `cursor^1` grid arithmetic, unchanged - turn 8 is simply the
 * first time this engine actually EXERCISES that generic nav for a real
 * confirm rather than just browsing). The completed turn-7 handoff supplies
 * PP 4/10; ROCK_SLIDE is frozen and unused this turn. Structurally identical
 * to `drawTurn7FightSubmenuWindow` -
 * reuses `drawTurn7RockSlideTurnEndSettledMenu` UNCHANGED for the pre-open/
 * DMA-wait/browsing phases (turn 8's own reopen browses the SAME settled
 * scene turn 7's own ROCK_SLIDE left behind - nothing has changed yet) -
 * only the PP flag and the downstream text/BIND dispatch
 * (`drawTurn8FeatherDanceKickoffText`) differ.
 */
/**
 * `turn7RockSlideResettledBounceTick`(regime 2)-to-regime-1 anchor shift,
 * turn 8's own analogue of `TURN7_REGIME2_TO_REGIME1_SHIFT` - solves the
 * same identity one redraw further: turn 7's own redraw (`TURN7_ROCKSLIDE_
 * PRESS_TICK+TURN7_ROCKSLIDE_MENU_REDRAW_DELAY`, 9144) resets the bounce
 * cycle fresh onto a THIRD regime, which `drawTurn6FieldBase` (still only
 * ever applying regime 1 internally) needs converted the same way turn 7's
 * own wrapper already converts regime 2.
 */
export const TURN8_REGIME3_TO_REGIME1_SHIFT = TURN5_SITRUS_MENU_REDRAW_TICK - (TURN7_ROCKSLIDE_PRESS_TICK + TURN7_ROCKSLIDE_MENU_REDRAW_DELAY);



/** `turn7KickoffBounceTick`'s own turn-8 analogue, in regime-3 space (`drawTurn8FieldBase`'s own domain) - freezes at the regime-3 anchor tick itself (`TURN7_ROCKSLIDE_PRESS_TICK+TURN7_ROCKSLIDE_MENU_REDRAW_DELAY`, local phase 0 by construction). */
export function turn8KickoffBounceTick(t: number, pressTick: number): number {
  if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) return t;
  return TURN7_ROCKSLIDE_PRESS_TICK + TURN7_ROCKSLIDE_MENU_REDRAW_DELAY;
}




/**
 * Turn 8's own real confirm pressTick (docs/battle-turn-notes.md §33's own
 * "9425" citation, restated as a named constant for S7 slice R: turn 9's own
 * idle/pre-reveal window reuses `drawTurn8TurnEndSettledMenu` verbatim, and
 * unlike turn 8's OWN dispatcher (which still has `sm.confirmElapsed` live
 * for turn 8's own confirm), turn 9's `sm` is a FRESH `FightSubmenuState` -
 * this turn's own confirm is a different, later tick - so the historical
 * anchor needs its own fixed constant, the same "past-turn anchor" shape
 * `TURN6_ROCKSLIDE_PRESS_TICK`/`TURN7_ROCKSLIDE_PRESS_TICK` already
 * establish for ROCK_SLIDE.
 */


export function turn8BindTextStartTick(pressTick: number): number {
  return pressTick + TURN8_BIND_TEXT_DELAY;
}




export function turn8MissTextStartTick(pressTick: number): number {
  return pressTick + TURN8_MISS_TEXT_DELAY;
}





export const TURN9_QUICKATTACK_TEXT_TOTAL = TURN9_QUICKATTACK_LINE1.length + TURN9_QUICKATTACK_LINE2.length;





export function turn9QuickAttackTextStartTick(pressTick: number): number {
  return pressTick + TURN9_QUICKATTACK_TEXT_DELAY;
}



/** `start` defaults to turn 9's own anchor (every pre-existing caller unaffected) - see `turn9Ep2OnixInvisible`'s own doc comment for why this generalization exists (turn 10's own re-trigger of the same ENDEAVOR §15f-precedented companion mechanism). */
export function turn9Ep2HealthboxWobbleY2(t: number, pressTick: number, start: number = TURN9_EP2_HEALTHBOX_WOBBLE_START): number {
  const ramTick = t - TURN9_EP2_HEALTHBOX_WOBBLE_RENDER_LAG;
  const n = ramTick - pressTick - start;
  if (n < 0 || n >= TURN9_EP2_HEALTHBOX_WOBBLE_TICKS) return 0;
  return n % 2 === 0 ? 1 : -1;
}




/**
 * `start` defaults to turn 9's own anchor (every pre-existing caller
 * unaffected) - S7 engine step PART 2 (docs/aerial-ace-notes.md's own
 * "Mission B: SOLVED" section) generalizes this so turn 10's own re-trigger
 * of the SAME hit-flash task (Onix's post-AERIAL_ACE-hit flicker, RAM
 * `pressTick+102` vs. turn 9's `pressTick+87`, identical period/on-ticks/
 * total-ticks/render-lag shape) can reuse it verbatim rather than forking a
 * near-duplicate function.
 */
export function turn9Ep2OnixInvisible(t: number, pressTick: number, start: number = TURN9_EP2_FLICKER_START): boolean {
  const ramTick = t - TURN9_EP2_FLICKER_RENDER_LAG;
  const n = ramTick - pressTick - start;
  if (n < 0 || n >= TURN9_EP2_FLICKER_TOTAL_TICKS) return false;
  return n % TURN9_EP2_FLICKER_PERIOD < TURN9_EP2_FLICKER_ON_TICKS;
}


export function turn9Hp(t: number, pressTick: number, startHp: number, endHp: number): number {
  const d = t - (pressTick + TURN9_HP_DRAIN_START_DELAY);
  return Math.max(endHp, startHp - Math.max(d, 0));
}



/**
 * S7 slice R rung (c4) (docs/turn9-shake-notes.md 2026-07-21 addendum §2):
 * `sText_NotVeryEffective` - a SINGLE line (turn9-notes.md §5's own
 * two-line transcription was wrong, corrected by fresh pixel probing: line 2
 * never gets ink), same `TURN6_SUPER_EFFECTIVE_LINE`-shaped single-line
 * reveal. ISSUES #39 rank-5 slice 1: under Scene OFF,
 * `turn9-quickattack-off.json` settles to its own held sha 2 ticks earlier
 * (render 11026, was 11028 on the retired ON pin) - same 2-tick shift
 * `TURN9_EP2_*`/`TURN9_HP_DRAIN_START_DELAY` above already carry. First
 * char now at render 11003 (`pressTick+132`), fully typed at 11026 (24/24
 * chars, the `…` glyph).
 */


export function turn9NotVeryEffectiveTextStartTick(pressTick: number): number {
  return pressTick + 132;
}



/**
 * S7 slice R rung (d): a SYNTHETIC press anchor (same reasoning as
 * `TURN6_ROCKSLIDE_PRESS_TICK`/`TURN7_ROCKSLIDE_PRESS_TICK`), chosen so
 * `rockSlideTextStartTick(TURN9_ROCKSLIDE_PRESS_TICK)` lands on the "ONIX
 * used\nROCK SLIDE!" transition tick. ISSUES #39 rank-5 slice 1 (Scene-OFF):
 * fresh oracle re-run (`bin/oracle run tools/compare/traces/
 * turn9-rockslide-off.json`) shows this transition lands on render **11108**
 * under Scene OFF (was 11110 on the retired ON pin - QUICK_ATTACK's own
 * resolution compresses by 2 ticks, same shift `TURN9_EP2_*`/
 * `TURN9_HP_DRAIN_START_DELAY` above already carry). `11108 -
 * ROCK_SLIDE_TEXT_DELAY(393) = 10715`.
 */


/**
 * Turn-specific, NOT transferable from `TURN6_SUPER_EFFECTIVE_TEXT_DELAY`/
 * `TURN7_SUPER_EFFECTIVE_TEXT_DELAY` (same "each turn gets its own literal
 * constant" convention those two doc comments already establish - Pidgeotto's
 * own HP-drain duration differs turn to turn). ISSUES #39 rank-5 slice 1:
 * `bin/oracle run tools/compare/traces/turn9-rockslide-off.json` shows the
 * fully-typed "It's super effective!" hold beginning at render **11252**
 * under Scene OFF (21-char line, so first char at 11252-20=11232) -
 * `11232 - TURN9_ROCKSLIDE_PRESS_TICK(10715) = 517` (was `624` on the
 * retired ON pin, whose own transition landed at render 11341).
 */


export function turn9SuperEffectiveTextStartTick(pressTick: number): number {
  return pressTick + TURN9_SUPER_EFFECTIVE_TEXT_DELAY;
}



/**
 * ISSUES #39 rank-5 slice 1: turn 9's own OFF-fit hit-reaction anchor -
 * `dump-turn9-hitanim-off.py` against `factory-battle-scene-off.json`
 * (RAM-confirmed: the healthbox wobble/Pidgeotto-flicker pair starts RAM
 * tick 11170, `TURN9_ROCKSLIDE_PRESS_TICK`(10715)+455) plus Pidgeotto's own
 * `x2`/`y2` target shake (`rockSlideMonShakeY2`'s own
 * `targetShakeStartAge`/`targetShakeEndAge`, ON-fit `[443,536]`) confirmed
 * flat 0 for this window's ENTIRE span under Scene OFF - the move-specific
 * shake never fires (same source rule as `docs/
 * rank5-effect-visibility-scout.md` §1, so its own call is dropped below
 * rather than given a never-active override). `rockAnchorAge`/
 * `spriteOrderSeed`/`occupiedSpriteSlots` are irrelevant here since neither
 * `rockSlideBg3Y` nor the rock-prop loop are called for this turn anymore.
 */
export const TURN9_ROCKSLIDE_ANIMATION_PROFILE = { ...ROCK_SLIDE_ANIMATION_PROFILE, hitFlashAnchorAge: 455 };



/**
 * Onix's own HP entering turn 10 (docs/turn10-notes.md §4: "24 -> 14
 * (-10, AERIAL_ACE)" - the pre-hit value), turn 9's own QUICK_ATTACK drain
 * (31->24) landing during this session's own out-of-scope window. Sourced
 * from `turn9ResolutionAdapter.ts`'s own `TURN9_QUICKATTACK_HP.to`, the
 * owning adapter for this window's HP-drain endpoints.
 */
export const TURN9_ONIX_AFTER_QUICKATTACK_HP = TURN9_QUICKATTACK_HP.to;



/**
 * S7 slice R rung (a) (docs/turn10-notes.md): "Foe PIDGEOTTO used\nAERIAL
 * ACE!" - AERIAL_ACE is `EFFECT_ALWAYS_HIT` (`accuracy: 0`,
 * `src/data/gen/moves.json`), the first move in this dossier's arc to skip
 * the accuracy roll entirely (§3's own RNG ledger: crit then spread only,
 * no accuracy check). Delay fit directly against a fresh `bin/oracle run`
 * of this session's own `turn10-menu.json` (not the dossier's own loose
 * prose range, per the fresh-oracle-constants rule).
 */


export const TURN10_AERIALACE_TEXT_TOTAL = TURN10_AERIALACE_LINE1.length + TURN10_AERIALACE_LINE2.length;





export function turn10AerialAceTextStartTick(pressTick: number): number {
  return pressTick + TURN10_AERIALACE_TEXT_DELAY;
}



/**
 * S7 slice R rung (a) (docs/turn10-notes.md's 2026-07-21 addendum §2): Onix's
 * own AERIAL_ACE drain (24->14), same shape as `turn9Hp`/`endeavorHp`
 * (1 HP unit/tick, clamped, render tick == RAM tick directly) but its own
 * named delay - RAM sentinel `-32768` @ 12441, `pressTick`(12305)+136.
 */

/**
 * Onix's own HP after turn 10's AERIAL_ACE hit (docs/turn10-notes.md addendum
 * §2: 24->14, -10). Sourced from `turn10ResolutionAdapter.ts`'s own
 * `TURN10_AERIALACE_HP.to`, the owning adapter for this window's HP-drain
 * endpoints.
 */
export const TURN10_ONIX_AFTER_AERIALACE_HP = TURN10_AERIALACE_HP.to;


/**
 * ISSUES #39 rank-5 slice 2 (Scene-OFF): RAM-confirmed (`dump-turn9-hitanim-off.py`
 * against `turn10-aerialace-off.json`, ticks 12305-12440) - the HP-bar
 * sentinel now lands at RAM tick 12422 (`12422 - pressTick(12305) = 117`,
 * was 136 on the ON-fit `TURN10_AERIALACE_HP_DRAIN_START_DELAY` above, a
 * modest 19-tick compression since AERIAL_ACE's own ON animation was
 * already fairly short before `attackanimation`'s `Pausex20` substitute).
 * `startDelay` (added to `turn10AerialAceHp` below, default = the
 * ON-fit constant, every pre-existing caller - including turn 12's own
 * still-ON-fit `drawTurn12AerialAceWindow` - unaffected) is the SAME
 * "generalize a hardcoded value into a defaulted param" idiom `rockSlideOpponentHp`'s
 * own `startDelay` override already established in slice 1.
 */

export function turn10AerialAceHp(t: number, pressTick: number, startHp: number, endHp: number, startDelay: number = TURN10_AERIALACE_HP_DRAIN_START_DELAY): number {
  const d = t - (pressTick + startDelay);
  return Math.max(endHp, startHp - Math.max(d, 0));
}


/**
 * ISSUES #39 rank-5 slice 2 (Scene-OFF): `bin/oracle run tools/compare/
 * traces/turn10-aerialace-off.json` shows the fully-typed "It's not very
 * effective…" hold beginning render 12461 (24-char line, 12461-23=12438)
 * - `12438 - pressTick(12305) = 133`, was 152 on the ON-fit constant above.
 * `delay` param default preserves turn 12's own still-ON-fit call site.
 */

export function turn10NotVeryEffectiveTextStartTick(pressTick: number, delay: number = TURN10_NOTVERYEFFECTIVE_TEXT_DELAY): number {
  return pressTick + delay;
}



/**
 * S7 slice R rung (a) (docs/turn10-notes.md's 2026-07-21 addendum): a
 * SYNTHETIC press anchor for Onix's own ROCK_SLIDE half of this turn, same
 * reasoning as `TURN9_ROCKSLIDE_PRESS_TICK` - fit to satisfy EVERY one of
 * `battleMenu.ts`'s already-shipped `rockSlide*` delay constants
 * simultaneously (addendum §1's own table: `ROCK_SLIDE_TEXT_DELAY`(393)->
 * 12562, `ROCK_SLIDE_RAM_ANCHOR_DELAY`(428)->12597, `ROCK_SLIDE_MON_SHAKE_
 * START/END_DELAY`(443/536)->12612/12705, `HIT_FLASH_RAM_ANCHOR_DELAY`(562)->
 * 12731, `ROCK_SLIDE_HP_DRAIN_START_DELAY`(597)->12766 - all five land
 * exactly, 0 mismatches against fresh RAM/pixel captures).
 */


/**
 * ISSUES #39 rank-5 slice 2 (Scene-OFF): a SEPARATE synthetic anchor from
 * the ON-fit `TURN10_ROCKSLIDE_PRESS_TICK` above, fit against the fresh OFF
 * ground truth (`docs/rank5-off-ground-truth.md`'s own turn10-rockslide-off
 * section) instead: `bin/oracle run tools/compare/traces/
 * turn10-rockslide-off.json` shows the message-box-open transition's own
 * 4-sha sequence landing at render 12543 (byte-identical to `docs/
 * turn10-notes.md`'s own ON citation at 12562-12565, ~19 ticks earlier) -
 * `12543 - ROCK_SLIDE_TEXT_DELAY(393) = 12150`. The ON-fit constant above
 * stays UNTOUCHED (not renamed, not reassigned) because it is still
 * consumed by `TURN11_REGIME6_TO_REGIME1_SHIFT`, the completed turn-10
 * handoff gate, and turn 11's own still-ON-fit reuse of
 * `drawTurn10RockSlideTurnEndSettledMenu` (default params below) - none of
 * which are in scope for this slice (turns 11-12 stay Scene-ON-fit until
 * their own slice per the assigned brief).
 */


/**
 * ISSUES #39 rank-5 slice 2: RAM-confirmed (`dump-turn9-hitanim-off.py`
 * against `turn10-rockslide-off.json`, ticks 12595-12660) - Pidgeotto's own
 * healthbox `y2` wobble first RAM-active at 12605
 * (`12605-TURN10_OFF_ROCKSLIDE_PRESS_TICK(12150)=455`), its own blink
 * flicker one tick later, and the HP-bar sentinel at 12640 (`=490`) -
 * IDENTICAL relative offsets to turn9's own OFF-fit
 * `TURN9_ROCKSLIDE_ANIMATION_PROFILE`/`TURN9_ROCKSLIDE_HP_DRAIN_START_DELAY`
 * (both 455/490) - the post-`Cmd_attackanimation` hit-reaction chain runs at
 * a fixed relative offset independent of which move/turn triggered it,
 * structurally consistent with `docs/rank5-effect-visibility-scout.md` §1's
 * source rule (confirmed by direct RAM probe, not assumed transferable).
 */
export const TURN10_OFF_ROCKSLIDE_ANIMATION_PROFILE = { ...ROCK_SLIDE_ANIMATION_PROFILE, hitFlashAnchorAge: 455 };


/**
 * ISSUES #39 rank-5 slice 2 (Scene-OFF): `bin/oracle run tools/compare/
 * traces/turn10-rockslide-off.json` shows the fully-typed "It's super
 * effective!" hold beginning render 12689 (21-char line, 12689-20=12669) -
 * `12669 - TURN10_OFF_ROCKSLIDE_PRESS_TICK(12150) = 519`, was 626 on the
 * ON-fit constant above. `delay` param default (added below) preserves the
 * existing pinned test's own 2-arg call.
 */

export function turn10SuperEffectiveTextStartTick(pressTick: number, delay: number = TURN10_SUPER_EFFECTIVE_TEXT_DELAY): number {
  return pressTick + delay;
}



/**
 * S7 slice R rung 1 (docs/turn11-notes.md addendum §3): the ATK-floor
 * "won't go any lower!" message - the ONE genuinely new mechanism this turn
 * (every other sub-mechanism is a pure reuse/parameterization). Pidgeotto's
 * own FEATHER_DANCE fires (accuracy roll consumed, PP charged) but Onix's
 * ATK stage is already floored at 0, so the real battle script substitutes
 * this message for the ordinary stat-drop text instead of skipping the
 * move's resolution outright. Apostrophe is `'` (U+2019, `charmap.json` code
 * 180), NOT ASCII - `verify-turn11.ts`'s own first run caught the wrong
 * glyph via a full box-region mismatch before this was corrected, same "let
 * the check catch it" discipline this codebase's other apostrophe'd
 * messages already established. Reveal mechanism is the plain generic
 * `min(TOTAL, t-start+1)` cap - no extra lag, unlike `turn6FeatherDanceTextStartTick`'s
 * own sibling functions.
 */


export const turn11AtkfloorKickoffLines = lazyValue(resolveTurn11AtkFloorLines);

export const turn11AtkfloorTextTotal = lazyValue(() => turn11AtkfloorKickoffLines()[0].length + turn11AtkfloorKickoffLines()[1].length);


export function turn11AtkFloorTextStartTick(pressTick: number): number {
  return pressTick + TURN11_ATKFLOOR_TEXT_START_DELAY;
}



/**
 * S7 slice R rung 1 (docs/turn11-notes.md addendum §1): turn 11's own
 * ROCK_SLIDE (Onix vs. Pidgeotto) - every mechanism reused with ZERO changes
 * from turns 6/7/9/10's own instances (`rockSlideBg3Y`/`rockSlideRockState`/
 * `rockSlideDrawOrder`/`rockSlideMonShakeY2`/`rockSlideHealthboxWobbleY2`/
 * `rockSlideMonBlinkInvisible`/`rockSlideOpponentHp`, all still
 * `pressTick`-relative) - only `TURN11_ROCKSLIDE_PRESS_TICK` and Pidgeotto's
 * own HP (38->16) are new. Onix (the attacker) stays flat at its
 * post-AERIAL_ACE HP (14) all turn - FEATHER_DANCE deals no damage this
 * turn, so there is no live drain to thread through, simpler than turn 10's
 * own window (docs/turn11-notes.md §4's own ledger).
 */



/**
 * ISSUES #39 rank-5 slice 3 (Scene-OFF): unlike turns 9/10, this turn's OWN
 * kickoff (the FEATHER_DANCE-then-ROCK_SLIDE handoff) shows ZERO pre-hit
 * compression (`docs/rank5-off-ground-truth.md`'s own turn11-featherdance-off
 * section - every cited sha lands at the exact SAME absolute tick as the ON
 * dossier, because FEATHER_DANCE's own stat-change handler short-circuits
 * before its own animation step, leaving nothing for OFF to strip upstream
 * of ROCK_SLIDE) - so `TURN11_ROCKSLIDE_PRESS_TICK` itself needs NO OFF-fit
 * sibling, unlike `TURN10_OFF_ROCKSLIDE_PRESS_TICK`. Compression only begins
 * once ROCK_SLIDE's OWN hit-reaction chain fires, at the SAME fixed
 * `hitFlashAnchorAge=455`/`startDelay=490` pair turns 9/10 already
 * RAM-confirmed independent of move/turn (`turn10-rockslide-off.json`'s own
 * doc comment) - `rockSlideHealthboxWobbleY2`'s own wobble onset predicted
 * by `pressTick+455=13593` lands EXACTLY on `turn11-rockslide-off.json`'s
 * own cited "13593-13612: generic wobble alternation" span, confirming the
 * same fixed-offset mechanism a third time rather than assuming transfer.
 */
export const TURN11_OFF_ROCKSLIDE_ANIMATION_PROFILE = { ...ROCK_SLIDE_ANIMATION_PROFILE, hitFlashAnchorAge: 455 };


/**
 * ISSUES #39 rank-5 slice 3 (Scene-OFF): the fixed -107-tick hit-reaction
 * shift (`TURN11_OFF_ROCKSLIDE_ANIMATION_PROFILE`'s own 562->455) applied to
 * this turn's own unchanged pressTick - `bin/oracle run tools/compare/
 * traces/turn11-rockslide-off.json` shows the fully-typed hold reproducing
 * the ON dossier's own citation ~107-112 ticks earlier throughout this
 * window, matching turns 9/10's own established delta exactly. `delay` param
 * default (added below) preserves the existing pinned test's own 2-arg call.
 */

export function turn11SuperEffectiveTextStartTick(pressTick: number, delay: number = TURN11_SUPER_EFFECTIVE_TEXT_DELAY): number {
  return pressTick + delay;
}



/**
 * Onix's own HP after turn 12's AERIAL_ACE hit (docs/turn12-notes.md §4:
 * 14->4, -10). Sourced from `turn12ResolutionAdapter.ts`'s own
 * `TURN12_AERIALACE_HP.to`, the owning adapter for this window's HP-drain
 * endpoints.
 */
export const TURN12_ONIX_AFTER_AERIALACE_HP = TURN12_AERIALACE_HP.to;



/**
 * Turn 12's own synthetic ROCK_SLIDE press anchor (docs/turn12-notes.md's
 * 2026-07-21 update §3), same "fit to satisfy the shared rockSlide* delay
 * family" reasoning as `TURN10_ROCKSLIDE_PRESS_TICK`/`TURN11_ROCKSLIDE_
 * PRESS_TICK` - only `ROCK_SLIDE_TEXT_DELAY`(393) fits anything this turn:
 * RAM-proven zero rocks/shake/hit-flash/wobble the WHOLE window
 * (`dump-rockslide-sprites.py`, RAM 14615-14790) - the miss diverts
 * immediately after the shared kickoff text, bit-exact to turn 8's own
 * BIND-miss finding ("misses divert BEFORE the roll"), now confirmed on a
 * SECOND, structurally different move.
 */


/**
 * ISSUES #39 rank-5 slice 3 (Scene-OFF): a SEPARATE synthetic anchor from
 * the ON-fit constant above, fit against `turn12-rockslide-miss-off.json` -
 * `bin/oracle run` shows the fully-typed "ONIX's attack missed!" headline
 * hold landing render 14686 (byte-identical to the ON dossier's own
 * 14705-14780 citation, 19 ticks earlier), and the turn-13 resettle
 * transition at 14762/14769 (19/~19-29 ticks earlier than the ON dossier's
 * own 14781-14789/14790-14798 citations) - every one of `ROCK_SLIDE_TEXT_
 * DELAY`(393)/`TURN12_ROCKSLIDE_MISS_TEXT_DELAY`(449)/`TURN12_ROCKSLIDE_
 * TEXT_CLEAR_DELAY`(544)/`TURN12_ROCKSLIDE_MENU_REDRAW_DELAY`(551) reproduces
 * EXACTLY unchanged relative to this new anchor (`14218+551=14769`,
 * `14218+544=14762`, etc, all landing on the cited ticks precisely) - a miss
 * has no animation-gated content of its own to strip (`docs/rank5-off-
 * ground-truth.md`'s own "cleanest confirmation... compression tracks
 * stripped animation content" finding), so the ENTIRE 19-tick shift here is
 * simply AERIAL_ACE's own upstream hit-reaction-chain compression carried
 * forward through the shared confirm-press tick, not a new source.
 * `14237-19=14218`.
 */


/**
 * ROCK_SLIDE's own miss text (`sText_AttackMissed` resolved for Onix,
 * `TURN8_MISS_LINE1/2` reused verbatim) - transition begins `pressTick`+449
 * (freshly fit this turn, NOT turn 8's own 471 - BIND's own kickoff text is
 * a different length, so its own held-window duration differs, not assumed
 * transferable).
 */

export function turn12MissTextStartTick(pressTick: number): number {
  return pressTick + TURN12_ROCKSLIDE_MISS_TEXT_DELAY;
}


export function turn13SandAttackTextStartTick(pressTick: number): number {
  return pressTick + TURN13_SANDATTACK_TEXT_DELAY;
}


export function turn13AccFellTextStartTick(pressTick: number): number {
  return pressTick + TURN13_ACCFELL_TEXT_DELAY;
}



export function turn13SandAttackPidgeottoX2(t: number, pressTick: number): number {
  const ramTick = t - 1;
  const i = ramTick - (pressTick + TURN13_SANDATTACK_SLIDE_START_OFFSET);
  if (i < 0) return 0;
  return TURN13_SANDATTACK_SLIDE_X2[i] ?? 0;
}


/**
 * `slot` is the real `gSprites[]` index each dirt sprite RAM-occupied at
 * its own spawn tick (`dump-sandattack-anim.py`'s own per-tick scan) -
 * needed for OAM draw order (`SortSprites`'s own "lower slot renders on
 * top" rule, same convention `rockSlideDrawOrder`'s own doc already
 * establishes): monotonically increasing spawn-order EXCEPT wave 2's first
 * sprite (slot 3, freed by the attacker's own `SlideMonToOriginalPos`
 * scratch sprite finishing right before wave 2 spawns) - RAM-exact, not
 * assumed sequential.
 */

/** Draw order: descending slot (painter's algorithm, last-drawn-on-top) so the lowest slot ends up visually on top - matches the real hardware's OAM order. Computed once (the table is a module constant). */
export const TURN13_SANDATTACK_DIRT_DRAW_ORDER: readonly number[] = TURN13_SANDATTACK_DIRT_TABLE.map((_, i) => i).sort(
  (a, b) => TURN13_SANDATTACK_DIRT_TABLE[b]!.slot - TURN13_SANDATTACK_DIRT_TABLE[a]!.slot,
);


export const turn1RockslideHp = lazyValue(resolveTurn1RockSlideHpEndpoints);


export const TURN1_OFF_ROCKSLIDE_ANIMATION_PROFILE = {
  ...ROCK_SLIDE_ANIMATION_PROFILE,
  hitFlashAnchorAge: 327, // RAM tick 2245 (healthbox wobble's own first +1 write) - pressTick(1919), +1 for the PNG(t)=RAM(t-1) capture lag `TURN1_OFF_STATS_BANNER_BG1_Y_ANCHOR_DELAY`'s own doc establishes
};


/** Murkrow's own mon sprite goes invisible the SAME tick the ball spawns (`AnimFlyBallUp`'s own two-line body) and stays that way PERSISTENTLY (this turn's own charge half never un-hides it; `STATUS3_ON_AIR`'s later set at 17913 keeps it hidden into the settled turn-15 menu for an independent, cross-boundary reason - docs/turn14-notes.md's own §5(c)). */
export function turn14MurkrowInvisible(t: number): boolean {
  return t - 1 >= TURN14_FLY_BALL_RAM_START;
}



/** "Foe MURKROW flew\nup high!" (`gFirstTurnOfTwoStringIds[B_MSG_TURN1_FLY]`) uses the ordinary one-character-per-frame printer, but its first visible glyph is render tick 17823. Fresh per-glyph diffs show the former 17822 anchor led the oracle by exactly one character (the three space ticks were consequently already exact); the completed string remains exact at 17846. */
export const turn14FlyupLine1 = lazyValue(() => canonicalOpponentFlyResolution().chargeLines[0]!);


export const turn14FlyupLine2 = lazyValue(() => canonicalOpponentFlyResolution().chargeLines[1]!);




/** "ONIX used\nDRAGONBREATH!" (Onix's own second-half kickoff, no button press - reuses `ROCK_SLIDE_LINE1`/`DRAGONBREATH_KICKOFF_LINE2` verbatim, the SAME strings turn 13's own re-targeted DRAGON_BREATH already established). Literal start tick, oracle-pixel-bisected: settle pinned at 17949, 22 total chars, first-char tick = 17949-21 = 17928 (this tick's own sha is shared with `TURN14_MISSED_TEXT_START_TICK`'s own first-char tick below - both lines start with "ONIX", not a coincidence, both render pixel-identically for their shared first glyph). */
export const TURN14_DRAGONBREATH_TEXT_TOTAL = ROCK_SLIDE_LINE1.length + DRAGONBREATH_KICKOFF_LINE2.length;




/** "ONIX's\nattack missed!" (`STATUS3_ON_AIR`'s own auto-miss, §5b) - reuses `TURN8_MISS_LINE1`/`TURN8_MISS_LINE2` verbatim (the SAME `"{B_ATK_NAME_WITH_PREFIX}'s\nattack missed!"` template turn 8's own BIND-miss and turn 12's own ROCK_SLIDE-miss already established). Literal start tick, oracle-pixel-bisected: settle pinned at 18005, `TURN8_MISS_TEXT_TOTAL`(20) total chars, first-char tick = 18005-19 = 17986. */


/** Same 1-char/tick mechanism every other message window in this file uses - a small local helper since this window's three texts are each literal-anchored (no shared pressTick-relative formula). */
export function turn14SimpleVisibleChars(t: number, start: number, total: number): number {
  if (t < start) return 0;
  return Math.min(total, t - start + 1);
}



/**
 * `turn13KickoffBounceTick`'s own turn-14 analogue, in switchin-reset space
 * (`drawTurn13SwitchinFieldBase`'s own domain via `TURN13_SWITCHIN_RESET_
 * SHIFT` - turn 14 needs NO fresh regime reset, unlike the switch-in itself:
 * no new mon comes out this turn) - freezes at `TURN5_SITRUS_MENU_REDRAW_
 * TICK` itself, "local phase 0" by construction (the same identity
 * `turn13KickoffBounceTick`'s own doc already establishes: evaluating the
 * switchin-reset shift AT its own defining anchor, `TURN13_SWITCHIN_MENU_
 * REDRAW_TICK`, yields exactly `TURN5_SITRUS_MENU_REDRAW_TICK`).
 */
export function turn14KickoffBounceTick(t: number, pressTick: number): number {
  if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) return t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT + TURN13_SETTLED_BOUNCE_PHASE_SHIFT;
  return TURN5_SITRUS_MENU_REDRAW_TICK;
}



/** "Foe MURKROW used\nFLY!" - reuses `TURN14_FLYUP_LINE1`'s own string shape (no new asset), FLY's own display name for line 2. Oracle-pixel-bisected exact (dense sha-transition probe, boundary (i) this session): first char 19007, 20 total chars (16+4) - independently confirmed by BOTH of the space characters producing a "no visible change" repeat tick exactly where the formula predicts (chars 3->4, the space after "Foe", at ticks 19009/19010; chars 11->12, the space after "MURKROW", at ticks 19017/19018) - not just fit to the settle tick. */
export const turn15FlyStrikeLine1 = lazyValue(() => canonicalOpponentFlyResolution().strikeLines[0]!);


export const turn15FlyStrikeLine2 = lazyValue(() => canonicalOpponentFlyResolution().strikeLines[1]!);




/** Same 1-char/tick mechanism every other message window in this file uses. */
export function turn15SimpleVisibleChars(t: number, start: number, total: number): number {
  if (t < start) return 0;
  return Math.min(total, t - start + 1);
}



/**
 * Onix's own mon sprite (slot 6) `invisible` flag is RAM-true 19042-19081
 * (spanning the ball's whole flight plus the impact sprite's own lead-in) -
 * BUT oracle pixels prove Onix stays visibly ON SCREEN, unchanged,
 * throughout that whole span (dense re-check this session, e.g. render
 * 19050: oracle shows Onix's ordinary silhouette, byte-identical to the
 * settled baseline - NOT hidden). This is `FlyUnleash`'s own `monbg
 * ANIM_DEF_PARTNER` at work (`data/battle_anim_scripts.s:6412`): the real
 * OBJ sprite is swapped for a BG-layer-composited copy (the same "convert
 * to BG so `setalpha`'s own OBJ<->BG blend can apply" trick
 * `battle-move-anim-tables.json`'s own `doubleTeam` entry documents
 * elsewhere in this file) - the OBJ-level `invisible` bit hides the
 * now-redundant original sprite while the BG copy renders the identical
 * pixels in its place, so this window needs NO visibility change at the
 * engine level (only the LATER, genuine hit-flash toggle - RAM 19107
 * onward, once `clearmonbg`'s own BG-copy teardown has happened - actually
 * suppresses pixels). Not independently source-traced past the script
 * read above (§6f's own "pure wiring reusing the standard hit-flash
 * family" flag, function-name-level confirmation of the toggle itself
 * still open) - toggle shape modeled literally from RAM: 4 distinct
 * ~4-tick invisible pulses (19107-110/115-118/123-126/131-134), settling
 * visible for good at 19135.
 */



export function turn15StrikeTargetInvisible(t: number, pulseStartTick: number, pulseEndTick: number, pulsePeriod: number): boolean {
  const ramTick = t - TURN15_STRIKE_RENDER_LAG;
  if (ramTick < pulseStartTick) return false;
  if (ramTick <= pulseEndTick) return Math.floor((ramTick - pulseStartTick) / pulsePeriod) % 2 === 0;
  return false;
}



/**
 * Murkrow's own mon sprite (slot 5) flips `invisible->false` at RAM 19075,
 * the SAME tick the ball sprite is destroyed (`AnimFlyBallAttack_Step`'s
 * own source-code branch, both in the same `if` block - RAM-confirmed
 * simultaneous, §6b).
 */

export function turn15StrikeAttackerInvisible(t: number, revealTick: number): boolean {
  return t - TURN15_STRIKE_RENDER_LAG < revealTick;
}



/**
 * Onix's own `x2` shake, `AnimTask_ShakeMon`'s own instance from
 * `FlyUnleash`'s script (`createvisualtask AnimTask_ShakeMon, 5,
 * ANIM_TARGET, 6, 0, 8, 1`) - literal RAM-truthed set (same "no formula
 * fitting" convention as `TURN15_FLY_BALL_TABLE`, mirroring
 * `TURN9_EP1_ONIX_SHAKE_RENDER_OFFSETS`'s own shape): `x2=6` for RAM
 * 19069-19070/19073-19074/19077-19078 (three 2-tick pulses), `0`
 * everywhere else - oracle-pixel-caught this session (without it, the
 * hitsplat's own live-fb blend target reads Onix's UNSHIFTED body color,
 * mismatching by ~1600px for 6 of the hitsplat's 9 live ticks).
 */

export const TURN15_ONIX_SHAKE_RAM_TICKS: ReadonlySet<number> = new Set([19069, 19070, 19073, 19074, 19077, 19078]);


export function turn15StrikeTargetShakeX2(t: number, magnitude: number, ramTicks: ReadonlySet<number>): number {
  return ramTicks.has(t - TURN15_STRIKE_RENDER_LAG) ? magnitude : 0;
}



/**
 * The hit-flash's own companion healthbox wobble (`DoHitAnimHealthboxEffect`,
 * `src/pokeball.c:1284-1291`) - a SEPARATE mechanism from the sprite
 * invisible toggle above, same two-independent-effects shape
 * `turn9Ep2HealthboxWobbleY2`/`turn9Ep2OnixInvisible` already established
 * (turn 9's own `-1` RAM-tick offset between the two: healthbox starts one
 * tick before the sprite flicker). Oracle-pixel-bisected this session (not
 * assumed from turn 9's own constant): diff starts render 19107, ends
 * render 19127 (20 ticks, matching turn 9's own 20-tick span, not the
 * generic doc entry's "21 ticks") - RAM start = 19107 - `TURN15_STRIKE_
 * RENDER_LAG` - 1 = 19105... but the ALREADY-established render-lag
 * convention (`ramTick = t - TURN15_STRIKE_RENDER_LAG`) applied to the
 * render window directly gives RAM 19106-19125, one tick before the
 * flicker's own RAM 19107 start - exactly turn 9's own offset.
 */


export function turn15StrikeTargetHealthboxWobbleY2(t: number, wobbleStartTick: number, wobbleTicks: number): number {
  const ramTick = t - TURN15_STRIKE_RENDER_LAG;
  const n = ramTick - wobbleStartTick;
  if (n < 0 || n >= wobbleTicks) return 0;
  return n % 2 === 0 ? 1 : -1;
}



/**
 * Murkrow's own FLY strike-half kickoff text, "Foe MURKROW used\nFLY!"
 * (docs/turn15-notes.md §4). Unlike every prior turn's own kickoff (a real
 * confirm-to-bare-scene transient gap before text starts, e.g. `turn14Bare
 * SceneStartTick`), this turn's own FIGHT submenu chrome stays on screen
 * UNCHANGED all the way through the tick before the text's own first glyph
 * (oracle-pixel-confirmed dense sha-transition probe, boundary (i) this
 * session: `6fabb2bc7338`-family submenu chrome holds byte-identical through
 * 19006, then hard-cuts directly to the first glyph at 19007 - no
 * intervening blank-box tick at all) - so `drawTurn15FightSubmenuWindow`
 * itself gates straight on `TURN15_FLY_STRIKE_TEXT_START_TICK`, and this
 * function only ever renders from that tick on. Onix's own on-field bounce
 * stays FROZEN throughout (`turn15KickoffBounceTick`, same rule every prior
 * turn's own resolution window establishes). Boundary (ii) (this session):
 * the strike animation core - ball descent, Onix's own invisible/hit-flash
 * windows (plus the hit-flash's own companion healthbox wobble), the
 * impact sprite, and Murkrow's own re-reveal at 19075 - layers on top of
 * the same field base via `onixInvisible`/`murkrowInvisible`/
 * `healthboxY2Extra`.
 */
/**
 * Onix's own HP-bar drain (4->0), the player-side HP-digit/band overlay
 * machinery `endeavorHp`/`turn9Hp` already establish (1 HP/tick,
 * clamped both ends) - already validated across the WHOLE 0-117 domain
 * (ISSUES #16 history: the yellow/red bands, the hp=1 red sliver, the
 * truly-empty bar), so this turn just plugs in the real start/end values.
 * Oracle-pixel-bisected exact this session (dense capture 19140-19160
 * against `turn15-fly-strike.json`'s own committed button script): HP
 * reads 4/117 through 19141 (matching boundary (ii)'s own stopping point),
 * then steps down exactly 1/tick - 3 (19142), 2 (19143), 1 (19144), 0
 * (19145) - settling 2 ticks BEFORE RAM's own atomic hp0 write (19147,
 * §3) - the same "pixel drain settles ahead of the RAM commit" shape
 * already flagged as an open item in docs/turn15-notes.md §5(a) (this
 * turn's own faint-sink delay), not a new render-lag family.
 */

export function turn15StrikeTargetHp(t: number, startHp: number): number {
  const d = t - TURN15_HP_DRAIN_START_TICK;
  return Math.max(0, startHp - Math.max(d, 0));
}



/**
 * "It's not very effective..." (FLYING vs. Onix's ROCK/GROUND typing, 0.5x
 * - docs/turn15-notes.md §3) - `TURN9_NOTVERYEFFECTIVE_LINE`'s own single-
 * line asset reused VERBATIM (identical string, no new text), same
 * `turn15SimpleVisibleChars` 1-char/tick mechanism every other message in
 * this turn's own window already uses. Start tick oracle-pixel-bisected
 * exact (dense capture 19145-19155): the kickoff text ("Foe MURKROW used
 * \nFLY!") holds unchanged through 19150 (matching docs/turn15-notes.md
 * §4's own "19150" citation for this text's FIRST sha, which turns out to
 * still be the OLD kickoff text, not this one), hard-cutting to this
 * message's own first glyph at 19151 - independently cross-checked by the
 * total length (24 chars): 19151+24-1 = 19174, exactly matching §6a's own
 * corrected "held window starts at 19174" finding, not just fit to one
 * boundary.
 */


/**
 * Onix's own player-side faint sink (docs/turn15-notes.md §10, closing
 * ISSUES #36) - a pure linear top-down wipe, oracle-pixel-fit directly
 * (dense per-tick crop-diff of Onix's own 64x64 back-sprite bbox against
 * `battle1-turn15-dense.json`'s own already-committed run): full sprite
 * visible through the last tick of the held "not very effective..." text
 * (19308), then 5 PIXEL rows erase from the top each following tick -
 * `drawSpriteSheetTopClipped`'s own doc has the "genuinely different from
 * the opponent-side family" finding. Fully gone (skip exceeds the sprite's
 * own 64px height) from tick 19321 on - the last tick with any visible
 * sliver is 19320 (skip=60, a 4px remainder).
 */


export function turn15FaintSinkSkipRows(t: number, sinkStartTick: number, sinkRate: number): number {
  return Math.max(0, sinkRate * (t - sinkStartTick));
}




export const TURN16_FAINT_ATTACK_TEXT_TOTAL = TURN16_FAINT_ATTACK_LINE1.length + TURN16_FAINT_ATTACK_LINE2.length;




export const TURN16_FIRE_PUNCH_TEXT_TOTAL = TURN16_FIRE_PUNCH_LINE1.length + TURN16_FIRE_PUNCH_LINE2.length;



export function turn16PartyElapsedAtTick(partyElapsed: number, t: number, anchorTick: number): number {
  return partyElapsed - (t - anchorTick);
}




export const TURN17_LOSS_TEXT_TOTAL =
  TURN17_LOSS_LINE1.length + TURN17_LOSS_LINE2.length;

import { createBattle2CommandAdapterResolution } from "./battle2CommandAdapter.ts";
import { TURN6_SUPER_EFFECTIVE_LINE } from "./battleMenu.ts";
import menuIdleOnixBounceAsset from "../assets/gen/menu-idle-onix-bounce.json" with { type: "json" };
import menuIdleHealthboxBounceAsset from "../assets/gen/menu-idle-healthbox-bounce.json" with { type: "json" };
import { lazyValue } from "./lazyValue.ts";

// --- slice 4 batch 1: leaves whose canonical-only deps already moved ---


export const menuIdleOnixBounce = menuIdleOnixBounceAsset as MenuIdleBounceTwoStateAsset;


export const menuIdleHealthboxBounce = menuIdleHealthboxBounceAsset as MenuIdleBounceTwoStateAsset;



/**
 * ONIX's ROCK SLIDE HP boundary for KABUTO, sourced from the real kernel
 * resolution (battle2CommandAdapter.ts) instead of formerly-hardcoded
 * battle2Turn1.ts constants -- same `{from, to}` shape every other turn
 * window's own `rockSlideOpponentHp` boundary constant uses.
 */
export const battle2Turn1KabutoRockSlideHp = lazyValue(() => {
  const resolution = createBattle2CommandAdapterResolution(battle2Turn1Kernel());
  const hpCommand = resolution.segments[0]!.commands.find(
    (command) => command.type === "hp" && command.battler === 1,
  );
  if (!hpCommand || hpCommand.type !== "hp") {
    throw new Error(
      "battle2CommandAdapter: expected KABUTO's ROCK SLIDE hp command",
    );
  }
  return { from: hpCommand.from, to: hpCommand.to };
});



/** Visible character count (0..DRAGONBREATH_KICKOFF_TEXT_TOTAL) of "ONIX used\nDRAGONBREATH!" at absolute trace tick `t` - same 1-tick/char mechanism as `turn2KickoffTextVisibleChars`. Oracle-confirmed exact (docs/dragon-breath-notes.md): tick 3157 (start+20) is the last still-increasing frame (21 chars), tick 3158 (start+21) shows all 22 and holds flat through 3176. */
export function dragonBreathTextVisibleChars(t: number, pressTick: number, startDelay: number = DRAGONBREATH_TEXT_START_DELAY): number {
  const start = dragonBreathTextStartTick(pressTick, startDelay);
  if (t < start) return 0;
  return Math.min(DRAGONBREATH_KICKOFF_TEXT_TOTAL, t - start + 1);
}


export const grovyleFaintSinkSteps = lazyValue(() => grovyleFaintSink().steps);



/** Grovyle's own opponent healthbox vanishes entirely 2 ticks after the sink's own last visible erase-step (`GROVYLE_FAINT_SINK_START_TICK + 2*GROVYLE_FAINT_SINK_STEPS + 3` = 6521) - pixel-confirmed this session (dense oracle sweep of the healthbox's own crop: byte-identical bare background from tick 6521 on, a 7064px whole-healthbox-region diff the tick before). A distinct UI element from the sprite sink above (different screen region), not itemized in docs/faint-switch-notes.md §3/§7 - this session's own re-probe answers the brief's own "what happens to Grovyle's healthbox" question directly. ISSUES #39 rank-3 flip: `healthboxVanishFrame` is now the SAME generic formula's own output (`GROVYLE_FAINT_SINK.healthboxVanishFrame`), not an independently re-stated `+19`. */
export const grovyleHealthboxVanishTick = lazyValue(() => GROVYLE_FAINT_SINK_START_TICK + grovyleFaintSink().healthboxVanishFrame);



/**
 * S7 slice M-5 (docs/faint-switch-notes.md §15): "ONIX's SITRUS BERRY\n
 * restored health!" (`STRINGID_ITEMHEALHP_BERRY`'s own two-line wrap) -
 * pixel-confirmed this session via a full oracle diff scan of `battle1-
 * sitrus-ext.json` (not committed - a scratch extension of `turn5-sitrus-
 * b.json`'s own script with idle padding to 7325): text box redraw (a
 * 1206px jump, not a char-sized delta) at render tick **7078**, then
 * exactly 1 visible-char-count/tick through **7112** (35 diffs total,
 * matching the string's own 19+16 length exactly, silent-but-charged
 * spaces at chars 6/13/27 landing on the three flat ticks the scan found
 * in between, 7084/7091/7105 - same mechanism/cadence as every other
 * message in this dossier). Held flat 7112 through **7215** (104 ticks,
 * matching §11's own "held" note, now bounded exactly) - the HP bar climbs
 * DURING this hold (`turn5SitrusOnixHp` below), not after it. ISSUES #39
 * rank-3 flip: line content is now `TURN5_SITRUS.healLines`, the real
 * `STRINGID_PKMNSITEMRESTOREDHEALTH` resolution, not an independently
 * re-stated literal pair.
 */
export const turn5SitrusHealLine1 = lazyValue(() => turn5Sitrus().healLines[0]!);


export const turn5SitrusHealLine2 = lazyValue(() => turn5Sitrus().healLines[1]!);



/**
 * The message box goes blank (box stays, no text - same shape as every
 * other turn-end transition in this file) at render tick **7216**, then
 * hard-cuts to the interactive action menu at **7222** - both pixel-
 * confirmed this session (full-frame diffs of 1127px then 5983px at
 * exactly these ticks, the scan's own "big jump then HUGE jump" - a
 * message-box-close-then-menu-reveal pair, not one atomic transition).
 */



/**
 * Onix's own HP climb, 1->31 (`§2`'s pinned heal formula) - RAM-truthed
 * indirectly via a byte-exact PNG crop match against `composePlayerHealth
 * boxHpOverlay`'s own render for every candidate hp 1-31 (`tools/compare/
 * scratch/sitrus_hp_climb_match.mjs`, not committed): **1 HP unit per
 * tick**, starting render tick **7180** (hp=2) through **7209** (hp=31,
 * settled) - 0px residual at every one of the 30 climbing ticks plus every
 * held tick through 7325 once yOffset (`menuIdleBounce`'s own healthboxY2,
 * see `turn5SitrusResettledBounceTick`) is accounted for. This is a real,
 * useful correction to §11's own "HP digits/bar still climbing past 7306"
 * hedge: they're NOT still climbing - hp is flat at 31 from 7209 on, and
 * every later pixel change in that region is purely the ordinary idle-
 * bounce y-shift (confirmed by re-matching at 9 candidate yOffsets: exact
 * 0-diff hits at yOffset 0/1/2 only, matching `menuIdleBounce`'s own
 * 0..2 range, never a different hp). ISSUES #39 rank-3 flip: the endpoints
 * are now `TURN5_SITRUS.hp.from`/`.to`, the real staged Sitrus proc's own
 * HP-change event, not independently re-stated literals.
 */
export const turn5SitrusHealHpStart = lazyValue(() => turn5Sitrus().hp.from);


export const turn5SitrusHealHpEnd = lazyValue(() => turn5Sitrus().hp.to);



/**
 * ISSUES #26 (docs/faint-switch-notes.md §16): the Sitrus proc's expanding
 * THIN_RING (`gThinRingExpandingSpriteTemplate`, `gSprites[4]`,
 * `matrixNum=2`) - RAM ground truth from the dedicated probe
 * (`tests/fixtures/data/turn5-sitrus-ring-probe.json`, twice-run byte-identical,
 * all 32 live ticks match this closed form with zero mismatches). Unlike
 * `onixSitrusRotateMatrix` above, this matrix is a pure isotropic scale
 * (`b=c=0` always, `a=d` always) - never a rotation - so it does NOT
 * inherit that mechanism's own +2 render lag (rotation-matrix-specific,
 * per §13's own rationale and §29's independent confirmation it doesn't
 * generalize); this one uses the dossier's ordinary **+1** lag instead
 * (`TURN5_SITRUS_RING_RENDER_LAG` above), verified pixel-exact with zero
 * fitted parameters at two sample ticks (6/6 opaque px at render 7042,
 * 92/92 at render 7048). Center `(72,88)` is RAM-constant for the sprite's
 * whole life (the ring's own sprite x/y directly - 8px below
 * `onixSitrusRotateMatrix`'s own call-site center, from
 * `AnimSpriteOnMonPos`'s mon-pic Y offset that Onix's own hardcoded
 * rotation call never applies) - species-dossier slice 7: now
 * `TURN5_SITRUS.onFieldCenter`, `turn5ResolutionAdapter.ts`'s own adapter-
 * owned fact, not an independently hand-derived literal here.
 */
export const turn5SitrusRingCenter = lazyValue(() => turn5Sitrus().onFieldCenter);



/** Visible character count (0..TURN6_FEATHERDANCE_TEXT_TOTAL) of "Foe PIDGEOTTO used\nFEATHERDANCE!" at absolute trace tick `t` - same 1-tick/char mechanism as `turnKickoffTextVisibleChars`, calibrated start (`turn6FeatherDanceTextStartTick`). */
export function turn6FeatherDanceTextVisibleChars(t: number, pressTick: number): number {
  const start = turn6FeatherDanceTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(TURN6_FEATHERDANCE_TEXT_TOTAL, t - start + 1);
}



export function turn9QuickAttackTextVisibleChars(t: number, pressTick: number): number {
  const start = turn9QuickAttackTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(TURN9_QUICKATTACK_TEXT_TOTAL, t - start + 1);
}



export function turn9NotVeryEffectiveTextVisibleChars(t: number, pressTick: number): number {
  const start = turn9NotVeryEffectiveTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(TURN9_NOTVERYEFFECTIVE_LINE.length, t - start + 1);
}



export function turn9SuperEffectiveTextVisibleChars(t: number, pressTick: number): number {
  const start = turn9SuperEffectiveTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(TURN6_SUPER_EFFECTIVE_LINE.length, t - start + 1);
}



export function turn10AerialAceTextVisibleChars(t: number, pressTick: number): number {
  const start = turn10AerialAceTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(TURN10_AERIALACE_TEXT_TOTAL, t - start + 1);
}


export function turn10NotVeryEffectiveTextVisibleChars(t: number, pressTick: number, delay: number = TURN10_NOTVERYEFFECTIVE_TEXT_DELAY): number {
  const start = turn10NotVeryEffectiveTextStartTick(pressTick, delay);
  if (t < start) return 0;
  return Math.min(TURN9_NOTVERYEFFECTIVE_LINE.length, t - start + 1);
}


export function turn10SuperEffectiveTextVisibleChars(t: number, pressTick: number, delay: number = TURN10_SUPER_EFFECTIVE_TEXT_DELAY): number {
  const start = turn10SuperEffectiveTextStartTick(pressTick, delay);
  if (t < start) return 0;
  return Math.min(TURN6_SUPER_EFFECTIVE_LINE.length, t - start + 1);
}


export function turn11AtkFloorTextVisibleChars(t: number, pressTick: number): number {
  const start = turn11AtkFloorTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(turn11AtkfloorTextTotal(), t - start + 1);
}


export function turn11SuperEffectiveTextVisibleChars(t: number, pressTick: number, delay: number = TURN11_SUPER_EFFECTIVE_TEXT_DELAY): number {
  const start = turn11SuperEffectiveTextStartTick(pressTick, delay);
  if (t < start) return 0;
  return Math.min(TURN6_SUPER_EFFECTIVE_LINE.length, t - start + 1);
}


export const turn14FlyupTextTotal = lazyValue(() => turn14FlyupLine1().length + turn14FlyupLine2().length);


export const turn15FlyStrikeTextTotal = lazyValue(() => turn15FlyStrikeLine1().length + turn15FlyStrikeLine2().length);

// --- slice 4 batch: verbatim move ---

export const turn5FaintedLines = lazyValue(resolveTurn5FaintWindowLines);

export const turn5FaintedTextTotal = lazyValue(() => turn5FaintedLines()[0].length + turn5FaintedLines()[1].length);

export const turn5FaintedCursorStartDelay = lazyValue(() => TURN5_FAINTED_TEXT_DELAY + turn5FaintedTextTotal() + 1);

export function turn5RockSlideKoDismissEligible(t: number): boolean {
  return t >= TURN5_ROCKSLIDE_PRESS_TICK + turn5FaintedCursorStartDelay();
}

/**
 * Live-pinned this session (docs/turn5-resolve-ab-pools-diagnosis.md §11.1's
 * own hand-derived `-2` was off by one - a fresh `npm run compare -- turn5-
 * resolve-off-b` isolated a CONSTANT 24px mismatch across the entire frozen
 * tail 6561-6613, matching §6a's own "1 phase step off" magnitude exactly).
 * `turn5FaintDismissElapsed` lands at render tick 6561 (confirmed via a
 * temporary debug print, matching the RAM accept-edge tick exactly); the
 * real cursor freezes at `cursorState`'s own already-correct value for
 * NATURAL tick 6560 (the highest `t-1` input the free-running formula
 * produces before the freeze - render tick 6560 itself, one tick before the
 * accept edge, is already independently confirmed exact via the unbroken
 * match run 6418-6560). Clamping at `landingTick - 1` (not `- 2`) reproduces
 * that value for every later tick - re-verified 196/196 exact against
 * resolve-off-b's FULL window and unchanged 195/196 against resolve-off-c
 * (see PROGRESS.md for the landing session's own numbers).
 */
export const TURN5_FAINT_DISMISS_FREEZE_TICK_OFFSET = 1;

export function faintSinkRowsAndY2(t: number, startTick: number = GROVYLE_FAINT_SINK_START_TICK, steps: number = grovyleFaintSinkSteps()): { keptRows: number; y2: number } {
  const d = t - 1 - startTick;
  if (d <= 0) return { keptRows: steps, y2: 0 };
  const k = Math.min(steps, Math.ceil(d / 2));
  return { keptRows: steps - k, y2: k * 8 };
}

export function playerSummaryEvaOffset(
  playerVisualT: number,
  encounter: BattleSceneState["encounter"],
): number {
  return encounter === "jenson"
    && playerVisualT - BRENDAN_THROW_START_TICK === SUBSEQUENT_BATTLE_SUMMARY_EVA_PHASE_AGE
    ? -1
    : 0;
}

// --- slice 4 batch 3: verbatim move ---

export const turn4DoubleteamKickoffLines = lazyValue(resolveTurn4DoubleTeamKickoffLines);

export const turn8BindLines = lazyValue(resolveTurn8BindKickoffLines);
export const turn8MissLines = lazyValue(resolveTurn8MissLines);

export const turn8BindTextTotal = lazyValue(() => turn8BindLines()[0].length + turn8BindLines()[1].length);

export const turn8MissTextTotal = lazyValue(() => turn8MissLines()[0].length + turn8MissLines()[1].length);

export const turn2EndeavorAttackLines = lazyValue(resolveTurn2EndeavorAttackLines);

export const turn5EndeavorAttackLines = lazyValue(resolveTurn5EndeavorAttackLines);

export const turn13SandattackEventLines = lazyValue(resolveTurn13SandAttackKickoffLines);
export const turn13SandattackTextTotal = lazyValue(() => turn13SandattackEventLines()[0].length + turn13SandattackEventLines()[1].length);

export const turn13AccfellEventLines = lazyValue(resolveTurn13AccFellLines);
export const turn13AccfellTextTotal = lazyValue(() => turn13AccfellEventLines()[0].length + turn13AccfellEventLines()[1].length);

export const turn1RockslideKickoffLines = lazyValue(resolveTurn1DoubleTeamKickoffLines);
export const turn1RockslideAttackLines = lazyValue(resolveTurn1RockSlideAttackLines);

// --- slice 4 batch 4: verbatim move ---

export const turn6FeatherdanceKickoffLines = lazyValue(resolveTurn6FeatherDanceKickoffLines);

export const turn6AtkfellKickoffLines = lazyValue(resolveTurn6AtkFellLines);

export const turn7FeatherdanceKickoffLines = lazyValue(resolveTurn7FeatherDanceKickoffLines);
export const turn7AtkfellKickoffLines = lazyValue(resolveTurn7AtkFellLines);

export const turn8FeatherdanceKickoffLines = lazyValue(resolveTurn8FeatherDanceKickoffLines);
export const turn8AtkfellKickoffLines = lazyValue(resolveTurn8AtkFellLines);

export const turn6RockslideAttackLines = lazyValue(resolveTurn6RockSlideAttackLines);

export const turn7RockslideAttackLines = lazyValue(resolveTurn7RockSlideAttackLines);

export function turn5FaintedTextVisibleChars(t: number, pressTick: number): number {
  const start = turn5FaintedTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(turn5FaintedTextTotal(), t - start + 1);
}

export function turn8BindTextVisibleChars(t: number, pressTick: number): number {
  const start = turn8BindTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(turn8BindTextTotal(), t - start + 1);
}

export function turn8MissTextVisibleChars(t: number, pressTick: number): number {
  const start = turn8MissTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(turn8MissTextTotal(), t - start + 1);
}

export function turn12MissTextVisibleChars(t: number, pressTick: number): number {
  const start = turn12MissTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(turn8MissTextTotal(), t - start + 1);
}

export function turn13SandAttackTextVisibleChars(t: number, pressTick: number): number {
  const start = turn13SandAttackTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(turn13SandattackTextTotal(), t - start + 1);
}

export function turn13AccFellTextVisibleChars(t: number, pressTick: number): number {
  const start = turn13AccFellTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(turn13AccfellTextTotal(), t - start + 1);
}

// --- slice 4 batch 5 (docs/battlescene-canonical-split-design.md §6, ISSUES #39 rank-5) ---

/**
 * `cursorState`'s own `t-1` display-basis input for turn 5's fainted-message
 * wait-cursor, freeze-aware (docs/turn5-resolve-ab-pools-diagnosis.md §11.1,
 * `TURN5_FAINT_DISMISS_FREEZE_TICK_OFFSET`'s own doc comment for the live-
 * pinned offset derivation). `dismissTick` is the absolute trace tick the
 * real per-session A edge landed at (`TICK0 + turn5FaintDismissElapsed`),
 * `null` before that edge is ever seen - the free-running natural tick then
 * passes straight through, matching every tick up to and including the last
 * live phase transition.
 */
export function turn5FaintDismissCursorTick(t: number, dismissTick: number | null): number {
  const naturalTick = t - 1;
  return dismissTick === null
    ? naturalTick
    : Math.min(naturalTick, dismissTick - TURN5_FAINT_DISMISS_FREEZE_TICK_OFFSET);
}

/**
 * `docs/turn5-resolve-offc-tail-diagnosis.md` §4d (2026-08-18, ISSUES #97
 * remainder): turn 5's OWN Pidgeotto switch-in needs a different peak-hold
 * length than the shared `TURN5_BG_FADE_Y` above - direct pixel comparison
 * against the oracle (§4c) found this window's falling edge stepping down
 * one render tick too early at every boundary (6768/6772/6776/6780); one
 * more held-16 entry (8->9) shifts the whole falling edge one tick later,
 * matching that doc's own pixel-derived ground truth. Deliberately a
 * SEPARATE table, not an edit to `TURN5_BG_FADE_Y` itself - extending the
 * shared table regressed `turn13-switchin` 242/242 -> 234/242 (oracle-
 * confirmed this session), so Murkrow's own turn-13 window really does
 * need the original 8-entry hold while Pidgeotto's turn-5 window needs 9.
 */
export const TURN5_PIDGEOTTO_BG_FADE_Y: readonly number[] = [
  2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, 2, 2,
];
export function turn5BgFadeY(t: number): number {
  return TURN5_PIDGEOTTO_BG_FADE_Y[t - TURN5_BG_FADE_START_TICK] ?? 0;
}

/**
 * ISSUES #97 remainder residual (B) (`docs/turn5-confirmb-resolved-
 * residuals.md` §2.3): a turn5-off-scoped sibling of
 * `turn5SitrusHealTextVisibleChars` above, anchored at the already-correct
 * `TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK` (6850) instead of the stale
 * `ONIX_SITRUS_IDENTITY_RENDER_TICK`-derived epoch, using the same `t-1`/
 * one-char-per-tick shape residual (A)'s own `rockSlideTextVisibleChars`
 * fix established (`drawTurn6FieldBase`'s own doc comment on the codebase's
 * standard display-basis convention). Predicts full reveal (35 chars) at
 * exactly t=6885, matching the given ground truth ("settles 6885") with
 * zero fitting - independent confirmation of both the anchor and the shape.
 * A new function rather than an override param on the existing one: this
 * call site (`drawTurn5RockSlideWindow`) is the only caller of the OLD
 * function too, so either shape is safe, but a new function keeps the
 * change minimal and obviously scoped (same reasoning as `turn5OffSitrusOnixHp`
 * below).
 */
export function turn5SitrusOffHealTextVisibleChars(t: number): number {
  const total = turn5SitrusHealLine1().length + turn5SitrusHealLine2().length;
  return Math.min(total, Math.max(0, (t - 1) - TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK + 1));
}

/**
 * ISSUES #97 remainder residual (B) (`docs/turn5-confirmb-resolved-
 * residuals.md` §2.2/§8): a turn5-off-scoped sibling of `turn5SitrusOnixHp`
 * above. `sitrusDisplayedHpAtAge`'s own live climb (real ON-profile rolling-
 * bar animation) never starts within this trace's window under the stale
 * epoch. The underlying RAM stat (`gBattleMons[0].hp`) IS a hard single-tick
 * STEP (`TURN5_OFF_SITRUS_ONIX_HP_JUMP_TICK`'s own doc comment) - but §8's
 * fresh oracle-vs-oracle pixel diffing found the DISPLAYED bar is not a
 * mirror of that RAM step: it's a live 1-HP/tick climb, same shape
 * `endeavorHp`/GROVYLE's own drain already use, anchored at
 * `TURN5_OFF_SITRUS_ONIX_HP_CLIMB_START_TICK`'s own doc comment (30
 * consecutive per-tick oracle pixel changes, zero skips, cap reached exactly
 * at t=6982 - independently confirmed, not curve-fit assumed). Deliberately
 * a NEW function/constant rather than editing `ONIX_SITRUS_PROC_TRIGGER_RAM_
 * TICK`/`ONIX_SITRUS_IDENTITY_RENDER_TICK` in place - that shared epoch also
 * feeds the tint/rotation and granting-star placement machinery (still
 * unverified end-to-end for this trace family, ISSUES.md #97's own open
 * remainder) - moving it risks an unverified cascade.
 */
export function turn5OffSitrusOnixHp(t: number): number {
  return Math.min(
    turn5SitrusHealHpEnd(),
    Math.max(turn5SitrusHealHpStart(), turn5SitrusHealHpStart() + (t - TURN5_OFF_SITRUS_ONIX_HP_CLIMB_START_TICK)),
  );
}

/**
 * S7 slice M (docs/faint-switch-notes.md §8e) + `docs/turn5-resolve-offc-
 * tail-diagnosis.md` §3 (2026-08-18, ISSUES #97 remainder): Pidgeotto's own
 * healthbox slide-in - bit-for-bit the same 23-step `healthboxSlideDx`
 * shape as S6's own send-out. Previously anchored at
 * `TURN5_PIDGEOTTO_SETTLE_TICK + 1` (6829) - that constant is the SPRITE's
 * own separate materialize-finish tick, not the healthbox's own onset;
 * the diagnosis's RAM probe (`dump-turn5-resolve-offc-tail-probe.py`,
 * `gHealthboxSpriteIds[1]`) pins the healthbox's own real slide-in start
 * at RAM tick 6762 (render 6763, the usual +1 RAM-to-render lag), holds
 * one extra tick, then ramps +5/tick to settle at render 6786 - hand-
 * verified bit-exact against that table (§3c).
 */
export const TURN5_PIDGEOTTO_HEALTHBOX_SLIDE_START_TICK = 6763;

/**
 * ISSUES #97-B rung 1 (`docs/turn5-bounce-recalibration-probe.md` §1/§6f):
 * turn 6's own reopen-press is the same RAM-proven "`DoBounceEffect`'s own
 * `sinIndex` FROZEN for exactly 3 ticks" hardware mechanic already known for
 * turn 5's `turn5ReopenPressTick` - this is its turn-6 sibling, previously
 * missing entirely (`drawTurn6FightSubmenuWindow`'s open-DMA-wait branch fed
 * `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` uninterrupted, advancing every tick
 * with no hold at all). Freeze that same formula's own value AT the press
 * tick for `t` in `[turn6ReopenPressTick, turn6ReopenPressTick + 2]`
 * inclusive, then resume the normal per-tick formula from `+3` onward.
 * Confirmed a provable no-op on `turn6-reopen-off.json` specifically (§6c:
 * that trace's own healthbox mismatch band is a *different*, still-open
 * ~11-tick lag local to `turn5SitrusResettledBounceTick`'s span, not this
 * hold - the freeze only matters where a plateau boundary sits inside the
 * 3-tick window, which isn't the case on that trace) - landed anyway because
 * it now matches RAM ground truth and may close other family traces whose
 * capture windows cross this exact reopen-press instant differently.
 */
export function turn6ReopenBounceTick(t: number, turn6ReopenPressTick: number): number {
  return t >= turn6ReopenPressTick && t <= turn6ReopenPressTick + 2
    ? turn6ReopenPressTick - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT
    : t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
}

/**
 * ISSUES #39 rank-5 slice 1 (docs/idle-bounce-phase-attribution.md's own
 * diagnosis, RAM-probed this session: tools/probe/dump-turn9-idle-bounce-off.py
 * against `turn9-quickattack-off.json`): turn 9's own FIGHT-submenu window
 * shares ONE real, continuous `DoBounceEffect` oscillator across both the
 * pre-reveal DMA-wait branch below (`turn8ResettledBounceTick`'s own chain)
 * and `drawTurn9FieldBase`'s regime-4 chain further down - the two reduce to
 * the IDENTICAL closed form (`TURN9_REGIME4_TO_REGIME1_SHIFT`'s own
 * construction makes them cancel to the same raw sine index), so they share
 * one correction: a flat `+205` raw-sine-index offset, with RAM holding for
 * 2 ticks (screen ticks 10830-10831 - a stray cursor-reject `A` press
 * mid-browse, this trace's own segment 82) before resuming permanently 2
 * ticks behind - the same freeze-then-permanent-lag shape ISSUES #97-B's
 * turn6-reopen fix already established (docs/turn5-bounce-recalibration-probe.md
 * §8c). Checked against the RAM receipt at both the raw-sine-index level (47
 * ticks) and the derived Y2 level (56 ticks, the full assigned residual
 * window) - zero exceptions either way.
 */
export const TURN9_FIGHT_SUBMENU_BOUNCE_FREEZE_TICK = 10829;
export const TURN9_FIGHT_SUBMENU_BOUNCE_INDEX_OFFSET = 205;

export function turn9FightSubmenuBrowseBounceTick(t: number, raw: number): number {
  if (t <= TURN9_FIGHT_SUBMENU_BOUNCE_FREEZE_TICK) return raw;
  if (t <= TURN9_FIGHT_SUBMENU_BOUNCE_FREEZE_TICK + 2) return TURN9_FIGHT_SUBMENU_BOUNCE_FREEZE_TICK - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  return raw - 2;
}

/**
 * ISSUES #39 rank-5 slice 1 (docs/idle-bounce-phase-attribution.md's own
 * diagnosis, RAM-probed this session: tools/probe/dump-turn9-idle-bounce-off.py
 * against `turn11-featherdance-off.json`): the shared onix/healthbox raw
 * sine index this early (not-yet-frozen) branch feeds `menuIdleBounce`
 * carries a flat `+114` offset off this call site's own unmodified formula -
 * RAM-receipt-exact, zero exceptions across 32 consecutive probed ticks
 * (13310-13341, spanning this trace's own live-driver span up to its
 * teardown at 13341).
 */
export const TURN11_KICKOFF_BOUNCE_INDEX_OFFSET = 114;

/**
 * ISSUES #39 rank-5 slice 1 (docs/idle-bounce-phase-attribution.md's own
 * diagnosis, RAM-probed this session: tools/probe/dump-turn9-idle-bounce-off.py
 * against `turn12-aerialace-off.json`): the shared onix/healthbox raw sine
 * index this early (not-yet-frozen) branch feeds `menuIdleBounce` carries a
 * flat `+237` offset off this call site's own unmodified formula -
 * RAM-receipt-exact, zero exceptions across 31 consecutive probed ticks
 * (14344-14374, spanning this trace's own captured window through its
 * live-driver teardown at 14375).
 */
export const TURN12_KICKOFF_BOUNCE_INDEX_OFFSET = 237;

// --- slice 4 batch 6 (docs/battlescene-canonical-split-design.md decision (a), ISSUES #39): function-body-deferred SHARED/LIVE reads ---

/** Visible character count (0..TEXT_TOTAL_CHARS) across both lines combined at trace tick `t`. */
export function textVisibleChars(
  t: number,
  encounter: BattleSceneState["encounter"] = "destin",
  trainerPresentation?: FactoryTrainerPresentation,
): number {
  const params = battleIntroEncounterParams(encounter, trainerPresentation);
  const total = params.line1.length + params.line2.length;
  if (t < params.textStartTick) return 0;
  return Math.min(total, t - params.textStartTick + 1);
}

/** Visible character count (0..35) of the "sent\nout GROVYLE!" message at trace tick `t`, given the press tick. Same 1-tick/char mechanism as `textVisibleChars` (§3.2/§7.3). */
export function sendOutTextVisibleChars(
  t: number,
  pressTick: number,
  encounter: BattleSceneState["encounter"] = "destin",
  trainerPresentation?: FactoryTrainerPresentation,
): number {
  const start = sendOutTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(
    battleSendOutEncounterParams(encounter, trainerPresentation).textTotal,
    t - start + 1,
  );
}

export function drawMessageText(
  fb: Uint8Array,
  chars: number,
  encounter: BattleSceneState["encounter"] = "destin",
  trainerPresentation?: FactoryTrainerPresentation,
): void {
  const params = battleIntroEncounterParams(encounter, trainerPresentation);
  drawMessageTextLines(fb, params.line1, params.line2, chars);
}

/**
 * First callback whose framebuffer is owned by the accepted intro A edge.
 * `PrepareStringBattle(STRINGID_INTROSENDOUT)` leaves the old message visible
 * for the printer's five setup callbacks, then clears it and exposes the
 * first new glyph. The edge itself may arrive after an arbitrarily long
 * `PAUSE_UNTIL_PRESS` hold, so this boundary is acknowledgement-relative.
 */
export function generatedBattleStartAcknowledgementVisibleStarted(
  state: FactoryBattleStartIntroState,
): boolean {
  const pressTick = generatedBattleStartPressTick(state);
  if (pressTick === null) return false;
  return generatedBattleIntroSourceClock(
    state.elapsed,
    state.sceneAssemblyDisplayLag,
  ) >= sendOutTextStartTick(pressTick);
}

/**
 * §7.23 (re-applying §7.22's verified fix): mechanism 5's own affine matrix
 * write starts 7 ticks before its original coded window (et 35, not et 42 -
 * `GROVYLE_FRONT_ANIM_START_OFFSET`, the SAME tick its front-sprite frame
 * cadence already switches, §7.17) - RAM-probed directly
 * (`tools/probe/specs/sendout-grovyle-stretch.json`, already-committed spec,
 * read further into its existing run): mechanism 4's own window is
 * shortened to match (`et < GROVYLE_FRONT_ANIM_START_OFFSET`, was `et <
 * MATERIALIZE_END_OFFSET`) - mechanism 4 never drew non-neutral pixels in
 * the newly-excluded et 35-41 gap anyway (its own tables are already dry by
 * et 30), so this only changes WHICH function renders that tail, not its
 * pixels. See `GROVYLE_STRETCH_EARLY_TABLE`'s doc comment for the other half
 * of this fix.
 */
export function drawGrovyleMaterialize(fb: Uint8Array, t: number, handoffTick: number): void {
  const et = t - handoffTick;
  if (et < MATERIALIZE_START_OFFSET || et >= GROVYLE_FRONT_ANIM_START_OFFSET) return;
  const local = et - MATERIALIZE_START_OFFSET;
  const accumulator = affineEmergeAccumulator(local + 1);
  const y2 = MATERIALIZE_Y2_TABLE[local] ?? 0;
  drawFrontBackMaterialize(fb, grovyleFrontSprite.tileset, grovyleFrontSprite.palette, GROVYLE_CORNER, { kind: "tint", accumulator, y2 });
}

export function drawKabutoMaterialize(fb: Uint8Array, t: number, handoffTick: number): void {
  const et = t - handoffTick;
  if (et < MATERIALIZE_START_OFFSET || et >= KABUTO_FRONT_ANIM_START_OFFSET) return;
  const local = et - MATERIALIZE_START_OFFSET;
  const accumulator = affineEmergeAccumulator(local + 1);
  const y2 = MATERIALIZE_Y2_TABLE[local] ?? 0;
  drawFrontBackMaterialize(fb, kabutoFrontSprite.tileset, kabutoFrontSprite.palette, KABUTO_CORNER, { kind: "tint", accumulator, y2 });
}

export function drawPlayerMaterialize(fb: Uint8Array, t: number): void {
  if (t < PLAYER_MATERIALIZE_START_TICK || t > PLAYER_MATERIALIZE_END_TICK) return;
  const local = t - PLAYER_MATERIALIZE_START_TICK;
  drawPlayerSideAffineMaterialize(fb, onixBackSprite.tileset, ONIX_MATERIALIZE_CORNER, local, PLAYER_MATERIALIZE_ACCUMULATOR_LEAD);
}

export function drawGrovyleStretch(fb: Uint8Array, t: number, handoffTick: number): void {
  const local = t - handoffTick - MATERIALIZE_END_OFFSET;
  if (local < 0) return;
  const entry = GROVYLE_STRETCH_TABLE[Math.min(local, GROVYLE_STRETCH_TABLE.length - 1)]!;
  const coeff = grovyleStretchTintCoeff(local);
  const frameOffset = t - handoffTick - GROVYLE_FRONT_ANIM_START_OFFSET;
  const frame = frontSpriteAnimFrame(battleAnimTables.grovyleFrontAnim.steps, frameOffset);
  drawFrontBackMaterialize(
    fb,
    frame === 0 ? grovyleFrontSprite.tileset : grovyleFrontSprite.frame2,
    grovyleFrontSprite.palette,
    GROVYLE_CORNER,
    { kind: "stretch", xScale: entry.xScale, yScale: entry.yScale, y2: entry.y2, tintCoeff: coeff },
  );
}

/**
 * §7.22/§7.23: the et 35-41 portion of mechanism 5 (`GROVYLE_STRETCH_EARLY_TABLE`) -
 * a separate call site, not a widened `drawGrovyleStretch` window, because it
 * must be drawn in mechanism 4's OLD slot (before `drawSendOutBall`/
 * `drawBallOpenParticles`), not mechanism 5's own later slot. §7.22 found
 * this the hard way: naively widening `drawGrovyleStretch` in its EXISTING
 * (late) call site made render 1497 WORSE (Grovyle-region diff 3px -> 114px)
 * because the ball-open particle burst (mechanism 3) is still active for et
 * 35-41 and must occlude Grovyle, same as it already correctly does through
 * mechanism 4's call site. Mechanism 5's own original window (et>=42) never
 * needed this ordering because by then the particles have mostly cleared
 * this screen region. Tint coefficient is pinned at 16 (fully tinted, same
 * as mechanism 4's own flat cutoff value) rather than `grovyleStretchTintCoeff`
 * (which assumes `local>=0`, i.e. et>=42) - RAM-confirmed separately
 * (§7.16/§7.21) that `Task_FadeMon_ToNormal`'s poll-gate doesn't start
 * decaying it until et 42 either way.
 */
export function drawGrovyleStretchEarly(fb: Uint8Array, t: number, handoffTick: number): void {
  const et = t - handoffTick;
  if (et < GROVYLE_FRONT_ANIM_START_OFFSET || et >= MATERIALIZE_END_OFFSET) return;
  const entry = GROVYLE_STRETCH_EARLY_TABLE[et - GROVYLE_FRONT_ANIM_START_OFFSET]!;
  const frameOffset = et - GROVYLE_FRONT_ANIM_START_OFFSET;
  const frame = frontSpriteAnimFrame(battleAnimTables.grovyleFrontAnim.steps, frameOffset);
  drawFrontBackMaterialize(
    fb,
    frame === 0 ? grovyleFrontSprite.tileset : grovyleFrontSprite.frame2,
    grovyleFrontSprite.palette,
    GROVYLE_CORNER,
    { kind: "stretch", xScale: entry.xScale, yScale: entry.yScale, y2: entry.y2, tintCoeff: 16 },
  );
}

/**
 * The generic stat-change banner (`General_StatsChange`,
 * `StatsChangeAnimation_Step1-3`, `src/battle_anim_utility_funcs.c:415-628` -
 * docs/battle-menu-notes.md §10a/§10c/§10d). A real BG1 layer, NOT a flat-
 * white flash (a prior session's 2-sample algebraic solve coincidentally
 * landed on white at both points it checked): `StatsChangeAnimation_Step2`
 * loads `gStatAnim_Increase_Tilemap`/`_Gfx`/`gStatAnim_Evasion_Pal` onto BG1
 * (DOUBLE_TEAM's own `EFFECT_EVASION_UP` - the only stat/direction this
 * slice wires up, per the brief's own scope; `extract-stat-anim.ts` pulls
 * the full 8-palette/2-tilemap family for future battles), and
 * `StatsChangeAnimation_Step1` sets an OBJ-WINDOW mask via a FROZEN copy of
 * Grovyle's own OAM sprite (`CreateInvisibleSpriteCopy`, `battle_anim_mons.
 * c:2323` - `objMode = ST_OAM_OBJ_WINDOW`, taken once at banner start and
 * never moved again) - exactly Grovyle's own silhouette at his current
 * (static, RAM-confirmed unmoving throughout this window) position, which is
 * why this function iterates the same `GROVYLE_CORNER`-anchored tile mask
 * `drawDoubleTeamClones` above uses, not the whole screen. Bit-exact
 * compositing per real GBA alpha-blend semantics: BG1 is TGT1 (priority 0,
 * frontmost within the window), TGT2 is ALL (whatever's already drawn -
 * Grovyle's own real, un-hidden sprite, since `drawTurnKickoffText` already
 * drew it before this runs) - blend where BG1 is opaque, else leave the
 * existing pixel raw (`statAnimBg1PixelAt`'s own `null` case).
 * `statsBannerBg1Y` (`battleMenu.ts`) reproduces `gBattle_BG1_Y`'s own
 * continuous `+3`/tick scroll bit-exact, RAM-confirmed - `gBattle_BG1_X`
 * stays 0 for a stat INCREASE (only a stat DECREASE sets it to 64, out of
 * scope this slice), so only the vertical map coordinate shifts.
 */
export function drawStatsBanner(
  fb: Uint8Array,
  t: number,
  pressTick: number,
  startDelay: number,
  endDelay: number,
  bg1YAnchorDelay: number,
): boolean {
  const eva = statsBannerEva(t, pressTick, startDelay, endDelay);
  if (eva === null) return false;
  const bg1Y = statsBannerBg1Y(t, pressTick, bg1YAnchorDelay);
  drawStatIncreaseBannerForBattler(
    fb,
    grovyleFrontSprite.tileset,
    GROVYLE_CORNER,
    eva,
    bg1Y,
  );
  return true;
}

/**
 * ISSUES #39 rank-4 slice 2 (`docs/rank4-prep-scout.md` §2.3): every real
 * canonical caller of the turn-6/7/8 stat-fall banner (`drawTurn6StatFallBanner`
 * below) is FEATHER_DANCE, which only ever drops ATK -- this asserts that
 * real per-turn fact (`resolveTurnN FeatherDanceWindowContent().statChange.stat`,
 * not a bare literal) rather than building a full seven-stat hyphenated-to-
 * camelCase translation table (`spAttack`/`spDefense` etc.) this window's own
 * real domain never exercises -- the "disproportionate new surface" §2.3
 * itself named. Replaces the former `drawStatDecreaseBannerForBattler`
 * wrapper's own hardcoded-`attack` default (same FAKE_TEARS-precedent
 * explicit-palette-at-the-call-site shape, `:23256`).
 */
export function assertFeatherDanceAttackStatPalette(stat: string): RgbColor[] {
  if (stat !== "attack") {
    throw new Error(`battleScene: FEATHER_DANCE stat-fall banner expected stat "attack", got "${stat}"`);
  }
  return statAnimBanner.palettes.attack;
}

/**
 * Battle-2 controller command phase, driven by the real kernel
 * (battle2CommandAdapter.ts) instead of a hand-built fixture. The handoff
 * age activates `action-enter`; every later phase clock is relative to the
 * corresponding legacy open/close event -- that lifecycle clock (phase/
 * phaseElapsed) and the live FIGHT cursor stay legacy-owned (A-confirm
 * timing remains on the established predecessor until a later slice owns
 * that semantic handoff); the request/field/legal-decision facts come from
 * the kernel.
 */
export function battle2CommandPresentationForRender(
  age: number,
  legacyElapsed: number,
  sm: FightSubmenuState,
): BattleCommandPresentationState {
  let phase: BattleCommandPresentationPhase;
  let phaseElapsed: number;

  if (age <= ACTION_MENU_BLANK_END_OFFSET) {
    phase = "action-enter";
    phaseElapsed = age - ACTION_MENU_BLANK_START_OFFSET;
  } else if (sm.openElapsed === null) {
    phase = "action-menu";
    phaseElapsed = age - (ACTION_MENU_BLANK_END_OFFSET + 1);
  } else {
    const openElapsed = legacyElapsed - sm.openElapsed;
    if (openElapsed < FIGHT_SUBMENU_OPEN_DELAY) {
      phase = "fight-opening";
      phaseElapsed = openElapsed;
    } else if (sm.closeElapsed === null) {
      phase = "fight-menu";
      phaseElapsed = openElapsed - FIGHT_SUBMENU_OPEN_DELAY;
    } else {
      const closeElapsed = legacyElapsed - sm.closeElapsed;
      if (closeElapsed < FIGHT_SUBMENU_CLOSE_DELAY) {
        phase = "fight-closing";
        phaseElapsed = closeElapsed;
      } else {
        phase = "action-menu";
        phaseElapsed = closeElapsed - FIGHT_SUBMENU_CLOSE_DELAY;
      }
    }
  }

  const command = createBattle2CommandAdapterCommand(battle2Turn1Kernel(), sm.cursor);
  return Object.freeze({
    ...command,
    lifecycle: Object.freeze({ phase, phaseElapsed }),
    // The legacy equivalence caller supplies its already-proven bounce
    // overlay separately; this typed adapter only dispatches window chrome.
    idleBounceElapsed: 0,
    fightDisplayCursor: sm.displayCursor,
  });
}

export function battle2Turn1BounceTick(
  t: number,
  handoffTick: number,
): number {
  return actionMenuBounceTick(t, handoffTick) - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
}

/** Draws a `MenuIdleBounceTwoStateAsset` region's `y1` patch at `y2===1`, its `y2` patch at `y2>=2`, nothing at `y2===0` - shared by both onix and healthbox regions (ISSUES #22, docs/battle-menu-notes.md §8c: both regions reach the same rare `y2=2` sine-peak state and need the same two-patch treatment, not just healthbox). */
export function drawTwoStateBounceRect(fb: Uint8Array, asset: MenuIdleBounceTwoStateAsset, y2: number): void {
  if (y2 === 1) {
    drawRect(fb, { x: asset.x, y: asset.y, width: asset.width, height: asset.height, pixels: asset.y1 });
  } else if (y2 >= 2) {
    drawRect(fb, { x: asset.x, y: asset.y, width: asset.width, height: asset.height, pixels: asset.y2 });
  }
}

/**
 * Generic sibling of the retired `drawMenuIdleBaseWithOpponentHp` (typeref-
 * retirement slice 7b, `docs/battlescene-turnN-typeref-retirement-design.md`
 * §4.1 row 7). `latest` only ever carries ONE turn's content at a time, so
 * its own `.content.field.opponent.hp.current` already IS whichever of
 * turn 1-4's own opponent HP is current - the legacy turn4-then-3-then-2-
 * then-1 readiness cascade was reconstructing this exact single fact from
 * `latest` one call frame up (§2.3), never a second independent source.
 */
export function drawMenuIdleBaseWithOpponentHpFromLatest(
  fb: Uint8Array,
  latest: LatestCompletedCommandHandoff | null,
): void {
  drawRect(fb, menuIdleBase);
  const hp = latest?.content?.field.opponent.hp.current ?? null;
  if (hp !== null) drawSendOutHealthbox(fb, 0, opponentHealthboxContentForHp(hp));
}

/**
 * Generic sibling of the retired `turn4SubmenuBounceTick` (typeref-
 * retirement slice 7b, `docs/battlescene-turnN-typeref-retirement-design.md`
 * §4.1). Turn 4's reopened submenu composes turn 3's receipt-owned
 * resettled epoch with `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`; reopening FIGHT
 * does not reset the underlying bounce task. The legacy formula's own
 * `turn3PresentationEpochElapsedSinceReset(turn3NextCommandHandoff, elapsed)`
 * read `turn3NextCommandHandoff.presentationEpoch.elapsed`, the exact same
 * fact `latestCompletedCommandPresentationEpochElapsedSinceReset` reads off
 * `latest.content.presentationEpoch.elapsed` (verified field-for-field, same
 * as `turn4KickoffBounceTickFromLatest`'s own doc one branch below).
 */
export function turn4SubmenuBounceTickFromLatest(
  t: number,
  latest: LatestCompletedCommandHandoff | null,
): number {
  const epochAge = latestCompletedCommandPresentationEpochElapsedSinceReset(latest, t - TICK0);
  if (epochAge === null) {
    throw new Error("turn-4 submenu bounce requires semantic turn-3 presentation epoch content");
  }
  return MENU_IDLE_BLANK_END_TICK + 1 + epochAge - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
}

/**
 * Generic sibling of the retired `turn4KickoffBounceTick` (typeref-
 * retirement slice 6/7b, `docs/battlescene-turnN-typeref-retirement-design.md`
 * §4.1). Same freeze-then-hold formula and the same
 * `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` offset `turn4SubmenuBounceTickFromLatest`
 * composes - `latestCompletedCommandPresentationEpochElapsedSinceReset` reads
 * `latest.content.presentationEpoch.elapsed` directly (ISSUES #39 rank-6
 * slice 4's own grid-search picked `d=11`/`pressTick - 11` as the frozen
 * plateau's center; that same freeze/hold shape is preserved verbatim here,
 * only the epoch source changed).
 */
export function turn4KickoffBounceTickFromLatest(
  t: number,
  pressTick: number,
  latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null,
): number {
  const freezeTick = pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY;
  const sourceTick = t < freezeTick ? t : pressTick - 11;
  const epochAge = latestCompletedCommandPresentationEpochElapsedSinceReset(
    latestCompletedCommandHandoff,
    sourceTick - TICK0,
  );
  if (epochAge === null) {
    throw new Error("turn-4 kickoff bounce requires semantic turn-3 presentation epoch content");
  }
  return MENU_IDLE_BLANK_END_TICK + 1 + epochAge - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
}

/**
 * Generic sibling of the retired `turn5LegacyResettledBounceTick` (typeref-
 * retirement slice 7b, `docs/battlescene-turnN-typeref-retirement-design.md`
 * §4.1). The legacy formula's own `turn4RockSlideResettledBounceTick` read
 * `turn4NextCommandHandoff.presentationEpoch.elapsed`, the exact same fact
 * `latestCompletedCommandPresentationEpochElapsedSinceReset` reads off
 * `latest.content.presentationEpoch.elapsed` (verified field-for-field, same
 * as `turn4KickoffBounceTickFromLatest`'s own doc one turn earlier).
 */
export function turn5LegacyResettledBounceTickFromLatest(
  t: number,
  latest: LatestCompletedCommandHandoff | null,
): number {
  const epochAge = latestCompletedCommandPresentationEpochElapsedSinceReset(latest, t - TICK0);
  if (epochAge === null) {
    throw new Error("turn-5 resettled bounce requires semantic turn-4 presentation epoch content");
  }
  return MENU_IDLE_BLANK_END_TICK + 1 + epochAge - TURN5_LEGACY_PRESENTATION_CONTINUATION_LAG;
}

/**
 * Generic sibling of `turn5KickoffBounceTick` for callers with no legacy-
 * typed turn-4 predecessor handoff of their own (typeref-retirement slice 7,
 * `docs/battlescene-turnN-typeref-retirement-design.md` §4.1, same shape
 * `turn4KickoffBounceTickFromLatest` established one turn earlier). The
 * `null` branch (turn 13's own switch-in echo,
 * `drawTurn13SwitchinPresentationFieldBase`, and every plain-bounceTick
 * caller of `drawTurn6FieldBase` that folds through `drawTurn5RockSlideAttack`
 * with no handoff of its own) is copied verbatim, unchanged - it is a fixed
 * formula over `t`/`pressTick`/constants only and never reads the handoff,
 * so there is nothing to generalize there. The non-null branch composes the
 * same `turn5SubmenuBounceTickFromLatest`/`turn5LegacyResettledBounceTickFromLatest`
 * chain off `latestCompletedCommandPresentationEpochElapsedSinceReset`
 * directly - the legacy `turn5KickoffBounceTick`/`turn5SubmenuBounceTick`/
 * `turn5LegacyResettledBounceTick`/`turn4RockSlideResettledBounceTick` chain
 * this sibling replaces has fully retired (typeref-retirement slice 7b) -
 * `drawFightSubmenuWindow`/`drawActionMenuIdleWindow` now call this sibling
 * directly with `latestCompletedCommandHandoff`.
 */
export function turn5KickoffBounceTickFromLatest(
  t: number,
  pressTick: number,
  latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null,
): number {
  if (latestCompletedCommandHandoff === null) {
    const historicalResettledTick = (value: number) => value
      - (TURN4_CONFIRM_PRESS_TICK + TURN4_ROCKSLIDE_MENU_REDRAW_DELAY)
      + (MENU_IDLE_BLANK_END_TICK + 1);
    if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) {
      return historicalResettledTick(t) - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
    }
    return historicalResettledTick(TURN5_CONFIRM_PRESS_TICK)
      - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  }
  const live = t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY;
  const sourceTick = live ? t : pressTick;
  const epochAge = latestCompletedCommandPresentationEpochElapsedSinceReset(
    latestCompletedCommandHandoff,
    sourceTick - TICK0,
  );
  if (epochAge === null) {
    throw new Error("turn-5 kickoff bounce requires semantic turn-4 presentation epoch content");
  }
  const bounceTick = MENU_IDLE_BLANK_END_TICK + 1 + epochAge
    - TURN5_LEGACY_PRESENTATION_CONTINUATION_LAG - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  // ISSUES #97 (docs/turn5-single-frame-residuals-diagnosis.md §9.2/§9's own
  // named next probe): the real `DoBounceEffect` driver for turn 5's own
  // confirm-wait bounce is NOT a fresh re-seed - RAM-proven (`tools/probe/
  // dump-turn5-confirma-bounce-driver.py`'s own `idChangeEvents`) to be the
  // SAME sprite instance continuously alive since turn 1's own
  // `MENU_BOUNCE_RAM_SETUP_TICK` (1748), its own `sSinIndex` only advancing
  // during "menu idle" sub-windows scattered across turns 1-5 (real
  // hardware masks it `& 0xFF` every frame, `battle_main.c:2978`, so its
  // raw value alone can't reconstruct elapsed real ticks without knowing
  // that whole schedule). This affine `epochAge`-based reconstruction gets
  // the FROZEN branch's own value right (confirmed correct for ticks
  // 5962+, unchanged below) but is 21 ticks off for the LIVE pre-freeze
  // sub-window specifically - a real, RAM-verified gap (the probe's own
  // raw `onixSinIndex`/`healthboxSinIndex` reads at RAM ticks 5958-5960
  // exactly match `menuIdleBounce(bounceTick - 21)`, not just its own
  // `(onixY2,healthboxY2)` output). Scoped to the live branch only - this
  // function's only other two call sites (`battleScene.ts:10410`'s rock
  // slide kickoff text, `battleScene.ts:10998`'s turn-13 switch-in echo)
  // always run with `t` far past `pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_
  // DELAY`, so they always take the (unchanged) frozen branch.
  return live ? bounceTick - 21 : bounceTick;
}

/**
 * Draws the switch-in icon-bar re-trigger (bar + 6 icons, uniform `x2`
 * slide-in, then the shared alpha-blend fade-out) - a no-op outside
 * `[createTick, destroyTick)` (RAM ticks, `rt = t - 1` convention per
 * `ballIcons`' own doc). S7/S8 turn 13 rung 4 (docs/turn13-notes.md §7):
 * `createTick`/`fadeStartTick`/`destroyTick`/`states` (all defaulted to
 * turn 5's own constants, every pre-existing call site unaffected) let
 * MURKROW's own switch-in re-trigger this exact mechanism at a new anchor
 * with a new per-slot states array (Pidgeotto's own former slot also
 * flips to `"Statused"` now) - oracle-pixel-bisected new anchors: first
 * visible slide pixel at render 16848 (`createTick+1`, the SAME "+1"
 * relationship turn 5's own `TURN5_ICONBAR_CREATE_TICK`/6588 pin
 * establishes) puts `createTick=16847`; first visible fade-blend pixel at
 * render 16985 (`fadeStartTick+2`, matching turn 5's own exact relation)
 * puts `fadeStartTick=16983`; `destroyTick=fadeStartTick+17` reuses turn
 * 5's own exact 17-tick gap (pixel-unobservable past eva=0 either way).
 */
export function drawTurn5IconBar(
  fb: Uint8Array,
  t: number,
  createTick: number = TURN5_ICONBAR_CREATE_TICK,
  fadeStartTick: number = TURN5_ICONBAR_FADE_START_TICK,
  destroyTick: number = TURN5_ICONBAR_DESTROY_TICK,
  states: readonly string[] = TURN5_OPPONENT_ICON_STATES,
): void {
  const rt = t - 1;
  if (rt < createTick || rt >= destroyTick) return;
  const x2 = tableX2(OPP_BAR_X2, createTick, rt);
  const eva = turn5IconBarEva(t, fadeStartTick);
  drawBallStatusBar(fb, -24 + x2, 40, true, eva);
  for (let i = 0; i < 6; i += 1) {
    const tile = ballDisplay.tileset.tiles[ballStateTileIndex(states[i]!)];
    if (!tile) continue;
    const x = 26 + 10 * i + x2;
    for (let py = 0; py < 8; py += 1) {
      for (let px = 0; px < 8; px += 1) {
        const idx = tile[py * 8 + px]!;
        if (idx === 0) continue;
        const c = ballDisplay.palette[idx];
        if (!c) continue;
        blendedSetPixel(fb, x + px, 32 + py, c, eva);
      }
    }
  }
}

export function switchinSentOutLine1(
  trainerPresentation?: FactoryTrainerPresentation,
): string {
  const trainer = presentationForEncounter("destin", trainerPresentation);
  return `${trainer.className} ${trainer.name} sent`;
}

export function turn5PidgeottoHealthboxSlideDx(t: number): number | null {
  return healthboxSlideDx(t, TURN5_PIDGEOTTO_HEALTHBOX_SLIDE_START_TICK, HEALTHBOX_SLIDE_START_DX, true);
}

export function drawTurn5SwitchinParticles(fb: Uint8Array, t: number, handoffTick: number = TURN5_BALL_HANDOFF_TICK, stallLogicalTick: number | null = null): void {
  drawCleanSwitchinParticles(fb, t - handoffTick - BALL_OPEN_START_OFFSET - 1, PARTICLE_ORIGIN, undefined, stallLogicalTick);
}

/**
 * S7 slice N-4 rung (a) (docs/turn6-notes.md §6, battle-turn-notes.md §29's
 * "OTHER thing found" resolved - see `turn6StatFallEva`'s own doc for the
 * full RAM story): the generic `StatsChangeAnimation` banner, parameterized
 * for FEATHER_DANCE's ATK-FALL on ONIX - same OBJ-window-masked BG1 alpha
 * blend `drawStatsBanner` already renders for turn 1's own evasion-RISE
 * DOUBLE_TEAM, just swapped to Onix's own sprite mask/corner, the
 * `decrease` tilemap + `attack` palette, and `TURN6_STATFALL_BG1_X`'s own
 * constant horizontal offset (only ever nonzero for a DECREASE, unlike
 * `drawStatsBanner`'s always-0 increase case). `drawStatsBanner` itself is
 * left untouched (turn 1's own trace stays byte-for-byte reliant on its
 * exact zero-arg shape) rather than threading new optional params through
 * it - the two are similar enough in spirit to share `statAnimBg1PixelAt`
 * but different enough in every actual parameter that a copy is clearer
 * than a 6-optional-parameter generalization for a single second caller.
 *
 * ISSUES #39 rank-4 slice 2: `palette` is now an explicit parameter (each of
 * turns 6/7/8's own call sites passes its own real
 * `TURNN_FEATHERDANCE_STAT_PALETTE`, `:2270`) instead of this function
 * reaching for `drawStatDecreaseBannerForBattler`'s former hardcoded-`attack`
 * default.
 */
export function drawTurn6StatFallBanner(fb: Uint8Array, t: number, pressTick: number, eva: number, palette: RgbColor[]): void {
  drawStatDecreaseBannerForBattlerPalette(
    fb,
    onixBackSprite.tileset,
    ONIX_MATERIALIZE_CORNER,
    eva,
    turn6StatFallBg1Y(t, pressTick),
    palette,
  );
}

/** Same "resettled menu re-initializes its own bounce phase fresh at redraw" formula as `turn7RockSlideResettledBounceTick`, keyed off `TURN8_MENU_REDRAW_DELAY`. */
export function turn8ResettledBounceTick(t: number, pressTick: number): number {
  return t - (pressTick + TURN8_MENU_REDRAW_DELAY) + (MENU_IDLE_BLANK_END_TICK + 1);
}

/** `turn8KickoffBounceTick`'s own turn-9 analogue, in regime-4 space (`drawTurn9FieldBase`'s own domain) - freezes at the regime-4 anchor tick itself (`TURN8_BIND_PRESS_TICK+TURN8_MENU_REDRAW_DELAY`, local phase 0 by construction). */
export function turn9KickoffBounceTick(t: number, pressTick: number): number {
  if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) return t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  return TURN8_BIND_PRESS_TICK + TURN8_MENU_REDRAW_DELAY;
}

export function legacyPidgeottoField(playerHp: number, playerAttackStage: number, opponentHp: number) {
  return {
    player: {
      species: "ONIX",
      displayName: "ONIX",
      level: 50,
      gender: "male" as const,
      status: "none" as const,
      hp: { current: playerHp, max: LEGACY_PIDGEOTTO_ONIX_MAX_HP },
      attackStage: playerAttackStage,
    },
    opponent: {
      species: turn5Switchin().replacementSpecies,
      displayName: turn5Switchin().replacementSpecies,
      level: turn5Switchin().replacementLevel,
      gender: "male" as const,
      status: "none" as const,
      hp: { current: opponentHp, max: pidgeottoMaxHp() },
      attackStage: 6,
    },
  };
}

// `turn9KickoffBounceTick`'s own already-established freeze (past `pressTick +
// FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`, its driver already torn down) is out
// of this correction's own RAM-verified regime (live driver, ticks
// 10818-10873) - `turn9FightSubmenuBrowseBounceTick` must never touch it.
export function turn9FightSubmenuLiveBounceRegime(t: number, sm: FightSubmenuState): boolean {
  return sm.confirmElapsed === null || t < TICK0 + sm.confirmElapsed + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY;
}

/** Same "resettled menu re-initializes its own bounce phase fresh at redraw" formula as `turn8ResettledBounceTick`, keyed off `TURN9_MENU_REDRAW_DELAY`. */
export function turn9ResettledBounceTick(t: number, pressTick: number): number {
  return t - (pressTick + TURN9_MENU_REDRAW_DELAY) + (MENU_IDLE_BLANK_END_TICK + 1);
}

/** `turn9KickoffBounceTick`'s own turn-10 analogue, in regime-5 space (`drawTurn10FieldBase`'s own domain) - freezes at the regime-5 anchor tick itself (`TURN9_QUICKATTACK_PRESS_TICK+TURN9_MENU_REDRAW_DELAY`, local phase 0 by construction). */
export function turn10KickoffBounceTick(t: number, pressTick: number): number {
  if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) return t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  return TURN9_QUICKATTACK_PRESS_TICK + TURN9_MENU_REDRAW_DELAY;
}

/** Same "resettled menu re-initializes its own bounce phase fresh at redraw" formula as `turn6RockSlideResettledBounceTick`, keyed off this turn's own `TURN10_ROCKSLIDE_MENU_REDRAW_DELAY` (or, ISSUES #39 rank-5 slice 2, an explicit `menuRedrawDelay` override - default unchanged, every pre-existing caller unaffected). */
export function turn10RockSlideResettledBounceTick(t: number, pressTick: number, menuRedrawDelay: number = TURN10_ROCKSLIDE_MENU_REDRAW_DELAY): number {
  return t - (pressTick + menuRedrawDelay) + (MENU_IDLE_BLANK_END_TICK + 1);
}

/** `turn10KickoffBounceTick`'s own turn-11 analogue, in regime-6 space (`drawTurn11FieldBase`'s own domain) - freezes at the regime-6 anchor tick itself (`TURN10_ROCKSLIDE_PRESS_TICK+TURN10_ROCKSLIDE_MENU_REDRAW_DELAY`, local phase 0 by construction). */
export function turn11KickoffBounceTick(t: number, pressTick: number): number {
  if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) return t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  return TURN10_ROCKSLIDE_PRESS_TICK + TURN10_ROCKSLIDE_MENU_REDRAW_DELAY;
}

/** Same "resettled menu re-initializes its own bounce phase fresh at redraw" formula as `turn10RockSlideResettledBounceTick`, keyed off this turn's own `TURN11_ROCKSLIDE_MENU_REDRAW_DELAY` (or, ISSUES #39 rank-5 slice 3, an explicit `menuRedrawDelay` override - default unchanged, every pre-existing caller unaffected). */
export function turn11RockSlideResettledBounceTick(t: number, pressTick: number, menuRedrawDelay: number = TURN11_ROCKSLIDE_MENU_REDRAW_DELAY): number {
  return t - (pressTick + menuRedrawDelay) + (MENU_IDLE_BLANK_END_TICK + 1);
}

/** `turn11KickoffBounceTick`'s own turn-12 analogue, in regime-7 space (`drawTurn12FieldBase`'s own domain) - freezes at the regime-7 anchor tick itself (`TURN11_ROCKSLIDE_PRESS_TICK+TURN11_ROCKSLIDE_MENU_REDRAW_DELAY`, local phase 0 by construction) - the SAME universal frozen mid-resolution bounce phase every prior turn's own equivalent freeze already reduces to (docs/turn12-notes.md §5's own "confirm-press transient (settled-submenu sha recurs)" finding), reused here for BOTH the pre-kickoff idle-wait AND (via `drawTurn12RockSlideWindow`) the ROCK_SLIDE-miss's own frozen field. */
export function turn12KickoffBounceTick(t: number, pressTick: number): number {
  if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) return t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  return TURN11_ROCKSLIDE_PRESS_TICK + TURN11_ROCKSLIDE_MENU_REDRAW_DELAY;
}

/** Same "resettled menu re-initializes its own bounce phase fresh at redraw" formula as `turn11RockSlideResettledBounceTick`, keyed off this turn's own `TURN12_ROCKSLIDE_MENU_REDRAW_DELAY`. */
export function turn12RockSlideResettledBounceTick(t: number, pressTick: number): number {
  return t - (pressTick + TURN12_ROCKSLIDE_MENU_REDRAW_DELAY) + (MENU_IDLE_BLANK_END_TICK + 1);
}

/**
 * `turn12KickoffBounceTick`'s own turn-13 analogue, in regime-8 space
 * (`drawTurn13FieldBase`'s own domain) - freezes at the regime-8 anchor tick
 * itself (`TURN12_ROCKSLIDE_PRESS_TICK+TURN12_ROCKSLIDE_MENU_REDRAW_DELAY`,
 * local phase 0 by construction) - the SAME universal frozen mid-resolution
 * bounce phase every prior turn's own equivalent freeze already reduces to.
 * Used for the confirm-press transient (docs/turn13-notes.md §4's own
 * "submenu STILL fully shown" row, sha `7922d883bcb6` steady from 15421) -
 * unlike prior turns, this freeze ALSO covers the DOWN-nav's own destination
 * cursor draw (the submenu's box-bounce cycle is independent of the cursor,
 * §4's own "6 idle-bounce phases" correction), so nothing extra is needed for
 * that.
 */
export function turn13KickoffBounceTick(t: number, pressTick: number): number {
  if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) return t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  return TURN12_ROCKSLIDE_PRESS_TICK + TURN12_ROCKSLIDE_MENU_REDRAW_DELAY;
}

/** Draws every dirt sprite alive at render tick `t` - a no-op outside the whole window (RAM 15480-15520, render 15481-15521). */
export function drawTurn13SandAttackDirt(fb: Uint8Array, t: number, pressTick: number): void {
  const ramTick = t - 1;
  const waveAnchor = pressTick + TURN13_SANDATTACK_DIRT_WAVE_ANCHOR_OFFSET;
  for (const i of TURN13_SANDATTACK_DIRT_DRAW_ORDER) {
    const wave = Math.floor(i / 5);
    const spawnRamTick = waveAnchor + wave * TURN13_SANDATTACK_DIRT_SPAWN_STRIDE;
    const n = ramTick - spawnRamTick + 1;
    if (n < 1 || n > TURN13_SANDATTACK_DIRT_LIFETIME) continue;
    const nClamped = Math.min(n, 20);
    const { xStep, yStep } = TURN13_SANDATTACK_DIRT_TABLE[i]!;
    const x2 = -Math.floor((nClamped * xStep) / 256);
    const y2 = Math.floor((nClamped * yStep) / 256);
    drawSpriteSheet(fb, battleAnimMudSand.tileset, battleAnimMudSand.palette, TURN13_SANDATTACK_DIRT_ORIGIN.x - 4 + x2, TURN13_SANDATTACK_DIRT_ORIGIN.y - 4 + y2);
  }
}

export function turn13FaintedTextStartTick(pressTick: number): number {
  return pressTick + TURN13_FAINTED_TEXT_DELAY;
}

/** Murkrow's own on-field position (`InitSpritePosToAnimAttacker`, the ball spawns at the exact same corner every tick it's alive, RAM-confirmed - reuses `MURKROW_CORNER` verbatim, same corner-vs-OAM-center convention every other affine draw in this file already uses). */
export function drawTurn14FlyBall(fb: Uint8Array, t: number): void {
  const ramTick = t - 1;
  const entry = TURN14_FLY_BALL_TABLE[ramTick - TURN14_FLY_BALL_RAM_START];
  if (!entry) return;
  drawSpriteSheetAffineStretch(
    fb,
    battleAnimFlyBall.tileset,
    battleAnimFlyBall.palette,
    MURKROW_CORNER.x,
    MURKROW_CORNER.y,
    entry.a,
    entry.d,
    entry.y2,
    { r: 0, g: 0, b: 0 },
    0,
    true,
    0,
    OPPONENT_BATTLE_TERRAIN_VISIBLE_BOTTOM,
  );
}

export function drawTurn15FlyBallDescent(fb: Uint8Array, t: number): void {
  const ramTick = t - TURN15_STRIKE_RENDER_LAG;
  const entry = TURN15_FLY_BALL_TABLE[ramTick - TURN15_FLY_BALL_RAM_START];
  if (!entry) return;
  drawSpriteSheetAffineRotate(
    fb,
    battleAnimFlyBall.tileset,
    battleAnimFlyBall.palette,
    entry.x,
    entry.y,
    TURN15_FLY_BALL_MATRIX.pa,
    TURN15_FLY_BALL_MATRIX.pb,
    TURN15_FLY_BALL_MATRIX.pc,
    TURN15_FLY_BALL_MATRIX.pd,
    undefined,
    false,
  );
}

export function drawTurn15ImpactHitsplat(fb: Uint8Array, t: number): void {
  const ramTick = t - TURN15_STRIKE_RENDER_LAG;
  if (ramTick < TURN15_HITSPLAT_RAM_START || ramTick > TURN15_HITSPLAT_RAM_END) return;
  drawSpriteSheetBlendedOverFb(
    fb,
    battleAnimHitsplat.tileset,
    battleAnimHitsplat.palette,
    TURN15_HITSPLAT_CENTER.x - 16,
    TURN15_HITSPLAT_CENTER.y - 16,
    12,
    8,
  );
}

// --- slice 4 batch: verbatim move ---

export function drawTurn15PartySelectWindow(fb: Uint8Array, state: BattleSceneState, party: import("./partySelect.ts").PartySelectState): boolean {
  if (party.sendOutElapsed !== null) {
    const phase = partySendOutPhase(party.sendOutElapsed);
    if (phase === "submenuHold") {
      drawTurn15PartySelectList(fb, party);
      return true;
    }
    if (phase === "fadingOut") {
      drawTurn15PartySelectList(fb, party);
      const mask = new Uint8Array(fb.length);
      drawTurn15PartyListObjMask(mask, party);
      fadeTurn15PartyFramebuffer(fb, bgFadeY(party.sendOutElapsed - PARTY_SENDOUT_FADE_OUT_START, PARTY_SENDOUT_FADE_OUT), mask, objFadeY(party.sendOutElapsed - PARTY_SENDOUT_FADE_OUT_START, PARTY_SENDOUT_FADE_OUT));
      return true;
    }
    if (phase === "black") return true;
    if (phase === "actionMenu" && state.fightSubmenu.openElapsed !== null) {
      drawTurn16FightSubmenuWindow(
        fb,
        TICK0 + state.elapsed,
        state.fightSubmenu,
        party.sendOutElapsed,
        state.resolutionOwner?.followingPresentation ?? null,
        state.terminalResolution ?? null,
        state.trainerPresentation,
      );
      return true;
    }
    // The extracted mode-0 state supplies field/message-box ownership and
    // unfaded palette RAM.  Fade, text, and release clocks all remain
    // confirmation-relative.
    const releaseTick = partySendOutReleaseLogicalTick(party.sendOutElapsed);
    const bounce = phase === "actionMenu"
      ? menuIdleBounce(partySendOutMenuBounceTick(party.sendOutElapsed))
      : { onixY2: 0, healthboxY2: 0 };
    noteCanonicalSample("turn-15 field PPU (MURKROW)");
    drawMode0Ppu(fb, {
      ...turn15FieldPpuAsset,
      bldy: partySendOutBattleFadeBldy(party.sendOutElapsed),
      paletteBgr555: releaseTick === null ? turn15FieldPpuAsset.paletteBgr555 : turn15ReleaseFieldPalette(releaseTick),
    });
    drawTurn15ForcedSwitchBall(fb, party.sendOutElapsed);
    if (releaseTick !== null) drawTurn15ForcedSwitchRelease(fb, releaseTick, "MAGBY", bounce.onixY2);
    const healthboxDx = partySendOutHealthboxDx(party.sendOutElapsed);
    if (healthboxDx !== null) drawTurn15MagbyHealthbox(fb, healthboxDx, bounce.healthboxY2);
    if (phase === "actionMenu") {
      drawTurn15MagbySettledMenuChrome(fb);
    } else if (phase !== "blankMessage") {
      drawMessageTextLines(fb, PARTY_SENDOUT_GO_TEXT, "", partySendOutGoTextVisibleChars(party.sendOutElapsed));
    }
    return true;
  }
  const phase = partySelectEntryPhase(party.elapsed);
  // The faint-message controller is torn down on the dismiss edge: its
  // cursor/bounce presentation freezes at that exact rendered battle frame
  // for the hold and for every source frame fed into the fade.  Deriving the
  // entry tick from current scene elapsed keeps delayed A presses honest.
  const entryTick = TICK0 + state.elapsed - party.elapsed;
  const pressTick = state.fightSubmenu.confirmElapsed === null ? TURN15_FLY_STRIKE_TEXT_START_TICK : TICK0 + state.fightSubmenu.confirmElapsed;
  if (phase === "battleHold") {
    drawTurn15FlyStrikeWindow(fb, entryTick, pressTick);
    return true;
  }
  if (phase === "fadingOut") {
    drawTurn15FlyStrikeWindow(fb, entryTick, pressTick);
    const local = party.elapsed - PARTY_ENTRY_FADE_OUT_START;
    const mask = new Uint8Array(fb.length);
    drawTurn13MurkrowSettled(mask);
    drawSendOutHealthbox(mask, 0, getMurkrowHealthboxContent());
    fadeTurn15PartyFramebuffer(fb, bgFadeY(local, PARTY_ENTRY_FADE_OUT), mask, objFadeY(local, PARTY_ENTRY_FADE_OUT));
    return true;
  }
  if (phase === "black") return true;
  drawTurn15PartySelectList(fb, party);
  if (phase === "fadingIn") {
    const local = party.elapsed - PARTY_ENTRY_FADE_IN_START;
    const mask = new Uint8Array(fb.length);
    drawTurn15PartyListObjMask(mask, party);
    fadeTurn15PartyFramebuffer(fb, bgFadeY(local, PARTY_ENTRY_FADE_IN), mask, objFadeY(local, PARTY_ENTRY_FADE_IN));
  }
  return true;
}

export function drawTurn15FightSubmenuWindow(
  fb: Uint8Array,
  t: number,
  sm: FightSubmenuState,
  resolution: import("./battleResolutionPresentation.ts").BattleResolutionPresentationState,
  latest: LatestCompletedCommandHandoff | null = null,
): void {
  const revealTick = sm.openElapsed === null ? -Infinity : TICK0 + sm.openElapsed + FIGHT_SUBMENU_OPEN_DELAY;
  if (sm.openElapsed === null || t < revealTick) {
    const shiftedBounceTick = t + TURN14_MENU_REDRAW_RESET_SHIFT;
    drawTurn13SwitchinFieldBase(fb, t, shiftedBounceTick, true);
    drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
    drawTurn5SitrusSettledMenuChrome(fb);
    return;
  }
  if (sm.confirmElapsed !== null) {
    const pressTick = TICK0 + sm.confirmElapsed;
    if (t >= TURN15_FLY_STRIKE_TEXT_START_TICK) {
      drawTurn15FlyStrikeWindow(fb, t, pressTick);
      return;
    }
  }
  const shiftedBounceTick = sm.confirmElapsed !== null ? turn15KickoffBounceTick(t, TICK0 + sm.confirmElapsed) : t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT + TURN14_MENU_REDRAW_RESET_SHIFT;
  drawTurn13SwitchinFieldBase(fb, t, shiftedBounceTick, true);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
  drawFightSubmenuChromeFromLatest(
    fb,
    sm.displayCursor,
    sm.activeMonMoveset,
    latest,
    resolution,
  );
}

export function drawTurn15FlyStrikeWindow(fb: Uint8Array, t: number, pressTick: number): void {
  const frozenBounceTick = turn15KickoffBounceTick(t, pressTick);
  const onixHp = turn15StrikeTargetHp(t, TURN12_ONIX_AFTER_AERIALACE_HP);
  const onixSinkSkipRows = turn15FaintSinkSkipRows(t, TURN15_ONIX_SINK_START_TICK, TURN15_ONIX_SINK_RATE);
  const onixHealthboxVisible = t < TURN15_ONIX_HEALTHBOX_VANISH_TICK;
  drawTurn13SwitchinFieldBase(
    fb,
    t,
    frozenBounceTick,
    turn15StrikeAttackerInvisible(t, TURN15_STRIKE_ATTACKER_REVEAL_TICK),
    turn15StrikeTargetInvisible(t, TURN15_STRIKE_TARGET_INVISIBLE_PULSE_START_TICK, TURN15_STRIKE_TARGET_INVISIBLE_PULSE_END_TICK, TURN15_STRIKE_TARGET_INVISIBLE_PULSE_PERIOD),
    turn15StrikeTargetHealthboxWobbleY2(t, TURN15_HEALTHBOX_WOBBLE_RAM_START, TURN15_HEALTHBOX_WOBBLE_TICKS),
    turn15StrikeTargetShakeX2(t, TURN15_ONIX_SHAKE_X2, TURN15_ONIX_SHAKE_RAM_TICKS),
    onixHp,
    onixSinkSkipRows,
    onixHealthboxVisible,
  );
  drawTurn15ImpactHitsplat(fb, t);
  drawTurn15FlyBallDescent(fb, t);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  if (t >= TURN15_FAINTED_TEXT_START_TICK) {
    drawMessageTextLines(fb, turn15FaintedLine1(), turn15FaintedLine2(), turn15SimpleVisibleChars(t, TURN15_FAINTED_TEXT_START_TICK, turn15FaintedTextTotal()));
    const cursor = cursorState(t, turn15FaintedCursorStartTick());
    if (cursor.visible) drawCursor(fb, cursor.yOffset, turn15FaintedCursorX());
    return;
  }
  if (t >= TURN15_NOTVERYEFFECTIVE_TEXT_START_TICK) {
    drawMessageTextLines(fb, TURN9_NOTVERYEFFECTIVE_LINE, "", turn15SimpleVisibleChars(t, TURN15_NOTVERYEFFECTIVE_TEXT_START_TICK, TURN9_NOTVERYEFFECTIVE_LINE.length));
    return;
  }
  drawMessageTextLines(fb, turn15FlyStrikeLine1(), turn15FlyStrikeLine2(), turn15SimpleVisibleChars(t, TURN15_FLY_STRIKE_TEXT_START_TICK, turn15FlyStrikeTextTotal()));
}

export function drawTurn14FightSubmenuWindow(
  fb: Uint8Array,
  t: number,
  sm: FightSubmenuState,
  latest: LatestCompletedCommandHandoff | null = null,
): void {
  const revealTick = sm.openElapsed === null ? -Infinity : TICK0 + sm.openElapsed + FIGHT_SUBMENU_OPEN_DELAY;
  if (sm.openElapsed === null || t < revealTick) {
    const shiftedBounceTick = sm.openElapsed === null ? t + TURN13_SETTLED_BOUNCE_PHASE_SHIFT : t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT + TURN13_SETTLED_BOUNCE_PHASE_SHIFT;
    drawTurn13SwitchinFieldBase(fb, t, shiftedBounceTick);
    drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
    drawTurn5SitrusSettledMenuChrome(fb);
    return;
  }
  if (sm.confirmElapsed !== null) {
    const pressTick = TICK0 + sm.confirmElapsed;
    if (t >= turn14BareSceneStartTick(pressTick)) {
      drawTurn14FlyMissWindow(fb, t, pressTick);
      return;
    }
  }
  const shiftedBounceTick = sm.confirmElapsed !== null ? turn14KickoffBounceTick(t, TICK0 + sm.confirmElapsed) : t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT + TURN13_SETTLED_BOUNCE_PHASE_SHIFT;
  drawTurn13SwitchinFieldBase(fb, t, shiftedBounceTick);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
  // The handoff owns turn 13's already-completed PP and persisted slot before
  // the retained charge receipt advances to its locked strike segment.
  drawFightSubmenuChromeFromLatest(fb, sm.displayCursor, sm.activeMonMoveset, latest);
}

export function drawTurn14FlyMissWindow(fb: Uint8Array, t: number, pressTick: number): void {
  if (t >= TURN14_MENU_REDRAW_TICK) {
    const shiftedBounceTick = t + TURN14_MENU_REDRAW_RESET_SHIFT;
    drawTurn13SwitchinFieldBase(fb, t, shiftedBounceTick, true);
    drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
    drawTurn5SitrusSettledMenuChrome(fb);
    return;
  }
  if (t >= TURN14_MENU_TEXT_CLEAR_TICK) {
    // TEXT_CLEAR_TICK <= t < MENU_REDRAW_TICK: blank hold, mirrors
    // drawTurn13SwitchinWindow's own gap - drawTileBg below already paints
    // the message box's own flat teal fill.
    drawTurn13SwitchinFieldBase(fb, t, turn14KickoffBounceTick(t, pressTick), turn14MurkrowInvisible(t));
    drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
    return;
  }
  const frozenBounceTick = turn14KickoffBounceTick(t, pressTick);
  const murkrowInvisible = turn14MurkrowInvisible(t);
  drawTurn13SwitchinFieldBase(fb, t, frozenBounceTick, murkrowInvisible);
  drawTurn14FlyBall(fb, t);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  if (t >= TURN14_MISSED_TEXT_START_TICK) {
    drawMessageTextLines(fb, turn8MissLines()[0], turn8MissLines()[1], turn14SimpleVisibleChars(t, TURN14_MISSED_TEXT_START_TICK, turn8MissTextTotal()));
    return;
  }
  if (t >= TURN14_DRAGONBREATH_TEXT_START_TICK) {
    drawMessageTextLines(fb, ROCK_SLIDE_LINE1, DRAGONBREATH_KICKOFF_LINE2, turn14SimpleVisibleChars(t, TURN14_DRAGONBREATH_TEXT_START_TICK, TURN14_DRAGONBREATH_TEXT_TOTAL));
    return;
  }
  if (t >= TURN14_FLYUP_TEXT_START_TICK) {
    drawMessageTextLines(fb, turn14FlyupLine1(), turn14FlyupLine2(), turn14SimpleVisibleChars(t, TURN14_FLYUP_TEXT_START_TICK, turn14FlyupTextTotal()));
    return;
  }
  // Bare scene, no message box content at all (the empty-string kickoff
  // quirk, §5a) - field base + ball (if alive) + tile bg above already
  // cover the whole frame.
}

export function drawSendOutHandoff(
  fb: Uint8Array,
  t: number,
  handoffTick: number,
  encounter: BattleSceneState["encounter"] = "destin",
  trainerPresentation?: FactoryTrainerPresentation,
): void {
  const isJenson = encounter === "jenson";
  // PlayerHandleIntroTrainerBallThrow is scheduled from the opponent
  // send-out handoff, not from the battle scene's absolute clock.  Battle 1
  // established handoff=1462; rebasing onto that proven clock keeps every
  // Brendan/ball/ONIX helper unchanged while allowing later encounters to
  // start their send-out at a different scene elapsed.
  const playerT = playerSendOutClock(t, handoffTick);
  // In the subsequent-battle intro, the already-created player trainer and
  // party summary retain their controller delay while the generic ball
  // task proceeds on the ordinary handoff-relative clock.  The first live
  // trainer/summary callback is 45 ticks later, pinned by the dense trace's
  // last unchanged settled pose (32726) and first changed pose (32727).
  const playerTrainerT = playerTrainerSendOutClock(t, handoffTick, encounter);
  // battleMenu.ts's own module doc (§3 item 5 root-cause, PROGRESS.md #98's
  // named blocker): the player's own ONIX release re-triggers the identical
  // BG-to-white materialize dither `sendOutBgFadeY` models for the
  // opponent's own send-out - the two windows never overlap, so only one of
  // the two is ever nonzero at a given tick.
  //
  // Battle 2 retains the already-created trainer controller's 45-tick
  // callback delay for the whole visual throw chain (trainer, ball,
  // materialize, particles, and healthbox).  Only the independently queued
  // "Go! ONIX!" printer uses `playerT`.  This is observable before any
  // overlap: canonical 32727..32759 maps byte-for-byte to Battle 1's visual
  // ticks 1574..1606, with no ball yet present.
  const bgFadeY = sendOutBgFadeY(t, handoffTick) || playerMaterializeBgFadeY(playerTrainerT);
  drawTileBgFaded(fb, battleBg.static.tileset, battleBg.static.tilemap, battleBg.palette, bgFadeY);
  // battleMenu.ts: Brendan's throw pose-swap + exit translation start at
  // BRENDAN_THROW_START_TICK - before that he's still the settled slide-in
  // pose (frame 3, unshifted). `brendanThrowFrame` uses `null` for BOTH ends
  // of its own table (before the throw starts, AND once its `FRAME(3,50)`
  // tail is exhausted, et>=116 - a "table truncated both ends" case, per
  // this run's own named convention) - the two must NOT be conflated here:
  // once the throw has started, `null` means "long done and off-screen"
  // (`brendanThrowDx` itself freezes fully off-screen at n=50), not "back to
  // the settled on-screen pose". Found via ISSUES #17's own settle-window
  // work: this bug was invisible before (masked by the much larger
  // ONIX-missing gap it happened to overlap) and surfaced only once ONIX's
  // own real transparency let Brendan's incorrectly-redrawn settled sprite
  // show through at render tick 1690+ (`BRENDAN_THROW_START_TICK`+116).
  const throwFrame = brendanThrowFrame(playerTrainerT);
  if (playerTrainerT < BRENDAN_THROW_START_TICK) {
    drawSpriteSheet(fb, brendanSettledTileset, brendan.palette, PLAYER_CORNER.x, PLAYER_CORNER.y);
  } else if (throwFrame !== null) {
    const dx = brendanThrowDx(playerTrainerT) ?? 0;
    drawSpriteSheet(fb, brendanThrowTilesets[throwFrame]!, brendan.palette, PLAYER_CORNER.x + dx, PLAYER_CORNER.y);
  }
  const trainerX = trainerExitX(t, handoffTick);
  if (trainerX !== null) {
    const trainer = introTrainer(encounter, trainerPresentation);
    drawSpriteSheet(fb, trainer.tileset, trainer.palette, trainerX, OPPONENT_CORNER.y);
  }
  if (isJenson) {
    drawKabutoMaterialize(fb, t, handoffTick);
    drawKabutoHSlideWobble(fb, t, handoffTick, encounter);
  } else {
    drawGrovyleMaterialize(fb, t, handoffTick);
    drawGrovyleStretchEarly(fb, t, handoffTick);
    if (t < GROVYLE_MATERIALIZE_TICK) drawGrovyleStretch(fb, t, handoffTick);
  }
  drawSendOutBall(fb, t, handoffTick);
  const playerBallTopLeft = playerThrowBallTopLeft(playerTrainerT);
  if (playerBallTopLeft !== null) {
    drawSpriteSheet(fb, BALL_CLOSED_TILESET, summaryBall.palette, playerBallTopLeft.x, playerBallTopLeft.y);
  }
  const playerBallSpin = playerThrowBallSpin(playerTrainerT);
  if (playerBallSpin !== null) {
    drawSpriteSheetAffineRotate(
      fb,
      BALL_CLOSED_TILESET,
      summaryBall.palette,
      playerBallSpin.centerX,
      playerBallSpin.centerY,
      playerBallSpin.pa,
      playerBallSpin.pb,
      playerBallSpin.pc,
      playerBallSpin.pd,
    );
  }
  drawBallOpenParticles(fb, t, handoffTick, encounter);
  drawPlayerMaterialize(fb, playerTrainerT);
  drawPlayerMaterializeSettle(fb, playerTrainerT, encounter);
  drawPlayerBallOpen(fb, playerTrainerT);
  drawPlayerBallOpenParticles(fb, playerTrainerT);
  if (!isJenson && t >= GROVYLE_MATERIALIZE_TICK) drawGrovyleSettled(fb);
  // §7.19: `drawOpponentSummaryExit` only draws from elapsed=t-handoffTick-1
  // >= 0 (render handoffTick+1 on) - at handoffTick itself (elapsed=-1) the
  // real game still shows the opponent's settled (un-faded, un-slid) bar+
  // icons for exactly one tick before the exit fade/slide takes over, so
  // fall back to the same settled render the pre-handoff branch uses.
  drawBallIcons(fb, playerTrainerT, {
    opponent: t === handoffTick,
    player: true,
    playerEvaOffset: playerSummaryEvaOffset(playerTrainerT, encounter),
  });
  drawOpponentSummaryExit(fb, t, handoffTick, encounter);
  const healthboxDx = isJenson
    ? healthboxSlideDx(t, handoffTick + 32, -110, true)
    : healthboxSlideDx(t, handoffTick + 33);
  if (healthboxDx !== null) drawSendOutHealthbox(fb, healthboxDx, isJenson ? kabutoHealthboxContent : getOpponentHealthboxContent());
  const playerHealthboxDx = playerHealthboxSlideDx(playerTrainerT);
  if (playerHealthboxDx !== null) drawMenuHealthboxPlayer(fb, playerHealthboxDx);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  // battleMenu.ts §1/§2: the box clears (no blank-box frame - a bare
  // `drawTileBg` above already redraws it empty) and "Go! ONIX!" starts
  // printing the same tick the opponent's held "sent\nout GROVYLE!" text
  // would otherwise still be drawn.
  if (isJenson && playerT >= PLAYER_THROW_BALL_START_TICK + 1) {
    drawMessageTextLines(
      fb,
      GO_TEXT,
      "",
      Math.min(GO_TEXT.length, playerT - (PLAYER_THROW_BALL_START_TICK + 1) + 1),
    );
  } else if (!isJenson && playerT >= GO_TEXT_START_TICK) {
    drawMessageTextLines(fb, GO_TEXT, "", goTextVisibleChars(playerT));
  } else {
    const params = battleSendOutEncounterParams(encounter);
    drawMessageTextLines(fb, params.line1, params.line2, params.textTotal);
  }
}

export function drawRockSlideAttack(fb: Uint8Array, t: number, pressTick: number): void {
  // ISSUES #39 rank-6 slice 1: the camera shake (`rockSlideBg3Y`), Grovyle's
  // own target shake (`rockSlideMonShakeY2`), and the falling-rock props
  // (`rockSlideDrawOrder`/`rockSlideRockState`) are ROCK_SLIDE's own
  // `attackanimation` body - class (c), never renders under
  // `HITMARKER_NO_ANIMATIONS` (RAM-confirmed flat 0 the whole window, this
  // window's own doc comment above) - dropped entirely rather than called
  // with a never-active override.
  drawStaticBgShiftedY(fb, 0);
  if (!rockSlideMonBlinkInvisible(t, pressTick, TURN1_OFF_ROCKSLIDE_ANIMATION_PROFILE)) {
    drawSpriteSheet(fb, grovyleFrontSprite.tileset, grovyleFrontSprite.palette, GROVYLE_CORNER.x, GROVYLE_CORNER.y);
  }
  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y);
  const healthboxY2 = rockSlideHealthboxWobbleY2(t, pressTick, TURN1_OFF_ROCKSLIDE_ANIMATION_PROFILE);
  const opponentHp = rockSlideOpponentHp(t, pressTick, turn1RockslideHp().from, turn1RockslideHp().to, TURN1_OFF_ROCKSLIDE_HP_DRAIN_START_DELAY);
  drawSendOutHealthbox(fb, 0, opponentHealthboxContentForHp(opponentHp));
  if (healthboxY2 !== 0) drawOpponentHealthboxWobble(fb, healthboxY2);
  drawMenuHealthboxPlayer(fb, 0);
  drawMenuIdleBounceOverlay(fb, turnKickoffBounceTick(t, pressTick));
}

export function drawRockSlideWindow(fb: Uint8Array, t: number, pressTick: number): void {
  const redrawTick = pressTick + TURN1_CHOOSE_ACTION_RESET_AFTER_CONFIRM;
  if (t >= redrawTick) {
    drawTurnEndSettledMenu(fb, t, pressTick);
    return;
  }
  const statRoseStart = statRoseTextStartTick(pressTick, TURN1_OFF_STAT_ROSE_TEXT_DELAY);
  const rockSlideStart = rockSlideTextStartTick(pressTick, TURN1_OFF_ROCKSLIDE_TEXT_DELAY);
  const textClearTick = pressTick + TURN1_OFF_ROCKSLIDE_TEXT_CLEAR_DELAY;
  drawRockSlideAttack(fb, t, pressTick);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  if (t < textClearTick) {
    let line1: string;
    let line2: string;
    let chars: number;
    if (t < statRoseStart) {
      line1 = turn1RockslideKickoffLines()[0];
      line2 = turn1RockslideKickoffLines()[1];
      chars = turnKickoffTextVisibleChars(t, pressTick);
    } else if (t < rockSlideStart) {
      line1 = STAT_ROSE_LINE1;
      line2 = STAT_ROSE_LINE2;
      chars = statRoseTextVisibleChars(t, pressTick, TURN1_OFF_STAT_ROSE_TEXT_DELAY);
    } else {
      line1 = turn1RockslideAttackLines()[0];
      line2 = turn1RockslideAttackLines()[1];
      chars = rockSlideTextVisibleChars(t, pressTick, TURN1_OFF_ROCKSLIDE_TEXT_DELAY);
    }
    drawMessageTextLines(fb, line1, line2, chars);
  }
}

export function drawFaintedOpponentWindow(
  fb: Uint8Array,
  t: number,
  pressTick: number,
  sandAttackPressTick: number,
  opponentFaintPresentationOwner: OpponentFaintPresentationOwner | null = null,
  trainerPresentation?: FactoryTrainerPresentation,
): void {
  const frozenBounceTick = turn13KickoffBounceTick(t, sandAttackPressTick);
  const dismiss = opponentFaintPresentationOwner?.dismiss ?? null;
  const continuationElapsed = opponentFaintContinuationElapsed(
    opponentFaintPresentationOwner,
    t - TICK0,
  );
  if (
    dismiss !== null
    && continuationElapsed !== null
    && continuationElapsed >= TURN13_ICONBAR_CREATE_AFTER_DISMISS
  ) {
    drawTurn13SwitchinWindow(
      fb,
      t,
      frozenBounceTick,
      pressTick + turn13FaintedCursorStartDelay(),
      opponentFaintPresentationOwner!,
      trainerPresentation,
    );
    return;
  }
  drawTurn13FieldBase(fb, t, frozenBounceTick, undefined, undefined, 0, false, 0, turn13DragonbreathHp().to, { keptRows: 0, y2: turn13FaintSinkSteps() * 8 }, false);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawMessageTextLines(
    fb,
    turn13DragonbreathFaintLines()[0],
    turn13DragonbreathFaintLines()[1],
    turn13FaintedTextVisibleChars(t, pressTick),
  );
  const cursorStart = pressTick + turn13FaintedCursorStartDelay();
  const cursorTick = dismiss === null
    ? t
    : Math.min(t, TICK0 + dismiss.cursor.frozenAtElapsed);
  const cursor = cursorState(cursorTick, cursorStart);
  if (cursor.visible) drawCursor(fb, cursor.yOffset, turn13FaintedCursorX());
}

export function drawDragonBreathKoWindow(
  fb: Uint8Array,
  t: number,
  sandAttackPressTick: number,
  opponentFaintPresentationOwner: OpponentFaintPresentationOwner | null,
  trainerPresentation?: FactoryTrainerPresentation,
): void {
  const dbPressTick = TURN13_DRAGONBREATH_PRESS_TICK;
  if (t >= turn13FaintedTextStartTick(dbPressTick)) {
    drawFaintedOpponentWindow(
      fb,
      t,
      dbPressTick,
      sandAttackPressTick,
      opponentFaintPresentationOwner,
      trainerPresentation,
    );
    return;
  }
  const frozenBounceTick = turn13KickoffBounceTick(t, sandAttackPressTick);
  const hp = dragonBreathHp(
    t,
    dbPressTick,
    turn13DragonbreathHp().from,
    turn13DragonbreathHp().to,
  );
  const sink =
    t >= TURN13_FAINT_SINK_START_TICK
      ? faintSinkRowsAndY2(t, TURN13_FAINT_SINK_START_TICK, turn13FaintSinkSteps())
      : rockSlideMonBlinkInvisible(t, TURN13_HIT_FLASH_PRESS_TICK)
        ? { keptRows: 0, y2: 0 }
        : null;
  const healthboxVisible = t < turn13HealthboxVanishTick();
  drawTurn13FieldBase(fb, t, frozenBounceTick, undefined, undefined, 0, false, 0, hp, sink, healthboxVisible);
  if (healthboxVisible) {
    const healthboxY2 = rockSlideHealthboxWobbleY2(t, TURN13_HIT_FLASH_PRESS_TICK);
    if (healthboxY2 !== 0) drawOpponentHealthboxWobble(fb, healthboxY2, pidgeottoHealthboxContentForHp(hp));
  }
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawMessageTextLines(
    fb,
    turn13DragonbreathKickoffLines()[0],
    turn13DragonbreathKickoffLines()[1],
    dragonBreathTextVisibleChars(t, dbPressTick),
  );
}

export function drawTurn13SandAttackWindow(
  fb: Uint8Array,
  t: number,
  pressTick: number,
  opponentFaintPresentationOwner: OpponentFaintPresentationOwner | null,
  trainerPresentation?: FactoryTrainerPresentation,
): void {
  if (t >= dragonBreathTextStartTick(TURN13_DRAGONBREATH_PRESS_TICK)) {
    drawDragonBreathKoWindow(
      fb,
      t,
      pressTick,
      opponentFaintPresentationOwner,
      trainerPresentation,
    );
    return;
  }
  const frozenBounceTick = turn13KickoffBounceTick(t, pressTick);
  drawTurn13FieldBase(fb, t, frozenBounceTick, undefined, undefined, 0, false, turn13SandAttackPidgeottoX2(t, pressTick));
  drawTurn13SandAttackDirt(fb, t, pressTick);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  const accEva = turn13SandAttackAccEva(t, pressTick);
  if (accEva !== null) drawTurn13SandAttackAccBanner(fb, t, pressTick, accEva);
  const accFellStart = turn13AccFellTextStartTick(pressTick);
  if (t >= accFellStart) {
    drawMessageTextLines(fb, turn13AccfellEventLines()[0], turn13AccfellEventLines()[1], turn13AccFellTextVisibleChars(t, pressTick));
    return;
  }
  drawMessageTextLines(fb, turn13SandattackEventLines()[0], turn13SandattackEventLines()[1], turn13SandAttackTextVisibleChars(t, pressTick));
}

export function drawTurn13FightSubmenuWindow(
  fb: Uint8Array,
  t: number,
  sm: FightSubmenuState,
  opponentFaintPresentationOwner: OpponentFaintPresentationOwner | null,
  trainerPresentation?: FactoryTrainerPresentation,
  latest: LatestCompletedCommandHandoff | null = null,
): void {
  if (sm.openElapsed === null) {
    drawTurn12TurnEndSettledMenu(fb, t);
    return;
  }
  const revealTick = TICK0 + sm.openElapsed + FIGHT_SUBMENU_OPEN_DELAY;
  if (t < revealTick) {
    // Oracle-pixel-confirmed this session (turn13-menu.json bisection): this
    // specific DMA-wait window needs an UNSHIFTED raw `t` here, not the
    // usual `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` every other turn's analogous
    // branch uses - the underlying `menuIdleBounce` table's own plateau
    // boundary for THIS regime (anchored off `TURN12_ROCKSLIDE_PRESS_TICK+
    // TURN12_ROCKSLIDE_MENU_REDRAW_DELAY`) lands 2 ticks earlier than the
    // shifted formula predicts - not assumed transferable from turn 12's own
    // instance, which uses a different regime anchor and DOES need the -2
    // shift; a real per-turn residue difference, not a bug in the shared
    // constant.
    drawTurn12TurnEndSettledMenu(fb, t);
    return;
  }
  if (sm.confirmElapsed !== null) {
    const pressTick = TICK0 + sm.confirmElapsed;
    const textStart = turn13SandAttackTextStartTick(pressTick);
    if (t >= textStart) {
      drawTurn13SandAttackWindow(
        fb,
        t,
        pressTick,
        opponentFaintPresentationOwner,
        trainerPresentation,
      );
      return;
    }
  }
  const bounceTick = sm.confirmElapsed !== null ? turn13KickoffBounceTick(t, TICK0 + sm.confirmElapsed) : t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  drawTurn13FieldBase(fb, t, bounceTick);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
  drawFightSubmenuChromeFromLatest(fb, sm.displayCursor, sm.activeMonMoveset, latest);
}

export function drawTurn13FieldBase(fb: Uint8Array, t: number, bounceTick: number = t, beforeMonSprite?: () => void, onixHp: number = TURN12_ONIX_AFTER_AERIALACE_HP, onixY2Extra: number = 0, darken: boolean = false, pidgeottoX2: number = 0, pidgeottoHp: number = TURN11_PIDGEOTTO_AFTER_ROCKSLIDE_HP, pidgeottoSink: { keptRows: number; y2: number } | null = null, pidgeottoHealthboxVisible: boolean = true): void {
  drawTurn6FieldBase(fb, t, bounceTick + TURN13_REGIME8_TO_REGIME1_SHIFT, beforeMonSprite, onixHp, 0, false, undefined, onixY2Extra, darken, pidgeottoX2, pidgeottoSink, pidgeottoHealthboxVisible);
  if (pidgeottoHealthboxVisible) drawSendOutHealthbox(fb, 0, pidgeottoHealthboxContentForHp(pidgeottoHp));
}

export function drawTurn12FightSubmenuWindow(
  fb: Uint8Array,
  t: number,
  sm: FightSubmenuState,
  latest: LatestCompletedCommandHandoff | null = null,
): void {
  if (sm.openElapsed === null) {
    drawTurn11RockSlideTurnEndSettledMenu(fb, t);
    return;
  }
  const revealTick = TICK0 + sm.openElapsed + FIGHT_SUBMENU_OPEN_DELAY;
  if (t < revealTick) {
    drawTurn11RockSlideTurnEndSettledMenu(fb, t, t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT);
    return;
  }
  if (sm.confirmElapsed !== null) {
    const pressTick = TICK0 + sm.confirmElapsed;
    const textStart = turn10AerialAceTextStartTick(pressTick);
    if (t >= textStart) {
      drawTurn12AerialAceWindow(fb, t, pressTick);
      return;
    }
  }
  const bounceTick = sm.confirmElapsed !== null ? turn12KickoffBounceTick(t, TICK0 + sm.confirmElapsed) : t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  // ISSUES #39 rank-5 slice 1: `turn12KickoffBounceTick`'s own already-
  // established freeze (past `pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`,
  // its driver already torn down) is out of `TURN12_KICKOFF_BOUNCE_INDEX_
  // OFFSET`'s own RAM-verified regime (live driver) - only apply the offset
  // while that driver is still live.
  const bounceIndexOffset = sm.confirmElapsed === null || t < TICK0 + sm.confirmElapsed + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY
    ? TURN12_KICKOFF_BOUNCE_INDEX_OFFSET
    : 0;
  drawTurn12FieldBase(fb, t, bounceTick, undefined, undefined, undefined, undefined, undefined, undefined, bounceIndexOffset);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
  drawFightSubmenuChromeFromLatest(fb, sm.displayCursor, sm.activeMonMoveset, latest);
}

export function drawTurn12RockSlideWindow(fb: Uint8Array, t: number): void {
  const pressTick = TURN12_OFF_ROCKSLIDE_PRESS_TICK;
  const redrawTick = pressTick + TURN12_ROCKSLIDE_MENU_REDRAW_DELAY;
  if (t >= redrawTick) {
    drawTurn12TurnEndSettledMenu(fb, t, t, pressTick);
    return;
  }
  const frozenBounceTick = turn12KickoffBounceTick(t, pressTick);
  drawTurn12FieldBase(fb, t, frozenBounceTick, undefined, TURN12_ONIX_AFTER_AERIALACE_HP, 0, false);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  const textClearTick = pressTick + TURN12_ROCKSLIDE_TEXT_CLEAR_DELAY;
  if (t < textClearTick) {
    const missStart = turn12MissTextStartTick(pressTick);
    if (t >= missStart) {
      drawMessageTextLines(fb, turn8MissLines()[0], turn8MissLines()[1], turn12MissTextVisibleChars(t, pressTick));
    } else {
      drawMessageTextLines(fb, ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2, rockSlideTextVisibleChars(t, pressTick));
    }
  }
}

export function drawTurn12TurnEndSettledMenu(fb: Uint8Array, t: number, bounceRawTick: number = t, pressTick: number = TURN12_ROCKSLIDE_PRESS_TICK): void {
  const bounceTick = turn12RockSlideResettledBounceTick(bounceRawTick, pressTick);
  const bounce = menuIdleBounce(bounceTick);
  drawStaticBgShiftedY(fb, 0, 0);
  drawTurn5IconBar(fb, t);
  drawTurn5SwitchinSprite(fb, t);
  drawSendOutHealthbox(fb, 0, pidgeottoHealthboxContentForHp(TURN11_PIDGEOTTO_AFTER_ROCKSLIDE_HP));
  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y + bounce.onixY2);
  drawMenuHealthboxPlayer(fb, 0, bounce.healthboxY2);
  drawPlayerHealthboxHpOverlay(fb, TURN12_ONIX_AFTER_AERIALACE_HP, bounce.healthboxY2);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
}

export function drawTurn12AerialAceWindow(fb: Uint8Array, t: number, pressTick: number): void {
  if (t >= rockSlideTextStartTick(TURN12_OFF_ROCKSLIDE_PRESS_TICK)) {
    drawTurn12RockSlideWindow(fb, t);
    return;
  }
  const bounceTick = turn12KickoffBounceTick(t, pressTick);
  const onixHp = turn10AerialAceHp(t, pressTick, TURN12_AERIALACE_HP.from, TURN12_AERIALACE_HP.to, TURN12_OFF_AERIALACE_HP_DRAIN_START_DELAY);
  const onixInvisible = turn9Ep2OnixInvisible(t, pressTick, TURN12_OFF_ONIX_FLICKER_START);
  const healthboxY2 = turn9Ep2HealthboxWobbleY2(t, pressTick, TURN12_OFF_ONIX_HEALTHBOX_WOBBLE_START);
  drawTurn12FieldBase(fb, t, bounceTick, undefined, onixHp, 0, false, onixInvisible, healthboxY2);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  const notVeryEffectiveStart = turn10NotVeryEffectiveTextStartTick(pressTick, TURN12_OFF_NOTVERYEFFECTIVE_TEXT_DELAY);
  if (t >= notVeryEffectiveStart) {
    drawMessageTextLines(fb, TURN9_NOTVERYEFFECTIVE_LINE, "", turn10NotVeryEffectiveTextVisibleChars(t, pressTick, TURN12_OFF_NOTVERYEFFECTIVE_TEXT_DELAY));
  } else {
    drawMessageTextLines(fb, TURN10_AERIALACE_LINE1, TURN10_AERIALACE_LINE2, turn10AerialAceTextVisibleChars(t, pressTick));
  }
}

export function drawTurn12FieldBase(fb: Uint8Array, t: number, bounceTick: number = t, beforeMonSprite?: () => void, onixHp: number = TURN10_ONIX_AFTER_AERIALACE_HP, onixY2Extra: number = 0, darken: boolean = false, onixInvisible: boolean = false, healthboxY2Override?: number, bounceIndexOffset: number = 0): void {
  drawTurn6FieldBase(fb, t, bounceTick + TURN12_REGIME7_TO_REGIME1_SHIFT, beforeMonSprite, onixHp, 0, onixInvisible, healthboxY2Override, onixY2Extra, darken, undefined, undefined, undefined, bounceIndexOffset);
  drawSendOutHealthbox(fb, 0, pidgeottoHealthboxContentForHp(TURN11_PIDGEOTTO_AFTER_ROCKSLIDE_HP));
}

export function drawTurn11FightSubmenuWindow(
  fb: Uint8Array,
  t: number,
  sm: FightSubmenuState,
  latest: LatestCompletedCommandHandoff | null = null,
): void {
  if (sm.openElapsed === null) {
    drawTurn10RockSlideTurnEndSettledMenu(fb, t);
    return;
  }
  const revealTick = TICK0 + sm.openElapsed + FIGHT_SUBMENU_OPEN_DELAY;
  if (t < revealTick) {
    drawTurn10RockSlideTurnEndSettledMenu(fb, t, t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT);
    return;
  }
  if (sm.confirmElapsed !== null) {
    const pressTick = TICK0 + sm.confirmElapsed;
    const textStart = turn6FeatherDanceTextStartTick(pressTick);
    if (t >= textStart) {
      drawTurn11FeatherDanceWindow(fb, t, pressTick);
      return;
    }
  }
  const bounceTick = sm.confirmElapsed !== null ? turn11KickoffBounceTick(t, TICK0 + sm.confirmElapsed) : t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  // ISSUES #39 rank-5 slice 1: `turn11KickoffBounceTick`'s own already-
  // established freeze (past `pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`,
  // its driver already torn down) is out of `TURN11_KICKOFF_BOUNCE_INDEX_
  // OFFSET`'s own RAM-verified regime (live driver) - only apply the offset
  // while that driver is still live.
  const bounceIndexOffset = sm.confirmElapsed === null || t < TICK0 + sm.confirmElapsed + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY
    ? TURN11_KICKOFF_BOUNCE_INDEX_OFFSET
    : 0;
  drawTurn11FieldBase(fb, t, bounceTick, undefined, undefined, undefined, undefined, bounceIndexOffset);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
  drawFightSubmenuChromeFromLatest(fb, sm.displayCursor, sm.activeMonMoveset, latest);
}

export function drawTurn11FeatherDanceWindow(fb: Uint8Array, t: number, pressTick: number): void {
  if (t >= rockSlideTextStartTick(TURN11_ROCKSLIDE_PRESS_TICK)) {
    drawTurn11RockSlideWindow(fb, t);
    return;
  }
  const bounceTick = turn11KickoffBounceTick(t, pressTick);
  drawTurn11FieldBase(fb, t, bounceTick);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  const atkFloorStart = turn11AtkFloorTextStartTick(pressTick);
  if (t >= atkFloorStart) {
    drawMessageTextLines(fb, turn11AtkfloorKickoffLines()[0], turn11AtkfloorKickoffLines()[1], turn11AtkFloorTextVisibleChars(t, pressTick));
  } else {
    drawMessageTextLines(fb, TURN6_FEATHERDANCE_LINE1, TURN6_FEATHERDANCE_LINE2, turn6FeatherDanceTextVisibleChars(t, pressTick));
  }
}

export function drawTurn11RockSlideWindow(fb: Uint8Array, t: number): void {
  const pressTick = TURN11_ROCKSLIDE_PRESS_TICK;
  const redrawTick = pressTick + TURN11_OFF_ROCKSLIDE_MENU_REDRAW_DELAY;
  if (t >= redrawTick) {
    drawTurn11RockSlideTurnEndSettledMenu(fb, t, t, pressTick, TURN11_OFF_ROCKSLIDE_MENU_REDRAW_DELAY);
    return;
  }
  const textClearTick = pressTick + TURN11_OFF_ROCKSLIDE_TEXT_CLEAR_DELAY;
  drawTurn11RockSlideAttack(fb, t);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  if (t < textClearTick) {
    const superEffectiveStart = turn11SuperEffectiveTextStartTick(pressTick, TURN11_OFF_SUPER_EFFECTIVE_TEXT_DELAY);
    if (t >= superEffectiveStart) {
      drawMessageTextLines(fb, TURN6_SUPER_EFFECTIVE_LINE, "", turn11SuperEffectiveTextVisibleChars(t, pressTick, TURN11_OFF_SUPER_EFFECTIVE_TEXT_DELAY));
    } else {
      drawMessageTextLines(fb, ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2, rockSlideTextVisibleChars(t, pressTick));
    }
  }
}

export function drawTurn11RockSlideTurnEndSettledMenu(fb: Uint8Array, t: number, bounceRawTick: number = t, pressTick: number = TURN11_ROCKSLIDE_PRESS_TICK, menuRedrawDelay: number = TURN11_ROCKSLIDE_MENU_REDRAW_DELAY): void {
  const bounceTick = turn11RockSlideResettledBounceTick(bounceRawTick, pressTick, menuRedrawDelay);
  const bounce = menuIdleBounce(bounceTick);
  drawStaticBgShiftedY(fb, 0, 0);
  drawTurn5IconBar(fb, t);
  drawTurn5SwitchinSprite(fb, t);
  drawSendOutHealthbox(fb, 0, pidgeottoHealthboxContentForHp(TURN11_PIDGEOTTO_AFTER_ROCKSLIDE_HP));
  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y + bounce.onixY2);
  drawMenuHealthboxPlayer(fb, 0, bounce.healthboxY2);
  drawPlayerHealthboxHpOverlay(fb, TURN10_ONIX_AFTER_AERIALACE_HP, bounce.healthboxY2);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
}

export function drawTurn11RockSlideAttack(fb: Uint8Array, t: number): void {
  const pressTick = TURN11_ROCKSLIDE_PRESS_TICK;
  drawStaticBgShiftedY(fb, 0, turn5BgFadeY(t));
  drawTurn5IconBar(fb, t);
  if (!rockSlideMonBlinkInvisible(t, pressTick, TURN11_OFF_ROCKSLIDE_ANIMATION_PROFILE)) {
    drawSpriteSheet(fb, pidgeottoFrontSprite.tileset, pidgeottoFrontSprite.palette, PIDGEOTTO_CORNER.x, PIDGEOTTO_CORNER.y);
  }
  const frozenBounceTick = turn10KickoffBounceTick(t, pressTick);
  const bounce = menuIdleBounce(turn5SitrusResettledBounceTick(frozenBounceTick + TURN10_REGIME5_TO_REGIME1_SHIFT));
  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y + bounce.onixY2);
  const healthboxY2 = rockSlideHealthboxWobbleY2(t, pressTick, TURN11_OFF_ROCKSLIDE_ANIMATION_PROFILE);
  const opponentHp = rockSlideOpponentHp(t, pressTick, TURN10_PIDGEOTTO_AFTER_ROCKSLIDE_HP, TURN11_PIDGEOTTO_AFTER_ROCKSLIDE_HP, TURN11_OFF_ROCKSLIDE_HP_DRAIN_START_DELAY);
  const opponentContent = pidgeottoHealthboxContentForHp(opponentHp);
  drawSendOutHealthbox(fb, 0, opponentContent);
  if (healthboxY2 !== 0) drawOpponentHealthboxWobble(fb, healthboxY2, opponentContent);
  drawMenuHealthboxPlayer(fb, 0, 0);
  drawPlayerHealthboxHpOverlay(fb, TURN10_ONIX_AFTER_AERIALACE_HP, 0);
}

export function drawTurn11FieldBase(fb: Uint8Array, t: number, bounceTick: number = t, beforeMonSprite?: () => void, onixHp: number = TURN10_ONIX_AFTER_AERIALACE_HP, onixY2Extra: number = 0, darken: boolean = false, bounceIndexOffset: number = 0): void {
  drawTurn6FieldBase(fb, t, bounceTick + TURN11_REGIME6_TO_REGIME1_SHIFT, beforeMonSprite, onixHp, 0, false, undefined, onixY2Extra, darken, undefined, undefined, undefined, bounceIndexOffset);
  drawSendOutHealthbox(fb, 0, pidgeottoHealthboxContentForHp(TURN10_PIDGEOTTO_AFTER_ROCKSLIDE_HP));
}

export function drawTurn10FightSubmenuWindow(
  fb: Uint8Array,
  t: number,
  sm: FightSubmenuState,
  latest: LatestCompletedCommandHandoff | null = null,
): void {
  if (sm.openElapsed === null) {
    drawTurn9TurnEndSettledMenu(fb, t);
    return;
  }
  const revealTick = TICK0 + sm.openElapsed + FIGHT_SUBMENU_OPEN_DELAY;
  if (t < revealTick) {
    drawTurn9TurnEndSettledMenu(fb, t, t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT);
    return;
  }
  if (sm.confirmElapsed !== null) {
    const pressTick = TICK0 + sm.confirmElapsed;
    const textStart = turn10AerialAceTextStartTick(pressTick);
    if (t >= textStart) {
      drawTurn10AerialAceWindow(fb, t, pressTick);
      return;
    }
  }
  const bounceTick = sm.confirmElapsed !== null ? turn10KickoffBounceTick(t, TICK0 + sm.confirmElapsed) : t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  drawTurn10FieldBase(fb, t, bounceTick);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
  drawFightSubmenuChromeFromLatest(fb, sm.displayCursor, sm.activeMonMoveset, latest);
}

export function drawTurn10AerialAceWindow(fb: Uint8Array, t: number, pressTick: number): void {
  if (t >= rockSlideTextStartTick(TURN10_OFF_ROCKSLIDE_PRESS_TICK)) {
    drawTurn10RockSlideWindow(fb, t);
    return;
  }
  const bounceTick = turn10KickoffBounceTick(t, pressTick);
  const onixHp = turn10AerialAceHp(t, pressTick, TURN10_AERIALACE_HP.from, TURN10_AERIALACE_HP.to, TURN10_OFF_AERIALACE_HP_DRAIN_START_DELAY);
  const onixInvisible = turn9Ep2OnixInvisible(t, pressTick, TURN10_OFF_ONIX_FLICKER_START);
  const healthboxY2 = turn9Ep2HealthboxWobbleY2(t, pressTick, TURN10_OFF_ONIX_HEALTHBOX_WOBBLE_START);
  drawTurn10FieldBase(fb, t, bounceTick, undefined, onixHp, 0, false, onixInvisible, healthboxY2);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  const notVeryEffectiveStart = turn10NotVeryEffectiveTextStartTick(pressTick, TURN10_OFF_NOTVERYEFFECTIVE_TEXT_DELAY);
  if (t >= notVeryEffectiveStart) {
    drawMessageTextLines(fb, TURN9_NOTVERYEFFECTIVE_LINE, "", turn10NotVeryEffectiveTextVisibleChars(t, pressTick, TURN10_OFF_NOTVERYEFFECTIVE_TEXT_DELAY));
  } else {
    drawMessageTextLines(fb, TURN10_AERIALACE_LINE1, TURN10_AERIALACE_LINE2, turn10AerialAceTextVisibleChars(t, pressTick));
  }
}

export function drawTurn10RockSlideWindow(fb: Uint8Array, t: number): void {
  const pressTick = TURN10_OFF_ROCKSLIDE_PRESS_TICK;
  const redrawTick = pressTick + TURN10_OFF_ROCKSLIDE_MENU_REDRAW_DELAY;
  if (t >= redrawTick) {
    drawTurn10RockSlideTurnEndSettledMenu(fb, t, t, pressTick, TURN10_OFF_ROCKSLIDE_MENU_REDRAW_DELAY);
    return;
  }
  const textClearTick = pressTick + TURN10_OFF_ROCKSLIDE_TEXT_CLEAR_DELAY;
  drawTurn10RockSlideAttack(fb, t);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  if (t < textClearTick) {
    const superEffectiveStart = turn10SuperEffectiveTextStartTick(pressTick, TURN10_OFF_SUPER_EFFECTIVE_TEXT_DELAY);
    if (t >= superEffectiveStart) {
      drawMessageTextLines(fb, TURN6_SUPER_EFFECTIVE_LINE, "", turn10SuperEffectiveTextVisibleChars(t, pressTick, TURN10_OFF_SUPER_EFFECTIVE_TEXT_DELAY));
    } else {
      drawMessageTextLines(fb, ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2, rockSlideTextVisibleChars(t, pressTick));
    }
  }
}

export function drawTurn10RockSlideTurnEndSettledMenu(fb: Uint8Array, t: number, bounceRawTick: number = t, pressTick: number = TURN10_ROCKSLIDE_PRESS_TICK, menuRedrawDelay: number = TURN10_ROCKSLIDE_MENU_REDRAW_DELAY): void {
  const bounceTick = turn10RockSlideResettledBounceTick(bounceRawTick, pressTick, menuRedrawDelay);
  const bounce = menuIdleBounce(bounceTick);
  drawStaticBgShiftedY(fb, 0, 0);
  drawTurn5IconBar(fb, t);
  drawTurn5SwitchinSprite(fb, t);
  drawSendOutHealthbox(fb, 0, pidgeottoHealthboxContentForHp(TURN10_PIDGEOTTO_AFTER_ROCKSLIDE_HP));
  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y + bounce.onixY2);
  drawMenuHealthboxPlayer(fb, 0, bounce.healthboxY2);
  drawPlayerHealthboxHpOverlay(fb, TURN10_ONIX_AFTER_AERIALACE_HP, bounce.healthboxY2);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
}

export function drawTurn10RockSlideAttack(fb: Uint8Array, t: number): void {
  const pressTick = TURN10_OFF_ROCKSLIDE_PRESS_TICK;
  drawStaticBgShiftedY(fb, 0, turn5BgFadeY(t));
  drawTurn5IconBar(fb, t);
  if (!rockSlideMonBlinkInvisible(t, pressTick, TURN10_OFF_ROCKSLIDE_ANIMATION_PROFILE)) {
    drawSpriteSheet(fb, pidgeottoFrontSprite.tileset, pidgeottoFrontSprite.palette, PIDGEOTTO_CORNER.x, PIDGEOTTO_CORNER.y);
  }
  const frozenBounceTick = turn10KickoffBounceTick(t, pressTick);
  const bounce = menuIdleBounce(turn5SitrusResettledBounceTick(frozenBounceTick + TURN10_REGIME5_TO_REGIME1_SHIFT));
  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y + bounce.onixY2);
  const healthboxY2 = rockSlideHealthboxWobbleY2(t, pressTick, TURN10_OFF_ROCKSLIDE_ANIMATION_PROFILE);
  const opponentHp = rockSlideOpponentHp(t, pressTick, TURN9_PIDGEOTTO_AFTER_ROCKSLIDE_HP, TURN10_PIDGEOTTO_AFTER_ROCKSLIDE_HP, TURN10_OFF_ROCKSLIDE_HP_DRAIN_START_DELAY);
  const opponentContent = pidgeottoHealthboxContentForHp(opponentHp);
  drawSendOutHealthbox(fb, 0, opponentContent);
  if (healthboxY2 !== 0) drawOpponentHealthboxWobble(fb, healthboxY2, opponentContent);
  drawMenuHealthboxPlayer(fb, 0, 0);
  drawPlayerHealthboxHpOverlay(fb, TURN10_ONIX_AFTER_AERIALACE_HP, 0);
}

export function drawTurn10FieldBase(fb: Uint8Array, t: number, bounceTick: number = t, beforeMonSprite?: () => void, onixHp: number = TURN9_ONIX_AFTER_QUICKATTACK_HP, onixY2Extra: number = 0, darken: boolean = false, onixInvisible: boolean = false, healthboxY2Override?: number): void {
  drawTurn6FieldBase(fb, t, bounceTick + TURN10_REGIME5_TO_REGIME1_SHIFT, beforeMonSprite, onixHp, 0, onixInvisible, healthboxY2Override, onixY2Extra, darken);
  drawSendOutHealthbox(fb, 0, pidgeottoHealthboxContentForHp(TURN9_PIDGEOTTO_AFTER_ROCKSLIDE_HP));
}

export function drawTurn15MagbySettledMenuChrome(fb: Uint8Array): void {
  drawTurn5SitrusSettledMenuChrome(fb);
  const TEXT_ROW_X = 8;
  const TEXT_ROW_Y = 136;
  const TEXT_ROW_WIDTH = 14 * 8;
  const TEXT_ROW_HEIGHT = 2 * 8;
  for (let py = 0; py < TEXT_ROW_HEIGHT; py += 1) {
    for (let px = 0; px < TEXT_ROW_WIDTH; px += 1) {
      const x = TEXT_ROW_X + px;
      const y = TEXT_ROW_Y + py;
      const i = (y * menuIdleBlank.width + x) * 3;
      setPixel(fb, x, y, {
        r: menuIdleBlank.pixels[i]!,
        g: menuIdleBlank.pixels[i + 1]!,
        b: menuIdleBlank.pixels[i + 2]!,
      });
    }
  }
  drawText(fb, font, charmap, "MAGBY do?", TEXT_ROW_X + 1, LINE2_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
}

export function drawTurn13SwitchinWindow(
  fb: Uint8Array,
  t: number,
  frozenBounceTick: number,
  cursorStart: number,
  opponentFaintPresentationOwner: OpponentFaintPresentationOwner,
  trainerPresentation?: FactoryTrainerPresentation,
): void {
  const dismiss = opponentFaintPresentationOwner.dismiss;
  if (dismiss === null) return;
  const continuationElapsed = opponentFaintContinuationElapsed(
    opponentFaintPresentationOwner,
    t - TICK0,
  );
  if (continuationElapsed === null) return;
  const settled = continuationElapsed >= TURN13_SWITCHIN_MENU_REDRAW_AFTER_DISMISS;
  const shiftedBounceTick = settled
    ? continuationElapsed + TURN13_SWITCHIN_RESET_AFTER_DISMISS_SHIFT
    : frozenBounceTick + TURN13_REGIME8_TO_REGIME1_SHIFT;
  drawTurn13SwitchinPresentationFieldBase(
    fb,
    t,
    continuationElapsed,
    shiftedBounceTick,
  );
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  if (settled) {
    drawTurn5SitrusSettledMenuChrome(fb);
    return;
  }
  if (continuationElapsed < TURN13_SWITCHIN_SENTOUT_TEXT_AFTER_DISMISS) {
    // The button-gated fainted message's own wait-cursor stays frozen in
    // place (same locked phase the press itself established) all the way
    // through the icon-bar retrigger and species-flip, right up until the
    // sent-out text hard-cuts over it - oracle-pixel-confirmed this session
    // (a first attempt dropped the cursor entirely here, regressing a
    // constant 37px diff, exactly one glyph's worth, isolated to the
    // cursor's own bbox at every sampled tick 16847-16946).
    drawMessageTextLines(
      fb,
      turn13DragonbreathFaintLines()[0],
      turn13DragonbreathFaintLines()[1],
      turn13DragonbreathFaintTextTotal(),
    );
    const frozenCursorTick = TICK0 + dismiss.cursor.frozenAtElapsed;
    const cursor = cursorState(frozenCursorTick, cursorStart);
    if (cursor.visible) drawCursor(fb, cursor.yOffset, turn13FaintedCursorX());
    return;
  }
  if (continuationElapsed < TURN13_SWITCHIN_TEXT_CLEAR_AFTER_DISMISS) {
    drawMessageTextLines(
      fb,
      switchinSentOutLine1(trainerPresentation),
      turn13SwitchinSentoutLine2(),
      turn13SwitchinSentOutTextVisibleChars(continuationElapsed, trainerPresentation),
    );
    return;
  }
  // text-clear <= continuation < menu-redraw: blank hold, mirrors
  // drawTurn5RockSlideWindow's own TEXT_CLEAR->MENU_REDRAW gap - the
  // unconditional drawTileBg call above already painted the message box's
  // own flat teal fill, nothing else to draw here.
}

export function drawTurn13SwitchinFieldBase(fb: Uint8Array, t: number, shiftedBounceTick: number, murkrowInvisible: boolean = false, onixInvisible: boolean = false, healthboxY2Extra: number = 0, onixX2: number = 0, onixHp: number = TURN12_ONIX_AFTER_AERIALACE_HP, onixSinkSkipRows: number = 0, onixHealthboxVisible: boolean = true): void {
  drawTurn13SwitchinPresentationFieldBase(
    fb,
    t,
    TURN13_SWITCHIN_MENU_REDRAW_AFTER_DISMISS,
    shiftedBounceTick,
    murkrowInvisible,
    onixInvisible,
    healthboxY2Extra,
    onixX2,
    onixHp,
    onixSinkSkipRows,
    onixHealthboxVisible,
  );
}

export function drawTurn13SwitchinPresentationFieldBase(fb: Uint8Array, t: number, continuationElapsed: number, shiftedBounceTick: number, murkrowInvisible: boolean = false, onixInvisible: boolean = false, healthboxY2Extra: number = 0, onixX2: number = 0, onixHp: number = TURN12_ONIX_AFTER_AERIALACE_HP, onixSinkSkipRows: number = 0, onixHealthboxVisible: boolean = true): void {
  drawTurn5RockSlideAttack(fb, t, shiftedBounceTick, undefined, onixX2, onixInvisible, 0, false, turn13MurkrowBgFadeY(continuationElapsed), onixSinkSkipRows);
  drawTurn5IconBar(fb, continuationElapsed, TURN13_ICONBAR_CREATE_AFTER_DISMISS, TURN13_ICONBAR_FADE_START_AFTER_DISMISS, TURN13_ICONBAR_DESTROY_AFTER_DISMISS, TURN13_OPPONENT_ICON_STATES);
  if (!murkrowInvisible) drawTurn13MurkrowSwitchinSprite(fb, continuationElapsed);
  const murkrowHealthboxDx = healthboxSlideDx(continuationElapsed, TURN13_MURKROW_SETTLE_AFTER_DISMISS + 1);
  if (murkrowHealthboxDx !== null) drawSendOutHealthbox(fb, murkrowHealthboxDx, getMurkrowHealthboxContent());
  if (onixHealthboxVisible) {
    const bounce = menuIdleBounce(turn5SitrusResettledBounceTick(shiftedBounceTick));
    const healthboxY2 = bounce.healthboxY2 + healthboxY2Extra;
    drawMenuHealthboxPlayer(fb, 0, healthboxY2);
    drawPlayerHealthboxHpOverlay(fb, onixHp, healthboxY2);
  }
}

export function drawTurn13MurkrowSwitchinSprite(fb: Uint8Array, continuationElapsed: number): void {
  if (continuationElapsed < TURN13_BALL_HANDOFF_AFTER_DISMISS) return;
  drawTurn13MurkrowMaterialize(fb, continuationElapsed);
  drawSendOutBall(fb, continuationElapsed, TURN13_BALL_HANDOFF_AFTER_DISMISS);
  drawTurn5SwitchinParticles(fb, continuationElapsed, TURN13_BALL_HANDOFF_AFTER_DISMISS);
  if (continuationElapsed >= TURN13_MURKROW_SETTLE_AFTER_DISMISS) drawTurn13MurkrowSettled(fb);
}

export function drawTurn13MurkrowMaterialize(fb: Uint8Array, continuationElapsed: number): void {
  if (
    continuationElapsed < TURN13_MURKROW_MATERIALIZE_AFTER_DISMISS
    || continuationElapsed >= TURN13_MURKROW_SETTLE_AFTER_DISMISS
  ) return;
  const frame = turn13MurkrowFrame(continuationElapsed);
  const tileset = frame === 0 ? murkrowFrontSprite.tileset : murkrowFrontSprite.frame2;
  if (continuationElapsed < TURN13_MURKROW_STRETCH_AFTER_DISMISS) {
    const local = continuationElapsed - TURN13_MURKROW_MATERIALIZE_AFTER_DISMISS;
    const accumulator = affineEmergeAccumulator(local + 1);
    const y2 = MATERIALIZE_Y2_TABLE[local] ?? 0;
    const coeff = turn13MurkrowMaterializeCoeff(continuationElapsed);
    drawSpriteSheetAffineTintedBlend(fb, tileset, murkrowFrontSprite.palette, MURKROW_CORNER.x, MURKROW_CORNER.y, accumulator, MATERIALIZE_TINT_COLOR, coeff, y2);
    return;
  }
  const entry = TURN13_MURKROW_WOBBLE_TABLE[Math.min(continuationElapsed - TURN13_MURKROW_STRETCH_AFTER_DISMISS, TURN13_MURKROW_WOBBLE_TABLE.length - 1)]!;
  const wobbleCoeff = turn13MurkrowMaterializeCoeff(continuationElapsed);
  drawSpriteSheetAffineStretch(fb, tileset, murkrowFrontSprite.palette, MURKROW_CORNER.x, MURKROW_CORNER.y, entry.xScale, entry.yScale, entry.y2, MATERIALIZE_TINT_COLOR, wobbleCoeff, true);
}

export function drawGrantingStars(fb: Uint8Array, t: number): void {
  drawGrantingStarsAtAge(
    fb,
    t - onixSitrusIdentityRenderTick(),
    turn5SitrusRingCenter(),
  );
}

export function drawDragonBreathTurnEndSettledMenu(
  fb: Uint8Array,
  t: number,
  latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null,
  turn2Content: FightCommandPresentation,
): void {
  const bounceTick = fightCommandSettledBounceEpochTick(turn2Content, t - TICK0);
  drawActionMenuIdleContentFromLatest(
    fb,
    bounceTick,
    latestCompletedCommandHandoff,
  );
}

export function drawDragonBreathScene(
  fb: Uint8Array,
  t: number,
  pressTick: number,
  latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null = null,
): void {
  drawStaticBgShiftedY(fb, 0);
  const grovyleHp = dragonBreathHp(t, pressTick, getAnchorOpponentAfterTurnHp(), getAnchorOpponentAfterTurn2Hp(), TURN2_OFF_DRAGONBREATH_HP_DRAIN_START_DELAY);
  const grovyleContent = opponentHealthboxContentForHp(grovyleHp);
  const hitFlashPressTick = pressTick + (TURN2_OFF_DRAGONBREATH_HIT_FLASH_ANCHOR_DELAY - HIT_FLASH_RAM_ANCHOR_DELAY);

  if (!rockSlideMonBlinkInvisible(t, hitFlashPressTick)) {
    drawSpriteSheet(fb, grovyleFrontSprite.tileset, grovyleFrontSprite.palette, GROVYLE_CORNER.x, GROVYLE_CORNER.y);
  }

  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y);
  drawSendOutHealthbox(fb, 0, grovyleContent);
  drawMenuHealthboxPlayer(fb, 0, 0);
  const genericEpochAge = latestCompletedCommandPresentationEpochElapsedSinceReset(
    latestCompletedCommandHandoff,
    t - TICK0,
  );
  const bounceTick = genericEpochAge !== null
    ? turn2KickoffBounceTick(t - TICK0, pressTick - TICK0, genericEpochAge)
    : turnKickoffBounceTick(t, pressTick);
  drawMenuIdleBounceOverlay(fb, bounceTick);
  const healthboxY2 = rockSlideHealthboxWobbleY2(t, hitFlashPressTick);
  if (healthboxY2 !== 0) drawOpponentHealthboxWobble(fb, healthboxY2, grovyleContent);
}

export function drawMenuIdleBounceOverlay(fb: Uint8Array, bounceTick: number, bounceIndexOffset: number = 0): void {
  const { onixY2, healthboxY2 } = menuIdleBounce(bounceTick, bounceIndexOffset);
  drawTwoStateBounceRect(fb, menuIdleOnixBounce, onixY2);
  drawTwoStateBounceRect(fb, menuIdleHealthboxBounce, healthboxY2);
}

export function drawFightSubmenuWindow(
  fb: Uint8Array,
  t: number,
  sm: FightSubmenuState,
  latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null = null,
  opponentFaintPresentationOwner: OpponentFaintPresentationOwner | null = null,
  resolutionOwner: BattleSceneResolutionOwner | null = null,
  trainerPresentation?: FactoryTrainerPresentation,
  turn5FaintDismissElapsed: number | null = null,
): void {
  const genericTurn2Content = turn2FightCommandPresentationFromLatest(
    latestCompletedCommandHandoff,
  );
  const genericTurn3Content = turn3FightCommandPresentationFromLatest(
    latestCompletedCommandHandoff,
  );
  const genericTurn4Content = turn4FightCommandPresentationFromLatest(
    latestCompletedCommandHandoff,
  );
  const turn2Active = isLatestCompletedCommandLifecycleActive(
    latestCompletedCommandHandoff,
    sm.openElapsed,
  );
  const turn3Active = isTurn2LatestCompletedCommandLifecycleActive(
    latestCompletedCommandHandoff,
    sm.openElapsed,
  );
  const turn4Active = isTurn3LatestCompletedCommandLifecycleActive(
    latestCompletedCommandHandoff,
    sm.openElapsed,
  );
  // Turn 3's own source-owned reset publishes directly into the shared
  // generic slot, which is exactly what `turn3Active` above narrows FROM
  // (turn 2's content) - so that publish evicts the very shape `turn3Active`
  // depends on for the remainder of turn 3's own window (kickoff text is
  // long past `genericTurn2Content`'s own need by the time this reset
  // fires, but the render dispatch below still needs a "we're still inside
  // turn 3's window" flag through its settled menu). `!turn4Active` keeps
  // this OFF once turn 4's own FIGHT reopen supersedes it.
  const turn3SettledWindowActive = !turn4Active && genericTurn3Content !== null;
  const turn5Active = isTurn4LatestCompletedCommandLifecycleActive(
    latestCompletedCommandHandoff,
    sm.openElapsed,
  );
  // Turn 4's own source-owned reset publishes directly into the shared
  // generic slot, evicting the turn-3 shape `turn4Active` above narrows
  // FROM - so that publish happens WHILE we're still deep inside turn 4's
  // own settled-menu display (`drawTurn4RockSlideWindow`'s own redrawTick
  // branch), exactly the eviction-class trap slice 8 already hit one turn
  // earlier (`turn3SettledWindowActive`'s own doc). `!turn5Active` keeps
  // this OFF once turn 5's own FIGHT reopen supersedes it.
  const turn4SettledWindowActive = !turn5Active && genericTurn4Content !== null;
  if (
    isLatestCompletedCommandHandoffReady(latestCompletedCommandHandoff)
    && latestCompletedCommandPresentationEpoch(latestCompletedCommandHandoff) === null
  ) {
    drawLatestCompletedCommandWindow(
      fb,
      t,
      sm,
      latestCompletedCommandHandoff,
      opponentFaintPresentationOwner,
      resolutionOwner,
      trainerPresentation,
    );
    return;
  }
  if (sm.openElapsed === null) {
    drawActionMenuIdleWindow(fb, t, false, undefined, null, latestCompletedCommandHandoff);
    return;
  }
  const revealTick = TICK0 + sm.openElapsed + FIGHT_SUBMENU_OPEN_DELAY;
  if (t < revealTick) {
    // Open DMA-wait: the submenu's content is drawn off-screen, not yet
    // revealed - the screen still shows the action menu, unmodified (§11
    // finding 1's "5-tick hold" turns out to need no special-casing at all:
    // it's just this same bounce cycle naturally dwelling on one phase for
    // that span, pixel-confirmed exact with a plain, unshifted `t`).
    drawActionMenuIdleWindow(fb, t, sm.reopenedFromClose, TICK0 + sm.openElapsed, sm.openElapsed, latestCompletedCommandHandoff);
    return;
  }
  if (sm.closeElapsed !== null) {
    const closeRevealTick = TICK0 + sm.closeElapsed + FIGHT_SUBMENU_CLOSE_DELAY;
    if (t >= closeRevealTick) {
      drawActionMenuIdleContentFromLatest(fb, t - FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT, latestCompletedCommandHandoff);
      return;
    }
  }
  if (sm.confirmElapsed !== null) {
    const pressTick = TICK0 + sm.confirmElapsed;
    // S7 slice G: turn 3's own confirm (cursor 0, ROCK_SLIDE selected by the
    // player) still kicks off Grovyle's ENDEAVOR first (speed 90 beats
    // Onix's 76, same turn-order rule every prior turn established) -
    // distinguished from turn 1's own cursor-0 confirm by the active
    // completed-turn-2 command lifecycle. Turn 4 needs DOUBLE_TEAM-family
    // timing despite retaining that older receipt, so it stays excluded.
    const inTurn4DoubleTeamWindow = turn4Active && !turn5Active;
    const textStart = (sm.cursor === 2 || turn3Active || turn5Active) && !inTurn4DoubleTeamWindow ? turn2KickoffTextStartTick(pressTick) : turnKickoffTextStartTick(pressTick);
    if (t >= textStart) {
      // S7 slice E1: turn 2's confirm (cursor 2, DRAGON_BREATH) kicks off
      // Grovyle's ENDEAVOR instead of turn 1's DOUBLE_TEAM - this slice only
      // models the kickoff text itself (the animation/HP-drain window is out
      // of scope this session, docs/battle-menu-notes.md §13), so there's no
      // turn-2 equivalent of `drawRockSlideWindow`'s later phases yet.
      if (sm.cursor === 2) {
        drawTurn2KickoffText(fb, t, pressTick, latestCompletedCommandHandoff);
        return;
      }
      if (turn5Active) {
        // S7 slice J (docs/battle-turn-notes.md §13/§23): turn 5's own
        // confirm (cursor 0, ROCK_SLIDE again) kicks off Grovyle's ENDEAVOR
        // once more - distinguished from turn 3's own ENDEAVOR confirm by
        // the completed-turn-4 receipt's later command lifecycle.
        drawTurn5EndeavorText(
          fb,
          t,
          pressTick,
          latestCompletedCommandHandoff,
          trainerPresentation,
          turn5FaintDismissElapsed,
        );
        return;
      }
      if (turn4Active || turn4SettledWindowActive) {
        // S7 slice I (docs/battle-turn-notes.md §13/§22): turn 4's own
        // confirm (cursor 0, ROCK_SLIDE again) kicks off Grovyle's
        // DOUBLE_TEAM first - same move as turn 1's own, distinguished by
        // the completed-turn-3 receipt's later command lifecycle. Slice 9:
        // `turn4SettledWindowActive` keeps this branch selected through
        // turn 4's own settled menu even after its reset has evicted
        // `turn4Active`'s own turn-3 view from the shared slot.
        drawTurn4KickoffText(
          fb,
          t,
          pressTick,
          latestCompletedCommandHandoff,
        );
        return;
      }
      if (turn3Active || turn3SettledWindowActive) {
        // S7 slice G (docs/battle-turn-notes.md §20): turn 3's own ENDEAVOR
        // half - stops holding the kickoff text once printed, deliberately
        // NOT dispatching onward into ROCK_SLIDE's own kickoff (out of
        // scope; the caller/trace never captures past the oracle-confirmed
        // safe boundary this function's own doc names). Slice 8:
        // `turn3SettledWindowActive` keeps this branch selected through
        // turn 3's own settled menu even after its reset has evicted
        // `turn3Active`'s own turn-2 view from the shared slot.
        drawTurn3EndeavorText(fb, t, pressTick, latestCompletedCommandHandoff, genericTurn2Content);
        return;
      }
      // ISSUES #39 rank-6 slice 1: turn 1 is now Scene-OFF-owned - DOUBLE_TEAM's
      // own clone-blend (formerly `drawDoubleTeamClones`, deleted entirely in
      // rank-6 slice 4 once turn 4 also flipped) is class (c), never renders
      // under `HITMARKER_NO_ANIMATIONS` (RAM-confirmed absent the whole
      // window, `TURN1_OFF_ROCKSLIDE_ANIMATION_PROFILE`'s own doc comment
      // above), so this branch never calls it; the generic stat-change
      // banner is exempt from that substitution and re-times via the
      // `TURN1_OFF_STATS_BANNER_*` constants instead of the shared ON-fit
      // ones.
      if (t - pressTick > TURN1_OFF_STATS_BANNER_END_DELAY) {
        drawRockSlideWindow(fb, t, pressTick);
        return;
      }
      drawTurnKickoffText(fb, t, pressTick);
      drawStatsBanner(fb, t, pressTick, TURN1_OFF_STATS_BANNER_START_DELAY, TURN1_OFF_STATS_BANNER_END_DELAY, TURN1_OFF_STATS_BANNER_BG1_Y_ANCHOR_DELAY);
      return;
    }
    // Engine-side turn-order/attacker resolution is in flight but not yet
    // visible - the submenu keeps showing its ordinary slot content, but the
    // onix/healthbox bounce overlay is already frozen (battleMenu.ts's new
    // Slice 7 doc comment: `DoBounceEffect` stops being polled the instant
    // the A-press hands off, not merely once the text becomes visible).
    drawMenuIdleBaseWithOpponentHpFromLatest(fb, latestCompletedCommandHandoff);
    drawFightSubmenuChromeFromLatest(fb, sm.displayCursor, sm.activeMonMoveset, latestCompletedCommandHandoff);
    // S7 slice G: turn 3's own confirm-wait window now uses the same
    // freeze-then-hold shape turns 1/2 already established
    // (`turn3KickoffBounceTick`) instead of the plain live formula slice F's
    // own trace got away with (its own window never reached past
    // `FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY` ticks past the press) - oracle-
    // pixel-confirmed unchanged for every tick slice F already covers (the
    // live/frozen values coincide there, see `TURN3_KICKOFF_FROZEN_BOUNCE_TICK`'s
    // own doc). S7 slice I: turn 4's own confirm-wait window is the same
    // shape one epoch further (`turn4KickoffBounceTickFromLatest`). S7
    // slice J: turn 5's own confirm-wait window is the same shape yet
    // another epoch further (`turn5KickoffBounceTickFromLatest`).
    const confirmWaitBounceTick = turn5Active
      ? turn5KickoffBounceTickFromLatest(t, pressTick, latestCompletedCommandHandoff)
      : turn4Active
        ? turn4KickoffBounceTickFromLatest(t, pressTick, latestCompletedCommandHandoff)
        : genericTurn2Content !== null && turn3Active
          ? turn3KickoffBounceTick(
              t - TICK0,
              sm.confirmElapsed,
              genericTurn2Content,
            )
          : turn2Active
            ? turn2KickoffBounceTick(
                t - TICK0,
                sm.confirmElapsed,
                currentEpochPresentationAgeFromLatest(
                  latestCompletedCommandHandoff,
                  t - TICK0,
                ),
              )
            : turnKickoffBounceTick(t, pressTick);
    drawMenuIdleBounceOverlay(fb, confirmWaitBounceTick);
    // S7 slice F: same overlay-after-bounce ordering as
    // `drawActionMenuIdleContentFromLatest`'s own (turn 3's reopen isn't
    // reachable through this specific branch yet - it needs a fresh confirm
    // of its own first - but kept consistent so a future turn-3-confirm
    // slice doesn't rediscover the ordering bug).
    const confirmWaitOverlayPlayerHp = genericTurn4Content?.field.player.hp.current
      ?? genericTurn3Content?.field.player.hp.current
      ?? genericTurn2Content?.field.player.hp.current
      ?? null;
    if (confirmWaitOverlayPlayerHp !== null) {
      drawPlayerHealthboxHpOverlay(fb, confirmWaitOverlayPlayerHp, menuIdleBounce(confirmWaitBounceTick).healthboxY2);
    }
    return;
  }
  drawMenuIdleBaseWithOpponentHpFromLatest(fb, latestCompletedCommandHandoff);
  drawFightSubmenuChromeFromLatest(fb, sm.displayCursor, sm.activeMonMoveset, latestCompletedCommandHandoff);
  // S7 slice E1: turn 2's own reopened submenu inherits the resettled menu's
  // bounce phase, not the plain absolute-`t` mapping turn 1's first open
  // happened to coincide with (the turn-2 epoch mapping's own doc). S7 slice
  // I: turn 4's own reopened submenu is the same shape one epoch further.
  // S7 slice J: turn 5's own reopened submenu is the same shape yet another
  // epoch further.
  // ISSUES #25: a same-turn B-close/reopen (`sm.reopenedFromClose`) is
  // neither the very first open nor a turn-boundary reset - it inherits the
  // cumulative DMA-wait drift instead (`FIGHT_SUBMENU_REOPEN_BOUNCE_SHIFT`'s
  // own doc), checked ahead of the plain-`t` fallback since it's otherwise
  // indistinguishable from turn 1's first open until receipt lifecycle state
  // is considered.
  // ISSUES #97-B (docs/bounce-peak-rounding-fix-spec.md §7): this is the SAME
  // `turn5SubmenuBounceTickFromLatest` formula `drawActionMenuIdleWindow`'s
  // own DMA-wait branch uses, called from this second, different line, with
  // zero discontinuity at revealTick - so it shares window A's own `+109`
  // raw-sine-index constant and `t - 1` display basis (no freeze needed
  // here: this branch is only reached post-reveal, past the 3-tick freeze
  // window entirely).
  const idleWaitBounceIndexOffset = turn5Active ? 109 : 0;
  const idleWaitBounceTick = turn5Active
    ? turn5SubmenuBounceTickFromLatest(t - 1, latestCompletedCommandHandoff)
    : turn4Active
      ? turn4SubmenuBounceTickFromLatest(t, latestCompletedCommandHandoff)
      : genericTurn2Content !== null && turn3Active
        ? fightCommandSubmenuBounceEpochTick(genericTurn2Content, t - TICK0)
        : turn2Active
          ? turn2SubmenuBounceTickFromPresentationEpochAge(
              currentEpochPresentationAgeFromLatest(
                latestCompletedCommandHandoff,
                t - TICK0,
              ),
            )
          : sm.reopenedFromClose
            ? t - FIGHT_SUBMENU_REOPEN_BOUNCE_SHIFT
            : t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  drawMenuIdleBounceOverlay(fb, idleWaitBounceTick, idleWaitBounceIndexOffset);
  // S7 slice F (docs/battle-turn-notes.md §13): turn 3's own reopened submenu
  // (cursor persisted at 2, then UP-nav'd to 0) dwells here while waiting for
  // the confirm press - Onix's own HP overlay (101, stale in the flat
  // harvest) needs the same after-bounce ordering as every other branch above.
  // S7 slice I: turn 4's own reopened submenu (cursor persisted at 0, NO nav
  // needed) needs Onix's own post-turn-3 hp (88) instead once turn 3 has
  // ALSO resolved. S7 slice J: turn 5's own reopened submenu needs the SAME
  // 88 (Onix untouched by turn 4's own DOUBLE_TEAM) - no further anchor swap
  // needed; the completed-turn-3 receipt selects it directly.
  const idleWaitOverlayPlayerHp = genericTurn4Content?.field.player.hp.current
    ?? genericTurn3Content?.field.player.hp.current
    ?? genericTurn2Content?.field.player.hp.current
    ?? null;
  if (idleWaitOverlayPlayerHp !== null) {
    drawPlayerHealthboxHpOverlay(fb, idleWaitOverlayPlayerHp, menuIdleBounce(idleWaitBounceTick, idleWaitBounceIndexOffset).healthboxY2);
  }
}

export function drawLatestCompletedCommandWindow(
  fb: Uint8Array,
  t: number,
  sm: FightSubmenuState,
  latest: LatestCompletedCommandHandoff,
  opponentFaintPresentationOwner: OpponentFaintPresentationOwner | null,
  resolutionOwner: BattleSceneResolutionOwner | null,
  trainerPresentation?: FactoryTrainerPresentation,
): void {
  const content = latest.content;
  if (content === undefined) {
    throw new Error("latest completed command handoff has no semantic presentation content");
  }
  const retained = retainedFightCommandResolutionOwner(content);
  if (retained !== null) {
    if (resolutionOwner === null) {
      throw new Error("resolved turn-13 handoff has no retained action presentation owner");
    }
    const activeSegment = resolutionOwner.resolution.segments[
      resolutionOwner.resolution.segmentIndex
    ];
    const retainedSegment = retained.segments[0];
    if (retainedSegment !== undefined && activeSegment === retainedSegment) {
      drawTurn14FightSubmenuWindow(fb, t, sm, latest);
      return;
    }
    if (
      retainedSegment === undefined
      || !resolutionOwner.resolution.segments.includes(retainedSegment)
      || activeSegment === undefined
    ) {
      throw new Error("retained FLY command owner lost its charge/strike segment chain");
    }
    drawTurn15FightSubmenuWindow(fb, t, sm, resolutionOwner.resolution, latest);
    return;
  }

  const moves = content.upcoming?.moves;
  const opponentMove = moves?.find((move) => move.user === "opponent");
  const playerMove = moves?.find((move) => move.user === "player");
  if (opponentMove === undefined || playerMove === undefined) {
    throw new Error("latest completed command handoff has no complete semantic move stream");
  }
  if (opponentMove.move === "SAND_ATTACK" && playerMove.move === "DRAGON_BREATH") {
    drawTurn13FightSubmenuWindow(fb, t, sm, opponentFaintPresentationOwner, trainerPresentation, latest);
    return;
  }
  if (opponentMove.move === "AERIAL_ACE" && playerMove.move === "ROCK_SLIDE") {
    if (playerMove.miss !== undefined) {
      drawTurn12FightSubmenuWindow(fb, t, sm, latest);
    } else {
      drawTurn10FightSubmenuWindow(fb, t, sm, latest);
    }
    return;
  }
  if (opponentMove.move === "QUICK_ATTACK" && playerMove.move === "ROCK_SLIDE") {
    drawTurn9FightSubmenuWindow(fb, t, sm, latest);
    return;
  }
  if (opponentMove.move === "FEATHER_DANCE") {
    const statChange = opponentMove.statChange;
    if (playerMove.move === "BIND" && playerMove.miss !== undefined) {
      drawTurn8FightSubmenuWindow(fb, t, sm, latest);
      return;
    }
    if (playerMove.move === "ROCK_SLIDE" && statChange?.from === 6 && statChange.to === 4) {
      drawTurn6FightSubmenuWindow(fb, t, sm, latest);
      return;
    }
    if (playerMove.move === "ROCK_SLIDE" && statChange?.from === 4 && statChange.to === 2) {
      drawTurn7FightSubmenuWindow(fb, t, sm, latest);
      return;
    }
    if (playerMove.move === "ROCK_SLIDE" && statChange?.from === 0 && statChange.to === 0) {
      drawTurn11FightSubmenuWindow(fb, t, sm, latest);
      return;
    }
  }
  throw new Error("latest completed command handoff has unsupported semantic move content");
}

export function drawActionMenuIdleWindow(
  fb: Uint8Array,
  t: number,
  reopenedFromClose: boolean = false,
  turn5ReopenPressTick: number | undefined = undefined,
  turn1CommandOpenElapsed: number | null = null,
  latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null = null,
): void {
  const genericTurn2Content = turn2FightCommandPresentationFromLatest(
    latestCompletedCommandHandoff,
  );
  const genericTurn3Content = turn3FightCommandPresentationFromLatest(
    latestCompletedCommandHandoff,
  );
  const genericTurn4Content = turn4FightCommandPresentationFromLatest(
    latestCompletedCommandHandoff,
  );
  if (t <= MENU_IDLE_BLANK_END_TICK) {
    drawRect(fb, menuIdleBlank);
    return;
  }
  if (reopenedFromClose) {
    // ISSUES #25: this reopen's own DMA-wait hold is NOT a bounce-sprite
    // reset (see `FightSubmenuState.reopenedFromClose`'s own doc) - it keeps
    // showing whatever shift was already active right before this reopen's
    // own press (`FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT`, the same one the
    // resumed action menu was using), same "wait holds freeze the prior
    // shift, only the reveal steps to the next one" pattern the original
    // open/close events already established (see
    // `FIGHT_SUBMENU_REOPEN_BOUNCE_SHIFT`'s own doc).
    drawActionMenuIdleContentFromLatest(fb, t - FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT, latestCompletedCommandHandoff);
    // Slice 9: once turn 4's own source-owned reset has evicted turn 3's
    // shape from the shared slot (`genericTurn3Content === null`), the
    // internal fallback above can no longer reach Onix's own HP - draw it
    // explicitly from the completed-turn-4 receipt instead (same 88 turn 3
    // already established; `turn4SettledWindowActive`'s own eviction-class
    // doc in `drawFightSubmenuWindow`).
    const reopenOverlayPlayerHp = genericTurn4Content !== null
        && genericTurn3Content === null
        && genericTurn2Content === null
      ? genericTurn4Content.field.player.hp.current
      : null;
    if (reopenOverlayPlayerHp !== null) {
      drawPlayerHealthboxHpOverlay(
        fb,
        reopenOverlayPlayerHp,
        menuIdleBounce(t - FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT).healthboxY2,
      );
    }
    return;
  }
  // S7 slice F: turn 3's own reopen needs the same receipt-epoch remap
  // its later "revealed, idle" phase uses even
  // during this brief DMA-wait hold - pixel-confirmed via `turn3-menu.json`'s
  // own dense probe of ticks 3847/3848 (plain `t` mismatched there, the
  // remap doesn't).
  //
  // ISSUES #24 (docs/battle-menu-notes.md §8d): turn 2's own reopen needs
  // the SAME treatment, via the turn-2 submenu epoch mapping - the prior "oracle-
  // confirmed fine with plain `t`" claim here was a false negative, not a
  // different mechanism: turn 1's *very first* open is the one case where
  // plain `t` is correct (that epoch's bounce sprite really is anchored at
  // `MENU_IDLE_BLANK_END_TICK+1` with no prior reset), but turn 2's reopen
  // - like turn 3's - inherits a RESET bounce task (`EndBounceEffect`/
  // `DoBounceEffect` re-fire between turns, `rockSlideResettledBounceTick`'s
  // own doc), so it needs the resettled remap here too. The bug was
  // invisible until now because this 5-tick open-DMA-wait hold only ever
  // lands on the sine table's rare peak (`table[64]`, ISSUES #22/#19's own
  // "1-in-256" state) at RAM-confirmed tick 2901 specifically - every OTHER
  // tick in this hold happens to share the same state under both formulas
  // (verified against `turn2-endeavor-drain.json`/`turn2-dragonbreath.json`,
  // ticks 2902-2905 identical either way).
  // S7 slice I: turn 4's own reopen needs the same treatment one epoch
  // further (`turn4SubmenuBounceTickFromLatest`, reset at turn 3's own
  // ROCK_SLIDE redraw) - same "reopening FIGHT doesn't reset the bounce
  // task" rule.
  // S7 slice J: turn 5's own reopen is the same shape yet another epoch
  // further (`turn5SubmenuBounceTickFromLatest`, reset at turn 4's own
  // ROCK_SLIDE redraw).
  // PROGRESS #183/cleanup (docs/turn3-residual-probe-notes.md "The extremum
  // class, probed", tick 5927): hardware doesn't apply
  // turn5SubmenuBounceTickFromLatest's own -2-tick phase correction until
  // the tick AFTER the reopen press registers - `t === turn5ReopenPressTick`
  // is the press's own registering tick itself, so it alone still uses the
  // unshifted formula.
  const turn2Active = isLatestCompletedCommandLifecycleActive(
    latestCompletedCommandHandoff,
    turn1CommandOpenElapsed,
  );
  const turn3Active = isTurn2LatestCompletedCommandLifecycleActive(
    latestCompletedCommandHandoff,
    turn1CommandOpenElapsed,
  );
  const turn4Active = isTurn3LatestCompletedCommandLifecycleActive(
    latestCompletedCommandHandoff,
    turn1CommandOpenElapsed,
  );
  const turn5Active = isTurn4LatestCompletedCommandLifecycleActive(
    latestCompletedCommandHandoff,
    turn1CommandOpenElapsed,
  );
  // ISSUES #97-B (docs/bounce-peak-rounding-fix-spec.md §7): the reopen-press
  // special case covers the RAM-proven 3-tick freeze (turn5ReopenBounceTick),
  // composed with window A's own `+109` raw-sine-index constant (the true
  // offset - the original `+116` fit was itself off by one sDelta step, 7, a
  // post-increment RAM probe artifact, not a real hardware quirk) and the
  // `displayed(T)=RAM(T-1)` display basis (`t - 1` fed to the tick formula,
  // independent of menuIdleBounce's own orthogonal internal ramTick=t-1
  // shift) - strictly scoped to when a reopen-press tick is actually live
  // (`turn5ReopenPressTick !== undefined`); the untraced pre-press span
  // (~5920-5926) keeps the original unshifted, unoffset submenu formula.
  const bounceIndexOffset = turn5Active && turn5ReopenPressTick !== undefined ? 109 : 0;
  const bounceTick = turn5Active
    ? turn5ReopenPressTick !== undefined
      ? turn5ReopenBounceTick(t - 1, turn5ReopenPressTick, latestCompletedCommandHandoff)
      : turn5SubmenuBounceTickFromLatest(t, latestCompletedCommandHandoff)
    : turn4Active
      ? turn4SubmenuBounceTickFromLatest(t, latestCompletedCommandHandoff)
      : genericTurn2Content !== null && turn3Active
        ? fightCommandSubmenuBounceEpochTick(genericTurn2Content, t - TICK0)
        : turn2Active
          ? turn2SubmenuBounceTickFromPresentationEpochAge(
              currentEpochPresentationAgeFromLatest(
                latestCompletedCommandHandoff,
                t - TICK0,
              ),
            )
          : t;
  drawActionMenuIdleContentFromLatest(fb, bounceTick, latestCompletedCommandHandoff, undefined, bounceIndexOffset);
  // Slice 9: same eviction-class gap as the `reopenedFromClose` branch above
  // - once turn 4's own reset has evicted turn 3's shape, Onix's own HP
  // (still 88, per turn 3's own established anchor) must come from the
  // completed-turn-4 receipt instead.
  const overlayPlayerHp = genericTurn4Content !== null
      && genericTurn3Content === null
      && genericTurn2Content === null
    ? genericTurn4Content.field.player.hp.current
    : null;
  if (overlayPlayerHp !== null) {
    drawPlayerHealthboxHpOverlay(fb, overlayPlayerHp, menuIdleBounce(bounceTick, bounceIndexOffset).healthboxY2);
  }
}

export function drawActionMenuIdleContentFromLatest(
  fb: Uint8Array,
  bounceTick: number,
  latest: LatestCompletedCommandHandoff | null,
  playerHpOverride?: number,
  bounceIndexOffset: number = 0,
): void {
  drawMenuIdleBaseWithOpponentHpFromLatest(fb, latest);
  const resolvedPlayerHp = playerHpOverride
    ?? latest?.content?.field.player.hp.current
    ?? getAnchorPlayerAfterTurnHp();
  const { onixY2, healthboxY2 } = menuIdleBounce(bounceTick, bounceIndexOffset);
  drawTwoStateBounceRect(fb, menuIdleOnixBounce, onixY2);
  drawTwoStateBounceRect(fb, menuIdleHealthboxBounce, healthboxY2);
  // ISSUES #97 / docs/turn5-family-class3-diagnosis.md §10a+§19: the turn4
  // narrowing closes turn 5's own ENDEAVOR-hold gap (`drawTurn5EndeavorText`'s
  // no-squish fallback, `latest` = turn 4's completed receipt, matched
  // neither prior shape so the overlay never painted). Every other caller
  // either already satisfies the turn2/turn3 arms or already redraws this
  // same value manually right after this call (`drawActionMenuIdleWindow`'s
  // eviction-class overlay, `drawTurn{3,4}RockSlideTurnEndSettledMenu`) - the
  // turn4 arm is a no-op there, not a behavior change (per §19's audit).
  if (
    turn2FightCommandPresentationFromLatest(latest) !== null
    || turn3FightCommandPresentationFromLatest(latest) !== null
    || turn4FightCommandPresentationFromLatest(latest) !== null
  ) {
    drawPlayerHealthboxHpOverlay(fb, resolvedPlayerHp, healthboxY2);
  }
}

export function drawBattle2RockSlideTurn1Window(
  fb: Uint8Array,
  t: number,
  handoffTick: number,
  confirmTick: number,
  sm: FightSubmenuState,
): void {
  const textStart = confirmTick + FIGHT_CONFIRM_TEXT_DELAY + 3;
  if (t < textStart) {
    const frozen =
      t >= confirmTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY
        ? { onixY2: 0, healthboxY2: 0 }
        : undefined;
    drawBattle2ActionMenuWindow(
      fb,
      t,
      handoffTick,
      FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
      frozen,
    );
    drawFightSubmenuChromeFromLatest(
      fb,
      sm.displayCursor,
      sm.activeMonMoveset,
      null,
    );
    return;
  }

  drawBattle2RockSlideAttack(fb, t, handoffTick, confirmTick);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  const chars = Math.min(
    ROCK_SLIDE_LINE1.length + ROCK_SLIDE_LINE2.length,
    t - textStart + 1,
  );
  drawMessageTextLines(
    fb,
    ROCK_SLIDE_LINE1,
    ROCK_SLIDE_LINE2,
    chars,
  );
}

export function drawBattle2RockSlideAttack(
  fb: Uint8Array,
  t: number,
  handoffTick: number,
  confirmTick: number,
): void {
  const mechanismPress = battle2RockSlideMechanismPressTick(confirmTick);
  const shiftY = rockSlideBg3Y(t, mechanismPress);
  const bounce =
    t < confirmTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY
      ? menuIdleBounce(battle2Turn1BounceTick(t, handoffTick))
      : { onixY2: 0, healthboxY2: 0 };
  const kabutoDisplayHp = rockSlideOpponentHp(
    t,
    mechanismPress,
    battle2Turn1KabutoRockSlideHp().from,
    battle2Turn1KabutoRockSlideHp().to,
  );
  const kabutoContent = kabutoHealthboxContentForHp(kabutoDisplayHp, KABUTO_SENDOUT_BATTLER.name, KABUTO_SENDOUT_BATTLER.level, KABUTO_SENDOUT_BATTLER.maxHP, KABUTO_SENDOUT_BATTLER.gender);

  drawStaticBgShiftedY(fb, shiftY);
  if (!rockSlideMonBlinkInvisible(t, mechanismPress)) {
    drawSpriteSheet(
      fb,
      kabutoFrontSprite.tileset,
      kabutoFrontSprite.palette,
      KABUTO_CORNER.x,
      KABUTO_CORNER.y + rockSlideMonShakeY2(t, mechanismPress),
    );
  }
  drawSpriteSheet(
    fb,
    onixBackSprite.tileset,
    onixBackSprite.palette,
    ONIX_MATERIALIZE_CORNER.x,
    ONIX_MATERIALIZE_CORNER.y + bounce.onixY2,
  );
  drawSendOutHealthbox(fb, 0, kabutoContent);
  const healthboxY2 = rockSlideHealthboxWobbleY2(t, mechanismPress);
  if (healthboxY2 !== 0) {
    drawOpponentHealthboxWobble(fb, healthboxY2, kabutoContent);
  }
  drawComposedPlayerHealthbox(
    fb,
    onixPlayerHealthboxContent,
    0,
    bounce.healthboxY2,
  );
  for (const i of rockSlideDrawOrder(t, mechanismPress)) {
    const rock = rockSlideRockState(i, t, mechanismPress);
    if (!rock) continue;
    drawRockSprite(fb, rock.animNum, rock.centerX, rock.centerY);
  }
}

export function drawBattle2FightSubmenuWindow(
  fb: Uint8Array,
  t: number,
  handoffTick: number,
  sm: FightSubmenuState,
): void {
  if (sm.confirmElapsed !== null) {
    drawBattle2RockSlideTurn1Window(
      fb,
      t,
      handoffTick,
      TICK0 + sm.confirmElapsed,
      sm,
    );
    return;
  }

  const presentation = battle2CommandPresentationForRender(
    actionMenuAge(t, handoffTick),
    t - TICK0,
    sm,
  );
  const actionBounceShift =
    presentation.lifecycle.phase === "action-menu" && sm.closeElapsed !== null
      ? FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT
      : presentation.lifecycle.phase === "fight-opening" && sm.reopenedFromClose
        ? FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT
        : 0;
  const fightBounceShift = sm.reopenedFromClose
    ? FIGHT_SUBMENU_REOPEN_BOUNCE_SHIFT
    : FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;

  renderBattleCommandPresentation(fb, presentation, {
    drawActionMenu(framebuffer, view, revealed) {
      drawBattle2ActionMenuWindow(
        framebuffer,
        t,
        handoffTick,
        actionBounceShift,
        undefined,
        revealed,
        view.healthboxes,
        view.fieldArt,
      );
      if (revealed) drawBattleCommandActionChrome(framebuffer, view.actionMenu);
    },
    drawFightMenu(framebuffer, view) {
      drawBattle2ActionMenuWindow(
        framebuffer,
        t,
        handoffTick,
        fightBounceShift,
        undefined,
        true,
        view.healthboxes,
        view.fieldArt,
      );
      drawFightSubmenuChromeFromLiveState(
        framebuffer,
        view.fightMenu.displayCursor,
        view.fightMenu.moveset,
        view.fightMenu.moveSwitch,
      );
    },
    // The retired Battle 2 march never enters a rejection phase; this branch
    // stays a defensive draw of the settled menu.
    drawRejectionMessage(framebuffer, view) {
      drawBattle2ActionMenuWindow(
        framebuffer,
        t,
        handoffTick,
        fightBounceShift,
        undefined,
        true,
        view.healthboxes,
        view.fieldArt,
      );
    },
  });
}

export function drawMenuHealthboxPlayerWobble(fb: Uint8Array, dy: number): void {
  const { x, y, width, height, pixels } = menuHealthboxPlayer;
  const mask = getMenuHealthboxPlayerContentMask();
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      if (!mask[py * width + px]) continue;
      const bg = healthboxBackgroundColorAt(x + px, y + py);
      if (bg) setPixel(fb, x + px, y + py, bg);
    }
  }
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      if (!mask[py * width + px]) continue;
      const i = (py * width + px) * 3;
      setPixel(fb, x + px, y + dy + py, { r: pixels[i]!, g: pixels[i + 1]!, b: pixels[i + 2]! });
    }
  }
}

export function drawMenuHealthboxPlayer(fb: Uint8Array, dx: number, dy: number = 0): void {
  const { x, y, width, height, pixels } = menuHealthboxPlayer;
  const mask = getMenuHealthboxPlayerContentMask();
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      if (!mask[py * width + px]) continue;
      const i = (py * width + px) * 3;
      setPixel(fb, x + dx + px, y + dy + py, { r: pixels[i]!, g: pixels[i + 1]!, b: pixels[i + 2]! });
    }
  }
}

export function drawPlayerHealthboxHpOverlay(fb: Uint8Array, hp: number, yOffset = 0): void {
  if (hp === getAnchorPlayerBattler().hp) return;
  const { width, height, pixels } = playerHealthboxHpOverlayForHp(hp);
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const color = pixels[py * width + px];
      if (!color) continue;
      setPixel(fb, menuHealthboxPlayer.x + px, menuHealthboxPlayer.y + py + yOffset, color);
    }
  }
}

// --- slice 4 batch: verbatim move ---

export function turn15KickoffBounceTick(t: number, pressTick: number): number {
  if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) return t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT + TURN14_MENU_REDRAW_RESET_SHIFT;
  return TURN5_SITRUS_MENU_REDRAW_TICK;
}

export function turn14BareSceneStartTick(pressTick: number): number {
  return pressTick + TURN14_BARE_SCENE_DELAY;
}

export function drawTurnEndSettledMenu(fb: Uint8Array, t: number, pressTick: number): void {
  drawActionMenuIdleContentFromLatest(fb, rockSlideResettledBounceTick(t, pressTick, TURN1_CHOOSE_ACTION_RESET_AFTER_CONFIRM), null);
  const opponentHp = rockSlideOpponentHp(t, pressTick, getAnchorOpponentBattler().hp, getAnchorOpponentAfterTurnHp(), TURN1_OFF_ROCKSLIDE_HP_DRAIN_START_DELAY);
  drawSendOutHealthbox(fb, 0, opponentHealthboxContentForHp(opponentHp));
}

export function drawTurn5RockSlideWindow(
  fb: Uint8Array,
  t: number,
  latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null,
  trainerPresentation?: FactoryTrainerPresentation,
  turn5FaintDismissElapsed: number | null = null,
): void {
  const pressTick = TURN5_ROCKSLIDE_PRESS_TICK;
  // ISSUES #97-B (docs/bounce-peak-rounding-fix-spec.md §7): +60 on the
  // shared raw sine index (the true offset - the original `+67` fit was off
  // by one sDelta step, 7) - RAM-proven across 47 consecutive ticks
  // (7300-7346), the ONLY call site this correction targets.
  drawTurn6FieldBase(fb, t, latestCompletedCommandHandoff, undefined, turn5OffSitrusOnixHp(t), undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 60, true, true);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  const faintedStart = turn5FaintedTextStartTick(pressTick);
  // ISSUES #97 (docs/turn5-resolve-ab-pools-diagnosis.md §19.3): this
  // dispatch gate shares the same 1-render-tick lag as the fainted-text
  // reveal below - a fresh oracle screenshot at `faintedStart` itself
  // (6378) still shows the prior "ONIX used ROCK SLIDE!" text in full, not
  // a blank/fainted frame; the switch only happens on the following tick.
  // Scoped `t - 1` here, same shape as the reveal fix below.
  if (t - 1 < faintedStart) {
    drawMessageTextLines(fb, turn1RockslideAttackLines()[0], turn1RockslideAttackLines()[1], rockSlideTextVisibleChars(t - 1, pressTick, TURN5_OFF_ROCKSLIDE_TEXT_DELAY));
    return;
  }
  if (t < TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK) {
    if (t >= SWITCHIN_SENTOUT_TEXT_START_TICK) {
      drawMessageTextLines(
        fb,
        switchinSentOutLine1(trainerPresentation),
        switchinSentoutLine2(),
        switchinSentOutTextVisibleChars(t, trainerPresentation),
      );
      return;
    }
    // ISSUES #97 (docs/turn5-resolve-ab-pools-diagnosis.md §19.3): dense
    // oracle pixel sweep (6373-6399, per-tick visible-char-count solve on
    // both text lines) found this draw's own glyph reveal runs 1 render
    // tick ahead of real hardware - `t - 1` is the same display-basis
    // correction already used elsewhere in this file (e.g.
    // `drawTurn6FightSubmenuWindow`'s own `turn6ReopenBounceTick(t - 1, ...)`
    // above), scoped to this single call site (turn5FaintedTextVisibleChars's
    // own RAM-confirmed `turn5FaintedTextStartTick` anchor is untouched).
    drawMessageTextLines(fb, turn5FaintedLines()[0], turn5FaintedLines()[1], turn5FaintedTextVisibleChars(t - 1, pressTick));
    const cursorStart = pressTick + turn5FaintedCursorStartDelay();
    // docs/turn5-resolve-ab-pools-diagnosis.md §20.2 (ISSUES #97): this
    // gate's own first-appearance check was missing the same `t - 1`
    // display-basis correction the phase computation right below it
    // already uses (turn5FaintDismissCursorTick's own naturalTick = t - 1)
    // - real hardware's first cursor blit isn't visible until render tick
    // cursorStart + 1, RAM-confirmed (state=2 at RAM 6397, first arrow
    // blit RAM 6398 -> visible render 6399).
    if (t - 1 >= cursorStart) {
      // §11.1: the real cursor accepts a per-session A edge then freezes
      // (turn5FaintedCursorYOffset's fixed-table formula is retired here but
      // left defined, see its own doc comment).
      const dismissTick = turn5FaintDismissElapsed === null ? null : TICK0 + turn5FaintDismissElapsed;
      drawCursor(fb, cursorState(turn5FaintDismissCursorTick(t, dismissTick), cursorStart).yOffset, turn5FaintedCursorX());
    }
    return;
  }
  // S7 slice M-5: the Sitrus heal message, then a blank hold, then the
  // settled interactive turn-6 menu chrome - see the three constants' own
  // docs (`TURN5_SITRUS_HEAL_TEXT_START_TICK`/`_TEXT_CLEAR_TICK`/`_MENU_
  // REDRAW_TICK`) for the pixel evidence pinning each boundary.
  if (t < TURN5_OFF_SITRUS_TEXT_CLEAR_TICK) {
    drawMessageTextLines(fb, turn5SitrusHealLine1(), turn5SitrusHealLine2(), turn5SitrusOffHealTextVisibleChars(t));
    return;
  }
  if (t < TURN5_OFF_SITRUS_MENU_REDRAW_TICK) return;
  drawTurn5SitrusSettledMenuChrome(fb);
}

export function drawTurn6FieldBase(fb: Uint8Array, t: number, bounceTickOrLatest: number | LatestCompletedCommandHandoff | null = t, beforeMonSprite?: () => void, onixHp: number = turn5SitrusOnixHp(t), onixX2: number = 0, onixInvisible: boolean = false, healthboxY2Override?: number, onixY2Extra: number = 0, darken: boolean = false, pidgeottoX2: number = 0, pidgeottoSink: { keptRows: number; y2: number } | null = null, pidgeottoHealthboxVisible: boolean = true, bounceIndexOffset: number = 0, suppressSitrusRotate: boolean = false, suppressSitrusStars: boolean = false): void {
  // ISSUES #97-B rung 2 (docs/turn5-bounce-recalibration-probe.md §7a): the
  // non-number branch is reached ONLY by drawTurn5RockSlideWindow's own call
  // (the `latestCompletedCommandHandoff` object/null form) - every numeric
  // caller is unaffected. `t - 1` is the display-basis correction: the
  // oracle's displayed frame T shows the model's RAM state as of T-1
  // (RAM-confirmed with zero exceptions, §7a), on top of `menuIdleBounce`'s
  // own orthogonal internal `ramTick = t - 1` age-relative shift.
  const bounceTick = typeof bounceTickOrLatest === "number" ? bounceTickOrLatest : t - 1;
  const latestCompletedCommandHandoff = typeof bounceTickOrLatest === "number"
    ? null
    : bounceTickOrLatest;
  drawTurn5RockSlideAttack(fb, t, bounceTick, beforeMonSprite, onixX2, onixInvisible, onixY2Extra, darken, undefined, 0, latestCompletedCommandHandoff, bounceIndexOffset, suppressSitrusRotate, suppressSitrusStars);
  drawTurn5IconBar(fb, t);
  drawTurn5SwitchinSprite(fb, t, pidgeottoX2, pidgeottoSink);
  // S7 slice M (docs/faint-switch-notes.md §8e/§11): Pidgeotto's own
  // healthbox slide-in, anchored at TURN5_PIDGEOTTO_SETTLE_TICK - a no-op
  // (null) before the mon's own materialize settles.
  const pidgeottoHealthboxDx = turn5PidgeottoHealthboxSlideDx(t);
  if (pidgeottoHealthboxVisible && pidgeottoHealthboxDx !== null) drawSendOutHealthbox(fb, pidgeottoHealthboxDx, getPidgeottoHealthboxContent());
  // S7 slice M-5: past the settled menu's own redraw tick, both the on-field
  // Onix sprite (region A) and its healthbox (region B, box+overlay as one
  // unit) pick up the resettled `menuIdleBounce` cycle - see
  // `turn5SitrusResettledBounceTick`'s own doc. 0 before that tick. S7 slice
  // N: `bounceTick` (default live `t`, every pre-existing caller unaffected)
  // lets turn 6's own post-confirm hold pass a FROZEN tick instead (`DoBounce
  // Effect` stops being polled the instant the A-press hands off - the same
  // freeze rule `turnKickoffBounceTick` et al. already establish for turns
  // 1-5's own confirm-wait window).
  const bounce = menuIdleBounce(turn5SitrusResettledBounceTick(bounceTick), bounceIndexOffset);
  const healthboxY2 = healthboxY2Override ?? bounce.healthboxY2;
  drawMenuHealthboxPlayer(fb, 0, healthboxY2);
  drawPlayerHealthboxHpOverlay(fb, onixHp, healthboxY2);
}

export function turn13FaintedTextVisibleChars(t: number, pressTick: number): number {
  const start = turn13FaintedTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(turn13DragonbreathFaintTextTotal(), t - start + 1);
}

export function drawTurn9TurnEndSettledMenu(fb: Uint8Array, t: number, bounceRawTick: number = t): void {
  const bounceTick = turn9ResettledBounceTick(bounceRawTick, TURN9_QUICKATTACK_PRESS_TICK);
  const bounce = menuIdleBounce(bounceTick);
  drawStaticBgShiftedY(fb, 0, 0);
  drawTurn5IconBar(fb, t);
  drawTurn5SwitchinSprite(fb, t);
  drawSendOutHealthbox(fb, 0, pidgeottoHealthboxContentForHp(TURN9_PIDGEOTTO_AFTER_ROCKSLIDE_HP));
  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y + bounce.onixY2);
  drawMenuHealthboxPlayer(fb, 0, bounce.healthboxY2);
  drawPlayerHealthboxHpOverlay(fb, TURN9_ONIX_AFTER_QUICKATTACK_HP, bounce.healthboxY2);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
}

export function drawTurn9FightSubmenuWindow(
  fb: Uint8Array,
  t: number,
  sm: FightSubmenuState,
  latest: LatestCompletedCommandHandoff | null = null,
): void {
  if (sm.openElapsed === null) {
    drawTurn8TurnEndSettledMenu(fb, t, TURN8_BIND_PRESS_TICK);
    return;
  }
  const revealTick = TICK0 + sm.openElapsed + FIGHT_SUBMENU_OPEN_DELAY;
  if (t < revealTick) {
    const rawBounceTick = t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
    const bounceTick = turn9FightSubmenuBrowseBounceTick(t, rawBounceTick);
    drawTurn8TurnEndSettledMenu(fb, t, TURN8_BIND_PRESS_TICK, bounceTick, TURN9_FIGHT_SUBMENU_BOUNCE_INDEX_OFFSET);
    return;
  }
  if (sm.confirmElapsed !== null) {
    const pressTick = TICK0 + sm.confirmElapsed;
    // Past turn 9's own real turn-end redraw (`TURN9_MENU_REDRAW_DELAY` past
    // `pressTick`), the real oracle shows the resettled action menu - a pure
    // `t`-based redraw check exactly like `drawTurn7RockSlideWindow`/
    // `drawTurn8BindWindow`'s own `redrawTick` branches. Everything from
    // QUICK_ATTACK's own kickoff text through ROCK_SLIDE's own settled hold
    // (rungs c3/c4/d) is modeled by `drawTurn9QuickAttackWindow` below.
    if (t >= pressTick + TURN9_MENU_REDRAW_DELAY) {
      drawTurn9TurnEndSettledMenu(fb, t);
      return;
    }
    const textStart = turn9QuickAttackTextStartTick(pressTick);
    if (t >= textStart) {
      drawTurn9QuickAttackWindow(fb, t, pressTick);
      return;
    }
  }
  const rawBounceTick = sm.confirmElapsed !== null ? turn9KickoffBounceTick(t, TICK0 + sm.confirmElapsed) : t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  if (turn9FightSubmenuLiveBounceRegime(t, sm)) {
    const bounceTick = turn9FightSubmenuBrowseBounceTick(t, rawBounceTick);
    drawTurn9FieldBase(fb, t, bounceTick, undefined, undefined, undefined, undefined, undefined, TURN9_FIGHT_SUBMENU_BOUNCE_INDEX_OFFSET);
  } else {
    drawTurn9FieldBase(fb, t, rawBounceTick);
  }
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
  drawFightSubmenuChromeFromLatest(fb, sm.displayCursor, sm.activeMonMoveset, latest);
}

export function drawTurn9RockSlideWindow(fb: Uint8Array, t: number): void {
  const pressTick = TURN9_ROCKSLIDE_PRESS_TICK;
  drawTurn9RockSlideAttack(fb, t);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  if (t >= pressTick + TURN9_ROCKSLIDE_TEXT_CLEAR_DELAY) return;
  const superEffectiveStart = turn9SuperEffectiveTextStartTick(pressTick);
  if (t >= superEffectiveStart) {
    drawMessageTextLines(fb, TURN6_SUPER_EFFECTIVE_LINE, "", turn9SuperEffectiveTextVisibleChars(t, pressTick));
  } else {
    drawMessageTextLines(fb, ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2, rockSlideTextVisibleChars(t, pressTick));
  }
}

export function drawTurn9RockSlideAttack(fb: Uint8Array, t: number): void {
  const pressTick = TURN9_ROCKSLIDE_PRESS_TICK;
  drawStaticBgShiftedY(fb, 0, turn5BgFadeY(t));
  drawTurn5IconBar(fb, t);
  if (!rockSlideMonBlinkInvisible(t, pressTick, TURN9_ROCKSLIDE_ANIMATION_PROFILE)) {
    drawSpriteSheet(fb, pidgeottoFrontSprite.tileset, pidgeottoFrontSprite.palette, PIDGEOTTO_CORNER.x, PIDGEOTTO_CORNER.y);
  }
  // Onix's own DoBounceEffect stopped being polled at turn 9's real A-press
  // (`turn9KickoffBounceTick`'s own frozen anchor) and never resets mid-turn
  // - the SAME frozen tick QUICK_ATTACK's own window already uses, converted
  // regime-4 -> regime-1 the same way `drawTurn7RockSlideAttack` converts
  // regime-2 (`TURN7_REGIME2_TO_REGIME1_SHIFT`'s own precedent).
  const frozenBounceTick = turn9KickoffBounceTick(t, TURN9_QUICKATTACK_PRESS_TICK);
  const bounce = menuIdleBounce(turn5SitrusResettledBounceTick(frozenBounceTick + TURN9_REGIME4_TO_REGIME1_SHIFT));
  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y + bounce.onixY2);
  const healthboxY2 = rockSlideHealthboxWobbleY2(t, pressTick, TURN9_ROCKSLIDE_ANIMATION_PROFILE);
  const opponentHp = rockSlideOpponentHp(t, pressTick, turn7PidgeottoAfterRockslideHp(), TURN9_PIDGEOTTO_AFTER_ROCKSLIDE_HP, TURN9_ROCKSLIDE_HP_DRAIN_START_DELAY);
  const opponentContent = pidgeottoHealthboxContentForHp(opponentHp);
  drawSendOutHealthbox(fb, 0, opponentContent);
  if (healthboxY2 !== 0) drawOpponentHealthboxWobble(fb, healthboxY2, opponentContent);
  drawMenuHealthboxPlayer(fb, 0, 0);
  drawPlayerHealthboxHpOverlay(fb, TURN9_ONIX_AFTER_QUICKATTACK_HP, 0);
}

export function drawTurn9QuickAttackWindow(fb: Uint8Array, t: number, pressTick: number): void {
  if (t >= rockSlideTextStartTick(TURN9_ROCKSLIDE_PRESS_TICK)) {
    drawTurn9RockSlideWindow(fb, t);
    return;
  }
  const bounceTick = turn9KickoffBounceTick(t, pressTick);
  const onixInvisible = turn9Ep2OnixInvisible(t, pressTick);
  const healthboxY2 = turn9Ep2HealthboxWobbleY2(t, pressTick);
  // `TURN9_QUICKATTACK_HP.from` (31) is Onix's own HP entering turn 9, unchanged
  // since turn 5's own Sitrus heal - `turn5SitrusOnixHp`'s own settled endpoint.
  const onixHp = turn9Hp(t, pressTick, TURN9_QUICKATTACK_HP.from, TURN9_ONIX_AFTER_QUICKATTACK_HP);
  drawTurn9FieldBase(fb, t, bounceTick, undefined, onixHp, 0, onixInvisible, healthboxY2);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  const notVeryEffectiveStart = turn9NotVeryEffectiveTextStartTick(pressTick);
  if (t >= notVeryEffectiveStart) {
    drawMessageTextLines(fb, TURN9_NOTVERYEFFECTIVE_LINE, "", turn9NotVeryEffectiveTextVisibleChars(t, pressTick));
  } else {
    drawMessageTextLines(fb, TURN9_QUICKATTACK_LINE1, TURN9_QUICKATTACK_LINE2, turn9QuickAttackTextVisibleChars(t, pressTick));
  }
}

export function drawTurn9FieldBase(fb: Uint8Array, t: number, bounceTick: number = t, beforeMonSprite?: () => void, onixHp: number = turn5SitrusOnixHp(t), onixX2: number = 0, onixInvisible: boolean = false, healthboxY2Override?: number, bounceIndexOffset: number = 0): void {
  drawTurn6FieldBase(fb, t, bounceTick + TURN9_REGIME4_TO_REGIME1_SHIFT, beforeMonSprite, onixHp, onixX2, onixInvisible, healthboxY2Override, undefined, undefined, undefined, undefined, undefined, bounceIndexOffset);
  drawSendOutHealthbox(fb, 0, pidgeottoHealthboxContentForHp(turn7PidgeottoAfterRockslideHp()));
}

export function drawTurn8TurnEndSettledMenu(fb: Uint8Array, t: number, pressTick: number, bounceRawTick: number = t, bounceIndexOffset: number = 0): void {
  const bounceTick = turn8ResettledBounceTick(bounceRawTick, pressTick);
  const bounce = menuIdleBounce(bounceTick, bounceIndexOffset);
  drawStaticBgShiftedY(fb, 0, 0);
  drawTurn5IconBar(fb, t);
  drawTurn5SwitchinSprite(fb, t);
  drawSendOutHealthbox(fb, 0, pidgeottoHealthboxContentForHp(turn7PidgeottoAfterRockslideHp()));
  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y + bounce.onixY2);
  drawMenuHealthboxPlayer(fb, 0, bounce.healthboxY2);
  drawPlayerHealthboxHpOverlay(fb, turn5SitrusOnixHp(t), bounce.healthboxY2);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
}

export function drawTurn8BindWindow(fb: Uint8Array, t: number, pressTick: number): void {
  const redrawTick = pressTick + TURN8_MENU_REDRAW_DELAY;
  if (t >= redrawTick) {
    // ISSUES #39 rank-5 slice 1 (docs/idle-bounce-phase-attribution.md's own
    // diagnosis, RAM-probed this session: tools/probe/dump-turn9-idle-bounce-off.py
    // against `turn9-quickattack-off.json`): the assigned residual window's
    // own first 9 ticks (10818-10826) are STILL rendered through turn 8's own
    // settled-menu redraw (this trace's own turn-9 `FightSubmenuState.openElapsed`
    // doesn't register until tick 10827 - `drawTurn9FightSubmenuWindow`'s own
    // window only starts there) - shares the real oscillator with the two
    // branches that pick up afterward, needing its own flat, independently
    // RAM-fit offset (`turn8ResettledBounceTick`'s own `bounceRawTick=t`
    // default is a different closed form than theirs). Zero exceptions
    // across 9 probed Y2 ticks.
    const bounceIndexOffset = t >= 10818 && t <= 10826 ? 191 : 0;
    drawTurn8TurnEndSettledMenu(fb, t, pressTick, t, bounceIndexOffset);
    return;
  }
  const frozenRegime3Tick = TURN7_ROCKSLIDE_PRESS_TICK + TURN7_ROCKSLIDE_MENU_REDRAW_DELAY;
  drawTurn8FieldBase(fb, t, frozenRegime3Tick);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  const textClearTick = pressTick + TURN8_TEXT_CLEAR_DELAY;
  if (t < textClearTick) {
    const missStart = turn8MissTextStartTick(pressTick);
    if (t >= missStart) {
      drawMessageTextLines(fb, turn8MissLines()[0], turn8MissLines()[1], turn8MissTextVisibleChars(t, pressTick));
    } else {
      drawMessageTextLines(fb, turn8BindLines()[0], turn8BindLines()[1], turn8BindTextVisibleChars(t, pressTick));
    }
  }
}

export function drawTurn8FightSubmenuWindow(
  fb: Uint8Array,
  t: number,
  sm: FightSubmenuState,
  latest: LatestCompletedCommandHandoff | null = null,
): void {
  // Same "NOT the plain idle window, the already-redrawn turn's own
  // resettled-menu function" rule `drawTurn7FightSubmenuWindow` established -
  // turn 8's own idle/browsing window comes after turn 7's own ROCK_SLIDE
  // already reset the bounce cycle at its own redraw (9144); Pidgeotto's HP
  // (82) hasn't changed since, so `drawTurn7RockSlideTurnEndSettledMenu` is
  // still the correct, already-proven regime to reuse verbatim.
  if (sm.openElapsed === null) {
    drawTurn7RockSlideTurnEndSettledMenu(fb, t);
    return;
  }
  const revealTick = TICK0 + sm.openElapsed + FIGHT_SUBMENU_OPEN_DELAY;
  if (t < revealTick) {
    drawTurn7RockSlideTurnEndSettledMenu(fb, t, t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT);
    return;
  }
  if (sm.confirmElapsed !== null) {
    const pressTick = TICK0 + sm.confirmElapsed;
    const textStart = turn6FeatherDanceTextStartTick(pressTick);
    if (t >= textStart) {
      drawTurn8FeatherDanceKickoffText(fb, t, pressTick);
      return;
    }
  }
  const bounceTick = sm.confirmElapsed !== null ? turn8KickoffBounceTick(t, TICK0 + sm.confirmElapsed) : t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  drawTurn8FieldBase(fb, t, bounceTick);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
  drawFightSubmenuChromeFromLatest(fb, sm.displayCursor, sm.activeMonMoveset, latest);
}

export function drawTurn8FieldBase(fb: Uint8Array, t: number, bounceTick: number = t, beforeMonSprite?: () => void): void {
  drawTurn6FieldBase(fb, t, bounceTick + TURN8_REGIME3_TO_REGIME1_SHIFT, beforeMonSprite);
  drawSendOutHealthbox(fb, 0, pidgeottoHealthboxContentForHp(turn7PidgeottoAfterRockslideHp()));
}

export function drawTurn7RockSlideWindow(fb: Uint8Array, t: number): void {
  const pressTick = TURN7_ROCKSLIDE_PRESS_TICK;
  const redrawTick = pressTick + TURN7_ROCKSLIDE_MENU_REDRAW_DELAY;
  if (t >= redrawTick) {
    drawTurn7RockSlideTurnEndSettledMenu(fb, t);
    return;
  }
  const textClearTick = pressTick + TURN7_ROCKSLIDE_TEXT_CLEAR_DELAY;
  drawTurn7RockSlideAttack(fb, t, TURN6_ROCKSLIDE_PRESS_TICK + TURN6_ROCKSLIDE_MENU_REDRAW_DELAY);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  if (t < textClearTick) {
    const superEffectiveStart = turn7SuperEffectiveTextStartTick(pressTick);
    if (t >= superEffectiveStart) {
      drawMessageTextLines(fb, TURN6_SUPER_EFFECTIVE_LINE, "", turn7SuperEffectiveTextVisibleChars(t, pressTick));
    } else {
      drawMessageTextLines(fb, turn7RockslideAttackLines()[0], turn7RockslideAttackLines()[1], rockSlideTextVisibleChars(t, pressTick));
    }
  }
}

export function drawTurn7RockSlideTurnEndSettledMenu(fb: Uint8Array, t: number, bounceRawTick: number = t): void {
  const bounceTick = turn7RockSlideResettledBounceTick(bounceRawTick, TURN7_ROCKSLIDE_PRESS_TICK);
  const bounce = menuIdleBounce(bounceTick);
  drawStaticBgShiftedY(fb, 0, 0);
  drawTurn5IconBar(fb, t);
  drawTurn5SwitchinSprite(fb, t);
  drawSendOutHealthbox(fb, 0, pidgeottoHealthboxContentForHp(turn7PidgeottoAfterRockslideHp()));
  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y + bounce.onixY2);
  drawMenuHealthboxPlayer(fb, 0, bounce.healthboxY2);
  drawPlayerHealthboxHpOverlay(fb, turn5SitrusOnixHp(t), bounce.healthboxY2);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
}

export function drawTurn7RockSlideAttack(fb: Uint8Array, t: number, bounceTick: number): void {
  const pressTick = TURN7_ROCKSLIDE_PRESS_TICK;
  const shiftY = rockSlideBg3Y(t, pressTick);
  drawStaticBgShiftedY(fb, shiftY, turn5BgFadeY(t));
  drawTurn5IconBar(fb, t);
  if (!rockSlideMonBlinkInvisible(t, pressTick)) {
    drawSpriteSheet(fb, pidgeottoFrontSprite.tileset, pidgeottoFrontSprite.palette, PIDGEOTTO_CORNER.x, PIDGEOTTO_CORNER.y + rockSlideMonShakeY2(t, pressTick));
  }
  const bounce = menuIdleBounce(turn5SitrusResettledBounceTick(bounceTick + TURN7_REGIME2_TO_REGIME1_SHIFT));
  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y + bounce.onixY2);
  const healthboxY2 = rockSlideHealthboxWobbleY2(t, pressTick);
  const opponentHp = rockSlideOpponentHp(t, pressTick, turn6PidgeottoAfterRockslideHp(), turn7PidgeottoAfterRockslideHp());
  const opponentContent = pidgeottoHealthboxContentForHp(opponentHp);
  drawSendOutHealthbox(fb, 0, opponentContent);
  if (healthboxY2 !== 0) drawOpponentHealthboxWobble(fb, healthboxY2, opponentContent);
  for (const i of rockSlideDrawOrder(t, pressTick)) {
    const rock = rockSlideRockState(i, t, pressTick);
    if (!rock) continue;
    drawRockSprite(fb, rock.animNum, rock.centerX, rock.centerY);
  }
  drawMenuHealthboxPlayer(fb, 0, bounce.healthboxY2);
  drawPlayerHealthboxHpOverlay(fb, turn5SitrusOnixHp(t), bounce.healthboxY2);
}

export function drawTurn7FightSubmenuWindow(
  fb: Uint8Array,
  t: number,
  sm: FightSubmenuState,
  latest: LatestCompletedCommandHandoff | null = null,
): void {
  // NOT `drawTurn6ActionMenuIdleWindow` - unlike turn 6's own pre-any-
  // ROCK_SLIDE idle window (regime 1, `turn5SitrusResettledBounceTick`'s
  // live-t cycle, correct only while Pidgeotto is still at full HP), turn
  // 7's idle window comes AFTER turn 6's own ROCK_SLIDE has already reset
  // the bounce cycle fresh at its own redraw (8122) and dropped Pidgeotto
  // to 113 HP - `drawTurn6RockSlideTurnEndSettledMenu` is that exact
  // already-proven regime (reused verbatim, not re-derived), oracle-caught
  // this session (a 6.93% diff at frame 8347 otherwise - wrong bounce phase
  // AND a stale full-HP Pidgeotto healthbox).
  if (sm.openElapsed === null) {
    drawTurn6RockSlideTurnEndSettledMenu(fb, t);
    return;
  }
  const revealTick = TICK0 + sm.openElapsed + FIGHT_SUBMENU_OPEN_DELAY;
  if (t < revealTick) {
    drawTurn6RockSlideTurnEndSettledMenu(fb, t);
    return;
  }
  if (sm.confirmElapsed !== null) {
    const pressTick = TICK0 + sm.confirmElapsed;
    const textStart = turn6FeatherDanceTextStartTick(pressTick);
    if (t >= textStart) {
      drawTurn7FeatherDanceKickoffText(fb, t, pressTick);
      return;
    }
  }
  const bounceTick = sm.confirmElapsed !== null ? turn7KickoffBounceTick(t, TICK0 + sm.confirmElapsed) : t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  drawTurn7FieldBase(fb, t, bounceTick);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
  drawFightSubmenuChromeFromLatest(fb, sm.displayCursor, sm.activeMonMoveset, latest);
}

export function drawTurn7FieldBase(fb: Uint8Array, t: number, bounceTick: number = t, beforeMonSprite?: () => void): void {
  drawTurn6FieldBase(fb, t, bounceTick + TURN7_REGIME2_TO_REGIME1_SHIFT, beforeMonSprite);
  drawSendOutHealthbox(fb, 0, pidgeottoHealthboxContentForHp(turn6PidgeottoAfterRockslideHp()));
}

export function drawTurn6FightSubmenuWindow(
  fb: Uint8Array,
  t: number,
  sm: FightSubmenuState,
  latest: LatestCompletedCommandHandoff | null = null,
): void {
  if (sm.openElapsed === null) {
    drawTurn6ActionMenuIdleWindow(fb, t);
    return;
  }
  const revealTick = TICK0 + sm.openElapsed + FIGHT_SUBMENU_OPEN_DELAY;
  if (t < revealTick) {
    // ISSUES #97-B (docs/bounce-peak-rounding-fix-spec.md §7): this DMA-wait
    // branch shares window B's own `+60` raw-sine-index anchor (the true
    // offset - the original `+67` fit was off by one sDelta step, 7) and
    // display-basis correction (`t - 1`) with drawTurn5RockSlideWindow's call
    // above - strictly local to this branch (`t < revealTick`, i.e.
    // `turn6ReopenPressTick` through `turn6ReopenPressTick + 4`); the
    // post-reveal span below now carries the SAME anchor+basis too (ISSUES
    // #97, docs/turn5-bounce-recalibration-probe.md §10b/§10e), except for
    // `turn6KickoffBounceTick`'s own frozen regime, which stays untouched.
    drawTurn6ActionMenuIdleWindow(fb, t, turn6ReopenBounceTick(t - 1, TICK0 + sm.openElapsed), 60);
    return;
  }
  if (sm.confirmElapsed !== null) {
    const pressTick = TICK0 + sm.confirmElapsed;
    const textStart = turn6FeatherDanceTextStartTick(pressTick);
    if (t >= textStart) {
      drawTurn6FeatherDanceKickoffText(fb, t, pressTick);
      return;
    }
  }
  // ISSUES #97 (docs/turn5-bounce-recalibration-probe.md §10b/§10e,
  // docs/turn6-reopen-endstate-spec.md's dated addendum - a supervisor
  // overturn of that spec's own §2/§3 rejection): this branch shares the
  // SAME `+60` raw-sine-index anchor + `t - 1` display basis as the
  // DMA-wait branch above, for BOTH the idle-else regime
  // (`sm.confirmElapsed === null`) and `turn6KickoffBounceTick`'s own raw
  // (not-yet-frozen) regime - real hardware's driver is still live and on
  // the SAME cycle in both. The frozen regime (`t >=
  // pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`) is intentionally
  // UNTOUCHED: its RAM driver is already torn down by then (no dynamic
  // ground truth to calibrate against), and its existing frozen anchor
  // already matches every captured tick as-is.
  let bounceTick: number;
  let bounceIndexOffset = 0;
  if (sm.confirmElapsed !== null) {
    const pressTick = TICK0 + sm.confirmElapsed;
    if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) {
      bounceTick = turn6KickoffBounceTick(t - 1, pressTick);
      bounceIndexOffset = 60;
    } else {
      bounceTick = turn6KickoffBounceTick(t, pressTick);
    }
  } else {
    bounceTick = t - 1 - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
    bounceIndexOffset = 60;
  }
  drawTurn6FieldBase(fb, t, bounceTick, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, bounceIndexOffset);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  // `fightSubmenuWindow`'s own box (231px) is narrower than the screen - the
  // remaining x=232-239 strip is the outer window frame's own right-edge
  // decoration, unaffected by open/closed state (the same reason turns 1-5's
  // code gets away with reusing `menuIdleBase` unconditionally under
  // `drawFightSubmenuChromeFromLatest`: that static harvest's own border pixels are
  // valid for BOTH states). `drawTileBg` alone doesn't fill it (proven only
  // by `drawTurn5SitrusSettledMenuChrome`'s own unconditional overwrite in
  // the idle path) - draw the same chrome crop first so the submenu box then
  // opaquely overwrites just its own interior on top.
  drawTurn5SitrusSettledMenuChrome(fb);
  drawFightSubmenuChromeFromLatest(fb, sm.displayCursor, sm.activeMonMoveset, latest);
}

export function drawTurn6RockSlideWindow(fb: Uint8Array, t: number, realPressTick: number): void {
  const pressTick = TURN6_ROCKSLIDE_PRESS_TICK;
  const redrawTick = pressTick + TURN6_ROCKSLIDE_MENU_REDRAW_DELAY;
  if (t >= redrawTick) {
    drawTurn6RockSlideTurnEndSettledMenu(fb, t);
    return;
  }
  const textClearTick = pressTick + TURN6_ROCKSLIDE_TEXT_CLEAR_DELAY;
  drawTurn6RockSlideAttack(fb, t, realPressTick - TURN6_BOUNCE_FREEZE_ANCHOR_OFFSET);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  if (t < textClearTick) {
    const superEffectiveStart = turn6SuperEffectiveTextStartTick(pressTick);
    if (t >= superEffectiveStart) {
      drawMessageTextLines(fb, TURN6_SUPER_EFFECTIVE_LINE, "", turn6SuperEffectiveTextVisibleChars(t, pressTick));
    } else {
      drawMessageTextLines(fb, turn6RockslideAttackLines()[0], turn6RockslideAttackLines()[1], rockSlideTextVisibleChars(t, pressTick));
    }
  }
}

export function drawTurn6RockSlideTurnEndSettledMenu(fb: Uint8Array, t: number): void {
  const bounceTick = turn6RockSlideResettledBounceTick(t, TURN6_ROCKSLIDE_PRESS_TICK);
  const bounce = menuIdleBounce(bounceTick);
  drawStaticBgShiftedY(fb, 0, 0);
  drawTurn5IconBar(fb, t);
  drawTurn5SwitchinSprite(fb, t);
  drawSendOutHealthbox(fb, 0, pidgeottoHealthboxContentForHp(turn6PidgeottoAfterRockslideHp()));
  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y + bounce.onixY2);
  drawMenuHealthboxPlayer(fb, 0, bounce.healthboxY2);
  drawPlayerHealthboxHpOverlay(fb, turn5SitrusOnixHp(t), bounce.healthboxY2);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
}

export function drawTurn6RockSlideAttack(fb: Uint8Array, t: number, bounceTick: number): void {
  const pressTick = TURN6_ROCKSLIDE_PRESS_TICK;
  const shiftY = rockSlideBg3Y(t, pressTick);
  drawStaticBgShiftedY(fb, shiftY, turn5BgFadeY(t));
  drawTurn5IconBar(fb, t);
  if (!rockSlideMonBlinkInvisible(t, pressTick)) {
    drawSpriteSheet(fb, pidgeottoFrontSprite.tileset, pidgeottoFrontSprite.palette, PIDGEOTTO_CORNER.x, PIDGEOTTO_CORNER.y + rockSlideMonShakeY2(t, pressTick));
  }
  const bounce = menuIdleBounce(turn5SitrusResettledBounceTick(bounceTick));
  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y + bounce.onixY2);
  const healthboxY2 = rockSlideHealthboxWobbleY2(t, pressTick);
  const opponentHp = rockSlideOpponentHp(t, pressTick, pidgeottoMaxHp(), turn6PidgeottoAfterRockslideHp());
  const opponentContent = pidgeottoHealthboxContentForHp(opponentHp);
  drawSendOutHealthbox(fb, 0, opponentContent);
  if (healthboxY2 !== 0) drawOpponentHealthboxWobble(fb, healthboxY2, opponentContent);
  for (const i of rockSlideDrawOrder(t, pressTick)) {
    const rock = rockSlideRockState(i, t, pressTick);
    if (!rock) continue;
    drawRockSprite(fb, rock.animNum, rock.centerX, rock.centerY);
  }
  drawMenuHealthboxPlayer(fb, 0, bounce.healthboxY2);
  drawPlayerHealthboxHpOverlay(fb, turn5SitrusOnixHp(t), bounce.healthboxY2);
}

export function drawTurn6FeatherDanceKickoffText(fb: Uint8Array, t: number, pressTick: number): void {
  // S7 slice N-4 rung (b) (docs/battle-turn-notes.md §31): once ROCK_SLIDE's
  // own kickoff text hard-cuts the message box (oracle-pixel-confirmed at
  // tick 7765 - `rockSlideTextStartTick(TURN6_ROCKSLIDE_PRESS_TICK)` below),
  // hand off to the turn's second half - same "handoff at the next move's
  // own kickoff-text start" shape `drawTurn3EndeavorText`'s own `rockSlide
  // TextStartTick(TURN3_ROCKSLIDE_PRESS_TICK)` check already established.
  if (t >= rockSlideTextStartTick(TURN6_ROCKSLIDE_PRESS_TICK)) {
    drawTurn6RockSlideWindow(fb, t, pressTick);
    return;
  }
  drawTurn6FieldBase(fb, t, pressTick - TURN6_BOUNCE_FREEZE_ANCHOR_OFFSET, () => drawTurn6FeatherSprites(fb, t, true));
  drawTurn6FeatherSprites(fb, t, false);
  const eva = turn6StatFallEva(t, pressTick);
  if (eva !== null) drawTurn6StatFallBanner(fb, t, pressTick, eva, turn6FeatherdanceStatPalette());
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  const atkFellStart = turn6AtkFellTextStartTick(pressTick);
  if (t >= atkFellStart) {
    drawMessageTextLines(fb, turn6AtkfellKickoffLines()[0], turn6AtkfellKickoffLines()[1], turn6AtkFellTextVisibleChars(t, pressTick));
  } else {
    drawMessageTextLines(fb, turn6FeatherdanceKickoffLines()[0], turn6FeatherdanceKickoffLines()[1], turn6FeatherDanceTextVisibleChars(t, pressTick));
  }
}

export function drawTurn6ActionMenuIdleWindow(fb: Uint8Array, t: number, bounceTick: number = t, bounceIndexOffset: number = 0): void {
  drawTurn6FieldBase(fb, t, bounceTick, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, bounceIndexOffset);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawTurn5SitrusSettledMenuChrome(fb);
}

export function turn13SwitchinSentOutTextVisibleChars(
  continuationElapsed: number,
  trainerPresentation?: FactoryTrainerPresentation,
): number {
  if (continuationElapsed < TURN13_SWITCHIN_SENTOUT_TEXT_AFTER_DISMISS) return 0;
  return Math.min(
    switchinSentOutLine1(trainerPresentation).length + turn13SwitchinSentoutLine2().length,
    continuationElapsed - TURN13_SWITCHIN_SENTOUT_TEXT_AFTER_DISMISS + 1,
  );
}

export function turn13MurkrowBgFadeY(continuationElapsed: number): number {
  return TURN5_BG_FADE_Y[
    continuationElapsed - TURN13_MURKROW_BG_FADE_START_AFTER_DISMISS
  ] ?? 0;
}

export function turn13MurkrowMaterializeCoeff(continuationElapsed: number): number {
  if (continuationElapsed < TURN13_MURKROW_RAMP_RENDER_AFTER_DISMISS) {
    return TURN5_MATERIALIZE_FLAT_COEFF;
  }
  return TURN5_MATERIALIZE_RAMP_COEFF[
    continuationElapsed - TURN13_MURKROW_RAMP_RENDER_AFTER_DISMISS
  ] ?? 0;
}

export function drawTurn5SwitchinSprite(fb: Uint8Array, t: number, pidgeottoX2: number = 0, sink: { keptRows: number; y2: number } | null = null): void {
  if (t < TURN5_BALL_HANDOFF_TICK) return;
  drawTurn5PidgeottoMaterialize(fb, t);
  drawSendOutBall(fb, t, TURN5_BALL_HANDOFF_TICK);
  drawTurn5SwitchinParticles(fb, t, TURN5_BALL_HANDOFF_TICK, TURN5_SWITCHIN_PARTICLE_STALL_LOGICAL_TICK);
  if (t >= turn5PidgeottoSettleTick()) drawTurn5PidgeottoSettled(fb, pidgeottoX2, sink);
}

export function drawTurn5PidgeottoMaterialize(fb: Uint8Array, t: number): void {
  const materializeStart = TURN5_BALL_HANDOFF_TICK + MATERIALIZE_START_OFFSET;
  if (t < materializeStart || t >= turn5PidgeottoSettleTick()) return;
  const local = t - materializeStart;
  const accumulator = affineEmergeAccumulator(local + 1);
  const y2 = MATERIALIZE_Y2_TABLE[local] ?? 0;
  // docs/turn5-resolve-offc-tail-diagnosis.md §13f: this call site reads
  // the coefficient one controller callback too early - same lag
  // drawGeneratedOpponentRelease (:4807-4809) already corrects for.
  const coeff = turn5MaterializeCoeff(t - 1);
  drawSpriteSheetAffineTintedBlend(fb, pidgeottoFrontSprite.tileset, pidgeottoFrontSprite.palette, PIDGEOTTO_CORNER.x, PIDGEOTTO_CORNER.y, accumulator, MATERIALIZE_TINT_COLOR, coeff, y2);
}

export function switchinSentOutTextVisibleChars(
  t: number,
  trainerPresentation?: FactoryTrainerPresentation,
): number {
  if (t < SWITCHIN_SENTOUT_TEXT_START_TICK) return 0;
  return Math.min(
    switchinSentOutLine1(trainerPresentation).length + switchinSentoutLine2().length,
    t - SWITCHIN_SENTOUT_TEXT_START_TICK + 1,
  );
}

export function drawTurn5RockSlideAttack(fb: Uint8Array, t: number, bounceTick: number = t, beforeMonSprite?: () => void, onixX2: number = 0, onixInvisible: boolean = false, onixY2Extra: number = 0, darken: boolean = false, bgFadeYOverride?: number, onixSinkSkipRows: number = 0, latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null = null, bounceIndexOffset: number = 0, suppressSitrusRotate: boolean = false, suppressSitrusStars: boolean = false): void {
  const pressTick = TURN5_ROCKSLIDE_PRESS_TICK;
  drawStaticBgShiftedY(fb, 0, bgFadeYOverride ?? turn5BgFadeY(t), darken ? turn10BgDarkPalette() : undefined);
  // docs/turn5-resolve-ab-pools-diagnosis.md §19 (ISSUES #97): a dense oracle
  // pixel sweep (GROVYLE's own column x=165, ticks 6358-6374) found the real
  // sink is 2 render ticks AHEAD of faintSinkRowsAndY2's default `t-1`
  // anchor - real hardware already shows the first erased row at 6360
  // (GROVYLE_FAINT_SINK_START_TICK itself) where the unshifted formula
  // doesn't erase until 6362. `t+2` reproduces every sampled real
  // transition exactly. Scoped to this call site (not the shared function's
  // default) - turn 13's own faintSinkRowsAndY2 call (battleScene.ts:14513)
  // passes its own explicit startTick/steps and is untouched.
  const sink = faintSinkRowsAndY2(t + 2);
  if (sink.keptRows >= grovyleFaintSinkSteps()) {
    if (!rockSlideMonBlinkInvisible(t, pressTick, TURN5_OFF_ROCKSLIDE_ANIMATION_PROFILE)) {
      drawSpriteSheet(fb, grovyleFrontSprite.tileset, grovyleFrontSprite.palette, GROVYLE_CORNER.x, GROVYLE_CORNER.y + rockSlideMonShakeY2(t, pressTick, TURN5_OFF_ROCKSLIDE_ANIMATION_PROFILE));
    }
  } else if (sink.keptRows > 0) {
    drawSpriteSheetTopRows(fb, grovyleFrontSprite.tileset, grovyleFrontSprite.palette, GROVYLE_CORNER.x, GROVYLE_CORNER.y + sink.y2, sink.keptRows);
  }
  beforeMonSprite?.();
  const sitrusRotate = suppressSitrusRotate ? null : onixSitrusRotateMatrix(t);
  if (sitrusRotate) {
    if (!onixInvisible) {
      drawSpriteSheetAffineRotate(
        fb,
        onixBackSprite.tileset,
        onixBackSprite.palette,
        ONIX_MATERIALIZE_CORNER.x + onixX2 + (onixBackSprite.tileset.columns * 8) / 2,
        ONIX_MATERIALIZE_CORNER.y + (onixBackSprite.tileset.rows * 8) / 2 + sitrusRotate.y2,
        sitrusRotate.pa,
        sitrusRotate.pb,
        sitrusRotate.pc,
        sitrusRotate.pd,
      );
    }
  } else {
    // S7 slice M-5: past the settled menu's own redraw tick, Onix's own
    // on-field sprite (region A) picks up the resettled `menuIdleBounce`
    // cycle too - see `turn5SitrusResettledBounceTick`'s own doc (0 before
    // that tick, so this is a no-op everywhere else in this branch). S7
    // slice N rung (b): `bounceTick` (default live `t`, every pre-existing
    // caller unaffected) lets turn 6's own post-confirm hold pass a FROZEN
    // tick here too - this region's own bounce was still live past the
    // hand-off (rung (a)'s own named 7348-7350 residual, `drawTurn6FieldBase`
    // already freezes region B/the healthbox but never threaded the same
    // freeze into this function) - RAM/pixel-confirmed this session
    // (`turn6-fd-check.json` scratch compare): freezing this too closes the
    // entire 769px residual across 7348-7404 in one fix.
    const onixY2 = menuIdleBounce(turn5SitrusResettledBounceTick(bounceTick), bounceIndexOffset).onixY2 + onixY2Extra;
    const tintCoeff = onixSitrusTintCoeff(t);
    const onixSpriteHeight = onixBackSprite.tileset.rows * 8;
    if (!onixInvisible && onixSinkSkipRows < onixSpriteHeight) {
      if (tintCoeff > 0) {
        drawSpriteSheetAffineTintedBlend(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x + onixX2, ONIX_MATERIALIZE_CORNER.y, 256, ONIX_SITRUS_TINT_COLOR, tintCoeff, onixY2);
      } else if (onixSinkSkipRows > 0) {
        drawSpriteSheetTopClipped(fb, onixBackSprite.tileset, darken ? turn10OnixDarkPalette(onixBackSprite) : onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x + onixX2, ONIX_MATERIALIZE_CORNER.y + onixY2, onixSinkSkipRows);
      } else {
        drawSpriteSheet(fb, onixBackSprite.tileset, darken ? turn10OnixDarkPalette(onixBackSprite) : onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x + onixX2, ONIX_MATERIALIZE_CORNER.y + onixY2);
      }
    }
  }
  if (!suppressSitrusStars) drawGrantingStars(fb, t);
  const sitrusRing = turn5SitrusRingMatrix(t);
  if (sitrusRing) {
    // Z-order (ISSUES #26's own caveat): rows >= PLAYER_BALL_OPEN_VISIBLE_
    // BOTTOM at the player's own field position are occluded by the
    // battlefield's foreground terrain graphic REGARDLESS of OAM priority
    // (the same terrain-vs-sprite compositing already established for the
    // player's own ball-open pose/particles, `PLAYER_BALL_OPEN_VISIBLE_
    // BOTTOM`'s own doc) - not a ring-vs-drop-shadow OAM priority contest as
    // originally hypothesized: the probe's own residual color at rows
    // 112-114 (`(74,66,82)`) is an exact match to that already-cited
    // terrain color, not a distinct shadow sprite.
    drawSpriteSheetAffineRotate(
      fb,
      battleAnimItemHeal.ring.tileset,
      battleAnimItemHeal.ring.palette,
      turn5SitrusRingCenter().x,
      turn5SitrusRingCenter().y,
      sitrusRing.pa,
      sitrusRing.pb,
      sitrusRing.pc,
      sitrusRing.pd,
      PLAYER_BALL_OPEN_VISIBLE_BOTTOM,
    );
  }
  const healthboxY2 = rockSlideHealthboxWobbleY2(t, pressTick, TURN5_OFF_ROCKSLIDE_ANIMATION_PROFILE);
  // docs/turn5-resolve-ab-pools-diagnosis.md §20.1 (ISSUES #97): the
  // never-show-empty-bar sliver's own hp=1->hp=0 boundary lands 2 render
  // ticks late here - scoped `t + 2` at this one call site only (opponentHp
  // only ever takes {1,0} here; the compositor diff at that boundary is
  // exactly the 2 residual pixels, nothing else this function draws).
  const opponentHp = rockSlideOpponentHp(t + 2, pressTick, turn4RockslideHp().to, turn5RockslideOpponentToHp(), TURN5_OFF_ROCKSLIDE_HP_DRAIN_START_DELAY);
  // docs/turn5-resolve-ab-pools-diagnosis.md §19 (ISSUES #97): same 2-tick
  // lag family as the sink shift above - a direct oracle screenshot
  // comparison (6376 vs 6377) shows the real healthbox already gone by
  // 6377, but GROVYLE_HEALTHBOX_VANISH_TICK (6379) doesn't gate it off
  // until 6379. Scoped -2 at this call site only - the constant itself is
  // exclusive to this one gate (no other reader).
  if (t < grovyleHealthboxVanishTick() - 2) {
    const opponentContent = opponentHealthboxContentForHp(opponentHp);
    drawSendOutHealthbox(fb, 0, opponentContent);
    if (healthboxY2 !== 0) drawOpponentHealthboxWobble(fb, healthboxY2, opponentContent);
  }
  drawMenuIdleBounceOverlay(fb, turn5KickoffBounceTickFromLatest(t, TURN5_CONFIRM_PRESS_TICK, latestCompletedCommandHandoff));
  // docs/turn5-resolve-ab-pools-diagnosis.md §17.4 (ISSUES #97): the
  // falling-rock props (`rockSlideRockState`/`drawRockSprite`) never render
  // under `HITMARKER_NO_ANIMATIONS`, same mechanism §15.3 already pinned for
  // this function's own `rockSlideBg3Y` camera shake and
  // `drawTurn9RockSlideAttack` already established as precedent
  // (`battleScene.ts:13077-13083`) - a 12-tick OAM census across 6258-6354
  // found zero rock-shaped (32x32) hardware OAM entries anywhere in this
  // window, so dropped here unconditionally (no scene-ON call site to
  // preserve).
}

export function drawTurn5EndeavorText(
  fb: Uint8Array,
  t: number,
  pressTick: number,
  latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null,
  trainerPresentation?: FactoryTrainerPresentation,
  turn5FaintDismissElapsed: number | null = null,
): void {
  if (t >= rockSlideTextStartTick(TURN5_ROCKSLIDE_PRESS_TICK, TURN5_OFF_ROCKSLIDE_TEXT_DELAY)) {
    drawTurn5RockSlideWindow(fb, t, latestCompletedCommandHandoff, trainerPresentation, turn5FaintDismissElapsed);
    return;
  }
  const bounceTick = turn5KickoffBounceTickFromLatest(t, pressTick, latestCompletedCommandHandoff);
  const onixHp = endeavorHp(t, pressTick, turn5EndeavorHp().from, turn5EndeavorHp().to, TURN5_OFF_ENDEAVOR_HP_DRAIN_START_DELAY);
  drawActionMenuIdleContentFromLatest(
    fb,
    bounceTick,
    latestCompletedCommandHandoff,
    onixHp,
  );
  if (endeavorOnixInvisible(t, pressTick, TURN5_OFF_ENDEAVOR_FLICKER_START)) {
    eraseSpriteFootprint(fb, onixBackSprite.tileset, ONIX_MATERIALIZE_CORNER);
  }
  const wobbleY2 = endeavorHealthboxBounceY2(t, pressTick, TURN5_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START);
  if (wobbleY2 !== 0) {
    drawMenuHealthboxPlayerWobble(fb, wobbleY2);
    drawPlayerHealthboxHpOverlay(fb, onixHp, wobbleY2);
  }
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawMessageTextLines(fb, turn5EndeavorAttackLines()[0], turn5EndeavorAttackLines()[1], turn2KickoffTextVisibleChars(t, pressTick));
}

export function turn5ReopenBounceTick(
  t: number,
  turn5ReopenPressTick: number,
  latest: LatestCompletedCommandHandoff | null,
): number {
  return t >= turn5ReopenPressTick && t <= turn5ReopenPressTick + 2
    ? turn5LegacyResettledBounceTickFromLatest(turn5ReopenPressTick, latest)
    : turn5SubmenuBounceTickFromLatest(t, latest);
}

export function turn5SubmenuBounceTickFromLatest(
  t: number,
  latest: LatestCompletedCommandHandoff | null,
): number {
  return turn5LegacyResettledBounceTickFromLatest(t, latest) - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
}

export function drawTurn4RockSlideWindow(
  fb: Uint8Array,
  t: number,
  latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null,
): void {
  const pressTick = TURN4_CONFIRM_PRESS_TICK;
  const redrawTick = pressTick + TURN4_OFF_ROCKSLIDE_MENU_REDRAW_DELAY;
  if (t >= redrawTick) {
    drawTurn4RockSlideTurnEndSettledMenu(fb, t, latestCompletedCommandHandoff);
    return;
  }
  // Reached only pre-reset - see `drawTurn4KickoffText`'s own guard doc.
  const turn3Content = turn3FightCommandPresentationFromLatest(latestCompletedCommandHandoff);
  if (turn3Content === null) {
    throw new Error("turn-4 attack phase requires the completed turn-3 receipt before its own reset");
  }
  const statRoseStart = statRoseTextStartTick(pressTick, TURN4_OFF_STAT_ROSE_TEXT_DELAY);
  const rockSlideStart = rockSlideTextStartTick(pressTick, TURN4_OFF_ROCKSLIDE_TEXT_DELAY);
  const textClearTick = pressTick + TURN4_OFF_ROCKSLIDE_TEXT_CLEAR_DELAY;
  drawTurn4RockSlideAttack(fb, t, latestCompletedCommandHandoff);
  drawPlayerHealthboxHpOverlay(fb, turn3Content.field.player.hp.current);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  if (t < textClearTick) {
    let line1: string;
    let line2: string;
    let chars: number;
    if (t < statRoseStart) {
      line1 = TURN_KICKOFF_LINE1;
      line2 = TURN_KICKOFF_LINE2;
      chars = turnKickoffTextVisibleChars(t, pressTick);
    } else if (t < rockSlideStart) {
      line1 = STAT_ROSE_LINE1;
      line2 = STAT_ROSE_LINE2;
      chars = statRoseTextVisibleChars(t, pressTick, TURN4_OFF_STAT_ROSE_TEXT_DELAY);
    } else {
      line1 = turn1RockslideAttackLines()[0];
      line2 = turn1RockslideAttackLines()[1];
      chars = rockSlideTextVisibleChars(t, pressTick, TURN4_OFF_ROCKSLIDE_TEXT_DELAY);
    }
    drawMessageTextLines(fb, line1, line2, chars);
  }
}

export function drawTurn4RockSlideTurnEndSettledMenu(
  fb: Uint8Array,
  t: number,
  latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null,
): void {
  const turn4Content = turn4FightCommandPresentationFromLatest(latestCompletedCommandHandoff);
  if (turn4Content === null) {
    throw new Error("turn-4 settled menu requires semantic turn-4 presentation content");
  }
  const bounceTick = fightCommandSettledBounceEpochTick(turn4Content, t - TICK0);
  const playerHp = turn4Content.field.player.hp.current;
  const opponentHp = turn4Content.field.opponent.hp.current;
  drawActionMenuIdleContentFromLatest(fb, bounceTick, latestCompletedCommandHandoff, playerHp);
  drawSendOutHealthbox(fb, 0, opponentHealthboxContentForHp(opponentHp));
  drawPlayerHealthboxHpOverlay(fb, playerHp, menuIdleBounce(bounceTick).healthboxY2);
}

export function drawTurn4RockSlideAttack(
  fb: Uint8Array,
  t: number,
  latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null,
): void {
  const pressTick = TURN4_CONFIRM_PRESS_TICK;
  drawStaticBgShiftedY(fb, 0);
  if (!rockSlideMonBlinkInvisible(t, pressTick, TURN4_OFF_ROCKSLIDE_ANIMATION_PROFILE)) {
    drawSpriteSheet(fb, grovyleFrontSprite.tileset, grovyleFrontSprite.palette, GROVYLE_CORNER.x, GROVYLE_CORNER.y);
  }
  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y);
  const healthboxY2 = rockSlideHealthboxWobbleY2(t, pressTick, TURN4_OFF_ROCKSLIDE_ANIMATION_PROFILE);
  const opponentHp = rockSlideOpponentHp(t, pressTick, turn4RockslideHp().from, turn4RockslideHp().to, TURN4_OFF_ROCKSLIDE_HP_DRAIN_START_DELAY);
  const opponentContent = opponentHealthboxContentForHp(opponentHp);
  drawSendOutHealthbox(fb, 0, opponentContent);
  if (healthboxY2 !== 0) drawOpponentHealthboxWobble(fb, healthboxY2, opponentContent);
  drawMenuHealthboxPlayer(fb, 0);
  // Reached only pre-reset - see `drawTurn4KickoffText`'s own guard doc.
  drawMenuIdleBounceOverlay(fb, turn4KickoffBounceTickFromLatest(t, TURN4_CONFIRM_PRESS_TICK, latestCompletedCommandHandoff));
}

export function drawTurn4KickoffText(
  fb: Uint8Array,
  t: number,
  pressTick: number,
  latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null,
): void {
  if (t - pressTick > TURN4_OFF_STATS_BANNER_END_DELAY) {
    drawTurn4RockSlideWindow(fb, t, latestCompletedCommandHandoff);
    return;
  }
  // Reached only pre-reset (turn 4's own source-owned reset evicts the
  // turn-3 shape this DOUBLE_TEAM kickoff text still needs - see
  // `turn4SettledWindowActive`'s own doc in `drawFightSubmenuWindow`).
  const turn3Content = turn3FightCommandPresentationFromLatest(latestCompletedCommandHandoff);
  if (turn3Content === null) {
    throw new Error("turn-4 kickoff text requires the completed turn-3 receipt before its own reset");
  }
  const bounceTick = turn4KickoffBounceTickFromLatest(t, pressTick, latestCompletedCommandHandoff);
  drawActionMenuIdleContentFromLatest(
    fb,
    bounceTick,
    latestCompletedCommandHandoff,
    turn3Content.field.player.hp.current,
  );
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawMessageTextLines(fb, turn4DoubleteamKickoffLines()[0], turn4DoubleteamKickoffLines()[1], turnKickoffTextVisibleChars(t, pressTick));
  drawStatsBanner(fb, t, pressTick, TURN4_OFF_STATS_BANNER_START_DELAY, TURN4_OFF_STATS_BANNER_END_DELAY, TURN4_OFF_STATS_BANNER_BG1_Y_ANCHOR_DELAY);
}

export function drawTurn3RockSlideWindow(
  fb: Uint8Array,
  t: number,
  latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null,
  turn2Content: FightCommandPresentation | null = null,
): void {
  const pressTick = TURN3_ROCKSLIDE_PRESS_TICK;
  const redrawTick = pressTick + TURN3_OFF_ROCKSLIDE_MENU_REDRAW_DELAY;
  if (t >= redrawTick) {
    drawTurn3RockSlideTurnEndSettledMenu(fb, t, latestCompletedCommandHandoff);
    return;
  }
  const textClearTick = pressTick + TURN3_OFF_ROCKSLIDE_TEXT_CLEAR_DELAY;
  drawTurn3RockSlideAttack(fb, t, turn2Content);
  drawPlayerHealthboxHpOverlay(fb, getAnchorPlayerAfterTurn3Hp());
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  if (t < textClearTick) {
    drawMessageTextLines(fb, turn1RockslideAttackLines()[0], turn1RockslideAttackLines()[1], rockSlideTextVisibleChars(t, pressTick, TURN3_OFF_ROCKSLIDE_TEXT_DELAY));
  }
}

export function drawTurn3RockSlideTurnEndSettledMenu(
  fb: Uint8Array,
  t: number,
  latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null,
): void {
  const turn3Content = turn3FightCommandPresentationFromLatest(latestCompletedCommandHandoff);
  if (turn3Content === null) {
    throw new Error("turn-3 settled menu requires semantic turn-3 presentation content");
  }
  const bounceTick = fightCommandSettledBounceEpochTick(turn3Content, t - TICK0);
  const playerHp = turn3Content.field.player.hp.current;
  const opponentHp = turn3Content.field.opponent.hp.current;
  drawActionMenuIdleContentFromLatest(fb, bounceTick, latestCompletedCommandHandoff, playerHp);
  drawSendOutHealthbox(fb, 0, opponentHealthboxContentForHp(opponentHp));
  drawPlayerHealthboxHpOverlay(fb, playerHp, menuIdleBounce(bounceTick).healthboxY2);
}

export function drawTurn3RockSlideAttack(
  fb: Uint8Array,
  t: number,
  turn2Content: FightCommandPresentation | null = null,
): void {
  const pressTick = TURN3_ROCKSLIDE_PRESS_TICK;
  drawStaticBgShiftedY(fb, 0);
  if (!rockSlideMonBlinkInvisible(t, pressTick, TURN3_OFF_ROCKSLIDE_ANIMATION_PROFILE)) {
    drawSpriteSheet(fb, grovyleFrontSprite.tileset, grovyleFrontSprite.palette, GROVYLE_CORNER.x, GROVYLE_CORNER.y);
  }
  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y);
  const healthboxY2 = rockSlideHealthboxWobbleY2(t, pressTick, TURN3_OFF_ROCKSLIDE_ANIMATION_PROFILE);
  const opponentHp = rockSlideOpponentHp(t, pressTick, turn3RockslideHp().from, turn3RockslideHp().to, TURN3_OFF_ROCKSLIDE_HP_DRAIN_START_DELAY);
  const opponentContent = opponentHealthboxContentForHp(opponentHp);
  drawSendOutHealthbox(fb, 0, opponentContent);
  if (healthboxY2 !== 0) drawOpponentHealthboxWobble(fb, healthboxY2, opponentContent);
  drawMenuHealthboxPlayer(fb, 0);
  // Reached only pre-reset - see `drawTurn3EndeavorText`'s own guard doc.
  if (turn2Content === null) {
    throw new Error("turn-3 attack phase requires semantic turn-2 presentation content");
  }
  drawMenuIdleBounceOverlay(fb, turn3KickoffBounceTick(
    t - TICK0,
    TURN3_CONFIRM_PRESS_TICK - TICK0,
    turn2Content,
  ));
}

export function drawTurn3EndeavorText(
  fb: Uint8Array,
  t: number,
  pressTick: number,
  latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null,
  turn2Content: FightCommandPresentation | null = null,
): void {
  // ISSUES #39 rank-6 slice 3: hands off into turn 3's own ROCK_SLIDE half
  // at the fresh OFF-pinned tick (`TURN3_OFF_ROCKSLIDE_TEXT_DELAY`, replacing
  // the ON-fit default) - same shape `drawTurn2KickoffText`'s own
  // `dragonBreathStart` handoff already established for turn 2.
  if (t >= rockSlideTextStartTick(TURN3_ROCKSLIDE_PRESS_TICK, TURN3_OFF_ROCKSLIDE_TEXT_DELAY)) {
    drawTurn3RockSlideWindow(fb, t, latestCompletedCommandHandoff, turn2Content);
    return;
  }
  // Reached only pre-reset (the branch above always wins once turn 3's own
  // source-owned reset publishes into the shared generic slot and evicts
  // turn 2's own compatibility view - see `turn3SettledWindowActive`'s own
  // doc in `drawFightSubmenuWindow`).
  if (turn2Content === null) {
    throw new Error("turn-3 kickoff text requires semantic turn-2 presentation content");
  }
  const bounceTick = turn3KickoffBounceTick(
    t - TICK0,
    pressTick - TICK0,
    turn2Content,
  );
  const onixHp = endeavorHp(t, pressTick, getAnchorPlayerAfterTurnHp(), getAnchorPlayerAfterTurn3Hp(), TURN3_OFF_ENDEAVOR_HP_DRAIN_START_DELAY);
  drawActionMenuIdleContentFromLatest(
    fb,
    bounceTick,
    latestCompletedCommandHandoff,
    onixHp,
  );
  // Onix's own hit-flash flicker (class b, paired with the wobble below) is
  // baked permanently visible into `menuIdleBase`'s flat harvest - erase its
  // footprint whenever the real sprite's own `invisible` bit is set, same
  // shape slice 2 established for turn 2's own window.
  if (endeavorOnixInvisible(t, pressTick, TURN3_OFF_ENDEAVOR_FLICKER_START)) {
    eraseSpriteFootprint(fb, onixBackSprite.tileset, ONIX_MATERIALIZE_CORNER);
  }
  const wobbleY2 = endeavorHealthboxBounceY2(t, pressTick, TURN3_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START);
  if (wobbleY2 !== 0) {
    drawMenuHealthboxPlayerWobble(fb, wobbleY2);
    drawPlayerHealthboxHpOverlay(fb, onixHp, wobbleY2);
  }
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawMessageTextLines(fb, TURN_KICKOFF_LINE1, TURN2_KICKOFF_LINE2, turn2KickoffTextVisibleChars(t, pressTick));
}

export function drawTurn2KickoffText(
  fb: Uint8Array,
  t: number,
  pressTick: number,
  latestCompletedCommandHandoff: LatestCompletedCommandHandoff | null = null,
): void {
  const turn2Content = turn2FightCommandPresentationFromLatest(
    latestCompletedCommandHandoff,
  );
  const dragonBreathStart = dragonBreathTextStartTick(pressTick, TURN2_OFF_DRAGONBREATH_TEXT_START_DELAY);
  if (
    t >= dragonBreathStart
    && turn2Content !== null
  ) {
    drawDragonBreathTurnEndSettledMenu(
      fb,
      t,
      latestCompletedCommandHandoff,
      turn2Content,
    );
    return;
  }
  // ISSUES #39 rank-6 slice 2: ENDEAVOR's own attacker squish/blend/droplets
  // and the target's own hitsplats (`drawEndeavorSquish`'s attacker-side
  // content) are class (c) for turn 2's own Scene-OFF window (pixel-confirmed
  // absent, oracle frames 3000-3026 match cleanly once the call is skipped -
  // banked ISSUES #39) - never called here; the idle content underneath
  // renders unchanged instead, the same "just don't call it" treatment turn
  // 1's own DOUBLE_TEAM clone-blend got. (`drawEndeavorSquish` itself was
  // later deleted outright once turn 5, its last remaining caller, dropped
  // it too - `docs/turn5-confirm-pools-diagnosis.md` §1, ISSUES #97
  // remainder.) UNLIKE the attacker-side content, Onix's
  // own generic post-hit healthbox wobble (class b, the SAME "wobble
  // survives, shake/squish doesn't" split ROCK_SLIDE/DRAGON_BREATH's own
  // hit-flash pairs already establish) is RAM/pixel-confirmed still active
  // here (`healthbox0Y2` alternates +1/-1 for 20 ticks starting render 3027,
  // `tools/probe/dump-turn2-dragonbreath-off.py` against `turn2-endeavor-
  // off.json`) - re-anchored below rather than dropped.
  if (t >= dragonBreathStart) {
    drawDragonBreathScene(
      fb,
      t,
      pressTick,
      latestCompletedCommandHandoff,
    );
  } else {
    const genericEpochAge = latestCompletedCommandPresentationEpochElapsedSinceReset(
      latestCompletedCommandHandoff,
      t - TICK0,
    );
    const bounceTick = genericEpochAge !== null
      ? turn2KickoffBounceTick(t - TICK0, pressTick - TICK0, genericEpochAge)
      : turnKickoffBounceTick(t, pressTick);
    drawActionMenuIdleContentFromLatest(fb, bounceTick, latestCompletedCommandHandoff);
    // Onix's own hit-flash flicker (class b, paired with the wobble below)
    // is baked permanently visible into `menuIdleBase`'s flat harvest -
    // unlike `drawEndeavorSquish`'s own primitive reconstruction (where
    // skipping the sprite draw call is enough), this window needs an active
    // erase back to the field background whenever the real sprite's own
    // `invisible` bit is set, same shape `eraseSpriteFootprint`'s own
    // Pidgeotto/Grovyle callers already use elsewhere.
    if (endeavorOnixInvisible(t, pressTick, TURN2_OFF_ENDEAVOR_FLICKER_START)) {
      eraseSpriteFootprint(fb, onixBackSprite.tileset, ONIX_MATERIALIZE_CORNER);
    }
    // Onix's hp is still exactly `anchorPlayerBattler.hp` throughout this
    // wobble window (the drain doesn't start until `TURN2_OFF_ENDEAVOR_HP_
    // DRAIN_START_DELAY`, well after it), so `drawPlayerHealthboxHpOverlay`'s
    // own no-op guard below never fires to carry the yOffset - the wobble
    // needs its own direct redraw of the healthbox base, same call
    // `drawEndeavorSquish` itself uses.
    const wobbleY2 = endeavorHealthboxBounceY2(t, pressTick, TURN2_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START);
    if (wobbleY2 !== 0) drawMenuHealthboxPlayerWobble(fb, wobbleY2);
  }
  // S7 slice E1b: Onix's own HP-bar drain (117->101, `endeavorHp`) is
  // valid for every `t` (clamped both sides) - safe to call unconditionally
  // here rather than gating on a separate "drain window" branch, same
  // convention `drawRockSlideAttack`/`drawTurnEndSettledMenu` already use
  // for the opponent's own bar.
  const onixHp = endeavorHp(t, pressTick, turn2EndeavorHp().from, turn2EndeavorHp().to, TURN2_OFF_ENDEAVOR_HP_DRAIN_START_DELAY);
  drawPlayerHealthboxHpOverlay(fb, onixHp, endeavorHealthboxBounceY2(t, pressTick, TURN2_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START));
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  if (t >= dragonBreathStart) {
    if (t < pressTick + TURN2_OFF_DRAGONBREATH_TEXT_CLEAR_DELAY) {
      drawMessageTextLines(fb, ROCK_SLIDE_LINE1, DRAGONBREATH_KICKOFF_LINE2, dragonBreathTextVisibleChars(t, pressTick, TURN2_OFF_DRAGONBREATH_TEXT_START_DELAY));
    }
    return;
  }
  if (t < pressTick + TURN2_OFF_ENDEAVOR_TEXT_CLEAR_DELAY) {
    drawMessageTextLines(fb, turn2EndeavorAttackLines()[0], turn2EndeavorAttackLines()[1], turn2KickoffTextVisibleChars(t, pressTick));
  }
}

export function drawTurnKickoffText(fb: Uint8Array, t: number, pressTick: number): void {
  drawActionMenuIdleContentFromLatest(fb, turnKickoffBounceTick(t, pressTick), null);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawMessageTextLines(fb, TURN_KICKOFF_LINE1, TURN_KICKOFF_LINE2, turnKickoffTextVisibleChars(t, pressTick));
}

// --- slice 4 batch: verbatim move ---

export function playerHealthboxHpOverlayForHp(hp: number): ReturnType<typeof composePlayerHealthboxHpOverlay> {
  let cached = playerHealthboxHpOverlayByHp.get(hp);
  if (!cached) {
    cached = composePlayerHealthboxHpOverlay(playerHealthboxHpOverlayAssets, hp, getAnchorPlayerBattler().maxHP);
    playerHealthboxHpOverlayByHp.set(hp, cached);
  }
  return cached;
}
