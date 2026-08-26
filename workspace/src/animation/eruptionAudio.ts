/**
 * Pure source-relative port of Move_ERUPTION's
 * `loopsewithpan SE_M_ROCK_THROW, SOUND_PAN_TARGET, 16, 12` command.
 *
 * This owns only Cmd_loopsewithpan, Task_LoopAndPlaySE, the resulting SE1
 * starts, and their source-adjusted panning/lifecycle.  The two earlier
 * waitplaysewithpan Explosion commands and every visual/gameplay component
 * are deliberately outside this reducer.
 */

export type EruptionAudioSide = "player" | "opponent";

export const ERUPTION_AUDIO_SOURCE_BASE = 0x082c_e30b;
export const ERUPTION_AUDIO_SOURCE_OFFSET = 187;
export const ERUPTION_AUDIO_SONG_ID = 131;
export const ERUPTION_AUDIO_INTERVAL = 16;
export const ERUPTION_AUDIO_PLAY_COUNT = 12;
export const ERUPTION_AUDIO_TASK_ROWS = 186;
export const ERUPTION_AUDIO_FINAL_PLAY_LOCAL_AGE = 186;
export const ERUPTION_AUDIO_FINAL_ACTIVE_LOCAL_AGE = 235;
export const ERUPTION_AUDIO_FIRST_INACTIVE_LOCAL_AGE = 236;

export interface EruptionAudioProfile {
  /** Source age at which Cmd_loopsewithpan executes and immediately plays. */
  readonly commandAge: number;
  readonly endAge: number;
  readonly taskSlot: number;
  readonly attackerSide: EruptionAudioSide;
  readonly targetSide: EruptionAudioSide;
  /** Ordinary battle status-animation override used by BattleAnimAdjustPanning. */
  readonly attackerStatusAnimationActive?: boolean;
}

export interface EruptionAudioTask {
  readonly slot: number;
  /** Linked-list predecessor byte exposed by the dense probe. */
  readonly priority: number;
  readonly sourcePriority: 1;
  readonly callback: "Task_LoopAndPlaySE";
  readonly data: readonly number[];
}

export interface EruptionAudioFrame {
  readonly age: number;
  readonly localAge: number;
  readonly owned: boolean;
  readonly source: Readonly<{
    readonly owner: "Move_ERUPTION";
    readonly command: "loopsewithpan";
    readonly offset: 187;
    readonly pointer: number;
    readonly pointerParity: 0 | 1;
    readonly args: readonly [131, "SOUND_PAN_TARGET", 16, 12];
  }> | null;
  readonly task: EruptionAudioTask | null;
  readonly soundTaskCount: 0 | 1;
  readonly audio: Readonly<{
    readonly channel: "SE1";
    readonly songId: 131;
    readonly song: "se_m_rock_throw";
    readonly pan: number;
    readonly playIndex: number | null;
    readonly playAges: readonly number[];
    readonly startThisRow: boolean;
    readonly status: 0 | 1 | 0x8000_0000;
    readonly trackFlags: 0 | 128 | 131;
    readonly active: boolean;
    readonly firstInactive: boolean;
  }> | null;
  readonly ownership: Readonly<{
    readonly loopSeWithPanOnly: true;
    readonly explosion: false;
    readonly visuals: false;
    readonly gameplay: false;
    readonly rng: false;
    readonly framebuffer: false;
  }>;
}

const LOCAL_PLAY_AGES = Object.freeze([
  0, 16, 33, 50, 67, 84, 101, 118, 135, 152, 169, 186,
] as const);

function assertProfile(profile: Readonly<EruptionAudioProfile>): void {
  if (!Number.isInteger(profile.commandAge) || profile.commandAge < 0
    || !Number.isInteger(profile.endAge) || profile.endAge < profile.commandAge
    || !Number.isInteger(profile.taskSlot) || profile.taskSlot < 0
    || profile.attackerSide === profile.targetSide) {
    throw new Error("invalid Eruption audio profile");
  }
}

/** Source-faithful ordinary-battle subset of BattleAnimAdjustPanning. */
export function eruptionTargetPan(profile: Readonly<EruptionAudioProfile>): 63 | -63 {
  if (profile.attackerStatusAnimationActive) {
    return profile.attackerSide === "player" ? -63 : 63;
  }
  return profile.targetSide === "opponent" ? 63 : -63;
}

