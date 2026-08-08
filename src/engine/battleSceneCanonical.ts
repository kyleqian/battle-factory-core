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

export const anchorOpponentAfterTurn4Hp = 1;

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

export const ENDEAVOR_HITSPLAT_ROUNDS: readonly { center: { x: number; y: number }; ramOffset: number }[] = [
  { center: { x: 60, y: 76 }, ramOffset: 62 }, // round 0: RAM 3007-3016 visible (script offset (12,-12), X-flipped for the target side)
  { center: { x: 84, y: 100 }, ramOffset: 88 }, // round 1: RAM 3033-3042 visible (script offset (-12,12), X-flipped for the target side)
];

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

export const GROVYLE_FAINT_SINK_START_TICK = 6502;

export const TURN5_BG_FADE_START_TICK = 6746;

export const TURN5_SITRUS_HEAL_TEXT_START_TICK = 7078;

export const TURN5_SITRUS_TEXT_CLEAR_TICK = 7216;

export const TURN5_SITRUS_MENU_REDRAW_TICK = 7222;

export const TURN5_FAINTED_TEXT_DELAY = 694;

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

export const TURN5_STRETCH_TICK = 6786;

export const TURN5_STRETCH_TABLE: readonly { xScale: number; yScale: number; y2: number }[] = [
  { xScale: 256, yScale: 256, y2: 0 },
  { xScale: 257, yScale: 254, y2: 0 },
  { xScale: 258, yScale: 251, y2: 0 },
  { xScale: 259, yScale: 248, y2: -1 },
  { xScale: 260, yScale: 245, y2: -1 },
  { xScale: 262, yScale: 241, y2: -1 },
  { xScale: 263, yScale: 239, y2: -2 },
  { xScale: 264, yScale: 236, y2: -2 },
  { xScale: 265, yScale: 234, y2: -2 },
  { xScale: 266, yScale: 231, y2: -3 },
  { xScale: 267, yScale: 221, y2: -4 },
  { xScale: 268, yScale: 222, y2: -4 },
  { xScale: 268, yScale: 229, y2: -3 },
  { xScale: 269, yScale: 231, y2: -3 },
  { xScale: 270, yScale: 222, y2: -4 },
  { xScale: 270, yScale: 213, y2: -5 },
  { xScale: 271, yScale: 215, y2: -5 },
  { xScale: 271, yScale: 223, y2: -4 },
  { xScale: 271, yScale: 225, y2: -3 },
  { xScale: 271, yScale: 218, y2: -4 },
  { xScale: 272, yScale: 209, y2: -5 },
  { xScale: 271, yScale: 212, y2: -5 },
  { xScale: 271, yScale: 222, y2: -4 },
  { xScale: 271, yScale: 226, y2: -3 },
  { xScale: 271, yScale: 219, y2: -4 },
  { xScale: 270, yScale: 213, y2: -5 },
  { xScale: 270, yScale: 216, y2: -5 },
  { xScale: 269, yScale: 227, y2: -3 },
  { xScale: 269, yScale: 232, y2: -3 },
  { xScale: 268, yScale: 227, y2: -3 },
  { xScale: 267, yScale: 228, y2: -3 },
  { xScale: 266, yScale: 230, y2: -3 },
  { xScale: 265, yScale: 233, y2: -2 },
  { xScale: 264, yScale: 235, y2: -2 },
  { xScale: 263, yScale: 238, y2: -2 },
  { xScale: 262, yScale: 241, y2: -1 },
  { xScale: 261, yScale: 244, y2: -1 },
  { xScale: 259, yScale: 247, y2: -1 },
  { xScale: 258, yScale: 250, y2: 0 },
  { xScale: 257, yScale: 253, y2: 0 },
  { xScale: 256, yScale: 256, y2: 0 },
];

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

export const TURN11_ATKFLOOR_LINE1 = "ONIX’s ATTACK";

