/**
 * snd145 (S10A, ISSUES #146 remainder; docs/send-in-tail-model.md §1, docs/snd145-send-in-tail-live.md): the species-keyed OPPONENT
 * send-in tail of a Scene ON `switch-in` command (voluntary switch, forced Roar / Whirlwind switch and faint replacement all emit it;
 * Scene OFF skips the front animation -- HITMARKER_NO_ANIMATIONS -> SKIP_FRONT_ANIM, pokemon.c:6803 -- so its slide does not wait
 * for it and keeps the calibrated constants). The healthbox slide waits for the species front animation (`SwitchIn_ShowHealthbox`,
 * battle_controller_opponent.c:482-498) and the next printstring follows the controller end (`SwitchIn_HandleSoundAndEnd`), so both are
 * `sendInTail(species, "opponent")` (src/data/sendInTail.ts). The command's elapsed 0 is the send-in start (the model's frame 0:
 * the ball shows from elapsed 2, opens at 18), so the model's frames are the command's elapsed directly (ROM-verified on dense Scene ON
 * windows, docs/snd145-send-in-tail-live.md). The player side keeps its calibrated constants (slide 66, span 91 + 11).
 */
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };
import { selectBackSendOutAnimation } from "../animation/backSendOutAnim.ts";
import { BACK_SEND_OUT_REDUCERS } from "../animation/sendOutDispatcher.ts";
import { SEND_IN_TAIL_CASTFORM, sendInTail } from "../data/sendInTail.ts";
import { SEND_IN_TAIL_OFF_CRY_FRAMES } from "../data/sendInTailOff.ts";
import { PARTY_SENDOUT_ACTION_MENU_START, PARTY_SENDOUT_BLANK_MESSAGE_START, type PartySendOutTiming } from "./partySelect.ts";
import { natureFromPersonality } from "./opponentGen.ts";

/** Opponent send-in: the `switch-in` elapsed of the healthbox slide's first frame (x2 -110). */
export function opponentSwitchInHealthboxSlideElapsed(species: number): number {
  return sendInTail(species, "opponent").slideStart;
}

/** Opponent send-in: the `switch-in` command's whole duration (controller span + waitstate hold) = the next command's first frame. */
export function opponentSwitchInDuration(species: number): number {
  return sendInTail(species, "opponent").messageStart!;
}

/**
 * Opponent send-in: frames the whole send-in (ball, emerge, fade, particles) starts late. CASTFORM's ball shows one frame later
 * than every other species' on the same timeline (dense Scene ON windows; the sweep's +1 on y2 start, slide and message alike), so
 * its +1 is a whole-send-in shift (its slide / message frames above already include it).
 */
export function opponentSwitchInVisualDelay(species: number): number {
  return species === SEND_IN_TAIL_CASTFORM ? 1 : 0;
}

/**
 * offs152 (ISSUES #146 remainder; docs/offs152-scene-off-send-in-tail.md): the Scene OFF OPPONENT send-in tail. Scene OFF skips the
 * front animation (HITMARKER_NO_ANIMATIONS -> SKIP_FRONT_ANIM, pokemon.c:6803), so the healthbox slide starts at a constant elapsed
 * 36, and the next printstring waits for the controller end: the slide (+ 26) or the send-in cry (`SwitchIn_HandleSoundAndEnd` waits
 * for !IsCryPlayingOrClearCrySongs; the cry starts when the emerge affine animation ends), whichever is later. Direct-mGBA Scene OFF
 * sweep of the 339 stageable Factory species, twice fresh (tools/integration/fixtures/offs152/): slide 339 / 339, message 339 / 339 with
 *   message = shift + max(SLIDE + 26 + (nickname >= 7 glyphs ? 1 : 0), cryFrames(species) + 37)
 * where cryFrames is SOURCE-derived (src/data/sendInTailOff.ts: the compiled cry sample's length) and shift = 1 for CASTFORM and SPINDA,
 * whose whole send-in runs one frame late in both scenes (y2 start +1; ON models CASTFORM's only). The long-nickname +1 is a measured
 * rule (57 / 57 non-cry-bound species: 6 glyphs or fewer -> 62, 7 or more -> 63), mechanism not proven (the healthbox nickname render
 * at the slide start while the cry still plays; a lag-frame class). Unmeasured: CRY_MODE_WEAK (an incoming mon with a status or HP in
 * the yellow / red: a lower pitch), shiny send-ins.
 */
