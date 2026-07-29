import {
  FIRE_PUNCH_BURN_FLAME_FIRST_AGE,
  firePunchBurnFlames,
  firePunchParticlesInDrawOrder,
  firePunchResidualBurnFlames,
  firePunchResolutionState,
  type FirePunchParticle,
  type FirePunchResolutionProfile,
  type FirePunchResolutionState,
} from "./firePunch.ts";
import {
  biteEffectAtAge,
  type BiteEffect,
} from "./bite.ts";
import {
  headbuttAtAge,
  type HeadbuttState,
} from "./headbutt.ts";
import {
  bodySlamAtAge,
  type BodySlamState,
} from "./bodySlam.ts";
import {
  slamAtAge,
  type SlamState,
} from "./slam.ts";
import {
  twineedleEffectAtAge,
  type TwineedleEffect,
} from "./twineedle.ts";
import {
  spikeCannonEffectAtAge,
  type SpikeCannonEffect,
} from "./spikeCannon.ts";
import {
  sonicBoomEffectAtAge,
  type SonicBoomEffect,
} from "./sonicBoom.ts";
import {
  smokescreenEffectAtAge,
  type SmokescreenEffect,
} from "./smokescreen.ts";
import {
  mudShotAtAge,
  type MudShotState,
} from "./mudShot.ts";
import {
  hydroPumpAtAge,
  type HydroPumpState,
} from "./hydroPump.ts";
import {
  bubbleBeamAtAge,
  type BubbleBeamState,
} from "./bubbleBeam.ts";
import {
  crossChopAtAge,
  type CrossChopState,
} from "./crossChop.ts";
import {
  focusEnergyAtAge,
  type FocusEnergyState,
} from "./focusEnergy.ts";
import {
  endureAtAge,
  type EndureState,
} from "./endure.ts";
import {
  reversalAtAge,
  type ReversalResolvedShakeReceipt,
  type ReversalState,
} from "./reversal.ts";
import {
  metallicShineAtAge,
  type MetallicShineState,
} from "./metallicShine.ts";
import {
  calmMindAtAge,
  type CalmMindState,
} from "./calmMind.ts";
import {
  FAINT_ATTACK_ANIMATION_PROFILE,
  faintAttackAttackerEva,
  faintAttackAttackerOffset,
  faintAttackBgState,
  faintAttackHitsplatVisible,
  faintAttackTargetShakeX2,
  type FaintAttackAnimationProfile,
  type FaintAttackBgState,
} from "./faintAttack.ts";
import {
  applyAnimationDisplayIntervalWorkload,
  type AnimationDisplayIntervalWorkload,
  type AnimationGpuRegisterState,
} from "./gpuRegisterQueue.ts";
import {
  actionMenuDisplayAtAge,
  doubleTeamAnimationAtAge,
  genericHitReactionAtAge,
  rockSlideAnimationAtAge,
  statStageDropDisplayAtAge,
  type ActionMenuDisplayTransition,
  type DoubleTeamAnimationProfile,
  type RockSlideAnimationProfile,
  type StatStageDropDisplayProfile,
  type StatStageDropDisplayState,
} from "../engine/battleMenu.ts";
import {
  icePunchHitCrystals,
  icePunchSpiralCrystals,
  icePunchOverlayState,
  type IcePunchCrystal,
  type IcePunchHitCrystal,
  type IcePunchOverlayState,
} from "./icePunch.ts";
import {
  frozenIceCubeAnchor,
  frozenIceCubeState,
  type FrozenIceCubeState,
} from "./frozenIceCube.ts";
import {
  SITRUS_ITEM_ACTION_MENU_REVEAL_AGE,
  sitrusDisplayedHpAtAge,
} from "./heldItemHeal.ts";
import {
  featherDanceSpritesAtAge,
  type FeatherRenderSprite,
} from "./featherDance.ts";
import {
  quickAttackAnimationAtAge,
  type QuickAttackAfterimage,
  type QuickAttackOffset,
} from "./quickAttack.ts";
import {
  aerialAceAnimationAtAge,
  type AerialAceAnimationState,
} from "./aerialAce.ts";
import {
  sandAttackAccuracyBannerAtAge,
  sandAttackAnimationAtAge,
  type SandAttackAnimationProfile,
  type SandAttackAnimationState,
  type SandAttackAccuracyBanner,
} from "./sandAttack.ts";
import {
  mudSlapAnimationAtAge,
  type MudSlapAnimationProfile,
  type MudSlapAnimationState,
} from "./mudSlap.ts";
import {
  flyPresentationAtAge,
  type FlyPresentationState,
  type FlyTurn,
} from "./fly.ts";
import {
  bouncePresentationAtAge,
  type BouncePresentationState,
  type BounceTurn,
} from "./bounce.ts";
import {
  statusAnimationAtSourceAge,
  type StatusAnimationVisual,
} from "./statusAnimation.ts";
import {
  dragonBreathFireSprites,
  dragonBreathTargetEffectAtAge,
  type DragonBreathFireGeometry,
  type DragonBreathFireSprite,
  type DragonBreathTargetEffect,
} from "./dragonBreath.ts";
import {
  flamethrowerBattlerEffectAtAge,
  flamethrowerFlamesAtAge,
  type FlamethrowerBattlerEffect,
  type FlamethrowerFlame,
  type FlamethrowerGeometry,
} from "./flamethrower.ts";
import {
  emberSpritesInDrawOrder,
  type EmberGeometry,
  type EmberOrderedSprite,
} from "./ember.ts";
import {
  blazeKickAnimationAtAge,
  blazeKickPaletteAtAge,
  blazeKickSpritesAtAge,
  type BlazeKickAnimationState,
  type BlazeKickGeometry,
  type BlazeKickOrderedSprite,
  type BlazeKickPaletteState,
} from "./blazeKick.ts";
import {
  bindAnimationAtAge,
  type BindAnimationProfile,
  type BindAnimationState,
} from "./bind.ts";
import {
  growthAnimationAtAge,
  type GrowthAnimationState,
} from "./growth.ts";
import {
  recoverEffectAtAge,
  type RecoverEffectSprite,
} from "./recover.ts";
import {
  moonlightAtAge,
  type MoonlightState,
} from "./moonlight.ts";
import {
  absorbAtAge,
  type AbsorbState,
} from "./absorb.ts";
import {
  reflectAtAge,
  type ReflectState,
} from "./reflect.ts";
import {
  lightScreenAtAge,
  type LightScreenState,
} from "./lightScreen.ts";
import {
  synthesisEffectAtAge,
  type SynthesisSprite,
} from "./synthesis.ts";
import {
  aromatherapyAtAge,
  type AromatherapyState,
} from "./aromatherapy.ts";
import {
  whirlwindAtAge,
  type WhirlwindState,
} from "./whirlwind.ts";
import {
  blockAtAge,
  type BlockState,
} from "./block.ts";
import {
  wishAtAge,
  type WishState,
  type WishTwinkleVariant,
} from "./wish.ts";
import {
  milkDrinkEffectAtAge,
  type MilkDrinkEffectSprite,
} from "./milkDrink.ts";
import {
  supersonicEffectAtAge,
  type SupersonicRingSprite,
} from "./supersonic.ts";
import {
  waterGunEffectAtAge,
  type WaterGunSprite,
} from "./waterGun.ts";
import {
  acidEffectAtAge,
  acidSpritesBackToFrontAtAge,
  type AcidSprite,
} from "./acid.ts";
import {
  sludgeEffectAtAge,
  sludgeSpritesBackToFrontAtAge,
  sludgeTargetPaletteYAtAge,
  type SludgeSprite,
} from "./sludge.ts";
import {
  sludgeBombEffectAtAge,
  type SludgeBombSprite,
} from "./sludgeBomb.ts";
import {
  poisonFangEffectAtAge,
  type PoisonFangSprite,
} from "./poisonFang.ts";
import {
  hyperFangEffectAtAge,
  type HyperFangEffect,
} from "./hyperFang.ts";
import {
  swaggerAtAge,
  type SwaggerState,
} from "./swagger.ts";
import {
  tauntAtAge,
  type TauntState,
} from "./taunt.ts";
import {
  scaryFaceAtAge,
  type ScaryFaceState,
} from "./scaryFace.ts";
import {
  sparkAtAge,
  type SparkState,
} from "./spark.ts";
import {
  thunderWaveAtAge,
  type ThunderWaveState,
} from "./thunderWave.ts";
import {
  surfWaveAtAge,
  type SurfWaveState,
} from "./surfWave.ts";
import {
  charmAtAge,
  type CharmState,
} from "./charm.ts";
import {
  covetAtAge,
  type CovetState,
} from "./covet.ts";
import {
  fakeTearsAtAge,
  type FakeTearsBounds,
  type FakeTearsState,
} from "./fakeTears.ts";
import {
  tickleAtAge,
  type TickleState,
} from "./tickle.ts";
import {
  metronomeAtAge,
  type MetronomePoint,
  type MetronomeState,
} from "./metronome.ts";
import {
  followMeAtAge,
  type FollowMeState,
} from "./followMe.ts";
import {
  restAtAge,
  type RestState,
} from "./rest.ts";
import {
  howlAtAge,
  type HowlState,
} from "./howl.ts";
import {
  perishSongAtAge,
  type PerishSongState,
} from "./perishSong.ts";
import {
  needleArmAtAge,
  type NeedleArmState,
} from "./needleArm.ts";
import {
  sandstormAtAge,
  type SandstormState,
} from "./sandstorm.ts";
import {
  tailGlowAtAge,
  type TailGlowState,
} from "./tailGlow.ts";
import {
  selfDestructAtAge,
  type SelfDestructState,
} from "./selfDestruct.ts";
import {
  explosionAtAge,
  type ExplosionState,
} from "./explosion.ts";
import {
  dynamicPunchAtAge,
  type DynamicPunchState,
} from "./dynamicPunch.ts";
import {
  dizzyPunchAtAge,
  type DizzyPunchState,
} from "./dizzyPunch.ts";
import {
  astonishAtAge,
  type AstonishDropletRandom,
  type AstonishState,
} from "./astonish.ts";
import {
  razorLeafAtAge,
  type RazorLeafState,
} from "./razorLeaf.ts";
import {
  poisonTailAtAge,
  type PoisonTailState,
} from "./poisonTail.ts";
import {
  toxicEffectAtAge,
  type ToxicSprite,
} from "./toxic.ts";
import {
  earthquakeAnimationAtAge,
  type EarthquakeAnimationState,
} from "./earthquake.ts";
import {
  futureSightAttackerEffectAtAge,
  futureSightBgBldyAtAge,
  futureSightBgIsPsychic,
  type FutureSightAttackerEffect,
} from "./futureSight.ts";
import {
  confusionAttackerEffectAtAge,
  confusionAttackerShakeDisplayX2,
  confusionBgBldyAtAge,
  confusionBgIsPsychic,
  confusionTargetShakeDisplayX2,
  confusionTargetEffectAtAge,
  type ConfusionAttackerEffect,
  type ConfusionTargetEffect,
} from "./confusion.ts";
import {
  psychicAttackerEffectAtAge,
  psychicAttackerShakeDisplayX2,
  psychicBgBldyAtAge,
  psychicBgIsPsychic,
  psychicTargetShakeDisplayX2,
  psychicTargetEffectAtAge,
  type PsychicAttackerEffect,
  type PsychicTargetEffect,
} from "./psychic.ts";
import {
  extremeSpeedAttackerAffineAtAge,
  extremeSpeedAttackerVisibleAtAge,
  extremeSpeedBackgroundAtAge,
  extremeSpeedDustAtAge,
  extremeSpeedHitsplatsAtAge,
  extremeSpeedImpactAtAge,
  type ExtremeSpeedBackgroundState,
} from "./extremeSpeed.ts";
import {
  thunderPunchFistVisible,
  thunderPunchFirstHitsplatVisible,
  thunderPunchLightningAtAge,
  thunderPunchPaletteAtAge,
  thunderPunchSecondHitsplatVisible,
  thunderPunchTargetShakeY2,
  type ThunderPunchLightning,
  type ThunderPunchPaletteState,
} from "./thunderPunch.ts";
import {
  DRAGON_RAGE_ATTACKER_SHAKE,
  DRAGON_RAGE_FIRE_PLUME_SPAWNS,
  DRAGON_RAGE_FIRE_SPIT_GEOMETRY,
  DRAGON_RAGE_SLIDE_TO_OFFSET,
  DRAGON_RAGE_SLIDE_TO_ORIGINAL_POS,
  DRAGON_RAGE_TARGET_SHAKE,
  dragonRageFirePlumeStateAtAge,
  dragonRageFireSpitStateAtAge,
  dragonRageSchedule,
  shakeMonOffsetAtRenderTick,
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
  type DragonRageFirePlumeState,
  type DragonRageFireSpitState,
  type DragonRageSchedule,
  type DragonRageSide,
} from "./dragonRage.ts";
import { speciesFrontIdleRestOffset } from "./speciesIdleAnim.ts";
import {
  shadowPunchAttackerVisible,
  shadowPunchAttackerX2,
  shadowPunchBackgroundBldy,
  shadowPunchBackgroundIsGhost,
  shadowPunchClonePaintOrder,
  shadowPunchClonePriority,
  SHADOW_PUNCH_TARGET_SHAKE,
  SHADOW_PUNCH_TARGET_SHAKE_FIRST_AGE,
  SHADOW_PUNCH_FIST_FIRST_AGE,
  SHADOW_PUNCH_FIST_LAST_AGE,
  SHADOW_PUNCH_HITSPLAT_FIRST_AGE,
  SHADOW_PUNCH_HITSPLAT_LAST_AGE,
  SHADOW_PUNCH_PUNCH_TASK_FIRST_AGE,
  type ShadowPunchClone,
} from "./shadowPunch.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";
import {
  knockOffBodyAtAge,
  knockOffTargetOamOffsetAtAge,
  type KnockOffBodyState,
} from "./knockOff.ts";
import {
  shadowBallBackgroundBldy,
  shadowBallBackgroundIsGhost,
  shadowBallDisplayedTargetShakeAtAge,
  shadowBallLoopSoundAtAge,
  shadowBallSpriteAtAge,
  shadowBallTargetShakeAtAge,
  type LoopSeAdjustPanningState,
  type ShadowBallSprite,
} from "./shadowBall.ts";
import {
  encoreAtAge,
  type EncoreState,
} from "./encore.ts";
import {
  dragonClawAtAge,
  type DragonClawState,
} from "./dragonClaw.ts";
import {
  singNotesBackToFrontAtAge,
  singPanTaskAtAge,
  type SingNote,
  type SingPanTask,
} from "./sing.ts";
import {
  sweetKissAtAge,
  type SweetKissState,
} from "./sweetKiss.ts";
import {
  sporeAtAge,
  type SporeState,
} from "./spore.ts";
import {
  hypnosisDisplayedRingsAtAge,
  hypnosisAtAge,
  type HypnosisRing,
  type HypnosisState,
} from "./hypnosis.ts";

export type SceneOnBattlerSide = "player" | "opponent";

export interface SceneOnBattlerGeometry {
  readonly side: SceneOnBattlerSide;
  /** Top-left corner of the decoded 64x64 battler sheet. */
  readonly spriteCorner: Readonly<{ x: number; y: number }>;
  /** Source `GetBattlerSpriteCoord(..., 2/3)` animation center. */
  readonly animationCenter: Readonly<{ x: number; y: number }>;
  /** Source singles BATTLER_COORD_X/Y base for status-animation creation. */
  readonly battlePositionCenter: Readonly<{ x: number; y: number }>;
}

export interface SceneOnPresentationBattler {
  readonly species:
    | "VILEPLUME"
    | "BUTTERFREE"
    | "ONIX"
    | "KRABBY"
    | "SURSKIT"
    | "KOFFING"
    | "MAGNETON"
    | "MAGBY"
    | "GROVYLE"
    | "PIDGEOTTO"
    | "MURKROW"
    | "SPOINK"
    | "ARCANINE"
    | "DUGTRIO"
    | "CHARMELEON"
    | "HAUNTER"
    | "IVYSAUR"
    | "KADABRA"
    | "LOMBRE"
    | "SHUPPET"
    | "SHUCKLE"
    | "MILTANK"
    | "LOUDRED"
    | "DUSTOX"
    | "HORSEA"
    | "EKANS"
    | "GRIMER"
    | "ZUBAT"
    | "RATICATE"
    | "RATTATA"
    | "SKIPLOOM"
    | "RELICANTH"
    | "LUNATONE"
    | "SHUPPET"
    | "PLUSLE"
    | "MINUN"
    | "FLAAFFY"
    | "VOLBEAT"
    | "ILLUMISE"
    | "MASQUERAIN"
    | "POLITOED"
    | "EXEGGCUTE"
    | "GLOOM"
    | "TOGETIC"
    | "MACHOKE"
    | "TAILLOW"
    | "EEVEE"
    | "ZIGZAGOON"
    | "SABLEYE"
    | "ALTARIA"
    | "AZURILL"
    | "CLAMPERL"
    | "SEVIPER"
    | "SUDOWOODO"
    | "RHYHORN"
    | "SHUCKLE"
    | "GLALIE"
    | "HITMONCHAN"
    | "SPINDA"
    | "LINOONE"
    | "DELCATTY"
    | "VIGOROTH"
    | "LICKITUNG"
    | "WEEPINBELL"
    | "MEOWTH"
    | "BEEDRILL"
    | "OMASTAR"
    | "OMANYTE"
    | "CHANSEY"
    | "CACNEA"
    | "PHANPY"
    | "TEDDIURSA"
    | "WARTORTLE"
    | "LUVDISC"
    | "PARASECT";
  readonly geometry: SceneOnBattlerGeometry;
}

export interface SceneOnBounceConfig {
  readonly move: "BOUNCE";
  readonly turn: BounceTurn;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  /** Immutable field values supplied by the legal stock-ROM stage. */
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  /** Immutable controller outcome/display boundaries; no controller is advanced. */
  readonly controllerProfile: Readonly<{
    readonly moveTextFirstAge: number;
    readonly moveTextClearAge: number;
    readonly targetHpBefore: number;
    readonly targetHpAfter: number;
    readonly hitReactionFirstAge: number;
    readonly hpDrainFirstAge: number;
    readonly resultTextFirstAge: number;
    readonly currentMoveResetAge: number;
    readonly actionMenuRevealAge?: number;
    readonly statusOutcome?: "none" | "paralysis";
    readonly statusAppliedAge?: number;
    readonly statusShakeFirstAge?: number;
    readonly statusElectricityFirstAge?: number;
    readonly statusMessageFirstAge?: number;
    readonly healthboxStatusAge?: number;
  }>;
  /**
   * First displayed callback age for this half of `choosetwoturnanim`.
   * Accuracy, damage, PP, semi-invulnerability, paralysis, and controller
   * progression remain external immutable inputs.
   */
  readonly animationAgeOffset?: number;
  /** Source-observed player-to-opponent scheduling lag for the parallel hit tasks. */
  readonly strikeEffectDelay?: number;
  /** Source-observed restoration boundary; independent of offscreen ball lifetime. */
  readonly strikeAttackerRestoreAge?: number;
}

export interface SceneOnFlyConfig {
  readonly move: "FLY";
  readonly turn: FlyTurn;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  /** Immutable field/controller inputs from the legal stock-ROM stage. */
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  readonly controllerProfile: Readonly<{
    readonly targetHpBefore: number;
    readonly targetHpAfter: number;
    /** First +1 generic healthbox pose after the move-owned strike body. */
    readonly hitReactionFirstAge: number;
    readonly hpDrainFirstAge: number;
    readonly chargeMessageFirstAge: number;
    readonly strikeMoveTextFirstAge: number;
    readonly resultTextFirstAge: number;
    readonly currentMoveResetAge: number;
  }>;
  /**
   * First displayed callback age for this half of `choosetwoturnanim`.
   * Selection, damage, semi-invulnerability, and turn advancement remain
   * controller-owned and are not represented here.
   */
  readonly animationAgeOffset?: number;
}

export interface SceneOnDragonBreathConfig {
  readonly move: "DRAGON_BREATH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  /** Source-shaped asset/affine/translation/OAM inputs only. */
  readonly animationProfile: Readonly<DragonBreathFireGeometry>;
  /** Immutable staged field values; this seam never calculates damage. */
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  /** Relative script clock; damage, status, RNG, PP, and controller stay external. */
  readonly animationAgeOffset?: number;
}

export interface SceneOnFlamethrowerConfig {
  readonly move: "FLAMETHROWER";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<FlamethrowerGeometry>;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  readonly animationAgeOffset?: number;
}