export function eruptionAudioPlayAges(commandAge: number): readonly number[] {
  return LOCAL_PLAY_AGES.map((age) => commandAge + age);
}

function taskAtLocalAge(localAge: number, profile: Readonly<EruptionAudioProfile>, pan: number): EruptionAudioTask | null {
  if (localAge < 0 || localAge >= ERUPTION_AUDIO_FINAL_PLAY_LOCAL_AGE) return null;
  let playIndex = 0;
  for (let i = 1; i < LOCAL_PLAY_AGES.length; i += 1) {
    if (LOCAL_PLAY_AGES[i]! <= localAge) playIndex = i;
  }
  const lastPlayAge = LOCAL_PLAY_AGES[playIndex]!;
  // Cmd_loopsewithpan invokes the callback immediately, and the task scheduler
  // invokes it once more on the command row. Later play rows retain counter 0.
  const frameCounter = lastPlayAge === 0 ? localAge + 1 : localAge - lastPlayAge;
  const data = Array<number>(16).fill(0);
  data[0] = ERUPTION_AUDIO_SONG_ID;
  data[1] = pan;
  data[2] = ERUPTION_AUDIO_INTERVAL;
  data[3] = ERUPTION_AUDIO_PLAY_COUNT - (playIndex + 1);
  data[8] = frameCounter;
  return {
    slot: profile.taskSlot,
    priority: 0xfe,
    sourcePriority: 1,
    callback: "Task_LoopAndPlaySE",
    data,
  };
}

export function eruptionAudioAtAge(age: number, profile: Readonly<EruptionAudioProfile>): EruptionAudioFrame {
  assertProfile(profile);
  const localAge = age - profile.commandAge;
  const owned = localAge >= 0;
  const pan = eruptionTargetPan(profile);
  const playAges = eruptionAudioPlayAges(profile.commandAge);
  const playIndex = LOCAL_PLAY_AGES.indexOf(localAge as typeof LOCAL_PLAY_AGES[number]);
  const startThisRow = playIndex >= 0;
  const active = localAge >= 0 && localAge <= ERUPTION_AUDIO_FINAL_ACTIVE_LOCAL_AGE;
  const firstInactive = localAge === ERUPTION_AUDIO_FIRST_INACTIVE_LOCAL_AGE;
  const status = !active ? 0x8000_0000 : startThisRow ? 0 : 1;
  const trackFlags = !active
    ? 0
    : startThisRow ? 131
      : localAge === ERUPTION_AUDIO_FINAL_ACTIVE_LOCAL_AGE ? 0 : 128;
  return {
    age,
    localAge,
    owned,
    source: localAge === 0 ? {
      owner: "Move_ERUPTION",
      command: "loopsewithpan",
      offset: ERUPTION_AUDIO_SOURCE_OFFSET,
      pointer: ERUPTION_AUDIO_SOURCE_BASE + ERUPTION_AUDIO_SOURCE_OFFSET,
      pointerParity: ((ERUPTION_AUDIO_SOURCE_BASE + ERUPTION_AUDIO_SOURCE_OFFSET) & 1) as 0 | 1,
      args: [ERUPTION_AUDIO_SONG_ID, "SOUND_PAN_TARGET", ERUPTION_AUDIO_INTERVAL, ERUPTION_AUDIO_PLAY_COUNT],
    } : null,
    task: taskAtLocalAge(localAge, profile, pan),
    soundTaskCount: localAge >= 0 && localAge < ERUPTION_AUDIO_FINAL_PLAY_LOCAL_AGE ? 1 : 0,
    audio: owned ? {
      channel: "SE1",
      songId: ERUPTION_AUDIO_SONG_ID,
      song: "se_m_rock_throw",
      pan,
      playIndex: playIndex < 0 ? null : playIndex,
      playAges,
      startThisRow,
      status: status as 0 | 1 | 0x8000_0000,
      trackFlags: trackFlags as 0 | 128 | 131,
      active,
      firstInactive,
    } : null,
    ownership: {
      loopSeWithPanOnly: true,
      explosion: false,
      visuals: false,
      gameplay: false,
      rng: false,
      framebuffer: false,
    },
  };
}

export function eruptionAudioTimeline(profile: Readonly<EruptionAudioProfile>): readonly EruptionAudioFrame[] {
  assertProfile(profile);
  return Array.from({ length: profile.endAge + 1 }, (_, age) => eruptionAudioAtAge(age, profile));
}