export const SCENE_OFF_SEND_IN_SLIDE = 36;
export const SCENE_OFF_SEND_IN_SLIDE_TO_MESSAGE = 26;
export const SCENE_OFF_SEND_IN_CRY_TO_MESSAGE = 37;
export const SCENE_OFF_SEND_IN_LONG_NICKNAME = 7;
const SPECIES_SPINDA = 308;

/** Scene OFF opponent send-in: frames the whole send-in starts late (CASTFORM, SPINDA: 1). */
export function sceneOffOpponentSwitchInVisualDelay(species: number): number {
  return species === SEND_IN_TAIL_CASTFORM || species === SPECIES_SPINDA ? 1 : 0;
}

/** Scene OFF opponent send-in: the `switch-in` elapsed of the healthbox slide's first frame. */
export function sceneOffOpponentSwitchInHealthboxSlideElapsed(species: number): number {
  return SCENE_OFF_SEND_IN_SLIDE + sceneOffOpponentSwitchInVisualDelay(species);
}

/**
 * Scene OFF opponent send-in with a long nickname (>= 7 glyphs): a lag frame at the slide start, so every send-in visual (white fade,
 * particles, slide) runs one frame late from this `switch-in` elapsed on: the slide's first frame itself when the cry is at least
 * SCENE_OFF_SEND_IN_LAG_CRY_FRAMES long, else the frame after it (the first slide frame shows twice). Dense Scene OFF windows, measured
 * rule: cry 12 / 17 / 23 -> slide + 1; cry 24 / 25 / 25 / 26 / 27 / 29 / 36 / 37 / 108 -> slide; nicknames of 6 glyphs or fewer (SPHEAL,
 * ONIX, SPINDA) have none. null = no lag frame.
 */
export const SCENE_OFF_SEND_IN_LAG_CRY_FRAMES = 24;
export function sceneOffOpponentSwitchInLagElapsed(species: number, nickname: string): number | null {
  if (nickname.length < SCENE_OFF_SEND_IN_LONG_NICKNAME) return null;
  return sceneOffOpponentSwitchInHealthboxSlideElapsed(species)
    + ((SEND_IN_TAIL_OFF_CRY_FRAMES[species] ?? 0) >= SCENE_OFF_SEND_IN_LAG_CRY_FRAMES ? 0 : 1);
}

/** Scene OFF opponent send-in: the `switch-in` command's whole duration (= the next printstring's first frame). */
export function sceneOffOpponentSwitchInDuration(species: number, nickname: string): number {
  const slideBound = SCENE_OFF_SEND_IN_SLIDE + SCENE_OFF_SEND_IN_SLIDE_TO_MESSAGE
    + (nickname.length >= SCENE_OFF_SEND_IN_LONG_NICKNAME ? 1 : 0);
  const cryBound = (SEND_IN_TAIL_OFF_CRY_FRAMES[species] ?? 0) + SCENE_OFF_SEND_IN_CRY_TO_MESSAGE;
  return sceneOffOpponentSwitchInVisualDelay(species) + Math.max(slideBound, cryBound);
}