export interface SceneOnBlazeKickConfig {
  readonly move: "BLAZE_KICK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<BlazeKickGeometry>;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  readonly animationAgeOffset?: number;
}

export interface SceneOnBindConfig {
  readonly move: "BIND";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<BindAnimationProfile>;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
}

export interface SceneOnFeatherDanceConfig {
  readonly move: "FEATHER_DANCE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  /** Already-resolved stat stages owned by the stock battle controller. */
  readonly controllerProfile: Readonly<{
    readonly attackStageBefore: number;
    readonly attackStageAfter: number;
  }>;
  readonly moveTextStartAge: number;
  /**
   * Controller-printer-relative script head start. The player-side move-used
   * line omits "Foe " and releases FEATHER DANCE four frames earlier.
   */
  readonly animationAgeOffset?: number;
}

export interface SceneOnQuickAttackConfig {
  readonly move: "QUICK_ATTACK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  /** Damage and HP endpoints are already resolved by the stock controller. */
  readonly controllerProfile: Readonly<{
    readonly targetHpBefore: number;
    readonly targetHpAfter: number;
    /** First displayed generic hit healthbox wobble. */
    readonly hitReactionFirstAge: number;
    /** First displayed one-HP decrement from the resolved damage endpoint. */
    readonly hpDrainFirstAge: number;
    /** First glyph of the controller-owned effectiveness result. */
    readonly resultTextFirstAge: number;
    readonly resultKind: "notVeryEffective" | "superEffective";
    /** Controller cleanup boundary where gCurrentMove becomes MOVE_NONE. */
    readonly currentMoveResetAge: number;
  }>;
  readonly moveTextStartAge: number;
  /**
   * Move-animation script age displayed at presentation age zero. The
   * player-side move-used line omits "Foe " and releases the body four
   * frames earlier than the opponent-side printer.
   */
  readonly animationAgeOffset?: number;
}

export interface SceneOnExtremeSpeedConfig {
  readonly move: "EXTREME_SPEED";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  /** Player-side move-used text releases the source body four frames sooner. */
  readonly animationAgeOffset?: number;
}

export interface SceneOnAerialAceConfig {
  readonly move: "AERIAL_ACE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  /** Immutable damage/controller result; presentation never calculates it. */
  readonly controllerProfile: Readonly<{
    readonly targetHpBefore: number;
    readonly targetHpAfter: number;
    readonly hitReactionFirstAge: number;
    readonly hpDrainFirstAge: number;
    readonly moveTextClearAge: number;
    readonly resultTextFirstAge: number;
    readonly currentMoveResetAge: number;
  }>;
  readonly moveTextStartAge: number;
  readonly animationAgeOffset?: number;
}

export interface SceneOnSandAttackConfig {
  readonly move: "SAND_ATTACK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  readonly animationProfile: Readonly<SandAttackAnimationProfile>;
  /** Already-resolved accuracy stages and controller cleanup. */
  readonly controllerProfile: Readonly<{
    readonly accuracyStageBefore: number;
    readonly accuracyStageAfter: number;
    readonly resultTextFirstAge: number;
    readonly currentMoveResetAge: number;
  }>;
  readonly moveTextStartAge: number;
  readonly animationAgeOffset?: number;
}

export interface SceneOnMudSlapConfig {
  readonly move: "MUD_SLAP";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  readonly animationProfile: Readonly<MudSlapAnimationProfile>;
  readonly moveTextStartAge: number;
  readonly animationAgeOffset?: number;
}

export interface SceneOnFirePunchConfig {
  readonly move: "FIRE_PUNCH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly resolutionProfile: FirePunchResolutionProfile;
  /**
   * Move-animation script age displayed at presentation age zero. Controller
   * printers can hand ownership over at different script phases by side.
   */
  readonly animationAgeOffset?: number;
  /** Relative first printer age; negative means text predates this seam. */
  readonly moveTextStartAge?: number;
}

export interface SceneOnIcePunchConfig {
  readonly move: "ICE_PUNCH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  readonly hpDrainProfile: Readonly<HpDrainPresentationProfile> & {
    readonly effectivenessTextStartAge?: number;
    readonly effectivenessKind?: "superEffective" | "notVeryEffective";
    /** Controller-owned age at which the completed result line is cleared. */
    readonly effectivenessTextEndAge?: number;
  };
  /** Immutable controller display timing; no action selection is owned here. */
  readonly controllerDisplayProfile?: Readonly<{
    readonly actionMenuRevealAge?: number;
    /** Already-resolved status supplied by the battle controller. */
    readonly statusOutcome?: "none" | "freeze";
    readonly statusAppliedAge?: number;
    readonly healthboxStatusAge?: number;
    readonly statusAnimationFirstAge?: number;
    /** Task creation pass for the status-applied FrozenIceCube. */
    readonly statusIceCubeTaskFirstAge?: number;
    readonly statusMessageFirstAge?: number;
    readonly currentMoveResetAge?: number;
    readonly nextControllerTextFirstAge?: number;
    readonly nextControllerAnimationFirstAge?: number;
    /** Task creation pass for the later frozen-solid skip animation. */
    readonly nextControllerIceCubeTaskFirstAge?: number;
    /** Display-only held-item handoff; healing/item ownership is pre-resolved. */
    readonly heldItemHeal?: Readonly<{
      /** First identity display of the source rotation task. */
      readonly animationIdentityAge: number;
      readonly item: "SITRUS_BERRY";
      readonly startHp: number;
      readonly endHp: number;
    }>;
  }>;
  /** Relative first printer age; negative means text predates this seam. */
  readonly moveTextStartAge?: number;
}

export interface SceneOnThunderPunchConfig {
  readonly move: "THUNDER_PUNCH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
}

export interface SceneOnFaintAttackFieldProfile {
  readonly playerHp: number;
  readonly opponentHp: number;
  readonly playerStatus: "none" | "burn";
  readonly playerGender?: "male" | "female";
  readonly opponentGender?: "male" | "female";
}

export interface SceneOnFaintAttackConfig {
  readonly move: "FAINT_ATTACK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<FaintAttackAnimationProfile>;
  /**
   * Immutable field presentation at animation kickoff. Damage and all later
   * resolution stay outside the move-owned body.
   */
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  /** Relative first printer age; negative means text predates this seam. */
  readonly moveTextStartAge?: number;
}

export interface SceneOnRockSlideConfig {
  readonly move: "ROCK_SLIDE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<RockSlideAnimationProfile>;
  /** Immutable field values; the presentation seam never calculates damage. */
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  /** Relative first printer age; negative means text predates this seam. */
  readonly moveTextStartAge?: number;
}

export interface SceneOnDoubleTeamConfig {
  readonly move: "DOUBLE_TEAM";
  readonly attacker: SceneOnPresentationBattler;
  /** Opposing field battler; DOUBLE TEAM's actual effect battler is attacker. */
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<DoubleTeamAnimationProfile>;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  /** Relative first printer age; negative means text predates this seam. */
  readonly moveTextStartAge?: number;
}

export interface EndeavorAnimationProfile {
  /** Source `gMon{Back,Front}PicCoords[species].y_offset`. */
  readonly attackerYOffset: number;
  /** Immutable stale `gAnimMovePower` consumed by the generic shake task. */
  readonly staleMovePower: number;
  /** First displayed HP decrement, relative to the move-body epoch. */
  readonly hpDrainFirstAge: number;
  readonly targetStartHp: number;
  readonly targetEndHp: number;
}

export interface HpDrainPresentationProfile {
  readonly startHp: number;
  readonly endHp: number;
  readonly firstDisplayedAge: number;
}

/** Generic display-only drain for controller-supplied, already-resolved HP. */
export function displayedHpAfterDamage(
  age: number,
  profile: Readonly<HpDrainPresentationProfile>,
): number {
  if (age < profile.firstDisplayedAge) return profile.startHp;
  return Math.max(
    profile.endHp,
    profile.startHp - (age - profile.firstDisplayedAge + 1),
  );
}

export interface SceneOnEndeavorConfig {
  readonly move: "ENDEAVOR";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<EndeavorAnimationProfile>;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  /** Relative first printer age; negative means text predates this seam. */
  readonly moveTextStartAge?: number;
}

export interface SceneOnEmberConfig {
  readonly move: "EMBER";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<EmberGeometry>;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  readonly animationAgeOffset?: number;
}

export interface SceneOnDragonRageFieldProfile {
  readonly playerHp: number;
  readonly playerMaxHp: number;
  readonly opponentHp: number;
  readonly opponentMaxHp: number;
  readonly playerGender?: "male" | "female";
  readonly opponentGender?: "male" | "female";
}

export interface SceneOnDragonRageConfig {
  readonly move: "DRAGON_RAGE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationAgeOffset?: number;
}

export interface SceneOnShadowPunchConfig {
  readonly move: "SHADOW_PUNCH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  /** `AnimTask_AttackerPunchWithTrace`'s own closed-form inputs (shadowPunch.ts) - fixed per side for this move's one staged pair. */
  readonly attackerSpriteId: number;
  readonly attackerMoveSpeed: number;
  readonly attackerSubpriority: number;
  readonly animationAgeOffset?: number;
}

export interface SceneOnGrowthConfig {
  readonly move: "GROWTH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnRecoverConfig {
  readonly move: "RECOVER";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnMoonlightFieldProfile
  extends SceneOnDragonRageFieldProfile {
  readonly pendingHeal: Readonly<{
    readonly battler: "attacker";
    readonly fromHp: number;
    readonly toHp: number;
    readonly weather: "none";
    readonly numerator: 1;
    readonly denominator: 2;
  }>;
}

export interface SceneOnMoonlightConfig {
  readonly move: "MOONLIGHT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnMoonlightFieldProfile>;
  /** Source `InitSpritePosToAnimAttacker(TRUE)` center for HealingEffect. */
  readonly healingCenter: Readonly<{ x: number; y: number }>;
}

export interface SceneOnAbsorbConfig {
  readonly move: "ABSORB";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** `InitSpritePosToAnimAttacker(TRUE)` center used by HealingEffect. */
  readonly healingCenter: Readonly<{ x: number; y: number }>;
  /** `BATTLER_COORD_X_2/Y_PIC_OFFSET` endpoint used by absorption arcs. */
  readonly absorptionCenter: Readonly<{ x: number; y: number }>;
  /** Fresh-probed allocator facts for the staged occupied-slot topology. */
  readonly allocatorProfile: Readonly<{
    readonly hitsplat: number;
    readonly orbs: readonly number[];
    readonly stars: readonly number[];
    readonly paletteController: number;
  }>;
}

export interface SceneOnReflectConfig {
  readonly move: "REFLECT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly allocatorProfile: Readonly<{
    readonly wall: number;
    readonly sparkles: readonly number[];
  }>;
}

export interface SceneOnLightScreenConfig {
  readonly move: "LIGHT_SCREEN";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly allocatorProfile: Readonly<{
    readonly wall: number;
    readonly sparkles: readonly number[];
  }>;
}