export const TURN11_ATKFLOOR_LINE2 = "won’t go lower!";

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
import { CLOSED_FIGHT_SUBMENU_STATE, FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY, FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT, HIT_FLASH_RAM_ANCHOR_DELAY, MENU_IDLE_BLANK_END_TICK, ROCK_SLIDE_ANIMATION_PROFILE, ROCK_SLIDE_LINE1, TURN6_ROCKSLIDE_MENU_REDRAW_DELAY, TURN6_ROCKSLIDE_PRESS_TICK, TURN7_ROCKSLIDE_MENU_REDRAW_DELAY, TURN7_ROCKSLIDE_PRESS_TICK } from "./battleMenu.ts";
import { fightCommandKickoffBounceEpochTick, type FightCommandPresentation } from "./fightCommandPresentation.ts";
import { composePlayerHealthboxHpOverlay } from "./healthboxAssembly.ts";
import { latestCompletedCommandPresentationEpochElapsedSinceReset, type LatestCompletedCommandHandoff } from "./nextCommandHandoff.ts";
import { TURN10_AERIALACE_HP } from "./turn10ResolutionAdapter.ts";
import { TURN12_AERIALACE_HP } from "./turn12ResolutionAdapter.ts";
import { CANONICAL_OPPONENT_FLY_RESOLUTION } from "./turn15FlyResolutionAdapter.ts";
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
import { type BattleSceneState } from "./battleScene.ts";

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
 * entries 465/468/487): `anchorOpponentAfterTurn4Hp`'s own literal above now
 * has an independent staged proof (`turn4RockSlidePresentationStaging.ts`),
 * byte-identical (41 -> 1). Consumers below read this instead of the bare
 * literal; `anchorOpponentAfterTurn4Hp` itself stays defined and in use by
 * `drawEndeavorSquish`'s own steady-state read (`:7056` as of this pass -- a
 * different, non-drain, read §9.3's own mapping table already found needs no
 * kernel event at all).
 */
export const TURN4_ROCKSLIDE_HP = resolveTurn4RockSlideHpEndpoints();



/**
 * Presentation-seam retirement (`docs/presentation-seam-scout.md` §10.2/
 * §10.3 step 1): turn 3's own ROCK_SLIDE HP endpoints (88 -> 41), now with an
 * independent staged proof (`turn3RockSlidePresentationStaging.ts`),
 * byte-identical to the completed-turn-2/turn-3 HP handoffs.
 * `drawTurn3RockSlideAttack`/`drawTurn3RockSlideTurnEndSettledMenu` read this
 * staging pair while their settled boundary consumes the turn-3 receipt.
 */
export const TURN3_ROCKSLIDE_HP = resolveTurn3RockSlideHpEndpoints();



/** Same memoization shape as `opponentHealthboxContentByHp` - only the 17 distinct integer HPs `endeavorHp` ever produces (117 down to 101) are ever requested. */
export const playerHealthboxHpOverlayByHp = new Map<number, ReturnType<typeof composePlayerHealthboxHpOverlay>>();