/**
 * plr162 (ISSUES #146; docs/plr162-player-forced-send-in.md, from offs152 R2): the Scene OFF PLAYER send-in after a FORCED switch
 * (Roar / Whirlwind `returntoball BS_TARGET` on the player). `PlayerHandleSwitchInAnim` -> `SwitchIn_HandleSoundAndEnd` waits for the
 * send-in cry (!IsCryPlayingOrClearCrySongs), and the next printstring ("... was dragged out!") follows the controller end directly,
 * so the command lasts
 *   shift + max(SLIDE_TO_MESSAGE_FLOOR 91, cryFrames(species) + 66)
 * with the healthbox slide at 65 + shift (shift 1 = CASTFORM only on the player side; SPINDA's opponent-side +1 does not apply).
 * Direct-mGBA Scene OFF sweep of the 339 stageable Factory species with the player as the Roar target, twice fresh
 * (tools/integration/fixtures/offs152/species-sweep-player-target-off.txt): slide 339 / 339, message 339 / 339 with the source-derived
 * cry (src/data/sendInTailOff.ts). A VOLUNTARY player switch keeps the calibrated 66 / 91 + 11 (its next print is the opponent's move,
 * after the move-load hold; ISSUES #78). Scene ON's forced player send-in is `sceneOnPlayerForcedSwitchInDuration` below.
 */
export const SCENE_OFF_PLAYER_FORCED_SEND_IN_SLIDE = 65;
export const SCENE_OFF_PLAYER_FORCED_SEND_IN_FLOOR = 91;
export const SCENE_OFF_PLAYER_FORCED_SEND_IN_CRY_TO_MESSAGE = 66;

/** Scene OFF forced player send-in: CASTFORM's whole send-in runs one frame late (sweep: y2 start, slide and message +1). */
function sceneOffPlayerForcedSwitchInShift(species: number): number {
  return species === SEND_IN_TAIL_CASTFORM ? 1 : 0;
}

/**
 * Scene OFF forced player send-in: frames the send-in visuals run late against the renderer's player cadence (calibrated on the
 * voluntary switch: ball from elapsed 3). The forced send-in's ball, emerge, fade and particles run ONE FRAME EARLIER than that
 * cadence (dense Scene OFF windows aligned on the offs152-proven removal row: the ROM ball shows at elapsed 2), so -1 (+ CASTFORM's 1).
 */
export function sceneOffPlayerForcedSwitchInVisualDelay(species: number): number {
  return sceneOffPlayerForcedSwitchInShift(species) - 1;
}

/** Scene OFF forced player send-in: the `switch-in` elapsed of the healthbox slide's first frame. */
export function sceneOffPlayerForcedSwitchInHealthboxSlideElapsed(species: number): number {
  return SCENE_OFF_PLAYER_FORCED_SEND_IN_SLIDE + sceneOffPlayerForcedSwitchInShift(species);
}

/** Scene OFF forced player send-in: the `switch-in` command's whole duration (= the "dragged out!" print's first frame). */
export function sceneOffPlayerForcedSwitchInDuration(species: number): number {
  return sceneOffPlayerForcedSwitchInShift(species) + Math.max(
    SCENE_OFF_PLAYER_FORCED_SEND_IN_FLOOR,
    (SEND_IN_TAIL_OFF_CRY_FRAMES[species] ?? 0) + SCENE_OFF_PLAYER_FORCED_SEND_IN_CRY_TO_MESSAGE,
  );
}

/**
 * snd182 (ISSUES #146; docs/snd179-scene-on-forced-player-send-in.md, docs/snd182-scene-on-forced-player-send-in-live.md): the Scene ON
 * PLAYER send-in after a FORCED switch. `SwitchIn_CleanShinyAnimShowSubstitute` waits for the back animation (Scene ON runs it;
 * HITMARKER_NO_ANIMATIONS makes it a no-op in Scene OFF), `SwitchIn_HandleSoundAndEnd` for the cry, and the next printstring follows:
 *   shift + max(91, cryFrames(species) + 66, T_back(species, nature) + 70)
 * T_back = the first tick the species' back-animation reducer (selectBackSendOutAnimation -> BACK_SEND_OUT_REDUCERS) reports WaitAnimEnd.
 * The attacker's Roar cry does not matter (it ends before the send-in starts). 339 / 339 sweep rows, 27 fresh ROM probes (snd179).
 */
export const SCENE_ON_PLAYER_FORCED_SEND_IN_BACK_ANIM_TO_MESSAGE = 70;

const BACK_ANIM_WAIT_TICK_LIMIT = 400;
const SPECIES_NAME_BY_ID: ReadonlyMap<number, string> = new Map(
  (speciesStatsData as { species: { id: number; name: string }[] }).species.map((row) => [row.id, row.name.replace(/^SPECIES_/, "")]),
);
const backAnimWaitTickCache = new Map<number, number | null>();

