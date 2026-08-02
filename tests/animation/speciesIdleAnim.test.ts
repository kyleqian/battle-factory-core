import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import probe from "../../src/data/gen/onix-front-idle-probe.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import {
  bounceRotateToSidesFrameAtTick,
  bounceRotateToSidesSmallFrameAtTick,
  bounceRotateToSidesSmallSlowFrameAtTick,
  bounceRotateToSidesSlowFrameAtTick,
  BOUNCE_ROTATE_TO_SIDES_DATA,
  BOUNCE_ROTATE_TO_SIDES_FACTORY_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_OUTSIDE_FACTORY_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_SMALL_FACTORY_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_SMALL_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_SMALL_OUTSIDE_FACTORY_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW_FACTORY_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_SLOW_FACTORY_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_SLOW_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_VARIANTS,
  circleIntoBackgroundFrameAtTick,
  CIRCLE_INTO_BG_FACTORY_FRONT_SPECIES,
  CIRCLE_INTO_BG_FRONT_SPECIES,
  CIRCLE_INTO_BG_OUTSIDE_FACTORY_FRONT_SPECIES,
  fourPetalFrameAtTick,
  FOUR_PETAL_FACTORY_FRONT_SPECIES,
  FOUR_PETAL_FRONT_SPECIES,
  FOUR_PETAL_OUTSIDE_FACTORY_FRONT_SPECIES,
  circularStretchTwiceFrameAtTick,
  CIRCULAR_STRETCH_TWICE_FACTORY_FRONT_SPECIES,
  CIRCULAR_STRETCH_TWICE_FRONT_SPECIES,
  CIRCULAR_STRETCH_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES,
  shrinkGrowFrameAtTick,
  SHRINK_GROW_FACTORY_FRONT_SPECIES,
  SHRINK_GROW_FRONT_SPECIES,
  SHRINK_GROW_INITIALIZERS,
  SHRINK_GROW_OUTSIDE_FACTORY_FRONT_SPECIES,
  swingConvexFrameAtTick,
  SWING_CONVEX_FACTORY_FRONT_SPECIES,
  SWING_CONVEX_FRONT_SPECIES,
  SWING_CONVEX_INITIALIZERS,
  SWING_CONVEX_OUTSIDE_FACTORY_FRONT_SPECIES,
  growVibrateFrameAtTick,
  GROW_VIBRATE_FACTORY_FRONT_SPECIES,
  GROW_VIBRATE_FRONT_SPECIES,
  GROW_VIBRATE_OUTSIDE_FACTORY_FRONT_SPECIES,
  flashYellowFrameAtTick,
  FLASH_YELLOW_FACTORY_FRONT_SPECIES,
  FLASH_YELLOW_FRONT_SPECIES,
  FLASH_YELLOW_OUTSIDE_FACTORY_FRONT_SPECIES,
  flickerIncreasingFrameAtTick,
  FLICKER_INCREASING_FACTORY_FRONT_SPECIES,
  FLICKER_INCREASING_FRONT_SPECIES,
  FLICKER_INCREASING_OUTSIDE_FACTORY_FRONT_SPECIES,
  growInStagesFrameAtTick,
  GROW_IN_STAGES_FACTORY_FRONT_SPECIES,
  GROW_IN_STAGES_FRONT_SPECIES,
  GROW_IN_STAGES_OUTSIDE_FACTORY_FRONT_SPECIES,
  lungeGrowFrameAtTick,
  LUNGE_GROW_FACTORY_FRONT_SPECIES,
  LUNGE_GROW_FRONT_SPECIES,
  LUNGE_GROW_OUTSIDE_FACTORY_FRONT_SPECIES,
  ADD_NEW_ANIM_DEFAULTS,
  horizontalJumpsFrameAtTick,
  H_JUMPS_FACTORY_FRONT_SPECIES,
  H_JUMPS_FRONT_SPECIES,
  H_JUMPS_OUTSIDE_FACTORY_FRONT_SPECIES,
  horizontalVibrateFrameAtTick,
  horizontalStretchFrameAtTick,
  HORIZONTAL_STRETCH_VARIANTS,
  H_STRETCH_FACTORY_FRONT_SPECIES,
  H_STRETCH_FRONT_SPECIES,
  H_STRETCH_OUTSIDE_FACTORY_FRONT_SPECIES,
  HORIZONTAL_VIBRATE_VARIANTS,
  H_VIBRATE_FACTORY_FRONT_SPECIES,
  H_VIBRATE_FRONT_SPECIES,
  H_VIBRATE_OUTSIDE_FACTORY_FRONT_SPECIES,
  horizontalSlideSlowFrameAtTick,
  HORIZONTAL_SLIDE_INITIALIZERS,
  H_SLIDE_SLOW_FACTORY_FRONT_SPECIES,
  H_SLIDE_SLOW_FRONT_SPECIES,
  H_SLIDE_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES,
  horizontalSlideWobbleFrameAtTick,
  H_SLIDE_WOBBLE_FACTORY_FRONT_SPECIES,
  H_SLIDE_WOBBLE_FRONT_SPECIES,
  H_SLIDE_WOBBLE_OUTSIDE_FACTORY_FRONT_SPECIES,
  horizontalJumpsVerticalStretchFrameAtTick,
  horizontalJumpsVerticalStretchTwiceFrameAtTick,
  H_JUMPS_V_STRETCH_FACTORY_FRONT_SPECIES,
  H_JUMPS_V_STRETCH_FRONT_SPECIES,
  H_JUMPS_V_STRETCH_OUTSIDE_FACTORY_FRONT_SPECIES,
  H_JUMPS_V_STRETCH_TWICE_FACTORY_FRONT_SPECIES,
  H_JUMPS_V_STRETCH_TWICE_FRONT_SPECIES,
  H_JUMPS_V_STRETCH_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES,
  horizontalShakeFrameAtTick,
  horizontalShakeSlowFrameAtTick,
  HORIZONTAL_SHAKE_INITIALIZERS,
  H_SHAKE_FACTORY_FRONT_SPECIES,
  H_SHAKE_FRONT_SPECIES,
  H_SHAKE_OUTSIDE_FACTORY_FRONT_SPECIES,
  H_SHAKE_SLOW_FACTORY_FRONT_SPECIES,
  H_SHAKE_SLOW_FRONT_SPECIES,
  H_SHAKE_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES,
  rapidHorizontalHopsOffsetAtTick,
  rotateUpToSidesFrameAtTick,
  ROTATE_UP_TO_SIDES_FACTORY_FRONT_SPECIES,
  ROTATE_UP_TO_SIDES_FRONT_SPECIES,
  ROTATE_UP_TO_SIDES_OUTSIDE_FACTORY_FRONT_SPECIES,
  speciesFrontIdleRestOffset,
  swingConcaveFrameAtTick,
  SWING_CONCAVE_FACTORY_FRONT_SPECIES,
  SWING_CONCAVE_FRONT_SPECIES,
  SWING_CONCAVE_OUTSIDE_FACTORY_FRONT_SPECIES,
  verticalSlideFrameAtTick,
  verticalSlideSlowFrameAtTick,
  verticalSlideWobbleFrameAtTick,
  verticalJumpsSmallFrameAtTick,
  verticalJumpsBigFrameAtTick,
  verticalShakeFrameAtTick,
  verticalShakeTwiceFrameAtTick,
  verticalSquishBounceFrameAtTick,
  verticalSquishBounceSlowFrameAtTick,
  verticalStretchFrameAtTick,
  V_SQUISH_AND_BOUNCE_FRONT_SPECIES,
  V_SQUISH_AND_BOUNCE_SLOW_FRONT_SPECIES,
  V_SHAKE_FACTORY_FRONT_SPECIES,
  V_SHAKE_FRONT_SPECIES,
  V_SHAKE_OUTSIDE_FACTORY_FRONT_SPECIES,
  V_SHAKE_TWICE_FACTORY_FRONT_SPECIES,
  V_SHAKE_TWICE_FRONT_SPECIES,
  V_SHAKE_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES,
  V_JUMPS_SMALL_FACTORY_FRONT_SPECIES,
  V_JUMPS_SMALL_FRONT_SPECIES,
  V_JUMPS_SMALL_OUTSIDE_FACTORY_FRONT_SPECIES,
  V_JUMPS_BIG_FACTORY_FRONT_SPECIES,
  V_JUMPS_BIG_FRONT_SPECIES,
  V_JUMPS_BIG_OUTSIDE_FACTORY_FRONT_SPECIES,
  verticalJumpsHorizontalJumpsFrameAtTick,
  V_JUMPS_H_JUMPS_FACTORY_FRONT_SPECIES,
  V_JUMPS_H_JUMPS_FRONT_SPECIES,
  V_JUMPS_H_JUMPS_OUTSIDE_FACTORY_FRONT_SPECIES,
  V_SLIDE_FACTORY_FRONT_SPECIES,
  V_SLIDE_FRONT_SPECIES,
  V_SLIDE_OUTSIDE_FACTORY_FRONT_SPECIES,
  V_SLIDE_SLOW_FACTORY_FRONT_SPECIES,
  V_SLIDE_SLOW_FRONT_SPECIES,
  V_SLIDE_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES,
  V_SLIDE_WOBBLE_FACTORY_FRONT_SPECIES,
  V_SLIDE_WOBBLE_FRONT_SPECIES,
  V_SLIDE_WOBBLE_OUTSIDE_FACTORY_FRONT_SPECIES,
  V_STRETCH_FRONT_SPECIES,
  TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES,
  VERTICAL_SHAKE_TWICE_DATA,
  VERTICAL_SHAKE_TWICE_INITIALIZERS,
  VERTICAL_SLIDE_WOBBLE_INITIALIZERS,
  VERTICAL_SLIDE_INITIALIZERS,
  YELLOW_FLASH_DATA,
  zigzagSlowFrameAtTick,
  ZIGZAG_DATA,
  ZIGZAG_SLOW_FACTORY_FRONT_SPECIES,
  ZIGZAG_SLOW_FRONT_SPECIES,
  ZIGZAG_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES,
} from "../../src/animation/speciesIdleAnim.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import bayleefRunA from "../../tools/compare/fixtures/sendout-front-bayleef-run-a.json" with { type: "json" };
import bayleefRunB from "../../tools/compare/fixtures/sendout-front-bayleef-run-b.json" with { type: "json" };
import magbyRunA from "../../tools/compare/fixtures/sendout-front-magby-run-a.json" with { type: "json" };
import magbyRunB from "../../tools/compare/fixtures/sendout-front-magby-run-b.json" with { type: "json" };
import quilavaRunA from "../../tools/compare/fixtures/sendout-front-quilava-run-a.json" with { type: "json" };
import quilavaRunB from "../../tools/compare/fixtures/sendout-front-quilava-run-b.json" with { type: "json" };
import houndourRunA from "../../tools/compare/fixtures/sendout-front-houndour-run-a.json" with { type: "json" };
import houndourRunB from "../../tools/compare/fixtures/sendout-front-houndour-run-b.json" with { type: "json" };
import machokeRunA from "../../tools/compare/fixtures/sendout-front-machoke-run-a.json" with { type: "json" };
import machokeRunB from "../../tools/compare/fixtures/sendout-front-machoke-run-b.json" with { type: "json" };
import rhyhornRunA from "../../tools/compare/fixtures/sendout-front-rhyhorn-run-a.json" with { type: "json" };
import rhyhornRunB from "../../tools/compare/fixtures/sendout-front-rhyhorn-run-b.json" with { type: "json" };
import lickitungRunA from "../../tools/compare/fixtures/sendout-front-lickitung-run-a.json" with { type: "json" };
import lickitungRunB from "../../tools/compare/fixtures/sendout-front-lickitung-run-b.json" with { type: "json" };
import miltankRunA from "../../tools/compare/fixtures/sendout-front-miltank-run-a.json" with { type: "json" };
import miltankRunB from "../../tools/compare/fixtures/sendout-front-miltank-run-b.json" with { type: "json" };
import kabutopsRunA from "../../tools/compare/fixtures/sendout-front-kabutops-run-a.json" with { type: "json" };
import kabutopsRunB from "../../tools/compare/fixtures/sendout-front-kabutops-run-b.json" with { type: "json" };
import blazikenRunA from "../../tools/compare/fixtures/sendout-front-blaziken-run-a.json" with { type: "json" };
import blazikenRunB from "../../tools/compare/fixtures/sendout-front-blaziken-run-b.json" with { type: "json" };
import kadabraRunA from "../../tools/compare/fixtures/sendout-front-kadabra-run-a.json" with { type: "json" };
import kadabraRunB from "../../tools/compare/fixtures/sendout-front-kadabra-run-b.json" with { type: "json" };
import registeelRunA from "../../tools/compare/fixtures/sendout-front-registeel-run-a.json" with { type: "json" };
import registeelRunB from "../../tools/compare/fixtures/sendout-front-registeel-run-b.json" with { type: "json" };
import squirtleRunA from "../../tools/compare/fixtures/sendout-front-squirtle-run-a.json" with { type: "json" };
import squirtleRunB from "../../tools/compare/fixtures/sendout-front-squirtle-run-b.json" with { type: "json" };
import shuckleRunA from "../../tools/compare/fixtures/sendout-front-shuckle-run-a.json" with { type: "json" };
import shuckleRunB from "../../tools/compare/fixtures/sendout-front-shuckle-run-b.json" with { type: "json" };
import seadraScenario from "../../tools/compare/fixtures/sendout-front-seadra.json" with { type: "json" };
import seadraRunA from "../../tools/compare/fixtures/sendout-front-seadra-run-a.json" with { type: "json" };
import seadraRunB from "../../tools/compare/fixtures/sendout-front-seadra-run-b.json" with { type: "json" };
import marshtompScenario from "../../tools/compare/fixtures/sendout-front-marshtomp.json" with { type: "json" };
import marshtompRunA from "../../tools/compare/fixtures/sendout-front-marshtomp-run-a.json" with { type: "json" };
import marshtompRunB from "../../tools/compare/fixtures/sendout-front-marshtomp-run-b.json" with { type: "json" };
import charmanderScenario from "../../tools/compare/fixtures/sendout-front-charmander.json" with { type: "json" };
import charmanderRunA from "../../tools/compare/fixtures/sendout-front-charmander-run-a.json" with { type: "json" };
import charmanderRunB from "../../tools/compare/fixtures/sendout-front-charmander-run-b.json" with { type: "json" };
import delibirdScenario from "../../tools/compare/fixtures/sendout-front-delibird.json" with { type: "json" };
import delibirdRunA from "../../tools/compare/fixtures/sendout-front-delibird-run-a.json" with { type: "json" };
import delibirdRunB from "../../tools/compare/fixtures/sendout-front-delibird-run-b.json" with { type: "json" };
import mankeyScenario from "../../tools/compare/fixtures/sendout-front-mankey.json" with { type: "json" };
import mankeyRunA from "../../tools/compare/fixtures/sendout-front-mankey-run-a.json" with { type: "json" };
import mankeyRunB from "../../tools/compare/fixtures/sendout-front-mankey-run-b.json" with { type: "json" };
import wynautScenario from "../../tools/compare/fixtures/sendout-front-wynaut.json" with { type: "json" };
import wynautRunA from "../../tools/compare/fixtures/sendout-front-wynaut-run-a.json" with { type: "json" };
import wynautRunB from "../../tools/compare/fixtures/sendout-front-wynaut-run-b.json" with { type: "json" };
import vileplumeScenario from "../../tools/compare/fixtures/sendout-front-vileplume.json" with { type: "json" };
import vileplumeRunA from "../../tools/compare/fixtures/sendout-front-vileplume-run-a.json" with { type: "json" };
import vileplumeRunB from "../../tools/compare/fixtures/sendout-front-vileplume-run-b.json" with { type: "json" };
import loudredScenario from "../../tools/compare/fixtures/sendout-front-loudred.json" with { type: "json" };
import loudredRunA from "../../tools/compare/fixtures/sendout-front-loudred-run-a.json" with { type: "json" };
import loudredRunB from "../../tools/compare/fixtures/sendout-front-loudred-run-b.json" with { type: "json" };
import jigglypuffScenario from "../../tools/compare/fixtures/sendout-front-jigglypuff.json" with { type: "json" };
import jigglypuffRunA from "../../tools/compare/fixtures/sendout-front-jigglypuff-run-a.json" with { type: "json" };
import jigglypuffRunB from "../../tools/compare/fixtures/sendout-front-jigglypuff-run-b.json" with { type: "json" };
import gyaradosScenario from "../../tools/compare/fixtures/sendout-front-gyarados.json" with { type: "json" };
import gyaradosRunA from "../../tools/compare/fixtures/sendout-front-gyarados-run-a.json" with { type: "json" };
import gyaradosRunB from "../../tools/compare/fixtures/sendout-front-gyarados-run-b.json" with { type: "json" };
import blastoiseScenario from "../../tools/compare/fixtures/sendout-front-blastoise.json" with { type: "json" };
import blastoiseRunA from "../../tools/compare/fixtures/sendout-front-blastoise-run-a.json" with { type: "json" };
import blastoiseRunB from "../../tools/compare/fixtures/sendout-front-blastoise-run-b.json" with { type: "json" };
import bagonScenario from "../../tools/compare/fixtures/sendout-front-bagon.json" with { type: "json" };
import bagonRunA from "../../tools/compare/fixtures/sendout-front-bagon-run-a.json" with { type: "json" };
import bagonRunB from "../../tools/compare/fixtures/sendout-front-bagon-run-b.json" with { type: "json" };
import seakingScenario from "../../tools/compare/fixtures/sendout-front-seaking.json" with { type: "json" };
import seakingRunA from "../../tools/compare/fixtures/sendout-front-seaking-run-a.json" with { type: "json" };
import seakingRunB from "../../tools/compare/fixtures/sendout-front-seaking-run-b.json" with { type: "json" };
import shuppetScenario from "../../tools/compare/fixtures/sendout-front-shuppet.json" with { type: "json" };
import shuppetRunA from "../../tools/compare/fixtures/sendout-front-shuppet-run-a.json" with { type: "json" };
import shuppetRunB from "../../tools/compare/fixtures/sendout-front-shuppet-run-b.json" with { type: "json" };
import butterfreeScenario from "../../tools/compare/fixtures/sendout-front-butterfree.json" with { type: "json" };
import butterfreeRunA from "../../tools/compare/fixtures/sendout-front-butterfree-run-a.json" with { type: "json" };
import butterfreeRunB from "../../tools/compare/fixtures/sendout-front-butterfree-run-b.json" with { type: "json" };
import chimechoScenario from "../../tools/compare/fixtures/sendout-front-chimecho.json" with { type: "json" };
import chimechoRunA from "../../tools/compare/fixtures/sendout-front-chimecho-run-a.json" with { type: "json" };
import chimechoRunB from "../../tools/compare/fixtures/sendout-front-chimecho-run-b.json" with { type: "json" };
import wigglytuffScenario from "../../tools/compare/fixtures/sendout-front-wigglytuff.json" with { type: "json" };
import wigglytuffRunA from "../../tools/compare/fixtures/sendout-front-wigglytuff-run-a.json" with { type: "json" };
import wigglytuffRunB from "../../tools/compare/fixtures/sendout-front-wigglytuff-run-b.json" with { type: "json" };
import vigorothScenario from "../../tools/compare/fixtures/sendout-front-vigoroth.json" with { type: "json" };
import vigorothRunA from "../../tools/compare/fixtures/sendout-front-vigoroth-run-a.json" with { type: "json" };
import vigorothRunB from "../../tools/compare/fixtures/sendout-front-vigoroth-run-b.json" with { type: "json" };
import beedrillScenario from "../../tools/compare/fixtures/sendout-front-beedrill.json" with { type: "json" };
import beedrillRunA from "../../tools/compare/fixtures/sendout-front-beedrill-run-a.json" with { type: "json" };
import beedrillRunB from "../../tools/compare/fixtures/sendout-front-beedrill-run-b.json" with { type: "json" };
import dusclopsScenario from "../../tools/compare/fixtures/sendout-front-dusclops.json" with { type: "json" };
import dusclopsRunA from "../../tools/compare/fixtures/sendout-front-dusclops-run-a.json" with { type: "json" };
import dusclopsRunB from "../../tools/compare/fixtures/sendout-front-dusclops-run-b.json" with { type: "json" };
import ekansScenario from "../../tools/compare/fixtures/sendout-front-ekans.json" with { type: "json" };
import ekansRunA from "../../tools/compare/fixtures/sendout-front-ekans-run-a.json" with { type: "json" };
import ekansRunB from "../../tools/compare/fixtures/sendout-front-ekans-run-b.json" with { type: "json" };
import altariaScenario from "../../tools/compare/fixtures/sendout-front-altaria.json" with { type: "json" };
import altariaRunA from "../../tools/compare/fixtures/sendout-front-altaria-run-a.json" with { type: "json" };
import altariaRunB from "../../tools/compare/fixtures/sendout-front-altaria-run-b.json" with { type: "json" };
import pikachuScenario from "../../tools/compare/fixtures/sendout-front-pikachu.json" with { type: "json" };
import pikachuRunA from "../../tools/compare/fixtures/sendout-front-pikachu-run-a.json" with { type: "json" };
import pikachuRunB from "../../tools/compare/fixtures/sendout-front-pikachu-run-b.json" with { type: "json" };
import raikouScenario from "../../tools/compare/fixtures/sendout-front-raikou.json" with { type: "json" };
import raikouRunA from "../../tools/compare/fixtures/sendout-front-raikou-run-a.json" with { type: "json" };
import raikouRunB from "../../tools/compare/fixtures/sendout-front-raikou-run-b.json" with { type: "json" };
import weedleScenario from "../../tools/compare/fixtures/sendout-front-weedle.json" with { type: "json" };
import weedleRunA from "../../tools/compare/fixtures/sendout-front-weedle-run-a.json" with { type: "json" };
import weedleRunB from "../../tools/compare/fixtures/sendout-front-weedle-run-b.json" with { type: "json" };
import ninjaskScenario from "../../tools/compare/fixtures/sendout-front-ninjask.json" with { type: "json" };
import ninjaskRunA from "../../tools/compare/fixtures/sendout-front-ninjask-run-a.json" with { type: "json" };
import ninjaskRunB from "../../tools/compare/fixtures/sendout-front-ninjask-run-b.json" with { type: "json" };
import dittoScenario from "../../tools/compare/fixtures/sendout-front-ditto.json" with { type: "json" };
import dittoRunA from "../../tools/compare/fixtures/sendout-front-ditto-run-a.json" with { type: "json" };
import dittoRunB from "../../tools/compare/fixtures/sendout-front-ditto-run-b.json" with { type: "json" };
import regirockScenario from "../../tools/compare/fixtures/sendout-front-regirock.json" with { type: "json" };
import regirockRunA from "../../tools/compare/fixtures/sendout-front-regirock-run-a.json" with { type: "json" };
import regirockRunB from "../../tools/compare/fixtures/sendout-front-regirock-run-b.json" with { type: "json" };
import wartortleScenario from "../../tools/compare/fixtures/sendout-front-wartortle.json" with { type: "json" };
import wartortleRunA from "../../tools/compare/fixtures/sendout-front-wartortle-run-a.json" with { type: "json" };
import wartortleRunB from "../../tools/compare/fixtures/sendout-front-wartortle-run-b.json" with { type: "json" };
import gligarScenario from "../../tools/compare/fixtures/sendout-front-gligar.json" with { type: "json" };
import gligarRunA from "../../tools/compare/fixtures/sendout-front-gligar-run-a.json" with { type: "json" };
import gligarRunB from "../../tools/compare/fixtures/sendout-front-gligar-run-b.json" with { type: "json" };
import weepinbellScenario from "../../tools/compare/fixtures/sendout-front-weepinbell.json" with { type: "json" };
import weepinbellRunA from "../../tools/compare/fixtures/sendout-front-weepinbell-run-a.json" with { type: "json" };
import weepinbellRunB from "../../tools/compare/fixtures/sendout-front-weepinbell-run-b.json" with { type: "json" };
import banetteScenario from "../../tools/compare/fixtures/sendout-front-banette.json" with { type: "json" };
import banetteRunA from "../../tools/compare/fixtures/sendout-front-banette-run-a.json" with { type: "json" };
import banetteRunB from "../../tools/compare/fixtures/sendout-front-banette-run-b.json" with { type: "json" };
import marowakScenario from "../../tools/compare/fixtures/sendout-front-marowak.json" with { type: "json" };
import marowakRunA from "../../tools/compare/fixtures/sendout-front-marowak-run-a.json" with { type: "json" };
import marowakRunB from "../../tools/compare/fixtures/sendout-front-marowak-run-b.json" with { type: "json" };
import illumiseScenario from "../../tools/compare/fixtures/sendout-front-illumise.json" with { type: "json" };
import illumiseRunA from "../../tools/compare/fixtures/sendout-front-illumise-run-a.json" with { type: "json" };
import illumiseRunB from "../../tools/compare/fixtures/sendout-front-illumise-run-b.json" with { type: "json" };
import bulbasaurScenario from "../../tools/compare/fixtures/sendout-front-bulbasaur.json" with { type: "json" };
import bulbasaurRunA from "../../tools/compare/fixtures/sendout-front-bulbasaur-run-a.json" with { type: "json" };
import bulbasaurRunB from "../../tools/compare/fixtures/sendout-front-bulbasaur-run-b.json" with { type: "json" };
import dustoxScenario from "../../tools/compare/fixtures/sendout-front-dustox.json" with { type: "json" };
import dustoxRunA from "../../tools/compare/fixtures/sendout-front-dustox-run-a.json" with { type: "json" };
import dustoxRunB from "../../tools/compare/fixtures/sendout-front-dustox-run-b.json" with { type: "json" };
import pichuScenario from "../../tools/compare/fixtures/sendout-front-pichu.json" with { type: "json" };
import pichuRunA from "../../tools/compare/fixtures/sendout-front-pichu-run-a.json" with { type: "json" };
import pichuRunB from "../../tools/compare/fixtures/sendout-front-pichu-run-b.json" with { type: "json" };
import taillowScenario from "../../tools/compare/fixtures/sendout-front-taillow.json" with { type: "json" };
import taillowRunA from "../../tools/compare/fixtures/sendout-front-taillow-run-a.json" with { type: "json" };
import taillowRunB from "../../tools/compare/fixtures/sendout-front-taillow-run-b.json" with { type: "json" };
import sharpedoScenario from "../../tools/compare/fixtures/sendout-front-sharpedo.json" with { type: "json" };
import sharpedoRunA from "../../tools/compare/fixtures/sendout-front-sharpedo-run-a.json" with { type: "json" };
import sharpedoRunB from "../../tools/compare/fixtures/sendout-front-sharpedo-run-b.json" with { type: "json" };
import spoinkScenario from "../../tools/compare/fixtures/sendout-front-spoink.json" with { type: "json" };
import spoinkRunA from "../../tools/compare/fixtures/sendout-front-spoink-run-a.json" with { type: "json" };
import spoinkRunB from "../../tools/compare/fixtures/sendout-front-spoink-run-b.json" with { type: "json" };
import hariyamaScenario from "../../tools/compare/fixtures/sendout-front-hariyama.json" with { type: "json" };
import hariyamaRunA from "../../tools/compare/fixtures/sendout-front-hariyama-run-a.json" with { type: "json" };
import hariyamaRunB from "../../tools/compare/fixtures/sendout-front-hariyama-run-b.json" with { type: "json" };
import haunterScenario from "../../tools/compare/fixtures/sendout-front-haunter.json" with { type: "json" };
import haunterRunA from "../../tools/compare/fixtures/sendout-front-haunter-run-a.json" with { type: "json" };
import haunterRunB from "../../tools/compare/fixtures/sendout-front-haunter-run-b.json" with { type: "json" };
import kecleonScenario from "../../tools/compare/fixtures/sendout-front-kecleon.json" with { type: "json" };
import kecleonRunA from "../../tools/compare/fixtures/sendout-front-kecleon-run-a.json" with { type: "json" };
import kecleonRunB from "../../tools/compare/fixtures/sendout-front-kecleon-run-b.json" with { type: "json" };
import gengarScenario from "../../tools/compare/fixtures/sendout-front-gengar.json" with { type: "json" };
import gengarRunA from "../../tools/compare/fixtures/sendout-front-gengar-run-a.json" with { type: "json" };
import gengarRunB from "../../tools/compare/fixtures/sendout-front-gengar-run-b.json" with { type: "json" };
import lugiaScenario from "../../tools/compare/fixtures/sendout-front-lugia.json" with { type: "json" };
import lugiaRunA from "../../tools/compare/fixtures/sendout-front-lugia-run-a.json" with { type: "json" };
import lugiaRunB from "../../tools/compare/fixtures/sendout-front-lugia-run-b.json" with { type: "json" };
import dodrioScenario from "../../tools/compare/fixtures/sendout-front-dodrio.json" with { type: "json" };
import dodrioRunA from "../../tools/compare/fixtures/sendout-front-dodrio-run-a.json" with { type: "json" };
import dodrioRunB from "../../tools/compare/fixtures/sendout-front-dodrio-run-b.json" with { type: "json" };
import heracrossScenario from "../../tools/compare/fixtures/sendout-front-heracross.json" with { type: "json" };
import heracrossRunA from "../../tools/compare/fixtures/sendout-front-heracross-run-a.json" with { type: "json" };
import heracrossRunB from "../../tools/compare/fixtures/sendout-front-heracross-run-b.json" with { type: "json" };
import kingdraScenario from "../../tools/compare/fixtures/sendout-front-kingdra.json" with { type: "json" };
import kingdraRunA from "../../tools/compare/fixtures/sendout-front-kingdra-run-a.json" with { type: "json" };
import kingdraRunB from "../../tools/compare/fixtures/sendout-front-kingdra-run-b.json" with { type: "json" };
import regiceScenario from "../../tools/compare/fixtures/sendout-front-regice.json" with { type: "json" };
import regiceRunA from "../../tools/compare/fixtures/sendout-front-regice-run-a.json" with { type: "json" };
import regiceRunB from "../../tools/compare/fixtures/sendout-front-regice-run-b.json" with { type: "json" };
import pidgeyScenario from "../../tools/compare/fixtures/sendout-front-pidgey.json" with { type: "json" };
import pidgeyRunA from "../../tools/compare/fixtures/sendout-front-pidgey-run-a.json" with { type: "json" };
import pidgeyRunB from "../../tools/compare/fixtures/sendout-front-pidgey-run-b.json" with { type: "json" };
import ledianScenario from "../../tools/compare/fixtures/sendout-front-ledian.json" with { type: "json" };
import ledianRunA from "../../tools/compare/fixtures/sendout-front-ledian-run-a.json" with { type: "json" };
import ledianRunB from "../../tools/compare/fixtures/sendout-front-ledian-run-b.json" with { type: "json" };
import clefableScenario from "../../tools/compare/fixtures/sendout-front-clefable.json" with { type: "json" };
import clefableRunA from "../../tools/compare/fixtures/sendout-front-clefable-run-a.json" with { type: "json" };
import clefableRunB from "../../tools/compare/fixtures/sendout-front-clefable-run-b.json" with { type: "json" };
import azumarillScenario from "../../tools/compare/fixtures/sendout-front-azumarill.json" with { type: "json" };
import azumarillRunA from "../../tools/compare/fixtures/sendout-front-azumarill-run-a.json" with { type: "json" };
import azumarillRunB from "../../tools/compare/fixtures/sendout-front-azumarill-run-b.json" with { type: "json" };
import {
  KABUTO_FRONT_ANIM_START_OFFSET,
  kabutoHSlideWobble,
} from "../../src/engine/kabutoSendOut.ts";

const squirtleRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-squirtle-run-a.json", import.meta.url),
);
const squirtleRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-squirtle-run-b.json", import.meta.url),
);
const shuckleRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-shuckle-run-a.json", import.meta.url),
);
const shuckleRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-shuckle-run-b.json", import.meta.url),
);
const seadraRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-seadra-run-a.json", import.meta.url),
);
const seadraRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-seadra-run-b.json", import.meta.url),
);
const marshtompRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-marshtomp-run-a.json", import.meta.url),
);
const marshtompRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-marshtomp-run-b.json", import.meta.url),
);
const charmanderRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-charmander-run-a.json", import.meta.url),
);
const charmanderRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-charmander-run-b.json", import.meta.url),
);
const delibirdRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-delibird-run-a.json", import.meta.url),
);
const delibirdRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-delibird-run-b.json", import.meta.url),
);
const mankeyRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-mankey-run-a.json", import.meta.url),
);
const mankeyRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-mankey-run-b.json", import.meta.url),
);
const wynautRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-wynaut-run-a.json", import.meta.url),
);
const wynautRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-wynaut-run-b.json", import.meta.url),
);
const vileplumeRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-vileplume-run-a.json", import.meta.url),
);
const vileplumeRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-vileplume-run-b.json", import.meta.url),
);
const loudredRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-loudred-run-a.json", import.meta.url),
);
const loudredRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-loudred-run-b.json", import.meta.url),
);
const jigglypuffRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-jigglypuff-run-a.json", import.meta.url),
);
const jigglypuffRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-jigglypuff-run-b.json", import.meta.url),
);
const gyaradosRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-gyarados-run-a.json", import.meta.url),
);
const gyaradosRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-gyarados-run-b.json", import.meta.url),
);
const blastoiseRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-blastoise-run-a.json", import.meta.url),
);
const blastoiseRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-blastoise-run-b.json", import.meta.url),
);
const bagonRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-bagon-run-a.json", import.meta.url),
);
const bagonRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-bagon-run-b.json", import.meta.url),
);
const seakingRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-seaking-run-a.json", import.meta.url),
);
const seakingRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-seaking-run-b.json", import.meta.url),
);
const shuppetRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-shuppet-run-a.json", import.meta.url),
);
const shuppetRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-shuppet-run-b.json", import.meta.url),
);
const butterfreeRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-butterfree-run-a.json", import.meta.url),
);
const butterfreeRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-butterfree-run-b.json", import.meta.url),
);
const chimechoRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-chimecho-run-a.json", import.meta.url),
);
const chimechoRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-chimecho-run-b.json", import.meta.url),
);
const wigglytuffRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-wigglytuff-run-a.json", import.meta.url),
);
const wigglytuffRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-wigglytuff-run-b.json", import.meta.url),
);
const vigorothRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-vigoroth-run-a.json", import.meta.url),
);
const vigorothRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-vigoroth-run-b.json", import.meta.url),
);
const beedrillRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-beedrill-run-a.json", import.meta.url),
);
const beedrillRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-beedrill-run-b.json", import.meta.url),
);
const dusclopsRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-dusclops-run-a.json", import.meta.url),
);
const dusclopsRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-dusclops-run-b.json", import.meta.url),
);
const ekansRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-ekans-run-a.json", import.meta.url),
);
const ekansRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-ekans-run-b.json", import.meta.url),
);
const altariaRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-altaria-run-a.json", import.meta.url),
);
const altariaRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-altaria-run-b.json", import.meta.url),
);
const pikachuRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-pikachu-run-a.json", import.meta.url),
);
const pikachuRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-pikachu-run-b.json", import.meta.url),
);
const raikouRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-raikou-run-a.json", import.meta.url),
);
const raikouRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-raikou-run-b.json", import.meta.url),
);
const weedleRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-weedle-run-a.json", import.meta.url),
);
const weedleRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-weedle-run-b.json", import.meta.url),
);
const ninjaskRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-ninjask-run-a.json", import.meta.url),
);
const ninjaskRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-ninjask-run-b.json", import.meta.url),
);
const dittoRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-ditto-run-a.json", import.meta.url),
);
const dittoRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-ditto-run-b.json", import.meta.url),
);
const regirockRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-regirock-run-a.json", import.meta.url),
);
const regirockRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-regirock-run-b.json", import.meta.url),
);
const wartortleRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-wartortle-run-a.json", import.meta.url),
);
const wartortleRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-wartortle-run-b.json", import.meta.url),
);
const gligarRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-gligar-run-a.json", import.meta.url),
);
const gligarRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-gligar-run-b.json", import.meta.url),
);
const weepinbellRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-weepinbell-run-a.json", import.meta.url),
);
const weepinbellRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-weepinbell-run-b.json", import.meta.url),
);
const banetteRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-banette-run-a.json", import.meta.url),
);
const banetteRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-banette-run-b.json", import.meta.url),
);
const marowakRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-marowak-run-a.json", import.meta.url),
);
const marowakRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-marowak-run-b.json", import.meta.url),
);
const illumiseRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-illumise-run-a.json", import.meta.url),
);
const illumiseRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-illumise-run-b.json", import.meta.url),
);
const bulbasaurRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-bulbasaur-run-a.json", import.meta.url),
);
const bulbasaurRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-bulbasaur-run-b.json", import.meta.url),
);
const dustoxRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-dustox-run-a.json", import.meta.url),
);
const dustoxRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-dustox-run-b.json", import.meta.url),
);
const pichuRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-pichu-run-a.json", import.meta.url),
);
const pichuRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-pichu-run-b.json", import.meta.url),
);
const taillowRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-taillow-run-a.json", import.meta.url),
);
const taillowRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-taillow-run-b.json", import.meta.url),
);
const sharpedoRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-sharpedo-run-a.json", import.meta.url),
);
const sharpedoRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-sharpedo-run-b.json", import.meta.url),
);
const spoinkRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-spoink-run-a.json", import.meta.url),
);
const spoinkRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-spoink-run-b.json", import.meta.url),
);
const hariyamaRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-hariyama-run-a.json", import.meta.url),
);
const hariyamaRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-hariyama-run-b.json", import.meta.url),
);
const haunterRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-haunter-run-a.json", import.meta.url),
);
const haunterRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-haunter-run-b.json", import.meta.url),
);
const kecleonRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-kecleon-run-a.json", import.meta.url),
);
const kecleonRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-kecleon-run-b.json", import.meta.url),
);
const gengarRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-gengar-run-a.json", import.meta.url),
);
const gengarRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-gengar-run-b.json", import.meta.url),
);
const lugiaRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-lugia-run-a.json", import.meta.url),
);
const lugiaRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-lugia-run-b.json", import.meta.url),
);
const dodrioRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-dodrio-run-a.json", import.meta.url),
);
const dodrioRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-dodrio-run-b.json", import.meta.url),
);
const heracrossRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-heracross-run-a.json", import.meta.url),
);
const heracrossRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-heracross-run-b.json", import.meta.url),
);
const kingdraRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-kingdra-run-a.json", import.meta.url),
);
const kingdraRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-kingdra-run-b.json", import.meta.url),
);
const regiceRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-regice-run-a.json", import.meta.url),
);
const regiceRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-regice-run-b.json", import.meta.url),
);
const pidgeyRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-pidgey-run-a.json", import.meta.url),
);
const pidgeyRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-pidgey-run-b.json", import.meta.url),
);
const ledianRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-ledian-run-a.json", import.meta.url),
);
const ledianRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-ledian-run-b.json", import.meta.url),
);
const clefableRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-clefable-run-a.json", import.meta.url),
);
const clefableRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-clefable-run-b.json", import.meta.url),
);
const azumarillRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-azumarill-run-a.json", import.meta.url),
);
const azumarillRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-azumarill-run-b.json", import.meta.url),
);

