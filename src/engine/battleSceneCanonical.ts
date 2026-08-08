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