export const INITIAL_BATTLE_SCENE_STATE: BattleSceneState = {
  elapsed: 0,
  sendOutPressElapsed: null,
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
export const BATTLE2_TURN1_KERNEL = stageBattle2Turn1Kernel();



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
 * dump (`src/data/gen/turn3-menu-bouncer-raw-probe.json`,
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


export const TURN2_ENDEAVOR_HP = resolveTurn2EndeavorHpEndpoints();


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


export const TURN5_ENDEAVOR_HP = resolveTurn5EndeavorHpEndpoints();


export const GROVYLE_FAINT_SINK = resolveTurn5FaintSinkGeometry();



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
export const TURN5_SITRUS = resolveTurn5SitrusAdapter();



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
 * actually FAINTS here: the sink (`grovyleFaintSinkRowsAndY2`) replaces the
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
 * the bare `anchorOpponentAfterTurn4Hp` literal (named as §9.4 rung 5's own
 * residual gap, entries 465/468/487), now reads `TURN4_ROCKSLIDE_HP.to` --
 * `turn4RockSlidePresentationStaging.ts`'s own independent staged proof of
 * that exact settle (41 -> 1), not circular: that module stages Grovyle's
 * PRE-turn-4 hp (41) and independently computes the turn-4 hit's own
 * settle, it does not consume this window's value.
 */
export const TURN5_ROCKSLIDE_OPPONENT_TO_HP = resolveTurn5FaintWindowKoHp();



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
 * 2. **Wobble table** (render 6786-6826, `TURN5_STRETCH_TICK`-anchored):
 *    once the stretch driver's own callback engages (RAM 6784), `data4`/
 *    `data5`/`y2` (`xScale`/`yScale`/`y2`) oscillate in a small,
 *    non-monotonic band around neutral (256, max deviation ~272/209, i.e.
 *    an ~6% wobble, not a real stretch) before returning to exactly
 *    `(256,256,0)` at the last entry - RAM ground truth, not curve-fit,
 *    same precedent as `GROVYLE_STRETCH_TABLE`. Palette coefficient is 0
 *    (true colors) for this entire phase (confirmed via the same palette
 *    probe). Settles to the plain, untransformed sprite at
 *    `TURN5_PIDGEOTTO_SETTLE_TICK` (RAM 6827's own idle callback, visible
 *    render 6828) - species-dossier slice 7: now
 *    `TURN5_SWITCHIN.materializeSettleTick`, `turn5ResolutionAdapter.ts`'s
 *    own adapter-owned fact, not an independently hand-derived literal here.
 *
 * Front-sprite frame selection (`turn5PidgeottoFrame`) uses the RAM-
 * confirmed `animCmdIndex` transition ticks directly (render = RAM+1: 6761,
 * 6766, 6776, 6786, 6821) with an even/odd-index parity heuristic (no
 * species-specific frame-duration table was extracted for Pidgeotto this
 * session, unlike Grovyle's own `battleAnimTables.grovyleFrontAnim`) -
 * verified empirically against the oracle's own pixels in this window (see
 * `turn5-switchin.json`'s own 0-diff verification), not assumed.
 */
export function turn5PidgeottoFrame(t: number): 0 | 1 {
  if (t < 6761) return 0;
  if (t < 6766) return 0;
  if (t < 6776) return 1;
  if (t < 6786) return 0;
  if (t < 6821) return 1;
  return 0;
}



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


export function turn6KickoffBounceTick(t: number, pressTick: number): number {
  if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) return t;
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
export const TURN6_PIDGEOTTO_AFTER_ROCKSLIDE_HP = resolveTurn6RockSlideHpEndpoints().to;



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
export const TURN7_PIDGEOTTO_AFTER_ROCKSLIDE_HP = resolveTurn7RockSlideHpEndpoints().to;



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


export const TURN11_ATKFLOOR_TEXT_TOTAL = TURN11_ATKFLOOR_LINE1.length + TURN11_ATKFLOOR_LINE2.length;


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


export const TURN1_ROCKSLIDE_HP = resolveTurn1RockSlideHpEndpoints();


export const TURN1_OFF_ROCKSLIDE_ANIMATION_PROFILE = {
  ...ROCK_SLIDE_ANIMATION_PROFILE,
  hitFlashAnchorAge: 327, // RAM tick 2245 (healthbox wobble's own first +1 write) - pressTick(1919), +1 for the PNG(t)=RAM(t-1) capture lag `TURN1_OFF_STATS_BANNER_BG1_Y_ANCHOR_DELAY`'s own doc establishes
};


/** Murkrow's own mon sprite goes invisible the SAME tick the ball spawns (`AnimFlyBallUp`'s own two-line body) and stays that way PERSISTENTLY (this turn's own charge half never un-hides it; `STATUS3_ON_AIR`'s later set at 17913 keeps it hidden into the settled turn-15 menu for an independent, cross-boundary reason - docs/turn14-notes.md's own §5(c)). */
export function turn14MurkrowInvisible(t: number): boolean {
  return t - 1 >= TURN14_FLY_BALL_RAM_START;
}



/** "Foe MURKROW flew\nup high!" (`gFirstTurnOfTwoStringIds[B_MSG_TURN1_FLY]`) uses the ordinary one-character-per-frame printer, but its first visible glyph is render tick 17823. Fresh per-glyph diffs show the former 17822 anchor led the oracle by exactly one character (the three space ticks were consequently already exact); the completed string remains exact at 17846. */
export const TURN14_FLYUP_LINE1 = CANONICAL_OPPONENT_FLY_RESOLUTION.chargeLines[0]!;


export const TURN14_FLYUP_LINE2 = CANONICAL_OPPONENT_FLY_RESOLUTION.chargeLines[1]!;




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
export const TURN15_FLY_STRIKE_LINE1 = CANONICAL_OPPONENT_FLY_RESOLUTION.strikeLines[0]!;


export const TURN15_FLY_STRIKE_LINE2 = CANONICAL_OPPONENT_FLY_RESOLUTION.strikeLines[1]!;




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

// --- slice 4 batch 1: leaves whose canonical-only deps already moved ---


export const menuIdleOnixBounce = menuIdleOnixBounceAsset as MenuIdleBounceTwoStateAsset;


export const menuIdleHealthboxBounce = menuIdleHealthboxBounceAsset as MenuIdleBounceTwoStateAsset;



/**
 * ONIX's ROCK SLIDE HP boundary for KABUTO, sourced from the real kernel
 * resolution (battle2CommandAdapter.ts) instead of formerly-hardcoded
 * battle2Turn1.ts constants -- same `{from, to}` shape every other turn
 * window's own `rockSlideOpponentHp` boundary constant uses.
 */
export const BATTLE2_TURN1_KABUTO_ROCK_SLIDE_HP = (() => {
  const resolution = createBattle2CommandAdapterResolution(BATTLE2_TURN1_KERNEL);
  const hpCommand = resolution.segments[0]!.commands.find(
    (command) => command.type === "hp" && command.battler === 1,
  );
  if (!hpCommand || hpCommand.type !== "hp") {
    throw new Error(
      "battle2CommandAdapter: expected KABUTO's ROCK SLIDE hp command",
    );
  }
  return { from: hpCommand.from, to: hpCommand.to };
})();



/** Visible character count (0..DRAGONBREATH_KICKOFF_TEXT_TOTAL) of "ONIX used\nDRAGONBREATH!" at absolute trace tick `t` - same 1-tick/char mechanism as `turn2KickoffTextVisibleChars`. Oracle-confirmed exact (docs/dragon-breath-notes.md): tick 3157 (start+20) is the last still-increasing frame (21 chars), tick 3158 (start+21) shows all 22 and holds flat through 3176. */
export function dragonBreathTextVisibleChars(t: number, pressTick: number, startDelay: number = DRAGONBREATH_TEXT_START_DELAY): number {
  const start = dragonBreathTextStartTick(pressTick, startDelay);
  if (t < start) return 0;
  return Math.min(DRAGONBREATH_KICKOFF_TEXT_TOTAL, t - start + 1);
}


export const GROVYLE_FAINT_SINK_STEPS = GROVYLE_FAINT_SINK.steps;



/** Grovyle's own opponent healthbox vanishes entirely 2 ticks after the sink's own last visible erase-step (`GROVYLE_FAINT_SINK_START_TICK + 2*GROVYLE_FAINT_SINK_STEPS + 3` = 6521) - pixel-confirmed this session (dense oracle sweep of the healthbox's own crop: byte-identical bare background from tick 6521 on, a 7064px whole-healthbox-region diff the tick before). A distinct UI element from the sprite sink above (different screen region), not itemized in docs/faint-switch-notes.md §3/§7 - this session's own re-probe answers the brief's own "what happens to Grovyle's healthbox" question directly. ISSUES #39 rank-3 flip: `healthboxVanishFrame` is now the SAME generic formula's own output (`GROVYLE_FAINT_SINK.healthboxVanishFrame`), not an independently re-stated `+19`. */
export const GROVYLE_HEALTHBOX_VANISH_TICK = GROVYLE_FAINT_SINK_START_TICK + GROVYLE_FAINT_SINK.healthboxVanishFrame;



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
export const TURN5_SITRUS_HEAL_LINE1 = TURN5_SITRUS.healLines[0]!;


export const TURN5_SITRUS_HEAL_LINE2 = TURN5_SITRUS.healLines[1]!;



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
export const TURN5_SITRUS_HEAL_HP_START = TURN5_SITRUS.hp.from;


export const TURN5_SITRUS_HEAL_HP_END = TURN5_SITRUS.hp.to;



/**
 * ISSUES #26 (docs/faint-switch-notes.md §16): the Sitrus proc's expanding
 * THIN_RING (`gThinRingExpandingSpriteTemplate`, `gSprites[4]`,
 * `matrixNum=2`) - RAM ground truth from the dedicated probe
 * (`src/data/gen/turn5-sitrus-ring-probe.json`, twice-run byte-identical,
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
export const TURN5_SITRUS_RING_CENTER = TURN5_SITRUS.onFieldCenter;



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
  return Math.min(TURN11_ATKFLOOR_TEXT_TOTAL, t - start + 1);
}


export function turn11SuperEffectiveTextVisibleChars(t: number, pressTick: number, delay: number = TURN11_SUPER_EFFECTIVE_TEXT_DELAY): number {
  const start = turn11SuperEffectiveTextStartTick(pressTick, delay);
  if (t < start) return 0;
  return Math.min(TURN6_SUPER_EFFECTIVE_LINE.length, t - start + 1);
}


export const TURN14_FLYUP_TEXT_TOTAL = TURN14_FLYUP_LINE1.length + TURN14_FLYUP_LINE2.length;


export const TURN15_FLY_STRIKE_TEXT_TOTAL = TURN15_FLY_STRIKE_LINE1.length + TURN15_FLY_STRIKE_LINE2.length;

// --- slice 4 batch: verbatim move ---

export const [TURN5_FAINTED_LINE1, TURN5_FAINTED_LINE2] = resolveTurn5FaintWindowLines();

export const TURN5_FAINTED_TEXT_TOTAL = TURN5_FAINTED_LINE1.length + TURN5_FAINTED_LINE2.length;

export const TURN5_FAINTED_CURSOR_START_DELAY = TURN5_FAINTED_TEXT_DELAY + TURN5_FAINTED_TEXT_TOTAL + 1;

export function turn5RockSlideKoDismissEligible(t: number): boolean {
  return t >= TURN5_ROCKSLIDE_PRESS_TICK + TURN5_FAINTED_CURSOR_START_DELAY;
}

export function grovyleFaintSinkRowsAndY2(t: number, startTick: number = GROVYLE_FAINT_SINK_START_TICK, steps: number = GROVYLE_FAINT_SINK_STEPS): { keptRows: number; y2: number } {
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

export const [TURN4_DOUBLETEAM_KICKOFF_LINE1, TURN4_DOUBLETEAM_KICKOFF_LINE2] = resolveTurn4DoubleTeamKickoffLines();

export const [TURN8_BIND_LINE1, TURN8_BIND_LINE2] = resolveTurn8BindKickoffLines();
export const [TURN8_MISS_LINE1, TURN8_MISS_LINE2] = resolveTurn8MissLines();

export const TURN8_BIND_TEXT_TOTAL = TURN8_BIND_LINE1.length + TURN8_BIND_LINE2.length;

export const TURN8_MISS_TEXT_TOTAL = TURN8_MISS_LINE1.length + TURN8_MISS_LINE2.length;

export const [TURN2_ENDEAVOR_ATTACK_LINE1, TURN2_ENDEAVOR_ATTACK_LINE2] = resolveTurn2EndeavorAttackLines();

export const [TURN5_ENDEAVOR_ATTACK_LINE1, TURN5_ENDEAVOR_ATTACK_LINE2] = resolveTurn5EndeavorAttackLines();

export const [TURN13_SANDATTACK_EVENT_LINE1, TURN13_SANDATTACK_EVENT_LINE2] = resolveTurn13SandAttackKickoffLines();
export const TURN13_SANDATTACK_TEXT_TOTAL = TURN13_SANDATTACK_EVENT_LINE1.length + TURN13_SANDATTACK_EVENT_LINE2.length;

export const [TURN13_ACCFELL_EVENT_LINE1, TURN13_ACCFELL_EVENT_LINE2] = resolveTurn13AccFellLines();
export const TURN13_ACCFELL_TEXT_TOTAL = TURN13_ACCFELL_EVENT_LINE1.length + TURN13_ACCFELL_EVENT_LINE2.length;

export const [TURN1_ROCKSLIDE_KICKOFF_LINE1, TURN1_ROCKSLIDE_KICKOFF_LINE2] = resolveTurn1DoubleTeamKickoffLines();
export const [TURN1_ROCKSLIDE_ATTACK_LINE1, TURN1_ROCKSLIDE_ATTACK_LINE2] = resolveTurn1RockSlideAttackLines();