describe("speciesIdleAnim", () => {
  describe("rapidHorizontalHopsOffsetAtTick (Anim_RapidHorizontalHops port)", () => {
    it("matches hand-derived source arithmetic at several ticks across all 4 phases", () => {
      const expected: Record<number, { x2: number; y2: number } | null> = {
        0: { x2: 0, y2: 0 },
        1: { x2: 0, y2: -2 },
        21: { x2: -15, y2: 0 },
        22: { x2: -16, y2: -1 },
        42: { x2: -1, y2: -1 },
        43: { x2: 0, y2: 0 },
        63: { x2: 15, y2: -2 },
        64: { x2: 16, y2: 0 },
        84: { x2: 1, y2: -2 },
        85: { x2: 1, y2: 0 },
        86: null,
        87: null,
        200: null,
      };
      for (const [tick, want] of Object.entries(expected)) {
        expect(rapidHorizontalHopsOffsetAtTick(Number(tick))).toEqual(want);
      }
    });

    it("is null before the animation's own creation tick", () => {
      expect(rapidHorizontalHopsOffsetAtTick(-1)).toBeNull();
    });
  });

  describe("speciesFrontIdleRestOffset", () => {
    it("returns ONIX's own frozen Anim_RapidHorizontalHops residual (last active tick 85, accumulator 2040)", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
    });

    it("matches the RAM-probed settled state (SpriteCallbackDummy, both battler slots, tools/probe/dump-onix-front-idle-anim.py)", () => {
      const rows = (probe as { ticks: readonly { battler1: { x2: number; y2: number; callbackSymbol: string } }[] }).ticks;
      for (const row of rows) {
        expect(row.battler1.callbackSymbol).toBe("SpriteCallbackDummy");
        expect({ x2: row.battler1.x2, y2: row.battler1.y2 }).toEqual(speciesFrontIdleRestOffset("ONIX"));
      }
    });

    it("dispatches the complete generated 50-species V_SQUISH_AND_BOUNCE family", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_V_SQUISH_AND_BOUNCE")
        .map(([species]) => species);
      expect(V_SQUISH_AND_BOUNCE_FRONT_SPECIES).toEqual(generated);
      expect(V_SQUISH_AND_BOUNCE_FRONT_SPECIES).toHaveLength(50);
      expect(V_SQUISH_AND_BOUNCE_FRONT_SPECIES).toContain("BAYLEEF");
      expect(V_SQUISH_AND_BOUNCE_FRONT_SPECIES).toContain("MAGBY");
      for (const species of V_SQUISH_AND_BOUNCE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("returns null for generated species whose front-anim family isn't ported", () => {
      expect(speciesFrontIdleRestOffset("CHARMELEON")).toBeNull();
      expect(speciesFrontIdleRestOffset("VENUSAUR")).toBeNull();
    });

    it("dispatches the complete generated 32-species V_STRETCH family", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_V_STRETCH")
        .map(([species]) => species);
      expect(V_STRETCH_FRONT_SPECIES).toEqual(generated);
      expect(V_STRETCH_FRONT_SPECIES).toHaveLength(32);
      expect(V_STRETCH_FRONT_SPECIES).toContain("QUILAVA");
      expect(V_STRETCH_FRONT_SPECIES).toContain("HOUNDOUR");
      expect(V_STRETCH_FRONT_SPECIES).toContain("GROVYLE");
      for (const species of V_STRETCH_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("distinguishes all 25 V_SHAKE selector mappings from the 24-species Factory subset", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_V_SHAKE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(V_SHAKE_FRONT_SPECIES).toEqual(generated);
      expect(V_SHAKE_FRONT_SPECIES).toHaveLength(25);
      expect(V_SHAKE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(V_SHAKE_FACTORY_FRONT_SPECIES).toHaveLength(24);
      expect(V_SHAKE_FACTORY_FRONT_SPECIES).toContain("MACHOKE");
      expect(V_SHAKE_FACTORY_FRONT_SPECIES).toContain("RHYHORN");
      expect(V_SHAKE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual(["GROUDON"]);
      expect(factorySpecies.has("GROUDON")).toBe(false);
      for (const species of V_SHAKE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("verticalSquishBounceFrameAtTick (Anim_VerticalSquishBounce port)", () => {
    it("ports the source accumulators, sine arithmetic, and affine writes", () => {
      expect(verticalSquishBounceFrameAtTick(0)).toEqual({
        x2: 0, y2: 0, data2: 1, data3: 0, data4: 8,
        xScale: 256, yScale: 256,
        callback: "VerticalSquishBounce", affineMode: "double",
      });
      expect(verticalSquishBounceFrameAtTick(8)).toMatchObject({
        y2: 4, data2: 9, data3: 0, data4: 72, xScale: 224, yScale: 288,
      });
      expect(verticalSquishBounceFrameAtTick(24)).toMatchObject({
        y2: -10, data2: 25, data3: 64, data4: 200, xScale: 288, yScale: 224,
      });
      expect(verticalSquishBounceFrameAtTick(48)).toMatchObject({
        y2: -1, data2: 49, data3: 120, data4: 136,
      });
    });

    it("ports the terminal cleanup before WaitAnimEnd hands off to SpriteCallbackDummy", () => {
      expect(verticalSquishBounceFrameAtTick(49)).toEqual({
        x2: 0, y2: 0, data2: 49, data3: 120, data4: 136,
        xScale: 256, yScale: 256,
        callback: "WaitAnimEnd", affineMode: "normal",
      });
      expect(verticalSquishBounceFrameAtTick(50)).toEqual(verticalSquishBounceFrameAtTick(49));
      expect(verticalSquishBounceFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["BAYLEEF", bayleefRunA, bayleefRunB, 1],
      ["MAGBY", magbyRunA, magbyRunB, 1],
    ] as const)("matches two byte-identical fresh settled %s RAM receipts", (species, runA, runB, animNum) => {
      // Deep equality is the hermetic counterpart to the generation-time
      // `cmp`: these independently launched Scene-ON emulator runs stay
      // byte-identical in the committed evidence.
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_SQUISH_AND_BOUNCE");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });
  });

  describe("verticalStretchFrameAtTick (Anim_VerticalStretch port)", () => {
    it("ports the source accumulators, sine arithmetic, and both sDontFlip branches", () => {
      expect(verticalStretchFrameAtTick(0)).toEqual({
        x2: 0, y2: 0, data2: 1, data4: -256, data5: 256, data7: 0,
        xScale: -256, yScale: 256,
        callback: "Anim_VerticalStretch", affineMode: "double",
      });
      expect(verticalStretchFrameAtTick(10)).toMatchObject({
        y2: -4, data2: 11, data4: -267, data5: 221, data7: 51,
      });
      expect(verticalStretchFrameAtTick(20)).toMatchObject({
        y2: -5, data2: 21, data4: -272, data5: 209, data7: 561,
      });
      expect(verticalStretchFrameAtTick(29)).toMatchObject({
        y2: -3, data2: 30, data4: -268, data5: 227, data7: 1020,
      });
      expect(verticalStretchFrameAtTick(20, true)).toMatchObject({
        y2: -5, data4: 272, data5: 209,
      });
    });

    it("ports the terminal affine/y2 cleanup before WaitAnimEnd", () => {
      expect(verticalStretchFrameAtTick(40)).toMatchObject({
        x2: 0, y2: 0, data2: 41, xScale: -256, yScale: 256,
        callback: "Anim_VerticalStretch", affineMode: "double",
      });
      expect(verticalStretchFrameAtTick(41)).toEqual({
        x2: 0, y2: 0, data2: 42, data4: -256, data5: 256, data7: 1020,
        xScale: 256, yScale: 256,
        callback: "WaitAnimEnd", affineMode: "normal",
      });
      expect(verticalStretchFrameAtTick(42)).toEqual(verticalStretchFrameAtTick(41));
      expect(verticalStretchFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["QUILAVA", quilavaRunA, quilavaRunB],
      ["HOUNDOUR", houndourRunA, houndourRunB],
    ] as const)("matches two byte-identical fresh settled %s RAM receipts", (species, runA, runB) => {
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_STRETCH");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });
  });

  describe("verticalSquishBounceSlowFrameAtTick (Anim_VerticalSquishBounce_Slow port)", () => {
    it("derives all 16 selector mappings and proves every one is Factory-reachable", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_V_SQUISH_AND_BOUNCE_SLOW")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(V_SQUISH_AND_BOUNCE_SLOW_FRONT_SPECIES).toEqual(generated);
      expect(V_SQUISH_AND_BOUNCE_SLOW_FRONT_SPECIES).toHaveLength(16);
      expect(generated.filter((species) => factorySpecies.has(species))).toHaveLength(16);
      expect(V_SQUISH_AND_BOUNCE_SLOW_FRONT_SPECIES).toContain("LICKITUNG");
      expect(V_SQUISH_AND_BOUNCE_SLOW_FRONT_SPECIES).toContain("MILTANK");
      for (const species of V_SQUISH_AND_BOUNCE_SLOW_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("ports the shared callback with source duration 32 arithmetic", () => {
      expect(verticalSquishBounceSlowFrameAtTick(0)).toEqual({
        x2: 0, y2: 0, data2: 1, data3: 0, data4: 4,
        xScale: 256, yScale: 256,
        callback: "VerticalSquishBounce", affineMode: "double",
      });
      expect(verticalSquishBounceSlowFrameAtTick(16)).toMatchObject({
        y2: 4, data2: 17, data3: 0, data4: 68, xScale: 224, yScale: 288,
      });
      expect(verticalSquishBounceSlowFrameAtTick(48)).toMatchObject({
        y2: -10, data2: 49, data3: 64, data4: 196, xScale: 288, yScale: 224,
      });
      expect(verticalSquishBounceSlowFrameAtTick(96)).toMatchObject({
        y2: 0, data2: 97, data3: 124, data4: 132,
        callback: "VerticalSquishBounce", affineMode: "double",
      });
    });

    it("pins tick 97 terminal x2/y2/affine/callback cleanup", () => {
      expect(verticalSquishBounceSlowFrameAtTick(97)).toEqual({
        x2: 0, y2: 0, data2: 97, data3: 124, data4: 132,
        xScale: 256, yScale: 256,
        callback: "WaitAnimEnd", affineMode: "normal",
      });
      expect(verticalSquishBounceSlowFrameAtTick(98)).toEqual(
        verticalSquishBounceSlowFrameAtTick(97),
      );
      expect(verticalSquishBounceSlowFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["LICKITUNG", lickitungRunA, lickitungRunB, 2, 108],
      ["MILTANK", miltankRunA, miltankRunB, 1, 241],
    ] as const)("matches two byte-identical fresh settled %s RAM receipts", (
      species,
      runA,
      runB,
      animCmdIndex,
      data2,
    ) => {
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_SQUISH_AND_BOUNCE_SLOW");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted front family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of ["BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN"]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("verticalShakeFrameAtTick (Anim_VerticalShake / VerticalShake port)", () => {
    it("ports source accumulator arithmetic and the strict terminal guard", () => {
      expect(verticalShakeFrameAtTick(0)).toEqual({
        x2: 0, y2: 0, data0: 60, data2: 60, callback: "VerticalShake",
      });
      expect(verticalShakeFrameAtTick(1)).toEqual({
        x2: 0, y2: 2, data0: 60, data2: 120, callback: "VerticalShake",
      });
      expect(verticalShakeFrameAtTick(3)).toEqual({
        x2: 0, y2: -3, data0: 60, data2: 240, callback: "VerticalShake",
      });
      expect(verticalShakeFrameAtTick(37)).toMatchObject({
        y2: -3, data2: 2280, callback: "VerticalShake",
      });
      expect(verticalShakeFrameAtTick(38)).toEqual({
        x2: 0, y2: -2, data0: 60, data2: 2340, callback: "VerticalShake",
      });
    });

    it("cleans terminal y2 only after the accumulator exceeds 2304", () => {
      expect(verticalShakeFrameAtTick(39)).toEqual({
        x2: 0, y2: 0, data0: 60, data2: 2400, callback: "WaitAnimEnd",
      });
      expect(verticalShakeFrameAtTick(40)).toEqual(verticalShakeFrameAtTick(39));
      expect(verticalShakeFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["MACHOKE", machokeRunA, machokeRunB, 2, 67],
      ["RHYHORN", rhyhornRunA, rhyhornRunB, 4, 111],
    ] as const)("matches two byte-identical fresh settled %s RAM receipts", (
      species,
      runA,
      runB,
      animCmdIndex,
      data2,
    ) => {
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_SHAKE");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves the three prior accepted front families", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of ["BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR"]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("horizontalShakeFrameAtTick (Anim_HorizontalShake / HorizontalShake port)", () => {
    it("distinguishes all 17 selector mappings, 16 Factory species, and RAYQUAZA outside Factory", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_H_SHAKE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(H_SHAKE_FRONT_SPECIES).toEqual(generated);
      expect(H_SHAKE_FRONT_SPECIES).toHaveLength(17);
      expect(H_SHAKE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(H_SHAKE_FACTORY_FRONT_SPECIES).toHaveLength(16);
      expect(H_SHAKE_FACTORY_FRONT_SPECIES).toContain("KABUTOPS");
      expect(H_SHAKE_FACTORY_FRONT_SPECIES).toContain("BLAZIKEN");
      expect(H_SHAKE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual(["RAYQUAZA"]);
      expect(factorySpecies.has("RAYQUAZA")).toBe(false);
      for (const species of H_SHAKE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins every active callback boundary with source data0=60 and data7=3", () => {
      const activeX2 = [
        0, 2, 0, -3, -2, 2, 1, -3, -3, 1, 2, -2, -3,
        0, 2, -1, -3, -1, 2, 0, -3, -2, 2, 1, -3, -3,
        1, 2, -2, -3, 0, 2, 0, -3, -1, 2, 1, -3, -2,
      ];
      expect(activeX2).toHaveLength(39);
      for (const [tick, x2] of activeX2.entries()) {
        expect(horizontalShakeFrameAtTick(tick)).toEqual({
          x2,
          y2: 0,
          data0: 60,
          data2: (tick + 1) * 60,
          data7: 3,
          callback: "HorizontalShake",
        });
      }
    });

    it("uses the strict >2304 guard and performs terminal x2/y2/callback cleanup", () => {
      expect(horizontalShakeFrameAtTick(38)).toEqual({
        x2: -2, y2: 0, data0: 60, data2: 2340, data7: 3,
        callback: "HorizontalShake",
      });
      expect(horizontalShakeFrameAtTick(39)).toEqual({
        x2: 0, y2: 0, data0: 60, data2: 2400, data7: 3,
        callback: "WaitAnimEnd",
      });
      expect(horizontalShakeFrameAtTick(40)).toEqual(horizontalShakeFrameAtTick(39));
      expect(horizontalShakeFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["KABUTOPS", kabutopsRunA, kabutopsRunB, 3, 141],
      ["BLAZIKEN", blazikenRunA, blazikenRunB, 4, 282],
    ] as const)("matches two byte-identical fresh settled %s RAM receipts", (
      species,
      runA,
      runB,
      animCmdIndex,
      data2,
    ) => {
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_H_SHAKE");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted front family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR",
        "MACHOKE", "RHYHORN", "LICKITUNG", "MILTANK",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("horizontalShakeSlowFrameAtTick (Anim_HorizontalShake_Slow port)", () => {
    it("derives exactly three selector mappings, all Factory-reachable", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_H_SHAKE_SLOW")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(H_SHAKE_SLOW_FRONT_SPECIES).toEqual(generated);
      expect(generated).toEqual(["DUGTRIO", "GOLDUCK", "DODUO"]);
      expect(H_SHAKE_SLOW_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(H_SHAKE_SLOW_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(H_SHAKE_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of generated) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins every active counter 0..2280 by 30 with GBA signed sine", () => {
      expect(HORIZONTAL_SHAKE_INITIALIZERS).toEqual({ normal: 60, slow: 30 });
      for (let tick = 0; tick <= 76; tick += 1) {
        const counter = tick * 30;
        const x2 = Math.floor((3 * GBA_SINE_TABLE_256[counter & 0xff]!) / 256);
        expect(horizontalShakeSlowFrameAtTick(tick), `tick ${tick}, counter ${counter}`).toEqual({
          x2,
          y2: 0,
          data0: 30,
          data2: counter + 30,
          data7: 3,
          callback: "HorizontalShake",
        });
      }
    });

    it("pins tick 77's strict guard cleanup, stable rest, and normal regression", () => {
      expect(horizontalShakeSlowFrameAtTick(76)).toMatchObject({
        x2: -2, data2: 2310, callback: "HorizontalShake",
      });
      expect(horizontalShakeSlowFrameAtTick(77)).toEqual({
        x2: 0, y2: 0, data0: 30, data2: 2340, data7: 3,
        callback: "WaitAnimEnd",
      });
      expect(horizontalShakeSlowFrameAtTick(78)).toEqual(horizontalShakeSlowFrameAtTick(77));
      expect(horizontalShakeSlowFrameAtTick(500)).toEqual(horizontalShakeSlowFrameAtTick(77));
      expect(horizontalShakeSlowFrameAtTick(-1)).toBeNull();
      expect(horizontalShakeSlowFrameAtTick(0.5)).toBeNull();

      expect(horizontalShakeFrameAtTick(0)).toEqual({
        x2: 0, y2: 0, data0: 60, data2: 60, data7: 3,
        callback: "HorizontalShake",
      });
      expect(horizontalShakeFrameAtTick(38)).toMatchObject({
        x2: -2, data0: 60, data2: 2340, callback: "HorizontalShake",
      });
      expect(horizontalShakeFrameAtTick(39)).toEqual({
        x2: 0, y2: 0, data0: 60, data2: 2400, data7: 3,
        callback: "WaitAnimEnd",
      });
      expect(horizontalShakeFrameAtTick(100)).toEqual(horizontalShakeFrameAtTick(39));
    });
  });

  describe("growVibrateFrameAtTick (Anim_GrowVibrate port)", () => {
    it("distinguishes 18 selector mappings, 16 Factory species, and MEWTWO plus HO_OH outside Factory", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_GROW_VIBRATE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(GROW_VIBRATE_FRONT_SPECIES).toEqual(generated);
      expect(GROW_VIBRATE_FRONT_SPECIES).toHaveLength(18);
      expect(GROW_VIBRATE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(GROW_VIBRATE_FACTORY_FRONT_SPECIES).toHaveLength(16);
      expect(GROW_VIBRATE_FACTORY_FRONT_SPECIES).toContain("KADABRA");
      expect(GROW_VIBRATE_FACTORY_FRONT_SPECIES).toContain("REGISTEEL");
      expect(GROW_VIBRATE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual(["MEWTWO", "HO_OH"]);
      expect(factorySpecies.has("MEWTWO")).toBe(false);
      expect(factorySpecies.has("HO_OH")).toBe(false);
      for (const species of GROW_VIBRATE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins every active callback boundary, C index arithmetic, and alternating sine amplitude", () => {
      const activeIndexAmplitudeScale = [
        [0, 32, 256], [6, 8, 257], [12, 32, 265], [19, 8, 259],
        [25, 32, 274], [32, 8, 261], [38, 32, 281], [44, 8, 263],
        [51, 32, 286], [57, 8, 263], [64, 32, 288], [70, 8, 263],
        [76, 32, 286], [83, 8, 263], [89, 32, 282], [96, 8, 261],
        [102, 32, 275], [108, 8, 259], [115, 32, 266], [121, 8, 257],
        [128, 32, 256], [134, 8, 254], [140, 32, 246], [147, 8, 252],
        [153, 32, 237], [160, 8, 250], [166, 32, 230], [172, 8, 248],
        [179, 32, 225], [185, 8, 248], [192, 32, 224], [198, 8, 248],
        [204, 32, 225], [211, 8, 248], [217, 32, 229], [224, 8, 250],
        [230, 32, 237], [236, 8, 252], [243, 32, 246], [249, 8, 254],
        [0, 32, 256],
      ] as const;
      expect(activeIndexAmplitudeScale).toHaveLength(41);
      for (const [tick, [index, amplitude, scale]] of activeIndexAmplitudeScale.entries()) {
        expect(growVibrateFrameAtTick(tick)).toEqual({
          x2: 0,
          y2: 0,
          data2: tick + 1,
          data4: scale,
          data5: scale,
          index,
          amplitude,
          xScale: scale,
          yScale: scale,
          startedAffine: tick === 0,
          callback: "Anim_GrowVibrate",
          affineMode: "double",
        });
      }
    });

    it("uses strict data2 > 40 cleanup and preserves the final data2 increment", () => {
      expect(growVibrateFrameAtTick(40)).toMatchObject({
        data2: 41,
        index: 0,
        amplitude: 32,
        xScale: 256,
        yScale: 256,
        callback: "Anim_GrowVibrate",
        affineMode: "double",
      });
      expect(growVibrateFrameAtTick(41)).toEqual({
        x2: 0,
        y2: 0,
        data2: 42,
        data4: 256,
        data5: 256,
        index: null,
        amplitude: null,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(growVibrateFrameAtTick(42)).toEqual(growVibrateFrameAtTick(41));
      expect(growVibrateFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["KADABRA", kadabraRunA, kadabraRunB, 2, 64],
      ["REGISTEEL", registeelRunA, registeelRunB, 4, 403],
    ] as const)("matches two byte-identical fresh settled %s RAM receipts", (
      species,
      runA,
      runB,
      animCmdIndex,
      data2,
    ) => {
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_GROW_VIBRATE");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted front family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("swingConcaveFrameAtTick (Anim_SwingConcave / SwingConcave port)", () => {
    it("derives all 11 selector mappings as Factory-reachable with no outside mappings", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_SWING_CONCAVE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(SWING_CONCAVE_FRONT_SPECIES).toEqual(generated);
      expect(SWING_CONCAVE_FRONT_SPECIES).toHaveLength(11);
      expect(SWING_CONCAVE_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(SWING_CONCAVE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(SWING_CONCAVE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      expect(SWING_CONCAVE_FACTORY_FRONT_SPECIES).toContain("SQUIRTLE");
      expect(SWING_CONCAVE_FACTORY_FRONT_SPECIES).toContain("SHUCKLE");
      for (const species of SWING_CONCAVE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins AddNewAnim defaults and data=100 at the tick-0 affine start", () => {
      expect(swingConcaveFrameAtTick(0)).toEqual({
        x2: 0,
        y2: 0,
        data2: 1,
        animRotation: 0,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 100,
        index: 0,
        xScale: 256,
        yScale: 256,
        affineRotation: 0,
        startedAffine: true,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: false,
        callback: "SwingConcave",
        affineMode: "double",
      });
    });

    it("pins C index arithmetic, both normal-front flips, x2 sine, and rotation at every active boundary", () => {
      const indices = [
        0,2,5,7,10,12,15,17,20,23,25,28,30,33,35,38,40,43,46,48,51,53,56,58,61,
        64,66,69,71,74,76,79,81,84,87,89,92,94,97,99,102,104,107,110,112,115,117,
        120,122,125,128,130,133,135,138,140,143,145,148,151,153,156,158,161,163,166,
        168,171,174,176,179,181,184,186,189,192,194,197,199,202,204,207,209,212,215,
        217,220,222,225,227,230,232,235,238,240,243,245,248,250,253,256,
      ];
      const x2Writes = [
        0,0,-1,-1,-2,-2,-3,-4,-4,-5,-5,-6,-6,-7,-7,-8,-8,-8,-9,-9,-9,-9,-9,-9,
        -9,-10,-9,-9,-9,-9,-9,-9,-9,-8,-8,-8,-7,-7,-6,-6,-5,-5,-4,-4,-3,-3,-2,-1,
        -1,0,0,1,2,2,3,3,4,5,5,6,6,7,7,8,8,9,9,9,10,10,10,10,10,10,10,10,10,10,
        10,10,10,10,10,9,9,9,8,8,7,7,6,6,5,5,4,4,3,2,2,1,0,
      ];
      const rotationWrites = [
        0,153,396,550,793,946,1177,1318,1535,1740,1881,2073,2188,2367,2469,2623,
        2712,2840,2956,3020,3109,3148,3212,3237,3263,3276,3263,3250,3224,3173,3122,
        3045,2994,2879,2764,2674,2520,2418,2252,2137,1945,1817,1612,1394,1241,1023,
        870,627,473,230,0,-154,-397,-551,-794,-947,-1178,-1319,-1536,-1741,-1882,
        -2074,-2189,-2368,-2470,-2624,-2713,-2841,-2957,-3021,-3110,-3149,-3213,
        -3238,-3264,-3276,-3264,-3251,-3225,-3174,-3123,-3046,-2995,-2880,-2765,
        -2675,-2521,-2419,-2253,-2138,-1946,-1818,-1613,-1395,-1242,-1024,-871,-628,
        -474,-231,0,
      ];
      expect(indices).toHaveLength(101);
      expect(x2Writes).toHaveLength(101);
      expect(rotationWrites).toHaveLength(101);
      for (let tick = 0; tick <= 100; tick += 1) {
        expect(swingConcaveFrameAtTick(tick)).toMatchObject({
          x2: x2Writes[tick],
          y2: 0,
          data2: tick + 1,
          animRotation: 0,
          animDelay: 0,
          animRuns: 1,
          animSpeed: 0,
          animData: 100,
          index: indices[tick],
          xScale: 256,
          yScale: 256,
          affineRotation: rotationWrites[tick],
          startedAffine: tick === 0,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          resetSpriteAfterAnim: false,
          callback: "SwingConcave",
          affineMode: "double",
        });
      }
    });

    it("uses the strict duration guard and pins identity/x2/reset/callback terminal state", () => {
      expect(swingConcaveFrameAtTick(100)).toMatchObject({
        data2: 101,
        index: 256,
        x2: 0,
        affineRotation: 0,
        callback: "SwingConcave",
        affineMode: "double",
      });
      expect(swingConcaveFrameAtTick(101)).toEqual({
        x2: 0,
        y2: 0,
        data2: 102,
        animRotation: 0,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 100,
        index: null,
        xScale: 256,
        yScale: 256,
        affineRotation: 0,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(swingConcaveFrameAtTick(102)).toEqual(swingConcaveFrameAtTick(101));
      expect(swingConcaveFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["SQUIRTLE", squirtleRunA, squirtleRunB, squirtleRawA, squirtleRawB, 7],
      ["SHUCKLE", shuckleRunA, shuckleRunB, shuckleRawA, shuckleRawB, 213],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      data2,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_SWING_CONCAVE");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex: 2,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted front family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("verticalSlideFrameAtTick (Anim_VerticalSlide / VerticalSlide port)", () => {
    it("derives all 10 selector mappings as Factory-reachable with no outside mappings", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_V_SLIDE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(V_SLIDE_FRONT_SPECIES).toEqual(generated);
      expect(V_SLIDE_FRONT_SPECIES).toHaveLength(10);
      expect(V_SLIDE_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(V_SLIDE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(V_SLIDE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      expect(V_SLIDE_FACTORY_FRONT_SPECIES).toContain("SEADRA");
      expect(V_SLIDE_FACTORY_FRONT_SPECIES).toContain("MARSHTOMP");
      for (const species of V_SLIDE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins data0=40, C index arithmetic, both normal-front flips, and negated-sine y2 at every active callback", () => {
      const activeIndexAndY2 = [
        [0,0],[9,-1],[19,-2],[28,-3],[38,-4],[48,-5],[57,-5],[67,-5],[76,-5],
        [86,-5],[96,-4],[105,-3],[115,-1],[124,0],[134,1],[144,3],[153,4],
        [163,5],[172,6],[182,6],[192,6],[201,6],[211,6],[220,5],[230,4],[240,3],
        [249,2],[3,0],[12,-1],[22,-3],[32,-4],[41,-5],[51,-5],[60,-5],[70,-5],
        [80,-5],[89,-4],[99,-3],[108,-2],[118,-1],[128,0],
      ] as const;
      expect(activeIndexAndY2).toHaveLength(41);
      for (const [tick, [index, y2]] of activeIndexAndY2.entries()) {
        expect(verticalSlideFrameAtTick(tick)).toEqual({
          x2: 0,
          y2,
          data0: 40,
          data2: tick + 1,
          index,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          callback: "VerticalSlide",
        });
      }
    });

    it("uses the strict >duration guard and pins y2/WaitAnimEnd cleanup plus the final data2 increment", () => {
      expect(verticalSlideFrameAtTick(40)).toEqual({
        x2: 0,
        y2: 0,
        data0: 40,
        data2: 41,
        index: 128,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        callback: "VerticalSlide",
      });
      expect(verticalSlideFrameAtTick(41)).toEqual({
        x2: 0,
        y2: 0,
        data0: 40,
        data2: 42,
        index: null,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        callback: "WaitAnimEnd",
      });
      expect(verticalSlideFrameAtTick(42)).toEqual(verticalSlideFrameAtTick(41));
      expect(verticalSlideFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [117, seadraScenario],
      [284, marshtompScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "SEADRA", seadraRunA, seadraRunB, seadraRawA, seadraRawB, 4, 117,
        "c70a070b61918ed2e3c0f1bbe3b1be778d63ee29865a13176f1683ab5e17963a",
      ],
      [
        "MARSHTOMP", marshtompRunA, marshtompRunB, marshtompRawA, marshtompRawB, 8, 284,
        "f29ff01ed2a5fc6b732da0955e4029559063e0a2acc7db7b9fbbfaa84ca1ec68",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      animCmdIndex,
      data2,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_SLIDE");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted front family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("verticalSlideSlowFrameAtTick (Anim_VerticalSlide_Slow / shared VerticalSlide port)", () => {
    it("derives exactly all 5 selector mappings as Factory-reachable with zero outside", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_V_SLIDE_SLOW")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(V_SLIDE_SLOW_FRONT_SPECIES).toEqual(generated);
      expect(V_SLIDE_SLOW_FRONT_SPECIES).toEqual([
        "PIDGEY", "AERODACTYL", "DRAGONITE", "HOOTHOOT", "LEDIAN",
      ]);
      expect(V_SLIDE_SLOW_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(V_SLIDE_SLOW_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(V_SLIDE_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of V_SLIDE_SLOW_FRONT_SPECIES) {
        expect(
          (selectorTables.frontAnimIds.species as Readonly<Record<string, string>>)[species],
        ).toBe("ANIM_V_SLIDE_SLOW");
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins task zeroing and both immediate initializers' install-after-call semantics", () => {
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
      expect(VERTICAL_SLIDE_INITIALIZERS).toEqual({
        normal: {
          selector: "ANIM_V_SLIDE",
          initializer: "Anim_VerticalSlide",
          data0: 40,
          immediateCallback: "VerticalSlide",
          installedCallback: "VerticalSlide",
          sourceOverwriteAfterImmediateCall: true,
          accepted: true,
        },
        slow: {
          selector: "ANIM_V_SLIDE_SLOW",
          initializer: "Anim_VerticalSlide_Slow",
          data0: 80,
          immediateCallback: "VerticalSlide",
          installedCallback: "VerticalSlide",
          sourceOverwriteAfterImmediateCall: true,
          accepted: true,
        },
      });
      expect(verticalSlideFrameAtTick(0)).toMatchObject({
        data0: 40, data2: 1, index: 0, callback: "VerticalSlide",
      });
      expect(verticalSlideSlowFrameAtTick(0)).toEqual({
        x2: 0,
        y2: 0,
        data0: 80,
        data2: 1,
        index: 0,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        callback: "VerticalSlide",
      });
    });

    it("pins every slow active callback after C truncation, modulo, signed sine, and body increment", () => {
      const active = Array.from({ length: 81 }, (_, tick) => {
        const quotientBeforeModulo = Math.trunc((tick * 384) / 80);
        const index = quotientBeforeModulo % 256;
        const signedSine = Math.floor((6 * GBA_SINE_TABLE_256[index]!) / 256);
        const frame = verticalSlideSlowFrameAtTick(tick);
        expect(frame, `tick ${tick}`).toEqual({
          x2: 0,
          y2: -signedSine + 0,
          data0: 80,
          data2: tick + 1,
          index,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          callback: "VerticalSlide",
        });
        return frame!;
      });
      expect(active).toHaveLength(81);
      expect([0, 20, 40, 60, 80].map((tick) => [
        tick, active[tick]!.index, active[tick]!.y2, active[tick]!.data2,
      ])).toEqual([
        [0, 0, 0, 1],
        [20, 96, -4, 21],
        [40, 192, 6, 41],
        [60, 32, -4, 61],
        [80, 128, 0, 81],
      ]);
    });

    it("pins strict data2 > data0 terminal cleanup and stable WaitAnimEnd", () => {
      expect(verticalSlideSlowFrameAtTick(80)).toMatchObject({
        data0: 80, data2: 81, index: 128, callback: "VerticalSlide",
      });
      const terminal = {
        x2: 0,
        y2: 0,
        data0: 80,
        data2: 82,
        index: null,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        callback: "WaitAnimEnd",
      } as const;
      expect(verticalSlideSlowFrameAtTick(81)).toEqual(terminal);
      expect(verticalSlideSlowFrameAtTick(82)).toEqual(terminal);
      expect(verticalSlideSlowFrameAtTick(1000)).toEqual(terminal);
      expect(verticalSlideSlowFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [16, [16, 28, 18, 98], pidgeyScenario],
      [166, [4, 226, 14, 97], ledianScenario],
    ] as const)("stages a complete legal challenge-0 Scene-ON party for species %i", (
      species,
      moves,
      scenario,
    ) => {
      expect(scenario).toMatchObject({
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 0,
        trainerId: 50,
      });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]).toMatchObject({
        species,
        moves,
      });
      for (const setId of [...scenario.playerSetIds, ...scenario.opponentSetIds]) {
        expect(setId).toBeGreaterThanOrEqual(110);
        expect(setId).toBeLessThanOrEqual(199);
      }
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "PIDGEY", pidgeyRunA, pidgeyRunB, pidgeyRawA, pidgeyRawB,
        16, 11, 373, "54d30286650c7bc624c48ca0edeff146008052358ef0b8350f52e7a3c884a4a6",
      ],
      [
        "LEDIAN", ledianRunA, ledianRunB, ledianRawA, ledianRawB,
        166, 25, 374, "a195c9271c61c104d528af5cfd22bdc1917114fd14efe6b2200218238c59e564",
      ],
    ] as const)("matches paired byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      speciesId,
      animCmdIndex,
      rawBytes,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA).toHaveLength(rawBytes);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(
        (selectorTables.frontAnimIds.species as Readonly<Record<string, string>>)[species],
      ).toBe("ANIM_V_SLIDE_SLOW");
      expect(runA.ticks[0]!.battler1).toMatchObject({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2: speciesId,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({
        x2: runA.ticks[0]!.battler1.x2,
        y2: runA.ticks[0]!.battler1.y2,
      }).toEqual(speciesFrontIdleRestOffset(species));
    });
  });

  describe("verticalJumpsSmallFrameAtTick (Anim_VerticalJumps_Small / VerticalJumps port)", () => {
    it("derives all 10 selector mappings as Factory-reachable with no outside mappings", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_V_JUMPS_SMALL")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(V_JUMPS_SMALL_FRONT_SPECIES).toEqual(generated);
      expect(V_JUMPS_SMALL_FRONT_SPECIES).toEqual([
        "CHARMANDER", "MEOWTH", "PORYGON", "CYNDAQUIL", "LEDYBA",
        "CLEFFA", "SUNKERN", "REMORAID", "DELIBIRD", "LARVITAR",
      ]);
      expect(V_JUMPS_SMALL_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(V_JUMPS_SMALL_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(V_JUMPS_SMALL_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of V_JUMPS_SMALL_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins data0, C division branches, u8 sine indices, amplitudes, and x2/y2 at every active callback", () => {
      const activeBoundaries = [
        [0,0,0,0,6,0,0],[12,0,12,12,6,0,-1],[24,0,24,24,6,0,-3],
        [36,0,36,36,6,0,-4],[48,0,48,48,6,0,-5],[60,0,60,60,6,0,-5],
        [72,0,72,72,6,0,-5],[84,0,84,84,6,0,-5],[96,0,96,96,6,0,-4],
        [108,0,108,108,6,0,-2],[120,0,120,120,6,0,-1],[132,1,132,4,6,0,0],
        [144,1,144,16,6,0,-2],[156,1,156,28,6,0,-3],[168,1,168,40,6,0,-4],
        [180,1,180,52,6,0,-5],[192,1,192,64,6,0,-6],[204,1,204,76,6,0,-5],
        [216,1,216,88,6,0,-4],[228,1,228,100,6,0,-3],[240,1,240,112,6,0,-2],
        [252,1,252,124,6,0,0],[264,2,8,8,9,0,-1],[276,2,20,20,9,0,-4],
        [288,2,32,32,9,0,-6],[300,2,44,44,9,0,-7],[312,2,56,56,9,0,-8],
        [324,2,68,68,9,0,-8],[336,2,80,80,9,0,-8],[348,2,92,92,9,0,-6],
        [360,2,104,104,9,0,-4],[372,2,116,116,9,0,-2],[384,3,128,128,9,0,0],
      ] as const;
      expect(activeBoundaries).toHaveLength(33);
      for (const [tick, [counter, divCounter, adjustedCounter, sineIndex, amplitude, x2, y2]]
        of activeBoundaries.entries()) {
        expect(verticalJumpsSmallFrameAtTick(tick)).toEqual({
          x2,
          y2,
          data0: 3,
          data2: counter + 12,
          counter,
          divCounter,
          adjustedCounter,
          sineIndex,
          amplitude,
          callback: "VerticalJumps",
        });
      }
    });

    it("uses the strict counter > 384 guard and pins terminal cleanup plus the final increment", () => {
      expect(verticalJumpsSmallFrameAtTick(32)).toMatchObject({
        x2: 0,
        y2: 0,
        data2: 396,
        counter: 384,
        divCounter: 3,
        adjustedCounter: 128,
        sineIndex: 128,
        amplitude: 9,
        callback: "VerticalJumps",
      });
      expect(verticalJumpsSmallFrameAtTick(33)).toEqual({
        x2: 0,
        y2: 0,
        data0: 3,
        data2: 408,
        counter: 396,
        divCounter: null,
        adjustedCounter: null,
        sineIndex: null,
        amplitude: null,
        callback: "WaitAnimEnd",
      });
      expect(verticalJumpsSmallFrameAtTick(34)).toEqual(verticalJumpsSmallFrameAtTick(33));
      expect(verticalJumpsSmallFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [4, charmanderScenario],
      [225, delibirdScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "CHARMANDER", charmanderRunA, charmanderRunB, charmanderRawA, charmanderRawB, 2, 4,
        "11290c70ee4cef6463fa4878ad94c665f080c6ae2cd03fe4b41354add0227518",
      ],
      [
        "DELIBIRD", delibirdRunA, delibirdRunB, delibirdRawA, delibirdRawB, 3, 225,
        "ab44bf5b7111e37d8f491e24a1f0aa0ce6a331d7220ae231f74d3c9741626661",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      animCmdIndex,
      data2,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_JUMPS_SMALL");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted front family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("horizontalJumpsVerticalStretchFrameAtTick (single-run callbacks _0/_1/_2)", () => {
    it("derives all 10 selector mappings as Factory-reachable with no outside mappings", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_H_JUMPS_V_STRETCH")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(H_JUMPS_V_STRETCH_FRONT_SPECIES).toEqual(generated);
      expect(H_JUMPS_V_STRETCH_FRONT_SPECIES).toEqual([
        "MANKEY", "POLIWHIRL", "VICTREEBEL", "EXEGGUTOR", "FURRET",
        "POLITOED", "AIPOM", "PHANPY", "GRUMPIG", "WYNAUT",
      ]);
      expect(H_JUMPS_V_STRETCH_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(H_JUMPS_V_STRETCH_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(H_JUMPS_V_STRETCH_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of H_JUMPS_V_STRETCH_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins AddNewAnim defaults, the single-run data=-1 override, and tick-0 affine start", () => {
      expect(horizontalJumpsVerticalStretchFrameAtTick(0)).toEqual({
        x2: 0,
        y2: 0,
        data2: 12,
        data3: 0,
        data4: 0,
        animRotation: 0,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: -1,
        counter: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: true,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: false,
        callback: "HorizontalJumpsVerticalStretch_0",
        affineMode: "double",
      });
      // The distinct `_Twice` initializer uses data=1/runs=2 and reaches the
      // delay/repeat branch; neither value is inherited by this family.
      expect(horizontalJumpsVerticalStretchFrameAtTick(0)).toMatchObject({
        animDelay: 0,
        animRuns: 1,
        animData: -1,
      });
    });

    it("pins every callback-_0 jump write and its strict >128 transition/reset", () => {
      const active = [
        [0,0,0],[12,0,-2],[24,-1,-4],[36,-2,-6],[48,-3,-7],[60,-3,-7],
        [72,-4,-7],[84,-5,-7],[96,-6,-5],[108,-6,-3],[120,-7,-1],
      ] as const;
      for (const [tick, [counter, x2, y2]] of active.entries()) {
        expect(horizontalJumpsVerticalStretchFrameAtTick(tick)).toMatchObject({
          x2,
          y2,
          data2: counter + 12,
          data3: 0,
          data4: 0,
          animDelay: 0,
          counter,
          xScale: 256,
          yScale: 256,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          callback: "HorizontalJumpsVerticalStretch_0",
          affineMode: "double",
        });
      }
      expect(horizontalJumpsVerticalStretchFrameAtTick(11)).toMatchObject({
        x2: -7,
        y2: -1,
        data2: 0,
        data3: 0,
        data4: 0,
        counter: 132,
        callback: "HorizontalJumpsVerticalStretch_1",
      });
    });

    it("pins all 49 callback-_1 sine/scale/x2/y2 writes and the strict >48 transition", () => {
      const active = [
        [0,0,8,-7,0,256,256],[1,0,16,-7,1,250,268],[2,0,24,-7,3,244,280],
        [3,0,32,-7,4,239,291],[4,0,40,-7,5,234,301],[5,0,48,-7,6,230,309],
        [6,0,56,-7,7,227,315],[7,0,64,-7,7,225,318],[8,0,72,-7,8,224,320],
        [9,0,80,-7,7,225,318],[10,0,88,-7,7,227,315],[11,0,96,-7,6,230,309],
        [12,0,104,-7,5,234,301],[13,0,112,-7,4,239,291],[14,0,120,-7,3,244,280],
        [15,0,128,-7,1,250,268],[16,8,136,-6,-3,256,256],[17,16,144,-5,-7,263,243],
        [18,24,152,-4,-11,269,231],[19,32,160,-3,-14,274,220],
        [20,40,168,-2,-16,279,210],[21,48,176,-1,-18,283,203],
        [22,56,184,0,-19,286,197],[23,64,192,1,-20,288,193],
        [24,72,200,2,-19,288,192],[25,80,208,3,-18,288,193],
        [26,88,216,4,-16,286,197],[27,96,224,5,-14,283,203],
        [28,104,232,6,-11,279,210],[29,112,240,7,-7,274,220],
        [30,120,248,8,-3,269,231],[31,128,0,9,0,263,243],[32,128,8,9,0,256,256],
        [33,128,16,9,1,250,268],[34,128,24,9,3,244,280],[35,128,32,9,4,239,291],
        [36,128,40,9,5,234,301],[37,128,48,9,6,230,309],[38,128,56,9,7,227,315],
        [39,128,64,9,7,225,318],[40,128,72,9,8,224,320],[41,128,80,9,7,225,318],
        [42,128,88,9,7,227,315],[43,128,96,9,6,230,309],
        [44,128,104,9,5,234,301],[45,128,112,9,4,239,291],
        [46,128,120,9,3,244,280],[47,128,128,9,1,250,268],
        [48,128,136,9,0,256,256],
      ] as const;
      expect(active).toHaveLength(49);
      for (const [offset, [counter, data3, data4, x2, y2, xScale, yScale]]
        of active.entries()) {
        expect(horizontalJumpsVerticalStretchFrameAtTick(12 + offset)).toMatchObject({
          x2,
          y2,
          data2: counter + 1,
          data3,
          data4,
          counter,
          xScale,
          yScale,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          callback: "HorizontalJumpsVerticalStretch_1",
          affineMode: "double",
        });
      }
      expect(horizontalJumpsVerticalStretchFrameAtTick(61)).toMatchObject({
        x2: 9,
        y2: 0,
        data2: 0,
        data3: 128,
        data4: 136,
        counter: 49,
        xScale: 256,
        yScale: 256,
        callback: "HorizontalJumpsVerticalStretch_2",
      });
    });

    it("pins every callback-_2 write and terminal ResetSpriteAfterAnim/final increment", () => {
      const active = [
        [0,8,0],[12,8,-2],[24,7,-4],[36,6,-6],[48,5,-7],[60,5,-7],
        [72,4,-7],[84,3,-7],[96,2,-5],[108,2,-3],[120,1,-1],
      ] as const;
      for (const [offset, [counter, x2, y2]] of active.entries()) {
        expect(horizontalJumpsVerticalStretchFrameAtTick(62 + offset)).toMatchObject({
          x2,
          y2,
          data2: counter + 12,
          data3: 128,
          data4: 136,
          counter,
          xScale: 256,
          yScale: 256,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          resetSpriteAfterAnim: false,
          callback: "HorizontalJumpsVerticalStretch_2",
          affineMode: "double",
        });
      }
      expect(horizontalJumpsVerticalStretchFrameAtTick(73)).toEqual({
        x2: 0,
        y2: 0,
        data2: 144,
        data3: 128,
        data4: 136,
        animRotation: 0,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: -1,
        counter: 132,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(horizontalJumpsVerticalStretchFrameAtTick(74)).toEqual(
        horizontalJumpsVerticalStretchFrameAtTick(73),
      );
      expect(horizontalJumpsVerticalStretchFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [56, mankeyScenario],
      [360, wynautScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "MANKEY", mankeyRunA, mankeyRunB, mankeyRawA, mankeyRawB, 5, 56,
        "dd828c5122f1693d1a947794c315648eb3fd1edbb15b0d988667d9de8ffb5161",
      ],
      [
        "WYNAUT", wynautRunA, wynautRunB, wynautRawA, wynautRawB, 4, 360,
        "0998becc3884e86138b282f1a17b153827575583adeac15283618a98b2bc9d61",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      animCmdIndex,
      data2,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_H_JUMPS_V_STRETCH");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves all previously accepted representative and sibling families", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("horizontalJumpsVerticalStretchTwiceFrameAtTick (shared twice lifecycle)", () => {
    it("derives exactly SHARPEDO and SPOINK as Factory mappings with no outside mappings", () => {
      const speciesSelectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
      const generated = Object.entries(speciesSelectors)
        .filter(([, family]) => family === "ANIM_H_JUMPS_V_STRETCH_TWICE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(H_JUMPS_V_STRETCH_TWICE_FRONT_SPECIES).toEqual(generated);
      expect(H_JUMPS_V_STRETCH_TWICE_FRONT_SPECIES).toEqual(["SHARPEDO", "SPOINK"]);
      expect(H_JUMPS_V_STRETCH_TWICE_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(H_JUMPS_V_STRETCH_TWICE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(H_JUMPS_V_STRETCH_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of generated) {
        expect(speciesSelectors[species]).toBe("ANIM_H_JUMPS_V_STRETCH_TWICE");
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins every callback tick 0..156, both normal-front flips, affine state, and repeat delay", () => {
      const frames = Array.from(
        { length: 157 },
        (_, tick) => horizontalJumpsVerticalStretchTwiceFrameAtTick(tick)!,
      );
      expect(frames).toHaveLength(157);
      for (const [tick, frame] of frames.entries()) {
        expect(frame, `tick ${tick}`).not.toBeNull();
        expect(frame, `tick ${tick}`).toMatchObject({
          animRotation: 0,
          animRuns: tick < 73 ? 2 : 1,
          animSpeed: 0,
          animData: 1,
          startedAffine: tick === 0,
          normalFrontDontFlip: true,
          tryFlipXCalls: tick >= 74 && tick <= 83 ? 0 : 2,
          resetSpriteAfterAnim: tick === 156,
          affineMode: tick === 156 ? "normal" : "double",
        });
      }
      expect(frames.map(({ callback }) => callback)).toEqual([
        ...Array(11).fill("HorizontalJumpsVerticalStretch_0"),
        ...Array(50).fill("HorizontalJumpsVerticalStretch_1"),
        ...Array(12).fill("HorizontalJumpsVerticalStretch_2"),
        ...Array(21).fill("HorizontalJumpsVerticalStretch_0"),
        ...Array(50).fill("HorizontalJumpsVerticalStretch_1"),
        ...Array(12).fill("HorizontalJumpsVerticalStretch_2"),
        "WaitAnimEnd",
      ]);
    });

    it("pins C-truncated jump and stretch writes across both passes", () => {
      const sin = (index: number, amplitude: number) =>
        (amplitude * GBA_SINE_TABLE_256[index & 0xff]!) >> 8;

      for (const [startTick, counters] of [
        [0, Array.from({ length: 11 }, (_, index) => index * 12)],
        [84, Array.from({ length: 10 }, (_, index) => 12 + index * 12)],
      ] as const) {
        for (const [offset, counter] of counters.entries()) {
          expect(horizontalJumpsVerticalStretchTwiceFrameAtTick(startTick + offset))
            .toMatchObject({
              x2: Math.trunc((8 * counter) / 128) + 0,
              y2: -sin(counter % 128, 8) + 0,
              data2: counter + 12,
              data3: 0,
              data4: 0,
              animDelay: 0,
              counter,
              xScale: 256,
              yScale: 256,
              callback: "HorizontalJumpsVerticalStretch_0",
            });
        }
      }

      for (const startTick of [12, 95] as const) {
        for (let counter = 0; counter <= 48; counter += 1) {
          const data4Before = (counter * 8) & 0xff;
          const data3 = counter < 16 ? 0 : counter <= 31 ? (counter - 15) * 8 : 128;
          const x2 = counter < 16 ? 7 : counter <= 31 ? 7 - (counter - 15) : -9;
          const yScale = sin(data4Before, 64) + 256;
          const yDelta = yScale > 256 ? Math.trunc((256 - yScale) / 8) : 0;
          expect(horizontalJumpsVerticalStretchTwiceFrameAtTick(startTick + counter))
            .toMatchObject({
              x2,
              y2: -sin(data3, 20) - yDelta + 0,
              data2: counter + 1,
              data3,
              data4: (data4Before + 8) & 0xff,
              animDelay: 0,
              counter,
              xScale: 256 - sin(data4Before, 32),
              yScale,
              callback: "HorizontalJumpsVerticalStretch_1",
            });
        }
      }

      for (const startTick of [62, 145] as const) {
        for (let offset = 0; offset < 11; offset += 1) {
          const counter = offset * 12;
          expect(horizontalJumpsVerticalStretchTwiceFrameAtTick(startTick + offset))
            .toMatchObject({
              x2: Math.trunc((counter * 8) / 128) - 8,
              y2: -sin(counter % 128, 8) + 0,
              data2: counter + 12,
              data3: 128,
              data4: 136,
              counter,
              xScale: 256,
              yScale: 256,
              callback: "HorizontalJumpsVerticalStretch_2",
            });
        }
      }
    });

    it("pins both strict callback guards, the repeat carry, and all ten delay callbacks", () => {
      for (const tick of [11, 94] as const) {
        expect(horizontalJumpsVerticalStretchTwiceFrameAtTick(tick)).toMatchObject({
          x2: 7,
          y2: -1,
          data2: 0,
          data3: 0,
          data4: 0,
          animDelay: 0,
          counter: 132,
          callback: "HorizontalJumpsVerticalStretch_1",
        });
      }
      for (const tick of [61, 144] as const) {
        expect(horizontalJumpsVerticalStretchTwiceFrameAtTick(tick)).toMatchObject({
          x2: -9,
          y2: 0,
          data2: 0,
          data3: 128,
          data4: 136,
          animDelay: 0,
          counter: 49,
          xScale: 256,
          yScale: 256,
          callback: "HorizontalJumpsVerticalStretch_2",
        });
      }
      expect(horizontalJumpsVerticalStretchTwiceFrameAtTick(73)).toEqual({
        x2: 0,
        y2: 0,
        data2: 12,
        data3: 0,
        data4: 0,
        animRotation: 0,
        animDelay: 10,
        animRuns: 1,
        animSpeed: 0,
        animData: 1,
        counter: 132,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: false,
        callback: "HorizontalJumpsVerticalStretch_0",
        affineMode: "double",
      });
      for (let tick = 74; tick <= 83; tick += 1) {
        expect(horizontalJumpsVerticalStretchTwiceFrameAtTick(tick)).toMatchObject({
          x2: 0,
          y2: 0,
          data2: 12,
          data3: 0,
          data4: 0,
          animDelay: 83 - tick,
          animRuns: 1,
          counter: 12,
          tryFlipXCalls: 0,
          callback: "HorizontalJumpsVerticalStretch_0",
        });
      }
    });

    it("resets on tick 156 after counter 132, increments to 144, and stays in WaitAnimEnd", () => {
      expect(horizontalJumpsVerticalStretchTwiceFrameAtTick(156)).toEqual({
        x2: 0,
        y2: 0,
        data2: 144,
        data3: 128,
        data4: 136,
        animRotation: 0,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 1,
        counter: 132,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(horizontalJumpsVerticalStretchTwiceFrameAtTick(157)).toEqual(
        horizontalJumpsVerticalStretchTwiceFrameAtTick(156),
      );
      expect(horizontalJumpsVerticalStretchTwiceFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [331, sharpedoScenario, 1, 100, 162, 266],
      [351, spoinkScenario, 0, 50, 110, 199],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (
      species, scenario, challengeNum, trainerId, rangeStart, rangeEnd,
    ) => {
      expect(scenario).toMatchObject({
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum,
        trainerId,
      });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const setId of [...scenario.playerSetIds, ...scenario.opponentSetIds]) {
        expect(setId).toBeGreaterThanOrEqual(rangeStart);
        expect(setId).toBeLessThanOrEqual(rangeEnd);
      }
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "SHARPEDO", sharpedoRunA, sharpedoRunB, sharpedoRawA, sharpedoRawB, 8, 331,
        "beddd02c936693a4e82573b7f4ab965aa0e128af8eb72cf78945e60777864dcf",
      ],
      [
        "SPOINK", spoinkRunA, spoinkRunB, spoinkRawA, spoinkRawB, 10, 351,
        "f5c33bc034669fa7a53240a02bbb7a630f5d1d17f8405baeab87770d03e3eb7b",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species, runA, runB, rawA, rawB, animCmdIndex, data2, rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe(
        "ANIM_H_JUMPS_V_STRETCH_TWICE",
      );
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("regression-pins the single-run terminal and advances only the accepted next selector", () => {
      expect(horizontalJumpsVerticalStretchFrameAtTick(73)).toMatchObject({
        x2: 0,
        y2: 0,
        data2: 144,
        animDelay: 0,
        animRuns: 1,
        animData: -1,
        counter: 132,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      for (const species of [
        ...H_JUMPS_V_STRETCH_FRONT_SPECIES,
        ...H_JUMPS_V_STRETCH_TWICE_FRONT_SPECIES,
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
      expect(selectorTables.frontAnimIds.species.HARIYAMA).toBe("ANIM_ROTATE_UP_TO_SIDES");
      expect(speciesFrontIdleRestOffset("HARIYAMA")).toEqual({ x2: 0, y2: 0 });
      expect(selectorTables.frontAnimIds.species.HAUNTER).toBe("ANIM_FLICKER_INCREASING");
      expect(speciesFrontIdleRestOffset("HAUNTER")).toEqual({ x2: 0, y2: 0 });
    });
  });

  describe("bounceRotateToSidesSlowFrameAtTick (normal Slow source lifecycle)", () => {
    it("derives all 9 selector mappings as Factory-reachable with no outside mappings", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_BOUNCE_ROTATE_TO_SIDES_SLOW")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(BOUNCE_ROTATE_TO_SIDES_SLOW_FRONT_SPECIES).toEqual(generated);
      expect(BOUNCE_ROTATE_TO_SIDES_SLOW_FRONT_SPECIES).toEqual([
        "VILEPLUME", "LUDICOLO", "NOSEPASS", "BARBOACH", "WHISCASH",
        "FEEBAS", "CARVANHA", "CACNEA", "LOUDRED",
      ]);
      expect(BOUNCE_ROTATE_TO_SIDES_SLOW_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(BOUNCE_ROTATE_TO_SIDES_SLOW_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(BOUNCE_ROTATE_TO_SIDES_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of BOUNCE_ROTATE_TO_SIDES_SLOW_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins the complete two-speed source table and normal/SmallSlow initializer distinction", () => {
      expect(BOUNCE_ROTATE_TO_SIDES_DATA).toEqual([
        [
          [0, 8, 8], [8, -8, 12], [-8, 8, 12], [8, -8, 12],
          [-8, 8, 12], [8, -8, 12], [-8, 0, 12], [0, 0, 0],
        ],
        [
          [0, 8, 16], [8, -8, 24], [-8, 8, 24], [8, -8, 24],
          [-8, 8, 24], [8, -8, 24], [-8, 0, 24], [0, 0, 0],
        ],
      ]);
      expect(BOUNCE_ROTATE_TO_SIDES_VARIANTS).toEqual({
        normal: { data6: 0, rotation: 4096 },
        small: { data6: 0, rotation: 2048 },
        slow: { data6: 1, rotation: 4096 },
        smallSlow: { data6: 1, rotation: 2048 },
      });
    });

    it("pins AddNewAnim defaults, Slow overrides, affine start, and normal-front flips", () => {
      expect(bounceRotateToSidesSlowFrameAtTick(0)).toEqual({
        x2: 0,
        y2: 0,
        data2: 1,
        data3: 1,
        data4: 0,
        data6: 1,
        animRotation: 4096,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 1,
        legIndex: 0,
        legStartX: 0,
        legEndX: 8,
        legDuration: 16,
        legProgress: 0,
        affineRotationU16: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: true,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: false,
        callback: "BounceRotateToSides",
        affineMode: "double",
      });
    });

    it("pins all 167 active writes with C truncation, u16 rotation, and every leg boundary", () => {
      const slowLegs = BOUNCE_ROTATE_TO_SIDES_DATA[1]!;
      let tick = 0;
      for (let legIndex = 0; legIndex < 7; legIndex += 1) {
        const [startX, endX, duration] = slowLegs[legIndex]!;
        for (let progress = 0; progress <= duration; progress += 1) {
          const expectedX = Math.trunc(((endX - startX) * progress) / duration) + startX;
          const sineIndex = Math.trunc((progress * 128) / duration);
          const expectedY = -Math.floor((10 * GBA_SINE_TABLE_256[sineIndex]!) / 256) + 0;
          const expectedRotation = Math.trunc((-(4096 * expectedX)) / 8) & 0xffff;
          const frame = bounceRotateToSidesSlowFrameAtTick(tick);
          expect(frame, `tick ${tick}`).toMatchObject({
            x2: expectedX,
            y2: expectedY,
            data2: 1,
            data3: progress === duration ? 0 : progress + 1,
            data4: progress === duration ? legIndex + 1 : legIndex,
            data6: 1,
            animRotation: 4096,
            animData: 1,
            legIndex,
            legStartX: startX,
            legEndX: endX,
            legDuration: duration,
            legProgress: progress,
            affineRotationU16: expectedRotation,
            xScale: 256,
            yScale: 256,
            startedAffine: tick === 0,
            normalFrontDontFlip: true,
            tryFlipXCalls: 2,
            resetSpriteAfterAnim: false,
            callback: "BounceRotateToSides",
            affineMode: "double",
          });
          tick += 1;
        }
      }
      expect(tick).toBe(167);

      // Negative delta / positive x proves signed division truncates toward
      // zero; the two signs prove assignment into the source's u16 rotation.
      expect(bounceRotateToSidesSlowFrameAtTick(18)).toMatchObject({
        x2: 8,
        affineRotationU16: 61440,
      });
      expect(bounceRotateToSidesSlowFrameAtTick(41)).toMatchObject({
        x2: -8,
        affineRotationU16: 4096,
        data3: 0,
        data4: 2,
      });

      expect([16, 41, 66, 91, 116, 141, 166].map((boundary) => {
        const frame = bounceRotateToSidesSlowFrameAtTick(boundary)!;
        return [boundary, frame.legIndex, frame.legProgress, frame.x2, frame.y2,
          frame.data3, frame.data4, frame.affineRotationU16];
      })).toEqual([
        [16, 0, 16, 8, 0, 0, 1, 61440],
        [41, 1, 24, -8, 0, 0, 2, 4096],
        [66, 2, 24, 8, 0, 0, 3, 61440],
        [91, 3, 24, -8, 0, 0, 4, 4096],
        [116, 4, 24, 8, 0, 0, 5, 61440],
        [141, 5, 24, -8, 0, 0, 6, 4096],
        [166, 6, 24, 0, 0, 0, 7, 0],
      ]);
    });

    it("pins the sentinel terminal identity/reset/WaitAnimEnd state", () => {
      expect(bounceRotateToSidesSlowFrameAtTick(167)).toEqual({
        x2: 0,
        y2: 0,
        data2: 1,
        data3: 0,
        data4: 7,
        data6: 1,
        animRotation: 4096,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 1,
        legIndex: 7,
        legStartX: 0,
        legEndX: 0,
        legDuration: 0,
        legProgress: 0,
        affineRotationU16: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(bounceRotateToSidesSlowFrameAtTick(168)).toEqual(
        bounceRotateToSidesSlowFrameAtTick(167),
      );
      expect(bounceRotateToSidesSlowFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [45, vileplumeScenario],
      [371, loudredScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "VILEPLUME", vileplumeRunA, vileplumeRunB, vileplumeRawA, vileplumeRawB, 4, 45,
        "891884d74ae18521c3e4963b01d290653f988cdbe5045e87c3860bd847cfd2f2",
      ],
      [
        "LOUDRED", loudredRunA, loudredRunB, loudredRawA, loudredRawB, 4, 371,
        "f0dadc0c0711f44386e832a5f2ea862e967096fe27b56686bdc53ff210e9c3bc",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      animCmdIndex,
      data2,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe(
        "ANIM_BOUNCE_ROTATE_TO_SIDES_SLOW",
      );
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves all previously accepted representative and sibling families", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT", "VILEPLUME", "LOUDRED",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("bounceRotateToSidesSmallFrameAtTick (Small normal-speed source lifecycle)", () => {
    it("derives all 8 selector mappings as Factory-reachable with no outside mappings", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(BOUNCE_ROTATE_TO_SIDES_SMALL_FRONT_SPECIES).toEqual(generated);
      expect(BOUNCE_ROTATE_TO_SIDES_SMALL_FRONT_SPECIES).toEqual([
        "JIGGLYPUFF", "PRIMEAPE", "GEODUDE", "GRAVELER",
        "FARFETCHD", "CUBONE", "TANGELA", "GYARADOS",
      ]);
      expect(BOUNCE_ROTATE_TO_SIDES_SMALL_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(BOUNCE_ROTATE_TO_SIDES_SMALL_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(BOUNCE_ROTATE_TO_SIDES_SMALL_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of BOUNCE_ROTATE_TO_SIDES_SMALL_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins the complete source table and all normal/Small/Slow/SmallSlow selectors", () => {
      expect(BOUNCE_ROTATE_TO_SIDES_DATA).toEqual([
        [
          [0, 8, 8], [8, -8, 12], [-8, 8, 12], [8, -8, 12],
          [-8, 8, 12], [8, -8, 12], [-8, 0, 12], [0, 0, 0],
        ],
        [
          [0, 8, 16], [8, -8, 24], [-8, 8, 24], [8, -8, 24],
          [-8, 8, 24], [8, -8, 24], [-8, 0, 24], [0, 0, 0],
        ],
      ]);
      expect(BOUNCE_ROTATE_TO_SIDES_VARIANTS).toEqual({
        normal: { data6: 0, rotation: 4096 },
        small: { data6: 0, rotation: 2048 },
        slow: { data6: 1, rotation: 4096 },
        smallSlow: { data6: 1, rotation: 2048 },
      });
    });

    it("pins AddNewAnim defaults, Small overrides, affine start, and normal-front flips", () => {
      expect(bounceRotateToSidesSmallFrameAtTick(0)).toEqual({
        x2: 0,
        y2: 0,
        data2: 1,
        data3: 1,
        data4: 0,
        data6: 0,
        animRotation: 2048,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 0,
        legIndex: 0,
        legStartX: 0,
        legEndX: 8,
        legDuration: 8,
        legProgress: 0,
        affineRotationU16: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: true,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: false,
        callback: "BounceRotateToSides",
        affineMode: "double",
      });
    });

    it("pins all 87 active writes with C truncation, u16 rotation, and every leg boundary", () => {
      const normalSpeedLegs = BOUNCE_ROTATE_TO_SIDES_DATA[0]!;
      let tick = 0;
      for (let legIndex = 0; legIndex < 7; legIndex += 1) {
        const [startX, endX, duration] = normalSpeedLegs[legIndex]!;
        for (let progress = 0; progress <= duration; progress += 1) {
          const expectedX = Math.trunc(((endX - startX) * progress) / duration) + startX;
          const sineIndex = Math.trunc((progress * 128) / duration);
          const expectedY = -Math.floor((10 * GBA_SINE_TABLE_256[sineIndex]!) / 256) + 0;
          const expectedRotation = Math.trunc((-(2048 * expectedX)) / 8) & 0xffff;
          const frame = bounceRotateToSidesSmallFrameAtTick(tick);
          expect(frame, `tick ${tick}`).toMatchObject({
            x2: expectedX,
            y2: expectedY,
            data2: 1,
            data3: progress === duration ? 0 : progress + 1,
            data4: progress === duration ? legIndex + 1 : legIndex,
            data6: 0,
            animRotation: 2048,
            animDelay: 0,
            animRuns: 1,
            animSpeed: 0,
            animData: 0,
            legIndex,
            legStartX: startX,
            legEndX: endX,
            legDuration: duration,
            legProgress: progress,
            affineRotationU16: expectedRotation,
            xScale: 256,
            yScale: 256,
            startedAffine: tick === 0,
            normalFrontDontFlip: true,
            tryFlipXCalls: 2,
            resetSpriteAfterAnim: false,
            callback: "BounceRotateToSides",
            affineMode: "double",
          });
          tick += 1;
        }
      }
      expect(tick).toBe(87);

      expect([8, 21, 34, 47, 60, 73, 86].map((boundary) => {
        const frame = bounceRotateToSidesSmallFrameAtTick(boundary)!;
        return [boundary, frame.legIndex, frame.legProgress, frame.x2, frame.y2,
          frame.data3, frame.data4, frame.affineRotationU16];
      })).toEqual([
        [8, 0, 8, 8, 0, 0, 1, 63488],
        [21, 1, 12, -8, 0, 0, 2, 2048],
        [34, 2, 12, 8, 0, 0, 3, 63488],
        [47, 3, 12, -8, 0, 0, 4, 2048],
        [60, 4, 12, 8, 0, 0, 5, 63488],
        [73, 5, 12, -8, 0, 0, 6, 2048],
        [86, 6, 12, 0, 0, 0, 7, 0],
      ]);
    });

    it("pins tick 87 sentinel identity/reset/WaitAnimEnd cleanup", () => {
      expect(bounceRotateToSidesSmallFrameAtTick(87)).toEqual({
        x2: 0,
        y2: 0,
        data2: 1,
        data3: 0,
        data4: 7,
        data6: 0,
        animRotation: 2048,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 0,
        legIndex: 7,
        legStartX: 0,
        legEndX: 0,
        legDuration: 0,
        legProgress: 0,
        affineRotationU16: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(bounceRotateToSidesSmallFrameAtTick(88)).toEqual(
        bounceRotateToSidesSmallFrameAtTick(87),
      );
      expect(bounceRotateToSidesSmallFrameAtTick(-1)).toBeNull();
    });

    it("preserves Slow and distinguishes SmallSlow through the shared reducer", () => {
      expect(bounceRotateToSidesSlowFrameAtTick(0)).toMatchObject({
        data6: 1,
        animRotation: 4096,
        animData: 1,
        legDuration: 16,
      });
      expect(bounceRotateToSidesSmallSlowFrameAtTick(0)).toMatchObject({
        data6: 1,
        animRotation: 2048,
        animData: 1,
        legDuration: 16,
      });
      expect(bounceRotateToSidesSmallSlowFrameAtTick(167)).toMatchObject({
        data6: 1,
        animRotation: 2048,
        animData: 1,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
    });

    it.each([
      [39, jigglypuffScenario],
      [130, gyaradosScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "JIGGLYPUFF", jigglypuffRunA, jigglypuffRunB, jigglypuffRawA, jigglypuffRawB, 4, 39,
        "bb3d61bffa2354eac237e0bbdf6ed46ae03a14420ce80da7477ec40d5c0a1ba2",
      ],
      [
        "GYARADOS", gyaradosRunA, gyaradosRunB, gyaradosRawA, gyaradosRawB, 2, 130,
        "2642520d74a64f6b47f6cd472e2e9d5e20d75a32e6416c44e218bfd79cdcee74",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      animCmdIndex,
      data2,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe(
        "ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL",
      );
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves all previously accepted representative and sibling families", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT", "VILEPLUME", "LOUDRED",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("bounceRotateToSidesSmallSlowFrameAtTick (SmallSlow source lifecycle)", () => {
    it("derives the complete 2-mapping Factory census with zero outside mappings", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW_FRONT_SPECIES).toEqual(generated);
      expect(BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW_FRONT_SPECIES).toEqual([
        "CLEFABLE", "AZUMARILL",
      ]);
      expect(BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of generated) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins task zeroing, SmallSlow -> Small -> AddNewAnim source-order initialization", () => {
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
      expect(BOUNCE_ROTATE_TO_SIDES_VARIANTS).toEqual({
        normal: { data6: 0, rotation: 4096 },
        small: { data6: 0, rotation: 2048 },
        slow: { data6: 1, rotation: 4096 },
        smallSlow: { data6: 1, rotation: 2048 },
      });
      expect(bounceRotateToSidesSmallSlowFrameAtTick(0)).toEqual({
        x2: 0,
        y2: 0,
        data2: 1,
        data3: 1,
        data4: 0,
        data6: 1,
        animRotation: 2048,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 1,
        legIndex: 0,
        legStartX: 0,
        legEndX: 8,
        legDuration: 16,
        legProgress: 0,
        affineRotationU16: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: true,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: false,
        callback: "BounceRotateToSides",
        affineMode: "double",
      });
    });

    it("pins all 167 shared callbacks with exact C/GBA arithmetic and leg boundaries", () => {
      const slowLegs = BOUNCE_ROTATE_TO_SIDES_DATA[1]!;
      let tick = 0;
      for (let legIndex = 0; legIndex < 7; legIndex += 1) {
        const [startX, endX, duration] = slowLegs[legIndex]!;
        for (let progress = 0; progress <= duration; progress += 1) {
          const expectedX = Math.trunc(((endX - startX) * progress) / duration) + startX;
          const sineIndex = Math.trunc((progress * 128) / duration);
          const expectedY = -Math.floor((10 * GBA_SINE_TABLE_256[sineIndex]!) / 256) + 0;
          const expectedRotation = Math.trunc((-(2048 * expectedX)) / 8) & 0xffff;
          expect(bounceRotateToSidesSmallSlowFrameAtTick(tick), `tick ${tick}`).toEqual({
            x2: expectedX,
            y2: expectedY,
            data2: 1,
            data3: progress === duration ? 0 : progress + 1,
            data4: progress === duration ? legIndex + 1 : legIndex,
            data6: 1,
            animRotation: 2048,
            animDelay: 0,
            animRuns: 1,
            animSpeed: 0,
            animData: 1,
            legIndex,
            legStartX: startX,
            legEndX: endX,
            legDuration: duration,
            legProgress: progress,
            affineRotationU16: expectedRotation,
            xScale: 256,
            yScale: 256,
            startedAffine: tick === 0,
            normalFrontDontFlip: true,
            tryFlipXCalls: 2,
            resetSpriteAfterAnim: false,
            callback: "BounceRotateToSides",
            affineMode: "double",
          });
          tick += 1;
        }
      }
      expect(tick).toBe(167);
      expect([16, 41, 66, 91, 116, 141, 166].map((boundary) => {
        const frame = bounceRotateToSidesSmallSlowFrameAtTick(boundary)!;
        return [boundary, frame.legIndex, frame.legProgress, frame.x2, frame.y2,
          frame.data3, frame.data4, frame.affineRotationU16];
      })).toEqual([
        [16, 0, 16, 8, 0, 0, 1, 63488],
        [41, 1, 24, -8, 0, 0, 2, 2048],
        [66, 2, 24, 8, 0, 0, 3, 63488],
        [91, 3, 24, -8, 0, 0, 4, 2048],
        [116, 4, 24, 8, 0, 0, 5, 63488],
        [141, 5, 24, -8, 0, 0, 6, 2048],
        [166, 6, 24, 0, 0, 0, 7, 0],
      ]);
    });

    it("pins strict sentinel identity/reset/WaitAnimEnd and stable terminal state", () => {
      const terminal = {
        x2: 0,
        y2: 0,
        data2: 1,
        data3: 0,
        data4: 7,
        data6: 1,
        animRotation: 2048,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 1,
        legIndex: 7,
        legStartX: 0,
        legEndX: 0,
        legDuration: 0,
        legProgress: 0,
        affineRotationU16: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      } as const;
      expect(bounceRotateToSidesSmallSlowFrameAtTick(167)).toEqual(terminal);
      expect(bounceRotateToSidesSmallSlowFrameAtTick(168)).toEqual(terminal);
      expect(bounceRotateToSidesSmallSlowFrameAtTick(1000)).toEqual(terminal);
      expect(bounceRotateToSidesSmallSlowFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [36, [118, 104, 115, 266], clefableScenario],
      [184, [61, 263, 91, 182], azumarillScenario],
    ] as const)("stages a complete legal challenge-0 Scene-ON party for species %i", (
      species,
      moves,
      scenario,
    ) => {
      expect(scenario).toMatchObject({
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 0,
        trainerId: 50,
      });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species, moves });
      for (const setId of [...scenario.playerSetIds, ...scenario.opponentSetIds]) {
        expect(setId).toBeGreaterThanOrEqual(110);
        expect(setId).toBeLessThanOrEqual(199);
      }
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "CLEFABLE", clefableRunA, clefableRunB, clefableRawA, clefableRawB,
        36, 5, 372, "62a1979f9af10ce6a6914651bc03407de755e30162594e04527e4e832f943ea4",
      ],
      [
        "AZUMARILL", azumarillRunA, azumarillRunB, azumarillRawA, azumarillRawB,
        184, 4, 373, "908422f7084676cdceda114470205e152976a243fa1d131533685acfbb57b0c7",
      ],
    ] as const)("matches paired byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      speciesId,
      animCmdIndex,
      rawBytes,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA).toHaveLength(rawBytes);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe(
        "ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW",
      );
      expect(runA.ticks[0]!.battler1).toMatchObject({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2: speciesId,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({
        x2: runA.ticks[0]!.battler1.x2,
        y2: runA.ticks[0]!.battler1.y2,
      }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("regression-pins normal, Slow, and Small siblings and derives ZigzagSlow next", () => {
      expect(bounceRotateToSidesFrameAtTick(0)).toMatchObject({
        data6: 0, animRotation: 4096, animData: 0, legDuration: 8,
      });
      expect(bounceRotateToSidesSlowFrameAtTick(0)).toMatchObject({
        data6: 1, animRotation: 4096, animData: 1, legDuration: 16,
      });
      expect(bounceRotateToSidesSmallFrameAtTick(0)).toMatchObject({
        data6: 0, animRotation: 2048, animData: 0, legDuration: 8,
      });
      expect(bounceRotateToSidesFrameAtTick(87)!.callback).toBe("WaitAnimEnd");
      expect(bounceRotateToSidesSlowFrameAtTick(167)!.callback).toBe("WaitAnimEnd");
      expect(bounceRotateToSidesSmallFrameAtTick(87)!.callback).toBe("WaitAnimEnd");
      const nextGenerated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_ZIGZAG_SLOW")
        .map(([species]) => species);
      expect(nextGenerated).toEqual(["VENOMOTH", "KINGLER", "FLYGON"]);
      for (const species of nextGenerated) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("zigzagSlowFrameAtTick (slow source lifecycle)", () => {
    it("derives the exhaustive three-species Factory census", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_ZIGZAG_SLOW")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(ZIGZAG_SLOW_FRONT_SPECIES).toEqual(generated);
      expect(generated).toEqual(["VENOMOTH", "KINGLER", "FLYGON"]);
      expect(ZIGZAG_SLOW_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(ZIGZAG_SLOW_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(ZIGZAG_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of generated) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins source data, alternating wrapper gates, every movement, and terminal tick 108", () => {
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
      expect(ZIGZAG_DATA).toEqual([
        [-1, -1, 6], [2, 0, 6], [-2, 2, 6], [2, 0, 6], [-2, -2, 6],
        [2, 0, 6], [-2, 2, 6], [2, 0, 6], [-1, -1, 6], [0, 0, 0],
      ]);
      expect(zigzagSlowFrameAtTick(-1)).toBeNull();
      expect(zigzagSlowFrameAtTick(0)).toEqual({
        x2: -1, y2: -1, data0: 1, data2: 1, data3: 0, moved: true,
        normalFrontDontFlip: true, tryFlipXCalls: 2, callback: "Anim_ZigzagSlow",
      });
      for (let tick = 0; tick < 108; tick += 1) {
        const frame = zigzagSlowFrameAtTick(tick)!;
        expect(frame.callback, `tick ${tick}`).toBe("Anim_ZigzagSlow");
        expect(frame.moved, `tick ${tick}`).toBe(tick % 2 === 0);
        expect(frame.tryFlipXCalls, `tick ${tick}`).toBe(tick % 2 === 0 ? 2 : 0);
        expect(frame.data0, `tick ${tick}`).toBe(tick % 2 === 0 ? 1 : 0);
      }
      expect(zigzagSlowFrameAtTick(108)).toEqual({
        x2: 0, y2: 0, data0: 1, data2: 0, data3: 9, moved: false,
        normalFrontDontFlip: true, tryFlipXCalls: 1, callback: "WaitAnimEnd",
      });
      expect(zigzagSlowFrameAtTick(200)).toEqual({
        x2: 0, y2: 0, data0: 1, data2: 0, data3: 9, moved: false,
        normalFrontDontFlip: true, tryFlipXCalls: 0, callback: "WaitAnimEnd",
      });
      expect([10, 12, 22, 24, 106].map((tick) => [tick, zigzagSlowFrameAtTick(tick)])).toEqual([
        [10, expect.objectContaining({ x2: -6, y2: -6, data2: 6, data3: 0 })],
        [12, expect.objectContaining({ x2: -4, y2: -6, data2: 1, data3: 1 })],
        [22, expect.objectContaining({ x2: 6, y2: -6, data2: 6, data3: 1 })],
        [24, expect.objectContaining({ x2: 4, y2: -4, data2: 1, data3: 2 })],
        [106, expect.objectContaining({ x2: 0, y2: 0, data2: 6, data3: 8 })],
      ]);
    });
  });

  describe("verticalShakeTwiceFrameAtTick (normal source lifecycle)", () => {
    it("derives all 8 selector mappings as Factory-reachable with no outside mappings", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_V_SHAKE_TWICE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(V_SHAKE_TWICE_FRONT_SPECIES).toEqual(generated);
      expect(V_SHAKE_TWICE_FRONT_SPECIES).toEqual([
        "BLASTOISE", "POLIWRATH", "TAUROS", "DONPHAN",
        "EXPLOUD", "AGGRON", "CRADILY", "BAGON",
      ]);
      expect(V_SHAKE_TWICE_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(V_SHAKE_TWICE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(V_SHAKE_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of V_SHAKE_TWICE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins Task_HandleMonAnimation defaults, the complete u8 table, and initializer distinction", () => {
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
      expect(VERTICAL_SHAKE_TWICE_DATA).toEqual([
        [6, 30],
        [254, 15],
        [6, 30],
        [255, 0],
      ]);
      expect(VERTICAL_SHAKE_TWICE_INITIALIZERS).toEqual({
        normal: { selector: "ANIM_V_SHAKE_TWICE", data0: 48, used: true },
        slow: { selector: "ANIM_V_SHAKE_TWICE_SLOW", data0: 24, used: false },
      });
      expect(Object.values(selectorTables.frontAnimIds.species)).not.toContain(
        "ANIM_V_SHAKE_TWICE_SLOW",
      );
      expect(verticalShakeTwiceFrameAtTick(0)).toMatchObject({
        data0: 48,
        data2: 48,
        data3: 0,
        data4: 0,
        data5: 0,
        data6: 1,
        data7: 0,
      });
    });

    it("pins all 78 active callbacks, u8 casts, amplitudes, sine writes, and phase resets", () => {
      let tick = 0;
      let expectedData2 = 0;
      for (let phase = 0; phase < 3; phase += 1) {
        const [var5, var6] = VERTICAL_SHAKE_TWICE_DATA[phase]!;
        for (let var7 = 0; var7 <= var6; var7 += 1) {
          const index = expectedData2 & 0xff;
          const amplitude = var5 === 254
            ? 0
            : Math.trunc(((var6 - var7) * var5) / var6) & 0xff;
          const expectedY = Math.floor(
            (amplitude * GBA_SINE_TABLE_256[index]!) / 256,
          ) + 0;
          const boundary = var7 === var6;
          if (!boundary) expectedData2 += 48;

          expect(verticalShakeTwiceFrameAtTick(tick), `tick ${tick}`).toEqual({
            x2: 0,
            y2: expectedY,
            data0: 48,
            data2: expectedData2,
            data3: 0,
            data4: 0,
            data5: boundary ? phase + 1 : phase,
            data6: boundary ? 0 : var7 + 1,
            data7: 0,
            index,
            var5: var5 & 0xff,
            var6: var6 & 0xff,
            var7: var7 & 0xff,
            amplitude,
            callback: "VerticalShakeTwice",
          });
          tick += 1;
        }
      }
      expect(tick).toBe(78);
      expect(expectedData2).toBe(3600);

      expect([30, 46, 77].map((boundaryTick) => {
        const frame = verticalShakeTwiceFrameAtTick(boundaryTick)!;
        return [
          boundaryTick, frame.index, frame.var5, frame.var6, frame.var7,
          frame.amplitude, frame.y2, frame.data2, frame.data5, frame.data6,
        ];
      })).toEqual([
        [30, 160, 6, 30, 30, 0, 0, 1440, 1, 0],
        [46, 112, 254, 15, 15, 0, 0, 2160, 2, 0],
        [77, 16, 6, 30, 30, 0, 0, 3600, 3, 0],
      ]);
    });

    it("pins tick 78 sentinel division result and terminal y2/WaitAnimEnd cleanup", () => {
      expect(verticalShakeTwiceFrameAtTick(78)).toEqual({
        x2: 0,
        y2: 0,
        data0: 48,
        data2: 3600,
        data3: 0,
        data4: 0,
        data5: 3,
        data6: 0,
        data7: 0,
        index: 16,
        var5: 255,
        var6: 0,
        var7: 0,
        amplitude: 0,
        callback: "WaitAnimEnd",
      });
      expect(verticalShakeTwiceFrameAtTick(79)).toEqual(verticalShakeTwiceFrameAtTick(78));
      expect(verticalShakeTwiceFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [9, blastoiseScenario],
      [395, bagonScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "BLASTOISE", blastoiseRunA, blastoiseRunB, blastoiseRawA, blastoiseRawB, 9,
        "333c436ec56ad12d0d8d3586f86af7f4feb076a5234a646c194f6705ab826a87",
      ],
      [
        "BAGON", bagonRunA, bagonRunB, bagonRawA, bagonRawB, 395,
        "9accac67bde9270bfe8898e45ea5160783fc08dc47fcfbd0d8fea1ca995fdf16",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      data2,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_SHAKE_TWICE");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex: 4,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted representative and sibling family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT", "VILEPLUME", "LOUDRED", "JIGGLYPUFF", "GYARADOS",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("verticalSlideWobbleFrameAtTick (normal source lifecycle)", () => {
    it("derives all 8 selector mappings as Factory-reachable with no outside mappings", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_V_SLIDE_WOBBLE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(V_SLIDE_WOBBLE_FRONT_SPECIES).toEqual(generated);
      expect(V_SLIDE_WOBBLE_FRONT_SPECIES).toEqual([
        "SEAKING", "HOPPIP", "MISDREAVUS", "SHEDINJA",
        "PELIPPER", "WAILORD", "GOREBYSS", "SHUPPET",
      ]);
      expect(V_SLIDE_WOBBLE_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(V_SLIDE_WOBBLE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(V_SLIDE_WOBBLE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of V_SLIDE_WOBBLE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins zeroed task data, normal data0=10, and the unaccepted Small data0=5 sibling", () => {
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
      expect(VERTICAL_SLIDE_WOBBLE_INITIALIZERS).toEqual({
        normal: { selector: "ANIM_V_SLIDE_WOBBLE", data0: 10, accepted: true },
        small: { selector: "ANIM_V_SLIDE_WOBBLE_SMALL", data0: 5, accepted: false },
      });
      expect(Object.values(selectorTables.frontAnimIds.species)).toContain(
        "ANIM_V_SLIDE_WOBBLE_SMALL",
      );
      expect(speciesFrontIdleRestOffset("OMANYTE")).toBeNull();
      expect(verticalSlideWobbleFrameAtTick(0)).toMatchObject({
        data0: 10,
        data2: 1,
        startedAffine: true,
        normalFrontDontFlip: true,
      });
    });

    it("pins all 101 active index, y2, and signed-to-u16 affine writes", () => {
      const active = Array.from({ length: 101 }, (_, tick) => {
        const frame = verticalSlideWobbleFrameAtTick(tick)!;
        const index = Math.trunc((tick * 256) / 100);
        const varBeforeMask = Math.trunc((tick * 512) / 100);
        const wobbleIndex = varBeforeMask & 0xff;
        const y2 = Math.floor((10 * GBA_SINE_TABLE_256[index & 0xff]!) / 256) + 0;
        const rotationSigned = Math.floor(
          (3276 * GBA_SINE_TABLE_256[wobbleIndex]!) / 256,
        );
        expect(frame, `tick ${tick}`).toEqual({
          x2: 0,
          y2,
          data0: 10,
          data2: tick + 1,
          index,
          varBeforeMask,
          wobbleIndex,
          rotationSigned,
          affineRotation: rotationSigned & 0xffff,
          xScale: 256,
          yScale: 256,
          startedAffine: tick === 0,
          normalFrontDontFlip: true,
          resetSpriteAfterAnim: false,
          callback: "VerticalSlideWobble",
          affineMode: "double",
        });
        return frame;
      });

      expect(active).toHaveLength(101);
      expect([0, 25, 50, 75, 100].map((tick) => {
        const frame = active[tick]!;
        return [
          tick, frame.index, frame.varBeforeMask, frame.wobbleIndex,
          frame.y2, frame.rotationSigned, frame.affineRotation, frame.data2,
        ];
      })).toEqual([
        [0, 0, 0, 0, 0, 0, 0, 1],
        [25, 64, 128, 128, 10, 0, 0, 26],
        [50, 128, 256, 0, 0, 0, 0, 51],
        [75, 192, 384, 128, -10, 0, 0, 76],
        [100, 256, 512, 0, 0, 0, 0, 101],
      ]);

      const negativeRotation = active.find((frame) => frame.rotationSigned < 0)!;
      expect(negativeRotation.affineRotation).toBe(negativeRotation.rotationSigned + 0x10000);
    });

    it("pins tick 101 identity/y2/reset/WaitAnimEnd terminal cleanup", () => {
      expect(verticalSlideWobbleFrameAtTick(101)).toEqual({
        x2: 0,
        y2: 0,
        data0: 10,
        data2: 102,
        index: null,
        varBeforeMask: null,
        wobbleIndex: null,
        rotationSigned: 0,
        affineRotation: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        normalFrontDontFlip: true,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(verticalSlideWobbleFrameAtTick(102)).toEqual(verticalSlideWobbleFrameAtTick(101));
      expect(verticalSlideWobbleFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [119, seakingScenario],
      [377, shuppetScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "SEAKING", seakingRunA, seakingRunB, seakingRawA, seakingRawB, 119, 4,
        "06751f507c7530342cd859a0b16d8830b55a2ce2f52d82e6857ea13b25c1381b",
      ],
      [
        "SHUPPET", shuppetRunA, shuppetRunB, shuppetRawA, shuppetRawB, 377, 6,
        "3f180c13952503be637c5aaa329a8121ef3eaf0d1098c664e15fe381d11502ef",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      data2,
      animCmdIndex,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_SLIDE_WOBBLE");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted representative and sibling family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT", "VILEPLUME", "LOUDRED", "JIGGLYPUFF", "GYARADOS",
        "BLASTOISE", "BAGON",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("horizontalSlideWobbleFrameAtTick (source lifecycle)", () => {
    it("derives exactly all 8 selector mappings as Factory-reachable with zero outside", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_H_SLIDE_WOBBLE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(H_SLIDE_WOBBLE_FRONT_SPECIES).toEqual(generated);
      expect(H_SLIDE_WOBBLE_FRONT_SPECIES).toEqual([
        "BUTTERFREE", "GOLBAT", "CLOYSTER", "KABUTO",
        "BALTOY", "LUVDISC", "CASTFORM", "CHIMECHO",
      ]);
      expect(H_SLIDE_WOBBLE_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(H_SLIDE_WOBBLE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(H_SLIDE_WOBBLE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of H_SLIDE_WOBBLE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins zeroed task data, tick-0 affine start, and both normal-front flip no-ops", () => {
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
      expect(horizontalSlideWobbleFrameAtTick(0)).toMatchObject({
        data0: 0,
        data2: 1,
        x2: 0,
        y2: 0,
        startedAffine: true,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
      });
    });

    it("pins every active callback's source-order index, x2, rotation, and increment", () => {
      const active = Array.from({ length: 101 }, (_, tick) => {
        const frame = horizontalSlideWobbleFrameAtTick(tick)!;
        const index = Math.trunc((tick * 256) / 100);
        const varBeforeMask = Math.trunc((tick * 512) / 100);
        const wobbleIndex = varBeforeMask & 0xff;
        const x2 = Math.floor((8 * GBA_SINE_TABLE_256[index & 0xff]!) / 256) + 0;
        const rotationSigned = Math.floor(
          (3276 * GBA_SINE_TABLE_256[wobbleIndex]!) / 256,
        );
        expect(frame, `tick ${tick}`).toEqual({
          x2,
          y2: 0,
          data0: 0,
          data2: tick + 1,
          index,
          varBeforeMask,
          wobbleIndex,
          rotationSigned,
          affineRotation: rotationSigned & 0xffff,
          xScale: 256,
          yScale: 256,
          startedAffine: tick === 0,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          resetSpriteAfterAnim: false,
          callback: "HorizontalSlideWobble",
          affineMode: "double",
        });
        return frame;
      });

      expect(active).toHaveLength(101);
      expect([0, 25, 50, 75, 100].map((tick) => {
        const frame = active[tick]!;
        return [
          tick, frame.index, frame.varBeforeMask, frame.wobbleIndex,
          frame.x2, frame.rotationSigned, frame.affineRotation, frame.data2,
        ];
      })).toEqual([
        [0, 0, 0, 0, 0, 0, 0, 1],
        [25, 64, 128, 128, 8, 0, 0, 26],
        [50, 128, 256, 0, 0, 0, 0, 51],
        [75, 192, 384, 128, -8, 0, 0, 76],
        [100, 256, 512, 0, 0, 0, 0, 101],
      ]);
      const negativeRotation = active.find((frame) => frame.rotationSigned < 0)!;
      expect(negativeRotation.affineRotation).toBe(negativeRotation.rotationSigned + 0x10000);
    });

    it("generalizes the existing source-faithful KABUTO reducer without arithmetic drift", () => {
      for (let tick = 0; tick <= 100; tick += 1) {
        const generic = horizontalSlideWobbleFrameAtTick(tick)!;
        const displayElapsed = KABUTO_FRONT_ANIM_START_OFFSET + (tick === 0 ? 0 : tick + 1);
        const kabuto = kabutoHSlideWobble(displayElapsed);
        expect(kabuto.callback, `tick ${tick}`).toBe(tick);
        expect({ x2: kabuto.x2, rotation: kabuto.rotation }, `tick ${tick}`).toEqual({
          x2: generic.x2,
          rotation: generic.affineRotation,
        });
      }
    });

    it("pins tick 101 identity/x2/reset/WaitAnimEnd cleanup and final increment", () => {
      expect(horizontalSlideWobbleFrameAtTick(101)).toEqual({
        x2: 0,
        y2: 0,
        data0: 0,
        data2: 102,
        index: null,
        varBeforeMask: null,
        wobbleIndex: null,
        rotationSigned: 0,
        affineRotation: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(horizontalSlideWobbleFrameAtTick(102)).toEqual(
        horizontalSlideWobbleFrameAtTick(101),
      );
      expect(horizontalSlideWobbleFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [12, butterfreeScenario],
      [358, chimechoScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "BUTTERFREE", butterfreeRunA, butterfreeRunB, butterfreeRawA, butterfreeRawB, 12, 12,
        "6e578f80ba3c04fe2048ff3ecc0ae2788dce350239907594d7bd01c30ea4961d",
      ],
      [
        "CHIMECHO", chimechoRunA, chimechoRunB, chimechoRawA, chimechoRawB, 358, 6,
        "a6bda637cc6e6993afce75b7f934113a1ffd5db5d5cd44f77072114c6929a2be",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      data2,
      animCmdIndex,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_H_SLIDE_WOBBLE");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted representative and sibling family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT", "VILEPLUME", "LOUDRED", "JIGGLYPUFF", "GYARADOS",
        "BLASTOISE", "BAGON", "SEAKING", "SHUPPET", "BUTTERFREE", "CHIMECHO",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("horizontalJumpsFrameAtTick (source lifecycle)", () => {
    it("derives exactly all 8 selector mappings as Factory-reachable with zero outside", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_H_JUMPS")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(H_JUMPS_FRONT_SPECIES).toEqual(generated);
      expect(H_JUMPS_FRONT_SPECIES).toEqual([
        "WIGGLYTUFF", "ABRA", "MACHAMP", "TOTODILE",
        "NATU", "SMEARGLE", "SPINDA", "VIGOROTH",
      ]);
      expect(H_JUMPS_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(H_JUMPS_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(H_JUMPS_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of H_JUMPS_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins zeroed task data and both normal-front flip no-ops", () => {
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
      expect(horizontalJumpsFrameAtTick(0)).toEqual({
        x2: 0,
        y2: 0,
        data0: 0,
        data2: 12,
        counter: 0,
        divCounter: 0,
        remainder: 0,
        sineIndex: 0,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        callback: "Anim_HorizontalJumps",
      });
    });

    it("pins every active callback in exact source order across all four switch legs", () => {
      const active = Array.from({ length: 43 }, (_, tick) => {
        const counter = tick * 12;
        const divCounter = Math.trunc(counter / 128) as 0 | 1 | 2 | 3;
        const remainder = counter % 128;
        let x2: number;
        switch (divCounter) {
          case 0:
            x2 = -Math.trunc((remainder * 8) / 128) + 0;
            break;
          case 1:
            x2 = Math.trunc(remainder / 16) - 8;
            break;
          case 2:
            x2 = Math.trunc(remainder / 16);
            break;
          case 3:
            x2 = -Math.trunc((remainder * 8) / 128) + 8;
            break;
        }
        const sineIndex = counter % 128;
        const y2 = -Math.floor((8 * GBA_SINE_TABLE_256[sineIndex]!) / 256) + 0;
        const frame = horizontalJumpsFrameAtTick(tick)!;
        expect(frame, `tick ${tick}`).toEqual({
          x2,
          y2,
          data0: 0,
          data2: counter + 12,
          counter,
          divCounter,
          remainder,
          sineIndex,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          callback: "Anim_HorizontalJumps",
        });
        return frame;
      });

      expect(active).toHaveLength(43);
      expect(active.map(({ divCounter }) => divCounter)).toContain(0);
      expect(active.map(({ divCounter }) => divCounter)).toContain(1);
      expect(active.map(({ divCounter }) => divCounter)).toContain(2);
      expect(active.map(({ divCounter }) => divCounter)).toContain(3);
      expect([0, 11, 21, 32, 42].map((tick) => {
        const frame = active[tick]!;
        return [tick, frame.counter, frame.divCounter, frame.remainder, frame.x2, frame.y2];
      })).toEqual([
        [0, 0, 0, 0, 0, 0],
        [11, 132, 1, 4, -8, 0],
        [21, 252, 1, 124, -1, 0],
        [32, 384, 3, 0, 8, 0],
        [42, 504, 3, 120, 1, -1],
      ]);
    });

    it("pins counter 516 terminal cleanup, data2 increment to 528, and WaitAnimEnd", () => {
      expect(horizontalJumpsFrameAtTick(43)).toEqual({
        x2: 0,
        y2: 0,
        data0: 0,
        data2: 528,
        counter: 516,
        divCounter: null,
        remainder: null,
        sineIndex: null,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        callback: "WaitAnimEnd",
      });
      expect(horizontalJumpsFrameAtTick(44)).toEqual(horizontalJumpsFrameAtTick(43));
      expect(horizontalJumpsFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [40, wigglytuffScenario],
      [365, vigorothScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "WIGGLYTUFF", wigglytuffRunA, wigglytuffRunB,
        wigglytuffRawA, wigglytuffRawB, 40, 4,
        "ace0d70d460715a093f9830d074e6e3d6cea3e2741b3fb80054ea2a4ecda558f",
      ],
      [
        "VIGOROTH", vigorothRunA, vigorothRunB,
        vigorothRawA, vigorothRawB, 365, 6,
        "9e7ad2953ca1a23d4864d476c6da558a6ac0af556404785f63cc47fa26fbaa2f",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      data2,
      animCmdIndex,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_H_JUMPS");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted representative and sibling family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT", "VILEPLUME", "LOUDRED", "JIGGLYPUFF", "GYARADOS",
        "BLASTOISE", "BAGON", "SEAKING", "SHUPPET", "BUTTERFREE", "CHIMECHO",
        "WIGGLYTUFF", "VIGOROTH",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("horizontalVibrateFrameAtTick (source lifecycle)", () => {
    it("derives exactly all 7 selector mappings as Factory-reachable with zero outside", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_H_VIBRATE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(H_VIBRATE_FRONT_SPECIES).toEqual(generated);
      expect(H_VIBRATE_FRONT_SPECIES).toEqual([
        "BEEDRILL", "ARCANINE", "SCYTHER", "SCIZOR",
        "HITMONTOP", "SHIFTRY", "DUSCLOPS",
      ]);
      expect(H_VIBRATE_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(H_VIBRATE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(H_VIBRATE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of H_VIBRATE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("keeps Fast and Fastest distinct and explicitly unaccepted", () => {
      expect(HORIZONTAL_VIBRATE_VARIANTS).toEqual({
        normal: { selector: "ANIM_H_VIBRATE", amplitude: 6, accepted: true },
        fast: { selector: "ANIM_H_VIBRATE_FAST", amplitude: 9, accepted: false },
        fastest: { selector: "ANIM_H_VIBRATE_FASTEST", amplitude: 12, accepted: false },
      });
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
    });

    it("pins all 41 active callbacks, alternating signs and exact sine indices", () => {
      const active = Array.from({ length: 41 }, (_, tick) => {
        const sign = tick % 2 === 0 ? 1 : -1;
        const index = Math.trunc((tick * 128) / 40) % 256;
        const x2 = Math.floor((6 * GBA_SINE_TABLE_256[index]!) / 256) * sign + 0;
        const frame = horizontalVibrateFrameAtTick(tick)!;
        expect(frame, `tick ${tick}`).toEqual({
          x2,
          y2: 0,
          data0: 0,
          data2: tick + 1,
          counter: tick,
          index,
          sign,
          amplitude: 6,
          callback: "Anim_HorizontalVibrate",
        });
        return frame;
      });

      expect(active).toHaveLength(41);
      expect(active.map(({ sign }) => sign)).toEqual(
        Array.from({ length: 41 }, (_, tick) => tick % 2 === 0 ? 1 : -1),
      );
      expect(active.map(({ index }) => index)).toEqual(
        Array.from({ length: 41 }, (_, tick) => Math.trunc((tick * 128) / 40)),
      );
      expect([0, 1, 10, 20, 30, 39, 40].map((tick) => {
        const frame = active[tick]!;
        return [tick, frame.index, frame.sign, frame.x2];
      })).toEqual([
        [0, 0, 1, 0],
        [1, 3, -1, 0],
        [10, 32, 1, 4],
        [20, 64, 1, 6],
        [30, 96, 1, 4],
        [39, 124, -1, 0],
        [40, 128, 1, 0],
      ]);
    });

    it("pins tick 41 cleanup, WaitAnimEnd install, and final data2 increment to 42", () => {
      expect(horizontalVibrateFrameAtTick(41)).toEqual({
        x2: 0,
        y2: 0,
        data0: 0,
        data2: 42,
        counter: 41,
        index: null,
        sign: null,
        amplitude: 6,
        callback: "WaitAnimEnd",
      });
      expect(horizontalVibrateFrameAtTick(42)).toEqual(horizontalVibrateFrameAtTick(41));
      expect(horizontalVibrateFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [15, beedrillScenario],
      [362, dusclopsScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "BEEDRILL", beedrillRunA, beedrillRunB,
        beedrillRawA, beedrillRawB, 15, 4,
        "4657eaa59c66c769b56a4f1db250b3ba24ee7b1789e7a7d0c01db99fe0cd98ca",
      ],
      [
        "DUSCLOPS", dusclopsRunA, dusclopsRunB,
        dusclopsRawA, dusclopsRawB, 362, 4,
        "b13802454ef9b92cf94aa210d4027f2ce67a12ae96dc7ca252c044782561f3f3",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      data2,
      animCmdIndex,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_H_VIBRATE");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted representative and sibling family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT", "VILEPLUME", "LOUDRED", "JIGGLYPUFF", "GYARADOS",
        "BLASTOISE", "BAGON", "SEAKING", "SHUPPET", "BUTTERFREE", "CHIMECHO",
        "WIGGLYTUFF", "VIGOROTH", "BEEDRILL", "DUSCLOPS",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("horizontalStretchFrameAtTick (source lifecycle)", () => {
    it("derives exactly all 7 selector mappings as Factory-reachable with zero outside", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_H_STRETCH")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(H_STRETCH_FRONT_SPECIES).toEqual(generated);
      expect(H_STRETCH_FRONT_SPECIES).toEqual([
        "EKANS", "HITMONLEE", "QUAGSIRE", "SNEASEL", "TYROGUE", "TORCHIC", "ALTARIA",
      ]);
      expect(H_STRETCH_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(H_STRETCH_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(H_STRETCH_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of H_STRETCH_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("keeps the three HorizontalStretchFar back selectors distinct and unaccepted", () => {
      expect(HORIZONTAL_STRETCH_VARIANTS).toEqual({
        front: { selector: "ANIM_H_STRETCH", accepted: true },
        far: { selector: "ANIM_H_STRETCH_FAR", accepted: false },
        farTwice: { selector: "ANIM_H_STRETCH_FAR_TWICE", accepted: false },
        farSlow: { selector: "ANIM_H_STRETCH_FAR_SLOW", accepted: false },
      });
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
    });

    it("pins all 41 active callbacks in exact source order", () => {
      let data7 = 0;
      const sin = (index: number, amplitude: number) =>
        Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
      const active = Array.from({ length: 41 }, (_, tick) => {
        const index2 = Math.trunc((tick * 128) / 40);
        let index1 = 0;
        if (tick >= 10 && tick <= 29) {
          data7 = (data7 + 51) & 0xffff;
          if (data7 >= 0x8000) data7 -= 0x10000;
          index1 = data7 & 0xff;
        }
        const data4 = (256 - sin(index2, 40)) - sin(index1, 16);
        const data5 = sin(index2, 16) + 256;
        const frame = horizontalStretchFrameAtTick(tick)!;
        expect(frame, `tick ${tick}`).toEqual({
          x2: 0,
          y2: 0,
          data0: 0,
          data2: tick + 1,
          data4,
          data5,
          data7,
          index1,
          index2,
          xScale: data4,
          yScale: data5,
          affineRotation: 0,
          startedAffine: tick === 0,
          normalFrontDontFlip: true,
          resetSpriteAfterAnim: false,
          callback: "Anim_HorizontalStretch",
          affineMode: "double",
        });
        return frame;
      });

      expect(active).toHaveLength(41);
      expect(active[0]!.startedAffine).toBe(true);
      expect(active.slice(1).every(({ startedAffine }) => !startedAffine)).toBe(true);
    });

    it("pins data2=9/10/29/30 modulation boundaries and local index1 reset", () => {
      expect([9, 10, 29, 30].map((tick) => {
        const frame = horizontalStretchFrameAtTick(tick)!;
        return [tick, frame.data7, frame.index1, frame.index2, frame.data4, frame.data5];
      })).toEqual([
        [9, 0, 0, 28, 231, 266],
        [10, 51, 51, 32, 213, 267],
        [29, 1020, 252, 92, 228, 268],
        [30, 1020, 0, 96, 228, 267],
      ]);
    });

    it("pins s16 data7 wrap followed by the source u8 index mask", () => {
      expect(horizontalStretchFrameAtTick(10, 32760)).toMatchObject({
        data7: -32725,
        index1: 43,
        index2: 32,
        data4: 215,
        data5: 267,
        xScale: 215,
        yScale: 267,
        affineRotation: 0,
      });
    });

    it("pins tick 41 identity affine, reset, WaitAnimEnd, and data2 increment to 42", () => {
      expect(horizontalStretchFrameAtTick(41)).toEqual({
        x2: 0,
        y2: 0,
        data0: 0,
        data2: 42,
        data4: 256,
        data5: 256,
        data7: 1020,
        index1: null,
        index2: null,
        xScale: 256,
        yScale: 256,
        affineRotation: 0,
        startedAffine: false,
        normalFrontDontFlip: true,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(horizontalStretchFrameAtTick(42)).toEqual(horizontalStretchFrameAtTick(41));
      expect(horizontalStretchFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [23, ekansScenario],
      [334, altariaScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "EKANS", ekansRunA, ekansRunB, ekansRawA, ekansRawB, 23, 5,
        "910a3f50de504e27097b7eb7a4b445229888540513362c16912bee88addadb44",
      ],
      [
        "ALTARIA", altariaRunA, altariaRunB, altariaRawA, altariaRawB, 334, 6,
        "24dddba203497ba399c2944bbf7a636edb3ced114e5bc4d44ddc7dee826176e9",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      data2,
      animCmdIndex,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_H_STRETCH");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted representative and sibling family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT", "VILEPLUME", "LOUDRED", "JIGGLYPUFF", "GYARADOS",
        "BLASTOISE", "BAGON", "SEAKING", "SHUPPET", "BUTTERFREE", "CHIMECHO",
        "WIGGLYTUFF", "VIGOROTH", "BEEDRILL", "DUSCLOPS", "EKANS", "ALTARIA",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("flashYellowFrameAtTick (source palette lifecycle)", () => {
    it("derives exactly all 7 selector mappings as Factory-reachable with zero outside", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_FLASH_YELLOW")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(FLASH_YELLOW_FRONT_SPECIES).toEqual(generated);
      expect(FLASH_YELLOW_FRONT_SPECIES).toEqual([
        "PIKACHU", "MAGNETON", "ELECTABUZZ", "ZAPDOS", "AMPHAROS", "ELEKID", "RAIKOU",
      ]);
      expect(FLASH_YELLOW_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(FLASH_YELLOW_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(FLASH_YELLOW_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of FLASH_YELLOW_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins every sYellowFlashData row and the implicit u8 -1 sentinel", () => {
      expect(YELLOW_FLASH_DATA).toEqual([
        [false, 5], [true, 1], [false, 15], [true, 4],
        [false, 2], [true, 2], [false, 2], [true, 2],
        [false, 2], [true, 2], [false, 2], [true, 2], [false, 2],
      ]);
      expect(YELLOW_FLASH_DATA).toHaveLength(13);
    });

    it("pins all 56 active callbacks including delayed palette writes", () => {
      let data5 = 0;
      let data6 = 0;
      let data4 = 0;
      let coefficient: 0 | 16 = 0;
      const transitions: number[] = [];
      const writes: number[] = [];
      const active = Array.from({ length: 56 }, (_, tick) => {
        const entry = YELLOW_FLASH_DATA[data6]!;
        let paletteWrite = false;
        if (data4 === 1) {
          coefficient = entry[0] ? 16 : 0;
          paletteWrite = true;
          writes.push(tick);
          data4 = 0;
        }
        if (entry[1] === data5) {
          data4 = 1;
          data5 = 0;
          data6 += 1;
          transitions.push(tick);
        } else {
          data5 += 1;
        }

        const frame = flashYellowFrameAtTick(tick, 6)!;
        expect(frame, `tick ${tick}`).toEqual({
          x2: 0,
          y2: 0,
          data0: 0,
          data2: tick + 1,
          data4,
          data5,
          data6,
          data7: 0x160,
          tableFlashYellow: entry[0],
          tableDuration: entry[1],
          paletteNum: 6,
          paletteStart: 0x160,
          paletteCount: 16,
          blendCoefficient: coefficient,
          blendColor: 0x03ff,
          paletteWrite,
          callback: "Anim_FlashYellow",
        });
        return frame;
      });

      expect(active).toHaveLength(56);
      expect(transitions).toEqual([5, 7, 23, 28, 31, 34, 37, 40, 43, 46, 49, 52, 55]);
      expect(writes).toEqual([6, 8, 24, 29, 32, 35, 38, 41, 44, 47, 50, 53]);
      expect(writes.map((tick) => active[tick]!.blendCoefficient)).toEqual([
        16, 0, 16, 0, 16, 0, 16, 0, 16, 0, 16, 0,
      ]);
    });

    it("pins OBJ_PLTT_ID capture, final restore, and tick-56 sentinel cleanup", () => {
      expect(flashYellowFrameAtTick(0, 0x16)).toMatchObject({
        data2: 1,
        data7: 0x160,
        paletteNum: 6,
        paletteStart: 0x160,
        paletteWrite: false,
      });
      expect(flashYellowFrameAtTick(53, 6)).toMatchObject({
        data6: 12,
        tableFlashYellow: false,
        tableDuration: 2,
        blendCoefficient: 0,
        paletteWrite: true,
      });
      expect(flashYellowFrameAtTick(56, 6)).toEqual({
        x2: 0,
        y2: 0,
        data0: 0,
        data2: 57,
        data4: 1,
        data5: 0,
        data6: 13,
        data7: 0x160,
        tableFlashYellow: null,
        tableDuration: null,
        paletteNum: 6,
        paletteStart: 0x160,
        paletteCount: 16,
        blendCoefficient: 0,
        blendColor: 0x03ff,
        paletteWrite: false,
        callback: "WaitAnimEnd",
      });
      expect(flashYellowFrameAtTick(57, 6)).toEqual(flashYellowFrameAtTick(56, 6));
      expect(flashYellowFrameAtTick(-1, 6)).toBeNull();
    });

    it.each([
      [25, pikachuScenario],
      [243, raikouScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "PIKACHU", pikachuRunA, pikachuRunB, pikachuRawA, pikachuRawB, 25, 4,
        "2e83c09bdb040ef1ff8637a260f94ac6dcfe33c6f967b56b984348a848884968",
      ],
      [
        "RAIKOU", raikouRunA, raikouRunB, raikouRawA, raikouRawB, 243, 3,
        "b72527919f77b4f34bb43feba56c36876de8adafc321b481f0142d09de3e109f",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      data2,
      animCmdIndex,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_FLASH_YELLOW");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted representative and sibling family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT", "VILEPLUME", "LOUDRED", "JIGGLYPUFF", "GYARADOS",
        "BLASTOISE", "BAGON", "SEAKING", "SHUPPET", "BUTTERFREE", "CHIMECHO",
        "WIGGLYTUFF", "VIGOROTH", "BEEDRILL", "DUSCLOPS", "EKANS", "ALTARIA",
        "PIKACHU", "RAIKOU",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("horizontalSlideSlowFrameAtTick (source lifecycle)", () => {
    it("derives exactly all 7 selector mappings as Factory-reachable with zero outside", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_H_SLIDE_SLOW")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(H_SLIDE_SLOW_FRONT_SPECIES).toEqual(generated);
      expect(H_SLIDE_SLOW_FRONT_SPECIES).toEqual([
        "WEEDLE", "PARAS", "GRIMER", "EXEGGCUTE", "MR_MIME", "SUDOWOODO", "NINJASK",
      ]);
      expect(H_SLIDE_SLOW_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(H_SLIDE_SLOW_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(H_SLIDE_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of H_SLIDE_SLOW_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("accepts only slow data0=80 and keeps normal/fast distinct", () => {
      expect(HORIZONTAL_SLIDE_INITIALIZERS).toEqual({
        slow: { selector: "ANIM_H_SLIDE_SLOW", data0: 80, accepted: true },
        normal: { selector: "ANIM_H_SLIDE", data0: 40, accepted: false },
        fast: { selector: "ANIM_H_SLIDE_FAST", data0: 20, accepted: false },
      });
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
    });

    it("pins every active callback's C-truncated sine arithmetic and both flip no-ops", () => {
      const active = Array.from({ length: 81 }, (_, tick) => {
        const index = Math.trunc((tick * 384) / 80) % 256;
        const frame = horizontalSlideSlowFrameAtTick(tick);
        expect(frame, `tick ${tick}`).toEqual({
          x2: Math.floor((6 * GBA_SINE_TABLE_256[index]!) / 256) + 0,
          y2: 0,
          data0: 80,
          data2: tick + 1,
          index,
          amplitude: 6,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          callback: "HorizontalSlide",
        });
        return frame!;
      });
      expect(active).toHaveLength(81);
      expect([0, 20, 40, 60, 80].map((tick) => [
        tick, active[tick]!.index, active[tick]!.x2, active[tick]!.data2,
      ])).toEqual([
        [0, 0, 0, 1],
        [20, 96, 4, 21],
        [40, 192, -6, 41],
        [60, 32, 4, 61],
        [80, 128, 0, 81],
      ]);
    });

    it("pins tick 81 terminal reset/WaitAnimEnd and stable settled state", () => {
      expect(horizontalSlideSlowFrameAtTick(81)).toEqual({
        x2: 0,
        y2: 0,
        data0: 80,
        data2: 82,
        index: null,
        amplitude: 6,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        callback: "WaitAnimEnd",
      });
      expect(horizontalSlideSlowFrameAtTick(82)).toEqual(horizontalSlideSlowFrameAtTick(81));
      expect(horizontalSlideSlowFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [13, weedleScenario],
      [302, ninjaskScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "WEEDLE", weedleRunA, weedleRunB, weedleRawA, weedleRawB, 13, 6,
        "ddf75e4d3e1dad7197ca10ddae1cb595c732d84c4abb5af3e60bd24906d120dd",
      ],
      [
        "NINJASK", ninjaskRunA, ninjaskRunB, ninjaskRawA, ninjaskRawB, 302, 17,
        "830d8fbd9726a2c15d951a66350390d444737c5872723bb17ab7c847f39bab45",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species, runA, runB, rawA, rawB, data2, animCmdIndex, rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_H_SLIDE_SLOW");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted representative and sibling family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT", "VILEPLUME", "LOUDRED", "JIGGLYPUFF", "GYARADOS",
        "BLASTOISE", "BAGON", "SEAKING", "SHUPPET", "BUTTERFREE", "CHIMECHO",
        "WIGGLYTUFF", "VIGOROTH", "BEEDRILL", "DUSCLOPS", "EKANS", "ALTARIA",
        "PIKACHU", "RAIKOU", "WEEDLE", "NINJASK",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("circularStretchTwiceFrameAtTick (source lifecycle)", () => {
    it("derives exactly all 6 selector mappings as Factory-reachable with zero outside", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_CIRCULAR_STRETCH_TWICE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(CIRCULAR_STRETCH_TWICE_FRONT_SPECIES).toEqual(generated);
      expect(CIRCULAR_STRETCH_TWICE_FRONT_SPECIES).toEqual([
        "DITTO", "MUDKIP", "SWELLOW", "WAILMER", "MINUN", "REGIROCK",
      ]);
      expect(CIRCULAR_STRETCH_TWICE_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(CIRCULAR_STRETCH_TWICE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(CIRCULAR_STRETCH_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of CIRCULAR_STRETCH_TWICE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins Task_HandleMonAnimation's zeroed data boundary", () => {
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
    });

    it("pins every active callback's C-truncated sine/cosine affine writes", () => {
      const active = Array.from({ length: 41 }, (_, tick) => {
        const index = Math.trunc((tick * 512) / 40) % 256;
        const data4 = Math.floor((32 * GBA_SINE_TABLE_256[index]!) / 256) + 256;
        const data5 = Math.floor((32 * GBA_SINE_TABLE_256[(index + 64) % 256]!) / 256) + 256;
        const frame = circularStretchTwiceFrameAtTick(tick);
        expect(frame, `tick ${tick}`).toEqual({
          x2: 0,
          y2: 0,
          data0: 0,
          data2: tick + 1,
          data4,
          data5,
          index,
          xScale: data4,
          yScale: data5,
          affineRotation: 0,
          startedAffine: tick === 0,
          normalFrontDontFlip: true,
          resetSpriteAfterAnim: false,
          callback: "Anim_CircularStretchTwice",
          affineMode: "double",
        });
        return frame!;
      });
      expect(active).toHaveLength(41);
      expect([0, 5, 10, 15, 20, 25, 30, 35, 40].map((tick) => [
        tick, active[tick]!.index, active[tick]!.xScale, active[tick]!.yScale,
      ])).toEqual([
        [0, 0, 256, 288],
        [5, 64, 288, 256],
        [10, 128, 256, 224],
        [15, 192, 224, 256],
        [20, 0, 256, 288],
        [25, 64, 288, 256],
        [30, 128, 256, 224],
        [35, 192, 224, 256],
        [40, 0, 256, 288],
      ]);
    });

    it("pins tick 41 identity/reset/WaitAnimEnd cleanup and stable settled state", () => {
      expect(circularStretchTwiceFrameAtTick(41)).toEqual({
        x2: 0,
        y2: 0,
        data0: 0,
        data2: 42,
        data4: 256,
        data5: 288,
        index: null,
        xScale: 256,
        yScale: 256,
        affineRotation: 0,
        startedAffine: false,
        normalFrontDontFlip: true,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(circularStretchTwiceFrameAtTick(42)).toEqual(circularStretchTwiceFrameAtTick(41));
      expect(circularStretchTwiceFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [132, dittoScenario],
      [401, regirockScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "DITTO", dittoRunA, dittoRunB, dittoRawA, dittoRawB, 132, 3,
        "26cae4ff0244a36a7cb6dbea0e7cfbe94b506ec4a86bea200f5032c433dc595e",
      ],
      [
        "REGIROCK", regirockRunA, regirockRunB, regirockRawA, regirockRawB, 401, 4,
        "5d2e0fb67df2033d4868db97e13f5bf473d34c9b5a498a4da42d90847cb7c7d3",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species, runA, runB, rawA, rawB, data2, animCmdIndex, rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_CIRCULAR_STRETCH_TWICE");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted representative and sibling family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT", "VILEPLUME", "LOUDRED", "JIGGLYPUFF", "GYARADOS",
        "BLASTOISE", "BAGON", "SEAKING", "SHUPPET", "BUTTERFREE", "CHIMECHO",
        "WIGGLYTUFF", "VIGOROTH", "BEEDRILL", "DUSCLOPS", "EKANS", "ALTARIA",
        "PIKACHU", "RAIKOU", "WEEDLE", "NINJASK", "DITTO", "REGIROCK",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("shrinkGrowFrameAtTick (source lifecycle)", () => {
    it("derives exactly all 6 selector mappings as Factory-reachable with zero outside", () => {
      const speciesSelectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
      const generated = Object.entries(speciesSelectors)
        .filter(([, family]) => family === "ANIM_SHRINK_GROW")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(SHRINK_GROW_FRONT_SPECIES).toEqual(generated);
      expect(SHRINK_GROW_FRONT_SPECIES).toEqual([
        "WARTORTLE", "NIDORINO", "KOFFING", "RHYDON", "SLOWKING", "GLIGAR",
      ]);
      expect(SHRINK_GROW_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(SHRINK_GROW_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(SHRINK_GROW_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of SHRINK_GROW_FRONT_SPECIES) {
        expect(speciesSelectors[species]).toBe("ANIM_SHRINK_GROW");
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("accepts only normal (8,3) and keeps FAST/SLOW initializers distinct", () => {
      expect(SHRINK_GROW_INITIALIZERS).toEqual({
        normal: {
          selector: "ANIM_SHRINK_GROW", data6: 8, data7: 3, accepted: true,
        },
        fast: {
          selector: "ANIM_SHRINK_GROW_FAST", data6: 8, data7: 5, accepted: false,
        },
        slow: {
          selector: "ANIM_SHRINK_GROW_SLOW", data6: 4, data7: 3, accepted: false,
        },
      });
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
    });

    it("pins every active callback's affine and compensated-position writes", () => {
      const active = Array.from({ length: 49 }, (_, tick) => {
        const phaseIndex = (tick * 8) & 0xff;
        const yScaleBeforePosition =
          Math.floor((32 * GBA_SINE_TABLE_256[phaseIndex]!) / 256) + 256;
        const posY = yScaleBeforePosition > 256
          ? Math.trunc((256 - yScaleBeforePosition) / 8)
          : 0;
        const xScale = Math.floor((48 * GBA_SINE_TABLE_256[phaseIndex]!) / 256) + 256;
        const frame = shrinkGrowFrameAtTick(tick);
        expect(frame, `tick ${tick}`).toEqual({
          x2: 0,
          y2: -posY + 0,
          data0: 0,
          data2: tick + 1,
          data4: (phaseIndex + 8) & 0xff,
          data6: 8,
          data7: 3,
          phaseIndex,
          yScaleBeforePosition,
          posY,
          xScale,
          yScale: yScaleBeforePosition,
          affineRotation: 0,
          startedAffine: tick === 0,
          normalFrontDontFlip: true,
          resetSpriteAfterAnim: false,
          callback: "Anim_ShrinkGrow",
          affineMode: "double",
        });
        return frame!;
      });
      expect(active).toHaveLength(49);
      expect([0, 8, 16, 24, 32, 40, 48].map((tick) => [
        tick,
        active[tick]!.phaseIndex,
        active[tick]!.xScale,
        active[tick]!.yScale,
        active[tick]!.y2,
      ])).toEqual([
        [0, 0, 256, 256, 0],
        [8, 64, 304, 288, 4],
        [16, 128, 256, 256, 0],
        [24, 192, 208, 224, 0],
        [32, 0, 256, 256, 0],
        [40, 64, 304, 288, 4],
        [48, 128, 256, 256, 0],
      ]);
    });

    it("pins tick 49 identity/y2/reset/WaitAnimEnd cleanup and stable settled state", () => {
      expect(shrinkGrowFrameAtTick(49)).toEqual({
        x2: 0,
        y2: 0,
        data0: 0,
        data2: 49,
        data4: 136,
        data6: 8,
        data7: 3,
        phaseIndex: null,
        yScaleBeforePosition: null,
        posY: null,
        xScale: 256,
        yScale: 256,
        affineRotation: 0,
        startedAffine: false,
        normalFrontDontFlip: true,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(shrinkGrowFrameAtTick(50)).toEqual(shrinkGrowFrameAtTick(49));
      expect(shrinkGrowFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [8, wartortleScenario],
      [207, gligarScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "WARTORTLE", wartortleRunA, wartortleRunB, wartortleRawA, wartortleRawB, 8, 2,
        "e4c09e7b1c413acc21745c649e7bb493ea87ff51d648181ae77bf7d6f2466005",
      ],
      [
        "GLIGAR", gligarRunA, gligarRunB, gligarRawA, gligarRawB, 207, 1,
        "5dbf9079a53eb71470f474107391fc9f05ad9cf6604d1d807b561729b6d820d6",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species, runA, runB, rawA, rawB, data2, animCmdIndex, rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_SHRINK_GROW");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted representative and terminal sibling family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT", "VILEPLUME", "LOUDRED", "JIGGLYPUFF", "GYARADOS",
        "BLASTOISE", "BAGON", "SEAKING", "SHUPPET", "BUTTERFREE", "CHIMECHO",
        "WIGGLYTUFF", "VIGOROTH", "BEEDRILL", "DUSCLOPS", "EKANS", "ALTARIA",
        "PIKACHU", "RAIKOU", "WEEDLE", "NINJASK", "DITTO", "REGIROCK",
        "WARTORTLE", "NIDORINO", "KOFFING", "RHYDON", "SLOWKING", "GLIGAR",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("swingConvexFrameAtTick (normal source lifecycle)", () => {
    it("pins the complete six-selector census, four Factory siblings, and two outside mappings", () => {
      const speciesSelectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
      const generated = Object.entries(speciesSelectors)
        .filter(([, family]) => family === "ANIM_SWING_CONVEX")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(SWING_CONVEX_FRONT_SPECIES).toEqual(generated);
      expect(SWING_CONVEX_FRONT_SPECIES).toEqual([
        "WEEPINBELL", "GOLDEEN", "MEW", "MANTINE", "BANETTE", "JIRACHI",
      ]);
      expect(SWING_CONVEX_FACTORY_FRONT_SPECIES).toEqual([
        "WEEPINBELL", "GOLDEEN", "MANTINE", "BANETTE",
      ]);
      expect(SWING_CONVEX_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(SWING_CONVEX_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual(["MEW", "JIRACHI"]);
      expect(SWING_CONVEX_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => !factorySpecies.has(species)),
      );
      for (const species of SWING_CONVEX_FRONT_SPECIES) {
        expect(speciesSelectors[species]).toBe("ANIM_SWING_CONVEX");
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("accepts only normal data=100/runs=1 and keeps both fast selectors distinct", () => {
      expect(SWING_CONVEX_INITIALIZERS).toEqual({
        normal: {
          selector: "ANIM_SWING_CONVEX", data: 100, runs: 1, accepted: true,
        },
        fast: {
          selector: "ANIM_SWING_CONVEX_FAST", data: 50, runs: 2, accepted: false,
        },
        fastShort: {
          selector: "ANIM_SWING_CONVEX_FAST_SHORT",
          data: 50,
          runs: 1,
          unused: true,
          accepted: false,
        },
      });
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
    });

    it("pins all 101 active callbacks and reuses the accepted shared swing lifecycle", () => {
      const active = Array.from({ length: 101 }, (_, tick) => {
        const index = Math.trunc((tick * 256) / 100);
        const sine10 = Math.floor((10 * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
        const sine3276 = Math.floor((3276 * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
        const frame = swingConvexFrameAtTick(tick);
        expect(frame, `tick ${tick}`).toEqual({
          x2: -sine10 + 0,
          y2: 0,
          data2: tick + 1,
          animRotation: 0,
          animDelay: 0,
          animRuns: 1,
          animSpeed: 0,
          animData: 100,
          index,
          xScale: 256,
          yScale: 256,
          affineRotation: -sine3276 + 0,
          startedAffine: tick === 0,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          resetSpriteAfterAnim: false,
          callback: "SwingConvex",
          affineMode: "double",
        });
        const concave = swingConcaveFrameAtTick(tick)!;
        expect(frame!.x2, `shared x2 tick ${tick}`).toBe(concave.x2);
        expect(frame!.affineRotation, `opposite rotation tick ${tick}`).toBe(
          -concave.affineRotation + 0,
        );
        return frame!;
      });
      expect(active).toHaveLength(101);
      expect([0, 25, 50, 75, 100].map((tick) => [
        tick,
        active[tick]!.index,
        active[tick]!.x2,
        active[tick]!.affineRotation,
      ])).toEqual([
        [0, 0, 0, 0],
        [25, 64, -10, -3276],
        [50, 128, 0, 0],
        [75, 192, 10, 3276],
        [100, 256, 0, 0],
      ]);
    });

    it("pins tick 101 identity/x2/reset/WaitAnimEnd cleanup and stable settled state", () => {
      expect(swingConvexFrameAtTick(101)).toEqual({
        x2: 0,
        y2: 0,
        data2: 102,
        animRotation: 0,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 100,
        index: null,
        xScale: 256,
        yScale: 256,
        affineRotation: 0,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(swingConvexFrameAtTick(102)).toEqual(swingConvexFrameAtTick(101));
      expect(swingConvexFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [70, weepinbellScenario],
      [378, banetteScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "WEEPINBELL", weepinbellRunA, weepinbellRunB, weepinbellRawA, weepinbellRawB, 70,
        "a7ae6c5bf088e3a523a0da3cf178eac2024e3e7a1ed02d336a4df831ee44b12e",
      ],
      [
        "BANETTE", banetteRunA, banetteRunB, banetteRawA, banetteRawB, 378,
        "95b70a54be18eaa93e3cb8a2a4d4a2ce19e1b261f03ff82a1628fcae87c25dfb",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species, runA, runB, rawA, rawB, data2, rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_SWING_CONVEX");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex: 6,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted representative and terminal sibling family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT", "VILEPLUME", "LOUDRED", "JIGGLYPUFF", "GYARADOS",
        "BLASTOISE", "BAGON", "SEAKING", "SHUPPET", "BUTTERFREE", "CHIMECHO",
        "WIGGLYTUFF", "VIGOROTH", "BEEDRILL", "DUSCLOPS", "EKANS", "ALTARIA",
        "PIKACHU", "RAIKOU", "WEEDLE", "NINJASK", "DITTO", "REGIROCK",
        "WARTORTLE", "NIDORINO", "KOFFING", "RHYDON", "SLOWKING", "GLIGAR",
        "WEEPINBELL", "GOLDEEN", "MANTINE", "BANETTE",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("bounceRotateToSidesFrameAtTick (normal source lifecycle)", () => {
    it("derives exactly five Factory mappings and no outside mappings", () => {
      const speciesSelectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
      const generated = Object.entries(speciesSelectors)
        .filter(([, family]) => family === "ANIM_BOUNCE_ROTATE_TO_SIDES")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(BOUNCE_ROTATE_TO_SIDES_FRONT_SPECIES).toEqual(generated);
      expect(BOUNCE_ROTATE_TO_SIDES_FRONT_SPECIES).toEqual([
        "MAROWAK", "MAGIKARP", "SEEDOT", "MEDITITE", "ILLUMISE",
      ]);
      expect(BOUNCE_ROTATE_TO_SIDES_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(BOUNCE_ROTATE_TO_SIDES_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(BOUNCE_ROTATE_TO_SIDES_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of BOUNCE_ROTATE_TO_SIDES_FRONT_SPECIES) {
        expect(speciesSelectors[species]).toBe("ANIM_BOUNCE_ROTATE_TO_SIDES");
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins AddNewAnim defaults, task-zeroed data6, source table, and distinct variants", () => {
      expect(BOUNCE_ROTATE_TO_SIDES_DATA).toEqual([
        [
          [0, 8, 8], [8, -8, 12], [-8, 8, 12], [8, -8, 12],
          [-8, 8, 12], [8, -8, 12], [-8, 0, 12], [0, 0, 0],
        ],
        [
          [0, 8, 16], [8, -8, 24], [-8, 8, 24], [8, -8, 24],
          [-8, 8, 24], [8, -8, 24], [-8, 0, 24], [0, 0, 0],
        ],
      ]);
      expect(BOUNCE_ROTATE_TO_SIDES_VARIANTS).toEqual({
        normal: { data6: 0, rotation: 4096 },
        small: { data6: 0, rotation: 2048 },
        slow: { data6: 1, rotation: 4096 },
        smallSlow: { data6: 1, rotation: 2048 },
      });
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toContain(6);
      expect(bounceRotateToSidesFrameAtTick(0)).toEqual({
        x2: 0,
        y2: 0,
        data2: 1,
        data3: 1,
        data4: 0,
        data6: 0,
        animRotation: 4096,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 0,
        legIndex: 0,
        legStartX: 0,
        legEndX: 8,
        legDuration: 8,
        legProgress: 0,
        affineRotationU16: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: true,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: false,
        callback: "BounceRotateToSides",
        affineMode: "double",
      });
    });

    it("pins all 87 active callbacks with C truncation, u16 rotation, and seven boundaries", () => {
      let tick = 0;
      for (let legIndex = 0; legIndex < 7; legIndex += 1) {
        const [startX, endX, duration] = BOUNCE_ROTATE_TO_SIDES_DATA[0]![legIndex]!;
        for (let progress = 0; progress <= duration; progress += 1) {
          const expectedX = Math.trunc(((endX - startX) * progress) / duration) + startX;
          const sineIndex = Math.trunc((progress * 128) / duration);
          const expectedY = -Math.floor((10 * GBA_SINE_TABLE_256[sineIndex]!) / 256) + 0;
          const frame = bounceRotateToSidesFrameAtTick(tick);
          expect(frame, `tick ${tick}`).toMatchObject({
            x2: expectedX,
            y2: expectedY,
            data2: 1,
            data3: progress === duration ? 0 : progress + 1,
            data4: progress === duration ? legIndex + 1 : legIndex,
            data6: 0,
            animRotation: 4096,
            animDelay: 0,
            animRuns: 1,
            animSpeed: 0,
            animData: 0,
            legIndex,
            legStartX: startX,
            legEndX: endX,
            legDuration: duration,
            legProgress: progress,
            affineRotationU16: Math.trunc((-(4096 * expectedX)) / 8) & 0xffff,
            xScale: 256,
            yScale: 256,
            startedAffine: tick === 0,
            normalFrontDontFlip: true,
            tryFlipXCalls: 2,
            resetSpriteAfterAnim: false,
            callback: "BounceRotateToSides",
            affineMode: "double",
          });
          tick += 1;
        }
      }
      expect(tick).toBe(87);
      expect([8, 21, 34, 47, 60, 73, 86].map((boundary) => {
        const frame = bounceRotateToSidesFrameAtTick(boundary)!;
        return [boundary, frame.legIndex, frame.legProgress, frame.x2, frame.y2,
          frame.data3, frame.data4, frame.affineRotationU16];
      })).toEqual([
        [8, 0, 8, 8, 0, 0, 1, 61440],
        [21, 1, 12, -8, 0, 0, 2, 4096],
        [34, 2, 12, 8, 0, 0, 3, 61440],
        [47, 3, 12, -8, 0, 0, 4, 4096],
        [60, 4, 12, 8, 0, 0, 5, 61440],
        [73, 5, 12, -8, 0, 0, 6, 4096],
        [86, 6, 12, 0, 0, 0, 7, 0],
      ]);
    });

    it("pins sentinel identity/reset/WaitAnimEnd and stable post-terminal state", () => {
      expect(bounceRotateToSidesFrameAtTick(87)).toEqual({
        x2: 0,
        y2: 0,
        data2: 1,
        data3: 0,
        data4: 7,
        data6: 0,
        animRotation: 4096,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 0,
        legIndex: 7,
        legStartX: 0,
        legEndX: 0,
        legDuration: 0,
        legProgress: 0,
        affineRotationU16: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(bounceRotateToSidesFrameAtTick(88)).toEqual(bounceRotateToSidesFrameAtTick(87));
      expect(bounceRotateToSidesFrameAtTick(-1)).toBeNull();
    });

    it("preserves Small, Slow, and unaccepted SmallSlow variant behavior", () => {
      expect(bounceRotateToSidesSmallFrameAtTick(0)).toMatchObject({
        data6: 0, animRotation: 2048, animData: 0, legDuration: 8,
      });
      expect(bounceRotateToSidesSlowFrameAtTick(0)).toMatchObject({
        data6: 1, animRotation: 4096, animData: 1, legDuration: 16,
      });
      expect(bounceRotateToSidesSmallSlowFrameAtTick(0)).toMatchObject({
        data6: 1, animRotation: 2048, animData: 1, legDuration: 16,
      });
      expect(bounceRotateToSidesSmallFrameAtTick(87)!.callback).toBe("WaitAnimEnd");
      expect(bounceRotateToSidesSlowFrameAtTick(167)!.callback).toBe("WaitAnimEnd");
      expect(bounceRotateToSidesSmallSlowFrameAtTick(167)!.callback).toBe("WaitAnimEnd");
    });

    it.each([
      [105, marowakScenario],
      [314, illumiseScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "MAROWAK", marowakRunA, marowakRunB, marowakRawA, marowakRawB, 5, 105,
        "da3153df7028f1d0849cbd161241f034ddfc31e5ca86ee5594791b5df42f6711",
      ],
      [
        "ILLUMISE", illumiseRunA, illumiseRunB, illumiseRawA, illumiseRawB, 2, 314,
        "01939c8d337ecac2ac184e8df5a4975b176178f8cb1a3748485de81690dd553c",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species, runA, runB, rawA, rawB, animCmdIndex, data2, rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_BOUNCE_ROTATE_TO_SIDES");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves the prior accepted families and accepts only the five normal selectors", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "JIGGLYPUFF", "GYARADOS", "VILEPLUME", "LOUDRED",
        "WEEPINBELL", "GOLDEEN", "MANTINE", "BANETTE",
        "MAROWAK", "MAGIKARP", "SEEDOT", "MEDITITE", "ILLUMISE",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
      expect(BOUNCE_ROTATE_TO_SIDES_FRONT_SPECIES).not.toContain("CLEFABLE");
      expect(selectorTables.frontAnimIds.species.CLEFABLE).toBe(
        "ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW",
      );
    });
  });

  describe("verticalJumpsHorizontalJumpsFrameAtTick (ordinary opponent-front lifecycle)", () => {
    it("derives exactly five Factory mappings and no outside mappings", () => {
      const speciesSelectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
      const generated = Object.entries(speciesSelectors)
        .filter(([, family]) => family === "ANIM_V_JUMPS_H_JUMPS")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(V_JUMPS_H_JUMPS_FRONT_SPECIES).toEqual(generated);
      expect(V_JUMPS_H_JUMPS_FRONT_SPECIES).toEqual([
        "BULBASAUR", "VENONAT", "PSYDUCK", "COMBUSKEN", "DUSTOX",
      ]);
      expect(V_JUMPS_H_JUMPS_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(V_JUMPS_H_JUMPS_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(V_JUMPS_H_JUMPS_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of V_JUMPS_H_JUMPS_FRONT_SPECIES) {
        expect(speciesSelectors[species]).toBe("ANIM_V_JUMPS_H_JUMPS");
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("starts with task-zeroed data2 and the ordinary source callback", () => {
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toContain(2);
      expect(verticalJumpsHorizontalJumpsFrameAtTick(0)).toEqual({
        x2: 0,
        y2: 0,
        data0: 0,
        data2: 12,
        counter: 0,
        divCounter: 0,
        yCounter: 0,
        remainder: 0,
        x2Written: true,
        normalFrontDontFlip: true,
        callback: "Anim_VerticalJumpsHorizontalJumps",
      });
    });

    it("pins all 65 active callbacks from counter 0 through 768", () => {
      let expectedX = 0;
      for (let tick = 0; tick < 65; tick += 1) {
        const counter = tick * 12;
        const divCounter = Math.trunc(counter / 128) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
        let yCounter = counter;
        let x2Written = false;
        switch (divCounter) {
          case 0:
          case 1:
            expectedX = 0;
            x2Written = true;
            break;
          case 2:
            yCounter = 0;
            break;
          case 3:
            expectedX = Math.trunc(-((counter % 128) * 8) / 128) + 0;
            x2Written = true;
            break;
          case 4:
            expectedX = Math.trunc((counter % 128) / 8) - 8;
            x2Written = true;
            break;
          case 5:
            expectedX = Math.trunc(-((counter % 128) * 8) / 128) + 8;
            x2Written = true;
            break;
          case 6:
            break;
        }
        const remainder = yCounter % 128;
        const expectedY = -Math.floor((8 * GBA_SINE_TABLE_256[remainder]!) / 256) + 0;
        expect(verticalJumpsHorizontalJumpsFrameAtTick(tick), `counter ${counter}`).toEqual({
          x2: expectedX,
          y2: expectedY,
          data0: 0,
          data2: counter + 12,
          counter,
          divCounter,
          yCounter,
          remainder,
          x2Written,
          normalFrontDontFlip: true,
          callback: "Anim_VerticalJumpsHorizontalJumps",
        });
      }
    });

    it("pins every divCounter transition, C truncation, and x2 carry edge", () => {
      expect([0, 11, 22, 32, 43, 54, 64].map((tick) => {
        const frame = verticalJumpsHorizontalJumpsFrameAtTick(tick)!;
        return [tick, frame.counter, frame.divCounter, frame.x2, frame.y2,
          frame.yCounter, frame.x2Written];
      })).toEqual([
        [0, 0, 0, 0, 0, 0, true],
        [11, 132, 1, 0, 0, 132, true],
        [22, 264, 2, 0, 0, 0, false],
        [32, 384, 3, 0, 0, 384, true],
        [43, 516, 4, -8, 0, 516, true],
        [54, 648, 5, 8, -1, 648, true],
        [64, 768, 6, 1, 0, 768, false],
      ]);
      expect(verticalJumpsHorizontalJumpsFrameAtTick(33)).toMatchObject({
        counter: 396, x2: 0,
      });
      expect(verticalJumpsHorizontalJumpsFrameAtTick(55)).toMatchObject({
        counter: 660, x2: 7,
      });
      expect(Array.from({ length: 10 }, (_, offset) =>
        verticalJumpsHorizontalJumpsFrameAtTick(22 + offset)!.y2,
      )).toEqual(Array(10).fill(0));
    });

    it("cleans up only after 768 and remains stable after WaitAnimEnd", () => {
      expect(verticalJumpsHorizontalJumpsFrameAtTick(64)).toMatchObject({
        counter: 768,
        data2: 780,
        x2: 1,
        y2: 0,
        callback: "Anim_VerticalJumpsHorizontalJumps",
      });
      expect(verticalJumpsHorizontalJumpsFrameAtTick(65)).toEqual({
        x2: 0,
        y2: 0,
        data0: 0,
        data2: 792,
        counter: 780,
        divCounter: null,
        yCounter: null,
        remainder: null,
        x2Written: true,
        normalFrontDontFlip: true,
        callback: "WaitAnimEnd",
      });
      expect(verticalJumpsHorizontalJumpsFrameAtTick(66)).toEqual(
        verticalJumpsHorizontalJumpsFrameAtTick(65),
      );
      expect(verticalJumpsHorizontalJumpsFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [1, bulbasaurScenario],
      [294, dustoxScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (
      species, scenario,
    ) => {
      expect(scenario).toMatchObject({
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 0,
        trainerId: 50,
      });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const setId of [...scenario.playerSetIds, ...scenario.opponentSetIds]) {
        expect(setId).toBeGreaterThanOrEqual(110);
        expect(setId).toBeLessThanOrEqual(199);
      }
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "BULBASAUR", bulbasaurRunA, bulbasaurRunB, bulbasaurRawA, bulbasaurRawB, 2, 1,
        "f91cf65e2d71626c37f7421be61fbc1c909147ceed981b01f0adf51da541f1d8",
      ],
      [
        "DUSTOX", dustoxRunA, dustoxRunB, dustoxRawA, dustoxRawB, 14, 294,
        "e076416a1cc08913fac56b5b54b1069e93707c0da353d07ccc6b7e3a002d802f",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species, runA, runB, rawA, rawB, animCmdIndex, data2, rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_JUMPS_H_JUMPS");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves accepted families through the subsequently accepted Big and Twice selectors", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "MAROWAK", "MAGIKARP", "SEEDOT", "MEDITITE", "ILLUMISE",
        "BULBASAUR", "VENONAT", "PSYDUCK", "COMBUSKEN", "DUSTOX",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
      expect(selectorTables.frontAnimIds.species.PICHU).toBe("ANIM_V_JUMPS_BIG");
      expect(selectorTables.frontAnimIds.species.SHARPEDO).toBe(
        "ANIM_H_JUMPS_V_STRETCH_TWICE",
      );
      expect(speciesFrontIdleRestOffset("PICHU")).toEqual({ x2: 0, y2: 0 });
      expect(speciesFrontIdleRestOffset("SHARPEDO")).toEqual({ x2: 0, y2: 0 });
    });
  });

  describe("verticalJumpsBigFrameAtTick (Anim_VerticalJumps_Big / shared VerticalJumps port)", () => {
    it("derives exactly five Factory mappings and no outside mappings", () => {
      const speciesSelectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
      const generated = Object.entries(speciesSelectors)
        .filter(([, family]) => family === "ANIM_V_JUMPS_BIG")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(V_JUMPS_BIG_FRONT_SPECIES).toEqual(generated);
      expect(V_JUMPS_BIG_FRONT_SPECIES).toEqual([
        "PICHU", "FLAAFFY", "GIRAFARIG", "SWAMPERT", "TAILLOW",
      ]);
      expect(V_JUMPS_BIG_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(V_JUMPS_BIG_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(V_JUMPS_BIG_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of V_JUMPS_BIG_FRONT_SPECIES) {
        expect(speciesSelectors[species]).toBe("ANIM_V_JUMPS_BIG");
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins all 33 active callbacks, C branch arithmetic, u8 sine conversion, and amplitudes", () => {
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toContain(2);
      for (let tick = 0; tick < 33; tick += 1) {
        const counter = tick * 12;
        const divCounter = Math.trunc(counter / 128) as 0 | 1 | 2 | 3;
        const adjustedCounter = divCounter < 2 ? counter : counter - 256;
        const sineIndex = divCounter < 2 ? counter % 128 : adjustedCounter & 0xff;
        const amplitude = divCounter < 2 ? 8 : 12;
        const y2 = -((amplitude * GBA_SINE_TABLE_256[sineIndex]!) >> 8) + 0;
        expect(verticalJumpsBigFrameAtTick(tick), `counter ${counter}`).toEqual({
          x2: 0,
          y2,
          data0: 4,
          data2: counter + 12,
          counter,
          divCounter,
          adjustedCounter,
          sineIndex,
          amplitude,
          callback: "VerticalJumps",
        });
      }
    });

    it("pins every phase edge, including the counter-=256 and signed sine boundaries", () => {
      expect([0, 10, 11, 21, 22, 31, 32].map((tick) => {
        const frame = verticalJumpsBigFrameAtTick(tick)!;
        return [tick, frame.counter, frame.divCounter, frame.adjustedCounter,
          frame.sineIndex, frame.amplitude, frame.y2];
      })).toEqual([
        [0, 0, 0, 0, 0, 8, 0],
        [10, 120, 0, 120, 120, 8, -1],
        [11, 132, 1, 132, 4, 8, 0],
        [21, 252, 1, 252, 124, 8, 0],
        [22, 264, 2, 8, 8, 12, -2],
        [31, 372, 2, 116, 116, 12, -3],
        [32, 384, 3, 128, 128, 12, 0],
      ]);
      expect(verticalJumpsBigFrameAtTick(27)).toMatchObject({
        counter: 324,
        adjustedCounter: 68,
        sineIndex: 68,
        amplitude: 12,
        y2: -11,
      });
    });

    it("cleans up only after counter 384, increments to 408, and stays stable in WaitAnimEnd", () => {
      expect(verticalJumpsBigFrameAtTick(32)).toMatchObject({
        counter: 384,
        data2: 396,
        callback: "VerticalJumps",
      });
      expect(verticalJumpsBigFrameAtTick(33)).toEqual({
        x2: 0,
        y2: 0,
        data0: 4,
        data2: 408,
        counter: 396,
        divCounter: null,
        adjustedCounter: null,
        sineIndex: null,
        amplitude: null,
        callback: "WaitAnimEnd",
      });
      expect(verticalJumpsBigFrameAtTick(34)).toEqual(verticalJumpsBigFrameAtTick(33));
      expect(verticalJumpsBigFrameAtTick(-1)).toBeNull();
    });

    it("regression-pins the accepted Small initializer on the same shared reducer", () => {
      expect([0, 11, 22, 32, 33].map((tick) => verticalJumpsSmallFrameAtTick(tick)))
        .toEqual([
          { x2: 0, y2: 0, data0: 3, data2: 12, counter: 0, divCounter: 0,
            adjustedCounter: 0, sineIndex: 0, amplitude: 6, callback: "VerticalJumps" },
          { x2: 0, y2: 0, data0: 3, data2: 144, counter: 132, divCounter: 1,
            adjustedCounter: 132, sineIndex: 4, amplitude: 6, callback: "VerticalJumps" },
          { x2: 0, y2: -1, data0: 3, data2: 276, counter: 264, divCounter: 2,
            adjustedCounter: 8, sineIndex: 8, amplitude: 9, callback: "VerticalJumps" },
          { x2: 0, y2: 0, data0: 3, data2: 396, counter: 384, divCounter: 3,
            adjustedCounter: 128, sineIndex: 128, amplitude: 9, callback: "VerticalJumps" },
          { x2: 0, y2: 0, data0: 3, data2: 408, counter: 396, divCounter: null,
            adjustedCounter: null, sineIndex: null, amplitude: null, callback: "WaitAnimEnd" },
        ]);
    });

    it.each([
      [172, pichuScenario],
      [304, taillowScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (
      species, scenario,
    ) => {
      expect(scenario).toMatchObject({
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 0,
        trainerId: 50,
      });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const setId of [...scenario.playerSetIds, ...scenario.opponentSetIds]) {
        expect(setId).toBeGreaterThanOrEqual(110);
        expect(setId).toBeLessThanOrEqual(199);
      }
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "PICHU", pichuRunA, pichuRunB, pichuRawA, pichuRawB, 4, 172,
        "cde69635974e4c6a55e7bad360e38a1507db9405f164851cb522ff4ddfb27d1f",
      ],
      [
        "TAILLOW", taillowRunA, taillowRunB, taillowRawA, taillowRawB, 8, 304,
        "c286b13cef798ca9c35f5638852d138363ac4455ab8dc016935bb36379839190",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species, runA, runB, rawA, rawB, animCmdIndex, data2, rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_JUMPS_BIG");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves Small and Big while recognizing the subsequently accepted Twice selector", () => {
      for (const species of [...V_JUMPS_SMALL_FRONT_SPECIES, ...V_JUMPS_BIG_FRONT_SPECIES]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
      expect(selectorTables.frontAnimIds.species.SHARPEDO).toBe(
        "ANIM_H_JUMPS_V_STRETCH_TWICE",
      );
      expect(speciesFrontIdleRestOffset("SHARPEDO")).toEqual({ x2: 0, y2: 0 });
    });
  });

  describe("rotateUpToSidesFrameAtTick (Anim_RotateUpToSides source lifecycle)", () => {
    it("derives exactly HARIYAMA as Factory-reachable with no outside mapping", () => {
      const speciesSelectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
      const generated = Object.entries(speciesSelectors)
        .filter(([, family]) => family === "ANIM_ROTATE_UP_TO_SIDES")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(ROTATE_UP_TO_SIDES_FRONT_SPECIES).toEqual(generated);
      expect(ROTATE_UP_TO_SIDES_FRONT_SPECIES).toEqual(["HARIYAMA"]);
      expect(ROTATE_UP_TO_SIDES_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(ROTATE_UP_TO_SIDES_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(ROTATE_UP_TO_SIDES_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      expect(speciesSelectors.HARIYAMA).toBe("ANIM_ROTATE_UP_TO_SIDES");
      expect(speciesFrontIdleRestOffset("HARIYAMA")).toEqual({ x2: 0, y2: 0 });
    });

    it("pins every active data7 value 0..248 and both source-order flip calls", () => {
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual(
        expect.arrayContaining([0, 2, 7]),
      );
      for (let tick = 0; tick < 32; tick += 1) {
        const data7Before = tick * 8;
        const ySineIndex = data7Before % 128;
        const x2 = -((16 * GBA_SINE_TABLE_256[data7Before]!) >> 8) + 0;
        const y2 = -((16 * GBA_SINE_TABLE_256[ySineIndex]!) >> 8) + 0;
        const rotationSigned = (32 * GBA_SINE_TABLE_256[data7Before]!) >> 8;
        const rotationU16 = rotationSigned & 0xffff;
        expect(rotateUpToSidesFrameAtTick(tick), `data7 ${data7Before}`).toEqual({
          x2,
          y2,
          data0: 0,
          data2: 1,
          data7: data7Before + 8,
          sineIndex: data7Before,
          ySineIndex,
          rotationSigned,
          rotationU16,
          affineRotationU16: (rotationU16 << 8) & 0xffff,
          xScale: 256,
          yScale: 256,
          startedAffine: tick === 0,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          resetSpriteAfterAnim: false,
          callback: "Anim_RotateUpToSides",
          affineMode: "double",
        });
      }
    });

    it("pins sine wrap, signed-to-u16 conversion, shifted rotation, and strict guard edges", () => {
      expect([0, 8, 64, 120, 128, 136, 192, 248].map((data7) => {
        const frame = rotateUpToSidesFrameAtTick(data7 / 8)!;
        return [data7, frame.x2, frame.y2, frame.ySineIndex,
          frame.rotationSigned, frame.rotationU16, frame.affineRotationU16];
      })).toEqual([
        [0, 0, 0, 0, 0, 0, 0],
        [8, -3, -3, 8, 6, 6, 1536],
        [64, -16, -16, 64, 32, 32, 8192],
        [120, -3, -3, 120, 6, 6, 1536],
        [128, 0, 0, 0, 0, 0, 0],
        [136, 4, -3, 8, -7, 65529, 63744],
        [192, 16, -16, 64, -32, 65504, 57344],
        [248, 4, -3, 120, -7, 65529, 63744],
      ]);
      expect(rotateUpToSidesFrameAtTick(31)).toMatchObject({
        data7: 256,
        callback: "Anim_RotateUpToSides",
      });
    });

    it("resets only on the data7=256 callback and remains stable in WaitAnimEnd", () => {
      expect(rotateUpToSidesFrameAtTick(32)).toEqual({
        x2: 0,
        y2: 0,
        data0: 0,
        data2: 1,
        data7: 256,
        sineIndex: null,
        ySineIndex: null,
        rotationSigned: null,
        rotationU16: 0,
        affineRotationU16: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(rotateUpToSidesFrameAtTick(33)).toEqual(rotateUpToSidesFrameAtTick(32));
      expect(rotateUpToSidesFrameAtTick(1000)).toEqual(rotateUpToSidesFrameAtTick(32));
      expect(rotateUpToSidesFrameAtTick(-1)).toBeNull();
    });

    it("stages one complete legal three-mon HARIYAMA Scene-ON party", () => {
      expect(hariyamaScenario).toMatchObject({
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 0,
        trainerId: 50,
      });
      expect(hariyamaScenario.overrides.parties.player).toHaveLength(3);
      expect(hariyamaScenario.overrides.parties.opponent).toHaveLength(3);
      expect(hariyamaScenario.overrides.parties.opponent[0]!.species).toBe(297);
      for (const setId of [
        ...hariyamaScenario.playerSetIds,
        ...hariyamaScenario.opponentSetIds,
      ]) {
        expect(setId).toBeGreaterThanOrEqual(110);
        expect(setId).toBeLessThanOrEqual(199);
      }
      for (const mon of [
        ...hariyamaScenario.overrides.parties.player,
        ...hariyamaScenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it("matches byte-identical raw settled HARIYAMA Scene-ON receipts", () => {
      expect(hariyamaRawA.equals(hariyamaRawB)).toBe(true);
      expect(hariyamaRawA).toHaveLength(373);
      expect(hariyamaRawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(hariyamaRawA).digest("hex")).toBe(
        "1a865d6dc82960110465722aa619bdc1cc5725d4716cfc7c13f363bcf16e6e49",
      );
      expect(hariyamaRunA).toEqual(hariyamaRunB);
      expect(hariyamaRunA.ticks[0]!.battler1).toMatchObject({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex: 6,
        data2: 297,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
    });

    it("regression-pins the predecessor and advances only the accepted adjacent selector", () => {
      expect(horizontalJumpsVerticalStretchTwiceFrameAtTick(156)).toMatchObject({
        x2: 0,
        y2: 0,
        data2: 144,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      for (const species of H_JUMPS_V_STRETCH_TWICE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
      expect(selectorTables.frontAnimIds.species.HAUNTER).toBe("ANIM_FLICKER_INCREASING");
      expect(selectorTables.frontAnimIds.species.KECLEON).toBe("ANIM_FLICKER_INCREASING");
      expect(speciesFrontIdleRestOffset("HAUNTER")).toEqual({ x2: 0, y2: 0 });
      expect(speciesFrontIdleRestOffset("KECLEON")).toEqual({ x2: 0, y2: 0 });
    });
  });

  describe("flickerIncreasingFrameAtTick (Anim_FlickerIncreasing source lifecycle)", () => {
    it("derives exactly HAUNTER and KECLEON as Factory-reachable with no outside mapping", () => {
      const speciesSelectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
      const generated = Object.entries(speciesSelectors)
        .filter(([, family]) => family === "ANIM_FLICKER_INCREASING")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(FLICKER_INCREASING_FRONT_SPECIES).toEqual(generated);
      expect(FLICKER_INCREASING_FRONT_SPECIES).toEqual(["HAUNTER", "KECLEON"]);
      expect(FLICKER_INCREASING_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(FLICKER_INCREASING_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(FLICKER_INCREASING_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of generated) {
        expect(speciesSelectors[species]).toBe("ANIM_FLICKER_INCREASING");
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins tick 0 and every phase's invisible callbacks followed by its equality edge", () => {
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual(
        expect.arrayContaining([0, 2, 7]),
      );
      expect(flickerIncreasingFrameAtTick(0)).toEqual({
        x2: 0,
        y2: 0,
        data0: 0,
        data2Before: 0,
        data7Before: 0,
        data2: 1,
        data7: 0,
        resetData7AtStart: true,
        equalityBranch: true,
        invisible: false,
        terminalGuard: false,
        callback: "Anim_FlickerIncreasing",
      });

      let tick = 1;
      for (let phase = 1; phase <= 10; phase += 1) {
        for (let invisibleIndex = 0; invisibleIndex < phase; invisibleIndex += 1) {
          expect(flickerIncreasingFrameAtTick(tick), `phase ${phase} invisible ${invisibleIndex}`).toEqual({
            x2: 0,
            y2: 0,
            data0: 0,
            data2Before: phase,
            data7Before: invisibleIndex,
            data2: phase,
            data7: invisibleIndex + 1,
            resetData7AtStart: false,
            equalityBranch: false,
            invisible: true,
            terminalGuard: false,
            callback: "Anim_FlickerIncreasing",
          });
          tick += 1;
        }

        expect(flickerIncreasingFrameAtTick(tick), `phase ${phase} equality`).toEqual({
          x2: 0,
          y2: 0,
          data0: 0,
          data2Before: phase,
          data7Before: phase,
          data2: phase + 1,
          data7: 0,
          resetData7AtStart: false,
          equalityBranch: true,
          invisible: false,
          terminalGuard: phase === 10,
          callback: phase === 10 ? "WaitAnimEnd" : "Anim_FlickerIncreasing",
        });
        tick += 1;
      }
      expect(tick).toBe(66);
    });

    it("terminates only on callback 66 and remains visibly stable in WaitAnimEnd", () => {
      const callbacks = Array.from({ length: 66 }, (_, tick) => flickerIncreasingFrameAtTick(tick)!);
      expect(callbacks).toHaveLength(66);
      expect(callbacks.findIndex(({ callback }) => callback === "WaitAnimEnd")).toBe(65);
      expect(callbacks.slice(0, 65).every(({ terminalGuard }) => !terminalGuard)).toBe(true);
      expect(callbacks[64]).toMatchObject({
        data2Before: 10,
        data7Before: 9,
        data2: 10,
        data7: 10,
        invisible: true,
        terminalGuard: false,
      });
      expect(callbacks[65]).toMatchObject({
        data2Before: 10,
        data7Before: 10,
        data2: 11,
        data7: 0,
        equalityBranch: true,
        invisible: false,
        terminalGuard: true,
        callback: "WaitAnimEnd",
      });
      expect(flickerIncreasingFrameAtTick(66)).toEqual(callbacks[65]);
      expect(flickerIncreasingFrameAtTick(1000)).toEqual(callbacks[65]);
      expect(flickerIncreasingFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["HAUNTER", haunterScenario, 93],
      ["KECLEON", kecleonScenario, 352],
    ] as const)("stages a complete legal three-mon %s Scene-ON party", (
      _species, scenario, speciesId,
    ) => {
      expect(scenario).toMatchObject({
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 0,
        trainerId: 50,
      });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(speciesId);
      for (const setId of [...scenario.playerSetIds, ...scenario.opponentSetIds]) {
        expect(setId).toBeGreaterThanOrEqual(110);
        expect(setId).toBeLessThanOrEqual(199);
      }
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "HAUNTER", haunterRunA, haunterRunB, haunterRawA, haunterRawB, 93, 372,
        "398f043ed6a00f057c7ada95eb36e89f21000f886ffac5afd77df79055539c54",
      ],
      [
        "KECLEON", kecleonRunA, kecleonRunB, kecleonRawA, kecleonRawB, 352, 373,
        "f231f0843138b3b18ff69bbbb6ee4d10df6f77f42fa553b5c603a39eb41f3e38",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species, runA, runB, rawA, rawB, speciesId, rawBytes, rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA).toHaveLength(rawBytes);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_FLICKER_INCREASING");
      expect(runA.ticks[0]!.battler1).toMatchObject({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex: 4,
        data2: speciesId,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
    });

    it("regression-pins ROTATE_UP_TO_SIDES and identifies the next staged-growth census", () => {
      expect(rotateUpToSidesFrameAtTick(32)).toMatchObject({
        x2: 0,
        y2: 0,
        data7: 256,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(speciesFrontIdleRestOffset("HARIYAMA")).toEqual({ x2: 0, y2: 0 });
      for (const species of ["GENGAR", "QWILFISH", "LUGIA"] as const) {
        expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_GROW_IN_STAGES");
        expect(GROW_IN_STAGES_FRONT_SPECIES).toContain(species);
      }
    });
  });

  describe("growInStagesFrameAtTick (Anim_GrowInStages source lifecycle)", () => {
    it("derives the exact 3/2/1 selector census and batch-pins QWILFISH", () => {
      const selectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
      const generated = Object.entries(selectors)
        .filter(([, family]) => family === "ANIM_GROW_IN_STAGES")
        .map(([species]) => species);
      expect(GROW_IN_STAGES_FRONT_SPECIES).toEqual(generated);
      expect(GROW_IN_STAGES_FRONT_SPECIES).toEqual(["GENGAR", "QWILFISH", "LUGIA"]);
      expect(GROW_IN_STAGES_FACTORY_FRONT_SPECIES).toEqual(["GENGAR", "QWILFISH"]);
      expect(GROW_IN_STAGES_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual(["LUGIA"]);
      for (const species of generated) {
        expect(selectors[species]).toBe("ANIM_GROW_IN_STAGES");
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins all 115 callbacks, GBA trig writes, affine state, and normal-front flips", () => {
      expect(ADD_NEW_ANIM_DEFAULTS).toEqual({ rotation: 0, delay: 0, runs: 1, speed: 0, data: 0 });
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual(
        expect.arrayContaining([0, 2, 5, 6, 7]),
      );
      const callbacks = Array.from({ length: 115 }, (_, tick) => growInStagesFrameAtTick(tick)!);
      expect(callbacks).toHaveLength(115);
      for (const [tick, frame] of callbacks.entries()) {
        expect(frame.data0, `data0 tick ${tick}`).toBe(0);
        expect(frame.data2, `data2 tick ${tick}`).toBe(1);
        expect(frame.normalFrontDontFlip, `dontFlip tick ${tick}`).toBe(true);
        expect(frame.tryFlipXCalls, `TryFlipX tick ${tick}`).toBe(2);
        expect(frame.x2, `x2 tick ${tick}`).toBe(0);
        expect(frame.y2, `y2 tick ${tick}`).toBe(0);
        if (frame.sineValue !== null) {
          const trigIndex = frame.sineFunction === "Cos" ? frame.sineIndex! + 64 : frame.sineIndex!;
          const tableValue = GBA_SINE_TABLE_256[((trigIndex % 256) + 256) % 256]!;
          expect(frame.sineValue, `GBA trig tick ${tick}`).toBe(Math.floor((64 * tableValue) / 256));
        }
        if (frame.affineWriteCount > 0) {
          expect(frame.xScale, `xScale tick ${tick}`).toBe(256 - frame.sineValue!);
          expect(frame.yScale, `yScale tick ${tick}`).toBe(frame.xScale);
        }
      }
      expect(createHash("sha256").update(JSON.stringify(callbacks)).digest("hex")).toBe(
        "2c17c901ebcd059f834a9ed04a454d4c1aab97d7d69f0774d1523ffaeb417fb8",
      );
    });

    it("pins every strict stage transition and source-order delay decrement boundary", () => {
      expect(growInStagesFrameAtTick(0)).toMatchObject({
        data2Before: 0, data5: 0, data6: 0, data7: 2, startedAffine: true,
        sineFunction: "Sin", sineIndex: 0, sineValue: 0, xScale: 256,
      });
      expect(growInStagesFrameAtTick(5)).toMatchObject({ data5: 0, data7: 12, sineValue: 15 });
      expect(growInStagesFrameAtTick(6)).toMatchObject({ data5: 1, data6: 20, data7: 14, sineValue: 18 });
      expect(growInStagesFrameAtTick(26)).toMatchObject({ data5: 1, data6: 0, data7: 14, delayBranch: true });
      expect(growInStagesFrameAtTick(37)).toMatchObject({ data5: 1, data7: 36, sineValue: 47 });
      expect(growInStagesFrameAtTick(38)).toMatchObject({ data5: 2, data6: 20, data7: 38, sineValue: 49 });
      expect(growInStagesFrameAtTick(58)).toMatchObject({ data5: 2, data6: 0, data7: 38, delayBranch: true });
      expect(growInStagesFrameAtTick(71)).toMatchObject({ data5: 2, data7: 64, sineValue: 63 });
      expect(growInStagesFrameAtTick(72)).toMatchObject({ data5: 3, data6: 10, data7: 2, sineValue: 64, xScale: 192 });
      for (let tick = 73; tick <= 82; tick += 1) {
        expect(growInStagesFrameAtTick(tick), `stage-3 delay tick ${tick}`).toMatchObject({
          data5: 3, data6: 82 - tick, data7: 2, delayBranch: true,
          sineFunction: null, sineIndex: null, sineValue: null,
          affineWriteCount: 0, xScale: 192, yScale: 192,
        });
      }
      expect(growInStagesFrameAtTick(83)).toMatchObject({ data5: 3, data7: 4, sineFunction: "Cos", sineIndex: 2, sineValue: 63 });
    });

    it("pins C truncation for every 20-callback scale delay", () => {
      for (const [start, heldData7] of [[7, 14], [39, 38]] as const) {
        for (let offset = 0; offset < 20; offset += 1) {
          const remaining = 19 - offset;
          const cScaleOffset = Math.trunc((8 * remaining) / 20);
          expect(growInStagesFrameAtTick(start + offset)).toMatchObject({
            data6: remaining,
            cScaleOffset,
            sineIndex: heldData7 - cScaleOffset,
            delayBranch: true,
            affineWriteCount: 1,
          });
        }
      }
    });

    it("does not terminate before tick 114 and preserves terminal source ordering stably", () => {
      expect(Array.from({ length: 114 }, (_, tick) => growInStagesFrameAtTick(tick)!)
        .every(({ callback }) => callback === "Anim_GrowInStages")).toBe(true);
      const terminal = growInStagesFrameAtTick(114)!;
      expect(terminal).toMatchObject({
        data5: 3, data6: 0, data7Before: 64, data7: 66,
        sineFunction: "Cos", sineIndex: 64, sineValue: 0,
        xScale: 256, yScale: 256, affineWriteCount: 2,
        resetSpriteAfterAnim: true, callback: "WaitAnimEnd", affineMode: "normal",
      });
      expect(growInStagesFrameAtTick(115)).toEqual(terminal);
      expect(growInStagesFrameAtTick(1000)).toEqual(terminal);
      expect(growInStagesFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["GENGAR", gengarScenario, 94],
      ["LUGIA", lugiaScenario, 249],
    ] as const)("stages a complete legal three-mon %s Scene-ON party", (_species, scenario, speciesId) => {
      expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 0, trainerId: 50 });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(speciesId);
      for (const setId of [...scenario.playerSetIds, ...scenario.opponentSetIds]) {
        expect(setId).toBeGreaterThanOrEqual(110);
        expect(setId).toBeLessThanOrEqual(199);
      }
      for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({ item: expect.any(Number), abilitySlot: expect.any(Number), friendship: expect.any(Number), gender: expect.any(String), shiny: expect.any(Boolean) }));
      }
    });

    it.each([
      ["GENGAR", gengarRunA, gengarRunB, gengarRawA, gengarRawB, 94, 2, 372, "b1a87f64c1c95e92d52e09a9e7d6937f1e4b28ea98cbb8bed5c6de6c42d4277e"],
      ["LUGIA", lugiaRunA, lugiaRunB, lugiaRawA, lugiaRawB, 249, 1, 373, "5c965e88720ddd92cc03b60f165942999ee5d4c8c205b86752dcdcad417eeca8"],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (species, runA, runB, rawA, rawB, speciesId, animCmdIndex, rawBytes, rawSha256) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA).toHaveLength(rawBytes);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_GROW_IN_STAGES");
      expect(runA.ticks[0]!.battler1).toMatchObject({ x2: 0, y2: 0, animNum: 1, animCmdIndex, data2: speciesId, callback: "0x8007428", callbackSymbol: "SpriteCallbackDummy" });
    });

    it("regression-pins FLICKER_INCREASING and leaves adjacent unused selectors unported", () => {
      expect(flickerIncreasingFrameAtTick(65)).toMatchObject({ data2: 11, invisible: false, callback: "WaitAnimEnd" });
      expect(speciesFrontIdleRestOffset("HAUNTER")).toEqual({ x2: 0, y2: 0 });
      const selectorValues = Object.values(selectorTables.frontAnimIds.species);
      expect(selectorValues).not.toContain("ANIM_V_SPRING");
      expect(selectorValues).not.toContain("ANIM_V_REPEATED_SPRING");
      expect(selectorValues).not.toContain("ANIM_SPRING_RISING");
    });
  });

  describe("lungeGrowFrameAtTick (Anim_LungeGrow source lifecycle)", () => {
    it("derives the exact 2/2/0 selector census from generated tables", () => {
      const selectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
      const generated = Object.entries(selectors)
        .filter(([, family]) => family === "ANIM_LUNGE_GROW")
        .map(([species]) => species);
      expect(LUNGE_GROW_FRONT_SPECIES).toEqual(generated);
      expect(LUNGE_GROW_FRONT_SPECIES).toEqual(["DODRIO", "HERACROSS"]);
      expect(LUNGE_GROW_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(LUNGE_GROW_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => new Set(
          (frontierMons.entries as readonly { readonly species: string }[])
            .map(({ species }) => species.replace(/^SPECIES_/, "")),
        ).has(species)),
      );
      expect(LUNGE_GROW_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of generated) {
        expect(selectors[species]).toBe("ANIM_LUNGE_GROW");
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins all 66 callbacks, GBA trig writes, affine state, and both normal-front flips", () => {
      expect(ADD_NEW_ANIM_DEFAULTS).toEqual({ rotation: 0, delay: 0, runs: 1, speed: 0, data: 0 });
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual(
        expect.arrayContaining([0, 2, 7]),
      );
      const callbacks = Array.from({ length: 66 }, (_, tick) => lungeGrowFrameAtTick(tick)!);
      expect(callbacks).toHaveLength(66);
      for (const [tick, frame] of callbacks.entries()) {
        expect(frame.data0, `data0 tick ${tick}`).toBe(0);
        expect(frame.data2, `data2 tick ${tick}`).toBe(1);
        expect(frame.normalFrontDontFlip, `dontFlip tick ${tick}`).toBe(true);
        expect(frame.tryFlipXCalls, `TryFlipX tick ${tick}`).toBe(2);
        expect(frame.y2, `y2 tick ${tick}`).toBe(0);
        expect(frame.affineWriteCount, `affine writes tick ${tick}`).toBe(1);
        if (frame.xSineIndex !== null) {
          const xTableValue = GBA_SINE_TABLE_256[frame.xSineIndex]!;
          const scaleTableValue = GBA_SINE_TABLE_256[frame.scaleSineIndex!]!;
          expect(frame.xSineValue, `x sine tick ${tick}`).toBe(
            Math.floor((16 * xTableValue) / 256),
          );
          expect(frame.scaleSineValue, `scale sine tick ${tick}`).toBe(
            Math.floor((64 * scaleTableValue) / 256),
          );
          expect(frame.x2, `x2 tick ${tick}`).toBe(-frame.xSineValue! + 0);
          expect(frame.xScale, `xScale tick ${tick}`).toBe(256 - frame.scaleSineValue!);
          expect(frame.yScale, `yScale tick ${tick}`).toBe(frame.xScale);
        }
      }
    });

    it("pins source ordering, C truncation, sine wrap, tick-0 affine start, and strict terminal guard", () => {
      expect(lungeGrowFrameAtTick(0)).toEqual({
        x2: 0, y2: 0, data0: 0, data2Before: 0, data2: 1,
        data7Before: 0, data7: 8, xSineIndex: 0, xSineValue: 0,
        scaleSineIndex: 4, scaleSineValue: 6, xScale: 250, yScale: 250,
        startedAffine: true, normalFrontDontFlip: true, tryFlipXCalls: 2,
        affineWriteCount: 1, resetSpriteAfterAnim: false,
        callback: "Anim_LungeGrow", affineMode: "double",
      });
      for (let tick = 0; tick <= 64; tick += 1) {
        const frame = lungeGrowFrameAtTick(tick)!;
        expect(frame.data7Before).toBe(tick * 8);
        expect(frame.xSineIndex).toBe(Math.trunc(((tick * 8) % 256) / 2));
        expect(frame.scaleSineIndex).toBe(Math.trunc((((tick + 1) * 8) % 256) / 2));
        expect(frame.callback, `active callback ${tick}`).toBe("Anim_LungeGrow");
        expect(frame.resetSpriteAfterAnim, `active callback ${tick}`).toBe(false);
      }
      expect(lungeGrowFrameAtTick(31)).toMatchObject({ data7Before: 248, data7: 256, xSineIndex: 124, scaleSineIndex: 0 });
      expect(lungeGrowFrameAtTick(32)).toMatchObject({ data7Before: 256, data7: 264, xSineIndex: 0, scaleSineIndex: 4 });
      expect(lungeGrowFrameAtTick(64)).toMatchObject({ data7Before: 512, data7: 520, callback: "Anim_LungeGrow" });
    });

    it("terminates only at data7 520 and keeps the reset/identity state byte-stable", () => {
      const terminal = lungeGrowFrameAtTick(65)!;
      expect(terminal).toEqual({
        x2: 0, y2: 0, data0: 0, data2Before: 1, data2: 1,
        data7Before: 520, data7: 520, xSineIndex: null, xSineValue: null,
        scaleSineIndex: null, scaleSineValue: null, xScale: 256, yScale: 256,
        startedAffine: false, normalFrontDontFlip: true, tryFlipXCalls: 2,
        affineWriteCount: 1, resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd", affineMode: "normal",
      });
      expect(lungeGrowFrameAtTick(66)).toEqual(terminal);
      expect(lungeGrowFrameAtTick(1000)).toEqual(terminal);
      expect(lungeGrowFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["DODRIO", dodrioScenario, 85],
      ["HERACROSS", heracrossScenario, 214],
    ] as const)("stages a complete legal three-mon %s Scene-ON party", (_species, scenario, speciesId) => {
      expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 0, trainerId: 50 });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(speciesId);
      for (const setId of [...scenario.playerSetIds, ...scenario.opponentSetIds]) {
        expect(setId).toBeGreaterThanOrEqual(110);
        expect(setId).toBeLessThanOrEqual(199);
      }
      for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({ item: expect.any(Number), abilitySlot: expect.any(Number), friendship: expect.any(Number), gender: expect.any(String), shiny: expect.any(Boolean) }));
      }
    });

    it.each([
      ["DODRIO", dodrioRunA, dodrioRunB, dodrioRawA, dodrioRawB, 85, 8, 372, "16487508c32e6eb17cb5e46531161779bf8e18440e1469f9e81a0d119d5b1760"],
      ["HERACROSS", heracrossRunA, heracrossRunB, heracrossRawA, heracrossRawB, 214, 4, 373, "881886efd435b939ebb35bd0a017b4602cbf06fd7c6be8d72871ed22c75fc082"],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (species, runA, runB, rawA, rawB, speciesId, animCmdIndex, rawBytes, rawSha256) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA).toHaveLength(rawBytes);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_LUNGE_GROW");
      expect(runA.ticks[0]!.battler1).toMatchObject({ x2: 0, y2: 0, animNum: 1, animCmdIndex, data2: speciesId, callback: "0x8007428", callbackSymbol: "SpriteCallbackDummy" });
    });

    it("regression-pins GROW_IN_STAGES and identifies the next circle selector", () => {
      expect(growInStagesFrameAtTick(114)).toMatchObject({ xScale: 256, yScale: 256, callback: "WaitAnimEnd" });
      expect(speciesFrontIdleRestOffset("GENGAR")).toEqual({ x2: 0, y2: 0 });
      expect(selectorTables.frontAnimIds.species.KINGDRA).toBe("ANIM_CIRCLE_INTO_BG");
      expect(speciesFrontIdleRestOffset("KINGDRA")).toEqual({ x2: 0, y2: 0 });
      const selectorValues = Object.values(selectorTables.frontAnimIds.species);
      expect(selectorValues).not.toContain("ANIM_H_LUNGE");
      expect(selectorValues).not.toContain("ANIM_V_SPRING");
      expect(selectorValues).not.toContain("ANIM_V_REPEATED_SPRING");
      expect(selectorValues).not.toContain("ANIM_SPRING_RISING");
    });
  });

  describe("circleIntoBackgroundFrameAtTick (Anim_CircleIntoBackground source lifecycle)", () => {
    it("derives exactly KINGDRA as Factory-reachable with no outside mapping", () => {
      const selectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
      const generated = Object.entries(selectors)
        .filter(([, family]) => family === "ANIM_CIRCLE_INTO_BG")
        .map(([species]) => species);
      const factorySpecies = new Set(
        (frontierMons.entries as readonly { readonly species: string }[])
          .map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(CIRCLE_INTO_BG_FRONT_SPECIES).toEqual(generated);
      expect(CIRCLE_INTO_BG_FRONT_SPECIES).toEqual(["KINGDRA"]);
      expect(CIRCLE_INTO_BG_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(CIRCLE_INTO_BG_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(CIRCLE_INTO_BG_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      expect(selectors.KINGDRA).toBe("ANIM_CIRCLE_INTO_BG");
      expect(speciesFrontIdleRestOffset("KINGDRA")).toEqual({ x2: 0, y2: 0 });
    });

    it("pins tick 0 initialization and every active data7/GBA trig write", () => {
      expect(ADD_NEW_ANIM_DEFAULTS).toEqual({ rotation: 0, delay: 0, runs: 1, speed: 0, data: 0 });
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual(
        expect.arrayContaining([0, 2, 7]),
      );
      const callbacks = Array.from({ length: 65 }, (_, tick) => circleIntoBackgroundFrameAtTick(tick)!);
      expect(callbacks).toHaveLength(65);
      for (const [tick, frame] of callbacks.entries()) {
        const data7Before = tick * 8;
        const xSineIndex = data7Before % 256;
        const data7 = data7Before + 8;
        const scaleSineIndex = Math.trunc((data7 % 256) / 2);
        const xSineValue = Math.floor((8 * GBA_SINE_TABLE_256[xSineIndex]!) / 256);
        const scaleSineValue = Math.floor((96 * GBA_SINE_TABLE_256[scaleSineIndex]!) / 256);
        expect(frame, `data7 ${data7Before}`).toEqual({
          x2: -xSineValue + 0,
          y2: 0,
          data0: 0,
          data2Before: tick === 0 ? 0 : 1,
          data2: 1,
          data7Before,
          data7,
          xSineIndex,
          xSineValue,
          scaleSineIndex,
          scaleSineValue,
          xScale: 256 + scaleSineValue,
          yScale: 256 + scaleSineValue,
          startedAffine: tick === 0,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          affineWriteCount: 1,
          resetSpriteAfterAnim: false,
          callback: "Anim_CircleIntoBackground",
          affineMode: "double",
        });
      }
    });

    it("pins C truncation, signed sine wrap, and the strict data7 guard edges", () => {
      expect(circleIntoBackgroundFrameAtTick(0)).toMatchObject({
        data2Before: 0, data7Before: 0, data7: 8, xSineIndex: 0,
        scaleSineIndex: 4, x2: 0, xScale: 265, startedAffine: true,
      });
      expect([0, 8, 64, 120, 128, 136, 192, 248].map((data7) => {
        const frame = circleIntoBackgroundFrameAtTick(data7 / 8)!;
        return [data7, frame.xSineIndex, frame.xSineValue, frame.x2];
      })).toEqual([
        [0, 0, 0, 0],
        [8, 8, 1, -1],
        [64, 64, 8, -8],
        [120, 120, 1, -1],
        [128, 128, 0, 0],
        [136, 136, -2, 2],
        [192, 192, -8, 8],
        [248, 248, -2, 2],
      ]);
      expect(circleIntoBackgroundFrameAtTick(31)).toMatchObject({
        data7Before: 248, data7: 256, scaleSineIndex: 0,
      });
      expect(circleIntoBackgroundFrameAtTick(32)).toMatchObject({
        data7Before: 256, data7: 264, xSineIndex: 0, scaleSineIndex: 4,
      });
      expect(circleIntoBackgroundFrameAtTick(64)).toMatchObject({
        data7Before: 512, data7: 520, callback: "Anim_CircleIntoBackground",
      });
    });

    it("cleans up only when data7 is 520 and keeps terminal callbacks stable", () => {
      const terminal = circleIntoBackgroundFrameAtTick(65)!;
      expect(terminal).toEqual({
        x2: 0, y2: 0, data0: 0, data2Before: 1, data2: 1,
        data7Before: 520, data7: 520, xSineIndex: null, xSineValue: null,
        scaleSineIndex: null, scaleSineValue: null, xScale: 256, yScale: 256,
        startedAffine: false, normalFrontDontFlip: true, tryFlipXCalls: 2,
        affineWriteCount: 1, resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd", affineMode: "normal",
      });
      expect(circleIntoBackgroundFrameAtTick(66)).toEqual(terminal);
      expect(circleIntoBackgroundFrameAtTick(1000)).toEqual(terminal);
      expect(circleIntoBackgroundFrameAtTick(-1)).toBeNull();
    });

    it("stages one complete legal challenge-0 KINGDRA Scene-ON party", () => {
      expect(kingdraScenario).toMatchObject({
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 0,
        trainerId: 50,
      });
      expect(kingdraScenario.overrides.parties.player).toHaveLength(3);
      expect(kingdraScenario.overrides.parties.opponent).toHaveLength(3);
      expect(kingdraScenario.overrides.parties.opponent[0]!.species).toBe(230);
      expect(kingdraScenario.overrides.parties.opponent[0]!.moves).toEqual([56, 225, 196, 213]);
      for (const setId of [
        ...kingdraScenario.playerSetIds,
        ...kingdraScenario.opponentSetIds,
      ]) {
        expect(setId).toBeGreaterThanOrEqual(110);
        expect(setId).toBeLessThanOrEqual(199);
      }
      for (const mon of [
        ...kingdraScenario.overrides.parties.player,
        ...kingdraScenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it("matches the paired byte-identical raw settled KINGDRA Scene-ON receipts", () => {
      expect(kingdraRawA.equals(kingdraRawB)).toBe(true);
      expect(kingdraRawA).toHaveLength(373);
      expect(kingdraRawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(kingdraRawA).digest("hex")).toBe(
        "1747d48abbe711e2b6d799caa48fe7cb95d6ad276a461713902556b3b229043b",
      );
      expect(kingdraRunA).toEqual(kingdraRunB);
      expect(selectorTables.frontAnimIds.species.KINGDRA).toBe("ANIM_CIRCLE_INTO_BG");
      expect(kingdraRunA.ticks[0]!.battler1).toMatchObject({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex: 4,
        data2: 230,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
    });

    it("regression-pins the accepted adjacent lunge family", () => {
      expect(lungeGrowFrameAtTick(65)).toMatchObject({
        data7Before: 520, xScale: 256, yScale: 256,
        resetSpriteAfterAnim: true, callback: "WaitAnimEnd", affineMode: "normal",
      });
      for (const species of LUNGE_GROW_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("fourPetalFrameAtTick (Anim_FourPetal source lifecycle)", () => {
    const sourceSin = (index: number, amplitude = 8): number =>
      Math.floor(
        (amplitude * GBA_SINE_TABLE_256[((index % 256) + 256) % 256]!) / 256,
      );
    const sourceCos = (index: number): number => sourceSin(index + 64);

    it("derives exactly REGICE as Factory-reachable with no outside mapping", () => {
      const selectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
      const generated = Object.entries(selectors)
        .filter(([, family]) => family === "ANIM_FOUR_PETAL")
        .map(([species]) => species);
      const factorySpecies = new Set(
        (frontierMons.entries as readonly { readonly species: string }[])
          .map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(FOUR_PETAL_FRONT_SPECIES).toEqual(generated);
      expect(FOUR_PETAL_FRONT_SPECIES).toEqual(["REGICE"]);
      expect(FOUR_PETAL_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(FOUR_PETAL_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(FOUR_PETAL_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      expect(selectors.REGICE).toBe("ANIM_FOUR_PETAL");
      expect(speciesFrontIdleRestOffset("REGICE")).toEqual({ x2: 0, y2: 0 });
    });

    it("pins tick-zero data6/data7/data2 source ordering", () => {
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual(
        expect.arrayContaining([0, 2, 6, 7]),
      );
      expect(fourPetalFrameAtTick(0)).toEqual({
        x2: -1,
        y2: -2,
        data0: 0,
        data2Before: 0,
        data2: 1,
        data6Before: 0,
        data6: 0,
        data7Before: 0,
        data7AfterInitialization: 64,
        data7AfterIncrement: 72,
        data7: 72,
        initialized: true,
        phaseGuardLimit: 127,
        phaseTransition: false,
        switchArm: 0,
        xTrigFunction: "Sin",
        xTrigIndex: 72,
        xTrigValue: 7,
        yTrigFunction: "Cos",
        yTrigIndex: 72,
        yTrigValue: -2,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        callback: "Anim_FourPetal",
      });
    });

    it("pins every active callback, phase transition, switch arm, and signed GBA trig write", () => {
      let data6 = 0;
      let data7 = 0;
      const callbacks = Array.from({ length: 63 }, (_, tick) => fourPetalFrameAtTick(tick)!);
      expect(callbacks).toHaveLength(63);

      for (const [tick, frame] of callbacks.entries()) {
        const data2Before = tick === 0 ? 0 : 1;
        const data6Before = data6;
        const data7Before = data7;
        const initialized = tick === 0;
        if (initialized) {
          data6 = 0;
          data7 = 64;
        }
        const data7AfterInitialization = data7;
        data7 += 8;
        const data7AfterIncrement = data7;
        const phaseGuardLimit = data6 === 4 ? 63 : 127;
        const phaseTransition = data7 > phaseGuardLimit;
        if (phaseTransition) {
          data7 = 0;
          data6 += 1;
        }

        let x2: number;
        let y2: number;
        let xTrigFunction: "Sin" | "Cos";
        let xTrigIndex: number;
        let xTrigValue: number;
        let yTrigFunction: "Sin" | "Cos";
        let yTrigIndex: number;
        let yTrigValue: number;
        if (data6 === 1) {
          xTrigFunction = "Cos";
          xTrigIndex = data7;
          xTrigValue = sourceCos(data7);
          yTrigFunction = "Sin";
          yTrigIndex = data7;
          yTrigValue = sourceSin(data7);
          x2 = -xTrigValue + 0;
          y2 = yTrigValue - 8;
        } else if (data6 === 2) {
          xTrigFunction = "Sin";
          xTrigIndex = data7 + 128;
          xTrigValue = sourceSin(data7 + 128);
          yTrigFunction = "Cos";
          yTrigIndex = data7;
          yTrigValue = sourceCos(data7);
          x2 = xTrigValue + 8;
          y2 = -yTrigValue + 0;
        } else if (data6 === 3) {
          xTrigFunction = "Cos";
          xTrigIndex = data7;
          xTrigValue = sourceCos(data7);
          yTrigFunction = "Sin";
          yTrigIndex = data7 + 128;
          yTrigValue = sourceSin(data7 + 128);
          x2 = xTrigValue + 0;
          y2 = yTrigValue + 8;
        } else {
          xTrigFunction = "Sin";
          xTrigIndex = data7;
          xTrigValue = sourceSin(data7);
          yTrigFunction = "Cos";
          yTrigIndex = data7;
          yTrigValue = sourceCos(data7);
          x2 = xTrigValue - 8;
          y2 = yTrigValue + 0;
        }

        expect(frame, `tick ${tick}`).toEqual({
          x2,
          y2,
          data0: 0,
          data2Before,
          data2: 1,
          data6Before,
          data6,
          data7Before,
          data7AfterInitialization,
          data7AfterIncrement,
          data7,
          initialized,
          phaseGuardLimit,
          phaseTransition,
          switchArm: data6,
          xTrigFunction,
          xTrigIndex,
          xTrigValue,
          yTrigFunction,
          yTrigIndex,
          yTrigValue,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          callback: "Anim_FourPetal",
        });
      }
    });

    it("uses >127 for phases 0..3, the distinct phase-4 >63 guard, and exact resets", () => {
      expect([6, 7, 22, 23, 38, 39, 54, 55, 62, 63].map((tick) => {
        const frame = fourPetalFrameAtTick(tick)!;
        return [
          tick,
          frame.data6Before,
          frame.data7AfterIncrement,
          frame.phaseGuardLimit,
          frame.phaseTransition,
          frame.data6,
          frame.data7,
        ];
      })).toEqual([
        [6, 0, 120, 127, false, 0, 120],
        [7, 0, 128, 127, true, 1, 0],
        [22, 1, 120, 127, false, 1, 120],
        [23, 1, 128, 127, true, 2, 0],
        [38, 2, 120, 127, false, 2, 120],
        [39, 2, 128, 127, true, 3, 0],
        [54, 3, 120, 127, false, 3, 120],
        [55, 3, 128, 127, true, 4, 0],
        [62, 4, 56, 63, false, 4, 56],
        [63, 4, 64, 63, true, 5, 0],
      ]);
    });

    it("takes the default arm only at tick 63 and keeps WaitAnimEnd stable", () => {
      const terminal = fourPetalFrameAtTick(63)!;
      expect(terminal).toEqual({
        x2: 0,
        y2: 0,
        data0: 0,
        data2Before: 1,
        data2: 1,
        data6Before: 4,
        data6: 5,
        data7Before: 56,
        data7AfterInitialization: 56,
        data7AfterIncrement: 64,
        data7: 0,
        initialized: false,
        phaseGuardLimit: 63,
        phaseTransition: true,
        switchArm: "default",
        xTrigFunction: null,
        xTrigIndex: null,
        xTrigValue: null,
        yTrigFunction: null,
        yTrigIndex: null,
        yTrigValue: null,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        callback: "WaitAnimEnd",
      });
      expect(fourPetalFrameAtTick(64)).toEqual(terminal);
      expect(fourPetalFrameAtTick(1000)).toEqual(terminal);
      expect(fourPetalFrameAtTick(-1)).toBeNull();
    });

    it("stages one complete legal challenge-0 REGICE Scene-ON party", () => {
      expect(regiceScenario).toMatchObject({
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 0,
        trainerId: 50,
      });
      expect(regiceScenario.overrides.parties.player).toHaveLength(3);
      expect(regiceScenario.overrides.parties.opponent).toHaveLength(3);
      expect(regiceScenario.overrides.parties.opponent[0]).toMatchObject({
        species: 402,
        moves: [58, 85, 133, 156],
        gender: "genderless",
      });
      for (const setId of [
        ...regiceScenario.playerSetIds,
        ...regiceScenario.opponentSetIds,
      ]) {
        expect(setId).toBeGreaterThanOrEqual(110);
        expect(setId).toBeLessThanOrEqual(199);
      }
      for (const mon of [
        ...regiceScenario.overrides.parties.player,
        ...regiceScenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it("matches paired byte-identical raw settled REGICE Scene-ON receipts", () => {
      expect(regiceRawA.equals(regiceRawB)).toBe(true);
      expect(regiceRawA).toHaveLength(373);
      expect(regiceRawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(regiceRawA).digest("hex")).toBe(
        "e02097374599e03808cf8f1122a6b1b802e69b1a2d2af582e755ee6b627e6cb1",
      );
      expect(regiceRunA).toEqual(regiceRunB);
      expect(selectorTables.frontAnimIds.species.REGICE).toBe("ANIM_FOUR_PETAL");
      expect(regiceRunA.ticks[0]!.battler1).toMatchObject({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex: 4,
        data2: 402,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({
        x2: regiceRunA.ticks[0]!.battler1.x2,
        y2: regiceRunA.ticks[0]!.battler1.y2,
      }).toEqual(speciesFrontIdleRestOffset("REGICE"));
    });

    it("regression-pins accepted slow slide and SmallSlow, then derives the next family", () => {
      expect(circleIntoBackgroundFrameAtTick(65)).toMatchObject({
        x2: 0,
        y2: 0,
        callback: "WaitAnimEnd",
      });
      const selectors = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;
      const acceptedGenerated = Object.entries(selectors)
        .filter(([, family]) => family === "ANIM_V_SLIDE_SLOW")
        .map(([species]) => species);
      expect(acceptedGenerated).toEqual([
        "PIDGEY",
        "AERODACTYL",
        "DRAGONITE",
        "HOOTHOOT",
        "LEDIAN",
      ]);
      for (const species of acceptedGenerated) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
      const nextGenerated = Object.entries(selectors)
        .filter(([, family]) => family === "ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW")
        .map(([species]) => species);
      expect(nextGenerated).toEqual(["CLEFABLE", "AZUMARILL"]);
      for (const species of nextGenerated) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
      const followingGenerated = Object.entries(selectors)
        .filter(([, family]) => family === "ANIM_ZIGZAG_SLOW")
        .map(([species]) => species);
      expect(followingGenerated).toEqual(["VENOMOTH", "KINGLER", "FLYGON"]);
      for (const species of followingGenerated) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });
});