/** First back-animation tick at which the reducer's callback is WaitAnimEnd (null: the species has no back-animation reducer). */
export function backAnimWaitTick(species: number, natureId: number): number | null {
  const key = species * 32 + natureId;
  const cached = backAnimWaitTickCache.get(key);
  if (cached !== undefined) return cached;
  let found: number | null = null;
  const name = SPECIES_NAME_BY_ID.get(species);
  const selection = name === undefined ? null : selectBackSendOutAnimation(name, natureId);
  const reducer = selection === null ? undefined : BACK_SEND_OUT_REDUCERS[selection.backAnimSet];
  if (name !== undefined && reducer !== undefined) {
    for (let tick = 0; tick < BACK_ANIM_WAIT_TICK_LIMIT; tick += 1) {
      const result = reducer(name, natureId, tick) as { callback?: string } | null;
      if (result === null) break;
      if (result.callback === "WaitAnimEnd") { found = tick; break; }
    }
  }
  backAnimWaitTickCache.set(key, found);
  return found;
}

/** The sent-in mon's nature (`GetNature`: personality % 25). */
export function sendInNature(personality: number): number {
  return natureFromPersonality(personality >>> 0);
}

/** Scene ON forced player send-in: the `switch-in` command's whole duration (= the "dragged out!" print's first frame). */
export function sceneOnPlayerForcedSwitchInDuration(species: number, personality: number): number {
  const back = backAnimWaitTick(species, sendInNature(personality));
  return sceneOffPlayerForcedSwitchInShift(species) + Math.max(
    SCENE_OFF_PLAYER_FORCED_SEND_IN_FLOOR,
    (SEND_IN_TAIL_OFF_CRY_FRAMES[species] ?? 0) + SCENE_OFF_PLAYER_FORCED_SEND_IN_CRY_TO_MESSAGE,
    back === null ? 0 : back + SCENE_ON_PLAYER_FORCED_SEND_IN_BACK_ANIM_TO_MESSAGE,
  );
}

/**
 * pfr192 (ISSUES #146 remainder; docs/pfr185-player-faint-replacement-send-in.md, docs/pfr192-player-faint-replacement-production.md):
 * the PLAYER faint-replacement send-in, counted from the SEND OUT confirm. The ROM chain is the forced-player one: the ball spawns at
 * B = 91 + length(nickname), the controller idles at B + D - 2, the next print is at B + D + 10 (CASTFORM + 11) and the action prompt
 * at B + D + 17, with D the forced duration above (`sceneOn` picks Scene ON's back-animation bound).  The healthbox slide is ball-relative
 * (B + 65, CASTFORM + 1) in both scenes.  `followingFrames` = the turn-end + next-command-handoff frames production runs after the span
 * (they sit inside the ROM's B + D + 17), so the span ends that much earlier.
 */
export function playerFaintReplacementSendOutTiming(input: Readonly<{
  species: number; nameLength: number; personality: number; sceneOn: boolean; followingFrames: number; goTextChars: number;
}>): PartySendOutTiming {
  const ball = 91 + input.nameLength;
  const duration = input.sceneOn
    ? sceneOnPlayerForcedSwitchInDuration(input.species, input.personality)
    : sceneOffPlayerForcedSwitchInDuration(input.species);
  const prompt = ball + duration + 17;
  return Object.freeze({
    ballShift: ball - MAGBY_SEND_IN_BALL_SPAWN,
    releaseExtra: sceneOffPlayerForcedSwitchInHealthboxSlideElapsed(input.species) - SCENE_OFF_PLAYER_FORCED_SEND_IN_SLIDE,
    readyAt: prompt - input.followingFrames,
    blankStart: prompt - (PARTY_SENDOUT_ACTION_MENU_START - PARTY_SENDOUT_BLANK_MESSAGE_START),
    goTextChars: input.goTextChars,
  });
}
const MAGBY_SEND_IN_BALL_SPAWN = 96;
