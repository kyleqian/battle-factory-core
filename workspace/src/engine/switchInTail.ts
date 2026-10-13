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
import { SEND_IN_TAIL_CASTFORM, sendInTail } from "../data/sendInTail.ts";
import { SEND_IN_TAIL_OFF_CRY_FRAMES } from "../data/sendInTailOff.ts";

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
