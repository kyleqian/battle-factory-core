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
} from "./battleMenu.ts";
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
  bindAnimationAtAge,
  type BindAnimationProfile,
  type BindAnimationState,
} from "./bind.ts";
import {
  extremeSpeedAttackerAffineAtAge,
  extremeSpeedAttackerVisibleAtAge,
  extremeSpeedBackgroundAtAge,
  extremeSpeedDustAtAge,
  extremeSpeedImpactAtAge,
  type ExtremeSpeedBackgroundState,
} from "./extremeSpeed.ts";

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
    | "ONIX"
    | "GROVYLE"
    | "PIDGEOTTO"
    | "MURKROW"
    | "SPOINK"
    | "ARCANINE"
    | "DUGTRIO";
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

export type SceneOnMoveConfig =
  | SceneOnFirePunchConfig
  | SceneOnIcePunchConfig
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
  | SceneOnBindConfig;

export interface SceneOnMovePresentationState<
  TConfig extends SceneOnMoveConfig = SceneOnMoveConfig,
> {
  readonly age: number;
  readonly config: TConfig;
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
  readonly impact: ReturnType<typeof extremeSpeedImpactAtAge>;
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

export interface SceneOnBindView extends BindAnimationState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
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
export function createSceneOnMovePresentation<TConfig extends SceneOnMoveConfig>(
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
    attackerEva: faintAttackAttackerEva(state.age, animationProfile),
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
    impact: extremeSpeedImpactAtAge(
      animationAge,
      state.config.target.geometry.side,
    ),
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