export interface SceneOnSynthesisConfig {
  readonly move: "SYNTHESIS";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnAromatherapyConfig {
  readonly move: "AROMATHERAPY";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnWishConfig {
  readonly move: "WISH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Presentation-only Random2 results for the 21 source mini stars. */
  readonly twinkles: readonly WishTwinkleVariant[];
}

export interface SceneOnMilkDrinkConfig {
  readonly move: "MILK_DRINK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnSupersonicConfig {
  readonly move: "SUPERSONIC";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnWaterGunConfig {
  readonly move: "WATER_GUN";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source `GetBattlerSpriteCoord2(attacker, X_2/Y_PIC_OFFSET)`. */
  readonly projectileOrigin: Readonly<{ x: number; y: number }>;
}

export interface SceneOnAcidConfig {
  readonly move: "ACID";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source `GetBattlerSpriteCoord2(attacker, X_2/Y_PIC_OFFSET)`. */
  readonly projectileOrigin: Readonly<{ x: number; y: number }>;
}

export interface SceneOnSludgeConfig {
  readonly move: "SLUDGE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source `GetBattlerSpriteCoord2(attacker, X_2/Y_PIC_OFFSET)`. */
  readonly projectileOrigin: Readonly<{ x: number; y: number }>;
}

export interface SceneOnSludgeBombConfig {
  readonly move: "SLUDGE_BOMB";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly projectileOrigin: Readonly<{ x: number; y: number }>;
}

export interface SceneOnPoisonFangConfig {
  readonly move: "POISON_FANG";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnHyperFangConfig {
  readonly move: "HYPER_FANG";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnBiteConfig {
  readonly move: "BITE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnHeadbuttConfig {
  readonly move: "HEADBUTT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnWhirlwindConfig {
  readonly move: "WHIRLWIND";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnBlockConfig {
  readonly move: "BLOCK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnBodySlamConfig {
  readonly move: "BODY_SLAM";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnSlamConfig {
  readonly move: "SLAM";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnTwineedleConfig {
  readonly move: "TWINEEDLE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnSpikeCannonConfig {
  readonly move: "SPIKE_CANNON";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnSonicBoomConfig {
  readonly move: "SONIC_BOOM";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnSmokescreenConfig {
  readonly move: "SMOKESCREEN";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnMudShotConfig {
  readonly move: "MUD_SHOT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source X_2/Y_PIC_OFFSET anchor used by InitSpritePosToAnimAttacker. */
  readonly attackerPictureOffset: Readonly<{ x: number; y: number }>;
  /** Source X_2/Y_PIC_OFFSET target of AnimToTargetInSinWave. */
  readonly targetPictureOffset: Readonly<{ x: number; y: number }>;
}

export interface SceneOnHydroPumpConfig {
  readonly move: "HYDRO_PUMP";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly attackerPictureOffset: Readonly<{ x: number; y: number }>;
  readonly targetPictureOffset: Readonly<{ x: number; y: number }>;
}

export interface SceneOnBubbleBeamConfig {
  readonly move: "BUBBLE_BEAM";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source X_2/Y_PIC_OFFSET anchor used by AnimWaterBubbleProjectile. */
  readonly attackerPictureOffset: Readonly<{ x: number; y: number }>;
  /** Source X_2/Y_PIC_OFFSET target of both Bubble Beam sprite families. */
  readonly targetPictureOffset: Readonly<{ x: number; y: number }>;
}

export interface SceneOnCrossChopConfig {
  readonly move: "CROSS_CHOP";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source X_2/Y_PIC_OFFSET anchor used by both hand and impact commands. */
  readonly targetPictureOffset: Readonly<{ x: number; y: number }>;
}

export interface SceneOnFocusEnergyConfig {
  readonly move: "FOCUS_ENERGY";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source GetBattlerSpriteCoord(attacker, BATTLER_COORD_X/Y) anchor. */
  readonly attackerCoord: Readonly<{ x: number; y: number }>;
}

export interface SceneOnEndureConfig {
  readonly move: "ENDURE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source GetBattlerSpriteCoord(attacker, BATTLER_COORD_X/Y) anchor. */
  readonly attackerCoord: Readonly<{ x: number; y: number }>;
}

export interface SceneOnReversalConfig {
  readonly move: "REVERSAL";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source X_2/Y_PIC_OFFSET anchor for the legal VIGOROTH picture. */
  readonly attackerPictureOffset: Readonly<{ x: number; y: number }>;
  /** Source X_2/Y_PIC_OFFSET anchor used by fist and hitsplat commands. */
  readonly targetPictureOffset: Readonly<{ x: number; y: number }>;
  /**
   * Presentation-only receipt resolved by the battle/controller owner.
   * Reversal never derives power or damage and never advances battle state.
   */
  readonly resolvedShake: Readonly<ReversalResolvedShakeReceipt>;
}

export interface SceneOnSwaggerConfig {
  readonly move: "SWAGGER";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source `GetBattlerSpriteCoord(attacker, Y_PIC_OFFSET)` breath origin. */
  readonly breathOrigin: Readonly<{ x: number; y: number }>;
}

export interface SceneOnTauntConfig {
  readonly move: "TAUNT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source `SetSpriteNextToMonHead(attacker, sprite)` result. */
  readonly attackerHead: Readonly<{ x: number; y: number }>;
}

export interface SceneOnScaryFaceConfig {
  readonly move: "SCARY_FACE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source `InitSpritePosToAnimAttacker(sprite, TRUE)` coordinate. */
  readonly attackerEyeCenter: Readonly<{ x: number; y: number }>;
}

export interface SceneOnSparkConfig {
  readonly move: "SPARK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source X_2/Y_PIC_OFFSET coordinates, explicit because species pictures differ. */
  readonly attackerPictureOffset: Readonly<{ x: number; y: number }>;
  readonly targetPictureOffset: Readonly<{ x: number; y: number }>;
  readonly attackerBgPriority: number;
  readonly targetBgPriority: number;
  readonly targetImpactPosition?: Readonly<{ x: number; y: number }>;
  /** Explicit scheduler/allocation state at the flashing-sprite creation tick. */
  readonly flashingInitialCallbackAdvances?: readonly number[];
  readonly flashingInitialAffineAdvances?: readonly number[];
  /** Reducer-independent source `SortSprites` tie order for allocated slots. */
  readonly hardwareTieSlotOrder?: readonly number[];
}

export interface SceneOnThunderWaveConfig {
  readonly move: "THUNDER_WAVE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** `GetBattlerSpriteCoord(target, X_2/Y_2)` used by `createsprite`. */
  readonly targetEffectCenter: Readonly<{ x: number; y: number }>;
}

export interface SceneOnSurfConfig {
  readonly move: "SURF";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnCharmConfig {
  readonly move: "CHARM";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnCovetConfig {
  readonly move: "COVET";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnFakeTearsConfig {
  readonly move: "FAKE_TEARS";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** `GetBattlerSpriteCoordAttr(LEFT/RIGHT/TOP)` for the legal DELCATTY pic. */
  readonly attackerPictureBounds: Readonly<FakeTearsBounds>;
  /**
   * Typed controller receipts already resolved by the battle engine. The
   * animation seam carries these unchanged; Fake Tears' source reducer does
   * not apply the stat result or advance controller/script state.
   */
  readonly controllerPresentation: Readonly<{
    readonly kind: "resolved-stat-drop";
    readonly kickoff: Readonly<{
      readonly messageId: "STRINGID_USEDMOVE";
      readonly firstAge: number;
      readonly selection: Readonly<{
        readonly moveIds: readonly [number, number, number, number];
        readonly maxPP: readonly [number, number, number, number];
        readonly cursor: 0 | 1 | 2 | 3;
      }>;
    }>;
    readonly statChange: Readonly<{
      readonly battler: "target";
      readonly stat: "special-defense";
      readonly from: number;
      readonly to: number;
    }>;
    readonly statAnimation: Readonly<{
      readonly animationId: "STATS_CHANGE";
      readonly argument: number;
      readonly firstAge: number;
    }>;
    readonly result: Readonly<{
      readonly messageId: "STRINGID_DEFENDERSSTATFELL";
      readonly firstAge: number;
    }>;
    readonly moveEnd: Readonly<{ readonly clearAge: number }>;
  }>;
}

export interface SceneOnTickleConfig {
  readonly move: "TICKLE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnMetronomeConfig {
  readonly move: "METRONOME";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** `SetSpriteNextToMonHead` result for the source-verified carrier. */
  readonly attackerHead: Readonly<MetronomePoint>;
}

export interface SceneOnFollowMeConfig {
  readonly move: "FOLLOW_ME";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source `BATTLER_COORD_X` and clamped `BATTLER_COORD_ATTR_TOP`. */
  readonly attackerTop: Readonly<MetronomePoint>;
}

export interface SceneOnRestFieldProfile extends SceneOnDragonRageFieldProfile {
  readonly playerStatus: "none" | "sleep";
  readonly opponentStatus: "none" | "sleep";
  /** Immutable `trysetrest` result; the animation never applies the heal. */
  readonly pendingHeal: Readonly<{
    readonly battler: "attacker";
    readonly fromHp: number;
    readonly toHp: number;
  }>;
}

export interface SceneOnRestConfig {
  readonly move: "REST";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnRestFieldProfile>;
}

export interface SceneOnHowlFieldProfile extends SceneOnDragonRageFieldProfile {
  /** Immutable result of Howl's source stat-change opcode. */
  readonly attackerAttackStage: 7;
}

export interface SceneOnHowlConfig {
  readonly move: "HOWL";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnHowlFieldProfile>;
}

export interface SceneOnSweetKissConfig {
  readonly move: "SWEET_KISS";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnSporeConfig {
  readonly move: "SPORE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnHypnosisConfig {
  readonly move: "HYPNOSIS";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnPerishSongFieldProfile
  extends SceneOnDragonRageFieldProfile {
  /** Immutable battle-engine result; presentation never advances these. */
  readonly playerPerishSongTurns: 3;
  readonly opponentPerishSongTurns: 3;
}

export interface SceneOnPerishSongConfig {
  readonly move: "PERISH_SONG";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnPerishSongFieldProfile>;
}

export interface SceneOnNeedleArmConfig {
  readonly move: "NEEDLE_ARM";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnSandstormConfig {
  readonly move: "SANDSTORM";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnTailGlowConfig {
  readonly move: "TAIL_GLOW";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source X_2/Y_PIC_OFFSET coordinate for the legal carrier picture. */
  readonly attackerPictureOffset: Readonly<{ x: number; y: number }>;
}

export interface SceneOnSelfDestructConfig {
  readonly move: "SELF_DESTRUCT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnExplosionConfig {
  readonly move: "EXPLOSION";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnDynamicPunchConfig {
  readonly move: "DYNAMIC_PUNCH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnDizzyPunchConfig {
  readonly move: "DIZZY_PUNCH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Exact legal carrier personality used by Emerald's front-only spots. */
  readonly attackerPersonality: number;
}

export interface SceneOnAstonishConfig {
  readonly move: "ASTONISH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source mon-pic coordinate consumed by SetBattlerSpriteYOffsetFromYScale. */
  readonly targetPictureYOffset: number;
  /** Four masked Random2 outputs produced before the two callback bodies. */
  readonly dropletRandom: readonly [
    AstonishDropletRandom,
    AstonishDropletRandom,
  ];
}

export interface SceneOnRazorLeafConfig {
  readonly move: "RAZOR_LEAF";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnPoisonTailConfig {
  readonly move: "POISON_TAIL";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnToxicConfig {
  readonly move: "TOXIC";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnEarthquakeConfig {
  readonly move: "EARTHQUAKE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source sprite x2 values retained until ShakeBattlers' first callback update. */
  readonly initialBattlerX2: Readonly<{ player: number; opponent: number }>;
}

export interface SceneOnHardenConfig {
  readonly move: "HARDEN";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source battler sprite `x/y`, used to initialize BG1_X/BG1_Y. */
  readonly attackerSpriteCenter: Readonly<{ x: number; y: number }>;
}

export interface SceneOnCalmMindConfig {
  readonly move: "CALM_MIND";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<
    Omit<SceneOnDragonRageFieldProfile, "playerGender" | "opponentGender">
    & {
      readonly playerGender?: "male" | "female" | "none";
      readonly opponentGender?: "male" | "female" | "none";
    }
  >;
}

export interface SceneOnShadowBallConfig {
  readonly move: "SHADOW_BALL";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnEncoreConfig {
  readonly move: "ENCORE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnDragonClawConfig {
  readonly move: "DRAGON_CLAW";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnSingConfig {
  readonly move: "SING";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnFutureSightConfig {
  readonly move: "FUTURE_SIGHT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnConfusionConfig {
  readonly move: "CONFUSION";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnPsychicConfig {
  readonly move: "PSYCHIC";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnKnockOffConfig {
  readonly move: "KNOCK_OFF";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationAgeOffset?: number;
}

export type SceneOnMoveConfig =
  | SceneOnFirePunchConfig
  | SceneOnIcePunchConfig
  | SceneOnThunderPunchConfig
  | SceneOnFaintAttackConfig
  | SceneOnRockSlideConfig
  | SceneOnDoubleTeamConfig
  | SceneOnEndeavorConfig
  | SceneOnFeatherDanceConfig
  | SceneOnQuickAttackConfig
  | SceneOnExtremeSpeedConfig
  | SceneOnAerialAceConfig
  | SceneOnSandAttackConfig
  | SceneOnMudSlapConfig
  | SceneOnBounceConfig
  | SceneOnFlyConfig
  | SceneOnDragonBreathConfig
  | SceneOnFlamethrowerConfig
  | SceneOnBlazeKickConfig
  | SceneOnBindConfig
  | SceneOnEmberConfig
  | SceneOnDragonRageConfig
  | SceneOnShadowPunchConfig
  | SceneOnGrowthConfig
  | SceneOnRecoverConfig
  | SceneOnMoonlightConfig
  | SceneOnAbsorbConfig
  | SceneOnReflectConfig
  | SceneOnLightScreenConfig
  | SceneOnSynthesisConfig
  | SceneOnAromatherapyConfig
  | SceneOnWishConfig
  | SceneOnMilkDrinkConfig
  | SceneOnSupersonicConfig
  | SceneOnWaterGunConfig
  | SceneOnAcidConfig
  | SceneOnSludgeConfig
  | SceneOnSludgeBombConfig
  | SceneOnPoisonFangConfig
  | SceneOnHyperFangConfig
  | SceneOnBiteConfig
  | SceneOnHeadbuttConfig
  | SceneOnWhirlwindConfig
  | SceneOnBlockConfig
  | SceneOnBodySlamConfig
  | SceneOnSlamConfig
  | SceneOnTwineedleConfig
  | SceneOnSpikeCannonConfig
  | SceneOnSonicBoomConfig
  | SceneOnSmokescreenConfig
  | SceneOnMudShotConfig
  | SceneOnHydroPumpConfig
  | SceneOnBubbleBeamConfig
  | SceneOnCrossChopConfig
  | SceneOnFocusEnergyConfig
  | SceneOnEndureConfig
  | SceneOnReversalConfig
  | SceneOnSwaggerConfig
  | SceneOnTauntConfig
  | SceneOnScaryFaceConfig
  | SceneOnSparkConfig
  | SceneOnThunderWaveConfig
  | SceneOnSurfConfig
  | SceneOnCharmConfig
  | SceneOnCovetConfig
  | SceneOnFakeTearsConfig
  | SceneOnTickleConfig
  | SceneOnMetronomeConfig
  | SceneOnFollowMeConfig
  | SceneOnRestConfig
  | SceneOnHowlConfig
  | SceneOnSweetKissConfig
  | SceneOnSporeConfig
  | SceneOnHypnosisConfig
  | SceneOnPerishSongConfig
  | SceneOnNeedleArmConfig
  | SceneOnSandstormConfig
  | SceneOnTailGlowConfig
  | SceneOnSelfDestructConfig
  | SceneOnExplosionConfig
  | SceneOnDynamicPunchConfig
  | SceneOnDizzyPunchConfig
  | SceneOnAstonishConfig
  | SceneOnRazorLeafConfig
  | SceneOnPoisonTailConfig
  | SceneOnToxicConfig
  | SceneOnEarthquakeConfig
  | SceneOnHardenConfig
  | SceneOnCalmMindConfig
  | SceneOnShadowBallConfig
  | SceneOnEncoreConfig
  | SceneOnDragonClawConfig
  | SceneOnSingConfig
  | SceneOnFutureSightConfig
  | SceneOnConfusionConfig
  | SceneOnPsychicConfig
  | SceneOnKnockOffConfig;

export interface SceneOnMovePresentationState<
  TConfig extends SceneOnMoveConfig | SceneOnScaryFaceConfig | SceneOnAbsorbConfig
    | SceneOnBiteConfig
    = SceneOnMoveConfig,
> {
  readonly age: number;
  readonly config: TConfig;
  /**
   * Optional CPU/VCOUNT interval supplied by the presentation scheduler.
   * This is hardware timing only: it neither identifies a move nor owns task
   * callbacks, battle state, input, or outcomes.
   */
  readonly gpuRegisterPresentation?: Readonly<{
    readonly beforeInterval: AnimationGpuRegisterState;
    readonly workload: AnimationDisplayIntervalWorkload;
  }>;
}

export type SceneOnDynamicPunchPresentationState =
  SceneOnMovePresentationState<SceneOnDynamicPunchConfig>;
export type SceneOnDizzyPunchPresentationState =
  SceneOnMovePresentationState<SceneOnDizzyPunchConfig>;
export type SceneOnRazorLeafPresentationState =
  SceneOnMovePresentationState<SceneOnRazorLeafConfig>;
export type SceneOnTauntPresentationState =
  SceneOnMovePresentationState<SceneOnTauntConfig>;
export type SceneOnScaryFacePresentationState =
  SceneOnMovePresentationState<SceneOnScaryFaceConfig>;
export type SceneOnAbsorbPresentationState =
  SceneOnMovePresentationState<SceneOnAbsorbConfig>;
export type SceneOnMoonlightPresentationState =
  SceneOnMovePresentationState<SceneOnMoonlightConfig>;
export type SceneOnAromatherapyPresentationState =
  SceneOnMovePresentationState<SceneOnAromatherapyConfig>;
export type SceneOnReflectPresentationState =
  SceneOnMovePresentationState<SceneOnReflectConfig>;
export type SceneOnLightScreenPresentationState =
  SceneOnMovePresentationState<SceneOnLightScreenConfig>;
export type SceneOnSparkPresentationState =
  SceneOnMovePresentationState<SceneOnSparkConfig>;
export type SceneOnThunderWavePresentationState =
  SceneOnMovePresentationState<SceneOnThunderWaveConfig>;
export type SceneOnSurfPresentationState =
  SceneOnMovePresentationState<SceneOnSurfConfig>;
export type SceneOnCharmPresentationState =
  SceneOnMovePresentationState<SceneOnCharmConfig>;
export type SceneOnCovetPresentationState =
  SceneOnMovePresentationState<SceneOnCovetConfig>;
export type SceneOnFakeTearsPresentationState =
  SceneOnMovePresentationState<SceneOnFakeTearsConfig>;
export type SceneOnTicklePresentationState =
  SceneOnMovePresentationState<SceneOnTickleConfig>;
export type SceneOnMetronomePresentationState =
  SceneOnMovePresentationState<SceneOnMetronomeConfig>;
export type SceneOnFollowMePresentationState =
  SceneOnMovePresentationState<SceneOnFollowMeConfig>;
export type SceneOnRestPresentationState =
  SceneOnMovePresentationState<SceneOnRestConfig>;
export type SceneOnHowlPresentationState =
  SceneOnMovePresentationState<SceneOnHowlConfig>;
export type SceneOnSweetKissPresentationState =
  SceneOnMovePresentationState<SceneOnSweetKissConfig>;
export type SceneOnSporePresentationState =
  SceneOnMovePresentationState<SceneOnSporeConfig>;
export type SceneOnHypnosisPresentationState =
  SceneOnMovePresentationState<SceneOnHypnosisConfig>;
export type SceneOnBlockPresentationState =
  SceneOnMovePresentationState<SceneOnBlockConfig>;
export type SceneOnPerishSongPresentationState =
  SceneOnMovePresentationState<SceneOnPerishSongConfig>;
export type SceneOnNeedleArmPresentationState =
  SceneOnMovePresentationState<SceneOnNeedleArmConfig>;
export type SceneOnSandstormPresentationState =
  SceneOnMovePresentationState<SceneOnSandstormConfig>;
export type SceneOnTailGlowPresentationState =
  SceneOnMovePresentationState<SceneOnTailGlowConfig>;

export interface SceneOnSupersonicView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly rings: readonly SupersonicRingSprite[];
}

export interface SceneOnWaterGunView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly sprites: readonly WaterGunSprite[];
}

export interface SceneOnAcidView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly defenderPaletteY: number;
  readonly sprites: readonly AcidSprite[];
}

export interface SceneOnSludgeView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly defenderPaletteY: number;
  readonly sprites: readonly SludgeSprite[];
}

export interface SceneOnSludgeBombView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly defenderPaletteY: number;
  readonly sprites: readonly SludgeBombSprite[];
}

export interface SceneOnPoisonFangView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly defenderPaletteY: number;
  readonly sprites: readonly PoisonFangSprite[];
}

export interface SceneOnHyperFangView extends HyperFangEffect {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnBiteView extends BiteEffect {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnHeadbuttView extends HeadbuttState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnWhirlwindView extends WhirlwindState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnBodySlamView extends BodySlamState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSlamView extends SlamState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnTwineedleView extends TwineedleEffect {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSpikeCannonView extends SpikeCannonEffect {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSonicBoomView extends SonicBoomEffect {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSmokescreenView extends SmokescreenEffect {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnMudShotView extends MudShotState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnHydroPumpView extends HydroPumpState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnBubbleBeamView extends BubbleBeamState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnCrossChopView extends CrossChopState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnFocusEnergyView extends FocusEnergyState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnEndureView extends EndureState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnReversalView extends ReversalState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly resolvedShake: Readonly<ReversalResolvedShakeReceipt>;
}

export interface SceneOnSwaggerView extends SwaggerState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnTauntView extends TauntState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnScaryFaceView extends ScaryFaceState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSparkView extends SparkState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnThunderWaveView extends ThunderWaveState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSurfView extends SurfWaveState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnCharmView extends CharmState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnCovetView extends CovetState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnFakeTearsView extends FakeTearsState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnTickleView extends TickleState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnMetronomeView extends MetronomeState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnFollowMeView extends FollowMeState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnRestView extends RestState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnHowlView extends HowlState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnPerishSongView extends PerishSongState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnNeedleArmView extends NeedleArmState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSandstormView extends SandstormState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnTailGlowView extends TailGlowState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSelfDestructView extends SelfDestructState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnExplosionView extends ExplosionState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnDynamicPunchView extends DynamicPunchState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnDizzyPunchView extends DizzyPunchState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnAstonishView extends AstonishState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly targetBattler: SceneOnPresentationBattler;
}

export interface SceneOnRazorLeafView extends RazorLeafState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnPoisonTailView extends PoisonTailState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnToxicView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly sprites: readonly ToxicSprite[];
}

export interface SceneOnEncoreView extends EncoreState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnDragonClawView extends DragonClawState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSingView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly notes: readonly SingNote[];
  readonly pan: SingPanTask | null;
  readonly targetInMonBg: boolean;
}

export interface SceneOnEarthquakeView extends EarthquakeAnimationState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly playerBattlerX2: number;
  readonly opponentBattlerX2: number;
}

export interface SceneOnHardenView extends MetallicShineState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnCalmMindView extends CalmMindState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnShadowBallView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly backgroundGhost: boolean;
  readonly backgroundBldy: number;
  readonly sprite: ShadowBallSprite | null;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly displayedTargetOffset: Readonly<{ x2: number; y2: number }>;
  readonly loopSound: LoopSeAdjustPanningState | null;
}

export interface SceneOnFirePunchView {
  readonly age: number;
  readonly animationAge: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly resolution: FirePunchResolutionState;
  readonly particles: readonly FirePunchParticle[];
  readonly burnFlames: ReturnType<typeof firePunchBurnFlames>;
}

export interface SceneOnIcePunchView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly overlay: IcePunchOverlayState;
  readonly crystals: readonly IcePunchCrystal[];
  readonly hitCrystals: readonly IcePunchHitCrystal[];
  readonly healthboxY2: number;
  readonly targetInvisible: boolean;
  readonly displayedTargetHp: number;
  readonly actionMenu: ActionMenuDisplayTransition;
  readonly heldItemHeal: Readonly<{
    timelineAge: number;
    item: "SITRUS_BERRY";
  }> | null;
  readonly iceCubes: readonly Readonly<{
    state: FrozenIceCubeState;
    anchor: Readonly<{ x: number; y: number }>;
  }>[];
  readonly resolution: Readonly<{
    status: "none" | "freeze";
    healthboxStatus: "none" | "freeze";
    currentMove: "ICE_PUNCH" | null;
  }>;
}

export interface SceneOnThunderPunchView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly palette: ThunderPunchPaletteState;
  readonly lightning: readonly ThunderPunchLightning[];
  readonly targetY2: number;
  readonly fistVisible: boolean;
  readonly firstHitsplatVisible: boolean;
  readonly secondHitsplatVisible: boolean;
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
}

export interface SceneOnFaintAttackView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly background: FaintAttackBgState;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly attackerEva: number;
  readonly targetShakeX2: number;
  readonly hitsplatVisible: boolean;
}

export interface SceneOnRockSlideView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly bg3Y: number;
  readonly targetY2: number;
  readonly targetInvisible: boolean;
  readonly healthboxY2: number;
  readonly rocks: ReturnType<typeof rockSlideAnimationAtAge>["rocks"];
}

export interface SceneOnDoubleTeamView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly clones: Readonly<{ a: number; b: number }> | null;
  readonly statsBanner: Readonly<{ eva: number; bg1Y: number }> | null;
  readonly frontClone: "a" | "b";
}

export interface SceneOnEndeavorView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<EndeavorAnimationProfile>;
  readonly displayedTargetHp: number;
}

export interface SceneOnFeatherDanceView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly feathers: readonly FeatherRenderSprite[];
  readonly moveText: Readonly<{ line1: string; line2: string }>;
  readonly statMessage: Readonly<{ line1: string; line2: string }>;
  readonly controllerDisplay: StatStageDropDisplayState;
}

export interface SceneOnQuickAttackView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly attackerOffset: QuickAttackOffset;
  readonly afterimages: readonly QuickAttackAfterimage[];
  readonly targetShakeX2: number;
  readonly targetBaseX2: number;
  readonly impactVisible: boolean;
  readonly healthboxY2: number;
  readonly targetInvisible: boolean;
  readonly displayedTargetHp: number;
  readonly resultText: Readonly<{
    readonly line: string;
    readonly visibleChars: number;
  }> | null;
  readonly currentMove: "QUICK_ATTACK" | null;
  readonly moveText: Readonly<{ line1: string; line2: string }>;
}

export interface SceneOnExtremeSpeedView {
  readonly age: number;
  readonly animationAge: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly background: ExtremeSpeedBackgroundState;
  readonly attackerAffine: ReturnType<typeof extremeSpeedAttackerAffineAtAge>;
  readonly attackerVisible: boolean;
  readonly dust: ReturnType<typeof extremeSpeedDustAtAge>;
  readonly hitsplats: ReturnType<typeof extremeSpeedHitsplatsAtAge>;
  readonly impact: ReturnType<typeof extremeSpeedImpactAtAge>;
}

export interface SceneOnShadowPunchView {
  readonly age: number;
  readonly animationAge: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly backgroundGhost: boolean;
  readonly backgroundBldy: number;
  readonly attackerVisible: boolean;
  readonly attackerX2: number;
  /** Back-to-front paint order (see `shadowPunchClonePaintOrder`'s own doc). */
  readonly clones: readonly ShadowPunchClone[];
  readonly clonePriority: 2 | 3;
  readonly fistVisible: boolean;
  readonly hitsplatVisible: boolean;
  readonly targetShakeX2: number;
}

export interface SceneOnAerialAceView extends AerialAceAnimationState {
  readonly age: number;
  readonly animationAge: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly healthboxY2: number;
  readonly targetInvisible: boolean;
  readonly displayedTargetHp: number;
  readonly resultText: Readonly<{
    readonly line: "It’s not very effective…";
    readonly visibleChars: number;
  }> | null;
  readonly moveTextVisible: boolean;
  readonly currentMove: "AERIAL_ACE" | null;
  readonly moveText: Readonly<{ line1: string; line2: "AERIAL ACE!" }>;
}

export interface SceneOnSandAttackView extends SandAttackAnimationState {
  readonly age: number;
  readonly animationAge: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly accuracyBanner: SandAttackAccuracyBanner | null;
  readonly resultText: Readonly<{
    readonly line1: string;
    readonly line2: "fell!";
    readonly visibleChars: number;
  }> | null;
  readonly currentMove: "SAND_ATTACK" | null;
  readonly moveText: Readonly<{ line1: string; line2: "SAND-ATTACK!" }>;
}

export interface SceneOnMudSlapView extends MudSlapAnimationState {
  readonly age: number;
  readonly animationAge: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly currentMove: "MUD_SLAP";
  readonly moveText: Readonly<{ line1: string; line2: "MUD-SLAP!" }>;
}

export interface SceneOnFlyView extends FlyPresentationState {
  readonly age: number;
  readonly animationAge: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly healthboxY2: number;
  readonly targetInvisible: boolean;
  readonly displayedTargetHp: number;
  readonly message: Readonly<{
    readonly line1: string;
    readonly line2: string;
    readonly visibleChars: number;
  }> | null;
  readonly currentMove: "FLY" | null;
}

export interface SceneOnBounceView extends BouncePresentationState {
  readonly age: number;
  readonly animationAge: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly message: Readonly<{
    readonly line1: string;
    readonly line2: string;
    readonly visibleChars: number;
  }> | null;
  readonly healthboxY2: number;
  readonly targetInvisible: boolean;
  readonly displayedTargetHp: number;
  readonly actionMenu: ActionMenuDisplayTransition;
  readonly targetStatus: "none" | "paralysis";
  readonly healthboxStatus: "none" | "paralysis";
  readonly statusAnimation: StatusAnimationVisual | null;
  readonly currentMove: "BOUNCE" | null;
}

export interface SceneOnDragonBreathView {
  readonly age: number;
  readonly animationAge: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fireSprites: readonly DragonBreathFireSprite[];
  readonly targetEffect: DragonBreathTargetEffect;
}

export interface SceneOnFlamethrowerView {
  readonly age: number;
  readonly animationAge: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly flames: readonly FlamethrowerFlame[];
  readonly battlerEffect: FlamethrowerBattlerEffect;
}

export interface SceneOnEmberView {
  readonly age: number;
  readonly animationAge: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly sprites: readonly EmberOrderedSprite[];
}

export interface SceneOnBlazeKickView {
  readonly age: number;
  readonly animationAge: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animation: BlazeKickAnimationState;
  readonly sprites: readonly BlazeKickOrderedSprite[];
  readonly palette: BlazeKickPaletteState;
}

export interface SceneOnKnockOffView extends KnockOffBodyState {
  readonly age: number;
  readonly animationAge: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly targetOamOffset: Readonly<{ x2: number; y2: number }>;
}

export interface SceneOnBindView extends BindAnimationState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnGrowthView extends GrowthAnimationState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnRecoverView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly attackerObjY: number;
  readonly sprites: readonly RecoverEffectSprite[];
}

export interface SceneOnMoonlightView extends MoonlightState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnAbsorbView extends AbsorbState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSynthesisView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly attackerObjY: number;
  readonly sprites: readonly SynthesisSprite[];
}

export interface SceneOnAromatherapyView extends AromatherapyState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnWishView extends WishState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnMilkDrinkView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly sprites: readonly MilkDrinkEffectSprite[];
}

export interface SceneOnFutureSightView extends FutureSightAttackerEffect {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly bgBldy: number;
  readonly bgIsPsychic: boolean;
  /**
   * Whether OAM `objMode` (`ST_OAM_OBJ_BLEND` vs normal) is `1` on the
   * SCREEN this tick - RAM-probed to have only a ONE-tick display lag
   * (`tools/probe/dump-scale-window-oam-scanline.py`, ticks 135-150: RAM
   * objMode flips `1`->`0` at RAM tick 143, but the screen at render tick
   * 144 already shows the fully-opaque, un-blended sprite - `144-143=1`),
   * distinct from the affine matrix's own already-established TWO-tick lag
   * (`attackerScale` above). Not always equal to `attackerScale.active`
   * (which uses the two-tick-lagged matrix): near the end of the restore
   * countdown the matrix is still slightly non-neutral while objMode has
   * already reverted, so `attackerScale.active` alone over-blends the last
   * frame or two of the window.
   */
  readonly attackerBlendActive: boolean;
}

export interface SceneOnConfusionView extends ConfusionAttackerEffect, ConfusionTargetEffect {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly targetBlendActive: boolean;
  readonly bgBldy: number;
  readonly bgIsPsychic: boolean;
}

export interface SceneOnPsychicView extends PsychicAttackerEffect, PsychicTargetEffect {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly targetBlendActive: boolean;
  readonly bgBldy: number;
  readonly bgIsPsychic: boolean;
}

export interface SceneOnDragonRageFirePlume extends DragonRageFirePlumeState {
  readonly subpriorityOffset: number;
  /**
   * Script order (`DRAGON_RAGE_FIRE_PLUME_SPAWNS` index), which is also
   * strictly-ascending creation-tick order (`dragonRageSchedule`'s own
   * `firePlumeTicks` are +3 spaced). Needed by the draw path's real-hardware
   * z-order comparator: `docs/dragon-rage-fire-plume-order-notes.md`'s
   * `gMain.oamBuffer` probe (ISSUES #32 lineage) confirms same-subpriority
   * plume pairs sort by absolute Y primarily, and by ascending
   * `sSpriteOrder`/creation order (earlier spawn wins, drawn on top) on an
   * exact Y tie - not raw script/array position on its own.
   */
  readonly spawnIndex: number;
}

export interface SceneOnDragonRageView {
  readonly age: number;
  readonly animationAge: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  /** Hardware-composed target offset, including the creation-write transient that live sprite fields do not retain. */
  readonly displayedTargetOffset: Readonly<{ x2: number; y2: number }>;
  readonly fireSpit: DragonRageFireSpitState | null;
  readonly firePlumes: readonly SceneOnDragonRageFirePlume[];
}

export const FEATHER_DANCE_STAT_MESSAGE_LINE1 = "ONIX’s ATTACK";
export const FEATHER_DANCE_STAT_MESSAGE_LINE2 = "harshly fell!";
export const FEATHER_DANCE_STAT_MESSAGE_LENGTH =
  FEATHER_DANCE_STAT_MESSAGE_LINE1.length
  + FEATHER_DANCE_STAT_MESSAGE_LINE2.length;

function battlerNameWithPrefix(battler: SceneOnPresentationBattler): string {
  return battler.geometry.side === "opponent"
    ? `Foe ${battler.species}`
    : battler.species;
}

/**
 * Source/controller-relative clocks for the staged 6→4 ATK result. Age zero
 * is oracle frame 39; these are presentation inputs and never apply stages.
 */
export const FEATHER_DANCE_STAT_DROP_DISPLAY_PROFILE:
  Readonly<StatStageDropDisplayProfile> = Object.freeze({
    bannerFirstAge: 223,
    bannerHoldEndAge: 278,
    bannerRampDownFirstAge: 279,
    bannerLastAge: 303,
    targetBlend: 13,
    bgScrollFirstAge: 222,
    bgScrollVelocity: -3,
    bgScrollFloor: -246,
    messageFirstAge: 308,
    nextControllerReadyAge: 406,
  });

export function featherDanceStatDropDisplayProfile(
  animationAgeOffset: number,
): Readonly<StatStageDropDisplayProfile> {
  if (animationAgeOffset === 0) return FEATHER_DANCE_STAT_DROP_DISPLAY_PROFILE;
  return {
    ...FEATHER_DANCE_STAT_DROP_DISPLAY_PROFILE,
    bannerFirstAge:
      FEATHER_DANCE_STAT_DROP_DISPLAY_PROFILE.bannerFirstAge
      - animationAgeOffset,
    bannerHoldEndAge:
      FEATHER_DANCE_STAT_DROP_DISPLAY_PROFILE.bannerHoldEndAge
      - animationAgeOffset,
    bannerRampDownFirstAge:
      FEATHER_DANCE_STAT_DROP_DISPLAY_PROFILE.bannerRampDownFirstAge
      - animationAgeOffset,
    bannerLastAge:
      FEATHER_DANCE_STAT_DROP_DISPLAY_PROFILE.bannerLastAge
      - animationAgeOffset,
    bgScrollFirstAge:
      FEATHER_DANCE_STAT_DROP_DISPLAY_PROFILE.bgScrollFirstAge
      - animationAgeOffset,
    messageFirstAge:
      FEATHER_DANCE_STAT_DROP_DISPLAY_PROFILE.messageFirstAge
      - animationAgeOffset,
    // The opposite target's "Foe " prefix adds the same four printer
    // frames back after the earlier player-side kickoff, so the stable
    // controller boundary itself remains unchanged.
    nextControllerReadyAge:
      FEATHER_DANCE_STAT_DROP_DISPLAY_PROFILE.nextControllerReadyAge,
  };
}

function assertIntegerPoint(
  label: string,
  point: Readonly<{ x: number; y: number }>,
): void {
  if (!Number.isInteger(point.x) || !Number.isInteger(point.y)) {
    throw new Error(`${label} must use integer screen coordinates`);
  }
}

/**
 * Relative Battle Scene ON adapter. It owns presentation age and explicit
 * geometry only: damage, RNG, move legality, turn order, and round state are
 * supplied as immutable inputs and never resolved or mutated here.
 */
export function createSceneOnMovePresentation<
  TConfig extends SceneOnMoveConfig | SceneOnRazorLeafConfig | SceneOnTauntConfig
    | SceneOnSparkConfig | SceneOnCharmConfig | SceneOnTailGlowConfig
    | SceneOnScaryFaceConfig
    | SceneOnAbsorbConfig | SceneOnReflectConfig | SceneOnLightScreenConfig
    | SceneOnBiteConfig
    | SceneOnHeadbuttConfig | SceneOnBodySlamConfig | SceneOnSlamConfig
    | SceneOnWhirlwindConfig | SceneOnBlockConfig,
>(
  config: TConfig,
): SceneOnMovePresentationState<TConfig> {
  if (config.attacker.geometry.side === config.target.geometry.side) {
    throw new Error("attacker and target must occupy opposite battle sides");
  }
  assertIntegerPoint("attacker spriteCorner", config.attacker.geometry.spriteCorner);
  assertIntegerPoint("attacker animationCenter", config.attacker.geometry.animationCenter);
  assertIntegerPoint("attacker battlePositionCenter", config.attacker.geometry.battlePositionCenter);
  assertIntegerPoint("target spriteCorner", config.target.geometry.spriteCorner);
  assertIntegerPoint("target animationCenter", config.target.geometry.animationCenter);
  assertIntegerPoint("target battlePositionCenter", config.target.geometry.battlePositionCenter);
  if (config.move === "FIRE_PUNCH") {
    if (
      config.resolutionProfile.startHp < config.resolutionProfile.endHp
      || config.resolutionProfile.endHp < 0
    ) {
      throw new Error("FIRE_PUNCH resolution profile requires startHp >= endHp >= 0");
    }
  } else if (
    config.move !== "FLY"
    && config.move !== "BOUNCE"
    && config.move !== "DRAGON_BREATH"
    && (
      config.fieldProfile.playerHp < 0
      || config.fieldProfile.opponentHp < 0
    )
  ) {
    throw new Error(`${config.move} field profile requires nonnegative HP`);
  }
  if (
    config.move === "ENDEAVOR"
    && (
      config.animationProfile.targetStartHp
        < config.animationProfile.targetEndHp
      || config.animationProfile.targetEndHp < 0
    )
  ) {
    throw new Error("ENDEAVOR profile requires targetStartHp >= targetEndHp >= 0");
  }
  if (
    (config.move === "QUICK_ATTACK" || config.move === "AERIAL_ACE")
    && (
      config.controllerProfile.targetHpBefore
        < config.controllerProfile.targetHpAfter
      || config.controllerProfile.targetHpAfter < 0
    )
  ) {
    throw new Error(
      "QUICK_ATTACK controller profile requires targetHpBefore >= targetHpAfter >= 0",
    );
  }
  return { age: 0, config };
}

export function sceneOnDragonBreathView(
  state: SceneOnMovePresentationState,
): SceneOnDragonBreathView {
  if (state.config.move !== "DRAGON_BREATH") {
    throw new Error(`expected DRAGON_BREATH presentation, got ${state.config.move}`);
  }
  const animationAge =
    state.age + (state.config.animationAgeOffset ?? 0);
  return {
    age: state.age,
    animationAge,
    attacker: state.config.attacker,
    target: state.config.target,
    // Re-anchor the source's press-relative first spawn to animation age 0.
    // Its one-frame OAM transfer lag means the first displayed state is age 1.
    fireSprites: dragonBreathFireSprites(
      animationAge,
      -229,
      state.config.animationProfile,
    ),
    targetEffect: dragonBreathTargetEffectAtAge(animationAge),
  };
}

export function sceneOnFlamethrowerView(
  state: SceneOnMovePresentationState,
): SceneOnFlamethrowerView {
  if (state.config.move !== "FLAMETHROWER") {
    throw new Error(`expected FLAMETHROWER presentation, got ${state.config.move}`);
  }
  const animationAge = state.age + (state.config.animationAgeOffset ?? 0);
  return {
    age: state.age,
    animationAge,
    attacker: state.config.attacker,
    target: state.config.target,
    flames: flamethrowerFlamesAtAge(animationAge, state.config.animationProfile),
    battlerEffect: flamethrowerBattlerEffectAtAge(animationAge),
  };
}

export function sceneOnEmberView(
  state: SceneOnMovePresentationState,
): SceneOnEmberView {
  if (state.config.move !== "EMBER") {
    throw new Error(`expected EMBER presentation, got ${state.config.move}`);
  }
  const animationAge = state.age + (state.config.animationAgeOffset ?? 0);
  return {
    age: state.age,
    animationAge,
    attacker: state.config.attacker,
    target: state.config.target,
    sprites: emberSpritesInDrawOrder(animationAge, state.config.animationProfile),
  };
}

/**
 * Attacker x2/y2 across the move's three sequential (never concurrent, per
 * the script's own `waitforvisualfinish` barriers - `dragonRage.ts`'s module
 * doc) phases: `AnimTask_ShakeMon` (self-guards ticks before its own
 * creation), then `SlideMonToOffset`'s 0->15px ramp (freezes at the held
 * offset once its own duration elapses), then `SlideMonToOriginalPos`'s
 * 15px->0 return (`ticksSinceCreation < 0` holds at the same frozen value,
 * so the boundary between phase 2 and 3 is seamless).
 */
function dragonRageAttackerOffset(
  animationAge: number,
  schedule: DragonRageSchedule,
  attackerSide: DragonRageSide,
): Readonly<{ x2: number; y2: number }> {
  if (animationAge < schedule.slideToOffsetTick) {
    return shakeMonOffsetAtRenderTick(DRAGON_RAGE_ATTACKER_SHAKE, schedule.attackerShakeTick, animationAge);
  }
  if (animationAge < schedule.slideToOriginalPosTick) {
    return slideMonToOffsetAtTick(
      { battlerSide: attackerSide, ...DRAGON_RAGE_SLIDE_TO_OFFSET },
      animationAge - schedule.slideToOffsetTick,
    );
  }
  const heldX2 =
    attackerSide === "opponent"
      ? -DRAGON_RAGE_SLIDE_TO_OFFSET.targetXOffset
      : DRAGON_RAGE_SLIDE_TO_OFFSET.targetXOffset;
  return slideMonToOriginalPosAtTick(
    { currentX2: heldX2, currentY2: 0, ...DRAGON_RAGE_SLIDE_TO_ORIGINAL_POS },
    animationAge - schedule.slideToOriginalPosTick,
  );
}

function dragonRageFirePlumes(
  animationAge: number,
  schedule: DragonRageSchedule,
  attackerSide: DragonRageSide,
  targetBattlePosition: Readonly<{ x: number; y: number }>,
  targetSubpriority: number,
): readonly SceneOnDragonRageFirePlume[] {
  const plumes: SceneOnDragonRageFirePlume[] = [];
  for (let i = 0; i < DRAGON_RAGE_FIRE_PLUME_SPAWNS.length; i += 1) {
    const spawn = DRAGON_RAGE_FIRE_PLUME_SPAWNS[i]!;
    const spawnState = dragonRageFirePlumeStateAtAge(
      spawn,
      attackerSide,
      targetBattlePosition,
      targetSubpriority,
      animationAge - schedule.firePlumeTicks[i]!,
    );
    if (spawnState) plumes.push({ ...spawnState, subpriorityOffset: spawn.subpriorityOffset, spawnIndex: i });
  }
  return plumes;
}

/**
 * Target x2/y2 before `AnimTask_ShakeMon`'s own creation tick takes over
 * (`DRAGON_RAGE_TARGET_SHAKE`'s absolute set unconditionally overwrites
 * whatever the target held, `battle_anim_mon_movement.c:98-99` - once
 * `animationAge >= schedule.targetShakeTick`, `shakeMonOffsetAtRenderTick`
 * alone is authoritative). Before that, the target's front sprite (opponent
 * side only - the player's own back sprite uses an unrelated, unported
 * animation family) still carries its own send-out species idle-anim
 * residual (`speciesIdleAnim.ts`, root-caused from ANIMATION_PROGRESS.md's
 * DRAGON_RAGE rung 5 remainder's "-1 drift" finding) rather than sitting at
 * a clean `(0,0)`.
 */
function dragonRageTargetOffset(
  animationAge: number,
  schedule: DragonRageSchedule,
  target: SceneOnPresentationBattler,
): Readonly<{ x2: number; y2: number }> {
  if (animationAge < schedule.targetShakeTick && target.geometry.side === "opponent") {
    const idle = speciesFrontIdleRestOffset(target.species);
    if (idle) return idle;
  }
  if (animationAge < schedule.targetShakeTick) return { x2: 0, y2: 0 };
  return shakeMonOffsetAtRenderTick(DRAGON_RAGE_TARGET_SHAKE, schedule.targetShakeTick, animationAge);
}

export function sceneOnDragonRageView(
  state: SceneOnMovePresentationState,
): SceneOnDragonRageView {
  if (state.config.move !== "DRAGON_RAGE") {
    throw new Error(`expected DRAGON_RAGE presentation, got ${state.config.move}`);
  }
  const animationAge = state.age + (state.config.animationAgeOffset ?? 0);
  // 0-anchored: `dragonRageSchedule`'s own ticks are derived purely from the
  // decoded script via `interpretAnimSchedule` (no absolute-tick constant);
  // `animationAge` IS the RAM-tick-equivalent clock, same convention
  // `sceneOnEmberView`/`sceneOnDragonBreathView` already establish.
  const schedule = dragonRageSchedule(0);
  const attackerSide: DragonRageSide = state.config.attacker.geometry.side;
  // GetBattlerSpriteSubpriority's fixed singles-battle constant (30 player,
  // 40 opponent) - species-independent, same value `ember.ts`'s own callers
  // already pass in as `targetSubpriority`.
  const targetSubpriority = state.config.target.geometry.side === "player" ? 30 : 40;
  const targetOffset = dragonRageTargetOffset(
    animationAge,
    schedule,
    state.config.target,
  );
  // The priority-5 task's creation write is composed into OAM before its
  // same-frame synchronous step collapses the live sprite fields back to
  // zero. This display-only boundary takes precedence over the front-
  // animation rest offset because AnimTask_ShakeMon writes absolute x2/y2.
  // `dump-dragonrage-oam.py` captures the split at player-attacker RAM tick
  // 186: live x2/y2=(0,0), composed OAM x=144,y=13, i.e. (0,+3).
  const displayedTargetOffset =
    animationAge === schedule.targetShakeTick - 1
      ? shakeMonOffsetAtRenderTick(
        DRAGON_RAGE_TARGET_SHAKE,
        schedule.targetShakeTick,
        animationAge,
      )
      : targetOffset;
  return {
    age: state.age,
    animationAge,
    attacker: state.config.attacker,
    target: state.config.target,
    attackerOffset: dragonRageAttackerOffset(animationAge, schedule, attackerSide),
    targetOffset,
    displayedTargetOffset,
    fireSpit: dragonRageFireSpitStateAtAge(
      animationAge - schedule.fireSpitTick,
      DRAGON_RAGE_FIRE_SPIT_GEOMETRY[attackerSide],
    ),
    firePlumes: dragonRageFirePlumes(
      animationAge,
      schedule,
      attackerSide,
      state.config.target.geometry.battlePositionCenter,
      targetSubpriority,
    ),
  };
}

export function sceneOnBlazeKickView(
  state: SceneOnMovePresentationState,
): SceneOnBlazeKickView {
  if (state.config.move !== "BLAZE_KICK") {
    throw new Error(`expected BLAZE_KICK presentation, got ${state.config.move}`);
  }
  const animationAge = state.age + (state.config.animationAgeOffset ?? 0);
  return {
    age: state.age,
    animationAge,
    attacker: state.config.attacker,
    target: state.config.target,
    animation: blazeKickAnimationAtAge(
      animationAge,
      state.config.animationProfile.targetCenter,
    ),
    sprites: blazeKickSpritesAtAge(
      animationAge,
      state.config.animationProfile,
    ),
    palette: blazeKickPaletteAtAge(animationAge),
  };
}

export function sceneOnKnockOffView(
  state: SceneOnMovePresentationState,
): SceneOnKnockOffView {
  if (state.config.move !== "KNOCK_OFF") {
    throw new Error(`expected KNOCK_OFF presentation, got ${state.config.move}`);
  }
  const animationAge = state.age + (state.config.animationAgeOffset ?? 0);
  return {
    age: state.age,
    animationAge,
    attacker: state.config.attacker,
    target: state.config.target,
    targetOamOffset: knockOffTargetOamOffsetAtAge(
      animationAge,
      state.config.target.geometry.side,
    ),
    ...knockOffBodyAtAge(
      animationAge,
      state.config.attacker.geometry.side,
      state.config.target.geometry.side,
    ),
  };
}

export function sceneOnBindView(
  state: SceneOnMovePresentationState,
): SceneOnBindView {
  if (state.config.move !== "BIND") {
    throw new Error(`expected BIND presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...bindAnimationAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.animationProfile,
    ),
  };
}

/**
 * The IVYSAUR-attacker residual (ANIMATION_PROGRESS.md's own "salt-and-
 * pepper on high-detail regions" finding) was neither of the two suspected
 * classes: a direct RAM probe (`tools/probe/dump-growth-ivysaur-vram.py`,
 * this session) found `x2`/`y2` pinned at 0 for IVYSAUR's own battler
 * sprite at every window tick (no idle-anim rest offset - source-confirmed
 * too, `speciesIdleAnim.ts`'s doc: IVYSAUR's own
 * front `ANIM_V_STRETCH`/back `ANIM_H_SLIDE` families both explicitly zero
 * `x2`/`y2` on completion, unlike ONIX's `RAPID_H_HOPS`), and the extracted
 * tileset+palette were confirmed byte-identical against live VRAM/PLTT at
 * both a clean pre-move tick and window ticks (all 64 tiles, all 16 colors).
 * The actual cause: `growthAnimationAtAge`'s own mechanism is RAM-exact
 * against the live OAM matrix with NO lag (this module's `paletteFaded`/
 * matrix component check, still true), but the CAPTURED FRAMEBUFFER lags
 * the matrix write - same class of latency as BLAZE_KICK's own documented
 * "OAM one frame after the reducer, palette one more VBlank after that" -
 * except here the SCALE (affine matrix) lags TWO ticks and the BLEND TINT
 * lags only ONE, the reverse order from BLAZE_KICK's own affine/palette
 * split. Bisected empirically against both dense fixtures (all 9
 * (scaleLag, tintLag) combinations up to 2, both orientations); (2, 1) is
 * the only pair landing 63/63 framebuffer in both, reproduced twice each.
 */
export function sceneOnGrowthView(
  state: SceneOnMovePresentationState,
): SceneOnGrowthView {
  if (state.config.move !== "GROWTH") {
    throw new Error(`expected GROWTH presentation, got ${state.config.move}`);
  }
  const scaleState = growthAnimationAtAge(state.age - 2);
  const tintState = growthAnimationAtAge(state.age - 1);
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    attackerScale: scaleState.attackerScale,
    attackerObjY: tintState.attackerObjY,
  };
}

/** `age` is ticks since the first RecoverAbsorbEffect orb creation. */
export function sceneOnRecoverView(
  state: SceneOnMovePresentationState,
): SceneOnRecoverView {
  if (state.config.move !== "RECOVER") {
    throw new Error(`expected RECOVER presentation, got ${state.config.move}`);
  }
  const effect = recoverEffectAtAge(
    state.age,
    state.config.attacker.geometry.side,
    state.config.attacker.geometry.animationCenter,
  );
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...effect,
  };
}

/** `age=0` is Move_MOONLIGHT's first active source-script frame. */
export function sceneOnMoonlightView(
  state: SceneOnMovePresentationState<SceneOnMoveConfig>,
): SceneOnMoonlightView {
  if (state.config.move !== "MOONLIGHT") {
    throw new Error(`expected MOONLIGHT presentation, got ${state.config.move}`);
  }
  const config = state.config;
  return {
    age: state.age,
    attacker: config.attacker,
    target: config.target,
    ...moonlightAtAge(
      state.age,
      config.attacker.geometry.side,
      config.attacker.geometry.animationCenter.x,
      config.healingCenter,
    ),
  };
}

/** `age` is relative to the source script's `monbg ANIM_DEF_PARTNER`. */
export function sceneOnAbsorbView(
  state: SceneOnMovePresentationState<SceneOnAbsorbConfig>,
): SceneOnAbsorbView {
  if (state.config.move !== "ABSORB") {
    throw new Error(`expected ABSORB presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...absorbAtAge(
      state.age,
      state.config.target.geometry.animationCenter,
      state.config.absorptionCenter,
      state.config.attacker.geometry.side,
      state.config.healingCenter,
    ),
  };
}

export interface SceneOnReflectView extends ReflectState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

/** `age` is relative to gReflectWallSpriteTemplate's creation pass. */
export function sceneOnReflectView(
  state: SceneOnMovePresentationState<SceneOnReflectConfig>,
): SceneOnReflectView {
  if (state.config.move !== "REFLECT") {
    throw new Error(`expected REFLECT presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...reflectAtAge(
      state.age,
      state.config.attacker.geometry.battlePositionCenter,
      state.config.attacker.geometry.side,
    ),
  };
}

export interface SceneOnLightScreenView extends LightScreenState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

/** `age` is relative to gLightScreenWallSpriteTemplate's creation pass. */
export function sceneOnLightScreenView(
  state: SceneOnMovePresentationState<SceneOnLightScreenConfig>,
): SceneOnLightScreenView {
  if (state.config.move !== "LIGHT_SCREEN") {
    throw new Error(
      `expected LIGHT_SCREEN presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...lightScreenAtAge(
      state.age,
      state.config.attacker.geometry.battlePositionCenter,
      state.config.attacker.geometry.side,
    ),
  };
}

/** `age` is ticks since the first GrantingStarsEffect sprite creation. */
export function sceneOnSynthesisView(
  state: SceneOnMovePresentationState,
): SceneOnSynthesisView {
  if (state.config.move !== "SYNTHESIS") {
    throw new Error(`expected SYNTHESIS presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...synthesisEffectAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
    ),
  };
}

/** `age` spans the complete Move_AROMATHERAPY script body through cleanup. */
export function sceneOnAromatherapyView(
  state: SceneOnMovePresentationState,
): SceneOnAromatherapyView {
  if (state.config.move !== "AROMATHERAPY") {
    throw new Error(
      `expected AROMATHERAPY presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...aromatherapyAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.attacker.geometry.battlePositionCenter,
    ),
  };
}

/** `age` spans the complete Move_WISH script body through cleanup. */
export function sceneOnWishView(
  state: SceneOnMovePresentationState,
): SceneOnWishView {
  if (state.config.move !== "WISH") {
    throw new Error(`expected WISH presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...wishAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.twinkles,
    ),
  };
}

/** `age` is ticks since the milk bottle's creation callback. */
export function sceneOnMilkDrinkView(
  state: SceneOnMovePresentationState,
): SceneOnMilkDrinkView {
  if (state.config.move !== "MILK_DRINK") {
    throw new Error(`expected MILK_DRINK presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    sprites: milkDrinkEffectAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
    ),
  };
}

/** `age` is ticks since the first `gSupersonicRingSpriteTemplate` creation. */
export function sceneOnSupersonicView(
  state: SceneOnMovePresentationState,
): SceneOnSupersonicView {
  if (state.config.move !== "SUPERSONIC") {
    throw new Error(`expected SUPERSONIC presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...supersonicEffectAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age` is ticks since `gWaterGunProjectileSpriteTemplate` creation. */
export function sceneOnWaterGunView(
  state: SceneOnMovePresentationState,
): SceneOnWaterGunView {
  if (state.config.move !== "WATER_GUN") {
    throw new Error(`expected WATER_GUN presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...waterGunEffectAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.projectileOrigin,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age` is ticks since the first `gAcidPoisonBubbleSpriteTemplate` callback. */
export function sceneOnAcidView(
  state: SceneOnMovePresentationState,
): SceneOnAcidView {
  if (state.config.move !== "ACID") {
    throw new Error(`expected ACID presentation, got ${state.config.move}`);
  }
  const effect = acidEffectAtAge(
    state.age,
    state.config.attacker.geometry.side,
    state.config.projectileOrigin,
    state.config.target.geometry.animationCenter,
  );
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...effect,
    sprites: acidSpritesBackToFrontAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.projectileOrigin,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age` is ticks since `gSludgeProjectileSpriteTemplate` creation. */
export function sceneOnSludgeView(
  state: SceneOnMovePresentationState,
): SceneOnSludgeView {
  if (state.config.move !== "SLUDGE") {
    throw new Error(`expected SLUDGE presentation, got ${state.config.move}`);
  }
  const effect = sludgeEffectAtAge(
    state.age,
    state.config.attacker.geometry.side,
    state.config.projectileOrigin,
    state.config.target.geometry.animationCenter,
  );
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    targetOffset: effect.targetOffset,
    defenderPaletteY: sludgeTargetPaletteYAtAge(state.age),
    sprites: sludgeSpritesBackToFrontAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.projectileOrigin,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age` is ticks since the first of ten sludge projectile creations. */
export function sceneOnSludgeBombView(
  state: SceneOnMovePresentationState,
): SceneOnSludgeBombView {
  if (state.config.move !== "SLUDGE_BOMB") {
    throw new Error(`expected SLUDGE_BOMB presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...sludgeBombEffectAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.projectileOrigin,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age` is ticks since `gFangSpriteTemplate` creation. */
export function sceneOnPoisonFangView(
  state: SceneOnMovePresentationState,
): SceneOnPoisonFangView {
  if (state.config.move !== "POISON_FANG") {
    throw new Error(`expected POISON_FANG presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...poisonFangEffectAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is Hyper Fang's initial SE_M_BITE display frame. */
export function sceneOnHyperFangView(
  state: SceneOnMovePresentationState,
): SceneOnHyperFangView {
  if (state.config.move !== "HYPER_FANG") {
    throw new Error(`expected HYPER_FANG presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...hyperFangEffectAtAge(
      state.age,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is Bite's first displayed sharp-teeth callback step. */
export function sceneOnBiteView(
  state: SceneOnMovePresentationState<SceneOnBiteConfig>,
): SceneOnBiteView {
  if (state.config.move !== "BITE") {
    throw new Error(`expected BITE presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...biteEffectAtAge(
      state.age,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is HEADBUTT's source `loadspritegfx ANIM_TAG_IMPACT` display. */
export function sceneOnHeadbuttView(
  state: SceneOnMovePresentationState<SceneOnHeadbuttConfig>,
): SceneOnHeadbuttView {
  if (state.config.move !== "HEADBUTT") {
    throw new Error(`expected HEADBUTT presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...headbuttAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is WHIRLWIND's source `loadspritegfx` display. */
export function sceneOnWhirlwindView(
  state: SceneOnMovePresentationState<SceneOnWhirlwindConfig>,
): SceneOnWhirlwindView {
  if (state.config.move !== "WHIRLWIND") {
    throw new Error(`expected WHIRLWIND presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...whirlwindAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.target.geometry.side,
      state.config.target.geometry.battlePositionCenter,
    ),
  };
}

export interface SceneOnBlockView extends BlockState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

/** `age=0` is BLOCK's source `loadspritegfx` display. */
export function sceneOnBlockView(
  state: SceneOnMovePresentationState<SceneOnBlockConfig>,
): SceneOnBlockView {
  if (state.config.move !== "BLOCK") {
    throw new Error(`expected BLOCK presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...blockAtAge(
      state.age,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is BODY SLAM's first active source-script display. */
export function sceneOnBodySlamView(
  state: SceneOnMovePresentationState<SceneOnBodySlamConfig>,
): SceneOnBodySlamView {
  if (state.config.move !== "BODY_SLAM") {
    throw new Error(`expected BODY_SLAM presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...bodySlamAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is SLAM's first active source-script display. */
export function sceneOnSlamView(
  state: SceneOnMovePresentationState<SceneOnSlamConfig>,
): SceneOnSlamView {
  if (state.config.move !== "SLAM") {
    throw new Error(`expected SLAM presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...slamAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is TWINEEDLE's first displayed linear-stinger callback step. */
export function sceneOnTwineedleView(
  state: SceneOnMovePresentationState<SceneOnTwineedleConfig>,
): SceneOnTwineedleView {
  if (state.config.move !== "TWINEEDLE") {
    throw new Error(
      `expected TWINEEDLE presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...twineedleEffectAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is SPIKE CANNON's first source-script load display. */
export function sceneOnSpikeCannonView(
  state: SceneOnMovePresentationState<SceneOnSpikeCannonConfig>,
): SceneOnSpikeCannonView {
  if (state.config.move !== "SPIKE_CANNON") {
    throw new Error(
      `expected SPIKE_CANNON presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...spikeCannonEffectAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is SONIC BOOM's first source-script AIR_WAVE load display. */
export function sceneOnSonicBoomView(
  state: SceneOnMovePresentationState<SceneOnSonicBoomConfig>,
): SceneOnSonicBoomView {
  if (state.config.move !== "SONIC_BOOM") {
    throw new Error(
      `expected SONIC_BOOM presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...sonicBoomEffectAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is SMOKESCREEN's first BLACK_SMOKE load display. */
export function sceneOnSmokescreenView(
  state: SceneOnMovePresentationState<SceneOnSmokescreenConfig>,
): SceneOnSmokescreenView {
  if (state.config.move !== "SMOKESCREEN") {
    throw new Error(
      `expected SMOKESCREEN presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...smokescreenEffectAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is Move_MUD_SHOT's first BROWN_ORB load display. */
export function sceneOnMudShotView(
  state: SceneOnMovePresentationState<SceneOnMudShotConfig>,
): SceneOnMudShotView {
  if (state.config.move !== "MUD_SHOT") {
    throw new Error(
      `expected MUD_SHOT presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...mudShotAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attackerPictureOffset,
      state.config.targetPictureOffset,
    ),
  };
}

/** `age=0` is Move_HYDRO_PUMP's first WATER_ORB load display. */
export function sceneOnHydroPumpView(
  state: SceneOnMovePresentationState<SceneOnHydroPumpConfig>,
): SceneOnHydroPumpView {
  if (state.config.move !== "HYDRO_PUMP") {
    throw new Error(
      `expected HYDRO_PUMP presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...hydroPumpAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attackerPictureOffset,
      state.config.targetPictureOffset,
    ),
  };
}

/** `age=0` is Move_BUBBLE_BEAM's first BUBBLE load display. */
export function sceneOnBubbleBeamView(
  state: SceneOnMovePresentationState<SceneOnBubbleBeamConfig>,
): SceneOnBubbleBeamView {
  if (state.config.move !== "BUBBLE_BEAM") {
    throw new Error(
      `expected BUBBLE_BEAM presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...bubbleBeamAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attackerPictureOffset,
      state.config.targetPictureOffset,
    ),
  };
}

/** `age=0` is Move_CROSS_CHOP's first HANDS_AND_FEET load display. */
export function sceneOnCrossChopView(
  state: SceneOnMovePresentationState<SceneOnCrossChopConfig>,
): SceneOnCrossChopView {
  if (state.config.move !== "CROSS_CHOP") {
    throw new Error(
      `expected CROSS_CHOP presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...crossChopAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.targetPictureOffset,
    ),
  };
}

/** `age=0` is Move_FOCUS_ENERGY's first FOCUS_ENERGY load display. */
export function sceneOnFocusEnergyView(
  state: SceneOnMovePresentationState<SceneOnFocusEnergyConfig>,
): SceneOnFocusEnergyView {
  if (state.config.move !== "FOCUS_ENERGY") {
    throw new Error(
      `expected FOCUS_ENERGY presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...focusEnergyAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attackerCoord,
    ),
  };
}

/** `age=0` is Move_ENDURE's first FOCUS_ENERGY load display. */
export function sceneOnEndureView(
  state: SceneOnMovePresentationState<SceneOnEndureConfig>,
): SceneOnEndureView {
  if (state.config.move !== "ENDURE") {
    throw new Error(
      `expected ENDURE presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...endureAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attackerCoord,
    ),
  };
}

/** `age=0` is Move_REVERSAL's first BLUE_ORB load display. */
export function sceneOnReversalView(
  state: SceneOnMovePresentationState<SceneOnReversalConfig>,
): SceneOnReversalView {
  if (state.config.move !== "REVERSAL") {
    throw new Error(
      `expected REVERSAL presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    resolvedShake: state.config.resolvedShake,
    ...reversalAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attackerPictureOffset,
      state.config.targetPictureOffset,
      state.config.resolvedShake,
    ),
  };
}

/** `age=0` is GrowAndShrink's first displayed task frame. */
export function sceneOnSwaggerView(
  state: SceneOnMovePresentationState,
): SceneOnSwaggerView {
  if (state.config.move !== "SWAGGER") {
    throw new Error(`expected SWAGGER presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...swaggerAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.breathOrigin,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is the first displayed thought-bubble software OAM. */
export function sceneOnTauntView(
  state: SceneOnMovePresentationState,
): SceneOnTauntView {
  if (state.config.move !== "TAUNT") {
    throw new Error(`expected TAUNT presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...tauntAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attackerHead,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is the first move-owned to-black palette controller frame. */
export function sceneOnScaryFaceView(
  state: SceneOnScaryFacePresentationState,
): SceneOnScaryFaceView {
  if (state.config.move !== "SCARY_FACE") {
    throw new Error(`expected SCARY_FACE presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...scaryFaceAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.target.geometry.side,
      state.config.attackerEyeCenter,
    ),
  };
}

/** `age=0` is Move_SPARK's first displayed palette/sprite source tick. */
export function sceneOnSparkView(
  state: SceneOnSparkPresentationState,
): SceneOnSparkView {
  if (state.config.move !== "SPARK") {
    throw new Error(`expected SPARK presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...sparkAtAge(
      state.age,
      {
        side: state.config.attacker.geometry.side,
        center: state.config.attacker.geometry.animationCenter,
        pictureOffset: state.config.attackerPictureOffset,
        bgPriority: state.config.attackerBgPriority,
        flashingInitialCallbackAdvances:
          state.config.flashingInitialCallbackAdvances,
        flashingInitialAffineAdvances:
          state.config.flashingInitialAffineAdvances,
      },
      {
        side: state.config.target.geometry.side,
        center: state.config.target.geometry.animationCenter,
        pictureOffset: state.config.targetPictureOffset,
        bgPriority: state.config.targetBgPriority,
        impactPosition: state.config.targetImpactPosition,
      },
    ),
  };
}

/** `age=0` is Move_THUNDER_WAVE's active source-script offset-zero display. */
export function sceneOnThunderWaveView(
  state: SceneOnThunderWavePresentationState,
): SceneOnThunderWaveView {
  if (state.config.move !== "THUNDER_WAVE") {
    throw new Error(
      `expected THUNDER_WAVE presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...thunderWaveAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.targetEffectCenter,
      state.config.target.geometry.battlePositionCenter,
    ),
  };
}

/** `age=0` is Move_SURF's active source-script offset-zero display. */
export function sceneOnSurfView(
  state: SceneOnSurfPresentationState,
): SceneOnSurfView {
  if (state.config.move !== "SURF") {
    throw new Error(`expected SURF presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...surfWaveAtAge(state.age, state.config.attacker.geometry.side),
  };
}

/** `age=0` is Move_CHARM's first displayed rock/heart source tick. */
export function sceneOnCharmView(
  state: SceneOnCharmPresentationState,
): SceneOnCharmView {
  if (state.config.move !== "CHARM") {
    throw new Error(`expected CHARM presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...charmAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.battlePositionCenter,
    ),
  };
}

/** `age=0` is Move_COVET's first displayed MAGENTA_HEART load. */
export function sceneOnCovetView(
  state: SceneOnCovetPresentationState,
): SceneOnCovetView {
  if (state.config.move !== "COVET") {
    throw new Error(`expected COVET presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...covetAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.battlePositionCenter,
    ),
  };
}

/** `age=0` is Move_FAKE_TEARS' first displayed SMALL_BUBBLES load. */
export function sceneOnFakeTearsView(
  state: SceneOnFakeTearsPresentationState,
): SceneOnFakeTearsView {
  if (state.config.move !== "FAKE_TEARS") {
    throw new Error(
      `expected FAKE_TEARS presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...fakeTearsAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attackerPictureBounds,
    ),
  };
}

/** `age=0` is Move_TICKLE's first displayed source-script frame. */
export function sceneOnTickleView(
  state: SceneOnTicklePresentationState,
): SceneOnTickleView {
  if (state.config.move !== "TICKLE") {
    throw new Error(`expected TICKLE presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...tickleAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
    ),
  };
}

/** `age=0` is Move_METRONOME's first displayed source-script frame. */
export function sceneOnMetronomeView(
  state: SceneOnMetronomePresentationState,
): SceneOnMetronomeView {
  if (state.config.move !== "METRONOME") {
    throw new Error(`expected METRONOME presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...metronomeAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attackerHead,
    ),
  };
}

/** `age=0` is Move_FOLLOW_ME's first displayed source-script frame. */
export function sceneOnFollowMeView(
  state: SceneOnFollowMePresentationState,
): SceneOnFollowMeView {
  if (state.config.move !== "FOLLOW_ME") {
    throw new Error(`expected FOLLOW_ME presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...followMeAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attackerTop,
    ),
  };
}

/** `age=0` is Move_REST's first displayed source-script frame. */
export function sceneOnRestView(
  state: SceneOnRestPresentationState,
): SceneOnRestView {
  if (state.config.move !== "REST") {
    throw new Error(`expected REST presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...restAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
    ),
  };
}

/** `age=0` is Move_HOWL's first displayed source-script frame. */
export function sceneOnHowlView(
  state: SceneOnHowlPresentationState,
): SceneOnHowlView {
  if (state.config.move !== "HOWL") {
    throw new Error(`expected HOWL presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...howlAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.battlePositionCenter,
    ),
  };
}

export interface SceneOnSweetKissView extends SweetKissState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

/** `age=0` is Move_SWEET_KISS's first active source-script frame. */
export function sceneOnSweetKissView(
  state: SceneOnSweetKissPresentationState,
): SceneOnSweetKissView {
  if (state.config.move !== "SWEET_KISS") {
    throw new Error(
      `expected SWEET_KISS presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...sweetKissAtAge(
      state.age,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

export interface SceneOnSporeView extends SporeState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

/** `age=0` is Move_SPORE's first active source-script frame. */
export function sceneOnSporeView(
  state: SceneOnSporePresentationState,
): SceneOnSporeView {
  if (state.config.move !== "SPORE") {
    throw new Error(`expected SPORE presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...sporeAtAge(
      state.age,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

export interface SceneOnHypnosisView extends HypnosisState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly displayedRings: readonly HypnosisRing[];
  readonly displayedTargetBlendCoefficient: number;
  readonly displayedBgPaletteAge: number;
}

/** `age=0` is Move_HYPNOSIS's first active source-script frame. */
export function sceneOnHypnosisView(
  state: SceneOnHypnosisPresentationState,
): SceneOnHypnosisView {
  if (state.config.move !== "HYPNOSIS") {
    throw new Error(`expected HYPNOSIS presentation, got ${state.config.move}`);
  }
  const component = hypnosisAtAge(
    state.age,
    state.config.attacker.geometry.side,
    state.config.attacker.geometry.animationCenter,
    state.config.target.geometry.animationCenter,
  );
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...component,
    displayedRings: hypnosisDisplayedRingsAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.animationCenter,
    ),
    displayedTargetBlendCoefficient: hypnosisAtAge(
      state.age - 1,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.animationCenter,
    ).targetBlendCoefficient,
    // SetPsychicBackground's four-tick rotate task passes through the
    // palette-transfer queue; UnsetPsychicBackground's setup pause absorbs
    // two of those display ticks at the second fade boundary.
    displayedBgPaletteAge: state.age - (state.age < 129 ? 6 : 4),
  };
}

/** `age=0` is Move_PERISH_SONG's first displayed source-script frame. */
export function sceneOnPerishSongView(
  state: SceneOnPerishSongPresentationState,
): SceneOnPerishSongView {
  if (state.config.move !== "PERISH_SONG") {
    throw new Error(`expected PERISH_SONG presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...perishSongAtAge(
      state.age,
      state.config.attacker.geometry.side,
    ),
  };
}

/** `age=0` is Move_NEEDLE_ARM's first displayed source-script frame. */
export function sceneOnNeedleArmView(
  state: SceneOnNeedleArmPresentationState,
): SceneOnNeedleArmView {
  if (state.config.move !== "NEEDLE_ARM") {
    throw new Error(`expected NEEDLE_ARM presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...needleArmAtAge(state.age, state.config.target.geometry.animationCenter),
  };
}

/** `age=0` is Move_SANDSTORM's first displayed source-script frame. */
export function sceneOnSandstormView(
  state: SceneOnSandstormPresentationState,
): SceneOnSandstormView {
  if (state.config.move !== "SANDSTORM") {
    throw new Error(`expected SANDSTORM presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...sandstormAtAge(state.age),
  };
}

/** `age=0` is the source `loadspritegfx` display for Move_TAIL_GLOW. */
export function sceneOnTailGlowView(
  state: SceneOnTailGlowPresentationState,
): SceneOnTailGlowView {
  if (state.config.move !== "TAIL_GLOW") {
    throw new Error(`expected TAIL_GLOW presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...tailGlowAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attackerPictureOffset,
    ),
  };
}

/** `age=0` is the first software-OAM explosion sprite. */
export function sceneOnSelfDestructView(
  state: SceneOnMovePresentationState,
): SceneOnSelfDestructView {
  if (state.config.move !== "SELF_DESTRUCT") {
    throw new Error(
      `expected SELF_DESTRUCT presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...selfDestructAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.battlePositionCenter,
    ),
  };
}

/** `age=0` is the first software-OAM explosion sprite and BG blend. */
export function sceneOnExplosionView(
  state: SceneOnMovePresentationState,
): SceneOnExplosionView {
  if (state.config.move !== "EXPLOSION") {
    throw new Error(`expected EXPLOSION presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...explosionAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.battlePositionCenter,
    ),
  };
}

/** `age=0` is the first software-OAM fist/hitsplat display. */
export function sceneOnDynamicPunchView(
  state: SceneOnMovePresentationState,
): SceneOnDynamicPunchView {
  if (state.config.move !== "DYNAMIC_PUNCH") {
    throw new Error(
      `expected DYNAMIC_PUNCH presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...dynamicPunchAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.target.geometry.animationCenter,
      state.config.target.geometry.battlePositionCenter,
    ),
  };
}

/** `age=0` is the first displayed callback of the first horizontal lunge. */
export function sceneOnDizzyPunchView(
  state: SceneOnMovePresentationState,
): SceneOnDizzyPunchView {
  if (state.config.move !== "DIZZY_PUNCH") {
    throw new Error(
      `expected DIZZY_PUNCH presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...dizzyPunchAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is Astonish's displayed SWEAT_BEAD load command. */
export function sceneOnAstonishView(
  state: SceneOnMovePresentationState<SceneOnAstonishConfig>,
): SceneOnAstonishView {
  if (state.config.move !== "ASTONISH") {
    throw new Error(
      `expected ASTONISH presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    targetBattler: state.config.target,
    ...astonishAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.target.geometry.animationCenter,
      state.config.targetPictureYOffset,
      state.config.dropletRandom,
    ),
  };
}

/** `age=0` is the first monbg/alpha display of the complete source body. */
export function sceneOnRazorLeafView(
  state: SceneOnMovePresentationState,
): SceneOnRazorLeafView {
  if (state.config.move !== "RAZOR_LEAF") {
    throw new Error(
      `expected RAZOR_LEAF presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...razorLeafAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is the MetallicShine initializer's first displayed frame. */
export function sceneOnPoisonTailView(
  state: SceneOnMovePresentationState,
): SceneOnPoisonTailView {
  if (state.config.move !== "POISON_TAIL") {
    throw new Error(`expected POISON_TAIL presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...poisonTailAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age` is ticks since the first `gToxicBubbleSpriteTemplate` creation. */
export function sceneOnToxicView(
  state: SceneOnMovePresentationState,
): SceneOnToxicView {
  if (state.config.move !== "TOXIC") {
    throw new Error(`expected TOXIC presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    sprites: toxicEffectAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.target.geometry.battlePositionCenter,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is the two simultaneous HorizontalShake task creation tick. */
export function sceneOnEarthquakeView(
  state: SceneOnMovePresentationState,
): SceneOnEarthquakeView {
  if (state.config.move !== "EARTHQUAKE") {
    throw new Error(`expected EARTHQUAKE presentation, got ${state.config.move}`);
  }
  const animation = earthquakeAnimationAtAge(state.age);
  const beforeFirstShakeWrite = state.age < 2;
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...animation,
    playerBattlerX2: beforeFirstShakeWrite
      ? state.config.initialBattlerX2.player
      : animation.shake.battlerX2,
    opponentBattlerX2: beforeFirstShakeWrite
      ? state.config.initialBattlerX2.opponent
      : animation.shake.battlerX2,
  };
}

/** `age=0` is the MetallicShine initializer's first displayed frame. */
export function sceneOnHardenView(
  state: SceneOnMovePresentationState,
): SceneOnHardenView {
  if (state.config.move !== "HARDEN") {
    throw new Error(`expected HARDEN presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...metallicShineAtAge(
      state.age,
      state.config.attackerSpriteCenter.x,
      state.config.attackerSpriteCenter.y,
      false,
    ),
  };
}

/** `age=0` is the settled field immediately before the script's `monbg`. */
export function sceneOnCalmMindView(
  state: SceneOnMovePresentationState,
): SceneOnCalmMindView {
  if (state.config.move !== "CALM_MIND") {
    throw new Error(`expected CALM_MIND presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...calmMindAtAge(state.age),
  };
}

/** `age=0` is the `fadetobg BG_GHOST` creation tick. */
export function sceneOnShadowBallView(
  state: SceneOnMovePresentationState,
): SceneOnShadowBallView {
  if (state.config.move !== "SHADOW_BALL") {
    throw new Error(`expected SHADOW_BALL presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    backgroundGhost: shadowBallBackgroundIsGhost(state.age),
    backgroundBldy: shadowBallBackgroundBldy(state.age),
    sprite: shadowBallSpriteAtAge(state.age, {
      attackerCenter: state.config.attacker.geometry.animationCenter,
      targetCenter: state.config.target.geometry.animationCenter,
    }),
    targetOffset: shadowBallTargetShakeAtAge(state.age),
    displayedTargetOffset: shadowBallDisplayedTargetShakeAtAge(state.age),
    loopSound: shadowBallLoopSoundAtAge(
      state.age,
      state.config.attacker.geometry.side,
    ),
  };
}

/** `age=0` is AnimTask_CreateSpotlight / HardwarePaletteFade creation. */
export function sceneOnEncoreView(
  state: SceneOnMovePresentationState,
): SceneOnEncoreView {
  if (state.config.move !== "ENCORE") {
    throw new Error(`expected ENCORE presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...encoreAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.battlePositionCenter,
      state.config.target.geometry.battlePositionCenter,
    ),
  };
}

/** `age=0` is the settled field immediately before the first visual task. */
export function sceneOnDragonClawView(
  state: SceneOnMovePresentationState,
): SceneOnDragonClawView {
  if (state.config.move !== "DRAGON_CLAW") {
    throw new Error(`expected DRAGON_CLAW presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...dragonClawAtAge(state.age, {
      attackerSide: state.config.attacker.geometry.side,
      attackerCenter: state.config.attacker.geometry.battlePositionCenter,
      targetCenter: state.config.target.geometry.animationCenter,
    }),
  };
}

/** `age=0` is the first active frame of SING's move animation script. */
export function sceneOnSingView(
  state: SceneOnMovePresentationState,
): SceneOnSingView {
  if (state.config.move !== "SING") {
    throw new Error(`expected SING presentation, got ${state.config.move}`);
  }
  const noteAge = state.age - 7;
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    notes: singNotesBackToFrontAtAge(
      noteAge,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.animationCenter,
    ),
    pan: singPanTaskAtAge(noteAge, state.config.attacker.geometry.side),
    // Task_InitUpdateMonBg hides the target four relative frames after
    // script activation; Cmd_clearmonbg restores it after the final note.
    targetInMonBg:
      state.age >= 4
      && state.age <= (
        state.config.attacker.geometry.side === "player" ? 150 : 153
      ),
  };
}

/** `age` is ticks since `fadetobg BG_PSYCHIC`'s own creation tick (`futureSight.ts`'s module doc has the full RAM-probed derivation). */
export function sceneOnFutureSightView(
  state: SceneOnMovePresentationState,
): SceneOnFutureSightView {
  if (state.config.move !== "FUTURE_SIGHT") {
    throw new Error(`expected FUTURE_SIGHT presentation, got ${state.config.move}`);
  }
  // Captured-framebuffer-lags-RAM-write, same class of latency as
  // MOVE_GROWTH's own documented (scaleLag=2, tintLag=1) split for the
  // identical blend_color_cycle+ScaleMonAndRestore attacker-tint/affine
  // seam (sceneOnGrowthView's own module doc) - reused here since both
  // moves drive the exact same drawSpriteSheetAffineStretch path; RAM/
  // pixel-confirmed to transfer unchanged (tools/compare/
  // futureSightPortable.ts against the dense fixture).
  const scaleState = futureSightAttackerEffectAtAge(state.age - 2);
  const tintState = futureSightAttackerEffectAtAge(state.age - 1);
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    attackerObjY: tintState.attackerObjY,
    attackerScale: scaleState.attackerScale,
    attackerBlendActive: tintState.attackerScale.active,
    bgBldy: futureSightBgBldyAtAge(state.age),
    bgIsPsychic: futureSightBgIsPsychic(state.age),
  };
}

/** `age` is ticks since `fadetobg BG_PSYCHIC`'s own creation tick (`confusion.ts`'s module doc has the full RAM-probed derivation). */
export function sceneOnConfusionView(
  state: SceneOnMovePresentationState,
): SceneOnConfusionView {
  if (state.config.move !== "CONFUSION") {
    throw new Error(`expected CONFUSION presentation, got ${state.config.move}`);
  }
  // Per-mechanism lag bisection against the dense oracle fixture (not
  // assumed from GROWTH/FUTURE_SIGHT's own scaleLag=2/tintLag=1 - this
  // move's own window 1 needed a DIFFERENT split): the attacker's tint
  // (blend_color_cycle's own objY) matches GROWTH/FUTURE_SIGHT's -1;
  // AnimTask_ShakeMon2's own x2 needed -2 (RAM x2 already matches oracle
  // with NO offset beyond confusion.ts's own "+1" creation-anchor idiom -
  // the extra -2 here is display-only, the captured framebuffer lagging
  // RAM by 2 ticks for this OAM write, not a formula correction).
  //
  // Window 2's own target x2 carries the SAME -2, not "no lag" as an
  // earlier session claimed - that claim was based on a 13/30 sampled-pixel
  // check at a single tick near the scale curve's extremum (where the
  // matrix barely moves tick-to-tick, masking a real lag) rather than a
  // dense per-tick sweep. This session RAM-probed both windows directly
  // (`gSprites[].oam` attr1's real x bitfield vs the SAME struct's x2 field,
  // read at the identical instant - not a display-timing artifact):
  // oamX(tick) == x(tick) + x2(tick-1) + centerToCornerVecX(tick) holds for
  // 28/29 window-2 ticks and 17/18 window-1 ticks (the lone miss each time
  // is the task's own creation tick, already absorbed by confusion.ts's
  // "+1" idiom) - a real, uniform ONE-tick OAM-copy latency between the
  // shake task's RAM write and the OAM shadow struct, on BOTH windows alike
  // (same class, `AnimTask_ShakeMon`/`AnimTask_ShakeMon2` both apparently
  // ordered after `BuildOamBuffer` in the per-frame task list). That
  // combines with the SAME generic one-tick framebuffer-capture lag already
  // established everywhere else in this codebase (blend/tint/BG-rotation
  // reads above) for a total of -2, matching window 1's own already-coded
  // shake lag exactly.
  //
  // `AnimTask_ScaleMonAndRestore`'s matrix ALSO needs -2, not 0: RAM
  // (`gOamMatrices`) matches this move's own formula exactly with zero
  // shift (dense-checked this session, all 31 ticks), so there's no
  // RAM-internal lag on the matrix table itself (unlike x2's OAM-shadow
  // hop) - but FUTURE_SIGHT's own attacker scale, which shares this exact
  // `scaleMonAndRestoreAtAge`/`FUTURE_SIGHT_SCALE_PARAMS` mechanism, already
  // carries a documented two-tick DISPLAY lag (ANIMATION_PROGRESS.md's
  // defect-A fix: "the matrix has its own already-established two-tick
  // display lag"). CONFUSION's target scale reuses the identical mechanism,
  // so the same display lag applies here too. Dense full-window sweep
  // (`tools/compare/scratch/confusion-cached-compare.ts` against every
  // integer shake/scale shift 0-4) confirms: shake=-2 alone or scale=-2
  // alone each leave the window unchanged (108/140), but BOTH at -2
  // together jump to 122/140 with every interior EVEN tick byte-exact -
  // the strongest evidence available that -2 is the real mechanism for
  // both, not a coincidental curve-fit.
  const attackerTint = confusionAttackerEffectAtAge(state.age - 1);
  const targetEffect = confusionTargetEffectAtAge(state.age - 2);
  // Boundary rung (this session, instrument-first via
  // `tools/compare/scratch/confusion-boundary-instrument.ts` against fresh
  // `dump-scale-window-oam-scanline.py` RAM: `confusionAttackerEffectAtAge`'s
  // own "+1" is a RAM-SAMPLE-alignment idiom, not a display one - see its
  // own doc). `confusionAttackerShakeDisplayX2` is the corrected display
  // formula: no "+1" skip, `shakeMon2OffsetAtTick`'s own `tick<0` clamp
  // handles "not yet created" directly, reproducing the genuine one-tick
  // creation-boundary transitional value (frame119's own defect) that the
  // old formula's over-eager zero-clamp missed.
  const attackerX2 = confusionAttackerShakeDisplayX2(state.age);
  // OAM objMode/affineMode reaches the display after one tick, while the
  // matrix magnitude reaches it after two. Keep those edges separate, as
  // sceneOnFutureSightView already does for the identical
  // ScaleMonAndRestore(..., objMode=1) mechanism. At the restore tail this
  // produces a real transitional state: normal/single-size OBJ mode with
  // the prior non-neutral matrix still displayed.
  const targetBlendActive =
    confusionTargetEffectAtAge(state.age - 1).targetScale.active;
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    attackerObjY: attackerTint.attackerObjY,
    attackerX2,
    targetScale: targetEffect.targetScale,
    targetBlendActive,
    targetX2: confusionTargetShakeDisplayX2(state.age),
    bgBldy: confusionBgBldyAtAge(state.age),
    bgIsPsychic: confusionBgIsPsychic(state.age),
  };
}

/**
 * `age` is ticks since `fadetobg BG_PSYCHIC`'s own creation tick
 * (`psychic.ts`'s module doc has the full RAM-probed derivation - every
 * relative age here matched CONFUSION's own already-coded constant exactly,
 * confirmed independently, not assumed). Same lag-splice shape as
 * `sceneOnConfusionView` above: PSYCHIC's own script argv is a byte-for-byte
 * copy of CONFUSION's aside from the blend tint color and the target shake/
 * scale magnitude, so the same generic OAM-shadow/framebuffer-capture
 * latencies apply unchanged (verified via this session's own dense
 * comparator, not just carried over).
 */
export function sceneOnPsychicView(
  state: SceneOnMovePresentationState,
): SceneOnPsychicView {
  if (state.config.move !== "PSYCHIC") {
    throw new Error(`expected PSYCHIC presentation, got ${state.config.move}`);
  }
  const attackerTint = psychicAttackerEffectAtAge(state.age - 1);
  // Same shared window-1 boundary fix as `sceneOnConfusionView` (this
  // session's own instrument, mirrored not re-probed - see
  // `psychicAttackerShakeDisplayX2`'s own doc).
  const attackerX2 = psychicAttackerShakeDisplayX2(state.age);
  const targetEffect = psychicTargetEffectAtAge(state.age - 2);
  const targetBlendActive =
    psychicTargetEffectAtAge(state.age - 1).targetScale.active;
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    attackerObjY: attackerTint.attackerObjY,
    attackerX2,
    targetScale: targetEffect.targetScale,
    targetBlendActive,
    targetX2: psychicTargetShakeDisplayX2(state.age),
    bgBldy: psychicBgBldyAtAge(state.age),
    bgIsPsychic: psychicBgIsPsychic(state.age),
  };
}

export function sceneOnFlyView(
  state: SceneOnMovePresentationState,
): SceneOnFlyView {
  if (state.config.move !== "FLY") {
    throw new Error(`expected FLY presentation, got ${state.config.move}`);
  }
  const animationAge =
    state.age + (state.config.animationAgeOffset ?? 0);
  const fly = flyPresentationAtAge(
    state.config.turn,
    animationAge,
    state.config.attacker.geometry.side,
    state.config.attacker.geometry.animationCenter,
    state.config.target.geometry.animationCenter,
  );
  const hit = state.config.turn === "strike"
    ? genericHitReactionAtAge(
        state.age,
        state.config.controllerProfile.hitReactionFirstAge,
      )
    : { healthboxY2: 0, targetInvisible: false };
  const attackerName = battlerNameWithPrefix(state.config.attacker);
  const message =
    state.config.turn === "charge"
      ? {
          line1: `${attackerName} flew`,
          line2: "up high!",
          firstAge: state.config.controllerProfile.chargeMessageFirstAge,
        }
      : state.age >= state.config.controllerProfile.resultTextFirstAge
        ? {
            line1: "It’s not very effective…",
            line2: "",
            firstAge: state.config.controllerProfile.resultTextFirstAge,
          }
        : {
            line1: `${attackerName} used`,
            line2: "FLY!",
            firstAge: state.config.controllerProfile.strikeMoveTextFirstAge,
          };
  const messageLength = message.line1.length + message.line2.length;
  return {
    age: state.age,
    animationAge,
    attacker: state.config.attacker,
    target: state.config.target,
    ...fly,
    healthboxY2: hit.healthboxY2,
    targetInvisible: hit.targetInvisible,
    displayedTargetHp: displayedHpAfterDamage(
      state.age,
      {
        startHp: state.config.controllerProfile.targetHpBefore,
        endHp: state.config.controllerProfile.targetHpAfter,
        firstDisplayedAge: state.config.controllerProfile.hpDrainFirstAge,
      },
    ),
    message: state.age < message.firstAge
      ? null
      : {
          line1: message.line1,
          line2: message.line2,
          visibleChars: Math.min(
            messageLength,
            state.age - message.firstAge + 1,
          ),
        },
    currentMove:
      state.age >= state.config.controllerProfile.currentMoveResetAge
        ? null
        : "FLY",
  };
}

export function sceneOnBounceView(
  state: SceneOnMovePresentationState,
): SceneOnBounceView {
  if (state.config.move !== "BOUNCE") {
    throw new Error(`expected BOUNCE presentation, got ${state.config.move}`);
  }
  const animationAge =
    state.age + (state.config.animationAgeOffset ?? 0);
  const moveLine1 = `${battlerNameWithPrefix(state.config.attacker)} used`;
  const moveLine2 = "BOUNCE!";
  const { controllerProfile } = state.config;
  const statusMessageFirstAge =
    controllerProfile.statusMessageFirstAge ?? Number.POSITIVE_INFINITY;
  const message = state.age >= statusMessageFirstAge
    ? {
        line1: "ONIX is paralyzed!",
        line2: "It may be unable to move!",
        firstAge: statusMessageFirstAge,
      }
    : state.age >= controllerProfile.resultTextFirstAge
    ? {
        line1: "It’s not very effective…",
        line2: "",
        firstAge: controllerProfile.resultTextFirstAge,
      }
    : {
        line1: moveLine1,
        line2: moveLine2,
        firstAge: controllerProfile.moveTextFirstAge,
      };
  const messageLength = message.line1.length + message.line2.length;
  const hit = state.config.turn === "strike"
    ? genericHitReactionAtAge(
        state.age,
        controllerProfile.hitReactionFirstAge,
      )
    : { healthboxY2: 0, targetInvisible: false };
  const actionMenu = controllerProfile.actionMenuRevealAge === undefined
    ? { visible: false, battlerY2: 0, healthboxY2: 0 }
    : actionMenuDisplayAtAge(
        state.age,
        controllerProfile.actionMenuRevealAge,
      );
  const statusAnimation =
    controllerProfile.statusOutcome === "paralysis"
    && controllerProfile.statusShakeFirstAge !== undefined
      ? statusAnimationAtSourceAge({
          kind: "paralysis",
          sourceAge:
            state.age - controllerProfile.statusShakeFirstAge,
          targetGeometry: state.config.target.geometry,
        })
      : null;
  return {
    age: state.age,
    animationAge,
    attacker: state.config.attacker,
    target: state.config.target,
    message:
      state.age < message.firstAge
      || state.age >= controllerProfile.moveTextClearAge
      ? null
      : {
          line1: message.line1,
          line2: message.line2,
          visibleChars: Math.min(
            messageLength,
            state.age - message.firstAge + 1,
          ),
        },
    ...hit,
    displayedTargetHp: displayedHpAfterDamage(
      state.age,
      {
        startHp: controllerProfile.targetHpBefore,
        endHp: controllerProfile.targetHpAfter,
        firstDisplayedAge: controllerProfile.hpDrainFirstAge,
      },
    ),
    actionMenu,
    targetStatus:
      controllerProfile.statusOutcome === "paralysis"
      && state.age >= (controllerProfile.statusAppliedAge
        ?? Number.POSITIVE_INFINITY)
        ? "paralysis"
        : "none",
    healthboxStatus:
      controllerProfile.statusOutcome === "paralysis"
      && state.age >= (controllerProfile.healthboxStatusAge
        ?? Number.POSITIVE_INFINITY)
        ? "paralysis"
        : "none",
    statusAnimation,
    currentMove:
      state.age >= controllerProfile.currentMoveResetAge ? null : "BOUNCE",
    ...bouncePresentationAtAge(
      state.config.turn,
      animationAge,
      state.config.strikeEffectDelay ?? 0,
      state.config.strikeAttackerRestoreAge ?? Number.POSITIVE_INFINITY,
    ),
  };
}

export function advanceSceneOnMovePresentation<TConfig extends SceneOnMoveConfig>(
  state: SceneOnMovePresentationState<TConfig>,
): SceneOnMovePresentationState<TConfig> {
  return { ...state, age: state.age + 1 };
}

export function sceneOnFirePunchView(
  state: SceneOnMovePresentationState,
): SceneOnFirePunchView {
  if (state.config.move !== "FIRE_PUNCH") {
    throw new Error(`expected FIRE_PUNCH presentation, got ${state.config.move}`);
  }
  const geometry = { center: state.config.target.geometry.animationCenter };
  const burnGeometry = {
    ...geometry,
    statusBaseCenter: state.config.target.geometry.battlePositionCenter,
    horizontalDirection:
      state.config.target.geometry.side === "player" ? -1 : 1,
  } as const;
  const animationAge =
    state.age + (state.config.animationAgeOffset ?? 0);
  const resolution = firePunchResolutionState(
    state.age,
    state.config.resolutionProfile,
  );
  return {
    age: state.age,
    animationAge,
    attacker: state.config.attacker,
    target: state.config.target,
    resolution,
    particles: firePunchParticlesInDrawOrder(animationAge, geometry),
    burnFlames: [
      ...(resolution.secondaryRollSucceeded
        ? firePunchBurnFlames(
            state.age
              - (state.config.resolutionProfile.burnFlameFirstAge
                ?? FIRE_PUNCH_BURN_FLAME_FIRST_AGE)
              + FIRE_PUNCH_BURN_FLAME_FIRST_AGE,
            burnGeometry,
          )
        : []),
      ...(!state.config.resolutionProfile.faint
        ? firePunchResidualBurnFlames(state.age, geometry)
        : []),
    ],
  };
}

export function sceneOnThunderPunchView(
  state: SceneOnMovePresentationState,
): SceneOnThunderPunchView {
  if (state.config.move !== "THUNDER_PUNCH") {
    throw new Error(`expected THUNDER_PUNCH presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    palette: thunderPunchPaletteAtAge(state.age),
    lightning: thunderPunchLightningAtAge(
      state.age,
      state.config.target.geometry.animationCenter,
    ),
    targetY2: thunderPunchTargetShakeY2(state.age),
    fistVisible: thunderPunchFistVisible(state.age),
    firstHitsplatVisible: thunderPunchFirstHitsplatVisible(state.age),
    secondHitsplatVisible: thunderPunchSecondHitsplatVisible(state.age),
    targetOnMonBg: state.age >= 0 && state.age < 103,
    alpha: state.age >= 3 && state.age < 103 ? { eva: 12, evb: 8 } : null,
  };
}

export function sceneOnIcePunchView(
  state: SceneOnMovePresentationState,
): SceneOnIcePunchView {
  if (state.config.move !== "ICE_PUNCH") {
    throw new Error(`expected ICE_PUNCH presentation, got ${state.config.move}`);
  }
  // Like the move-owned crystal sprites above, the generic hit sprites are
  // copied to OAM from the preceding callback pass.
  const hitReaction = genericHitReactionAtAge(state.age - 1, 187);
  const displayProfile = state.config.controllerDisplayProfile;
  const statusOutcome = displayProfile?.statusOutcome ?? "none";
  const statusAppliedAge = displayProfile?.statusAppliedAge
    ?? Number.POSITIVE_INFINITY;
  const healthboxStatusAge = displayProfile?.healthboxStatusAge
    ?? Number.POSITIVE_INFINITY;
  const currentMoveResetAge = displayProfile?.currentMoveResetAge
    ?? Number.POSITIVE_INFINITY;
  const heldItemHeal = displayProfile?.heldItemHeal;
  const heldItemTimelineAge = heldItemHeal
    ? state.age - heldItemHeal.animationIdentityAge
    : Number.NEGATIVE_INFINITY;
  const actionMenuRevealAge = displayProfile?.actionMenuRevealAge
    ?? (
      heldItemHeal
        ? heldItemHeal.animationIdentityAge + SITRUS_ITEM_ACTION_MENU_REVEAL_AGE
        : undefined
    );
  const iceCubeTaskFirstAges = [
    displayProfile?.statusIceCubeTaskFirstAge,
    displayProfile?.nextControllerIceCubeTaskFirstAge,
  ].filter((age): age is number => age !== undefined);
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    overlay: icePunchOverlayState(state.age),
    crystals: icePunchSpiralCrystals(
      // BuildOamBuffer displays the sprite state from the preceding callback
      // pass; palette tasks above are not subject to this OBJ-only lag.
      state.age - 1,
      state.config.target.geometry.animationCenter,
    ),
    hitCrystals: icePunchHitCrystals(
      state.age - 1,
      state.config.target.geometry.animationCenter,
      state.config.target.geometry.side === "player" ? -1 : 1,
    ),
    displayedTargetHp:
      heldItemHeal && heldItemTimelineAge >= 0
        ? sitrusDisplayedHpAtAge(
            heldItemTimelineAge,
            heldItemHeal.startHp,
            heldItemHeal.endHp,
          )
        : displayedHpAfterDamage(
            state.age,
            state.config.hpDrainProfile,
          ),
    actionMenu:
      actionMenuRevealAge === undefined
        ? { visible: false, battlerY2: 0, healthboxY2: 0 }
        : actionMenuDisplayAtAge(
            state.age,
            actionMenuRevealAge,
          ),
    heldItemHeal: heldItemHeal
      ? {
          timelineAge: heldItemTimelineAge,
          item: heldItemHeal.item,
        }
      : null,
    iceCubes: iceCubeTaskFirstAges
      .map((firstAge) => ({
        state: frozenIceCubeState(state.age - firstAge),
        anchor: frozenIceCubeAnchor(
          state.config.target.geometry.animationCenter,
        ),
      }))
      .filter(({ state: cubeState }) => cubeState.blendEnabled),
    resolution: {
      status: state.age >= statusAppliedAge ? statusOutcome : "none",
      healthboxStatus:
        state.age >= healthboxStatusAge ? statusOutcome : "none",
      currentMove: state.age >= currentMoveResetAge ? null : "ICE_PUNCH",
    },
    ...hitReaction,
  };
}

export function sceneOnFaintAttackView(
  state: SceneOnMovePresentationState,
): SceneOnFaintAttackView {
  if (state.config.move !== "FAINT_ATTACK") {
    throw new Error(`expected FAINT_ATTACK presentation, got ${state.config.move}`);
  }
  const { animationProfile, attacker, target } = state.config;
  const sourceAttackerEva = faintAttackAttackerEva(
    state.age,
    animationProfile,
  );
  const scheduledRegisters = state.gpuRegisterPresentation === undefined
    ? null
    : applyAnimationDisplayIntervalWorkload(
      state.gpuRegisterPresentation.beforeInterval,
      state.gpuRegisterPresentation.workload,
    );
  const scheduledBldalpha = scheduledRegisters?.hardware[0x52];
  return {
    age: state.age,
    attacker,
    target,
    background: faintAttackBgState(state.age, animationProfile),
    attackerOffset: faintAttackAttackerOffset(
      state.age,
      attacker.geometry.side,
      animationProfile,
    ),
    attackerEva:
      scheduledBldalpha === undefined
        ? sourceAttackerEva
        : scheduledBldalpha & 0x1f,
    targetShakeX2: faintAttackTargetShakeX2(state.age, animationProfile),
    hitsplatVisible: faintAttackHitsplatVisible(state.age, animationProfile),
  };
}

export function sceneOnRockSlideView(
  state: SceneOnMovePresentationState,
): SceneOnRockSlideView {
  if (state.config.move !== "ROCK_SLIDE") {
    throw new Error(`expected ROCK_SLIDE presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationProfile } = state.config;
  const animation = rockSlideAnimationAtAge(
    state.age,
    animationProfile,
    {
      rockOrigin: {
        x: target.geometry.battlePositionCenter.x,
        y: target.geometry.battlePositionCenter.y + 14,
      },
    },
  );
  return {
    age: state.age,
    attacker,
    target,
    ...animation,
  };
}

export function sceneOnDoubleTeamView(
  state: SceneOnMovePresentationState,
): SceneOnDoubleTeamView {
  if (state.config.move !== "DOUBLE_TEAM") {
    throw new Error(`expected DOUBLE_TEAM presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationProfile } = state.config;
  return {
    age: state.age,
    attacker,
    target,
    ...doubleTeamAnimationAtAge(state.age, animationProfile),
    frontClone: animationProfile.frontClone,
  };
}

export function sceneOnEndeavorView(
  state: SceneOnMovePresentationState,
): SceneOnEndeavorView {
  if (state.config.move !== "ENDEAVOR") {
    throw new Error(`expected ENDEAVOR presentation, got ${state.config.move}`);
  }
  const { animationProfile, attacker, target } = state.config;
  const drained = Math.max(0, state.age - animationProfile.hpDrainFirstAge + 1);
  return {
    age: state.age,
    attacker,
    target,
    animationProfile,
    displayedTargetHp: Math.max(
      animationProfile.targetEndHp,
      animationProfile.targetStartHp - drained,
    ),
  };
}

export function sceneOnFeatherDanceView(
  state: SceneOnMovePresentationState,
): SceneOnFeatherDanceView {
  if (state.config.move !== "FEATHER_DANCE") {
    throw new Error(`expected FEATHER_DANCE presentation, got ${state.config.move}`);
  }
  const moveText = {
    line1: `${battlerNameWithPrefix(state.config.attacker)} used`,
    line2: "FEATHERDANCE!",
  };
  const statMessage = {
    line1: `${battlerNameWithPrefix(state.config.target)}’s ATTACK`,
    line2: FEATHER_DANCE_STAT_MESSAGE_LINE2,
  };
  const displayProfile = featherDanceStatDropDisplayProfile(
    state.config.animationAgeOffset ?? 0,
  );
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    feathers: featherDanceSpritesAtAge(
      state.age,
      state.config.target.geometry.battlePositionCenter,
      state.config.target.geometry.side,
      state.config.animationAgeOffset ?? 0,
    ),
    moveText,
    statMessage,
    controllerDisplay: statStageDropDisplayAtAge(
      state.age,
      displayProfile,
      statMessage.line1.length + statMessage.line2.length,
    ),
  };
}

export function sceneOnQuickAttackView(
  state: SceneOnMovePresentationState,
): SceneOnQuickAttackView {
  if (state.config.move !== "QUICK_ATTACK") {
    throw new Error(`expected QUICK_ATTACK presentation, got ${state.config.move}`);
  }
  const { controllerProfile } = state.config;
  const hitReaction = genericHitReactionAtAge(
    state.age,
    controllerProfile.hitReactionFirstAge,
  );
  const resultLine = controllerProfile.resultKind === "notVeryEffective"
    ? "It’s not very effective…"
    : "It’s super effective!";
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...quickAttackAnimationAtAge(
      state.age + (state.config.animationAgeOffset ?? 0),
      state.config.attacker.geometry.side,
    ),
    ...hitReaction,
    displayedTargetHp: displayedHpAfterDamage(state.age, {
      startHp: controllerProfile.targetHpBefore,
      endHp: controllerProfile.targetHpAfter,
      firstDisplayedAge: controllerProfile.hpDrainFirstAge,
    }),
    resultText:
      state.age >= controllerProfile.resultTextFirstAge
        ? {
            line: resultLine,
            visibleChars: Math.min(
              resultLine.length,
              state.age - controllerProfile.resultTextFirstAge + 1,
            ),
          }
        : null,
    currentMove:
      state.age >= controllerProfile.currentMoveResetAge
        ? null
        : "QUICK_ATTACK",
    moveText: {
      line1: `${battlerNameWithPrefix(state.config.attacker)} used`,
      line2: "QUICK ATTACK!",
    },
  };
}

export function sceneOnExtremeSpeedView(
  state: SceneOnMovePresentationState,
): SceneOnExtremeSpeedView {
  if (state.config.move !== "EXTREME_SPEED") {
    throw new Error(`expected EXTREME_SPEED presentation, got ${state.config.move}`);
  }
  const animationAge = state.age + (state.config.animationAgeOffset ?? 0);
  return {
    age: state.age,
    animationAge,
    attacker: state.config.attacker,
    target: state.config.target,
    background: extremeSpeedBackgroundAtAge(
      animationAge,
      state.config.attacker.geometry.side,
    ),
    attackerAffine: extremeSpeedAttackerAffineAtAge(
      animationAge,
      state.config.attacker.geometry.side === "player" ? 6 : 2,
    ),
    attackerVisible: extremeSpeedAttackerVisibleAtAge(animationAge),
    dust: extremeSpeedDustAtAge(animationAge),
    hitsplats: extremeSpeedHitsplatsAtAge(
      animationAge,
      state.config.target.geometry.side,
    ),
    impact: extremeSpeedImpactAtAge(
      animationAge,
      state.config.target.geometry.side,
    ),
  };
}

/**
 * Target `x2` before `AnimTask_ShakeMon`'s own creation tick takes over
 * (same precedent as `dragonRageTargetOffset`: the absolute set at
 * `SHADOW_PUNCH_TARGET_SHAKE_FIRST_AGE` unconditionally overwrites whatever
 * the target held, `battle_anim_mon_movement.c:98-99` - before that, an
 * opponent-side target's front sprite still carries its own send-out
 * species idle-anim residual, `speciesIdleAnim.ts` - the player-side back
 * sprite uses a separate, unported animation family, so this only applies
 * to the opponent-side orientation, matching DRAGON_RAGE's own gating).
 * Once the shake task takes over, the same `+1`-shifted indexing
 * DRAGON_RAGE's own module doc root-caused for this task class applies here
 * too ("a same-frame double-step collapses each `AnimTask_ShakeMon` call's
 * own port tick 0 into its creation tick") - RAM-confirmed directly
 * (`dump-shadowpunch-rgb.py`, both orientations, ages 49-60): the observed
 * target x2 (0,0,3,3,0,0,3,3,0,0,0...) only matches
 * `shakeMonOffsetAtTick(..., animationAge - FIRST_AGE + 1)`, not the naive
 * `animationAge - FIRST_AGE` a fresh port would guess. Deliberately NOT
 * `shakeMonOffsetAtRenderTick` (DRAGON_RAGE's own wrapper adding that
 * shift): its extra `renderTick === creationTick - 1` transient special
 * case is REFUTED by this same RAM evidence for this call site - fixture B
 * (target player-side, no idle offset to mask it) reads a clean `0` at
 * `animationAge === FIRST_AGE - 1`, not the transient `xOffset`.
 * DRAGON_RAGE's own doc already flags its target-shake case as "not
 * independently dense-verified" for exactly this special case, so this is a
 * real per-call-site difference, not a contradiction.
 */
function shadowPunchTargetShakeX2(
  animationAge: number,
  target: SceneOnPresentationBattler,
): number {
  if (animationAge < SHADOW_PUNCH_TARGET_SHAKE_FIRST_AGE) {
    if (target.geometry.side === "opponent") {
      const idle = speciesFrontIdleRestOffset(target.species);
      if (idle) return idle.x2;
    }
    return 0;
  }
  return shakeMonOffsetAtTick(
    SHADOW_PUNCH_TARGET_SHAKE.xOffset,
    SHADOW_PUNCH_TARGET_SHAKE.yOffset,
    SHADOW_PUNCH_TARGET_SHAKE.numTimes,
    SHADOW_PUNCH_TARGET_SHAKE.frameDelay,
    animationAge - SHADOW_PUNCH_TARGET_SHAKE_FIRST_AGE + 1,
  ).x2;
}

export function sceneOnShadowPunchView(
  state: SceneOnMovePresentationState,
): SceneOnShadowPunchView {
  if (state.config.move !== "SHADOW_PUNCH") {
    throw new Error(`expected SHADOW_PUNCH presentation, got ${state.config.move}`);
  }
  const animationAge = state.age + (state.config.animationAgeOffset ?? 0);
  const { attackerSpriteId, attackerMoveSpeed, attackerSubpriority } = state.config;
  return {
    age: state.age,
    animationAge,
    attacker: state.config.attacker,
    target: state.config.target,
    backgroundGhost: shadowPunchBackgroundIsGhost(animationAge),
    backgroundBldy: shadowPunchBackgroundBldy(
      animationAge,
      state.config.attacker.geometry.side,
    ),
    attackerVisible: shadowPunchAttackerVisible(animationAge),
    attackerX2: shadowPunchAttackerX2(
      animationAge - SHADOW_PUNCH_PUNCH_TASK_FIRST_AGE,
      attackerSpriteId,
      attackerMoveSpeed,
    ),
    clones: shadowPunchClonePaintOrder(
      animationAge - SHADOW_PUNCH_PUNCH_TASK_FIRST_AGE,
      attackerSpriteId,
      attackerMoveSpeed,
    ),
    clonePriority: shadowPunchClonePriority(attackerSubpriority),
    fistVisible:
      animationAge >= SHADOW_PUNCH_FIST_FIRST_AGE && animationAge <= SHADOW_PUNCH_FIST_LAST_AGE,
    hitsplatVisible:
      animationAge >= SHADOW_PUNCH_HITSPLAT_FIRST_AGE
      && animationAge <= SHADOW_PUNCH_HITSPLAT_LAST_AGE,
    targetShakeX2: shadowPunchTargetShakeX2(animationAge, state.config.target),
  };
}

export function sceneOnAerialAceView(
  state: SceneOnMovePresentationState,
): SceneOnAerialAceView {
  if (state.config.move !== "AERIAL_ACE") {
    throw new Error(`expected AERIAL_ACE presentation, got ${state.config.move}`);
  }
  const { controllerProfile } = state.config;
  const animationAge =
    state.age + (state.config.animationAgeOffset ?? 0);
  const hitReaction = genericHitReactionAtAge(
    state.age,
    controllerProfile.hitReactionFirstAge,
  );
  const resultLine = "It’s not very effective…" as const;
  return {
    age: state.age,
    animationAge,
    attacker: state.config.attacker,
    target: state.config.target,
    ...aerialAceAnimationAtAge(
      animationAge,
      state.config.attacker.geometry.side,
    ),
    ...hitReaction,
    displayedTargetHp: displayedHpAfterDamage(state.age, {
      startHp: controllerProfile.targetHpBefore,
      endHp: controllerProfile.targetHpAfter,
      firstDisplayedAge: controllerProfile.hpDrainFirstAge,
    }),
    resultText:
      state.age >= controllerProfile.resultTextFirstAge
        ? {
            line: resultLine,
            visibleChars: Math.min(
              resultLine.length,
              state.age - controllerProfile.resultTextFirstAge + 1,
            ),
          }
        : null,
    moveTextVisible: state.age < controllerProfile.moveTextClearAge,
    currentMove:
      state.age >= controllerProfile.currentMoveResetAge
        ? null
        : "AERIAL_ACE",
    moveText: {
      line1: `${battlerNameWithPrefix(state.config.attacker)} used`,
      line2: "AERIAL ACE!",
    },
  };
}

export function sceneOnSandAttackView(
  state: SceneOnMovePresentationState,
): SceneOnSandAttackView {
  if (state.config.move !== "SAND_ATTACK") {
    throw new Error(`expected SAND_ATTACK presentation, got ${state.config.move}`);
  }
  const animationAge =
    state.age + (state.config.animationAgeOffset ?? 0);
  const resultLine1 = `${battlerNameWithPrefix(state.config.target)}’s accuracy`;
  const resultLine2 = "fell!" as const;
  return {
    age: state.age,
    animationAge,
    attacker: state.config.attacker,
    target: state.config.target,
    ...sandAttackAnimationAtAge(
      animationAge,
      state.config.attacker.geometry.animationCenter,
      state.config.attacker.geometry.side,
      state.config.animationProfile,
    ),
    accuracyBanner: sandAttackAccuracyBannerAtAge(animationAge),
    resultText:
      state.age >= state.config.controllerProfile.resultTextFirstAge
        ? {
            line1: resultLine1,
            line2: resultLine2,
            visibleChars: Math.min(
              resultLine1.length + resultLine2.length,
              state.age - state.config.controllerProfile.resultTextFirstAge + 1,
            ),
          }
        : null,
    currentMove:
      state.age >= state.config.controllerProfile.currentMoveResetAge
        ? null
        : "SAND_ATTACK",
    moveText: {
      line1: `${battlerNameWithPrefix(state.config.attacker)} used`,
      line2: "SAND-ATTACK!",
    },
  };
}

export function sceneOnMudSlapView(
  state: SceneOnMovePresentationState,
): SceneOnMudSlapView {
  if (state.config.move !== "MUD_SLAP") {
    throw new Error(`expected MUD_SLAP presentation, got ${state.config.move}`);
  }
  const animationAge =
    state.age + (state.config.animationAgeOffset ?? 0);
  return {
    age: state.age,
    animationAge,
    attacker: state.config.attacker,
    target: state.config.target,
    ...mudSlapAnimationAtAge(
      animationAge,
      state.config.attacker.geometry.animationCenter,
      state.config.attacker.geometry.side,
      state.config.animationProfile,
    ),
    currentMove: "MUD_SLAP",
    moveText: {
      line1: `${battlerNameWithPrefix(state.config.attacker)} used`,
      line2: "MUD-SLAP!",
    },
  };
}

export const PIDGEOTTO_TO_ONIX_FEATHER_DANCE_PRESENTATION = {
  attacker: {
    species: "PIDGEOTTO",
    geometry: {
      side: "opponent",
      spriteCorner: { x: 144, y: 19 },
      animationCenter: { x: 176, y: 51 },
      battlePositionCenter: { x: 176, y: 40 },
    },
  },
  target: {
    species: "ONIX",
    geometry: {
      side: "player",
      spriteCorner: { x: 40, y: 48 },
      animationCenter: { x: 72, y: 88 },
      battlePositionCenter: { x: 72, y: 80 },
    },
  },
} as const satisfies Pick<SceneOnFeatherDanceConfig, "attacker" | "target">;

export const PIDGEOTTO_TO_ONIX_QUICK_ATTACK_PRESENTATION = {
  ...PIDGEOTTO_TO_ONIX_FEATHER_DANCE_PRESENTATION,
} as const satisfies Pick<SceneOnQuickAttackConfig, "attacker" | "target">;

/**
 * Source-derived singles geometry for the required opposite-side variant:
 * Pidgeotto's back sprite uses gMonBackPicCoords.y_offset=12, Onix's front
 * sprite uses gMonFrontPicCoords.y_offset=2, and sBattlerCoords supplies the
 * fixed player/opponent animation anchors. The settled Onix front animation
 * retains OAM x2=1 (dense RAM frames 0-445), hence spriteCorner.x=145.
 */
export const PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_FEATHER_DANCE_PRESENTATION = {
  attacker: {
    species: "PIDGEOTTO",
    geometry: {
      side: "player",
      spriteCorner: { x: 40, y: 60 },
      animationCenter: { x: 72, y: 100 },
      battlePositionCenter: { x: 72, y: 80 },
    },
  },
  target: {
    species: "ONIX",
    geometry: {
      side: "opponent",
      spriteCorner: { x: 145, y: 10 },
      animationCenter: { x: 176, y: 42 },
      battlePositionCenter: { x: 176, y: 40 },
    },
  },
  animationAgeOffset: 4,
} as const satisfies Pick<
  SceneOnFeatherDanceConfig,
  "attacker" | "target" | "animationAgeOffset"
>;

export const PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_QUICK_ATTACK_PRESENTATION = {
  attacker:
    PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_FEATHER_DANCE_PRESENTATION.attacker,
  target:
    PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_FEATHER_DANCE_PRESENTATION.target,
  animationAgeOffset: 4,
} as const satisfies Pick<
  SceneOnQuickAttackConfig,
  "attacker" | "target" | "animationAgeOffset"
>;

export const PIDGEOTTO_TO_ONIX_AERIAL_ACE_PRESENTATION = {
  ...PIDGEOTTO_TO_ONIX_FEATHER_DANCE_PRESENTATION,
} as const satisfies Pick<SceneOnAerialAceConfig, "attacker" | "target">;

export const PIDGEOTTO_TO_ONIX_SAND_ATTACK_PRESENTATION = {
  ...PIDGEOTTO_TO_ONIX_FEATHER_DANCE_PRESENTATION,
} as const satisfies Pick<SceneOnSandAttackConfig, "attacker" | "target">;

export const PIDGEOTTO_TO_ONIX_MUD_SLAP_PRESENTATION = {
  ...PIDGEOTTO_TO_ONIX_FEATHER_DANCE_PRESENTATION,
} as const satisfies Pick<SceneOnMudSlapConfig, "attacker" | "target">;

export const PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_AERIAL_ACE_PRESENTATION = {
  attacker:
    PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_FEATHER_DANCE_PRESENTATION.attacker,
  target:
    PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_FEATHER_DANCE_PRESENTATION.target,
  animationAgeOffset: 4,
} as const satisfies Pick<
  SceneOnAerialAceConfig,
  "attacker" | "target" | "animationAgeOffset"
>;

export const PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_SAND_ATTACK_PRESENTATION = {
  attacker:
    PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_FEATHER_DANCE_PRESENTATION.attacker,
  target:
    PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_FEATHER_DANCE_PRESENTATION.target,
  animationAgeOffset: 4,
} as const satisfies Pick<
  SceneOnSandAttackConfig,
  "attacker" | "target" | "animationAgeOffset"
>;

export const PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_MUD_SLAP_PRESENTATION = {
  attacker:
    PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_FEATHER_DANCE_PRESENTATION.attacker,
  target:
    PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_FEATHER_DANCE_PRESENTATION.target,
  animationAgeOffset: 4,
} as const satisfies Pick<
  SceneOnMudSlapConfig,
  "attacker" | "target" | "animationAgeOffset"
>;

export const ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY = {
  attacker: {
    species: "ONIX",
    geometry: {
      side: "player",
      spriteCorner: { x: 40, y: 48 },
      animationCenter: { x: 72, y: 88 },
      battlePositionCenter: { x: 72, y: 80 },
    },
  },
  target: {
    species: "GROVYLE",
    geometry: {
      side: "opponent",
      spriteCorner: { x: 144, y: 12 },
      // GetBattlerSpriteFinal_Y: singles opponent base 40 + Grovyle's
      // source-extracted front y_offset 4 (elevation 0).
      animationCenter: { x: 176, y: 44 },
      battlePositionCenter: { x: 176, y: 40 },
    },
  },
} as const satisfies Pick<SceneOnFirePunchConfig, "attacker" | "target">;

export const ONIX_TO_GROVYLE_FIRE_PUNCH_PROFILE: FirePunchResolutionProfile = {
  startHp: 143,
  endHp: 112,
  initialStatus: "none",
  hpCommitAge: 200,
  secondaryRollAge: 205,
  secondaryRollSucceeded: false,
  currentMoveResetAge: Number.POSITIVE_INFINITY,
  effectivenessMessage: {
    kind: "superEffective",
    textStartAge: 204,
  },
};

export const MURKROW_TO_ONIX_FLY_PRESENTATION = {
  attacker: {
    species: "MURKROW",
    geometry: {
      side: "opponent",
      spriteCorner: { x: 144, y: 19 },
      animationCenter: { x: 176, y: 51 },
      battlePositionCenter: { x: 176, y: 40 },
    },
  },
  target: {
    species: "ONIX",
    geometry: {
      side: "player",
      spriteCorner: { x: 40, y: 48 },
      animationCenter: { x: 72, y: 88 },
      battlePositionCenter: { x: 72, y: 80 },
    },
  },
} as const satisfies Pick<SceneOnFlyConfig, "attacker" | "target">;

export const SPOINK_TO_ONIX_BOUNCE_PRESENTATION = {
  attacker: {
    species: "SPOINK",
    geometry: {
      side: "opponent",
      spriteCorner: { x: 144, y: 17 },
      animationCenter: { x: 176, y: 49 },
      battlePositionCenter: { x: 176, y: 40 },
    },
  },
  target: {
    species: "ONIX",
    geometry: {
      side: "player",
      spriteCorner: { x: 40, y: 48 },
      animationCenter: { x: 72, y: 88 },
      battlePositionCenter: { x: 72, y: 80 },
    },
  },
} as const satisfies Pick<SceneOnBounceConfig, "attacker" | "target">;

export const PLAYER_SPOINK_TO_OPPONENT_ONIX_BOUNCE_PRESENTATION = {
  attacker: {
    species: "SPOINK",
    geometry: {
      side: "player",
      spriteCorner: { x: 40, y: 59 },
      animationCenter: { x: 72, y: 99 },
      battlePositionCenter: { x: 72, y: 80 },
    },
  },
  target: {
    species: "ONIX",
    geometry: {
      side: "opponent",
      spriteCorner: { x: 145, y: 10 },
      animationCenter: { x: 176, y: 42 },
      battlePositionCenter: { x: 176, y: 40 },
    },
  },
} as const satisfies Pick<SceneOnBounceConfig, "attacker" | "target">;

export const PLAYER_MURKROW_TO_OPPONENT_ONIX_FLY_PRESENTATION = {
  attacker: {
    species: "MURKROW",
    geometry: {
      side: "player",
      spriteCorner: { x: 40, y: 57 },
      animationCenter: { x: 72, y: 97 },
      battlePositionCenter: { x: 72, y: 80 },
    },
  },
  target: {
    species: "ONIX",
    geometry: {
      side: "opponent",
      spriteCorner: { x: 145, y: 10 },
      animationCenter: { x: 176, y: 42 },
      battlePositionCenter: { x: 176, y: 40 },
    },
  },
} as const satisfies Pick<SceneOnFlyConfig, "attacker" | "target">;

export const ONIX_TO_GROVYLE_FAINT_ATTACK_PROFILE = {
  animationProfile: FAINT_ATTACK_ANIMATION_PROFILE,
  fieldProfile: Object.freeze({
    playerHp: 117,
    opponentHp: 143,
    playerStatus: "none",
  }),
  // The stock move printer has completed before the animation-script epoch.
  moveTextStartAge: -24,
} as const satisfies Pick<
  SceneOnFaintAttackConfig,
  "animationProfile" | "fieldProfile" | "moveTextStartAge"
>;

export const GROVYLE_TO_ONIX_FIRE_PUNCH_GEOMETRY = {
  attacker: {
    species: "GROVYLE",
    geometry: {
      side: "opponent",
      spriteCorner: { x: 144, y: 12 },
      animationCenter: { x: 176, y: 44 },
      battlePositionCenter: { x: 176, y: 40 },
    },
  },
  target: {
    species: "ONIX",
    geometry: {
      side: "player",
      spriteCorner: { x: 40, y: 48 },
      // Player singles base y=80; GetBattlerSpriteCoord Y_PIC_OFFSET adds 8.
      animationCenter: { x: 72, y: 88 },
      battlePositionCenter: { x: 72, y: 80 },
    },
  },
} as const satisfies Pick<SceneOnFirePunchConfig, "attacker" | "target">;

/**
 * Immutable stock-controller result from the committed opposite-side stage.
 * Presentation ages are relative to oracle frame 2081, never battle ticks.
 */
export const GROVYLE_TO_ONIX_FIRE_PUNCH_PROFILE: FirePunchResolutionProfile = {
  startHp: 117,
  endHp: 96,
  initialStatus: "none",
  hpDrainFirstAge: 27,
  hpCommitAge: 49,
  hitWobbleFirstAge: 0,
  hitWobbleTicks: 12,
  hitBlinkFirstAge: 1,
  hitBlinkTicks: 20,
  secondaryRollAge: 142,
  secondaryRollSucceeded: true,
  burnFlameFirstAge: 148,
  burnMessageTextStartAge: 184,
  healthboxStatusAge: 266,
  currentMoveResetAge: 277,
  effectivenessMessage: {
    kind: "notVeryEffective",
    textStartAge: 53,
  },
};

export const GROVYLE_TO_ONIX_FIRE_PUNCH_PRESENTATION = {
  // The opponent controller printed the used-move line before this seam and
  // hands over after Move_FIRE_PUNCH's particle task has completed.
  animationAgeOffset: 123,
  moveTextStartAge: -26,
} as const satisfies Pick<
  SceneOnFirePunchConfig,
  "animationAgeOffset" | "moveTextStartAge"
>;

const GROVYLE_TO_ONIX_ROCK_SLIDE_ORDER_SEED = [
  62, 60, 0, 63, 1, 61, 6, 8, 2, 4, 3, 21, 20, 5, 19, 18, 17, 16,
  15, 14, 13, 12, 11, 10, 9, 7, 54, 55, 56, 57, 58, 59, 23, 22, 48,
  49, 50, 51, 52, 53, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
  35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
] as const;

/**
 * Source-relative profile from the staged stock controller. Age zero is
 * oracle frame 1967; first-rock RAM creation is age 7 and the generic hit
 * controller begins at age 141. The seed is the live pre-allocation
 * `sSpriteOrder` at frame 1965, not a frame-dependent rendering table.
 */
export const GROVYLE_TO_ONIX_ROCK_SLIDE_PROFILE:
  Readonly<RockSlideAnimationProfile> = Object.freeze({
    rockAnchorAge: 7,
    targetShakeStartAge: 22,
    targetShakeEndAge: 115,
    hitFlashAnchorAge: 141,
    spriteOrderSeed: GROVYLE_TO_ONIX_ROCK_SLIDE_ORDER_SEED,
    occupiedSpriteSlots: [0, 1, 2, 6, 8, 60, 61, 62, 63],
  });

export const GROVYLE_TO_ONIX_ROCK_SLIDE_PRESENTATION = {
  animationProfile: GROVYLE_TO_ONIX_ROCK_SLIDE_PROFILE,
  fieldProfile: Object.freeze({
    playerHp: 117,
    opponentHp: 143,
    playerStatus: "none",
  }),
  moveTextStartAge: -30,
} as const satisfies Pick<
  SceneOnRockSlideConfig,
  "animationProfile" | "fieldProfile" | "moveTextStartAge"
>;

/**
 * Stock-controller profile for player-back ONIX's staged DOUBLE TEAM.
 * Age zero is oracle frame 2337, the first clone-task RAM frame. The live
 * `sSpriteOrder` places clone A (slot 3) in front of clone B (slot 4).
 */
export const ONIX_TO_GROVYLE_DOUBLE_TEAM_PROFILE:
  Readonly<DoubleTeamAnimationProfile> = Object.freeze({
    cloneAnchorAge: 0,
    cloneVisibleStartAge: 2,
    cloneVisibleEndAge: 129,
    statsBannerStartAge: 163,
    statsBannerEndAge: 229,
    statsBannerBg1YAnchorAge: 166,
    frontClone: "a",
  });

export const ONIX_TO_GROVYLE_DOUBLE_TEAM_PRESENTATION = {
  animationProfile: ONIX_TO_GROVYLE_DOUBLE_TEAM_PROFILE,
  fieldProfile: Object.freeze({
    playerHp: 117,
    opponentHp: 143,
    playerStatus: "none",
  }),
  moveTextStartAge: -28,
} as const satisfies Pick<
  SceneOnDoubleTeamConfig,
  "animationProfile" | "fieldProfile" | "moveTextStartAge"
>;

/**
 * Opposite-side stock-controller stage. Age zero is oracle frame 2347, the
 * first visible palette-blend frame of player-back ONIX's move body.
 */
export const ONIX_TO_GROVYLE_ENDEAVOR_PROFILE:
  Readonly<EndeavorAnimationProfile> = Object.freeze({
    attackerYOffset: 0,
    staleMovePower: 0,
    hpDrainFirstAge: 99,
    targetStartHp: 143,
    targetEndHp: 117,
  });

export const ONIX_TO_GROVYLE_ENDEAVOR_PRESENTATION = {
  animationProfile: ONIX_TO_GROVYLE_ENDEAVOR_PROFILE,
  fieldProfile: Object.freeze({
    playerHp: 117,
    opponentHp: 143,
    playerStatus: "none",
  }),
  moveTextStartAge: -37,
} as const satisfies Pick<
  SceneOnEndeavorConfig,
  "animationProfile" | "fieldProfile" | "moveTextStartAge"
>;
