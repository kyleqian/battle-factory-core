import { struggleDisplayPlan, type StruggleDisplayPlan, type StruggleLiveInputs } from "./struggle.ts";
import {
  ancientPowerAtAge,
  type AncientPowerState,
} from "./ancientPower.ts";
import {
  leechSeedAtAge,
  type LeechSeedBody,
  type LeechSeedState,
} from "./leechSeed.ts";
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
import { icyWindAtAge, type IcyWindState } from "./icyWind.ts";
import {
  blizzardAtAge,
  type BlizzardGeometry,
  type BlizzardState,
} from "./blizzard.ts";
import { swordsDanceAtAge, type SwordsDanceState } from "./swordsDance.ts";
import {
  biteEffectAtAge,
  type BiteEffect,
} from "./bite.ts";
import {
  substituteAtAge,
  type SubstituteState,
} from "./substitute.ts";
import { hazeAtAge, type HazeState } from "./haze.ts";
import {
  SPITE_TASK_SOURCE_AGE_OFFSET,
  spiteDisplayedAlpha,
  spiteAtAge,
  type SpiteState,
} from "./spite.ts";
import {
  mementoAtAge,
  type MementoConfig,
  type MementoState,
} from "./memento.ts";
import {
  flailAtAge,
  type FlailPower,
  type FlailState,
  type FlailVisualRandom,
} from "./flail.ts";
import {
  rockTombAtAge,
  type RockTombConfig,
  type RockTombState,
} from "./rockTomb.ts";
import { nightShadeAtAge, type NightShadeState } from "./nightShade.ts";
import {
  headbuttAtAge,
  type HeadbuttState,
} from "./headbutt.ts";
import {
  submissionAtAge,
  type SubmissionState,
} from "./submission.ts";
import {
  drillPeckAtAge,
  type DrillPeckState,
} from "./drillPeck.ts";
import {
  bodySlamAtAge,
  type BodySlamState,
} from "./bodySlam.ts";
import {
  slamAtAge,
  type SlamState,
} from "./slam.ts";
import {
  strengthAtAge,
  type StrengthState,
} from "./strength.ts";
import {
  twineedleEffectAtAge,
  type TwineedleEffect,
} from "./twineedle.ts";
import {
  poisonStingEffectAtAge,
  type PoisonStingEffect,
} from "./poisonSting.ts";
import {
  spikeCannonEffectAtAge,
  type SpikeCannonEffect,
} from "./spikeCannon.ts";
import {
  pinMissileEffectAtAge,
  type PinMissileEffect,
} from "./pinMissile.ts";
import {
  sonicBoomEffectAtAge,
  type SonicBoomEffect,
} from "./sonicBoom.ts";
import {
  razorWindAtAge,
  type RazorWindAnimationProfile,
  type RazorWindBody,
  type RazorWindEffect,
} from "./razorWind.ts";
import {
  hornDrillAtAge,
  type HornDrillGeometry,
  type HornDrillProfile,
  type HornDrillState,
} from "./hornDrill.ts";
import { megaHornAtAge, type MegaHornLiveInputs, type MegaHornState } from "./megaHorn.ts";
import { superpowerAtAge, type SuperpowerLiveInputs, type SuperpowerState } from "./superpower.ts";
import { revengeAtAge, type RevengeLiveInputs, type RevengeState } from "./revenge.ts";
import { spitUpAtAge, type SpitUpLiveInputs, type SpitUpState } from "./spitUp.ts";
import { furyCutterAtAge, type FuryCutterLiveInputs, type FuryCutterState } from "./furyCutter.ts";
import { iceBallAtAge, type IceBallLiveInputs, type IceBallState } from "./iceBall.ts";
import { curseAtAge, type CurseLiveInputs, type CurseState } from "./curse.ts";
import {
  auroraBeamAtAge,
  type AuroraBeamGeometry,
  type AuroraBeamProfile,
  type AuroraBeamState,
} from "./auroraBeam.ts";
import {
  triAttackAtAge,
  type TriAttackGeometry,
  type TriAttackProfile,
  type TriAttackState,
} from "./triAttack.ts";
import {
  hyperBeamAtAge,
  type HyperBeamGeometry,
  type HyperBeamProfile,
  type HyperBeamState,
} from "./hyperBeam.ts";
import {
  thunderboltAtAge,
  type ThunderboltGeometry,
  type ThunderboltProfile,
  type ThunderboltState,
} from "./thunderbolt.ts";
import {
  zapCannonAtAge,
  type ZapCannonGeometry,
  type ZapCannonProfile,
  type ZapCannonState,
} from "./zapCannon.ts";
import {
  smokescreenEffectAtAge,
  type SmokescreenEffect,
} from "./smokescreen.ts";
import {
  octazookaAtAge,
  type OctazookaProfile,
  type OctazookaState,
} from "./octazooka.ts";
import {
  spikesAtAge,
  type SpikesProfile,
  type SpikesState,
} from "./spikes.ts";
import {
  mudShotAtAge,
  type MudShotState,
} from "./mudShot.ts";
import {
  hydroPumpAtAge,
  type HydroPumpState,
} from "./hydroPump.ts";
import {
  whirlpoolAtAge,
  type WhirlpoolBody,
  type WhirlpoolState,
} from "./whirlpool.ts";
import {
  bubbleBeamAtAge,
  type BubbleBeamState,
} from "./bubbleBeam.ts";
import {
  crossChopAtAge,
  type CrossChopState,
} from "./crossChop.ts";
import {
  leafBladeAtAge,
  type LeafBladeState,
  type LeafBladeTargetGeometry,
} from "./leafBlade.ts";
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
  swallowAtAge,
  type SwallowState,
  type SwallowStockpileCount,
} from "./swallow.ts";
import {
  stockpileAtAge,
  type StockpileAnimationProfile,
  type StockpileState,
} from "./stockpile.ts";
import {
  diveAtAge,
  type DiveBody,
  type DiveGeometry,
  type DiveProfile,
  type DiveState,
} from "./dive.ts";
import {
  metallicShineAtAge,
  type MetallicShineState,
} from "./metallicShine.ts";
import {
  ironDefenseAtAge,
  type IronDefenseState,
} from "./ironDefense.ts";
import {
  flashAtAge,
  type FlashState,
} from "./flash.ts";
import {
  facadeAtAge,
  type FacadeState,
} from "./facade.ts";
import {
  minimizeAtAge,
  type MinimizeState,
} from "./minimize.ts";
import {
  acidArmorAtAge,
  type AcidArmorState,
} from "./acidArmor.ts";
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
  rockThrowAnimationAtAge,
  type RockThrowAnimationProfile,
} from "./rockThrow.ts";
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
  meteorMashAtAge,
  type MeteorMashState,
} from "./meteorMash.ts";
import { flameWheelAtAge, type FlameWheelState } from "./flameWheel.ts";
import {
  bindAnimationAtAge,
  type BindAnimationProfile,
  type BindAnimationState,
} from "./bind.ts";
import {
  wrapAnimationAtAge,
  type WrapAnimationProfile,
  type WrapAnimationState,
} from "./wrap.ts";
import {
  growthAnimationAtAge,
  type GrowthAnimationState,
} from "./growth.ts";
import {
  recoverEffectAtAge,
  type RecoverEffectSprite,
} from "./recover.ts";
import {
  softBoiledAtAge,
  type SoftBoiledState,
} from "./softBoiled.ts";
import {
  moonlightAtAge,
  type MoonlightState,
} from "./moonlight.ts";
import {
  presentAtAge,
  type PresentBranch,
  type PresentState,
} from "./present.ts";
import {
  roarAtAge,
  type RoarState,
} from "./roar.ts";
import {
  absorbAtAge,
  type AbsorbState,
} from "./absorb.ts";
import {
  megaDrainAtAge,
  type MegaDrainAllocatorProfile,
  type MegaDrainState,
} from "./megaDrain.ts";
import {
  gigaDrainAtAge,
  type GigaDrainAllocatorProfile,
  type GigaDrainState,
} from "./gigaDrain.ts";
import {
  dreamEaterAtAge,
  type DreamEaterAllocatorProfile,
  type DreamEaterState,
} from "./dreamEater.ts";
import {
  painSplitAtAge,
  type PainSplitState,
} from "./painSplit.ts";
import {
  reflectAtAge,
  type ReflectState,
} from "./reflect.ts";
import {
  barrierAtAge,
  magicCoatAtAge,
  type BarrierState,
} from "./barrier.ts";
import { protectAtAge, type ProtectState } from "./protect.ts";
import { disableAtAge, type DisableState } from "./disable.ts";
import {
  brickBreakAtAge,
  type BrickBreakBody,
  type BrickBreakState,
} from "./brickBreak.ts";
import {
  lightScreenAtAge,
  mirrorCoatAtAge,
  type LightScreenState,
} from "./lightScreen.ts";
import {
  synthesisEffectAtAge,
  type SynthesisSprite,
} from "./synthesis.ts";
import {
  cosmicPowerAtAge,
  type CosmicPowerState,
} from "./cosmicPower.ts";
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
  refreshAtAge,
  type RefreshState,
} from "./refresh.ts";
import { healBellAtAge, type HealBellState } from "./healBell.ts";
import {
  fireBlastAtAge,
  type FireBlastGeometry,
  type FireBlastState,
} from "./fireBlast.ts";
import {
  rolloutAtAge,
  type RolloutCounter,
  type RolloutGeometry,
  type RolloutState,
} from "./rollout.ts";
import {
  rainDanceAtAge,
  type RainDanceProfile,
  type RainDanceState,
} from "./rainDance.ts";
import {
  hailAtAge,
  type HailProfile,
  type HailState,
} from "./hail.ts";
import {
  supersonicEffectAtAge,
  type SupersonicRingSprite,
} from "./supersonic.ts";
import {
  metalSoundEffectAtAge,
  type MetalSoundWaveSprite,
} from "./metalSound.ts";
import {
  screechEffectAtAge,
  type ScreechRingSprite,
} from "./screech.ts";
import {
  safeguardAtAge,
  type SafeguardAnimationProfile,
  type SafeguardState,
} from "./safeguard.ts";
import {
  grudgeAtAge,
  type GrudgeAnimationProfile,
  type GrudgeState,
} from "./grudge.ts";
import {
  hiddenPowerAtAge,
  type HiddenPowerProfile,
  type HiddenPowerState,
} from "./hiddenPower.ts";
import {
  smellingSaltAtAge,
  type SmellingSaltState,
} from "./smellingSalt.ts";
import {
  recycleAtAge,
  type RecycleState,
  type RecycleProfile,
} from "./recycle.ts";
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
  superFangAtAge,
  type SuperFangState,
} from "./superFang.ts";
import {
  megaPunchAtAge,
  type MegaPunchState,
} from "./megaPunch.ts";
import {
  megaKickAtAge,
  type MegaKickState,
} from "./megaKick.ts";
import {
  focusPunchAtAge,
  type FocusPunchState,
} from "./focusPunch.ts";
import {
  machPunchAtAge,
  type MachPunchLiveInputs,
  type MachPunchState,
} from "./machPunch.ts";
import {
  psychUpAtAge,
  type PsychUpLiveInputs,
  type PsychUpState,
} from "./psychUp.ts";
import {
  hyperVoiceAtAge,
  type HyperVoiceLiveInputs,
  type HyperVoiceState,
} from "./hyperVoice.ts";
import {
  snoreAtAge,
  type SnoreLiveInputs,
  type SnoreState,
} from "./snore.ts";
import {
  shockWaveAtAge,
  type ShockWaveLiveInputs,
  type ShockWaveState,
} from "./shockWave.ts";
import {
  overheatAtAge,
  type OverheatLiveInputs,
  type OverheatState,
} from "./overheat.ts";
import {
  outrageAtAge,
  type OutrageLiveInputs,
  type OutrageState,
} from "./outrage.ts";
import {
  silverWindAtAge,
  silverWindDisplayPlanAtAge,
  type SilverWindLiveInputs,
  type SilverWindState,
} from "./silverWind.ts";
import {
  skyAttackAtAge,
  type SkyAttackBody,
  type SkyAttackLiveInputs,
  type SkyAttackState,
} from "./skyAttack.ts";
import {
  solarBeamAtAge,
  type SolarBeamBody,
  type SolarBeamState,
} from "./solarBeam.ts";
import {
  hiJumpKickAtAge,
  type HiJumpKickState,
} from "./hiJumpKick.ts";
import {
  rollingKickAtAge,
  type RollingKickState,
} from "./rollingKick.ts";
import {
  lowKickAtAge,
  type LowKickState,
} from "./lowKick.ts";
import {
  karateChopAtAge,
  type KarateChopState,
} from "./karateChop.ts";
import {
  stompAtAge,
  type StompState,
} from "./stomp.ts";
import {
  viceGripAtAge,
  type ViceGripState,
} from "./viceGrip.ts";
import {
  guillotineAtAge,
  type GuillotineState,
} from "./guillotine.ts";
import {
  swaggerAtAge,
  type SwaggerState,
} from "./swagger.ts";
import {
  frustrationAtAge,
  type FrustrationAllocationProfile,
  type FrustrationState,
} from "./frustration.ts";
import {
  seismicTossAtAge,
  type SeismicTossGeometry,
  type SeismicTossProfile,
  type SeismicTossState,
} from "./seismicToss.ts";
import {
  bulkUpAtAge,
  type BulkUpState,
} from "./bulkUp.ts";
import {
  tauntAtAge,
  type TauntState,
} from "./taunt.ts";
import {
  tormentAtAge,
  type TormentState,
} from "./torment.ts";
import {
  detectAtAge,
  type DetectState,
} from "./detect.ts";
import {
  scaryFaceAtAge,
  type ScaryFaceState,
} from "./scaryFace.ts";
import {
  glareAtAge,
  type GlareGeometry,
  type GlareState,
} from "./glare.ts";
import {
  sparkAtAge,
  type SparkState,
} from "./spark.ts";
import {
  thunderWaveAtAge,
  type ThunderWaveState,
} from "./thunderWave.ts";
import {
  thunderAtAge,
  type ThunderState,
} from "./thunder.ts";
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
  sleepTalkAtAge,
  type SleepTalkState,
} from "./sleepTalk.ts";
import {
  howlAtAge,
  type HowlState,
} from "./howl.ts";
import {
  yawnAtAge,
  type YawnBattlerInput,
  type YawnState,
} from "./yawn.ts";
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
  heatWaveAtAge,
  type HeatWaveState,
} from "./heatWave.ts";
import {
  mistBallAtAge,
  type MistBallState,
} from "./mistBall.ts";
import {
  lusterPurgeAtAge,
  type LusterPurgeState,
  type LusterPurgeVisualRandom,
} from "./lusterPurge.ts";
import {
  tailGlowAtAge,
  type TailGlowState,
} from "./tailGlow.ts";
import {
  tailWhipAtAge,
  type TailWhipState,
} from "./tailWhip.ts";
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
import { fakeOutAtAge, type FakeOutState } from "./fakeOut.ts";
import {
  razorLeafAtAge,
  type RazorLeafState,
} from "./razorLeaf.ts";
import {
  magicalLeafAtAge,
  type MagicalLeafState,
} from "./magicalLeaf.ts";
import {
  ironTailAtAge,
  type IronTailState,
} from "./ironTail.ts";
import {
  crushClawAtAge,
  type CrushClawState,
} from "./crushClaw.ts";
import {
  furySwipesAtAge,
  type FurySwipesState,
} from "./furySwipes.ts";
import {
  takeDownAtAge,
  type TakeDownState,
} from "./takeDown.ts";
import {
  crunchAtAge,
  type CrunchState,
} from "./crunch.ts";
import {
  slashAtAge,
  type SlashState,
} from "./slash.ts";
import {
  lickAtAge,
  type LickState,
} from "./lick.ts";
import {
  counterAtAge,
  type CounterState,
} from "./counter.ts";
import {
  thrashAtAge,
  thrashDisplayedTargetOffsetAtAge,
  type ThrashRandomWords,
  type ThrashState,
} from "./thrash.ts";
import {
  doubleKickAtAge,
  type DoubleKickRandomWords,
  type DoubleKickState,
} from "./doubleKick.ts";
import {
  tripleKickAtAge,
  type TripleKickMoveTurn,
  type TripleKickState,
} from "./tripleKick.ts";
import {
  doubleSlapAtAge,
  type DoubleSlapMoveTurn,
  type DoubleSlapState,
} from "./doubleSlap.ts";
import {
  cometPunchAtAge,
  type CometPunchMoveTurn,
  type CometPunchState,
} from "./cometPunch.ts";
import {
  crabHammerAtAge,
  type CrabHammerState,
} from "./crabHammer.ts";
import {
  doubleEdgeAtAge,
  type DoubleEdgeState,
} from "./doubleEdge.ts";
import {
  poisonTailAtAge,
  type PoisonTailState,
} from "./poisonTail.ts";
import {
  steelWingAtAge,
  type SteelWingState,
} from "./steelWing.ts";
import {
  toxicEffectAtAge,
  type ToxicSprite,
} from "./toxic.ts";
import {
  earthquakeAnimationAtAge,
  type EarthquakeAnimationState,
} from "./earthquake.ts";
import {
  magnitudeAtAge,
  type MagnitudeFrame,
  type MagnitudeLiveInputs,
} from "./magnitude.ts";
import {
  sunnyDayAtAge,
  type SunnyDayFrame,
  type SunnyDayLiveInputs,
} from "./sunnyDay.ts";
import {
  uproarAtAge,
  type UproarFrame,
  type UproarLiveInputs,
} from "./uproar.ts";
import {
  rapidSpinAtAge,
  type RapidSpinFrame,
  type RapidSpinLiveInputs,
} from "./rapidSpin.ts";
import {
  foresightAtAge,
  type ForesightFrame,
  type ForesightLiveInputs,
} from "./foresight.ts";
import {
  spiderWebAtAge,
  type SpiderWebFrame,
  type SpiderWebLiveInputs,
} from "./spiderWeb.ts";
import {
  petalDanceAtAge,
  type PetalDanceLiveInputs,
  type PetalDanceState,
} from "./petalDance.ts";
import {
  skyUppercutAtAge,
  type SkyUppercutLiveInputs,
  type SkyUppercutState,
} from "./skyUppercut.ts";
import {
  destinyBondAtAge,
  type DestinyBondLiveInputs,
  type DestinyBondState,
} from "./destinyBond.ts";
import {
  airCutterAtAge,
  type AirCutterLiveInputs,
  type AirCutterState,
} from "./airCutter.ts";
import {
  sheerColdAtAge,
  type SheerColdLiveInputs,
  type SheerColdState,
} from "./sheerCold.ts";
import {
  smogAtAge,
  type SmogLiveInputs,
  type SmogState,
} from "./smog.ts";
import {
  bonemerangAtAge,
  type BonemerangLiveInputs,
  type BonemerangState,
} from "./bonemerang.ts";
import {
  signalBeamAtAge,
  type SignalBeamLiveInputs,
  type SignalBeamState,
} from "./signalBeam.ts";
import {
  nightmareAtAge,
  type NightmareLiveInputs,
  type NightmareState,
} from "./nightmare.ts";
import {
  skillSwapAtAge,
  type SkillSwapLiveInputs,
  type SkillSwapState,
} from "./skillSwap.ts";
import {
  pursuitDisplayPlan,
  pursuitAtAge,
  type PursuitLiveInputs,
  type PursuitState,
} from "./pursuit.ts";
import {
  psywaveAtAge,
  type PsywaveLiveInputs,
  type PsywaveState,
} from "./psywave.ts";
import {
  extrasensoryAtAge,
  type ExtrasensoryLiveInputs,
  type ExtrasensoryState,
} from "./extrasensory.ts";
import { willOWispAtAge, type WillOWispLiveInputs, type WillOWispState } from "./willOWisp.ts";
import {
  returnDisplayPlan,
  returnAtAge,
  type ReturnLiveInputs,
  type ReturnState,
} from "./return.ts";
import {
  flatterDisplayPlan,
  flatterAtAge,
  type FlatterLiveInputs,
  type FlatterState,
} from "./flatter.ts";
import {
  waterPulseAtAge,
  type WaterPulseLiveInputs,
  type WaterPulseState,
} from "./waterPulse.ts";
import {
  digAtAge,
  type DigLiveInputs,
  type DigState,
} from "./dig.ts";
import {
  fissureAtAge,
  type FissureState,
} from "./fissure.ts";
import {
  eruptionAtAge,
  type EruptionAnimationProfile,
  type EruptionFrame,
} from "./eruption.ts";
import {
  waterSpoutComponentPlan,
  waterSpoutAtAge,
  type WaterSpoutLiveInputs,
} from "./waterSpout.ts";
import {
  sandTombAtAge,
  type SandTombAnimationProfile,
  type SandTombFrame,
} from "./sandTomb.ts";
import {
  trickAtAge,
  type TrickAnimationProfile,
  type TrickFrame,
} from "./trick.ts";
import {
  ROCK_BLAST_FIRST_INACTIVE_AGE,
  rockBlastAtAge,
  type RockBlastAnimationProfile,
  type RockBlastFrame,
} from "./rockBlast.ts";
import {
  swiftAtAge,
  type SwiftAnimationProfile,
  type SwiftFrame,
} from "./swift.ts";
import {
  iceBeamAtAge,
  type IceBeamAnimationProfile,
  type IceBeamFrame,
} from "./iceBeam.ts";
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
  type DragonRageFireSpitGeometry,
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
import { speciesFrontIdleRestOffset, speciesFrontIdleRestOffsetOrZero } from "./speciesIdleAnim.ts";
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
import type { ShadowPunchFadeHostInput } from "./shadowPunchFadeHost.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";
import {
  knockOffBodyAtAge,
  knockOffTargetOamOffsetAtAge,
  type KnockOffBodyState,
} from "./knockOff.ts";
import { batonPassAtAge, type BatonPassState } from "./batonPass.ts";
import { rolePlayAtAge, type RolePlayState } from "./rolePlay.ts";
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
  confuseRayAtAge,
  type ConfuseRayState,
} from "./confuseRay.ts";
import {
  encoreAtAge,
  type EncoreState,
} from "./encore.ts";
import {
  dragonClawAtAge,
  type DragonClawState,
} from "./dragonClaw.ts";
import {
  fireSpinAtAge,
  type FireSpinState,
} from "./fireSpin.ts";
import {
  metalClawAtAge,
  type MetalClawState,
} from "./metalClaw.ts";
import {
  singNotesBackToFrontAtAge,
  singPanTaskAtAge,
  type SingNote,
  type SingPanTask,
} from "./sing.ts";
import {
  grassWhistleAtAge,
  grassWhistleNotesBackToFrontAtAge,
  type GrassWhistleNote,
} from "./grassWhistle.ts";
import {
  teeterDanceAtAge,
  teeterDanceNotesBackToFrontAtAge,
  type TeeterDanceNote,
  type TeeterDancePoint,
} from "./teeterDance.ts";
import {
  bellyDrumAtAge,
  bellyDrumNotesBackToFrontAtAge,
  type BellyDrumNote,
  type BellyDrumPoint,
} from "./bellyDrum.ts";
import {
  sweetKissAtAge,
  type SweetKissState,
} from "./sweetKiss.ts";
import {
  sweetScentAtAge,
  type SweetScentProfile,
  type SweetScentState,
} from "./sweetScent.ts";
import {
  defenseCurlAtAge,
  type DefenseCurlProfile,
  type DefenseCurlState,
} from "./defenseCurl.ts";
import {
  ingrainAtAge,
  type IngrainProfile,
  type IngrainState,
} from "./ingrain.ts";
import {
  meanLookAtAge,
  type MeanLookProfile,
  type MeanLookState,
} from "./meanLook.ts";
import {
  lovelyKissAtAge,
  type LovelyKissProfile,
  type LovelyKissState,
} from "./lovelyKiss.ts";
import {
  attractAtAge,
  type AttractState,
} from "./attract.ts";
import {
  sporeAtAge,
  type SporeState,
} from "./spore.ts";
import {
  cottonSporeAtAge,
  type CottonSporeState,
} from "./cottonSpore.ts";
import {
  stunSporeAtAge,
  type StunSporeState,
} from "./stunSpore.ts";
import {
  sleepPowderAtAge,
  type SleepPowderState,
} from "./sleepPowder.ts";
import {
  hypnosisDisplayedRingsAtAge,
  hypnosisAtAge,
  type HypnosisRing,
  type HypnosisState,
} from "./hypnosis.ts";
import {
  amnesiaAtAge,
  amnesiaDisplayedQuestionMarkAtAge,
  type AmnesiaQuestionMark,
  type AmnesiaState,
} from "./amnesia.ts";
import {
  dragonDanceAtAge,
  type DragonDanceProfile,
  type DragonDanceState,
} from "./dragonDance.ts";
import {
  psybeamAtAge,
  psybeamDisplayedRingsAtAge,
  type PsybeamRing,
  type PsybeamState,
} from "./psybeam.ts";
import {
  agilityAnimationAtAge,
  type AgilityState,
} from "./agility.ts";
import {
  leerAtAge,
  type LeerState,
} from "./leer.ts";

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
  readonly species: string;
  readonly geometry: SceneOnBattlerGeometry;
  /**
   * Live x2 history override of the species front-idle rest (engine/liveBattlerX2History.ts, ISSUES #148): present only
   * when an earlier body left this battler at {0,0}; absent = the species rest.
   */
  readonly liveIdleRest?: Readonly<{ x2: number; y2: number }>;
}

/** Front-idle rest a presentation battler is drawn at: the live x2 history override, else the species rest. */
export function sceneOnBattlerFrontIdleRest(
  battler: Readonly<{ species: string; liveIdleRest?: Readonly<{ x2: number; y2: number }> }>,
): Readonly<{ x2: number; y2: number }> {
  return battler.liveIdleRest ?? speciesFrontIdleRestOffsetOrZero(battler.species);
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

/** Narrow Scene-ON seam for Meteor Mash's source-relative presentation body. */
export interface SceneOnMeteorMashConfig {
  readonly move: "METEOR_MASH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<
    Omit<SceneOnFaintAttackFieldProfile, "playerGender" | "opponentGender">
    & {
      readonly playerMaxHp: number;
      readonly opponentMaxHp: number;
      readonly playerGender?: "male" | "female" | "none";
      readonly opponentGender?: "male" | "female" | "none";
    }
  >;
  /** Presentation-only Random2 results for the 48 source mini stars. */
  readonly twinkles?: readonly import("./meteorMash.ts").MeteorMashTwinkleVariant[];
  /** D4 restore-tail lag (meteorMash.ts MeteorMashGeometry.restoreLagRows); absent = the accepted corpora's side phases. */
  readonly restoreLagRows?: 0 | 1;
}

export interface SceneOnFlameWheelConfig {
  readonly move: "FLAME_WHEEL";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnBindConfig {
  readonly move: "BIND";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<BindAnimationProfile>;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
}

export interface SceneOnWrapConfig {
  readonly move: "WRAP";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<WrapAnimationProfile>;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
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
  /**
   * The attacker's pic-coords yOffset (back table for a player attacker, front for an opponent; prep34 s1.4 A). Absent = the
   * accepted ARCANINE values 6 / 2 the staged fixtures were built with.
   */
  readonly attackerYOffset?: number;
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

export interface SceneOnRockThrowConfig {
  readonly move: "ROCK_THROW";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<RockThrowAnimationProfile>;
  /** Immutable field values; the presentation seam never calculates damage. */
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
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
  readonly playerStatus?: "none" | "sleep" | "poison" | "burn" | "freeze" | "paralysis";
  readonly opponentStatus?: "none" | "sleep" | "poison" | "burn" | "freeze" | "paralysis";
}

export interface SceneOnDragonRageConfig {
  readonly move: "DRAGON_RAGE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Per-request fire-spit aim from the attacker/target pic offsets; absent = the accepted ONIX literal. */
  readonly fireSpitGeometry?: DragonRageFireSpitGeometry;
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
  /** Source-owned persistent OBJ scratch colors, when the live host has complete history. */
  readonly traceScratchUnfadedPalette?: readonly Readonly<{ r: number; g: number; b: number }>[];
  /** Source callback progress supplied by a live CPU/audio scheduler; absent means uninterrupted callbacks. */
  readonly liveFadeHost?: ShadowPunchFadeHostInput;
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

/** Presentation-only source-age seam for Move_SOFT_BOILED. */
export interface SceneOnSoftBoiledConfig {
  readonly move: "SOFT_BOILED";
  readonly attacker: SceneOnPresentationBattler;
  /** Source target is `MOVE_TARGET_USER`, so this battler shares the side. */
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** `AnimSpriteOnMonPos`'s source target picture center for HealingEffect2. */
  readonly healingCenter: Readonly<{ x: number; y: number }>;
  /**
   * Live field only: the displayed battler on the other side, drawn instead of
   * the staged Onix constants (the move body does not touch it).
   */
  readonly bystander?: SceneOnPresentationBattler;
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

export interface SceneOnPresentConfig {
  readonly move: "PRESENT";
  /** Immutable result chosen by the battle controller. */
  readonly branch: PresentBranch;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
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
  /** The script runs from a RunTasks task, not the controller (absorbAtAge `taskHostedScript`). */
  readonly taskHostedScript?: boolean;
}

/** Presentation-only source geometry for either retained Leech Seed body. */
export interface SceneOnLeechSeedConfig {
  readonly move: "LEECH_SEED";
  readonly body: LeechSeedBody;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Main launch or residual absorption endpoint, both source Y_PIC_OFFSET. */
  readonly effectCenter: Readonly<{ x: number; y: number }>;
  /** Natural pre-script idle OAM offset retained until General's shake. */
  readonly targetRestOffset: Readonly<{ x2: number; y2: number }>;
  /** Measured natural occupied-slot topology; never controls outcomes. */
  readonly allocatorProfile: Readonly<{
    readonly seeds: readonly [number, number, number];
    readonly hitsplat: number;
    readonly orbs: readonly number[];
    readonly stars: readonly number[];
    readonly paletteController: number;
  }>;
}

/**
 * Presentation-only geometry and allocator facts for `Move_MEGA_DRAIN`.
 * Battle resolution supplies all mutable battle outcomes outside this seam.
 */
export interface SceneOnMegaDrainConfig {
  readonly move: "MEGA_DRAIN";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** `InitSpritePosToAnimAttacker(TRUE)` center used by HealingEffect. */
  readonly healingCenter: Readonly<{ x: number; y: number }>;
  /** `BATTLER_COORD_X_2/Y_PIC_OFFSET` endpoint used by absorption arcs. */
  readonly absorptionCenter: Readonly<{ x: number; y: number }>;
  /** Fresh-probed occupied slots, retained as presentation topology only. */
  readonly allocatorProfile: Readonly<MegaDrainAllocatorProfile>;
}

/** Presentation-only geometry and allocator facts for `Move_GIGA_DRAIN`. */
export interface SceneOnGigaDrainConfig {
  readonly move: "GIGA_DRAIN";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly healingCenter: Readonly<{ x: number; y: number }>;
  readonly absorptionCenter: Readonly<{ x: number; y: number }>;
  readonly allocatorProfile: Readonly<GigaDrainAllocatorProfile>;
}

/** Presentation-only geometry and allocator facts for Move_DREAM_EATER. */
export interface SceneOnDreamEaterConfig {
  readonly move: "DREAM_EATER";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly healingCenter: Readonly<{ x: number; y: number }>;
  readonly absorptionCenter: Readonly<{ x: number; y: number }>;
  /** Settled species animation offset before Dream Eater's tasks take over. */
  readonly targetRestOffset: Readonly<{ x2: number; y2: number }>;
  readonly allocatorProfile: Readonly<DreamEaterAllocatorProfile>;
}

/** Presentation-only geometry for Move_PAIN_SPLIT's bilateral body. */
export interface SceneOnPainSplitConfig {
  readonly move: "PAIN_SPLIT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Live per-side species pic-coords `yOffset` (liveBattlerCoordAttrs); absent = the accepted MISDREAVUS/GENGAR cells. */
  readonly pictureYOffsets?: Readonly<{ attacker: number; target: number }>;
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

export interface SceneOnBrickBreakConfig {
  readonly move: "BRICK_BREAK";
  readonly body: BrickBreakBody;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
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
  /** Opponent-side age-52 BLDALPHA hold (lightScreen.ts); absent = the accepted corpus phase (hold). */
  readonly opponentBlendHold?: boolean;
}

export interface SceneOnBarrierConfig {
  readonly move: "BARRIER";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly allocatorProfile: Readonly<{ readonly wall: number }>;
}

export interface SceneOnMagicCoatConfig {
  readonly move: "MAGIC_COAT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly allocatorProfile: Readonly<{ readonly wall: number }>;
}

export interface SceneOnProtectConfig {
  readonly move: "PROTECT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly allocatorProfile: Readonly<{ readonly protect: number }>;
}

/** Typed Scene-ON seam for MOVE_DISABLE's target monbg/OBJ-blend task. */
export interface SceneOnDisableConfig {
  readonly move: "DISABLE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnHazeConfig {
  readonly move: "HAZE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnSpiteConfig {
  readonly move: "SPITE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

/** Narrow Scene-ON seam for Memento's source-relative monbg/scanline body. */
export interface SceneOnMementoConfig {
  readonly move: "MEMENTO";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly reducer: Readonly<MementoConfig>;
}

export interface SceneOnNightShadeConfig {
  readonly move: "NIGHT_SHADE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnMirrorCoatConfig {
  readonly move: "MIRROR_COAT";
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

/** Narrow Scene-ON seam for Cosmic Power's source-relative presentation. */
export interface SceneOnCosmicPowerConfig {
  readonly move: "COSMIC_POWER";
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

/** Narrow Scene-ON seam for Ancient Power; battle resolution remains external. */
export interface SceneOnAncientPowerConfig {
  readonly move: "ANCIENT_POWER";
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

export interface SceneOnRefreshConfig {
  readonly move: "REFRESH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

/** Heal Bell presentation only; party status mutation remains battle-owned. */
export interface SceneOnHealBellConfig {
  readonly move: "HEAL_BELL";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Live host order of slots 4,5,7,9,10,11 at activation (docs/order-consumer-prep.md §0); staged = ascending. */
  readonly noteOrderSeed?: readonly number[];
}

/** Fire Blast presentation only; damage and battle state remain battle-owned. */
export interface SceneOnFireBlastConfig {
  readonly move: "FIRE_BLAST";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationProfile: Readonly<FireBlastGeometry>;
}

/** Rollout presentation only; damage, timers, and battle state remain battle-owned. */
export interface SceneOnRolloutConfig {
  readonly move: "ROLLOUT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly counter: RolloutCounter;
  readonly animationProfile: Readonly<RolloutGeometry>;
}

/** Rain Dance presentation only; weather and battle outcomes remain battle-owned. */
export interface SceneOnRainDanceConfig {
  readonly move: "RAIN_DANCE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationProfile: Readonly<RainDanceProfile>;
}

/** Hail presentation only; weather and battle outcomes remain battle-owned. */
export interface SceneOnHailConfig {
  readonly move: "HAIL";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationProfile: Readonly<HailProfile>;
}

export interface SceneOnSupersonicConfig {
  readonly move: "SUPERSONIC";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnMetalSoundConfig {
  readonly move: "METAL_SOUND";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

/** Screech presentation only; battle state and controller state remain external. */
export interface SceneOnScreechConfig {
  readonly move: "SCREECH";
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

/** Safeguard presentation only; side-status ownership remains battle-owned. */
export interface SceneOnSafeguardConfig {
  readonly move: "SAFEGUARD";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Live allocator/subpriority facts, independent of carrier species. */
  readonly animationProfile: Readonly<SafeguardAnimationProfile>;
}

/** Grudge presentation only; PP denial and all battle outcomes remain external. */
export interface SceneOnGrudgeConfig {
  readonly move: "GRUDGE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Live allocator, OAM ordering, battler geometry, and animation RNG facts. */
  readonly animationProfile: Readonly<GrudgeAnimationProfile>;
}

/** Hidden Power presentation only; type, damage, and battle RNG stay external. */
export interface SceneOnHiddenPowerConfig {
  readonly move: "HIDDEN_POWER";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<
    Omit<SceneOnDragonRageFieldProfile, "playerGender" | "opponentGender">
    & {
      readonly playerGender?: "male" | "female" | "none";
      readonly opponentGender?: "male" | "female" | "none";
    }
  >;
  /** Live allocator, persistent order, matrix, and animation-RNG facts. */
  readonly animationProfile: Readonly<HiddenPowerProfile>;
}

/** Smelling Salt presentation only; damage/status ownership remains external. */
export interface SceneOnSmellingSaltConfig {
  readonly move: "SMELLING_SALT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source `GetBattlerSpriteCoordAttr` and picture-height facts. */
  readonly animationProfile: Readonly<{
    readonly targetLeft: number;
    readonly targetRight: number;
    readonly targetTop: number;
    readonly targetPictureY: number;
    readonly targetVerticalSpan: number;
  }>;
}

/**
 * MOVE_RECYCLE presentation only.  Its `tryrecycleitem` success gate and
 * restored held item stay in the battle-script owner; this seam receives only
 * the already-active animation's live sprite facts.
 */
export interface SceneOnRecycleConfig {
  readonly move: "RECYCLE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationProfile: Readonly<RecycleProfile>;
}

export interface SceneOnLeerConfig {
  readonly move: "LEER";
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

export interface SceneOnSuperFangConfig {
  readonly move: "SUPER_FANG";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnMegaPunchConfig {
  readonly move: "MEGA_PUNCH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnMegaKickConfig {
  readonly move: "MEGA_KICK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

/** Field chrome for Focus Punch, including the stock genderless healthbox case. */
export interface SceneOnFocusPunchFieldProfile
  extends Omit<SceneOnDragonRageFieldProfile, "playerGender" | "opponentGender"> {
  readonly playerGender?: "male" | "female" | "none";
  readonly opponentGender?: "male" | "female" | "none";
}

/** Narrow Scene-ON seam for Focus Punch's target-side impact-background body. */
export interface SceneOnFocusPunchConfig {
  readonly move: "FOCUS_PUNCH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnFocusPunchFieldProfile>;
  /** The age-131 restore lag phase (focusPunch.ts); absent = the accepted fixtures' per-side body. */
  readonly restoreLag?: boolean;
}

/** Narrow Scene-ON seam for MOVE_MACH_PUNCH's live source-relative body. */
export interface SceneOnMachPunchConfig {
  readonly move: "MACH_PUNCH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<MachPunchLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies">>;
}

/** Narrow Scene-ON seam for MOVE_PSYCH_UP's source-relative presentation. */
export interface SceneOnPsychUpConfig {
  readonly move: "PSYCH_UP";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<PsychUpLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies">>;
}

/**
 * Narrow semantic Scene-ON seam for MOVE_HYPER_VOICE.  The scene supplies
 * current geometry/allocation/palette facts; damage, gameplay RNG, and turn
 * progression remain outside this presentation-only source-age reducer.
 */
export interface SceneOnHyperVoiceConfig {
  readonly move: "HYPER_VOICE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<HyperVoiceLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
    | "attackerPictureOrigin" | "targetPictureOrigin">>;
}

/**
 * Narrow semantic Scene-ON seam for MOVE_SHOCK_WAVE.  All allocation,
 * geometry, palette and register facts remain live inputs; battle outcome and
 * gameplay RNG stay outside this presentation-only reducer.
 */
export interface SceneOnShockWaveConfig {
  readonly move: "SHOCK_WAVE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<ShockWaveLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
    | "attackerPictureOrigin" | "targetPictureOrigin" | "targetBattlePosition">>;
}

/**
 * Narrow Scene-ON seam for MOVE_OVERHEAT's pure source-relative body.  The
 * scene supplies current battler geometry and allocator/palette facts; the
 * reducer cannot inspect or alter gameplay state.
 */
export interface SceneOnOverheatConfig {
  readonly move: "OVERHEAT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<OverheatLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
    | "attackerPictureOrigin" | "targetPictureOrigin">>;
}

/**
 * Narrow Scene-ON seam for MOVE_OUTRAGE's source-relative flame body.  The
 * scene supplies live geometry/allocation/palette facts; battle resolution,
 * gameplay RNG and facility state remain opaque to the animation reducer.
 */
export interface SceneOnOutrageConfig {
  readonly move: "OUTRAGE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<OutrageLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
    | "attackerPictureOrigin" | "targetPictureOrigin">>;
}

/**
 * Narrow Scene-ON seam for MOVE_SILVER_WIND. The scene supplies live battler
 * geometry, allocation, palette and BG/register facts; battle resolution and
 * gameplay state remain opaque to the presentation reducer.
 */
export interface SceneOnSilverWindConfig {
  readonly move: "SILVER_WIND";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<SilverWindLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
    | "attackerPictureOrigin" | "targetPictureOrigin">>;
}

/** Narrow Scene-ON seam for MOVE_SNORE's two source-owned effect calls. */
export interface SceneOnSnoreConfig {
  readonly move: "SNORE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<SnoreLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
    | "attackerPictureOrigin" | "targetPictureOrigin">>;
}

/** Narrow Scene-ON seam for MOVE_SKY_ATTACK's controller-selected body. */
export interface SceneOnSkyAttackConfig {
  readonly move: "SKY_ATTACK";
  readonly body: SkyAttackBody;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<SkyAttackLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
    | "attackerPictureOrigin" | "targetPictureOrigin">>;
}

/** Narrow Scene-ON seam for Solar Beam's source-isolated two-turn bodies. */
export interface SceneOnSolarBeamConfig {
  readonly move: "SOLAR_BEAM";
  readonly body: SolarBeamBody;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

/** Narrow Scene-ON seam for the source-isolated Hi Jump Kick body. */
export interface SceneOnHiJumpKickConfig {
  readonly move: "HI_JUMP_KICK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Settled front-sprite x2 before HJK's target movement task takes ownership. */
  readonly targetInitialX2?: number;
}

export interface SceneOnRollingKickConfig {
  readonly move: "ROLLING_KICK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnLowKickConfig {
  readonly move: "LOW_KICK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

/** Narrow Scene-ON seam; move resolution and critical-hit state stay external. */
export interface SceneOnKarateChopConfig {
  readonly move: "KARATE_CHOP";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnBatonPassConfig {
  readonly move: "BATON_PASS";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

/** Role Play receives presentation geometry and immutable healthbox fields only. */
export interface SceneOnRolePlayConfig {
  readonly move: "ROLE_PLAY";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

/** Narrow Scene-ON seam: only resolved presentation geometry and immutable HP. */
export interface SceneOnStompConfig {
  readonly move: "STOMP";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

/** Narrow VICE_GRIP presentation seam; battle resolution remains external. */
export interface SceneOnViceGripConfig {
  readonly move: "VICE_GRIP";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

/** Narrow Scene-ON Guillotine seam; OHKO resolution and RNG stay external. */
export interface SceneOnGuillotineConfig {
  readonly move: "GUILLOTINE";
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

/** Narrow SUBMISSION seam; all battle resolution remains immutable input. */
export interface SceneOnSubmissionConfig {
  readonly move: "SUBMISSION";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnDrillPeckConfig {
  readonly move: "DRILL_PECK";
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

/** Narrow Scene-ON seam for MOVE_ROCK_TOMB's source-created rocks and tasks. */
export interface SceneOnRockTombConfig {
  readonly move: "ROCK_TOMB";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Sprite allocator identity retained at the source boundary. */
  readonly targetSpriteSlot: number;
  /** Target's pre-task front/back idle x2, before ShakeMon writes it. */
  readonly targetInitialX2: number;
  /** `InitSpritePosToAnimTarget` center used by the four rocks and Red-X. */
  readonly effectCenter: Readonly<{ x: number; y: number }>;
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

export interface SceneOnSecretPowerConfig {
  readonly move: "SECRET_POWER";
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

/** Narrow POISON_STING presentation seam; no damage or poison outcome enters it. */
export interface SceneOnPoisonStingConfig {
  readonly move: "POISON_STING";
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

/** Narrow Pin Missile presentation seam; hit count and damage stay outside. */
export interface SceneOnPinMissileConfig {
  readonly move: "PIN_MISSILE";
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

/**
 * Narrow semantic Scene-ON seam for MOVE_AIR_CUTTER. The caller owns live
 * battler geometry, slots, matrices, resource banks, tasks, and painter
 * order; no controller state or framebuffer data crosses this boundary.
 */
export interface SceneOnAirCutterConfig {
  readonly move: "AIR_CUTTER";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<AirCutterLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerCenter" | "targetCenter">>;
}

/**
 * Narrow semantic Scene-ON seam for MOVE_SHEER_COLD. The OHKO result and all
 * battle state remain controller-owned; this carries only live presentation
 * geometry/allocation facts into the source-relative reducer.
 */
export interface SceneOnSheerColdConfig {
  readonly move: "SHEER_COLD";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<SheerColdLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "targetAnimationCenter" | "targetBattlePositionCenter">>;
  /** Live front-idle x2/y2 rest per battler (no Sheer Cold task writes x2/y2, so the rest persists); absent = zero. */
  readonly idleRest?: Readonly<{
    readonly attacker: Readonly<{ x2: number; y2: number }>;
    readonly target: Readonly<{ x2: number; y2: number }>;
  }>;
}

/**
 * Narrow semantic Scene-ON seam for MOVE_SMOG. Battle outcome, damage, RNG
 * ownership, and controller timing remain outside this presentation-only
 * source-age reducer.
 */
export interface SceneOnSmogConfig {
  readonly move: "SMOG";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<SmogLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies">>;
}

/**
 * Narrow Scene-ON seam for MOVE_BONEMERANG.  The scene supplies current
 * battler picture origins and allocator state; this does not own damage,
 * gameplay RNG, turn timing, or any controller transition.
 */
export interface SceneOnBonemerangConfig {
  readonly move: "BONEMERANG";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<BonemerangLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerPictureCenter" | "targetPictureCenter">>;
}

/**
 * Narrow Scene-ON semantic seam for MOVE_SIGNAL_BEAM. The scene supplies
 * current battler identity plus live source picture origins, allocator,
 * palette, painter, and presentation-only inputs; battle resolution remains
 * outside this reducer.
 */
export interface SceneOnSignalBeamConfig {
  readonly move: "SIGNAL_BEAM";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<SignalBeamLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies">>;
}

/**
 * Narrow Scene-ON seam for MOVE_NIGHTMARE's legal-battle body.  The scene
 * supplies the current picture origins and live presentation allocations;
 * damage, gameplay RNG, controller timing, and contest execution stay out.
 */
export interface SceneOnNightmareConfig {
  readonly move: "NIGHTMARE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<NightmareLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerPictureOrigin" | "targetPictureOrigin">>;
}

/**
 * Narrow Scene-ON seam for MOVE_SKILL_SWAP. The scene supplies live corner
 * geometry, allocation/OAM/matrix/palette/resource/audio state and the
 * already-resolved legal ability result; gameplay and controller state stay
 * outside the presentation reducer.
 */
export interface SceneOnSkillSwapConfig {
  readonly move: "SKILL_SWAP";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<SkillSwapLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies">>;
}

/**
 * Narrow Scene-ON seam for MOVE_PURSUIT. The caller supplies the resolved
 * normal/switch-interception branch and current shared presentation buffers;
 * switch resolution, damage, gameplay state, and gameplay RNG remain outside.
 */
export interface SceneOnPursuitConfig {
  readonly move: "PURSUIT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<PursuitLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerCenter" | "targetCenter" | "targetImpactCenter">>;
}

/**
 * Narrow Scene-ON seam for MOVE_PSYWAVE. The caller supplies current art,
 * allocator, palette, background, audio, and opaque gameplay state while the
 * seam supplies live battler identity and source picture geometry.
 */
export interface SceneOnPsywaveConfig {
  readonly move: "PSYWAVE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<PsywaveLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerPictureCenter" | "targetPictureCenter"
      | "attackerAnimationCenter" | "targetAnimationCenter">>;
}

/** Narrow Scene-ON seam for MOVE_EXTRASENSORY presentation only. */
export interface SceneOnExtrasensoryConfig {
  readonly move: "EXTRASENSORY";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<ExtrasensoryLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerCenter" | "targetCenter">>;
}

/** Narrow Scene-ON seam for MOVE_WILL_O_WISP presentation only. */
export interface SceneOnWillOWispConfig {
  readonly move: "WILL_O_WISP";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<WillOWispLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerCenter" | "targetCenter">>;
}

/** Narrow battle-only Scene-ON seam for MOVE_MEGAHORN. */
export interface SceneOnMegaHornConfig {
  readonly move: "MEGAHORN";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<MegaHornLiveInputs,
    "attackerSide"|"targetSide"|"attackerSpecies"|"targetSpecies"|"attackerCenter"|"targetCenter">>;
}

/** Narrow Scene-ON presentation seam for MOVE_SUPERPOWER. */
export interface SceneOnSuperpowerConfig {
  readonly move: "SUPERPOWER";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<SuperpowerLiveInputs,
    "attackerSide"|"targetSide"|"attackerSpecies"|"targetSpecies"|"attackerCenter"|"targetCenter">>;
}

/** Narrow Scene-ON presentation seam for MOVE_REVENGE. */
export interface SceneOnRevengeConfig {
  readonly move: "REVENGE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<RevengeLiveInputs,
    "attackerSide"|"targetSide"|"attackerSpecies"|"targetSpecies"|"attackerCenter"|"targetCenter">>;
}

/** Narrow Scene-ON presentation seam for MOVE_SPIT_UP's resolved power branch. */
export interface SceneOnSpitUpConfig {
  readonly move: "SPIT_UP";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<SpitUpLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerCenter" | "targetCenter">>;
}

/** Narrow Scene-ON presentation seam for MOVE_FURY_CUTTER's live counter branch. */
export interface SceneOnFuryCutterConfig {
  readonly move: "FURY_CUTTER";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<FuryCutterLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerCenter" | "targetCenter">>;
}

/** Narrow Scene-ON presentation seam for MOVE_ICE_BALL's five live counter branches. */
export interface SceneOnIceBallConfig {
  readonly move: "ICE_BALL";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<IceBallLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerPictureOffset" | "targetPictureOffset">>;
}

/** Narrow Scene-ON presentation seam for MOVE_CURSE's natural type branch. */
export interface SceneOnCurseConfig {
  readonly move: "CURSE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<CurseLiveInputs,
    "attackerSide" | "defenderSide" | "attackerSpecies" | "defenderSpecies"
      | "attackerCenter" | "defenderCenter">>;
}

/**
 * Narrow Scene-ON seam for MOVE_RETURN. The caller carries the live
 * friendship-selected presentation snapshot; damage, Return power, gameplay
 * RNG, and all battle state remain outside this animation-only reducer.
 */
export interface SceneOnReturnConfig {
  readonly move: "RETURN";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<ReturnLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerCenter" | "targetCenter">>;
}

/** stg107: narrow Scene-ON seam for MOVE_STRUGGLE (src/animation/struggle.ts; the live inputs are liveOamMoves.ts liveStruggleInputs). */
export interface SceneOnStruggleConfig {
  readonly move: "STRUGGLE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<StruggleLiveInputs>;
}

/**
 * Narrow Scene-ON seam for MOVE_FLATTER.  The caller owns all live sprite
 * allocation, transfer buffers, palette/register/audio snapshots, and the
 * presentation RNG.  Battle state and gameplay RNG remain opaque.
 */
export interface SceneOnFlatterConfig {
  readonly move: "FLATTER";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<FlatterLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerCenter" | "targetCenter">>;
}

/** Narrow Scene-ON seam for Razor Wind's setup and unleash bodies. */
export interface SceneOnRazorWindConfig {
  readonly move: "RAZOR_WIND";
  readonly body: RazorWindBody;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source X_2/Y_PIC_OFFSET centers, supplied by live battler geometry. */
  readonly attackerPictureCenter: Readonly<{ x: number; y: number }>;
  readonly targetPictureCenter: Readonly<{ x: number; y: number }>;
  /** Live target x2/y2 before ShakeMon2 overwrites the sprite fields. */
  readonly targetRestOffset: Readonly<{ x2: number; y2: number }>;
  /** Allocator and persistent-order state observed at this presentation. */
  readonly animationProfile: Readonly<RazorWindAnimationProfile>;
}

/** Narrow live animation-only seam for Horn Drill's single source body. */
export interface SceneOnHornDrillConfig {
  readonly move: "HORN_DRILL";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationGeometry: Readonly<HornDrillGeometry>;
  readonly animationProfile: Readonly<HornDrillProfile>;
}

/** Narrow live animation-only seam for Aurora Beam's single source body. */
export interface SceneOnAuroraBeamConfig {
  readonly move: "AURORA_BEAM";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationGeometry: Readonly<AuroraBeamGeometry>;
  readonly animationProfile: Readonly<AuroraBeamProfile>;
}

/** Narrow live animation-only seam for Tri Attack's complete source body. */
export interface SceneOnTriAttackFieldProfile
  extends Omit<SceneOnDragonRageFieldProfile, "playerGender" | "opponentGender"> {
  readonly playerGender?: "male" | "female" | "none";
  readonly opponentGender?: "male" | "female" | "none";
}
export interface SceneOnTriAttackConfig {
  readonly move: "TRI_ATTACK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnTriAttackFieldProfile>;
  readonly animationGeometry: Readonly<TriAttackGeometry>;
  readonly animationProfile: Readonly<TriAttackProfile>;
}

/** Narrow presentation-only seam for Hyper Beam's complete source body. */
export interface SceneOnHyperBeamConfig {
  readonly move: "HYPER_BEAM";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationGeometry: Readonly<HyperBeamGeometry>;
  readonly animationProfile: Readonly<HyperBeamProfile>;
}

/** Narrow presentation-only seam for Thunderbolt's complete source body. */
export interface SceneOnThunderboltConfig {
  readonly move: "THUNDERBOLT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationGeometry: Readonly<ThunderboltGeometry>;
  readonly animationProfile: Readonly<ThunderboltProfile>;
}

/** Narrow presentation-only seam for Zap Cannon's complete source body. */
export interface SceneOnZapCannonConfig {
  readonly move: "ZAP_CANNON";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationGeometry: Readonly<ZapCannonGeometry>;
  readonly animationProfile: Readonly<ZapCannonProfile>;
}

export interface SceneOnSmokescreenConfig {
  readonly move: "SMOKESCREEN";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

/** Octazooka presentation only; blindness/status resolution remains battle-owned. */
export interface SceneOnOctazookaConfig {
  readonly move: "OCTAZOOKA";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationProfile: Readonly<OctazookaProfile>;
}

/** Spikes presentation only; its hazard side condition remains battle-owned. */
export interface SceneOnSpikesConfig {
  readonly move: "SPIKES";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationProfile: Readonly<SpikesProfile>;
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

export interface SceneOnWhirlpoolConfig {
  readonly move: "WHIRLPOOL";
  readonly body: WhirlpoolBody;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
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

export interface SceneOnLeafBladeConfig {
  readonly move: "LEAF_BLADE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source-resolved target geometry consumed by AnimTask_LeafBlade. */
  readonly targetProfile: Readonly<LeafBladeTargetGeometry>;
  /** Target species front-idle x2 (live host); staged default = ONIX (1 for the opponent front). */
  readonly targetIdleX2?: number;
  /** Live host order of `LEAF_BLADE_OAM_ORDER_SLOTS` at activation (docs/order-consumer-prep.md §0); staged = ascending. */
  readonly oamOrderSeed?: readonly number[];
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

/** Narrow self-targeted seam; the caller owns immutable Stockpile state. */
export interface SceneOnSwallowConfig {
  readonly move: "SWALLOW";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly stockpileCount: SwallowStockpileCount;
  readonly attackerPictureOffset: Readonly<{ x: number; y: number }>;
  readonly attackerPictureYOffset: number;
}

/** Stockpile presentation only; stat stages and Stockpile state stay external. */
export interface SceneOnStockpileConfig {
  readonly move: "STOCKPILE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Live X_2/Y_PIC_OFFSET anchor used by the absorption-orb macro. */
  readonly attackerPictureCenter: Readonly<{ x: number; y: number }>;
  readonly attackerPictureYOffset: number;
  readonly animationProfile: Readonly<StockpileAnimationProfile>;
  /** Whether the pointer-entry hardware row retains an elevated front shadow. */
  readonly attackerShadowAtEntry: boolean;
}

export interface SceneOnSwaggerConfig {
  readonly move: "SWAGGER";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source `GetBattlerSpriteCoord(attacker, Y_PIC_OFFSET)` breath origin. */
  readonly breathOrigin: Readonly<{ x: number; y: number }>;
  /** `MON_PIC_HEIGHT - 2 * y_offset` of the attacker (SetBattlerSpriteYOffsetFromYScale); the staged Rattata pair when unset. */
  readonly battlerHeight?: number;
}

/** Friendship and branch selection remain battle-engine inputs; Factory uses 0. */
export interface SceneOnFrustrationConfig {
  readonly move: "FRUSTRATION";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationProfile: Readonly<FrustrationAllocationProfile>;
  /** Live attacker X_2/Y_PIC_OFFSET anchor used by both ANGER creates. */
  readonly attackerEffectCenter: Readonly<{ x: number; y: number }>;
  /** Live target X_2/Y_PIC_OFFSET anchor used by all six IMPACT creates. */
  readonly targetEffectCenter: Readonly<{ x: number; y: number }>;
  /** Live battler x2 on pointer entry; overwritten when target ShakeMon2 starts. */
  readonly targetInitialX2: number;
}

/** Dive's two-turn choice remains battle-owned; this seam renders one selected body. */
export interface SceneOnDiveConfig {
  readonly move: "DIVE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly body: DiveBody;
  readonly animationGeometry: Readonly<DiveGeometry>;
  /** Allocator identities/order and animation-RNG results resolved by the caller. */
  readonly animationProfile: Readonly<DiveProfile>;
  /**
   * Player setup row 68 shows the source state of age 66 (the reused-affine OAM transfer phase). Absent = true (the accepted staged
   * corpus); the live seam passes the faithful-timing policy's phase (liveMoveTimingPolicy.ts 291).
   */
  readonly setupRow68ReusedAffine?: boolean;
}

/** Level damage remains battle-owned; this seam is the level-50 Medium body. */
export interface SceneOnSeismicTossConfig {
  readonly move: "SEISMIC_TOSS";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationGeometry: Readonly<SeismicTossGeometry>;
  readonly animationProfile: Readonly<SeismicTossProfile>;
}

export interface SceneOnBulkUpConfig {
  readonly move: "BULK_UP";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /**
   * `GetBattlerSpriteCoord(attacker, X_2/Y_PIC_OFFSET)`; the legal
   * FRONTIER_MON_PRIMEAPE_2 picture needs the shared grow/shrink Y anchoring
   * plus the carrier's `MON_PIC_HEIGHT - 2*y_offset` picture height (50).
   */
  readonly breathOrigin: Readonly<{ x: number; y: number }>;
  readonly battlerHeight: number;
}

export interface SceneOnTauntConfig {
  readonly move: "TAUNT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source `SetSpriteNextToMonHead(attacker, sprite)` result. */
  readonly attackerHead: Readonly<{ x: number; y: number }>;
}

export interface SceneOnTormentConfig {
  readonly move: "TORMENT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /**
   * `GetBattlerSpriteCoord(attacker, X_2/Y_PIC_OFFSET)` — the six thought
   * bubbles anchor to the attacker's picture, not its sprite centre (Y_PIC
   * is `sprite y + 8` on the player side).
   */
  readonly attackerPictureOffset: Readonly<{ x: number; y: number }>;
  /**
   * `GetBattlerSpriteCoord(target, X_2/Y_PIC_OFFSET)` — the anger marks and
   * the BlendMonInAndOut palette bank anchor to the target's picture.
   */
  readonly targetPictureOffset: Readonly<{ x: number; y: number }>;
  /** Attacker `MON_PIC_HEIGHT - 2*yDelta` for the wobble y2 (48 MURKROW back / 40 front). */
  readonly battlerHeight: number;
}

export interface SceneOnScaryFaceConfig {
  readonly move: "SCARY_FACE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source `InitSpritePosToAnimAttacker(sprite, TRUE)` coordinate. */
  readonly attackerEyeCenter: Readonly<{ x: number; y: number }>;
}

export interface SceneOnGlareConfig {
  readonly move: "GLARE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source-relative coordinates supplied by the decoded battler geometry. */
  readonly attackerEyeCenter: Readonly<{ x: number; y: number }>;
  readonly eyeDotStart: Readonly<{ x: number; y: number }>;
  readonly eyeDotEnd: Readonly<{ x: number; y: number }>;
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

export interface SceneOnThunderConfig {
  readonly move: "THUNDER";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source `GetBattlerSpriteCoord(target, X_2/Y_2)` used by all bolts. */
  readonly targetEffectCenter: Readonly<{ x: number; y: number }>;
}

export interface SceneOnIcyWindConfig {
  readonly move: "ICY_WIND";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source X_2/Y_PIC attacker and SetAverageBattlerPositions target centers. */
  readonly effectGeometry: Readonly<{
    attackerCenter: Readonly<{ x: number; y: number }>;
    targetCenter: Readonly<{ x: number; y: number }>;
    spikeTargetCenter: Readonly<{ x: number; y: number }>;
  }>;
}

export interface SceneOnBlizzardConfig {
  readonly move: "BLIZZARD";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source X_2/Y_PIC attacker and averaged target centers. */
  readonly effectGeometry: Readonly<BlizzardGeometry>;
}

export interface SceneOnSurfConfig {
  /** `Move_MUDDY_WATER` is the muddy-palette sibling of `Move_SURF`. */
  readonly move: "SURF" | "MUDDY_WATER";
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
  /**
   * Fixture evidence may carry the immutable `trysetrest` result. Live
   * presentation deliberately does not invent a heal or status outcome.
   */
  readonly pendingHeal?: Readonly<{
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

/** Narrow Scene-ON seam for Sleep Talk's self-contained presentation body. */
export interface SceneOnSleepTalkConfig {
  readonly move: "SLEEP_TALK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnHowlFieldProfile extends SceneOnDragonRageFieldProfile {
  /** Legacy fixture outcome; Move_HOWL itself does not read or change stages. */
  readonly attackerAttackStage?: 7;
}

export interface SceneOnHowlConfig {
  readonly move: "HOWL";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnHowlFieldProfile>;
  readonly battlerInput?: import("./howl.ts").HowlBattlerInput;
}

/** Scene-ON seam for Yawn's source-derived bilateral inhale body. */
export interface SceneOnYawnConfig {
  readonly move: "YAWN";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Current source picture heights/centers; absent for retained fixtures. */
  readonly battlerInput?: Readonly<YawnBattlerInput>;
}

export interface SceneOnRoarConfig {
  readonly move: "ROAR";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  /** Immutable field presentation; no move guard or forced switch is owned. */
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnSweetKissConfig {
  readonly move: "SWEET_KISS";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

/** Sweet Scent presentation only; evasion-stage mutation remains battle-owned. */
export interface SceneOnSweetScentConfig {
  readonly move: "SWEET_SCENT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source-selected allocation facts; no species or pair is encoded. */
  readonly animationProfile: Readonly<SweetScentProfile>;
}

/**
 * Defense Curl's visual body only. The controller supplies the source picture
 * coordinate and ordinary attacker subpriority from the live field sprites;
 * this seam never resolves a stat stage, damage, or battle outcome.
 */
export interface SceneOnDefenseCurlConfig {
  readonly move: "DEFENSE_CURL";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationProfile: Readonly<DefenseCurlProfile>;
}

/**
 * Ingrain's visual body only. The controller supplies live attacker geometry
 * and subpriority; rooting, healing, switching, and all battle state remain
 * outside this presentation seam.
 */
export interface SceneOnIngrainConfig {
  readonly move: "INGRAIN";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationProfile: Readonly<IngrainProfile>;
}

/** Mean Look presentation only; trapping/status ownership remains battle-owned. */
export interface SceneOnMeanLookConfig {
  readonly move: "MEAN_LOOK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationProfile: Readonly<MeanLookProfile>;
}

/** Lovely Kiss presentation only; sleep/status mutation remains battle-owned. */
export interface SceneOnLovelyKissConfig {
  readonly move: "LOVELY_KISS";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationProfile: Readonly<LovelyKissProfile>;
}

export interface SceneOnAttractConfig {
  readonly move: "ATTRACT";
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

export interface SceneOnCottonSporeConfig {
  readonly move: "COTTON_SPORE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnStunSporeConfig {
  readonly move: "STUN_SPORE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnSleepPowderConfig {
  readonly move: "SLEEP_POWDER";
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

export interface SceneOnAmnesiaConfig {
  readonly move: "AMNESIA";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source BATTLER_COORD_ATTR_WIDTH/HEIGHT for the live attacker species. */
  readonly attackerPictureSize: Readonly<{ width: number; height: number }>;
}

export interface SceneOnDragonDanceConfig {
  readonly move: "DRAGON_DANCE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Live species geometry plus current allocator/order inputs. */
  readonly animationProfile: Readonly<DragonDanceProfile>;
}

export interface SceneOnPsybeamConfig {
  readonly move: "PSYBEAM";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Species-owned idle x2 is a draw input; SwayMon owns only its offset. */
  readonly targetIdleX2?: number;
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
  /** Live host front-to-back note order for equal-centerY ties (`perishSongNoteOrderFromFree`); staged = oamSlot rule. */
  readonly noteOrderSeed?: readonly number[];
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

export interface SceneOnHeatWaveConfig {
  readonly move: "HEAT_WAVE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnMistBallConfig {
  readonly move: "MIST_BALL";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

/** Narrow immutable Scene-ON seam for the legal Latios Luster Purge body. */
export interface SceneOnLusterPurgeConfig {
  readonly move: "LUSTER_PURGE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly attackerBattlerId: 0 | 1;
  readonly attackerSpriteSlot: number;
  readonly targetSpriteSlot: number;
  readonly targetInitialX2: number;
  readonly circleCenter: Readonly<{ x: number; y: number }>;
  readonly monbgCenter: Readonly<{ x: number; y: number }>;
  readonly monbgPosition: Readonly<{ x: number; y: number }>;
  readonly hitsplatCenter: Readonly<{ x: number; y: number }>;
  /** Six controller-owned pairs of visual Random2 inputs; never consumed here. */
  readonly visualRandom: Readonly<LusterPurgeVisualRandom>;
}

export interface SceneOnTailGlowConfig {
  readonly move: "TAIL_GLOW";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source X_2/Y_PIC_OFFSET coordinate for the legal carrier picture. */
  readonly attackerPictureOffset: Readonly<{ x: number; y: number }>;
}

export interface SceneOnTailWhipConfig {
  readonly move: "TAIL_WHIP";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnAgilityConfig {
  readonly move: "AGILITY";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnSwordsDanceConfig {
  readonly move: "SWORDS_DANCE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
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

/** Narrow Scene-ON seam for the source-derived Fury Swipes body. */
export interface SceneOnFurySwipesConfig {
  readonly move: "FURY_SWIPES";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

/** Narrow immutable Scene-ON seam for `Move_FLAIL`. */
export interface SceneOnFlailConfig {
  readonly move: "FLAIL";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly movePower: FlailPower;
  /** Target sprite `x2` captured by the source shake task. */
  readonly targetInitialX2: number;
  /** `InitSpritePosToAnimTarget(FALSE)` anchor for the fixed hitsplat. */
  readonly hitsplatCenter: Readonly<{ x: number; y: number }>;
  /** Two ordinary `Random2()` results dedicated to the fixed hitsplat. */
  readonly visualRandom: Readonly<FlailVisualRandom>;
}

export interface SceneOnAstonishConfig {
  readonly move: "ASTONISH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source mon-pic coordinate consumed by SetBattlerSpriteYOffsetFromYScale. */
  readonly targetPictureYOffset: number;
  /** Target species' enemy elevation (opponent OBJ origin shift; 0 on the player side). */
  readonly targetElevation?: number;
  /** Four masked Random2 outputs produced before the two callback bodies. */
  readonly dropletRandom: readonly [
    AstonishDropletRandom,
    AstonishDropletRandom,
  ];
}

export interface SceneOnFakeOutConfig {
  readonly move: "FAKE_OUT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source mon-pic coordinate consumed by SetBattlerSpriteYOffsetFromYScale. */
  readonly targetPictureYOffset: number;
}

export interface SceneOnSubstituteConfig {
  readonly move: "SUBSTITUTE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnRazorLeafConfig {
  readonly move: "RAZOR_LEAF";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnMagicalLeafConfig {
  readonly move: "MAGICAL_LEAF";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Species-idle offset measured before ShakeMon2 takes ownership. */
  readonly targetIdleX2: number;
}

export interface SceneOnIronTailConfig {
  readonly move: "IRON_TAIL";
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

export interface SceneOnSteelWingConfig {
  readonly move: "STEEL_WING";
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

/** Narrow Scene-ON seam for live power-selected Magnitude presentation. */
export interface SceneOnMagnitudeConfig {
  readonly move: "MAGNITUDE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<MagnitudeLiveInputs>;
}

/** Narrow Scene-ON seam for the source-relative Sunny Day component reducer. */
export interface SceneOnSunnyDayConfig {
  readonly move: "SUNNY_DAY";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Pick<SunnyDayLiveInputs, "raySlots" | "spriteOrder" | "paletteBanks">>;
}

/** Narrow Scene-ON seam for Uproar's move-owned live allocator inputs. */
export interface SceneOnUproarConfig {
  readonly move: "UPROAR";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<UproarLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies" | "attackerYDelta">>;
}

/** Narrow Scene-ON seam for Rapid Spin's source-relative component state. */
export interface SceneOnRapidSpinConfig {
  readonly move: "RAPID_SPIN";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<RapidSpinLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerCenter" | "targetCenter">>;
}

/** Narrow Scene-ON seam for Foresight's source-relative magnifying glass. */
export interface SceneOnForesightConfig {
  readonly move: "FORESIGHT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<ForesightLiveInputs,
    "targetSide" | "targetSpecies" | "attackerSpecies">>;
}

/** Narrow Scene-ON seam for Spider Web's source-relative visual state. */
export interface SceneOnSpiderWebConfig {
  readonly move: "SPIDER_WEB";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<SpiderWebLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerCenter" | "targetCenter">>;
}

/** Narrow Scene-ON seam for Petal Dance's source-relative sprite/task body. */
export interface SceneOnPetalDanceConfig {
  readonly move: "PETAL_DANCE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Live allocator, picture-origin, matrix, and monbg facts only. */
  readonly animationInputs: Readonly<Omit<PetalDanceLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerBattlePositionCenter" | "targetBattlePositionCenter" | "targetSpriteOrigin">>;
}

/** Narrow Scene-ON seam for Sky Uppercut's source-relative callback body. */
export interface SceneOnSkyUppercutConfig {
  readonly move: "SKY_UPPERCUT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Live picture origin, allocator slots, matrices, monbg, and BG3 facts only. */
  readonly animationInputs: Readonly<Omit<SkyUppercutLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerCenter" | "targetCenter">>;
}

/**
 * Narrow state-only Scene-ON seam for MOVE_DESTINY_BOND.  It accepts current
 * battler geometry/order/allocator facts and returns the reducer view; no
 * framebuffer or canonical-party selection is carried through this seam.
 */
export interface SceneOnDestinyBondConfig {
  readonly move: "DESTINY_BOND";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<DestinyBondLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerCenter" | "targetCenter">>;
}

/**
 * Narrow semantic Scene-ON seam for MOVE_WATER_PULSE.  The caller retains
 * allocator, monbg, register, and source-origin ownership; this injects only
 * live battler identity and current picture centers.
 */
export interface SceneOnWaterPulseConfig {
  readonly move: "WATER_PULSE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<WaterPulseLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerCenter" | "targetCenter">>;
}

/**
 * Narrow Scene-ON seam for MOVE_DIG.  The body is selected by the live
 * two-turn animation scheduler; all allocator, matrix, monbg and geometry
 * facts remain caller-owned and gameplay state stays outside this seam.
 */
export interface SceneOnDigConfig {
  readonly move: "DIG";
  readonly body: "setup" | "unleash";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<Omit<DigLiveInputs,
    "body" | "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerCenter" | "targetCenter">>;
}

/** Narrow Scene-ON seam for the composed, source-relative Eruption body. */
export interface SceneOnEruptionConfig {
  readonly move: "ERUPTION";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Component inputs are live allocator/geometry facts, never a species gate. */
  readonly animationProfile: Readonly<EruptionAnimationProfile>;
}

/**
 * Narrow Scene-ON seam for Water Spout's live, HP-tiered component plan.
 * The caller owns HP and allocator facts; this presentation config neither
 * changes HP nor consults a retained carrier/evidence pair.
 */
export interface SceneOnWaterSpoutConfig {
  readonly move: "WATER_SPOUT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationInputs: Readonly<WaterSpoutLiveInputs>;
  /** Target OBJ idle x2 (tracked front idle rest), held until the HorizontalShake task ends (age 119). */
  readonly targetIdleX2?: number;
}

/** Narrow Scene-ON seam for the source-relative Sand Tomb vortex body. */
export interface SceneOnSandTombConfig {
  readonly move: "SAND_TOMB";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Live allocator, source geometry and initial OAM facts for this animation. */
  readonly animationProfile: Readonly<SandTombAnimationProfile>;
  /** Live attacker front-idle x2/y2 rest (no Sand Tomb task writes the attacker's x2/y2); absent = zero. */
  readonly attackerIdleRest?: Readonly<{ x2: number; y2: number }>;
}

/** Narrow Scene-ON seam for the source-relative Trick Item Bag body. */
export interface SceneOnTrickConfig {
  readonly move: "TRICK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Live allocator/task slots only; species and item resolution remain external. */
  readonly animationProfile: Readonly<TrickAnimationProfile>;
}

/** One naturally scheduled pointer-owned Rock Blast visual body. */
export interface SceneOnRockBlastBodyConfig {
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly moveTextVisible: boolean;
  /** Live geometry, allocator, and immutable stage facts; never a retained-pair selector. */
  readonly animationProfile: Readonly<RockBlastAnimationProfile>;
}

/** Natural visual bodies only; multi-hit resolution remains external. */
export interface SceneOnRockBlastConfig {
  readonly move: "ROCK_BLAST";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly bodies: readonly [SceneOnRockBlastBodyConfig, ...SceneOnRockBlastBodyConfig[]];
}

/** Narrow Scene-ON seam for Move_SWIFT's source-relative visual body. */
export interface SceneOnSwiftConfig {
  readonly move: "SWIFT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationProfile: Readonly<SwiftAnimationProfile>;
}

/** Narrow Scene-ON seam for the source-relative Ice Beam reducer/compositor. */
export interface SceneOnIceBeamConfig {
  readonly move: "ICE_BEAM";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly animationProfile: Readonly<IceBeamAnimationProfile>;
  /** Target OBJ idle x2 (tracked front idle rest), kept on the OBJ until monbg takes over (age 39). */
  readonly targetIdleX2?: number;
}

/** Narrow Scene-ON Fissure seam; OHKO resolution and RNG stay external. */
export interface SceneOnFissureConfig {
  readonly move: "FISSURE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source target x2 retained until HorizontalShake's first visible write. */
  readonly initialTargetX2: number;
}

export interface SceneOnHardenConfig {
  readonly move: "HARDEN";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source battler sprite `x/y`, used to initialize BG1_X/BG1_Y. */
  readonly attackerSpriteCenter: Readonly<{ x: number; y: number }>;
}

export interface SceneOnIronDefenseConfig {
  readonly move: "IRON_DEFENSE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source battler sprite `x/y`, used to initialize BG1_X/BG1_Y. */
  readonly attackerSpriteCenter: Readonly<{ x: number; y: number }>;
}

export interface SceneOnFlashConfig {
  readonly move: "FLASH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnFacadeConfig {
  readonly move: "FACADE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Attacker `MON_PIC_HEIGHT - 2*yDelta` for the squish y2 offset. */
  readonly battlerHeight: number;
}

export interface SceneOnMinimizeConfig {
  readonly move: "MINIMIZE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Attacker `MON_PIC_HEIGHT - 2*yDelta` (40 for GRIMER). */
  readonly battlerHeight: number;
}

export interface SceneOnAcidArmorConfig {
  readonly move: "ACID_ARMOR";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
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

export interface SceneOnConfuseRayConfig {
  readonly move: "CONFUSE_RAY";
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

/** Source-relative MOVE_FIRE_SPIN seam; battle resolution remains external. */
export interface SceneOnFireSpinConfig {
  readonly move: "FIRE_SPIN";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnMetalClawConfig {
  readonly move: "METAL_CLAW";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source battler sprite `x/y`, used to initialize BG1_X/BG1_Y. */
  readonly attackerSpriteCenter: Readonly<{ x: number; y: number }>;
}

export interface SceneOnCrushClawConfig {
  readonly move: "CRUSH_CLAW";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnTakeDownConfig {
  readonly move: "TAKE_DOWN";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnCrunchConfig {
  readonly move: "CRUNCH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnSlashConfig {
  readonly move: "SLASH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnLickConfig {
  readonly move: "LICK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnCounterConfig {
  readonly move: "COUNTER";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

/**
 * Narrow Scene-ON seam for the complete source-derived Thrash body.  The
 * callback's three four-word `Random2()` groups are immutable staging input;
 * this presentation layer neither derives nor advances battle RNG.
 */
export interface SceneOnThrashConfig {
  readonly move: "THRASH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly fistRandom: readonly [
    ThrashRandomWords,
    ThrashRandomWords,
    ThrashRandomWords,
  ];
  /** Live field: the target's GetBattlerSpriteCoordAttr width/height (staged ONIX: 56 x 64). */
  readonly targetDimensions?: Readonly<{ width: number; height: number }>;
  /** Live field: the attacker's pic-coords yOffset for the affine Y anchor (staged TAUROS: back 13, front 0). */
  readonly attackerPicYOffset?: number;
}

/** Narrow Scene-ON seam for Double Kick's presentation-only script body. */
export interface SceneOnDoubleKickConfig {
  readonly move: "DOUBLE_KICK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly targetDimensions: Readonly<{ width: number; height: number }>;
  readonly fistRandom: DoubleKickRandomWords;
}

/** The controller supplies the hit index; this seam owns only its selected visual branch. */
export interface SceneOnTripleKickConfig {
  readonly move: "TRIPLE_KICK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly moveTurn: TripleKickMoveTurn;
}

/** The real multi-hit controller supplies moveTurn; this seam only selects its visual branch. */
export interface SceneOnDoubleSlapConfig {
  readonly move: "DOUBLE_SLAP";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly moveTurn: DoubleSlapMoveTurn;
}

/** The real multi-hit controller supplies moveTurn; this seam only selects its visual branch. */
export interface SceneOnCometPunchConfig {
  readonly move: "COMET_PUNCH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly moveTurn: CometPunchMoveTurn;
}

/** Typed staging seam only; a later draw case supplies the live target idle x2. */
export interface SceneOnCrabHammerConfig {
  readonly move: "CRABHAMMER";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly targetIdleX2: number;
}

export interface SceneOnDoubleEdgeConfig {
  readonly move: "DOUBLE_EDGE";
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

export interface SceneOnGrassWhistleConfig {
  readonly move: "GRASS_WHISTLE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

/** Narrow Scene-ON seam for Teeter Dance's fast-note and live-battler body. */
export interface SceneOnTeeterDanceConfig {
  readonly move: "TEETER_DANCE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** Source `gSprites[gBattlerSpriteIds[attacker]]` x/y before the task. */
  readonly attackerSpriteCenter: Readonly<TeeterDancePoint>;
  /** Live personality used by source-derived species art such as Spinda spots. */
  readonly attackerPersonality: number;
}

/** Narrow Scene-ON seam for Belly Drum's alternating hands and slow notes. */
export interface SceneOnBellyDrumConfig {
  readonly move: "BELLY_DRUM";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /** `SetSpriteCoordsToAnimAttackerCoords` followed by the note's +8 y. */
  readonly attackerNoteOrigin: Readonly<BellyDrumPoint>;
}

export interface SceneOnDetectConfig {
  readonly move: "DETECT";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  /**
   * `SetSpriteCoordsToAnimAttackerCoords(attacker)` — the sparkle anchors to
   * the attacker's picture coordinate (X_2/Y_PIC), then `AnimSpinningSparkle`
   * shifts it +20 on the player side / -20 on the opponent side, and -20 y.
   */
  readonly attackerPictureOffset: Readonly<{ x: number; y: number }>;
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
  | SceneOnRockThrowConfig
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
  | SceneOnMeteorMashConfig
  | SceneOnFlameWheelConfig
  | SceneOnBindConfig
  | SceneOnWrapConfig
  | SceneOnEmberConfig
  | SceneOnDragonRageConfig
  | SceneOnShadowPunchConfig
  | SceneOnGrowthConfig
  | SceneOnRecoverConfig
  | SceneOnSoftBoiledConfig
  | SceneOnMoonlightConfig
  | SceneOnPresentConfig
  | SceneOnAbsorbConfig
  | SceneOnLeechSeedConfig
  | SceneOnMegaDrainConfig
  | SceneOnGigaDrainConfig
  | SceneOnDreamEaterConfig
  | SceneOnPainSplitConfig
  | SceneOnReflectConfig
  | SceneOnBrickBreakConfig
  | SceneOnLightScreenConfig
  | SceneOnBarrierConfig
  | SceneOnMagicCoatConfig
  | SceneOnProtectConfig
  | SceneOnDisableConfig
  | SceneOnHazeConfig
  | SceneOnSpiteConfig
  | SceneOnMementoConfig
  | SceneOnNightShadeConfig
  | SceneOnMirrorCoatConfig
  | SceneOnSynthesisConfig
  | SceneOnCosmicPowerConfig
  | SceneOnAncientPowerConfig
  | SceneOnAromatherapyConfig
  | SceneOnWishConfig
  | SceneOnMilkDrinkConfig
  | SceneOnRefreshConfig
  | SceneOnHealBellConfig
  | SceneOnFireBlastConfig
  | SceneOnRolloutConfig
  | SceneOnRainDanceConfig
  | SceneOnSupersonicConfig
  | SceneOnMetalSoundConfig
  | SceneOnScreechConfig
  | SceneOnSafeguardConfig
  | SceneOnGrudgeConfig
  | SceneOnHiddenPowerConfig
  | SceneOnSmellingSaltConfig
  | SceneOnRecycleConfig
  | SceneOnLeerConfig
  | SceneOnWaterGunConfig
  | SceneOnAcidConfig
  | SceneOnSludgeConfig
  | SceneOnSludgeBombConfig
  | SceneOnPoisonFangConfig
  | SceneOnHyperFangConfig
  | SceneOnSuperFangConfig
  | SceneOnMegaPunchConfig
  | SceneOnMegaKickConfig
  | SceneOnFocusPunchConfig
  | SceneOnMachPunchConfig
  | SceneOnPsychUpConfig
  | SceneOnHyperVoiceConfig
  | SceneOnSnoreConfig
  | SceneOnSkyAttackConfig
  | SceneOnShockWaveConfig
  | SceneOnOverheatConfig
  | SceneOnOutrageConfig
  | SceneOnSilverWindConfig
  | SceneOnSolarBeamConfig
  | SceneOnHiJumpKickConfig
  | SceneOnRollingKickConfig
  | SceneOnLowKickConfig
  | SceneOnKarateChopConfig
  | SceneOnBatonPassConfig
  | SceneOnRolePlayConfig
  | SceneOnStompConfig
  | SceneOnViceGripConfig
  | SceneOnGuillotineConfig
  | SceneOnBiteConfig
  | SceneOnHeadbuttConfig
  | SceneOnSubmissionConfig
  | SceneOnDrillPeckConfig
  | SceneOnWhirlwindConfig
  | SceneOnBlockConfig
  | SceneOnRockTombConfig
  | SceneOnBodySlamConfig
  | SceneOnSlamConfig
  | SceneOnSecretPowerConfig
  | SceneOnTwineedleConfig
  | SceneOnPoisonStingConfig
  | SceneOnSpikeCannonConfig
  | SceneOnPinMissileConfig
  | SceneOnSonicBoomConfig
  | SceneOnAirCutterConfig
  | SceneOnSheerColdConfig
  | SceneOnSmogConfig
  | SceneOnBonemerangConfig
  | SceneOnSignalBeamConfig
  | SceneOnNightmareConfig
  | SceneOnSkillSwapConfig
  | SceneOnPursuitConfig
  | SceneOnPsywaveConfig
  | SceneOnExtrasensoryConfig
  | SceneOnWillOWispConfig
  | SceneOnMegaHornConfig
  | SceneOnSuperpowerConfig
  | SceneOnRevengeConfig
  | SceneOnSpitUpConfig
  | SceneOnFuryCutterConfig
  | SceneOnIceBallConfig
  | SceneOnCurseConfig
  | SceneOnReturnConfig
  | SceneOnStruggleConfig
  | SceneOnFlatterConfig
  | SceneOnRazorWindConfig
  | SceneOnHornDrillConfig
  | SceneOnAuroraBeamConfig
  | SceneOnTriAttackConfig
  | SceneOnHyperBeamConfig
  | SceneOnThunderboltConfig
  | SceneOnZapCannonConfig
  | SceneOnSmokescreenConfig
  | SceneOnOctazookaConfig
  | SceneOnSpikesConfig
  | SceneOnMudShotConfig
  | SceneOnHydroPumpConfig
  | SceneOnWhirlpoolConfig
  | SceneOnBubbleBeamConfig
  | SceneOnCrossChopConfig
  | SceneOnLeafBladeConfig
  | SceneOnFocusEnergyConfig
  | SceneOnEndureConfig
  | SceneOnReversalConfig
  | SceneOnSwallowConfig
  | SceneOnStockpileConfig
  | SceneOnSwaggerConfig
  | SceneOnFrustrationConfig
  | SceneOnDiveConfig
  | SceneOnSeismicTossConfig
  | SceneOnBulkUpConfig
  | SceneOnTauntConfig
  | SceneOnTormentConfig
  | SceneOnScaryFaceConfig
  | SceneOnGlareConfig
  | SceneOnSparkConfig
  | SceneOnThunderWaveConfig
  | SceneOnThunderConfig
  | SceneOnIcyWindConfig
  | SceneOnBlizzardConfig
  | SceneOnSurfConfig
  | SceneOnCharmConfig
  | SceneOnCovetConfig
  | SceneOnFakeTearsConfig
  | SceneOnTickleConfig
  | SceneOnMetronomeConfig
  | SceneOnFollowMeConfig
  | SceneOnRestConfig
  | SceneOnSleepTalkConfig
  | SceneOnHowlConfig
  | SceneOnYawnConfig
  | SceneOnRoarConfig
  | SceneOnSweetKissConfig
  | SceneOnSweetScentConfig
  | SceneOnDefenseCurlConfig
  | SceneOnIngrainConfig
  | SceneOnMeanLookConfig
  | SceneOnLovelyKissConfig
  | SceneOnAttractConfig
  | SceneOnSporeConfig
  | SceneOnCottonSporeConfig
  | SceneOnStunSporeConfig
  | SceneOnSleepPowderConfig
  | SceneOnHypnosisConfig
  | SceneOnAmnesiaConfig
  | SceneOnDragonDanceConfig
  | SceneOnPsybeamConfig
  | SceneOnPerishSongConfig
  | SceneOnNeedleArmConfig
  | SceneOnSandstormConfig
  | SceneOnHeatWaveConfig
  | SceneOnMistBallConfig
  | SceneOnLusterPurgeConfig
  | SceneOnTailGlowConfig
  | SceneOnTailWhipConfig
  | SceneOnAgilityConfig
  | SceneOnSwordsDanceConfig
  | SceneOnSelfDestructConfig
  | SceneOnExplosionConfig
  | SceneOnDynamicPunchConfig
  | SceneOnDizzyPunchConfig
  | SceneOnFurySwipesConfig
  | SceneOnFlailConfig
  | SceneOnAstonishConfig
  | SceneOnFakeOutConfig
  | SceneOnSubstituteConfig
  | SceneOnRazorLeafConfig
  | SceneOnMagicalLeafConfig
  | SceneOnPoisonTailConfig
  | SceneOnSteelWingConfig
  | SceneOnIronTailConfig
  | SceneOnCrushClawConfig
  | SceneOnTakeDownConfig
  | SceneOnCrunchConfig
  | SceneOnSlashConfig
  | SceneOnLickConfig
  | SceneOnCounterConfig
  | SceneOnThrashConfig
  | SceneOnDoubleKickConfig
  | SceneOnTripleKickConfig
  | SceneOnDoubleSlapConfig
  | SceneOnCometPunchConfig
  | SceneOnCrabHammerConfig
  | SceneOnDoubleEdgeConfig
  | SceneOnToxicConfig
  | SceneOnEarthquakeConfig
  | SceneOnMagnitudeConfig
  | SceneOnSunnyDayConfig
  | SceneOnUproarConfig
  | SceneOnRapidSpinConfig
  | SceneOnForesightConfig
  | SceneOnSpiderWebConfig
  | SceneOnPetalDanceConfig
  | SceneOnSkyUppercutConfig
  | SceneOnDestinyBondConfig
  | SceneOnWaterPulseConfig
  | SceneOnDigConfig
  | SceneOnEruptionConfig
  | SceneOnWaterSpoutConfig
  | SceneOnSandTombConfig
  | SceneOnTrickConfig
  | SceneOnRockBlastConfig
  | SceneOnSwiftConfig
  | SceneOnIceBeamConfig
  | SceneOnFissureConfig
  | SceneOnHardenConfig
  | SceneOnIronDefenseConfig
  | SceneOnFlashConfig
  | SceneOnFacadeConfig
  | SceneOnMinimizeConfig
  | SceneOnAcidArmorConfig
  | SceneOnCalmMindConfig
  | SceneOnShadowBallConfig
  | SceneOnConfuseRayConfig
  | SceneOnEncoreConfig
  | SceneOnDragonClawConfig
  | SceneOnFireSpinConfig
  | SceneOnMetalClawConfig
  | SceneOnSingConfig
  | SceneOnGrassWhistleConfig
  | SceneOnTeeterDanceConfig
  | SceneOnBellyDrumConfig
  | SceneOnDetectConfig
  | SceneOnFutureSightConfig
  | SceneOnConfusionConfig
  | SceneOnPsychicConfig
  | SceneOnKnockOffConfig
  | SceneOnRainDanceConfig
  | SceneOnHailConfig;

export interface SceneOnMovePresentationState<
  TConfig extends SceneOnMoveConfig | SceneOnScaryFaceConfig | SceneOnAbsorbConfig
    | SceneOnLeechSeedConfig
    | SceneOnMegaDrainConfig
    | SceneOnGigaDrainConfig
    | SceneOnDreamEaterConfig
    | SceneOnPainSplitConfig
    | SceneOnBiteConfig
    = SceneOnMoveConfig,
> {
  readonly age: number;
  readonly config: TConfig;
  /**
   * Presentation claim flag (S10A prep46): the live seam resolved this command's sprite order through a words-dependent order unit's
   * deferred lend (an earlier Sand-Attack / Mud-Slap / Rain Dance / RAIN_CONTINUES carried with its surrogate presentation words), so this
   * command is faithful random (ANIMATION_VERIFICATION.md D3), never oracle-exact, whatever its adapter's own claim. Not a render input.
   */
  readonly faithfulRandomHistory?: true;
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
export type SceneOnSoftBoiledPresentationState =
  SceneOnMovePresentationState<SceneOnSoftBoiledConfig>;
export type SceneOnEruptionPresentationState =
  SceneOnMovePresentationState<SceneOnEruptionConfig>;
export type SceneOnWaterSpoutPresentationState =
  SceneOnMovePresentationState<SceneOnWaterSpoutConfig>;
export type SceneOnSandTombPresentationState =
  SceneOnMovePresentationState<SceneOnSandTombConfig>;
export type SceneOnTrickPresentationState =
  SceneOnMovePresentationState<SceneOnTrickConfig>;
export type SceneOnRockBlastPresentationState =
  SceneOnMovePresentationState<SceneOnRockBlastConfig>;
export type SceneOnSwiftPresentationState =
  SceneOnMovePresentationState<SceneOnSwiftConfig>;
export type SceneOnRazorWindPresentationState =
  SceneOnMovePresentationState<SceneOnRazorWindConfig>;
export type SceneOnHornDrillPresentationState =
  SceneOnMovePresentationState<SceneOnHornDrillConfig>;
export type SceneOnAuroraBeamPresentationState =
  SceneOnMovePresentationState<SceneOnAuroraBeamConfig>;
export type SceneOnTriAttackPresentationState =
  SceneOnMovePresentationState<SceneOnTriAttackConfig>;
export type SceneOnIceBeamPresentationState =
  SceneOnMovePresentationState<SceneOnIceBeamConfig>;
export type SceneOnDizzyPunchPresentationState =
  SceneOnMovePresentationState<SceneOnDizzyPunchConfig>;
export type SceneOnRazorLeafPresentationState =
  SceneOnMovePresentationState<SceneOnRazorLeafConfig>;
export type SceneOnMagicalLeafPresentationState =
  SceneOnMovePresentationState<SceneOnMagicalLeafConfig>;
export type SceneOnLeafBladePresentationState =
  SceneOnMovePresentationState<SceneOnLeafBladeConfig>;
export type SceneOnTauntPresentationState =
  SceneOnMovePresentationState<SceneOnTauntConfig>;
export type SceneOnFrustrationPresentationState =
  SceneOnMovePresentationState<SceneOnFrustrationConfig>;
export type SceneOnDivePresentationState =
  SceneOnMovePresentationState<SceneOnDiveConfig>;
export type SceneOnScaryFacePresentationState =
  SceneOnMovePresentationState<SceneOnScaryFaceConfig>;
export type SceneOnGlarePresentationState =
  SceneOnMovePresentationState<SceneOnGlareConfig>;
export type SceneOnAbsorbPresentationState =
  SceneOnMovePresentationState<SceneOnAbsorbConfig>;
export type SceneOnLeechSeedPresentationState =
  SceneOnMovePresentationState<SceneOnLeechSeedConfig>;
export type SceneOnMegaDrainPresentationState =
  SceneOnMovePresentationState<SceneOnMegaDrainConfig>;
export type SceneOnGigaDrainPresentationState =
  SceneOnMovePresentationState<SceneOnGigaDrainConfig>;
export type SceneOnDreamEaterPresentationState =
  SceneOnMovePresentationState<SceneOnDreamEaterConfig>;
export type SceneOnPainSplitPresentationState =
  SceneOnMovePresentationState<SceneOnPainSplitConfig>;
export type SceneOnMoonlightPresentationState =
  SceneOnMovePresentationState<SceneOnMoonlightConfig>;
export type SceneOnPresentPresentationState =
  SceneOnMovePresentationState<SceneOnPresentConfig>;
export type SceneOnAromatherapyPresentationState =
  SceneOnMovePresentationState<SceneOnAromatherapyConfig>;
export type SceneOnReflectPresentationState =
  SceneOnMovePresentationState<SceneOnReflectConfig>;
export type SceneOnBrickBreakPresentationState =
  SceneOnMovePresentationState<SceneOnBrickBreakConfig>;
export type SceneOnLightScreenPresentationState =
  SceneOnMovePresentationState<SceneOnLightScreenConfig>;
export type SceneOnBarrierPresentationState =
  SceneOnMovePresentationState<SceneOnBarrierConfig>;
export type SceneOnMagicCoatPresentationState =
  SceneOnMovePresentationState<SceneOnMagicCoatConfig>;
export type SceneOnProtectPresentationState =
  SceneOnMovePresentationState<SceneOnProtectConfig>;
export type SceneOnHazePresentationState =
  SceneOnMovePresentationState<SceneOnHazeConfig>;
export type SceneOnSpitePresentationState =
  SceneOnMovePresentationState<SceneOnSpiteConfig>;
export type SceneOnMementoPresentationState =
  SceneOnMovePresentationState<SceneOnMementoConfig>;
export type SceneOnNightShadePresentationState =
  SceneOnMovePresentationState<SceneOnNightShadeConfig>;
export type SceneOnMirrorCoatPresentationState =
  SceneOnMovePresentationState<SceneOnMirrorCoatConfig>;
export type SceneOnSparkPresentationState =
  SceneOnMovePresentationState<SceneOnSparkConfig>;
export type SceneOnThunderWavePresentationState =
  SceneOnMovePresentationState<SceneOnThunderWaveConfig>;
export type SceneOnThunderPresentationState =
  SceneOnMovePresentationState<SceneOnThunderConfig>;
export type SceneOnIcyWindPresentationState =
  SceneOnMovePresentationState<SceneOnIcyWindConfig>;
export type SceneOnBlizzardPresentationState =
  SceneOnMovePresentationState<SceneOnBlizzardConfig>;
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
export type SceneOnSleepTalkPresentationState =
  SceneOnMovePresentationState<SceneOnSleepTalkConfig>;
export type SceneOnHowlPresentationState =
  SceneOnMovePresentationState<SceneOnHowlConfig>;
export type SceneOnYawnPresentationState =
  SceneOnMovePresentationState<SceneOnYawnConfig>;
export type SceneOnRoarPresentationState =
  SceneOnMovePresentationState<SceneOnRoarConfig>;
export type SceneOnSweetKissPresentationState =
  SceneOnMovePresentationState<SceneOnSweetKissConfig>;
export type SceneOnSweetScentPresentationState =
  SceneOnMovePresentationState<SceneOnSweetScentConfig>;
export type SceneOnDefenseCurlPresentationState =
  SceneOnMovePresentationState<SceneOnDefenseCurlConfig>;
export type SceneOnIngrainPresentationState =
  SceneOnMovePresentationState<SceneOnIngrainConfig>;
export type SceneOnMeanLookPresentationState =
  SceneOnMovePresentationState<SceneOnMeanLookConfig>;
export type SceneOnSmellingSaltPresentationState =
  SceneOnMovePresentationState<SceneOnSmellingSaltConfig>;
export type SceneOnRecyclePresentationState =
  SceneOnMovePresentationState<SceneOnRecycleConfig>;
export type SceneOnLovelyKissPresentationState =
  SceneOnMovePresentationState<SceneOnLovelyKissConfig>;
export type SceneOnOctazookaPresentationState =
  SceneOnMovePresentationState<SceneOnOctazookaConfig>;
export type SceneOnSpikesPresentationState =
  SceneOnMovePresentationState<SceneOnSpikesConfig>;
export type SceneOnAttractPresentationState =
  SceneOnMovePresentationState<SceneOnAttractConfig>;
export type SceneOnSporePresentationState =
  SceneOnMovePresentationState<SceneOnSporeConfig>;
export type SceneOnCottonSporePresentationState =
  SceneOnMovePresentationState<SceneOnCottonSporeConfig>;
export type SceneOnStunSporePresentationState =
  SceneOnMovePresentationState<SceneOnStunSporeConfig>;
export type SceneOnSleepPowderPresentationState =
  SceneOnMovePresentationState<SceneOnSleepPowderConfig>;
export type SceneOnHypnosisPresentationState =
  SceneOnMovePresentationState<SceneOnHypnosisConfig>;
export type SceneOnAmnesiaPresentationState =
  SceneOnMovePresentationState<SceneOnAmnesiaConfig>;
export type SceneOnDragonDancePresentationState =
  SceneOnMovePresentationState<SceneOnDragonDanceConfig>;
export type SceneOnSunnyDayPresentationState =
  SceneOnMovePresentationState<SceneOnSunnyDayConfig>;
export type SceneOnUproarPresentationState =
  SceneOnMovePresentationState<SceneOnUproarConfig>;
export type SceneOnRapidSpinPresentationState =
  SceneOnMovePresentationState<SceneOnRapidSpinConfig>;
export type SceneOnForesightPresentationState =
  SceneOnMovePresentationState<SceneOnForesightConfig>;
export type SceneOnSpiderWebPresentationState =
  SceneOnMovePresentationState<SceneOnSpiderWebConfig>;
export type SceneOnPetalDancePresentationState =
  SceneOnMovePresentationState<SceneOnPetalDanceConfig>;
export type SceneOnSkyUppercutPresentationState =
  SceneOnMovePresentationState<SceneOnSkyUppercutConfig>;
export type SceneOnDestinyBondPresentationState =
  SceneOnMovePresentationState<SceneOnDestinyBondConfig>;
export type SceneOnAirCutterPresentationState =
  SceneOnMovePresentationState<SceneOnAirCutterConfig>;
export type SceneOnSheerColdPresentationState =
  SceneOnMovePresentationState<SceneOnSheerColdConfig>;
export type SceneOnSmogPresentationState =
  SceneOnMovePresentationState<SceneOnSmogConfig>;
export type SceneOnBonemerangPresentationState =
  SceneOnMovePresentationState<SceneOnBonemerangConfig>;
export type SceneOnMachPunchPresentationState =
  SceneOnMovePresentationState<SceneOnMachPunchConfig>;
export type SceneOnPsychUpPresentationState =
  SceneOnMovePresentationState<SceneOnPsychUpConfig>;
export type SceneOnHyperVoicePresentationState =
  SceneOnMovePresentationState<SceneOnHyperVoiceConfig>;
export type SceneOnSnorePresentationState =
  SceneOnMovePresentationState<SceneOnSnoreConfig>;
export type SceneOnSkyAttackPresentationState =
  SceneOnMovePresentationState<SceneOnSkyAttackConfig>;
export type SceneOnShockWavePresentationState =
  SceneOnMovePresentationState<SceneOnShockWaveConfig>;
export type SceneOnOverheatPresentationState =
  SceneOnMovePresentationState<SceneOnOverheatConfig>;
export type SceneOnOutragePresentationState =
  SceneOnMovePresentationState<SceneOnOutrageConfig>;
export type SceneOnSilverWindPresentationState =
  SceneOnMovePresentationState<SceneOnSilverWindConfig>;
export type SceneOnSignalBeamPresentationState =
  SceneOnMovePresentationState<SceneOnSignalBeamConfig>;
export type SceneOnNightmarePresentationState =
  SceneOnMovePresentationState<SceneOnNightmareConfig>;
export type SceneOnSkillSwapPresentationState =
  SceneOnMovePresentationState<SceneOnSkillSwapConfig>;
export type SceneOnPursuitPresentationState =
  SceneOnMovePresentationState<SceneOnPursuitConfig>;
export type SceneOnPsywavePresentationState =
  SceneOnMovePresentationState<SceneOnPsywaveConfig>;
export type SceneOnExtrasensoryPresentationState =
  SceneOnMovePresentationState<SceneOnExtrasensoryConfig>;
export type SceneOnWillOWispPresentationState =
  SceneOnMovePresentationState<SceneOnWillOWispConfig>;
export type SceneOnMegaHornPresentationState =
  SceneOnMovePresentationState<SceneOnMegaHornConfig>;
export type SceneOnSuperpowerPresentationState =
  SceneOnMovePresentationState<SceneOnSuperpowerConfig>;
export type SceneOnRevengePresentationState =
  SceneOnMovePresentationState<SceneOnRevengeConfig>;
export type SceneOnSpitUpPresentationState =
  SceneOnMovePresentationState<SceneOnSpitUpConfig>;
export type SceneOnFuryCutterPresentationState =
  SceneOnMovePresentationState<SceneOnFuryCutterConfig>;
export type SceneOnIceBallPresentationState =
  SceneOnMovePresentationState<SceneOnIceBallConfig>;
export type SceneOnCursePresentationState =
  SceneOnMovePresentationState<SceneOnCurseConfig>;
export type SceneOnReturnPresentationState =
  SceneOnMovePresentationState<SceneOnReturnConfig>;
export type SceneOnFlatterPresentationState =
  SceneOnMovePresentationState<SceneOnFlatterConfig>;
export type SceneOnWaterPulsePresentationState =
  SceneOnMovePresentationState<SceneOnWaterPulseConfig>;
export type SceneOnDigPresentationState =
  SceneOnMovePresentationState<SceneOnDigConfig>;
export type SceneOnPsybeamPresentationState =
  SceneOnMovePresentationState<SceneOnPsybeamConfig>;
export type SceneOnBlockPresentationState =
  SceneOnMovePresentationState<SceneOnBlockConfig>;
export type SceneOnRockTombPresentationState =
  SceneOnMovePresentationState<SceneOnRockTombConfig>;
export type SceneOnPerishSongPresentationState =
  SceneOnMovePresentationState<SceneOnPerishSongConfig>;
export type SceneOnNeedleArmPresentationState =
  SceneOnMovePresentationState<SceneOnNeedleArmConfig>;
export type SceneOnSandstormPresentationState =
  SceneOnMovePresentationState<SceneOnSandstormConfig>;
export type SceneOnHeatWavePresentationState =
  SceneOnMovePresentationState<SceneOnHeatWaveConfig>;
export type SceneOnMistBallPresentationState =
  SceneOnMovePresentationState<SceneOnMistBallConfig>;
export type SceneOnLusterPurgePresentationState =
  SceneOnMovePresentationState<SceneOnLusterPurgeConfig>;
export type SceneOnTailGlowPresentationState =
  SceneOnMovePresentationState<SceneOnTailGlowConfig>;
export type SceneOnTailWhipPresentationState =
  SceneOnMovePresentationState<SceneOnTailWhipConfig>;
export type SceneOnAgilityPresentationState =
  SceneOnMovePresentationState<SceneOnAgilityConfig>;
export type SceneOnLeerPresentationState =
  SceneOnMovePresentationState<SceneOnLeerConfig>;

export interface SceneOnSupersonicView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly rings: readonly SupersonicRingSprite[];
}

export interface SceneOnMetalSoundView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly displayedAttackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetMonbg: boolean;
  readonly shakeTaskActive: boolean;
  readonly waves: readonly MetalSoundWaveSprite[];
  readonly soundEvents: readonly {
    readonly age: number;
    readonly song: "SE_M_SCREECH";
    readonly pan: number;
  }[];
}

export interface SceneOnScreechView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly active: boolean;
  readonly scriptActive: boolean;
  readonly sourceOffset: number | null;
  readonly shakeTaskActive: boolean;
  readonly swayTaskActive: boolean;
  readonly targetOffsetOverwrite: boolean;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly displayedAttackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly rings: readonly ScreechRingSprite[];
  readonly soundEvents: readonly {
    readonly age: number;
    readonly song: "SE_M_SCREECH";
    readonly pan: number;
  }[];
}

export interface SceneOnSafeguardView extends SafeguardState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnGrudgeView extends GrudgeState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnHiddenPowerView extends HiddenPowerState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSmellingSaltView extends SmellingSaltState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnRecycleView extends RecycleState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnLeerView extends LeerState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
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

export interface SceneOnSuperFangView extends SuperFangState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnMegaPunchView extends MegaPunchState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnMegaKickView extends MegaKickState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnFocusPunchView extends FocusPunchState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnMachPunchView extends MachPunchState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnPsychUpView extends PsychUpState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnHyperVoiceView extends HyperVoiceState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSnoreView extends SnoreState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSkyAttackView extends SkyAttackState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnShockWaveView extends ShockWaveState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnOverheatView extends OverheatState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnOutrageView extends OutrageState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSilverWindView extends SilverWindState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSolarBeamView extends SolarBeamState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnHiJumpKickView extends HiJumpKickState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnRollingKickView extends RollingKickState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnLowKickView extends LowKickState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnKarateChopView extends KarateChopState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnBatonPassView extends BatonPassState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly displayedBgPaletteY: number;
  readonly displayedBattlerPaletteY: number;
  readonly displayedPokeball: BatonPassState["pokeball"];
  readonly displayedAttackerMatrix: BatonPassState["attackerMatrix"];
  readonly displayedAttackerInvisible: boolean;
}

export interface SceneOnRolePlayView extends RolePlayState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly displayedTargetWhiteCoefficient: number;
  readonly displayedBgBlackCoefficient: number;
  readonly displayedSilhouette: RolePlayState["silhouette"];
}

export interface SceneOnStompView extends StompState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnViceGripView extends ViceGripState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnGuillotineView extends GuillotineState {
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

export interface SceneOnSubmissionView extends SubmissionState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnDrillPeckView extends DrillPeckState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnWhirlwindView extends WhirlwindState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnRazorWindView extends RazorWindEffect {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly targetRestOffset: Readonly<{ x2: number; y2: number }>;
}

export interface SceneOnHornDrillView extends HornDrillState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnAuroraBeamView extends AuroraBeamState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnTriAttackView extends TriAttackState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnHyperBeamView extends HyperBeamState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnThunderboltView extends ThunderboltState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnZapCannonView extends ZapCannonState {
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

export interface SceneOnSecretPowerView extends StrengthState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnPresentView extends PresentState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnTwineedleView extends TwineedleEffect {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnPoisonStingView extends PoisonStingEffect {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSpikeCannonView extends SpikeCannonEffect {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnPinMissileView extends PinMissileEffect {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSonicBoomView extends SonicBoomEffect {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnAirCutterView extends AirCutterState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSheerColdView extends SheerColdState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSmogView extends SmogState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnBonemerangView extends BonemerangState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSignalBeamView extends SignalBeamState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnNightmareView extends NightmareState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSkillSwapView extends SkillSwapState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnPursuitView extends PursuitState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnPsywaveView extends PsywaveState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnExtrasensoryView extends ExtrasensoryState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}
export interface SceneOnWillOWispView extends WillOWispState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}
export interface SceneOnMegaHornView extends MegaHornState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}
export interface SceneOnSuperpowerView extends SuperpowerState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}
export interface SceneOnRevengeView extends RevengeState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}
export interface SceneOnSpitUpView extends SpitUpState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}
export interface SceneOnFuryCutterView extends FuryCutterState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}
export interface SceneOnIceBallView extends IceBallState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}
export interface SceneOnCurseView extends CurseState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnReturnView extends ReturnState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnFlatterView extends FlatterState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSmokescreenView extends SmokescreenEffect {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnOctazookaView extends OctazookaState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSpikesView extends SpikesState {
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

export interface SceneOnWhirlpoolView extends WhirlpoolState {
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

export interface SceneOnLeafBladeView extends LeafBladeState {
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

export interface SceneOnSwallowView extends SwallowState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly stockpileCount: SwallowStockpileCount;
}

export interface SceneOnStockpileView extends StockpileState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly attackerShadowAtEntry: boolean;
}

export interface SceneOnSwaggerView extends SwaggerState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnFrustrationView extends FrustrationState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnDiveView extends DiveState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
}

export interface SceneOnSeismicTossView extends SeismicTossState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnBulkUpView extends BulkUpState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnTauntView extends TauntState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnTormentView extends TormentState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnScaryFaceView extends ScaryFaceState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnGlareView extends GlareState {
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

export interface SceneOnThunderView extends ThunderState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnIcyWindView extends IcyWindState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnBlizzardView extends BlizzardState {
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

export interface SceneOnSleepTalkView extends SleepTalkState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnHowlView extends HowlState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnYawnView extends YawnState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnRoarView extends RoarState {
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

export interface SceneOnHeatWaveView extends HeatWaveState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnMistBallView extends MistBallState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnLusterPurgeView extends LusterPurgeState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnTailGlowView extends TailGlowState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnTailWhipView extends TailWhipState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnAgilityView extends AgilityState {
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

export interface SceneOnFurySwipesView extends FurySwipesState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnFlailView extends FlailState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnAstonishView extends AstonishState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly targetBattler: SceneOnPresentationBattler;
}

export interface SceneOnFakeOutView extends FakeOutState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly targetBattler: SceneOnPresentationBattler;
}

export interface SceneOnSubstituteView extends SubstituteState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnRazorLeafView extends RazorLeafState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnMagicalLeafView extends MagicalLeafState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnIronTailView extends IronTailState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnCrushClawView extends CrushClawState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnTakeDownView extends TakeDownState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnCrunchView extends CrunchState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSlashView extends SlashState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnLickView extends LickState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnCounterView extends CounterState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnThrashView extends ThrashState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnDoubleKickView extends DoubleKickState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnTripleKickView extends TripleKickState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnDoubleSlapView extends DoubleSlapState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnCometPunchView extends CometPunchState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnCrabHammerView extends CrabHammerState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnDoubleEdgeView extends DoubleEdgeState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnPoisonTailView extends PoisonTailState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSteelWingView extends SteelWingState {
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

export interface SceneOnFireSpinView extends FireSpinState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnMetalClawView extends MetalClawState {
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

export interface SceneOnDetectView extends DetectState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnDisableView extends DisableState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnGrassWhistleView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly notes: readonly GrassWhistleNote[];
  readonly pan: SingPanTask | null;
  readonly greenBlendCoeff: number;
  readonly visualTaskCount: number;
}

export interface SceneOnTeeterDanceView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly notes: readonly TeeterDanceNote[];
  readonly task: ReturnType<typeof teeterDanceAtAge>["task"];
  readonly battlerX: number;
  readonly battlerX2: number;
  readonly audio: ReturnType<typeof teeterDanceAtAge>["audio"];
  readonly visualTaskCount: number;
}

export interface SceneOnBellyDrumView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly notes: readonly BellyDrumNote[];
  readonly hands: ReturnType<typeof bellyDrumAtAge>["hands"];
  readonly shakeTasks: ReturnType<typeof bellyDrumAtAge>["shakeTasks"];
  readonly audio: ReturnType<typeof bellyDrumAtAge>["audio"];
  readonly sourceOffset: number;
  readonly visualTaskCount: number;
  readonly rainbowBlend: boolean;
  readonly clearRainbowBlend: boolean;
}

export interface SceneOnEarthquakeView extends EarthquakeAnimationState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly playerBattlerX2: number;
  readonly opponentBattlerX2: number;
}

export interface SceneOnMagnitudeView extends MagnitudeFrame {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSunnyDayView extends SunnyDayFrame {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnUproarView extends UproarFrame {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnRapidSpinView extends RapidSpinFrame {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnForesightView extends ForesightFrame {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSpiderWebView extends SpiderWebFrame {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnPetalDanceView extends PetalDanceState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSkyUppercutView extends SkyUppercutState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnDestinyBondView extends DestinyBondState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnWaterPulseView extends WaterPulseState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnEruptionView extends EruptionFrame {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSandTombView extends SandTombFrame {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnTrickView extends TrickFrame {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnRockBlastView extends RockBlastFrame {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly bodyIndex: number;
  readonly bodyAge: number;
  readonly fieldProfile: Readonly<SceneOnDragonRageFieldProfile>;
  readonly moveTextVisible: boolean;
}

export interface SceneOnSwiftView extends SwiftFrame {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnIceBeamView extends IceBeamFrame {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnFissureView extends FissureState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

/**
 * Dig keeps reducer battler animation state under `attacker` / `target`.
 * Presentation identity is deliberately separate so consumers cannot lose
 * offsets, visibility, or affine matrices while looking up live sprites.
 */
export interface SceneOnDigView extends DigState {
  readonly presentationAttacker: SceneOnPresentationBattler;
  readonly presentationTarget: SceneOnPresentationBattler;
}

export interface SceneOnHardenView extends MetallicShineState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnIronDefenseView extends IronDefenseState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnFlashView extends FlashState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnFacadeView extends FacadeState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnMinimizeView extends MinimizeState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnAcidArmorView extends AcidArmorState {
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

export interface SceneOnConfuseRayView extends ConfuseRayState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
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

export interface SceneOnRockThrowView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly bg3Y: number;
  readonly targetY2: number;
  readonly targetX2: number;
  readonly rocks: ReturnType<typeof rockThrowAnimationAtAge>["rocks"];
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

export interface SceneOnMeteorMashView extends MeteorMashState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnFlameWheelView extends FlameWheelState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
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

export interface SceneOnWrapView extends WrapAnimationState {
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

export interface SceneOnSoftBoiledView extends SoftBoiledState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
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

export interface SceneOnLeechSeedView extends LeechSeedState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnMegaDrainView extends MegaDrainState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnGigaDrainView extends GigaDrainState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnDreamEaterView extends DreamEaterState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnPainSplitView extends PainSplitState {
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

export interface SceneOnCosmicPowerView extends CosmicPowerState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
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

export interface SceneOnRefreshView extends RefreshState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnHealBellView extends HealBellState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnFireBlastView extends FireBlastState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnRolloutView extends RolloutState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnRainDanceView extends RainDanceState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnHailView extends HailState {
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
    | SceneOnFrustrationConfig
    | SceneOnSparkConfig | SceneOnCharmConfig | SceneOnTailGlowConfig
    | SceneOnScaryFaceConfig
    | SceneOnAbsorbConfig | SceneOnLeechSeedConfig | SceneOnMegaDrainConfig | SceneOnGigaDrainConfig | SceneOnReflectConfig | SceneOnLightScreenConfig
    | SceneOnBarrierConfig
    | SceneOnHazeConfig
    | SceneOnRecycleConfig
    | SceneOnBiteConfig
    | SceneOnHeadbuttConfig | SceneOnSubmissionConfig | SceneOnDrillPeckConfig
  | SceneOnBodySlamConfig | SceneOnSlamConfig
    | SceneOnSecretPowerConfig
    | SceneOnWhirlwindConfig | SceneOnBlockConfig
    | SceneOnIronDefenseConfig
  | SceneOnFlashConfig
  | SceneOnFacadeConfig
  | SceneOnHiJumpKickConfig
  | SceneOnMetalClawConfig
  | SceneOnIronTailConfig
  | SceneOnCrushClawConfig
  | SceneOnTakeDownConfig
  | SceneOnCrunchConfig
  | SceneOnSlashConfig
  | SceneOnLickConfig
  | SceneOnCounterConfig
  | SceneOnThrashConfig
  | SceneOnDoubleKickConfig
  | SceneOnTripleKickConfig
  | SceneOnDoubleSlapConfig
  | SceneOnCometPunchConfig
  | SceneOnCrabHammerConfig
  | SceneOnDoubleEdgeConfig
  | SceneOnWrapConfig
  | SceneOnDigConfig,
>(
  config: TConfig,
): SceneOnMovePresentationState<TConfig> {
  if (config.attacker.geometry.side === config.target.geometry.side
    && config.move !== "SOFT_BOILED") {
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
  } else if (config.move === "ROCK_BLAST") {
    if (config.bodies.some(({ fieldProfile }) =>
      fieldProfile.playerHp < 0 || fieldProfile.opponentHp < 0)) {
      throw new Error("ROCK_BLAST body field profiles require nonnegative HP");
    }
  } else if (
    config.move !== "FLY"
    && config.move !== "BOUNCE"
    && config.move !== "DRAGON_BREATH"
    && config.move !== "SLEEP_TALK"
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
    const idle = target.liveIdleRest ?? speciesFrontIdleRestOffset(target.species);
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
      state.config.fireSpitGeometry ?? DRAGON_RAGE_FIRE_SPIT_GEOMETRY[attackerSide],
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

export function sceneOnFlameWheelView(
  state: SceneOnMovePresentationState,
): SceneOnFlameWheelView {
  if (state.config.move !== "FLAME_WHEEL") {
    throw new Error(`expected FLAME_WHEEL presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...flameWheelAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.animationCenter,
    ),
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

export function sceneOnWrapView(
  state: SceneOnMovePresentationState,
): SceneOnWrapView {
  if (state.config.move !== "WRAP") {
    throw new Error(`expected WRAP presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...wrapAnimationAtAge(
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

/** `age` is ticks since Move_SOFT_BOILED's first source-relative row. */
export function sceneOnSoftBoiledView(
  state: SceneOnMovePresentationState<SceneOnSoftBoiledConfig>,
): SceneOnSoftBoiledView {
  if (state.config.move !== "SOFT_BOILED") {
    throw new Error(`expected SOFT_BOILED presentation, got ${state.config.move}`);
  }
  const config = state.config;
  return {
    ...softBoiledAtAge(state.age, config.attacker.geometry.side, {
      attackerCenter: config.attacker.geometry.animationCenter,
      targetCenter: config.healingCenter,
      battlePositionCenter: config.attacker.geometry.battlePositionCenter,
    }),
    attacker: config.attacker,
    target: config.target,
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

/** `age=0` is Move_PRESENT's first active source-script frame. */
export function sceneOnPresentView(
  state: SceneOnPresentPresentationState,
): SceneOnPresentView {
  if (state.config.move !== "PRESENT") {
    throw new Error(`expected PRESENT presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...presentAtAge(
      state.age,
      state.config.branch,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.battlePositionCenter,
      state.config.target.geometry.battlePositionCenter,
      state.config.target.geometry.animationCenter,
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
      state.config.taskHostedScript === true,
    ),
  };
}

/** `age=0` is each retained body's first source-owned frame. */
export function sceneOnLeechSeedView(
  state: SceneOnMovePresentationState<SceneOnLeechSeedConfig>,
): SceneOnLeechSeedView {
  if (state.config.move !== "LEECH_SEED") {
    throw new Error(`expected LEECH_SEED presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...leechSeedAtAge(
      state.config.body,
      state.age,
      state.config.attacker.geometry.side,
      state.config.effectCenter,
      state.config.target.geometry.animationCenter,
      state.config.target.geometry.battlePositionCenter,
      state.config.targetRestOffset,
    ),
  };
}

/** `age` is relative to Move_MEGA_DRAIN's source `monbg ANIM_DEF_PARTNER`. */
export function sceneOnMegaDrainView(
  state: SceneOnMovePresentationState<SceneOnMegaDrainConfig>,
): SceneOnMegaDrainView {
  if (state.config.move !== "MEGA_DRAIN") {
    throw new Error(`expected MEGA_DRAIN presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...megaDrainAtAge(
      state.age,
      state.config.target.geometry.animationCenter,
      state.config.absorptionCenter,
      state.config.attacker.geometry.side,
      state.config.healingCenter,
    ),
  };
}

/** `age` is relative to Move_GIGA_DRAIN's source `monbg ANIM_DEF_PARTNER`. */
export function sceneOnGigaDrainView(
  state: SceneOnMovePresentationState<SceneOnGigaDrainConfig>,
): SceneOnGigaDrainView {
  if (state.config.move !== "GIGA_DRAIN") {
    throw new Error(`expected GIGA_DRAIN presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...gigaDrainAtAge(
      state.age,
      state.config.target.geometry.animationCenter,
      state.config.absorptionCenter,
      state.config.attacker.geometry.side,
      state.config.healingCenter,
    ),
  };
}

/** `age` is relative to Move_DREAM_EATER's first active source row. */
export function sceneOnDreamEaterView(
  state: SceneOnMovePresentationState<SceneOnDreamEaterConfig>,
): SceneOnDreamEaterView {
  if (state.config.move !== "DREAM_EATER") {
    throw new Error(`expected DREAM_EATER presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...dreamEaterAtAge(
      state.age,
      state.config.target.geometry.animationCenter,
      state.config.absorptionCenter,
      state.config.attacker.geometry.side,
      state.config.healingCenter,
      state.config.targetRestOffset,
    ),
  };
}

/** `age` is relative to Move_PAIN_SPLIT's first active source row. */
export function sceneOnPainSplitView(
  state: SceneOnMovePresentationState<SceneOnPainSplitConfig>,
): SceneOnPainSplitView {
  if (state.config.move !== "PAIN_SPLIT") {
    throw new Error(`expected PAIN_SPLIT presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...painSplitAtAge(
      state.age,
      {
        side: state.config.attacker.geometry.side,
        species: state.config.pictureYOffsets?.attacker ?? state.config.attacker.species as "MISDREAVUS",
        center: state.config.attacker.geometry.animationCenter,
      },
      {
        side: state.config.target.geometry.side,
        species: state.config.pictureYOffsets?.target ?? state.config.target.species as "GENGAR",
        center: state.config.target.geometry.animationCenter,
      },
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

export interface SceneOnBrickBreakView extends BrickBreakState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

/** `age=0` is Move_BRICK_BREAK's first source-pointer display. */
export function sceneOnBrickBreakView(
  state: SceneOnMovePresentationState<SceneOnBrickBreakConfig>,
): SceneOnBrickBreakView {
  if (state.config.move !== "BRICK_BREAK") {
    throw new Error(
      `expected BRICK_BREAK presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...brickBreakAtAge(
      state.age,
      state.config.body,
      state.config.attacker.geometry.side,
      state.config.target.geometry.animationCenter,
      state.config.target.geometry.battlePositionCenter,
    ),
  };
}

export interface SceneOnLightScreenView extends LightScreenState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnBarrierView extends BarrierState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnProtectView extends ProtectState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

/** `age` is relative to Move_DISABLE's first in-bounds script pointer. */
export function sceneOnDisableView(
  state: SceneOnMovePresentationState<SceneOnDisableConfig>,
): SceneOnDisableView {
  if (state.config.move !== "DISABLE") {
    throw new Error(`expected DISABLE presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...disableAtAge(
      state.age,
      state.config.attacker.geometry.animationCenter,
      state.config.attacker.geometry.side,
    ),
  };
}

export interface SceneOnHazeView extends HazeState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnSpiteView extends SpiteState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly displayedAlpha: Readonly<{ eva: number; evb: number }>;
}

export interface SceneOnMementoView extends MementoState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnNightShadeView extends NightShadeState {
  readonly attacker: SceneOnNightShadeConfig["attacker"];
  readonly target: SceneOnNightShadeConfig["target"];
}

/** `age` is relative to Move_HAZE's first in-bounds script pointer. */
export function sceneOnHazeView(
  state: SceneOnMovePresentationState<SceneOnHazeConfig>,
): SceneOnHazeView {
  if (state.config.move !== "HAZE") {
    throw new Error(`expected HAZE presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...hazeAtAge(state.age),
  };
}

/** `age=0` is AnimTask_SpiteTargetShadow's synchronous creation pass. */
export function sceneOnSpiteView(
  state: SceneOnSpitePresentationState,
): SceneOnSpiteView {
  if (state.config.move !== "SPITE") {
    throw new Error(`expected SPITE presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    displayedAlpha: spiteDisplayedAlpha(
      state.age,
      state.config.attacker.geometry.side,
    ),
    ...spiteAtAge(state.age - SPITE_TASK_SOURCE_AGE_OFFSET),
  };
}

/** `age=0` is Move_MEMENTO's first in-bounds script pointer. */
export function sceneOnMementoView(
  state: SceneOnMementoPresentationState,
): SceneOnMementoView {
  if (state.config.move !== "MEMENTO") {
    throw new Error(`expected MEMENTO presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...mementoAtAge(state.age, state.config.reducer),
  };
}

/** `age` is relative to Move_NIGHT_SHADE's first in-bounds pointer. */
export function sceneOnNightShadeView(
  state: SceneOnNightShadePresentationState,
): SceneOnNightShadeView {
  if (state.config.move !== "NIGHT_SHADE") {
    throw new Error(`expected NIGHT_SHADE presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...nightShadeAtAge(state.age),
  };
}

/** `age` is relative to Move_BARRIER's first in-bounds script pointer. */
export function sceneOnBarrierView(
  state: SceneOnMovePresentationState<SceneOnBarrierConfig>,
): SceneOnBarrierView {
  if (state.config.move !== "BARRIER") {
    throw new Error(`expected BARRIER presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...barrierAtAge(
      state.age,
      state.config.attacker.geometry.battlePositionCenter,
      state.config.attacker.geometry.side,
    ),
  };
}

/** `age` is relative to Move_MAGIC_COAT's first in-bounds script pointer. */
export function sceneOnMagicCoatView(
  state: SceneOnMovePresentationState<SceneOnMagicCoatConfig>,
): SceneOnBarrierView {
  if (state.config.move !== "MAGIC_COAT") {
    throw new Error(`expected MAGIC_COAT presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...magicCoatAtAge(
      state.age,
      state.config.attacker.geometry.battlePositionCenter,
      state.config.attacker.geometry.side,
    ),
  };
}

/** `age` is relative to Move_PROTECT's first in-bounds script pointer. */
export function sceneOnProtectView(
  state: SceneOnMovePresentationState<SceneOnProtectConfig>,
): SceneOnProtectView {
  if (state.config.move !== "PROTECT") {
    throw new Error(`expected PROTECT presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...protectAtAge(
      state.age,
      state.config.attacker.geometry.battlePositionCenter,
      state.config.attacker.geometry.side,
    ),
  };
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
      state.config.opponentBlendHold ?? true,
    ),
  };
}

export interface SceneOnMirrorCoatView extends LightScreenState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

/** `age` is relative to gMirrorCoatWallSpriteTemplate's creation pass. */
export function sceneOnMirrorCoatView(
  state: SceneOnMovePresentationState<SceneOnMirrorCoatConfig>,
): SceneOnMirrorCoatView {
  if (state.config.move !== "MIRROR_COAT") {
    throw new Error(
      `expected MIRROR_COAT presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...mirrorCoatAtAge(
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

/** `age=0` is the first active Move_COSMIC_POWER source-script row. */
export function sceneOnCosmicPowerView(
  state: SceneOnMovePresentationState<SceneOnCosmicPowerConfig>,
): SceneOnCosmicPowerView {
  if (state.config.move !== "COSMIC_POWER") {
    throw new Error(`expected COSMIC_POWER presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...cosmicPowerAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
    ),
  };
}

export interface SceneOnAncientPowerView extends AncientPowerState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

/** `age=0` is Move_ANCIENT_POWER's first loadspritegfx row. */
export function sceneOnAncientPowerView(
  state: SceneOnMovePresentationState<SceneOnAncientPowerConfig>,
): SceneOnAncientPowerView {
  if (state.config.move !== "ANCIENT_POWER") {
    throw new Error(`expected ANCIENT_POWER presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...ancientPowerAtAge(state.age, {
      attackerCenter: state.config.attacker.geometry.animationCenter,
      attackerBattlePositionCenter: state.config.attacker.geometry.battlePositionCenter,
      attackerSide: state.config.attacker.geometry.side,
    }),
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

/** `age` spans the complete Move_REFRESH script body through cleanup. */
export function sceneOnRefreshView(
  state: SceneOnMovePresentationState,
): SceneOnRefreshView {
  if (state.config.move !== "REFRESH") {
    throw new Error(`expected REFRESH presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...refreshAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
    ),
  };
}

/** `age=0` is the first active Move_HEAL_BELL source-script row. */
export function sceneOnHealBellView(
  state: SceneOnMovePresentationState<SceneOnHealBellConfig>,
): SceneOnHealBellView {
  if (state.config.move !== "HEAL_BELL") {
    throw new Error(`expected HEAL_BELL presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...healBellAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.attacker.geometry.battlePositionCenter,
    ),
  };
}

/** `age=0` is the first active Move_FIRE_BLAST source-script row. */
export function sceneOnFireBlastView(
  state: SceneOnMovePresentationState<SceneOnFireBlastConfig>,
): SceneOnFireBlastView {
  if (state.config.move !== "FIRE_BLAST") {
    throw new Error(`expected FIRE_BLAST presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...fireBlastAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.animationProfile,
    ),
  };
}

/** `age=0` is the first active Move_ROLLOUT source-script row. */
export function sceneOnRolloutView(
  state: SceneOnMovePresentationState<SceneOnRolloutConfig>,
): SceneOnRolloutView {
  if (state.config.move !== "ROLLOUT") {
    throw new Error(`expected ROLLOUT presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...rolloutAtAge(
      state.age,
      state.config.counter,
      state.config.animationProfile,
    ),
  };
}

/** `age=0` is the first retained Move_RAIN_DANCE source-script row. */
export function sceneOnRainDanceView(
  state: SceneOnMovePresentationState<SceneOnRainDanceConfig>,
): SceneOnRainDanceView {
  if (state.config.move !== "RAIN_DANCE") {
    throw new Error(`expected RAIN_DANCE presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...rainDanceAtAge(state.age, state.config.animationProfile),
  };
}

/** `age=0` is the first retained Move_HAIL source-script row. */
export function sceneOnHailView(
  state: SceneOnMovePresentationState<SceneOnHailConfig>,
): SceneOnHailView {
  if (state.config.move !== "HAIL") {
    throw new Error(`expected HAIL presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...hailAtAge(state.age, state.config.animationProfile),
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

/** `age` is relative to the first Metal Sound wave callback. */
export function sceneOnMetalSoundView(
  state: SceneOnMovePresentationState<SceneOnMetalSoundConfig>,
): SceneOnMetalSoundView {
  if (state.config.move !== "METAL_SOUND") {
    throw new Error(`expected METAL_SOUND presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...metalSoundEffectAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** Age zero is MOVE_SCREECH first retained source-pointer row. */
export function sceneOnScreechView(
  state: SceneOnMovePresentationState<SceneOnScreechConfig>,
): SceneOnScreechView {
  if (state.config.move !== "SCREECH") {
    throw new Error("expected SCREECH presentation, got " + state.config.move);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...screechEffectAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** Age zero is MOVE_SAFEGUARD's first pointer-owned script row. */
export function sceneOnSafeguardView(
  state: SceneOnMovePresentationState<SceneOnSafeguardConfig>,
): SceneOnSafeguardView {
  if (state.config.move !== "SAFEGUARD") {
    throw new Error("expected SAFEGUARD presentation, got " + state.config.move);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...safeguardAtAge(
      state.age,
      state.config.attacker.geometry.battlePositionCenter,
      state.config.animationProfile,
    ),
  };
}

/** Age zero is MOVE_GRUDGE's first pointer-owned script row. */
export function sceneOnGrudgeView(
  state: SceneOnMovePresentationState<SceneOnGrudgeConfig>,
): SceneOnGrudgeView {
  if (state.config.move !== "GRUDGE") {
    throw new Error("expected GRUDGE presentation, got " + state.config.move);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...grudgeAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.animationProfile,
    ),
  };
}

/** Age zero is MOVE_HIDDEN_POWER's first pointer-owned script row. */
export function sceneOnHiddenPowerView(
  state: SceneOnMovePresentationState<SceneOnHiddenPowerConfig>,
): SceneOnHiddenPowerView {
  if (state.config.move !== "HIDDEN_POWER") {
    throw new Error("expected HIDDEN_POWER presentation, got " + state.config.move);
  }
  if (state.config.attacker.geometry.side === state.config.target.geometry.side) {
    throw new Error("HIDDEN_POWER presentation requires opposite battler sides");
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...hiddenPowerAtAge(
      state.age,
      state.config.attacker.geometry.animationCenter,
      state.config.animationProfile,
    ),
  };
}

/** Age zero is MOVE_SMELLING_SALT's first retained source-pointer row. */
export function sceneOnSmellingSaltView(
  state: SceneOnSmellingSaltPresentationState,
): SceneOnSmellingSaltView {
  if (state.config.move !== "SMELLING_SALT") {
    throw new Error("expected SMELLING_SALT presentation, got " + state.config.move);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...smellingSaltAtAge(
      state.age,
      state.config.animationProfile.targetVerticalSpan,
    ),
  };
}

/** `age=0` is Move_RECYCLE's first retained source-pointer row. */
export function sceneOnRecycleView(
  state: SceneOnRecyclePresentationState,
): SceneOnRecycleView {
  if (state.config.move !== "RECYCLE") {
    throw new Error(`expected RECYCLE presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...recycleAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.animationProfile,
    ),
  };
}

/** `age=0` is Move_LEER's first active source-pointer frame. */
export function sceneOnLeerView(
  state: SceneOnLeerPresentationState,
): SceneOnLeerView {
  if (state.config.move !== "LEER") {
    throw new Error(`expected LEER presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...leerAtAge(state.age, state.config.attacker.geometry.side),
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

/** `age=0` is the first source-active `Move_SUPER_FANG` display. */
export function sceneOnSuperFangView(
  state: SceneOnMovePresentationState,
): SceneOnSuperFangView {
  if (state.config.move !== "SUPER_FANG") {
    throw new Error(`expected SUPER_FANG presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...superFangAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is the first active `Move_MEGA_PUNCH` source display. */
export function sceneOnMegaPunchView(
  state: SceneOnMovePresentationState,
): SceneOnMegaPunchView {
  if (state.config.move !== "MEGA_PUNCH") {
    throw new Error(`expected MEGA_PUNCH presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...megaPunchAtAge(
      state.age,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is the first active `Move_MEGA_KICK` source display. */
export function sceneOnMegaKickView(
  state: SceneOnMovePresentationState,
): SceneOnMegaKickView {
  if (state.config.move !== "MEGA_KICK") {
    throw new Error(`expected MEGA_KICK presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...megaKickAtAge(
      state.age,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is the first pointer-owned `Move_FOCUS_PUNCH` source row. */
export function sceneOnFocusPunchView(
  state: SceneOnMovePresentationState<SceneOnFocusPunchConfig>,
): SceneOnFocusPunchView {
  if (state.config.move !== "FOCUS_PUNCH") {
    throw new Error(`expected FOCUS_PUNCH presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...focusPunchAtAge(
      state.age,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
      state.config.restoreLag,
    ),
  };
}

/** `age=0` is MOVE_MACH_PUNCH's first source-root row. */
export function sceneOnMachPunchView(
  state: SceneOnMachPunchPresentationState,
): SceneOnMachPunchView {
  if (state.config.move !== "MACH_PUNCH") {
    throw new Error(`expected MACH_PUNCH presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...machPunchAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_PSYCH_UP's first source-root row. */
export function sceneOnPsychUpView(
  state: SceneOnPsychUpPresentationState,
): SceneOnPsychUpView {
  if (state.config.move !== "PSYCH_UP") {
    throw new Error(`expected PSYCH_UP presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...psychUpAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_HYPER_VOICE's first loadspritegfx source row. */
export function sceneOnHyperVoiceView(
  state: SceneOnHyperVoicePresentationState,
): SceneOnHyperVoiceView {
  if (state.config.move !== "HYPER_VOICE") {
    throw new Error(`expected HYPER_VOICE presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...hyperVoiceAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerPictureOrigin: attacker.geometry.animationCenter,
      targetPictureOrigin: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_SNORE's `loadspritegfx ANIM_TAG_SNORE_Z` row. */
export function sceneOnSnoreView(
  state: SceneOnSnorePresentationState,
): SceneOnSnoreView {
  if (state.config.move !== "SNORE") {
    throw new Error(`expected SNORE presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...snoreAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerPictureOrigin: attacker.geometry.animationCenter,
      targetPictureOrigin: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is the controller-selected MOVE_SKY_ATTACK body root. */
export function sceneOnSkyAttackView(
  state: SceneOnSkyAttackPresentationState,
): SceneOnSkyAttackView {
  if (state.config.move !== "SKY_ATTACK") {
    throw new Error(`expected SKY_ATTACK presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs, body } = state.config;
  return {
    ...skyAttackAtAge(body, state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerPictureOrigin: attacker.geometry.animationCenter,
      targetPictureOrigin: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_SHOCK_WAVE's first loadspritegfx source row. */
export function sceneOnShockWaveView(
  state: SceneOnShockWavePresentationState,
): SceneOnShockWaveView {
  if (state.config.move !== "SHOCK_WAVE") {
    throw new Error(`expected SHOCK_WAVE presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...shockWaveAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerPictureOrigin: attacker.geometry.animationCenter,
      targetPictureOrigin: target.geometry.animationCenter,
      targetBattlePosition: target.geometry.battlePositionCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_OVERHEAT's first `loadspritegfx` source row. */
export function sceneOnOverheatView(
  state: SceneOnOverheatPresentationState,
): SceneOnOverheatView {
  if (state.config.move !== "OVERHEAT") {
    throw new Error(`expected OVERHEAT presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...overheatAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerPictureOrigin: attacker.geometry.animationCenter,
      targetPictureOrigin: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_OUTRAGE's first `loadspritegfx SMALL_EMBER` source row. */
export function sceneOnOutrageView(
  state: SceneOnOutragePresentationState,
): SceneOnOutrageView {
  if (state.config.move !== "OUTRAGE") {
    throw new Error(`expected OUTRAGE presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...outrageAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerPictureOrigin: attacker.geometry.animationCenter,
      targetPictureOrigin: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_SILVER_WIND's source `loadspritegfx ANIM_TAG_SPARKLE_6`. */
export function sceneOnSilverWindView(
  state: SceneOnSilverWindPresentationState,
): SceneOnSilverWindView {
  if (state.config.move !== "SILVER_WIND") {
    throw new Error(`expected SILVER_WIND presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...silverWindAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerPictureOrigin: attacker.geometry.animationCenter,
      targetPictureOrigin: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** Live, evidence-free scanout plan for the shared Silver Wind compositor. */
export function sceneOnSilverWindDisplayPlan(
  state: SceneOnSilverWindPresentationState,
): ReturnType<typeof silverWindDisplayPlanAtAge> {
  if (state.config.move !== "SILVER_WIND") {
    throw new Error(`expected SILVER_WIND presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return silverWindDisplayPlanAtAge(state.age, {
    ...animationInputs,
    attackerSide: attacker.geometry.side,
    targetSide: target.geometry.side,
    attackerSpecies: attacker.species,
    targetSpecies: target.species,
    attackerPictureOrigin: attacker.geometry.animationCenter,
    targetPictureOrigin: target.geometry.animationCenter,
  });
}

/** `age=0` is the first display of the selected Solar Beam source body. */
export function sceneOnSolarBeamView(
  state: SceneOnMovePresentationState<SceneOnSolarBeamConfig>,
): SceneOnSolarBeamView {
  if (state.config.move !== "SOLAR_BEAM") {
    throw new Error(`expected SOLAR_BEAM presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...solarBeamAtAge(
      state.age,
      state.config.body,
      state.config.attacker.geometry.side,
      state.config.target.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.animationCenter,
      state.config.target.geometry.spriteCorner,
    ),
  };
}

/** `age=0` is the first pointer-bounded `Move_HI_JUMP_KICK` source row. */
export function sceneOnHiJumpKickView(
  state: SceneOnMovePresentationState<SceneOnHiJumpKickConfig>,
): SceneOnHiJumpKickView {
  if (state.config.move !== "HI_JUMP_KICK") {
    throw new Error(`expected HI_JUMP_KICK presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...hiJumpKickAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
      state.config.targetInitialX2,
    ),
  };
}

/** `age=0` is the first active `Move_ROLLING_KICK` source display. */
export function sceneOnRollingKickView(
  state: SceneOnMovePresentationState,
): SceneOnRollingKickView {
  if (state.config.move !== "ROLLING_KICK") {
    throw new Error(
      `expected ROLLING_KICK presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...rollingKickAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is the first active `Move_LOW_KICK` source display. */
export function sceneOnLowKickView(
  state: SceneOnMovePresentationState,
): SceneOnLowKickView {
  if (state.config.move !== "LOW_KICK") {
    throw new Error(`expected LOW_KICK presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...lowKickAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is the first pointer-bounded `Move_KARATE_CHOP` source display. */
export function sceneOnKarateChopView(
  state: SceneOnMovePresentationState<SceneOnKarateChopConfig>,
): SceneOnKarateChopView {
  if (state.config.move !== "KARATE_CHOP") {
    throw new Error(`expected KARATE_CHOP presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...karateChopAtAge(
      state.age,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** Baton Pass keeps software truth and independently lagged scanout state. */
export function sceneOnBatonPassView(
  state: SceneOnMovePresentationState<SceneOnBatonPassConfig>,
): SceneOnBatonPassView {
  if (state.config.move !== "BATON_PASS") {
    throw new Error(`expected BATON_PASS presentation, got ${state.config.move}`);
  }
  const current = batonPassAtAge(state.age, state.config.attacker.geometry.animationCenter);
  const displayed = batonPassAtAge(state.age - 1, state.config.attacker.geometry.animationCenter);
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...current,
    displayedBgPaletteY: displayed.bgPaletteY,
    displayedBattlerPaletteY: displayed.battlerPaletteY,
    displayedPokeball: displayed.pokeball,
    displayedAttackerMatrix: displayed.attackerMatrix,
    displayedAttackerInvisible: displayed.attackerInvisible,
  };
}

/** Role Play keeps source RAM truth separate from palette/OAM scanout latches. */
export function sceneOnRolePlayView(
  state: SceneOnMovePresentationState<SceneOnRolePlayConfig>,
): SceneOnRolePlayView {
  if (state.config.move !== "ROLE_PLAY") {
    throw new Error(`expected ROLE_PLAY presentation, got ${state.config.move}`);
  }
  const center = state.config.attacker.geometry.battlePositionCenter;
  const current = rolePlayAtAge(state.age, state.config.attacker.geometry.side, center);
  const paletteDisplay = rolePlayAtAge(state.age - 1, state.config.attacker.geometry.side, center);
  const oamDisplay = rolePlayAtAge(state.age - 2, state.config.attacker.geometry.side, center);
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...current,
    displayedTargetWhiteCoefficient: paletteDisplay.targetWhiteCoefficient,
    displayedBgBlackCoefficient: paletteDisplay.bgBlackCoefficient,
    displayedSilhouette: oamDisplay.silhouette,
  };
}

/** `age=0` is the first pointer-bounded `Move_STOMP` source display. */
export function sceneOnStompView(
  state: SceneOnMovePresentationState<SceneOnStompConfig>,
): SceneOnStompView {
  if (state.config.move !== "STOMP") {
    throw new Error(`expected STOMP presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...stompAtAge(
      state.age,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is the first pointer-bounded `Move_VICE_GRIP` source display. */
export function sceneOnViceGripView(
  state: SceneOnMovePresentationState<SceneOnViceGripConfig>,
): SceneOnViceGripView {
  if (state.config.move !== "VICE_GRIP") {
    throw new Error(`expected VICE_GRIP presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...viceGripAtAge(
      state.age,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

/** `age=0` is the first pointer-bounded `Move_GUILLOTINE` source row. */
export function sceneOnGuillotineView(
  state: SceneOnMovePresentationState<SceneOnGuillotineConfig>,
): SceneOnGuillotineView {
  if (state.config.move !== "GUILLOTINE") {
    throw new Error(`expected GUILLOTINE presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...guillotineAtAge(
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

/** `age=0` is SUBMISSION's first pointer-bounded source frame. */
export function sceneOnSubmissionView(
  state: SceneOnMovePresentationState<SceneOnSubmissionConfig>,
): SceneOnSubmissionView {
  if (state.config.move !== "SUBMISSION") {
    throw new Error(`expected SUBMISSION presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...submissionAtAge(
      state.age,
      state.config.target.geometry.animationCenter,
      state.config.attacker.geometry.side,
    ),
  };
}

/** `age=0` is Drill Peck's first display after its two source loads. */
export function sceneOnDrillPeckView(
  state: SceneOnMovePresentationState<SceneOnDrillPeckConfig>,
): SceneOnDrillPeckView {
  if (state.config.move !== "DRILL_PECK") {
    throw new Error(`expected DRILL_PECK presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...drillPeckAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.target.geometry.side,
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

export interface SceneOnRockTombView extends RockTombState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly effectCenter: Readonly<{ x: number; y: number }>;
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

/** `age=0` is ROCK TOMB's source `loadspritegfx` display. */
export function sceneOnRockTombView(
  state: SceneOnMovePresentationState<SceneOnRockTombConfig>,
): SceneOnRockTombView {
  if (state.config.move !== "ROCK_TOMB") {
    throw new Error(`expected ROCK_TOMB presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...rockTombAtAge(state.age, {
      targetSpriteSlot: state.config.targetSpriteSlot,
      targetInitialX2: state.config.targetInitialX2,
      targetCenter: state.config.effectCenter,
    } satisfies RockTombConfig),
    effectCenter: state.config.effectCenter,
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

/** `age=0` is Secret Power's Factory `Move_STRENGTH` first active display. */
export function sceneOnSecretPowerView(
  state: SceneOnMovePresentationState<SceneOnSecretPowerConfig>,
): SceneOnSecretPowerView {
  if (state.config.move !== "SECRET_POWER") {
    throw new Error(
      `expected SECRET_POWER presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...strengthAtAge(
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

/** `age=0` is Move_POISON_STING's first pointer-bounded source display. */
export function sceneOnPoisonStingView(
  state: SceneOnMovePresentationState<SceneOnPoisonStingConfig>,
): SceneOnPoisonStingView {
  if (state.config.move !== "POISON_STING") {
    throw new Error(
      `expected POISON_STING presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...poisonStingEffectAtAge(
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

/** `age=0` is PIN MISSILE's first source-script load display. */
export function sceneOnPinMissileView(
  state: SceneOnMovePresentationState<SceneOnPinMissileConfig>,
): SceneOnPinMissileView {
  if (state.config.move !== "PIN_MISSILE") {
    throw new Error(
      `expected PIN_MISSILE presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...pinMissileEffectAtAge(
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

/** `age=0` is MOVE_AIR_CUTTER's pointer-owned first resource-load row. */
export function sceneOnAirCutterView(
  state: SceneOnAirCutterPresentationState,
): SceneOnAirCutterView {
  if (state.config.move !== "AIR_CUTTER") {
    throw new Error(`expected AIR_CUTTER presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...airCutterAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerCenter: attacker.geometry.battlePositionCenter,
      targetCenter: target.geometry.battlePositionCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_SHEER_COLD's first pointer-owned BG_ICE command row. */
export function sceneOnSheerColdView(
  state: SceneOnSheerColdPresentationState,
): SceneOnSheerColdView {
  if (state.config.move !== "SHEER_COLD") {
    throw new Error(`expected SHEER_COLD presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...sheerColdAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      targetAnimationCenter: target.geometry.animationCenter,
      targetBattlePositionCenter: target.geometry.battlePositionCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_SMOG's first loadspritegfx source row. */
export function sceneOnSmogView(
  state: SceneOnSmogPresentationState,
): SceneOnSmogView {
  if (state.config.move !== "SMOG") {
    throw new Error(`expected SMOG presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...smogAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_BONEMERANG's first source-owned resource command row. */
export function sceneOnBonemerangView(
  state: SceneOnBonemerangPresentationState,
): SceneOnBonemerangView {
  if (state.config.move !== "BONEMERANG") {
    throw new Error(`expected BONEMERANG presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...bonemerangAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerPictureCenter: attacker.geometry.animationCenter,
      targetPictureCenter: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is Move_SIGNAL_BEAM's root resource-command source row. */
export function sceneOnSignalBeamView(
  state: SceneOnSignalBeamPresentationState,
): SceneOnSignalBeamView {
  if (state.config.move !== "SIGNAL_BEAM") {
    throw new Error(`expected SIGNAL_BEAM presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...signalBeamAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_NIGHTMARE's first legal-body source row. */
export function sceneOnNightmareView(
  state: SceneOnNightmarePresentationState,
): SceneOnNightmareView {
  if (state.config.move !== "NIGHTMARE") {
    throw new Error(`expected NIGHTMARE presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...nightmareAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerPictureOrigin: attacker.geometry.animationCenter,
      targetPictureOrigin: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_SKILL_SWAP's root resource-command source row. */
export function sceneOnSkillSwapView(
  state: SceneOnSkillSwapPresentationState,
): SceneOnSkillSwapView {
  if (state.config.move !== "SKILL_SWAP") {
    throw new Error(`expected SKILL_SWAP presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...skillSwapAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_PURSUIT's root resource-command source row. */
export function sceneOnPursuitView(
  state: SceneOnPursuitPresentationState,
): SceneOnPursuitView {
  if (state.config.move !== "PURSUIT") {
    throw new Error(`expected PURSUIT presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...pursuitAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerCenter: attacker.geometry.animationCenter,
      targetCenter: target.geometry.animationCenter,
      targetImpactCenter: target.geometry.battlePositionCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_PSYWAVE's root resource-command source row. */
export function sceneOnPsywaveView(
  state: SceneOnPsywavePresentationState,
): SceneOnPsywaveView {
  if (state.config.move !== "PSYWAVE") {
    throw new Error(`expected PSYWAVE presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...psywaveAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerPictureCenter: attacker.geometry.battlePositionCenter,
      targetPictureCenter: target.geometry.battlePositionCenter,
      attackerAnimationCenter: attacker.geometry.animationCenter,
      targetAnimationCenter: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_EXTRASENSORY's first root resource-command row. */
export function sceneOnExtrasensoryView(
  state: SceneOnExtrasensoryPresentationState,
): SceneOnExtrasensoryView {
  if (state.config.move !== "EXTRASENSORY") {
    throw new Error(`expected EXTRASENSORY presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...extrasensoryAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerCenter: attacker.geometry.animationCenter,
      targetCenter: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_WILL_O_WISP's first resource-command row. */
export function sceneOnWillOWispView(
  state: SceneOnWillOWispPresentationState,
): SceneOnWillOWispView {
  if (state.config.move !== "WILL_O_WISP") {
    throw new Error(`expected WILL_O_WISP presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return { ...willOWispAtAge(state.age, { ...animationInputs,
    attackerSide: attacker.geometry.side, targetSide: target.geometry.side,
    attackerSpecies: attacker.species, targetSpecies: target.species,
    attackerCenter: attacker.geometry.animationCenter,
    targetCenter: target.geometry.animationCenter }), attacker, target };
}

/** `age=0` is MOVE_MEGAHORN's first battle resource-command row. */
export function sceneOnMegaHornView(state: SceneOnMegaHornPresentationState): SceneOnMegaHornView {
  if (state.config.move !== "MEGAHORN") throw new Error(`expected MEGAHORN presentation, got ${state.config.move}`);
  const { attacker, target, animationInputs } = state.config;
  return { ...megaHornAtAge(state.age, { ...animationInputs,
    attackerSide: attacker.geometry.side, targetSide: target.geometry.side,
    attackerSpecies: attacker.species, targetSpecies: target.species,
    attackerCenter: attacker.geometry.animationCenter, targetCenter: target.geometry.animationCenter }),
    attacker, target };
}

/** `age=0` is MOVE_SUPERPOWER's first resource-command row. */
export function sceneOnSuperpowerView(state: SceneOnSuperpowerPresentationState): SceneOnSuperpowerView {
  if(state.config.move!=="SUPERPOWER")throw new Error(`expected SUPERPOWER presentation, got ${state.config.move}`);
  const{attacker,target,animationInputs}=state.config;
  return{...superpowerAtAge(state.age,{...animationInputs,
    attackerSide:attacker.geometry.side,targetSide:target.geometry.side,
    attackerSpecies:attacker.species,targetSpecies:target.species,
    attackerCenter:attacker.geometry.animationCenter,targetCenter:target.geometry.animationCenter}),attacker,target};
}

/** `age=0` is MOVE_REVENGE's first resource-command row. */
export function sceneOnRevengeView(state: SceneOnRevengePresentationState): SceneOnRevengeView {
  if(state.config.move!=="REVENGE")throw new Error(`expected REVENGE presentation, got ${state.config.move}`);
  const{attacker,target,animationInputs}=state.config;
  return{...revengeAtAge(state.age,{...animationInputs,
    attackerSide:attacker.geometry.side,targetSide:target.geometry.side,
    attackerSpecies:attacker.species,targetSpecies:target.species,
    attackerCenter:attacker.geometry.animationCenter,targetCenter:target.geometry.animationCenter}),attacker,target};
}

/** `age=0` is MOVE_SPIT_UP's first RED_ORB_2 resource-command row. */
export function sceneOnSpitUpView(state: SceneOnSpitUpPresentationState): SceneOnSpitUpView {
  if (state.config.move !== "SPIT_UP") {
    throw new Error(`expected SPIT_UP presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return { ...spitUpAtAge(state.age, { ...animationInputs,
    attackerSide: attacker.geometry.side, targetSide: target.geometry.side,
    attackerSpecies: attacker.species, targetSpecies: target.species,
    attackerCenter: attacker.geometry.animationCenter,
    targetCenter: target.geometry.animationCenter }), attacker, target };
}

/** `age=0` is MOVE_FURY_CUTTER's first CUT resource-command row. */
export function sceneOnFuryCutterView(
  state: SceneOnFuryCutterPresentationState,
): SceneOnFuryCutterView {
  if (state.config.move !== "FURY_CUTTER") {
    throw new Error(`expected FURY_CUTTER presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return { ...furyCutterAtAge(state.age, { ...animationInputs,
    attackerSide: attacker.geometry.side, targetSide: target.geometry.side,
    attackerSpecies: attacker.species, targetSpecies: target.species,
    attackerCenter: attacker.geometry.animationCenter,
    targetCenter: target.geometry.animationCenter }), attacker, target };
}

/** `age=0` is MOVE_ICE_BALL's first ICE_CHUNK resource-command row. */
export function sceneOnIceBallView(
  state: SceneOnIceBallPresentationState,
): SceneOnIceBallView {
  if (state.config.move !== "ICE_BALL") {
    throw new Error(`expected ICE_BALL presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return { ...iceBallAtAge(state.age, { ...animationInputs,
    attackerSide: attacker.geometry.side, targetSide: target.geometry.side,
    attackerSpecies: attacker.species, targetSpecies: target.species,
    attackerPictureOffset: attacker.geometry.animationCenter,
    targetPictureOffset: target.geometry.animationCenter }), attacker, target };
}

/** `age=0` is MOVE_CURSE's branch-selection source row. */
export function sceneOnCurseView(state: SceneOnCursePresentationState): SceneOnCurseView {
  if (state.config.move !== "CURSE") throw new Error(`expected CURSE presentation, got ${state.config.move}`);
  const { attacker, target, animationInputs } = state.config;
  return { ...curseAtAge(state.age, { ...animationInputs,
    attackerSide: attacker.geometry.side, defenderSide: target.geometry.side,
    attackerSpecies: attacker.species, defenderSpecies: target.species,
    attackerCenter: attacker.geometry.animationCenter,
    defenderCenter: target.geometry.animationCenter }), attacker, target };
}

/** `age=0` is MOVE_RETURN's root resource-command source row. */
export function sceneOnReturnView(
  state: SceneOnReturnPresentationState,
): SceneOnReturnView {
  if (state.config.move !== "RETURN") {
    throw new Error(`expected RETURN presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...returnAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerCenter: attacker.geometry.animationCenter,
      targetCenter: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_FLATTER's first source-pointer row. */
export function sceneOnFlatterView(
  state: SceneOnFlatterPresentationState,
): SceneOnFlatterView {
  if (state.config.move !== "FLATTER") {
    throw new Error(`expected FLATTER presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...flatterAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerCenter: attacker.geometry.animationCenter,
      targetCenter: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** Live, evidence-free scanout plan for Flatter's hardware display state. */
export function sceneOnFlatterDisplayPlan(
  state: SceneOnFlatterPresentationState,
): ReturnType<typeof flatterDisplayPlan> {
  return flatterDisplayPlan(sceneOnFlatterView(state));
}

/** Live, evidence-free scanout plan for every Return selector branch. */
export function sceneOnReturnDisplayPlan(
  state: SceneOnReturnPresentationState,
): ReturnType<typeof returnDisplayPlan> {
  return returnDisplayPlan(sceneOnReturnView(state));
}

/** Live, evidence-free scanout plan for Pursuit's hardware display buffers. */
export function sceneOnPursuitDisplayPlan(
  state: SceneOnPursuitPresentationState,
): ReturnType<typeof pursuitDisplayPlan> {
  const view = sceneOnPursuitView(state);
  return pursuitDisplayPlan(view, {
    ...state.config.animationInputs,
    attackerSide: view.attacker.geometry.side,
    targetSide: view.target.geometry.side,
    attackerSpecies: view.attacker.species,
    targetSpecies: view.target.species,
    attackerCenter: view.attacker.geometry.animationCenter,
    targetCenter: view.target.geometry.animationCenter,
    targetImpactCenter: view.target.geometry.battlePositionCenter,
  });
}

/** `age=0` is the selected Razor Wind source body's first display. */
export function sceneOnRazorWindView(
  state: SceneOnMovePresentationState<SceneOnRazorWindConfig>,
): SceneOnRazorWindView {
  if (state.config.move !== "RAZOR_WIND") {
    throw new Error(
      `expected RAZOR_WIND presentation, got ${state.config.move}`,
    );
  }
  const config = state.config;
  return {
    ...razorWindAtAge(
      state.age,
      config.body,
      config.attacker.geometry.side,
      {
        attackerPositionCenter: config.attacker.geometry.battlePositionCenter,
        attackerPictureCenter: config.attackerPictureCenter,
        targetPictureCenter: config.targetPictureCenter,
      },
      config.animationProfile,
    ),
    attacker: config.attacker,
    target: config.target,
    targetRestOffset: config.targetRestOffset,
  };
}

/** `age=0` is Move_HORN_DRILL's IMPACT resource-load source row. */
export function sceneOnHornDrillView(
  state: SceneOnMovePresentationState<SceneOnHornDrillConfig>,
): SceneOnHornDrillView {
  if (state.config.move !== "HORN_DRILL") {
    throw new Error(`expected HORN_DRILL presentation, got ${state.config.move}`);
  }
  return {
    ...hornDrillAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.animationGeometry,
      state.config.animationProfile,
    ),
    attacker: state.config.attacker,
    target: state.config.target,
  };
}

/** `age=0` is Move_AURORA_BEAM's retained RAINBOW_RINGS load row. */
export function sceneOnAuroraBeamView(
  state: SceneOnMovePresentationState<SceneOnAuroraBeamConfig>,
): SceneOnAuroraBeamView {
  if (state.config.move !== "AURORA_BEAM") {
    throw new Error(`expected AURORA_BEAM presentation, got ${state.config.move}`);
  }
  return {
    ...auroraBeamAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.animationGeometry,
      state.config.animationProfile,
    ),
    attacker: state.config.attacker,
    target: state.config.target,
  };
}

/** `age=0` is Move_TRI_ATTACK's retained TRIANGLE resource-load row. */
export function sceneOnTriAttackView(
  state: SceneOnMovePresentationState<SceneOnTriAttackConfig>,
): SceneOnTriAttackView {
  if (state.config.move !== "TRI_ATTACK") {
    throw new Error(`expected TRI_ATTACK presentation, got ${state.config.move}`);
  }
  return {
    ...triAttackAtAge(state.age, state.config.attacker.geometry.side,
      state.config.animationGeometry, state.config.animationProfile),
    attacker: state.config.attacker,
    target: state.config.target,
  };
}

/** `age=0` is Move_HYPER_BEAM's retained source-load row. */
export function sceneOnHyperBeamView(
  state: SceneOnMovePresentationState<SceneOnHyperBeamConfig>,
): SceneOnHyperBeamView {
  if (state.config.move !== "HYPER_BEAM") {
    throw new Error(`expected HYPER_BEAM presentation, got ${state.config.move}`);
  }
  return {
    ...hyperBeamAtAge(state.age, state.config.attacker.geometry.side,
      state.config.animationGeometry, state.config.animationProfile),
    attacker: state.config.attacker,
    target: state.config.target,
  };
}

/** `age=0` is Move_THUNDERBOLT's retained SPARK load row. */
export function sceneOnThunderboltView(
  state: SceneOnMovePresentationState<SceneOnThunderboltConfig>,
): SceneOnThunderboltView {
  if (state.config.move !== "THUNDERBOLT") {
    throw new Error(`expected THUNDERBOLT presentation, got ${state.config.move}`);
  }
  return {
    ...thunderboltAtAge(state.age, state.config.target.geometry.side,
      state.config.animationGeometry, state.config.animationProfile),
    attacker: state.config.attacker, target: state.config.target,
  };
}

/** `age=0` is Move_ZAP_CANNON's retained pre-load source row. */
export function sceneOnZapCannonView(
  state: SceneOnMovePresentationState<SceneOnZapCannonConfig>,
): SceneOnZapCannonView {
  if (state.config.move !== "ZAP_CANNON") {
    throw new Error(`expected ZAP_CANNON presentation, got ${state.config.move}`);
  }
  return {
    ...zapCannonAtAge(state.age, state.config.target.geometry.side,
      state.config.animationGeometry, state.config.animationProfile),
    attacker: state.config.attacker,
    target: state.config.target,
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

/** `age=0` is Move_OCTAZOOKA's first retained active source row. */
export function sceneOnOctazookaView(
  state: SceneOnOctazookaPresentationState,
): SceneOnOctazookaView {
  if (state.config.move !== "OCTAZOOKA") {
    throw new Error(`expected OCTAZOOKA presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...octazookaAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
      state.config.animationProfile,
    ),
  };
}

/** `age=0` is Move_SPIKES's first retained active source row. */
export function sceneOnSpikesView(
  state: SceneOnSpikesPresentationState,
): SceneOnSpikesView {
  if (state.config.move !== "SPIKES") {
    throw new Error(`expected SPIKES presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...spikesAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.side,
      state.config.target.geometry.battlePositionCenter,
      state.config.animationProfile,
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

/**
 * `age=0` is the first active source display of either Move_WHIRLPOOL or
 * Status_Whirlpool, selected by the typed `body` discriminant.
 */
export function sceneOnWhirlpoolView(
  state: SceneOnMovePresentationState<SceneOnWhirlpoolConfig>,
): SceneOnWhirlpoolView {
  if (state.config.move !== "WHIRLPOOL") {
    throw new Error(
      `expected WHIRLPOOL presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...whirlpoolAtAge(
      state.age,
      state.config.body,
      state.config.target.geometry.side,
      state.config.target.geometry.battlePositionCenter,
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

/** `age=0` is Move_LEAF_BLADE's first LEAF load display. */
export function sceneOnLeafBladeView(
  state: SceneOnMovePresentationState<SceneOnLeafBladeConfig>,
): SceneOnLeafBladeView {
  if (state.config.move !== "LEAF_BLADE") {
    throw new Error(
      `expected LEAF_BLADE presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...leafBladeAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.target.geometry.side,
      state.config.targetProfile,
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

/** `age=0` is Move_SWALLOW's first BLUE_ORB load display. */
export function sceneOnSwallowView(
  state: SceneOnMovePresentationState<SceneOnSwallowConfig>,
): SceneOnSwallowView {
  if (state.config.move !== "SWALLOW") {
    throw new Error(
      `expected SWALLOW presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    stockpileCount: state.config.stockpileCount,
    ...swallowAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.stockpileCount,
      state.config.attacker.geometry.battlePositionCenter,
      state.config.attackerPictureOffset,
      state.config.attackerPictureYOffset,
    ),
  };
}

/** `age=0` is Move_STOCKPILE's first retained pointer-owned row. */
export function sceneOnStockpileView(
  state: SceneOnMovePresentationState<SceneOnStockpileConfig>,
): SceneOnStockpileView {
  if (state.config.move !== "STOCKPILE") {
    throw new Error(`expected STOCKPILE presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    attackerShadowAtEntry: state.config.attackerShadowAtEntry,
    ...stockpileAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attackerPictureCenter,
      state.config.attackerPictureYOffset,
      state.config.animationProfile,
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
      state.config.battlerHeight,
    ),
  };
}

/** `age=0` is the retained Move_FRUSTRATION pointer-entry row. */
export function sceneOnFrustrationView(
  state: SceneOnMovePresentationState<SceneOnFrustrationConfig>,
): SceneOnFrustrationView {
  if (state.config.move !== "FRUSTRATION") {
    throw new Error(`expected FRUSTRATION presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...frustrationAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attackerEffectCenter,
      state.config.target.geometry.side,
      state.config.targetEffectCenter,
      state.config.animationProfile,
      state.config.targetInitialX2,
    ),
  };
}

/** `age=0` is the retained pointer-entry row for the selected Dive body. */
export function sceneOnDiveView(
  state: SceneOnMovePresentationState<SceneOnDiveConfig>,
): SceneOnDiveView {
  if (state.config.move !== "DIVE") {
    throw new Error(`expected DIVE presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    fieldProfile: state.config.fieldProfile,
    ...diveAtAge(
      state.age,
      state.config.body,
      state.config.attacker.geometry.side,
      state.config.animationGeometry,
      state.config.animationProfile,
    ),
  };
}

/** `age=0` is Move_SEISMIC_TOSS's retained IMPACT load row. */
export function sceneOnSeismicTossView(
  state: SceneOnMovePresentationState<SceneOnSeismicTossConfig>,
): SceneOnSeismicTossView {
  if (state.config.move !== "SEISMIC_TOSS") {
    throw new Error(`expected SEISMIC_TOSS presentation, got ${state.config.move}`);
  }
  return { attacker: state.config.attacker, target: state.config.target,
    ...seismicTossAtAge(state.age, state.config.target.geometry.side,
      state.config.animationGeometry, state.config.animationProfile) };
}

/** `age=0` is Move_BULK_UP's first displayed GrowAndShrink task frame. */
export function sceneOnBulkUpView(
  state: SceneOnMovePresentationState,
): SceneOnBulkUpView {
  if (state.config.move !== "BULK_UP") {
    throw new Error(`expected BULK_UP presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...bulkUpAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.breathOrigin,
      state.config.battlerHeight,
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

/** `age=0` is the move script's first in-bounds frame (frame 68/72 in the fixtures). */
export function sceneOnTormentView(
  state: SceneOnMovePresentationState,
): SceneOnTormentView {
  if (state.config.move !== "TORMENT") {
    throw new Error(`expected TORMENT presentation, got ${state.config.move}`);
  }
  const config = state.config as SceneOnTormentConfig;
  return {
    ...tormentAtAge(
      state.age,
      config.attackerPictureOffset,
      config.battlerHeight,
      config.target.geometry.side,
      config.targetPictureOffset,
    ),
    attacker: config.attacker,
    target: config.target,
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

/** `age=0` is the first source-relative MOVE_GLARE frame. */
export function sceneOnGlareView(
  state: SceneOnGlarePresentationState,
): SceneOnGlareView {
  if (state.config.move !== "GLARE") {
    throw new Error(`expected GLARE presentation, got ${state.config.move}`);
  }
  const config = state.config;
  const geometry: GlareGeometry = {
    attackerSide: config.attacker.geometry.side,
    targetSide: config.target.geometry.side,
    attackerEyeCenter: config.attackerEyeCenter,
    eyeDotStart: config.eyeDotStart,
    eyeDotEnd: config.eyeDotEnd,
  };
  return {
    age: state.age,
    attacker: config.attacker,
    target: config.target,
    ...glareAtAge(state.age, geometry),
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

/** `age=0` is Move_THUNDER's active source-script offset-zero display. */
export function sceneOnThunderView(
  state: SceneOnThunderPresentationState,
): SceneOnThunderView {
  if (state.config.move !== "THUNDER") {
    throw new Error(`expected THUNDER presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...thunderAtAge(
      state.age,
      state.config.target.geometry.side,
      state.config.targetEffectCenter,
    ),
  };
}

/** `age=0` is Move_ICY_WIND's active source-script offset-zero display. */
export function sceneOnIcyWindView(
  state: SceneOnIcyWindPresentationState,
): SceneOnIcyWindView {
  if (state.config.move !== "ICY_WIND") {
    throw new Error(`expected ICY_WIND presentation, got ${state.config.move}`);
  }
  return {
    ...icyWindAtAge(state.age, state.config.attacker.geometry.side, state.config.effectGeometry),
    attacker: state.config.attacker,
    target: state.config.target,
  };
}

/** `age=0` is Move_BLIZZARD's active source-script offset-zero display. */
export function sceneOnBlizzardView(
  state: SceneOnBlizzardPresentationState,
): SceneOnBlizzardView {
  if (state.config.move !== "BLIZZARD") {
    throw new Error(`expected BLIZZARD presentation, got ${state.config.move}`);
  }
  return {
    ...blizzardAtAge(state.age, state.config.attacker.geometry.side, state.config.effectGeometry),
    attacker: state.config.attacker,
    target: state.config.target,
  };
}

/** `age=0` is the move's active source-script offset-zero display. */
export function sceneOnSurfView(
  state: SceneOnSurfPresentationState,
): SceneOnSurfView {
  if (state.config.move !== "SURF" && state.config.move !== "MUDDY_WATER") {
    throw new Error(
      `expected SURF presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...surfWaveAtAge(
      state.age,
      state.config.attacker.geometry.side,
      { palette: state.config.move === "MUDDY_WATER" ? "muddy-water" : "surf" },
    ),
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

/** `age=0` is Move_SLEEP_TALK's first displayed source-script frame. */
export function sceneOnSleepTalkView(
  state: SceneOnSleepTalkPresentationState,
): SceneOnSleepTalkView {
  if (state.config.move !== "SLEEP_TALK") {
    throw new Error(`expected SLEEP_TALK presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...sleepTalkAtAge(
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
      state.config.battlerInput,
    ),
  };
}

/** `age=0` is Move_YAWN's first displayed source-script frame. */
export function sceneOnYawnView(
  state: SceneOnYawnPresentationState,
): SceneOnYawnView {
  if (state.config.move !== "YAWN") {
    throw new Error(`expected YAWN presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...yawnAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.target.geometry.animationCenter,
      state.config.battlerInput,
    ),
  };
}

/** `age=0` is Move_ROAR's first active source-script frame. */
export function sceneOnRoarView(
  state: SceneOnRoarPresentationState,
): SceneOnRoarView {
  if (state.config.move !== "ROAR") {
    throw new Error(`expected ROAR presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...roarAtAge(
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

export interface SceneOnSweetScentView extends SweetScentState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnDefenseCurlView extends DefenseCurlState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnIngrainView extends IngrainState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnMeanLookView extends MeanLookState {
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

export interface SceneOnLovelyKissView extends LovelyKissState {
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

/** `age=0` is Move_SWEET_SCENT's first active source-script frame. */
export function sceneOnSweetScentView(
  state: SceneOnSweetScentPresentationState,
): SceneOnSweetScentView {
  if (state.config.move !== "SWEET_SCENT") {
    throw new Error(`expected SWEET_SCENT presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...sweetScentAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.animationProfile,
    ),
  };
}

/** `age=0` is Move_DEFENSE_CURL's first retained active source-script row. */
export function sceneOnDefenseCurlView(
  state: SceneOnDefenseCurlPresentationState,
): SceneOnDefenseCurlView {
  if (state.config.move !== "DEFENSE_CURL") {
    throw new Error(`expected DEFENSE_CURL presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...defenseCurlAtAge(
      state.age,
      state.config.attacker.geometry.animationCenter,
      state.config.animationProfile,
    ),
  };
}

/** `age=0` is Move_INGRAIN's first retained active source-script row. */
export function sceneOnIngrainView(
  state: SceneOnIngrainPresentationState,
): SceneOnIngrainView {
  if (state.config.move !== "INGRAIN") {
    throw new Error(`expected INGRAIN presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...ingrainAtAge(
      state.age,
      state.config.attacker.geometry.battlePositionCenter,
      state.config.animationProfile,
    ),
  };
}

/** `age=0` is Move_MEAN_LOOK's first retained pointer-owned row. */
export function sceneOnMeanLookView(
  state: SceneOnMeanLookPresentationState,
): SceneOnMeanLookView {
  if (state.config.move !== "MEAN_LOOK") {
    throw new Error(`expected MEAN_LOOK presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...meanLookAtAge(
      state.age,
      state.config.target.geometry.animationCenter,
      state.config.animationProfile.targetSubpriority,
    ),
  };
}

/** `age=0` is Move_LOVELY_KISS's first retained active source row. */
export function sceneOnLovelyKissView(
  state: SceneOnLovelyKissPresentationState,
): SceneOnLovelyKissView {
  if (state.config.move !== "LOVELY_KISS") {
    throw new Error(`expected LOVELY_KISS presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...lovelyKissAtAge(
      state.age,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
      state.config.animationProfile,
    ),
  };
}

export interface SceneOnAttractView extends AttractState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

/** `age=0` is Move_ATTRACT's first active source-script frame. */
export function sceneOnAttractView(
  state: SceneOnAttractPresentationState,
): SceneOnAttractView {
  if (state.config.move !== "ATTRACT") {
    throw new Error(`expected ATTRACT presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...attractAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
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

export interface SceneOnCottonSporeView extends CottonSporeState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

/** `age=0` is Move_COTTON_SPORE's first active source-script frame. */
export function sceneOnCottonSporeView(
  state: SceneOnCottonSporePresentationState,
): SceneOnCottonSporeView {
  if (state.config.move !== "COTTON_SPORE") {
    throw new Error(
      `expected COTTON_SPORE presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...cottonSporeAtAge(
      state.age,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

export interface SceneOnStunSporeView extends StunSporeState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

/** `age=0` is Move_STUN_SPORE's first active source-script frame. */
export function sceneOnStunSporeView(
  state: SceneOnStunSporePresentationState,
): SceneOnStunSporeView {
  if (state.config.move !== "STUN_SPORE") {
    throw new Error(
      `expected STUN_SPORE presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...stunSporeAtAge(
      state.age,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
    ),
  };
}

export interface SceneOnSleepPowderView extends SleepPowderState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

/** `age=0` is Move_SLEEP_POWDER's first active source-script frame. */
export function sceneOnSleepPowderView(
  state: SceneOnSleepPowderPresentationState,
): SceneOnSleepPowderView {
  if (state.config.move !== "SLEEP_POWDER") {
    throw new Error(`expected SLEEP_POWDER presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...sleepPowderAtAge(
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

export interface SceneOnPsybeamView extends PsybeamState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly displayedRings: readonly PsybeamRing[];
  readonly displayedTargetSwayX2: number;
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

export interface SceneOnAmnesiaView extends AmnesiaState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly displayedQuestionMark: AmnesiaQuestionMark | null;
  readonly displayedBgPaletteAge: number;
}

/** `age=0` is Move_AMNESIA's first active source-script frame. */
export function sceneOnAmnesiaView(
  state: SceneOnAmnesiaPresentationState,
): SceneOnAmnesiaView {
  if (state.config.move !== "AMNESIA") {
    throw new Error(`expected AMNESIA presentation, got ${state.config.move}`);
  }
  const { attacker, target, attackerPictureSize } = state.config;
  return {
    age: state.age,
    attacker,
    target,
    ...amnesiaAtAge(
      state.age,
      attacker.geometry.side,
      attacker.geometry.animationCenter,
      attackerPictureSize,
    ),
    displayedQuestionMark: amnesiaDisplayedQuestionMarkAtAge(
      state.age,
      attacker.geometry.side,
      attacker.geometry.animationCenter,
      attackerPictureSize,
    ),
    displayedBgPaletteAge: state.age - 6,
  };
}

export interface SceneOnDragonDanceView extends DragonDanceState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

/** `age=0` is Move_DRAGON_DANCE's first active source-script row. */
export function sceneOnDragonDanceView(
  state: SceneOnDragonDancePresentationState,
): SceneOnDragonDanceView {
  if (state.config.move !== "DRAGON_DANCE") {
    throw new Error(`expected DRAGON_DANCE presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...dragonDanceAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
      state.config.animationProfile,
      state.config.attacker.geometry.battlePositionCenter.y,
    ),
  };
}

/** `age=0` is Move_PSYBEAM's first active source-script frame. */
export function sceneOnPsybeamView(
  state: SceneOnPsybeamPresentationState,
): SceneOnPsybeamView {
  if (state.config.move !== "PSYBEAM") {
    throw new Error(`expected PSYBEAM presentation, got ${state.config.move}`);
  }
  const side = state.config.attacker.geometry.side;
  const attackerCenter = state.config.attacker.geometry.animationCenter;
  const targetCenter = state.config.target.geometry.animationCenter;
  const targetIdleX2 = state.config.targetIdleX2 ?? 0;
  const component = psybeamAtAge(
    state.age,
    side,
    attackerCenter,
    targetCenter,
    targetIdleX2,
  );
  const displayed = psybeamAtAge(
    state.age - 1,
    side,
    attackerCenter,
    targetCenter,
    targetIdleX2,
  );
  return {
    ...component,
    attacker: state.config.attacker,
    target: state.config.target,
    displayedRings: psybeamDisplayedRingsAtAge(
      state.age,
      side,
      attackerCenter,
      targetCenter,
    ),
    displayedTargetSwayX2: displayed.targetSwayX2,
    displayedTargetBlendCoefficient: displayed.targetBlendCoefficient,
    // Faded BG palette writes are RAM+1 for this source task. The compositor
    // remains responsible for transferring the resulting palette to pixels.
    displayedBgPaletteAge: state.age - 1,
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

/** `age=0` is Move_HEAT_WAVE's first displayed source-script frame. */
export function sceneOnHeatWaveView(
  state: SceneOnHeatWavePresentationState,
): SceneOnHeatWaveView {
  if (state.config.move !== "HEAT_WAVE") {
    throw new Error(`expected HEAT_WAVE presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...heatWaveAtAge(state.age, state.config.attacker.geometry.side),
  };
}

/** `age=0` is Move_MIST_BALL's first displayed source-script frame. */
export function sceneOnMistBallView(
  state: SceneOnMistBallPresentationState,
): SceneOnMistBallView {
  if (state.config.move !== "MIST_BALL") {
    throw new Error(`expected MIST_BALL presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...mistBallAtAge(state.age, {
      attacker: state.config.attacker.geometry.animationCenter,
      target: state.config.target.geometry.animationCenter,
    }),
  };
}

/** `age=0` is Move_LUSTER_PURGE's first retained source-script frame. */
export function sceneOnLusterPurgeView(
  state: SceneOnLusterPurgePresentationState,
): SceneOnLusterPurgeView {
  if (state.config.move !== "LUSTER_PURGE") {
    throw new Error(`expected LUSTER_PURGE presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...lusterPurgeAtAge(state.age, {
      attackerSide: state.config.attacker.geometry.side,
      attackerBattlerId: state.config.attackerBattlerId,
      attackerSpriteSlot: state.config.attackerSpriteSlot,
      targetSpriteSlot: state.config.targetSpriteSlot,
      targetInitialX2: state.config.targetInitialX2,
      circleCenter: state.config.circleCenter,
      monbgCenter: state.config.monbgCenter,
      targetCenter: state.config.hitsplatCenter,
      monbgPosition: state.config.monbgPosition,
      visualRandom: state.config.visualRandom,
    }),
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

/** `age=0` is Move_TAIL_WHIP's first active source-script frame. */
export function sceneOnTailWhipView(
  state: SceneOnTailWhipPresentationState,
): SceneOnTailWhipView {
  if (state.config.move !== "TAIL_WHIP") {
    throw new Error(`expected TAIL_WHIP presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...tailWhipAtAge(state.age, state.config.attacker.geometry.side),
  };
}

/** `age=0` is Move_AGILITY's first active source-script frame. */
export function sceneOnAgilityView(
  state: SceneOnAgilityPresentationState,
): SceneOnAgilityView {
  if (state.config.move !== "AGILITY") {
    throw new Error(`expected AGILITY presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...agilityAnimationAtAge(state.age, state.config.attacker.geometry.side),
  };
}

export interface SceneOnSwordsDanceView extends SwordsDanceState {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

/** `age=0` is Move_SWORDS_DANCE's first active source pointer frame. */
export function sceneOnSwordsDanceView(
  state: SceneOnMovePresentationState,
): SceneOnSwordsDanceView {
  if (state.config.move !== "SWORDS_DANCE") {
    throw new Error(`expected SWORDS_DANCE presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...swordsDanceAtAge(state.age, state.config.attacker.geometry.side, state.config.attacker.geometry.battlePositionCenter),
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

export function sceneOnFurySwipesView(
  state: SceneOnMovePresentationState,
): SceneOnFurySwipesView {
  if (state.config.move !== "FURY_SWIPES") {
    throw new Error(`expected FURY_SWIPES presentation, got ${state.config.move}`);
  }
  const attacker = state.config.attacker;
  const target = state.config.target;
  return {
    age: state.age,
    attacker,
    target,
    ...furySwipesAtAge(state.age, {
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      targetCenter: target.geometry.animationCenter,
    }),
  };
}

export function sceneOnFlailView(
  state: SceneOnMovePresentationState<SceneOnFlailConfig>,
): SceneOnFlailView {
  if (state.config.move !== "FLAIL") {
    throw new Error(`expected FLAIL presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...flailAtAge(state.age, {
      attackerSide: state.config.attacker.geometry.side,
      targetCenter: state.config.hitsplatCenter,
      targetInitialX2: state.config.targetInitialX2,
      power: state.config.movePower,
      visualRandom: state.config.visualRandom,
    }),
  };
}

/** `age` spans Move_METEOR_MASH from its first source pointer row to cleanup. */
export function sceneOnMeteorMashView(
  state: SceneOnMovePresentationState<SceneOnMeteorMashConfig>,
): SceneOnMeteorMashView {
  if (state.config.move !== "METEOR_MASH") {
    throw new Error(`expected METEOR_MASH presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...meteorMashAtAge(state.age, {
      targetSide: state.config.target.geometry.side,
      targetCenter: state.config.target.geometry.animationCenter,
      twinkles: state.config.twinkles,
      ...(state.config.restoreLagRows === undefined ? {} : { restoreLagRows: state.config.restoreLagRows }),
    }),
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
      state.config.targetElevation ?? 0,
    ),
  };
}

/** `age=0` is the first in-bounds Move_FAKE_OUT script frame. */
export function sceneOnFakeOutView(
  state: SceneOnMovePresentationState<SceneOnFakeOutConfig>,
): SceneOnFakeOutView {
  if (state.config.move !== "FAKE_OUT") {
    throw new Error(`expected FAKE_OUT presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    targetBattler: state.config.target,
    ...fakeOutAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.targetPictureYOffset,
    ),
  };
}

/** `age=0` is the first in-bounds Move_SUBSTITUTE script frame. */
export function sceneOnSubstituteView(
  state: SceneOnMovePresentationState<SceneOnSubstituteConfig>,
): SceneOnSubstituteView {
  if (state.config.move !== "SUBSTITUTE") {
    throw new Error(`expected SUBSTITUTE presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...substituteAtAge(state.age, state.config.attacker.geometry.side),
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

/** `age=0` is the first in-bounds Move_MAGICAL_LEAF script frame. */
export function sceneOnMagicalLeafView(
  state: SceneOnMovePresentationState,
): SceneOnMagicalLeafView {
  if (state.config.move !== "MAGICAL_LEAF") {
    throw new Error(
      `expected MAGICAL_LEAF presentation, got ${state.config.move}`,
    );
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...magicalLeafAtAge(state.age, {
      attackerSide: state.config.attacker.geometry.side,
      attackerCenter: state.config.attacker.geometry.animationCenter,
      targetCenter: state.config.target.geometry.animationCenter,
      targetIdleX2: state.config.targetIdleX2,
    }),
  };
}

/** `age=0` is the MetallicShine initializer's first displayed frame. */
/** `age=0` is the move-owned window's first in-bounds frame; the RAM ages in
 *  the reducer match the probe's RAM readings, so the draw case applies the
 *  shared one-display latch itself. */
export function sceneOnIronTailView(
  state: SceneOnMovePresentationState,
): SceneOnIronTailView {
  if (state.config.move !== "IRON_TAIL") {
    throw new Error(`expected IRON_TAIL presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...ironTailAtAge(
      state.age,
      state.config.attacker.geometry.side,
      state.config.attacker.geometry.animationCenter,
    ),
  };
}

export function sceneOnCrushClawView(
  state: SceneOnMovePresentationState,
): SceneOnCrushClawView {
  if (state.config.move !== "CRUSH_CLAW") {
    throw new Error(`expected CRUSH_CLAW presentation, got ${state.config.move}`);
  }
  const attacker = state.config.attacker;
  const target = state.config.target;
  return {
    age: state.age,
    attacker,
    target,
    ...crushClawAtAge(state.age, {
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      targetCenter: target.geometry.animationCenter,
    }),
  };
}

export function sceneOnTakeDownView(
  state: SceneOnMovePresentationState,
): SceneOnTakeDownView {
  if (state.config.move !== "TAKE_DOWN") {
    throw new Error(`expected TAKE_DOWN presentation, got ${state.config.move}`);
  }
  const attacker = state.config.attacker;
  const target = state.config.target;
  return {
    age: state.age,
    attacker,
    target,
    ...takeDownAtAge(state.age, {
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      targetCenter: target.geometry.animationCenter,
    }),
  };
}

export function sceneOnCrunchView(
  state: SceneOnMovePresentationState,
): SceneOnCrunchView {
  if (state.config.move !== "CRUNCH") {
    throw new Error(`expected CRUNCH presentation, got ${state.config.move}`);
  }
  const attacker = state.config.attacker;
  const target = state.config.target;
  return {
    age: state.age,
    attacker,
    target,
    ...crunchAtAge(state.age, {
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      targetCenter: target.geometry.animationCenter,
    }),
  };
}

export function sceneOnSlashView(
  state: SceneOnMovePresentationState,
): SceneOnSlashView {
  if (state.config.move !== "SLASH") {
    throw new Error(`expected SLASH presentation, got ${state.config.move}`);
  }
  const attacker = state.config.attacker;
  const target = state.config.target;
  return {
    age: state.age,
    attacker,
    target,
    ...slashAtAge(state.age, {
      targetSide: target.geometry.side,
      targetCenter: target.geometry.animationCenter,
    }),
  };
}

export function sceneOnLickView(
  state: SceneOnMovePresentationState,
): SceneOnLickView {
  if (state.config.move !== "LICK") {
    throw new Error(`expected LICK presentation, got ${state.config.move}`);
  }
  const attacker = state.config.attacker;
  const target = state.config.target;
  return {
    age: state.age,
    attacker,
    target,
    ...lickAtAge(state.age, {
      targetSide: target.geometry.side,
      targetCenter: target.geometry.animationCenter,
    }),
  };
}

export function sceneOnCounterView(
  state: SceneOnMovePresentationState,
): SceneOnCounterView {
  if (state.config.move !== "COUNTER") {
    throw new Error(`expected COUNTER presentation, got ${state.config.move}`);
  }
  const attacker = state.config.attacker;
  const target = state.config.target;
  return {
    age: state.age,
    attacker,
    target,
    ...counterAtAge(state.age, {
      attackerSide: attacker.geometry.side,
      attackerCenter: attacker.geometry.animationCenter,
      targetSide: target.geometry.side,
      targetCenter: target.geometry.animationCenter,
    }),
  };
}

export function sceneOnThrashView(
  state: SceneOnMovePresentationState,
): SceneOnThrashView {
  if (state.config.move !== "THRASH") {
    throw new Error(`expected THRASH presentation, got ${state.config.move}`);
  }
  const attacker = state.config.attacker;
  const target = state.config.target;
  return {
    age: state.age,
    attacker,
    target,
    ...thrashAtAge(state.age, {
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      targetCenter: target.geometry.animationCenter,
      targetDimensions: state.config.targetDimensions ?? { width: 56, height: 64 },
      fistRandom: state.config.fistRandom,
    }),
  };
}

export function sceneOnDoubleKickView(
  state: SceneOnMovePresentationState,
): SceneOnDoubleKickView {
  if (state.config.move !== "DOUBLE_KICK") {
    throw new Error(`expected DOUBLE_KICK presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...doubleKickAtAge(state.age, {
      targetSide: state.config.target.geometry.side,
      targetCenter: state.config.target.geometry.animationCenter,
      targetDimensions: state.config.targetDimensions,
      fistRandom: state.config.fistRandom,
    }),
  };
}

export function sceneOnTripleKickView(
  state: SceneOnMovePresentationState,
): SceneOnTripleKickView {
  if (state.config.move !== "TRIPLE_KICK") {
    throw new Error(`expected TRIPLE_KICK presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...tripleKickAtAge(state.age, state.config.moveTurn, {
      attackerSide: state.config.attacker.geometry.side,
      targetCenter: state.config.target.geometry.animationCenter,
    }),
  };
}

export function sceneOnDoubleSlapView(
  state: SceneOnMovePresentationState,
): SceneOnDoubleSlapView {
  if (state.config.move !== "DOUBLE_SLAP") {
    throw new Error(`expected DOUBLE_SLAP presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...doubleSlapAtAge(state.age, state.config.moveTurn, {
      attackerSide: state.config.attacker.geometry.side,
      targetCenter: state.config.target.geometry.animationCenter,
    }),
  };
}

export function sceneOnCometPunchView(
  state: SceneOnMovePresentationState,
): SceneOnCometPunchView {
  if (state.config.move !== "COMET_PUNCH") {
    throw new Error(`expected COMET_PUNCH presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...cometPunchAtAge(state.age, state.config.moveTurn, {
      attackerSide: state.config.attacker.geometry.side,
      targetCenter: state.config.target.geometry.animationCenter,
    }),
  };
}

/** Typed framebuffer seam for Thrash's independently measured ShakeMon latch. */
export function sceneOnThrashDisplayedTargetOffset(
  state: SceneOnMovePresentationState,
): Readonly<{ x2: number; y2: number }> {
  if (state.config.move !== "THRASH") {
    throw new Error(`expected THRASH presentation, got ${state.config.move}`);
  }
  const attacker = state.config.attacker;
  const target = state.config.target;
  return thrashDisplayedTargetOffsetAtAge(state.age, {
    attackerSide: attacker.geometry.side,
    targetSide: target.geometry.side,
    targetCenter: target.geometry.animationCenter,
    targetDimensions: state.config.targetDimensions ?? { width: 56, height: 64 },
    fistRandom: state.config.fistRandom,
  });
}

export function sceneOnCrabHammerView(
  state: SceneOnMovePresentationState,
): SceneOnCrabHammerView {
  if (state.config.move !== "CRABHAMMER") {
    throw new Error(`expected CRABHAMMER presentation, got ${state.config.move}`);
  }
  const attacker = state.config.attacker;
  const target = state.config.target;
  return {
    age: state.age,
    attacker,
    target,
    ...crabHammerAtAge(state.age, {
      targetSide: target.geometry.side,
      targetCenter: target.geometry.animationCenter,
      targetIdleX2: state.config.targetIdleX2,
    }),
  };
}

export function sceneOnDoubleEdgeView(
  state: SceneOnMovePresentationState,
): SceneOnDoubleEdgeView {
  if (state.config.move !== "DOUBLE_EDGE") {
    throw new Error(`expected DOUBLE_EDGE presentation, got ${state.config.move}`);
  }
  const attacker = state.config.attacker;
  const target = state.config.target;
  return {
    age: state.age,
    attacker,
    target,
    ...doubleEdgeAtAge(
      state.age,
      attacker.geometry.side,
      target.geometry.side,
      target.geometry.animationCenter,
    ),
  };
}

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

/** `age=0` is the MetallicShine initializer's first displayed frame. */
export function sceneOnSteelWingView(
  state: SceneOnMovePresentationState,
): SceneOnSteelWingView {
  if (state.config.move !== "STEEL_WING") {
    throw new Error(`expected STEEL_WING presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...steelWingAtAge(
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

/** `age=0` is Magnitude's source root row; branch choice consumes live power. */
export function sceneOnMagnitudeView(
  state: SceneOnMovePresentationState<SceneOnMagnitudeConfig>,
): SceneOnMagnitudeView {
  if (state.config.move !== "MAGNITUDE") {
    throw new Error(`expected MAGNITUDE presentation, got ${state.config.move}`);
  }
  if (state.config.animationInputs.attackerSide !== state.config.attacker.geometry.side
    || state.config.animationInputs.targetSide !== state.config.target.geometry.side) {
    throw new Error("MAGNITUDE live sides disagree with scene geometry");
  }
  return {
    ...magnitudeAtAge(state.age, state.config.animationInputs),
    attacker: state.config.attacker,
    target: state.config.target,
  };
}

/** `age=0` is Sunny Day's first active source-script row. */
export function sceneOnSunnyDayView(
  state: SceneOnSunnyDayPresentationState,
): SceneOnSunnyDayView {
  if (state.config.move !== "SUNNY_DAY") {
    throw new Error(`expected SUNNY_DAY presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...sunnyDayAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerGeometry: {
        centerX: attacker.geometry.animationCenter.x,
        centerY: attacker.geometry.animationCenter.y,
        cornerX: attacker.geometry.spriteCorner.x,
        cornerY: attacker.geometry.spriteCorner.y,
      },
      targetGeometry: {
        centerX: target.geometry.animationCenter.x,
        centerY: target.geometry.animationCenter.y,
        cornerX: target.geometry.spriteCorner.x,
        cornerY: target.geometry.spriteCorner.y,
      },
    }),
    attacker,
    target,
  };
}

/** `age=0` is Uproar's first retained active source-script row. */
export function sceneOnUproarView(
  state: SceneOnUproarPresentationState,
): SceneOnUproarView {
  if (state.config.move !== "UPROAR") {
    throw new Error(`expected UPROAR presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...uproarAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerYDelta: attacker.geometry.animationCenter.y - attacker.geometry.battlePositionCenter.y,
    }),
    attacker,
    target,
  };
}

/** `age=0` is Rapid Spin's first retained pointer-owned source row. */
export function sceneOnRapidSpinView(
  state: SceneOnRapidSpinPresentationState,
): SceneOnRapidSpinView {
  if (state.config.move !== "RAPID_SPIN") {
    throw new Error(`expected RAPID_SPIN presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...rapidSpinAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerCenter: attacker.geometry.animationCenter,
      targetCenter: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is Move_FORESIGHT's first source-script row. */
export function sceneOnForesightView(
  state: SceneOnForesightPresentationState,
): SceneOnForesightView {
  if (state.config.move !== "FORESIGHT") {
    throw new Error(`expected FORESIGHT presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...foresightAtAge(state.age, {
      ...animationInputs,
      targetSide: target.geometry.side,
      targetSpecies: target.species,
      attackerSpecies: attacker.species,
    }),
    attacker,
    target,
  };
}

/** `age=0` is Move_SPIDER_WEB's first source-owned Scene-ON row. */
export function sceneOnSpiderWebView(
  state: SceneOnSpiderWebPresentationState,
): SceneOnSpiderWebView {
  if (state.config.move !== "SPIDER_WEB") {
    throw new Error(`expected SPIDER_WEB presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...spiderWebAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerCenter: attacker.geometry.animationCenter,
      targetCenter: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is Move_PETAL_DANCE's first source-owned Scene-ON row. */
export function sceneOnPetalDanceView(
  state: SceneOnPetalDancePresentationState,
): SceneOnPetalDanceView {
  if (state.config.move !== "PETAL_DANCE") {
    throw new Error(`expected PETAL_DANCE presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...petalDanceAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerBattlePositionCenter: attacker.geometry.battlePositionCenter,
      targetBattlePositionCenter: target.geometry.battlePositionCenter,
      targetSpriteOrigin: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is Move_SKY_UPPERCUT's first pointer-owned Scene-ON row. */
export function sceneOnSkyUppercutView(
  state: SceneOnSkyUppercutPresentationState,
): SceneOnSkyUppercutView {
  if (state.config.move !== "SKY_UPPERCUT") {
    throw new Error(`expected SKY_UPPERCUT presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...skyUppercutAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerCenter: attacker.geometry.animationCenter,
      targetCenter: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_DESTINY_BOND's pointer-owned resource-load source row. */
export function sceneOnDestinyBondView(
  state: SceneOnDestinyBondPresentationState,
): SceneOnDestinyBondView {
  if (state.config.move !== "DESTINY_BOND") {
    throw new Error(`expected DESTINY_BOND presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...destinyBondAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerCenter: attacker.geometry.animationCenter,
      targetCenter: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is MOVE_WATER_PULSE's retained root-load source row. */
export function sceneOnWaterPulseView(
  state: SceneOnWaterPulsePresentationState,
): SceneOnWaterPulseView {
  if (state.config.move !== "WATER_PULSE") {
    throw new Error(`expected WATER_PULSE presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...waterPulseAtAge(state.age, {
      ...animationInputs,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerCenter: attacker.geometry.animationCenter,
      targetCenter: target.geometry.animationCenter,
    }),
    attacker,
    target,
  };
}

/** `age=0` is the retained root row of the selected MOVE_DIG body. */
export function sceneOnDigView(
  state: SceneOnDigPresentationState,
): SceneOnDigView {
  if (state.config.move !== "DIG") {
    throw new Error(`expected DIG presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationInputs } = state.config;
  return {
    ...digAtAge(state.age, {
      ...animationInputs,
      body: state.config.body,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      attackerSpecies: attacker.species,
      targetSpecies: target.species,
      attackerCenter: attacker.geometry.animationCenter,
      // The target's battler reducer state follows its battle-position
      // center; the hit-splat helper separately uses the picture origin.
      targetCenter: target.geometry.battlePositionCenter,
      targetAnimationOrigin: target.geometry.animationCenter,
    }),
    presentationAttacker: attacker,
    presentationTarget: target,
  };
}

/** `age=0` is the first retained source row of the composed Eruption body. */
export function sceneOnEruptionView(
  state: SceneOnEruptionPresentationState,
): SceneOnEruptionView {
  if (state.config.move !== "ERUPTION") {
    throw new Error(`expected ERUPTION presentation, got ${state.config.move}`);
  }
  return {
    ...eruptionAtAge(state.age, state.config.animationProfile),
    attacker: state.config.attacker,
    target: state.config.target,
  };
}

/** `age=0` is the Water Spout root's first retained source row. */
export function sceneOnWaterSpoutView(
  state: SceneOnWaterSpoutPresentationState,
) {
  if (state.config.move !== "WATER_SPOUT") {
    throw new Error(`expected WATER_SPOUT presentation, got ${state.config.move}`);
  }
  if (state.config.animationInputs.attackerSide
    !== state.config.attacker.geometry.side) {
    throw new Error("WATER_SPOUT live attacker side disagrees with scene geometry");
  }
  return {
    ...waterSpoutAtAge(state.age, state.config.animationInputs),
    launchBattler: waterSpoutAtAge(state.age, state.config.animationInputs).attacker,
    attacker: state.config.attacker,
    target: state.config.target,
    ...waterSpoutComponentPlan(state.config.animationInputs),
  };
}

/** `age=0` is the `loadspritegfx ANIM_TAG_MUD_SAND` source row. */
export function sceneOnSandTombView(
  state: SceneOnSandTombPresentationState,
): SceneOnSandTombView {
  if (state.config.move !== "SAND_TOMB") {
    throw new Error(`expected SAND_TOMB presentation, got ${state.config.move}`);
  }
  return {
    ...sandTombAtAge(state.age, state.config.animationProfile),
    attacker: state.config.attacker,
    target: state.config.target,
  };
}

/** `age=0` is Move_TRICK's pointer-owned ITEM_BAG loadspritegfx row. */
export function sceneOnTrickView(
  state: SceneOnTrickPresentationState,
): SceneOnTrickView {
  if (state.config.move !== "TRICK") {
    throw new Error(`expected TRICK presentation, got ${state.config.move}`);
  }
  return {
    ...trickAtAge(state.age, state.config.animationProfile),
    attacker: state.config.attacker,
    target: state.config.target,
  };
}

/** `age=0` is Move_ROCK_BLAST's pointer-owned ROCKS load row. */
export function sceneOnRockBlastView(
  state: SceneOnRockBlastPresentationState,
): SceneOnRockBlastView {
  if (state.config.move !== "ROCK_BLAST") {
    throw new Error(`expected ROCK_BLAST presentation, got ${state.config.move}`);
  }
  const bodyLength = ROCK_BLAST_FIRST_INACTIVE_AGE + 1;
  const bodyIndex = Math.min(
    state.config.bodies.length - 1,
    Math.max(0, Math.floor(state.age / bodyLength)),
  );
  const bodyAge = state.age - bodyIndex * bodyLength;
  const body = state.config.bodies[bodyIndex]!;
  return {
    ...rockBlastAtAge(bodyAge, body.animationProfile),
    attacker: state.config.attacker,
    target: state.config.target,
    bodyIndex,
    bodyAge,
    fieldProfile: body.fieldProfile,
    moveTextVisible: body.moveTextVisible,
  };
}

/** `age=0` is Move_SWIFT's YELLOW_STAR resource-load row. */
export function sceneOnSwiftView(
  state: SceneOnSwiftPresentationState,
): SceneOnSwiftView {
  if (state.config.move !== "SWIFT") {
    throw new Error(`expected SWIFT presentation, got ${state.config.move}`);
  }
  return {
    ...swiftAtAge(state.age, state.config.animationProfile),
    attacker: state.config.attacker,
    target: state.config.target,
  };
}

/** `age=0` is Move_ICE_BEAM's active source-script offset-zero display. */
export function sceneOnIceBeamView(
  state: SceneOnIceBeamPresentationState,
): SceneOnIceBeamView {
  if (state.config.move !== "ICE_BEAM") {
    throw new Error(`expected ICE_BEAM presentation, got ${state.config.move}`);
  }
  return {
    ...iceBeamAtAge(state.age, state.config.animationProfile),
    attacker: state.config.attacker,
    target: state.config.target,
  };
}

/** `age=0` is the pointer-bounded `loadspritegfx ANIM_TAG_MUD_SAND` row. */
export function sceneOnFissureView(
  state: SceneOnMovePresentationState<SceneOnFissureConfig>,
): SceneOnFissureView {
  if (state.config.move !== "FISSURE") {
    throw new Error(`expected FISSURE presentation, got ${state.config.move}`);
  }
  return {
    attacker: state.config.attacker,
    target: state.config.target,
    ...fissureAtAge(
      state.age,
      state.config.target.geometry.side,
      state.config.target.geometry.animationCenter,
      state.config.target.geometry.battlePositionCenter,
      state.config.initialTargetX2,
    ),
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

/** `age=0` is the MetallicShine initializer's first displayed frame. */
export function sceneOnIronDefenseView(
  state: SceneOnMovePresentationState,
): SceneOnIronDefenseView {
  if (state.config.move !== "IRON_DEFENSE") {
    throw new Error(
      `expected IRON_DEFENSE presentation, got ${state.config.move}`,
    );
  }
  const config = state.config as SceneOnIronDefenseConfig;
  return {
    ...ironDefenseAtAge(
      state.age,
      config.attackerSpriteCenter.x,
      config.attackerSpriteCenter.y,
    ),
    attacker: config.attacker,
    target: config.target,
  };
}

/** `age=0` is the move script's first frame (playsewithpan SE_M_LEER); the
 *  flash task is created one engine age later and the palette writes latch
 *  one display behind the RAM state (the draw uses `age - 1`). */
export function sceneOnFlashView(
  state: SceneOnMovePresentationState,
): SceneOnFlashView {
  if (state.config.move !== "FLASH") {
    throw new Error(`expected FLASH presentation, got ${state.config.move}`);
  }
  const config = state.config as SceneOnFlashConfig;
  return {
    ...flashAtAge(state.age),
    attacker: config.attacker,
    target: config.target,
  };
}

/** `age=0` is the move script's first captured frame. The squish task runs
 *  ages 4-78, the blend task ages 4-75 (restore on 76); the affine matrix
 *  renders two displays behind the RAM state and the palette one behind. */
export function sceneOnFacadeView(
  state: SceneOnMovePresentationState,
): SceneOnFacadeView {
  if (state.config.move !== "FACADE") {
    throw new Error(`expected FACADE presentation, got ${state.config.move}`);
  }
  const config = state.config as SceneOnFacadeConfig;
  return {
    ...facadeAtAge(state.age, {
      x: config.attacker.geometry.battlePositionCenter.x,
      y: config.attacker.geometry.battlePositionCenter.y,
    }, config.battlerHeight),
    attacker: config.attacker,
    target: config.target,
  };
}

/** `age=0` is the move script's first captured frame. The minimize task runs
 *  ages 1-150 with BLDALPHA 10/8 held through 151; the affine matrix renders
 *  two displays behind the RAM state and the clones one behind. */
export function sceneOnMinimizeView(
  state: SceneOnMovePresentationState,
): SceneOnMinimizeView {
  if (state.config.move !== "MINIMIZE") {
    throw new Error(`expected MINIMIZE presentation, got ${state.config.move}`);
  }
  const config = state.config as SceneOnMinimizeConfig;
  return {
    ...minimizeAtAge(state.age),
    attacker: config.attacker,
    target: config.target,
  };
}

/** `age=0` is Move_ACID_ARMOR's first pointer-bounded display. */
export function sceneOnAcidArmorView(
  state: SceneOnMovePresentationState,
): SceneOnAcidArmorView {
  if (state.config.move !== "ACID_ARMOR") {
    throw new Error(`expected ACID_ARMOR presentation, got ${state.config.move}`);
  }
  const config = state.config as SceneOnAcidArmorConfig;
  return {
    ...acidArmorAtAge(state.age, config.attacker.geometry.side),
    attacker: config.attacker,
    target: config.target,
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

/** `age=0` is the pointer-bounded YELLOW_BALL load row. */
export function sceneOnConfuseRayView(
  state: SceneOnMovePresentationState,
): SceneOnConfuseRayView {
  if (state.config.move !== "CONFUSE_RAY") {
    throw new Error(`expected CONFUSE_RAY presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...confuseRayAtAge(state.age, {
      attackerSide: state.config.attacker.geometry.side,
      attackerCenter: state.config.attacker.geometry.animationCenter,
      targetCenter: state.config.target.geometry.animationCenter,
    }),
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

/** `age=0` is the first in-bounds frame of MOVE_FIRE_SPIN's script bytes. */
export function sceneOnFireSpinView(
  state: SceneOnMovePresentationState,
): SceneOnFireSpinView {
  if (state.config.move !== "FIRE_SPIN") {
    throw new Error(`expected FIRE_SPIN presentation, got ${state.config.move}`);
  }
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    ...fireSpinAtAge(state.age, {
      targetCenter: state.config.target.geometry.battlePositionCenter,
    }, state.config.target.geometry.side),
  };
}

/** `age=0` is the MetallicShine task creation frame (first displayed step at 2). */
export function sceneOnMetalClawView(
  state: SceneOnMovePresentationState,
): SceneOnMetalClawView {
  if (state.config.move !== "METAL_CLAW") {
    throw new Error(`expected METAL_CLAW presentation, got ${state.config.move}`);
  }
  const config = state.config as SceneOnMetalClawConfig;
  return {
    age: state.age,
    attacker: config.attacker,
    target: config.target,
    ...metalClawAtAge(state.age, {
      attackerSide: config.attacker.geometry.side,
      attackerCenter: config.attackerSpriteCenter,
      targetCenter: config.target.geometry.animationCenter,
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

/**
 * `age=0` is the first frame of GRASS_WHISTLE's move animation script
 * (isolated by `sBattleAnimScriptPtr` within the `Move_GRASS_WHISTLE` bytes).
 * The note body starts at age 19 (`GRASS_WHISTLE_FIRST_NOTE_AGE`).
 */
/** `age=0` is the move script's first in-bounds frame (frame 64/68 in the fixtures). */
export function sceneOnDetectView(
  state: SceneOnMovePresentationState,
): SceneOnDetectView {
  if (state.config.move !== "DETECT") {
    throw new Error(`expected DETECT presentation, got ${state.config.move}`);
  }
  const config = state.config as SceneOnDetectConfig;
  return {
    ...detectAtAge(
      state.age,
      config.attackerPictureOffset,
      config.attacker.geometry.side,
    ),
    age: state.age,
    attacker: config.attacker,
    target: config.target,
  };
}

export function sceneOnGrassWhistleView(
  state: SceneOnMovePresentationState,
): SceneOnGrassWhistleView {
  if (state.config.move !== "GRASS_WHISTLE") {
    throw new Error(`expected GRASS_WHISTLE presentation, got ${state.config.move}`);
  }
  const noteAge = state.age - 19;
  const body = grassWhistleAtAge(
    state.age,
    state.config.attacker.geometry.animationCenter,
    state.config.target.geometry.animationCenter,
    state.config.attacker.geometry.side,
  );
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    notes: noteAge < 0
      ? []
      : grassWhistleNotesBackToFrontAtAge(
          noteAge,
          state.config.attacker.geometry.animationCenter,
          state.config.target.geometry.animationCenter,
        ),
    pan: body.pan,
    greenBlendCoeff: body.greenBlendCoeff,
    visualTaskCount: body.visualTaskCount,
  };
}

/**
 * `age=0` is the first in-bounds MOVE_TEETER_DANCE script row. Sprite/task
 * state is returned at the current source age; the compositor applies the
 * ordinary preceding-row latch at its seam.
 */
export function sceneOnTeeterDanceView(
  state: SceneOnMovePresentationState,
): SceneOnTeeterDanceView {
  if (state.config.move !== "TEETER_DANCE") {
    throw new Error(`expected TEETER_DANCE presentation, got ${state.config.move}`);
  }
  const config = state.config as SceneOnTeeterDanceConfig;
  const body = teeterDanceAtAge(
    state.age,
    config.attacker.geometry.animationCenter,
    config.attacker.geometry.side,
    config.attackerSpriteCenter,
  );
  return {
    age: state.age,
    attacker: config.attacker,
    target: config.target,
    notes: teeterDanceNotesBackToFrontAtAge(
      state.age,
      config.attacker.geometry.animationCenter,
      config.attacker.geometry.side,
    ),
    task: body.task,
    battlerX: body.battlerX,
    battlerX2: body.battlerX2,
    audio: body.audio,
    visualTaskCount: body.visualTaskCount,
  };
}

/**
 * `age=0` is the first in-bounds MOVE_BELLY_DRUM script row.  The reducer
 * retains the source-relative task/sprite/palette arguments; battleScene's
 * ordinary compositor is intentionally not claimed by this seam yet.
 */
export function sceneOnBellyDrumView(
  state: SceneOnMovePresentationState,
): SceneOnBellyDrumView {
  if (state.config.move !== "BELLY_DRUM") {
    throw new Error(`expected BELLY_DRUM presentation, got ${state.config.move}`);
  }
  const config = state.config as SceneOnBellyDrumConfig;
  const body = bellyDrumAtAge(
    state.age,
    config.attackerNoteOrigin,
    config.attacker.geometry.side,
  );
  return {
    age: state.age,
    attacker: config.attacker,
    target: config.target,
    notes: bellyDrumNotesBackToFrontAtAge(state.age, config.attackerNoteOrigin),
    hands: body.hands,
    shakeTasks: body.shakeTasks,
    audio: body.audio,
    sourceOffset: body.sourceOffset,
    visualTaskCount: body.visualTaskCount,
    rainbowBlend: body.rainbowBlend,
    clearRainbowBlend: body.clearRainbowBlend,
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

export function sceneOnRockThrowView(
  state: SceneOnMovePresentationState,
): SceneOnRockThrowView {
  if (state.config.move !== "ROCK_THROW") {
    throw new Error(`expected ROCK_THROW presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationProfile } = state.config;
  const animation = rockThrowAnimationAtAge(
    state.age,
    animationProfile,
    {
      rockOrigin: {
        x: target.geometry.animationCenter.x,
        y: target.geometry.animationCenter.y + 14,
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
      // The target's drawn rest (the renderer's opponent idle; the staged ONIX corner carries its species rest 1).
      state.config.target.geometry.side === "opponent" ? sceneOnBattlerFrontIdleRest(state.config.target).x2 : 0,
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
      state.config.attackerYOffset ?? (state.config.attacker.geometry.side === "player" ? 6 : 2),
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
      const idle = target.liveIdleRest ?? speciesFrontIdleRestOffset(target.species);
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

/** stg107: live, evidence-free scanout plan of one Struggle row. */
export function sceneOnStruggleDisplayPlan(state: SceneOnMovePresentationState<SceneOnStruggleConfig>): StruggleDisplayPlan {
  if (state.config.move !== "STRUGGLE") throw new Error(`expected STRUGGLE presentation, got ${state.config.move}`);
  return struggleDisplayPlan(state.age, state.config.animationInputs);
}
