// S11 aud245: the WebAudio player. Consumes the session's write-only SoundEvents (src/audio/soundEvents.ts) and plays the recorded
// assets (the aud244a/b audio asset set) the way the m4a sound driver would. It never talks back to the game: nothing here is
// read by the engine, and lib.ts loads this module only through a dynamic import() when `options.audio` is given or `setAudio` is called.
// Model + ROM citations: docs/aud245-audio-player.md.
import type { SoundEvent } from "./soundEvents.ts";
import { bundledAssets, type PlayerAssets, type PlayerSound } from "./playerAssets.ts";

/** GBA video clock: 280896 cycles/frame at 2^24 Hz. */
export const FRAME_HZ = 16_777_216 / 280_896;
/** include/constants/... CRY_PLAYERS: the two cry music players (sound.c gMPlayInfo_*): the oldest cry is replaced when both are busy. */
const CRY_VOICES = 2;
/** m4aMPlayFadeOut: 16 steps (fade 64 -> 0 in 4s) every `speed` frames, so 16 * speed frames in all. */
const FADE_STEPS = 16;
const LOOKAHEAD_S = 90;
const MAX_PASSES_AHEAD = 48;
const PUMP_MS = 250;
/** The volume the cries were recorded at (tools/audio/soundRecorder.py CRY_VOLUME; sound.c PlayCry_ByMode(.., volume 120)). */
const CRY_RECORDED_VOLUME = 120;
/**
 * snd1: an SE that a new song takes the player from keeps sounding one frame past the start event and then fades over one more frame. m4a acts
 * on its state on the frame of the call, but the mixer's buffer for that frame plays out over the next one, and MPlayStart's TrackStop releases
 * the old notes (envelope release) rather than cutting them. ROM, isolated (soundRecorder's clean state, register-poked PlaySE1WithPanning):
 * SE_BALL_TRAY_BALL pan 63 preempted 2 frames after its call plays its whole first audible frame (RMS 2133, alone 2133) and about half of
 * the next (583 vs 1123); the new one is heard from its own onset. Cutting at the event instead lost every tray ball that the next one
 * followed within 2 frames (the onset is 924 samples, so it had not started yet). docs/snd1-playtest-sounds.md.
 */
export const SE_STOP_LAG_S = 1 / FRAME_HZ;
export const SE_STOP_RELEASE_S = 1 / FRAME_HZ;
/** The default cut ramp of a stopped voice (BGM / cry replacement, mute). */
const CUT_RAMP_S = 0.003;
/** Files fetched once audio is live so the first sounds are not late; everything else is fetched on first use. */
const PREFETCH_BGM = [469];
// snd1: plus the battle-start burst (the ball tray: 14 SEs in one second, five files) so the first battle's tray is not lost to first-use loads.
const PREFETCH_SE = [5, 32, 9, 15, 114, 115, 116];

export type AudioState = "off" | "loading" | "suspended" | "running" | "closed" | "unsupported";

export interface AudioStats {
  state: AudioState;
  enabled: boolean;
  format: "ogg" | "aac";
  /** Events received, by kind. */
  events: Record<string, number>;
  /** Voices started (audible or not), by kind. */
  started: Record<string, number>;
  /** AudioBufferSourceNodes actually created. */
  sources: number;
  /** Starts refused by the m4a priority rule (MPlayStart). */
  blocked: number;
  /** Running songs cut by a start (SE preemption, a cry replacing the oldest, BGM replacing BGM). */
  preempted: number;
  /** Events whose sound has no recorded asset. */
  missing: number;
  /** Cry events whose own mode has no recording, played as the species' NORMAL cry. */
  cryFallbacks: number;
  /** Voices that started late because their file was still loading. */
  late: number;
  fetches: number;
  decoded: number;
  /** Files that fell back from Ogg to AAC after a decode failure. */
  fallbacks: number;
  /** Ducks restored by the player because no restore event came when the cry ended. */
  duckRestores: number;
  /** Events replayed by `restore` (music state of a fast-forward or of a late start), not played as sounds. */
  restored: number;
  /** Files fetched by the start-up prefetch (a subset of `fetches`). */
  prefetched: number;
}

export interface AudioContextLike {
  readonly currentTime: number;
  readonly state: string;
  readonly destination: unknown;
  resume(): Promise<void>;
  close?(): Promise<void>;
  createGain(): GainNodeLike;
  createBufferSource(): BufferSourceLike;
  createChannelMerger(inputs: number): AudioNodeLike;
  decodeAudioData(data: ArrayBuffer, ok?: (buffer: AudioBufferLike) => void, fail?: (error: unknown) => void): Promise<AudioBufferLike> | void;
  addEventListener?(type: string, listener: () => void): void;
}
export interface AudioNodeLike {
  connect(destination: unknown, output?: number, input?: number): unknown;
  disconnect?(): void;
}
export interface AudioParamLike {
  value: number;
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
  cancelScheduledValues(time: number): unknown;
}
export interface GainNodeLike extends AudioNodeLike {
  readonly gain: AudioParamLike;
  channelCount?: number;
  channelCountMode?: string;
}
export interface AudioBufferLike {
  readonly duration: number;
}
export interface BufferSourceLike extends AudioNodeLike {
  buffer: AudioBufferLike | null;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  start(when?: number, offset?: number, duration?: number): void;
  stop(when?: number): void;
}

export interface AudioPlayerOptions {
  enabled?: boolean;
  /** Master volume 0..1 (default 1). */
  volume?: number;
  /** Fetch the audio files from `${baseUrl}/<file>` instead of the bundled asset URLs. */
  baseUrl?: string;
  /** Fixed delay between a game frame and its sound, seconds (default 0.03). */
  latency?: number;
  /** Loop-wrap crossfade, seconds (default 0.007; the spec asks for 5-10 ms). */
  crossfade?: number;
  // Test seams (the fake AudioContext tests, tests/aud245AudioPlayer.test.ts); hosts never pass these.
  assets?: PlayerAssets;
  createContext?: () => AudioContextLike | null;
  clock?: () => number;
  fetchBytes?: (url: string) => Promise<ArrayBuffer>;
  canPlayOgg?: () => boolean;
  gestureTarget?: Pick<EventTarget, "addEventListener" | "removeEventListener"> | null;
  setTimer?: (run: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface AudioPlayer {
  push(event: SoundEvent): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  state(): AudioState;
  volume(): number;
  stats(): AudioStats;
  /** A new session (reset): stop everything, forget the clock anchor. */
  reset(): void;
  /**
   * Bring the music to the state the game is in at `liveFrame` from the events that led there (a `resume` fast-forward, or audio
   * switched on late): replays them on the logical voice model without playing them, then starts what is still sounding at the
   * position it has reached. Events after `liveFrame` are ignored.
   */
  restore(events: readonly SoundEvent[], liveFrame: number): void;
  /** Runs the lookahead scheduler / duck fallback once (the interval timer calls it). */
  pump(): void;
  destroy(): void;
}

type Slot = "BGM" | "SE1" | "SE2" | "SE3" | "CRY0" | "CRY1";
type Loaded = { buffer: AudioBufferLike; bias: number };

interface Voice {
  slot: Slot;
  kind: "se" | "bgm" | "fanfare" | "cry";
  id: number;
  priority: number;
  sound: PlayerSound;
  /** Wall time (seconds, the player's clock) at which file position 0 of the sound plays. */
  t0: number;
  /** Wall time the voice ends (Infinity: loops until stopped). */
  end: number;
  pan: number | null;
  /** Cries: the volume factor against the recording (cryVolumeGain). */
  gain: number;
  out: GainNodeLike | null;
  sources: { src: BufferSourceLike; gain: GainNodeLike | null }[];
  /** Pause position in sound seconds while paused (fanfare pauses the BGM). */
  paused: number | null;
  fade: { t: number; dur: number; from: number; to: number } | null;
  /** Non-exact loops: wall time the last scheduled pass reaches the loop end. */
  boundary: number;
  dead: boolean;
  /** SE1 / SE2 voices: the node every source feeds, so a runtime pan change can be spliced in after it. */
  pre: GainNodeLike | null;
  /** The pan a `pan` event moved this voice to (null: never moved, the recording plays as is). */
  livePan: number | null;
  panStage: { left: GainNodeLike; right: GainNodeLike } | null;
  /** The loop scheduler's inputs, kept so `pump` can add passes. */
  loaded: Loaded | null;
  connect: ((src: BufferSourceLike, gain: GainNodeLike | null) => void) | null;
}

/** include/constants/pokemon.h CRY_MODE_* -> the recorded mode (tools/audio/soundRecorder.py CRY_MODE_ID). Pitch, length, release, chorus and reverse are in the recordings. */
export const CRY_MODE_NAMES: Readonly<Record<number, string>> = {
  0: "NORMAL", 3: "HIGH_PITCH", 4: "ECHO_START", 5: "FAINT", 6: "ECHO_END", 7: "ROAR_1", 8: "ROAR_2", 11: "WEAK",
};

const kindOfFile = (file: string): "se" | "cry" | "song" => (file.startsWith("cry-") ? "cry" : file.startsWith("se-") ? "se" : "song");

/** m4a's pan law (m4a_1.s ChnVolSetAsm; docs/aud245-audio-player.md): linear, relative to the centred mono recording, y = 2 * pan. */
export function m4aPanGains(pan: number): { left: number; right: number } {
  const y = Math.max(-128, Math.min(127, pan * 2));
  return { left: (127 - y) / 127, right: (y + 128) / 128 };
}

/** Cry volume (m4a.c SetPokemonCryVolume: `volume & 0x7F` is the cry song's VOL; TrkVolPitSet: x = vol * volX >> 5, linear in vol) relative to the recording's 120. */
export function cryVolumeGain(volume: number | undefined): number {
  return volume === undefined ? 1 : (volume & 0x7f) / CRY_RECORDED_VOLUME;
}

export function createAudioPlayer(options: AudioPlayerOptions = {}): AudioPlayer {
  return new Player(options);
}

class Player implements AudioPlayer {
  private readonly assets: PlayerAssets;
  private readonly latency: number;
  private readonly crossfade: number;
  private readonly baseUrl: string | undefined;
  private readonly clock: () => number;
  private readonly fetchBytes: (url: string) => Promise<ArrayBuffer>;
  private readonly setTimer: (run: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;
  private readonly gestureTarget: Pick<EventTarget, "addEventListener" | "removeEventListener"> | null;
  private readonly createContext: () => AudioContextLike | null;
  private readonly soundsBySong = new Map<number, { pan: number | null; key: string }[]>();
  private enabled: boolean;
  private level: number;
  private format: "ogg" | "aac";
  private ctx: AudioContextLike | null = null;
  private unsupported = false;
  private master: GainNodeLike | null = null;
  private bgmBus: GainNodeLike | null = null;
  private ctxOffset = 0;
  private anchorWall: number | null = null;
  private anchorFrame = 0;
  private readonly voices = new Map<Slot, Voice>();
  private duck = 1;
  private duckAt = 0;
  private readonly loaded = new Map<string, Promise<Loaded | null>>();
  private readonly ready = new Map<string, Loaded>();
  private timer: unknown = null;
  private gestureArmed = false;
  private destroyed = false;
  private prefetched = false;
  private restoring = false;
  private readonly counters: AudioStats = {
    state: "off",
    enabled: false,
    format: "ogg",
    events: {},
    started: {},
    sources: 0,
    blocked: 0,
    preempted: 0,
    missing: 0,
    cryFallbacks: 0,
    late: 0,
    fetches: 0,
    decoded: 0,
    fallbacks: 0,
    duckRestores: 0,
    restored: 0,
    prefetched: 0,
  };
  private readonly onGesture = (): void => {
    if (this.enabled) this.activate();
  };

  constructor(options: AudioPlayerOptions) {
    this.assets = options.assets ?? bundledAssets;
    this.enabled = options.enabled ?? false;
    this.level = Math.max(0, Math.min(1, options.volume ?? 1));
    this.latency = options.latency ?? 0.03;
    this.crossfade = options.crossfade ?? 0.007;
    this.baseUrl = options.baseUrl === undefined ? undefined : options.baseUrl.replace(/\/*$/, "/");
    this.clock = options.clock ?? ((): number => performance.now() / 1000);
    this.fetchBytes =
      options.fetchBytes ??
      (async (url): Promise<ArrayBuffer> => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`audio fetch ${url}: ${response.status}`);
        return response.arrayBuffer();
      });
    this.setTimer = options.setTimer ?? ((run, ms): unknown => setInterval(run, ms));
    this.clearTimer = options.clearTimer ?? ((handle): void => clearInterval(handle as ReturnType<typeof setInterval>));
    this.gestureTarget = options.gestureTarget === undefined ? (typeof window === "undefined" ? null : window) : options.gestureTarget;
    this.createContext =
      options.createContext ??
      ((): AudioContextLike | null => {
        const g = globalThis as unknown as { AudioContext?: new () => AudioContextLike; webkitAudioContext?: new () => AudioContextLike };
        const Ctor = g.AudioContext ?? g.webkitAudioContext;
        return Ctor ? new Ctor() : null;
      });
    this.format = (options.canPlayOgg ?? defaultCanPlayOgg)() || this.assets.manifest.alt === undefined ? "ogg" : "aac";
    for (const [key, sound] of Object.entries(this.assets.manifest.sounds)) {
      if (!key.startsWith("se:")) continue;
      const id = Number(key.split(":")[1]);
      const list = this.soundsBySong.get(id) ?? [];
      list.push({ pan: sound.pan ?? null, key });
      this.soundsBySong.set(id, list);
    }
    this.timer = this.setTimer(() => this.pump(), PUMP_MS);
    this.armGestures();
    if (this.enabled) this.activate();
  }

  // ---- public API ----

  isEnabled(): boolean {
    return this.enabled;
  }

  volume(): number {
    return this.level;
  }

  state(): AudioState {
    if (this.destroyed) return "closed";
    if (this.unsupported) return "unsupported";
    if (!this.ctx) return "off";
    return this.ctx.state === "running" ? "running" : this.ctx.state === "closed" ? "closed" : "suspended";
  }

  stats(): AudioStats {
    return {
      ...this.counters,
      state: this.state(),
      enabled: this.enabled,
      format: this.format,
      events: { ...this.counters.events },
      started: { ...this.counters.started },
    };
  }

  setEnabled(enabled: boolean): void {
    if (this.destroyed || enabled === this.enabled) return;
    this.enabled = enabled;
    if (enabled) {
      this.armGestures();
      this.activate();
    } else {
      this.silence();
      if (this.master && this.ctx) this.master.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  reset(): void {
    for (const voice of [...this.voices.values()]) this.killVoice(voice);
    this.voices.clear();
    this.duck = 1;
    if (this.bgmBus && this.ctx) this.bgmBus.gain.setValueAtTime(1, this.ctx.currentTime);
    this.anchorWall = null;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.silence();
    this.destroyed = true;
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
    this.disarmGestures();
    void this.ctx?.close?.();
  }

  push(event: SoundEvent): void {
    if (this.destroyed) return;
    this.counters.events[event.kind] = (this.counters.events[event.kind] ?? 0) + 1;
    this.handle(event, this.timeFor(event.frame));
    this.pump();
  }

  restore(events: readonly SoundEvent[], liveFrame: number): void {
    if (this.destroyed) return;
    for (const voice of [...this.voices.values()]) this.killVoice(voice);
    this.voices.clear();
    this.duck = 1;
    if (this.bgmBus && this.ctx) this.bgmBus.gain.setValueAtTime(1, this.ctx.currentTime);
    // The game's live frame plays at `now + latency`; every earlier event sits that many frames back on the same clock.
    const anchor = this.clock() + this.latency;
    this.anchorWall = anchor;
    this.anchorFrame = liveFrame;
    this.syncOffset();
    const { blocked, preempted, missing, cryFallbacks } = this.counters;
    const started = { ...this.counters.started };
    this.restoring = true;
    try {
      for (const event of events) {
        if (event.frame > liveFrame) continue;
        this.counters.events[event.kind] = (this.counters.events[event.kind] ?? 0) + 1;
        this.counters.restored += 1;
        this.handle(event, anchor + (event.frame - liveFrame) / FRAME_HZ);
      }
    } finally {
      this.restoring = false;
    }
    Object.assign(this.counters, { blocked, preempted, missing, cryFallbacks, started });
    // Whatever is still sounding (the BGM at its loop position, a fanfare part-way) starts now; ended voices stay silent.
    if (this.audible()) for (const voice of this.voices.values()) if (!voice.dead && voice.paused === null && voice.end > anchor && voice.sources.length === 0) this.realize(voice, anchor);
  }

  private handle(event: SoundEvent, t: number): void {
    switch (event.kind) {
      case "se":
      case "fanfare":
        this.startSong(event, t, event.kind);
        break;
      case "bgm":
        this.startBgm(event, t);
        break;
      case "cry":
        this.startCry(event, t);
        break;
      case "stop":
        this.stop(event, t);
        break;
      case "continue":
        this.resumeBgm(t);
        break;
      case "fade":
        this.fadeBgm(event, t);
        break;
      case "duck":
        this.setDuck((event.volume ?? 256) / 256, t);
        break;
      case "pan":
        this.panEvent(event.pan ?? 0, t);
        break;
    }
  }

  // ---- clock ----

  /** Frame -> wall time on the 59.7275 Hz clock plus the fixed latency; re-anchored whenever the game's pace and the wall clock part. */
  private timeFor(frame: number): number {
    const now = this.clock();
    let t = this.anchorWall === null ? Number.NaN : this.anchorWall + (frame - this.anchorFrame) / FRAME_HZ;
    if (!(t >= now + 0.002) || t > now + this.latency + 0.25) {
      this.anchorWall = now + this.latency;
      this.anchorFrame = frame;
      t = this.anchorWall;
      this.syncOffset();
    }
    return t;
  }

  private syncOffset(): void {
    if (this.ctx) this.ctxOffset = this.ctx.currentTime - this.clock();
  }

  private c(wall: number): number {
    return wall + this.ctxOffset;
  }

  // ---- context ----

  private audible(): boolean {
    return !this.restoring && this.enabled && this.ctx !== null && this.ctx.state === "running";
  }

  private armGestures(): void {
    if (this.gestureArmed || !this.gestureTarget) return;
    this.gestureArmed = true;
    for (const type of ["pointerdown", "keydown", "touchend", "click"]) this.gestureTarget.addEventListener(type, this.onGesture, { passive: true });
  }

  private disarmGestures(): void {
    if (!this.gestureArmed || !this.gestureTarget) return;
    this.gestureArmed = false;
    for (const type of ["pointerdown", "keydown", "touchend", "click"]) this.gestureTarget.removeEventListener(type, this.onGesture);
  }

  /** Create the context on first need and try to resume it (works inside a user gesture; later gestures retry). */
  private activate(): void {
    if (this.destroyed || this.unsupported) return;
    if (!this.ctx) {
      let ctx: AudioContextLike | null = null;
      try {
        ctx = this.createContext();
      } catch {
        ctx = null;
      }
      if (!ctx) {
        this.unsupported = true;
        return;
      }
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.enabled ? this.level : 0;
      this.master.connect(ctx.destination);
      this.bgmBus = ctx.createGain();
      this.bgmBus.gain.value = this.duck;
      this.bgmBus.connect(this.master);
      ctx.addEventListener?.("statechange", () => this.onStateChange());
      this.syncOffset();
    }
    this.master!.gain.setValueAtTime(this.level, this.ctx.currentTime);
    if (this.ctx.state === "running") {
      this.onStateChange();
    } else {
      void this.ctx.resume().then(
        () => this.onStateChange(),
        () => undefined,
      );
    }
  }

  private onStateChange(): void {
    if (this.destroyed || !this.ctx) return;
    this.syncOffset();
    if (this.ctx.state !== "running" || !this.enabled) return;
    this.disarmGestures();
    this.master!.gain.setValueAtTime(this.level, this.ctx.currentTime);
    const now = this.clock();
    for (const voice of this.voices.values()) {
      const sounding = voice.end === Number.POSITIVE_INFINITY || (voice.slot === "BGM" && voice.end > now);
      if (!voice.dead && voice.paused === null && sounding && voice.sources.length === 0) this.realize(voice, now);
    }
    this.prefetch();
  }

  /** Only the Lobby / draft BGM and the common UI SEs are fetched ahead (once audio is live); every other file waits for its first use. */
  private prefetch(): void {
    if (this.prefetched) return;
    this.prefetched = true;
    const files = new Set<string>();
    const { sounds } = this.assets.manifest;
    for (const [key, sound] of Object.entries(sounds)) {
      const [kind, id] = key.split(":");
      if ((kind === "bgm" && PREFETCH_BGM.includes(Number(id))) || (kind === "se" && PREFETCH_SE.includes(Number(id)))) files.add(sound.file);
    }
    const queue = [...files].filter((file) => !this.loaded.has(file));
    const worker = async (): Promise<void> => {
      for (let file = queue.shift(); file !== undefined && !this.destroyed; file = queue.shift()) {
        this.counters.prefetched += 1;
        await this.load(file);
      }
    };
    for (let i = 0; i < 4; i += 1) void worker();
  }

  /** Mute: cut every audible source but keep the logical state (the BGM resumes in place when audio is switched back on). */
  private silence(): void {
    for (const voice of this.voices.values()) this.dropSources(voice, this.c(this.clock()));
  }

  // ---- loading ----

  private pathFor(file: string, format: "ogg" | "aac"): string {
    return format === "ogg" ? file : `${this.assets.manifest.alt!.dir ?? "aac/"}${file.replace(/\.ogg$/, ".m4a")}`;
  }

  private urlFor(path: string): string | undefined {
    return this.baseUrl !== undefined ? `${this.baseUrl}${path}` : this.assets.urlFor(path);
  }

  private load(file: string): Promise<Loaded | null> {
    let promise = this.loaded.get(file);
    if (!promise) {
      promise = this.fetchDecode(file);
      this.loaded.set(file, promise);
    }
    return promise;
  }

  private async fetchDecode(file: string): Promise<Loaded | null> {
    const formats: ("ogg" | "aac")[] = this.format === "ogg" ? ["ogg", "aac"] : ["aac"];
    if (this.assets.manifest.alt === undefined) formats.splice(formats.indexOf("aac"), 1);
    for (const format of formats) {
      const path = this.pathFor(file, format);
      const url = this.urlFor(path);
      if (url === undefined || this.ctx === null) continue;
      try {
        this.counters.fetches += 1;
        const bytes = await this.fetchBytes(url);
        const buffer = await decode(this.ctx, bytes);
        this.counters.decoded += 1;
        let bias = 0;
        if (format === "aac") {
          const alt = this.assets.manifest.alt!;
          bias = (alt.files[path]?.leadSamples ?? 0) / alt.sampleRates[kindOfFile(file)];
        }
        if (format !== this.format) {
          this.format = format;
          this.counters.fallbacks += 1;
        }
        const loaded = { buffer, bias };
        this.ready.set(file, loaded);
        return loaded;
      } catch {
        // try the next format
      }
    }
    this.loaded.delete(file);
    return null;
  }

  // ---- event handlers (m4a: reference/pokeemerald/src/m4a.c MPlayStart / m4aMPlay*; docs/aud245-audio-player.md) ----

  private live(slot: Slot, t: number): Voice | undefined {
    const voice = this.voices.get(slot);
    return voice !== undefined && !voice.dead && (voice.paused !== null || voice.end > t) ? voice : undefined;
  }

  private sfxSound(id: number, pan: number | null): PlayerSound | undefined {
    const sounds = this.assets.manifest.sounds;
    const exact = sounds[`se:${id}:${pan === null ? "none" : pan}`] ?? sounds[`fanfare:${id}`] ?? sounds[`bgm:${id}`];
    if (exact) return exact;
    const variants = this.soundsBySong.get(id);
    if (!variants) return undefined;
    const want = pan ?? 0;
    let best = variants[0]!;
    for (const variant of variants) if (Math.abs((variant.pan ?? 0) - want) < Math.abs((best.pan ?? 0) - want)) best = variant;
    return sounds[best.key];
  }

  /** MPlayStart's rule: start unless the player is priority-checked (unk_B), busy, and holds a higher priority than the new song. */
  private startSong(event: SoundEvent, t: number, kind: "se" | "fanfare"): void {
    const id = event.id!;
    const row = this.assets.songPlayers.songs[String(id)];
    const sound = this.sfxSound(id, event.pan);
    if (!sound) {
      this.counters.missing += 1;
      return;
    }
    const playerIndex = row?.[0] ?? 1;
    const priority = row?.[1] ?? 0;
    const name = this.assets.songPlayers.players[playerIndex] ?? "SE1";
    if (name === "BGM") {
      this.beginBgm(id, sound, t, kind === "fanfare" ? "fanfare" : "bgm", event.speed);
      return;
    }
    const slot = name as Slot;
    const current = this.live(slot, t);
    if (current && this.assets.songPlayers.priorityChecked[name] === true && current.priority > priority) {
      this.counters.blocked += 1;
      return;
    }
    if (current) {
      this.counters.preempted += 1;
      this.releaseVoice(current, t);
    }
    this.begin({ slot, kind, id, priority, sound, t, pan: event.pan });
  }

  private startBgm(event: SoundEvent, t: number): void {
    const id = event.id!;
    const sound = this.assets.manifest.sounds[`bgm:${id}`];
    const current = this.voices.get("BGM");
    if (current && !current.dead) {
      this.counters.preempted += 1;
      this.killVoice(current, t);
    }
    if (!sound) {
      this.counters.missing += 1;
      return;
    }
    this.beginBgm(id, sound, t, "bgm", event.speed, false);
  }

  private beginBgm(id: number, sound: PlayerSound, t: number, kind: "bgm" | "fanfare", speed: number | undefined, replace = true): void {
    const current = this.voices.get("BGM");
    if (replace && current && !current.dead) {
      this.counters.preempted += 1;
      this.killVoice(current, t);
    }
    const voice = this.begin({ slot: "BGM", kind, id, priority: 0, sound, t, pan: null });
    if (speed !== undefined && speed > 0) {
      voice.fade = { t, dur: (FADE_STEPS * speed) / FRAME_HZ, from: 0, to: 1 };
      this.applyFade(voice, voice.fade);
    }
  }

  private startCry(event: SoundEvent, t: number): void {
    const species = event.id!;
    const sounds = this.assets.manifest.sounds;
    const own = sounds[`cry:${species}:${CRY_MODE_NAMES[event.mode ?? 0] ?? "NORMAL"}`];
    const sound = own ?? sounds[`cry:${species}:NORMAL`];
    if (!sound) {
      this.counters.missing += 1;
      return;
    }
    if (!own) this.counters.cryFallbacks += 1;
    let slot: Slot | undefined;
    let oldest: Voice | undefined;
    for (const candidate of ["CRY0", "CRY1"].slice(0, CRY_VOICES) as Slot[]) {
      const voice = this.live(candidate, t);
      if (!voice) {
        slot = candidate;
        break;
      }
      if (!oldest || voice.t0 < oldest.t0) oldest = voice;
    }
    if (!slot) {
      this.counters.preempted += 1;
      slot = oldest!.slot;
      this.killVoice(oldest!, t);
    }
    this.begin({ slot, kind: "cry", id: species, priority: event.priority ?? 0, sound, t, pan: event.pan, gain: cryVolumeGain(event.volume) });
  }

  private stop(event: SoundEvent, t: number): void {
    if (event.player === "cry") {
      for (const slot of ["CRY0", "CRY1"] as Slot[]) {
        const voice = this.live(slot, t);
        if (voice) this.killVoice(voice, t);
      }
      return;
    }
    if (event.player === "BGM") {
      // m4aMPlayStop: pause the music player (the track position stays); only m4aMPlayContinue or a new song moves it on.
      const voice = this.live("BGM", t);
      if (voice && voice.paused === null) {
        voice.paused = this.positionAt(voice, t);
        this.dropSources(voice, this.c(t));
      }
      return;
    }
    if (event.id === null) return;
    const row = this.assets.songPlayers.songs[String(event.id)];
    const name = this.assets.songPlayers.players[row?.[0] ?? 1] ?? "SE1";
    // m4aSongNumStop: only if that player is currently playing that song (m4aMPlayStop -> TrackStop: the same lag and release as a preemption).
    const voice = this.live(name as Slot, t);
    if (voice && voice.id === event.id) {
      if (voice.kind === "se") this.releaseVoice(voice, t);
      else this.killVoice(voice, t);
    }
  }

  private resumeBgm(t: number): void {
    const voice = this.voices.get("BGM");
    if (!voice || voice.dead || voice.paused === null) return;
    voice.t0 = t - voice.paused;
    voice.paused = null;
    if (this.audible()) this.realize(voice, t);
  }

  /** m4aMPlayFadeOut on the BGM player: to silence in 16 * speed frames, then the song is over. */
  private fadeBgm(event: SoundEvent, t: number): void {
    const voice = this.live("BGM", t);
    if (!voice || voice.paused !== null) return;
    const speed = Math.max(1, event.speed ?? 1);
    voice.fade = { t, dur: (FADE_STEPS * speed) / FRAME_HZ, from: this.fadeValue(voice, t), to: 0 };
    this.applyFade(voice, voice.fade);
    voice.end = Math.min(voice.end, t + voice.fade.dur);
    for (const { src } of voice.sources) src.stop(this.c(voice.end) + 0.004);
  }

  private setDuck(value: number, t: number): void {
    this.duck = value;
    this.duckAt = t;
    if (this.bgmBus && this.ctx) this.bgmBus.gain.setValueAtTime(value, Math.max(this.c(t), this.ctx.currentTime));
  }

  // ---- voices ----

  private begin(spec: { slot: Slot; kind: Voice["kind"]; id: number; priority: number; sound: PlayerSound; t: number; pan: number | null; gain?: number }): Voice {
    const { sound } = spec;
    const t0 = spec.t + sound.onsetSamples / sound.sampleRate;
    const looping = sound.loops === true;
    const voice: Voice = {
      slot: spec.slot,
      kind: spec.kind,
      id: spec.id,
      priority: spec.priority,
      sound,
      t0,
      end: looping ? Number.POSITIVE_INFINITY : t0 + sound.lengthSamples / sound.sampleRate,
      pan: spec.pan,
      gain: spec.gain ?? 1,
      out: null,
      sources: [],
      paused: null,
      fade: null,
      boundary: 0,
      dead: false,
      pre: null,
      livePan: null,
      panStage: null,
      loaded: null,
      connect: null,
    };
    this.voices.set(spec.slot, voice);
    this.counters.started[spec.kind] = (this.counters.started[spec.kind] ?? 0) + 1;
    if (this.audible()) this.realize(voice, spec.t);
    return voice;
  }

  private killVoice(voice: Voice, t: number = this.clock()): void {
    voice.end = Math.min(voice.end, t);
    voice.dead = true;
    this.dropSources(voice, this.c(t));
  }

  /** snd1: an SE stopped by m4a (a preempting start, m4aSongNumStop): heard until one frame after `t`, then released over one frame. */
  private releaseVoice(voice: Voice, t: number): void {
    const at = t + SE_STOP_LAG_S;
    voice.end = Math.min(voice.end, at + SE_STOP_RELEASE_S);
    voice.dead = true;
    this.dropSources(voice, this.c(at), SE_STOP_RELEASE_S);
  }

  private dropSources(voice: Voice, ctxTime: number, ramp = CUT_RAMP_S): void {
    if (this.ctx === null) {
      voice.sources = [];
      return;
    }
    const at = Math.max(ctxTime, this.ctx.currentTime);
    if (voice.out) {
      voice.out.gain.cancelScheduledValues(at);
      voice.out.gain.setValueAtTime(this.fadeValue(voice, at - this.ctxOffset), at);
      voice.out.gain.linearRampToValueAtTime(0, at + ramp);
    }
    for (const { src } of voice.sources) src.stop(at + ramp + 0.001);
    voice.sources = [];
    voice.out = null;
  }

  /** The file position (sound seconds) the voice is at on wall time `t`. */
  private positionAt(voice: Voice, t: number): number {
    const p = Math.max(0, t - voice.t0);
    const { sound } = voice;
    if (sound.loops !== true) return Math.min(p, sound.lengthSamples / sound.sampleRate);
    const end = sound.loopEndSamples! / sound.sampleRate;
    const start = sound.loopStartSamples! / sound.sampleRate;
    return p < end ? p : start + ((p - end) % (end - start));
  }

  private fadeValue(voice: Voice, t: number): number {
    const f = voice.fade;
    if (!f) return 1;
    if (t <= f.t) return f.from;
    if (t >= f.t + f.dur) return f.to;
    return f.from + ((f.to - f.from) * (t - f.t)) / f.dur;
  }

  private applyFade(voice: Voice, fade: NonNullable<Voice["fade"]>): void {
    if (!voice.out || !this.ctx) return;
    const at = Math.max(this.c(fade.t), this.ctx.currentTime);
    voice.out.gain.cancelScheduledValues(at);
    voice.out.gain.setValueAtTime(fade.from, at);
    voice.out.gain.linearRampToValueAtTime(fade.to, this.c(fade.t + fade.dur));
  }

  /** Build the audible sources for `voice` as it should sound from wall time `t` (loading the file first if needed). */
  private realize(voice: Voice, t: number): void {
    const file = voice.sound.file;
    const ready = this.ready.get(file);
    if (ready) {
      this.play(voice, ready, t);
      return;
    }
    void this.load(file).then((loaded) => {
      if (!loaded || voice.dead || this.destroyed || !this.audible() || voice.sources.length > 0 || voice.paused !== null) return;
      this.counters.late += 1;
      this.play(voice, loaded, this.clock() + 0.005);
    });
  }

  private play(voice: Voice, loaded: Loaded, requested: number): void {
    const ctx = this.ctx!;
    if (!this.audible()) return;
    const now = this.clock();
    const nowCtx = ctx.currentTime;
    // At or after `requested`, as late as the clock says; a late start lands where the sound would be by then.
    const at = Math.max(requested, now + 0.003);
    if (at >= voice.end) return;
    const sound = voice.sound;
    const rate = sound.sampleRate;
    const pos = this.positionAt(voice, at);
    const when = Math.max(this.c(at), voice.t0 + this.ctxOffset);
    const startPos = pos;
    const out = ctx.createGain();
    voice.out = out;
    out.gain.setValueAtTime(this.fadeValue(voice, at), nowCtx);
    if (voice.fade && at < voice.fade.t + voice.fade.dur) this.applyFade(voice, voice.fade);
    out.connect(voice.slot === "BGM" ? this.bgmBus : this.master);
    // Cries are mono recordings of the centred voice: m4a's pan law becomes a left and a right gain into a 2-channel merger, scaled by the cry volume.
    let inputs: AudioNodeLike[] = [out];
    voice.pre = null;
    voice.panStage = null;
    if (voice.kind === "cry" && (voice.pan !== null || voice.gain !== 1)) {
      const stage = this.panStage(out, voice.pan === null ? { left: 1, right: 1 } : m4aPanGains(voice.pan), voice.gain);
      inputs = [stage.left, stage.right];
    } else if (voice.kind === "se" && (voice.slot === "SE1" || voice.slot === "SE2")) {
      // SE12PanpotControl can move a playing SE: every source feeds `pre`, which is rewired through a pan stage on the first change.
      const pre = ctx.createGain();
      pre.connect(out);
      voice.pre = pre;
      inputs = [pre];
      if (voice.livePan !== null) this.splicePan(voice, voice.livePan, at);
    }
    const connectSource = (src: BufferSourceLike, gain: GainNodeLike | null): void => {
      if (gain) src.connect(gain);
      for (const input of inputs) (gain ?? src).connect(input);
    };
    const fileOffset = sound.offsetSamples / rate + loaded.bias;
    if (sound.loops !== true) {
      const src = this.source(loaded);
      connectSource(src, null);
      src.start(when, fileOffset + startPos, Math.max(0.001, sound.lengthSamples / rate - startPos));
      voice.sources.push({ src, gain: null });
      return;
    }
    const loopStart = sound.loopStartSamples! / rate;
    const loopEnd = sound.loopEndSamples! / rate;
    const exact = this.exactLoop(sound);
    if (exact) {
      const src = this.source(loaded);
      src.loop = true;
      src.loopStart = loopStart + loaded.bias;
      src.loopEnd = loopEnd + loaded.bias;
      connectSource(src, null);
      src.start(when, fileOffset + startPos);
      voice.sources.push({ src, gain: null });
      return;
    }
    // Crossfaded wraps: pass 0 plays [pos, loopEnd); every later pass starts `crossfade` early on the file's pre-loop samples.
    const first = this.source(loaded);
    const firstGain = ctx.createGain();
    connectSource(first, firstGain);
    first.start(when, fileOffset + startPos, loopEnd - startPos);
    voice.sources.push({ src: first, gain: firstGain });
    voice.boundary = (voice.t0 > at ? voice.t0 : at) + (loopEnd - startPos);
    voice.loaded = loaded;
    voice.connect = connectSource;
    this.extendLoop(voice, loaded, connectSource);
  }

  /** left / right gains (m4a pan law x volume) into a 2-channel merger feeding `into`. */
  private panStage(into: AudioNodeLike, gains: { left: number; right: number }, volume: number): { left: GainNodeLike; right: GainNodeLike } {
    const ctx = this.ctx!;
    const merger = ctx.createChannelMerger(2);
    merger.connect(into);
    const left = ctx.createGain();
    const right = ctx.createGain();
    left.gain.value = gains.left * volume;
    right.gain.value = gains.right * volume;
    left.connect(merger, 0, 0);
    right.connect(merger, 0, 1);
    return { left, right };
  }

  /**
   * SE12PanpotControl (sound.c:600; m4a.c m4aMPlayPanpotControl sets every track's panX): the SE playing on SE1 / SE2 moves to `pan`.
   * The recording was made at its start pan with the stereo mix baked in, so the mid signal (L + R) / 2, which the law keeps at unity
   * (gL + gR = 2 within 0.4%), is re-panned: left = mid * (127 - y) / 127, right = mid * (y + 128) / 128, y = 2 * pan. A pan equal to
   * the recording's own leaves the recording untouched; the song's own stereo (ply_pan inside the song) is lost once it moves.
   */
  private panEvent(pan: number, t: number): void {
    for (const slot of ["SE1", "SE2"] as Slot[]) {
      const voice = this.live(slot, t);
      if (!voice || voice.kind !== "se") continue;
      if (voice.livePan === null && pan === (voice.sound.pan ?? 0)) continue;
      voice.livePan = pan;
      if (voice.pre) this.splicePan(voice, pan, t);
    }
  }

  private splicePan(voice: Voice, pan: number, t: number): void {
    const ctx = this.ctx;
    const pre = voice.pre;
    if (!ctx || !pre || !voice.out) return;
    const gains = m4aPanGains(pan);
    if (!voice.panStage) {
      pre.disconnect?.();
      pre.channelCount = 1;
      pre.channelCountMode = "explicit";
      const stage = this.panStage(voice.out, gains, 1);
      pre.connect(stage.left);
      pre.connect(stage.right);
      voice.panStage = stage;
      return;
    }
    const at = Math.max(this.c(t), ctx.currentTime);
    voice.panStage.left.gain.setValueAtTime(gains.left, at);
    voice.panStage.right.gain.setValueAtTime(gains.right, at);
  }

  private source(loaded: Loaded): BufferSourceLike {
    const src = this.ctx!.createBufferSource();
    src.buffer = loaded.buffer;
    this.counters.sources += 1;
    return src;
  }

  /** The two exact loops (bgm:354, se:132:63: no sample step across the wrap, manifest `seam.shortMaxAbsDiff` 0) loop natively; the other four are crossfaded. */
  private exactLoop(sound: PlayerSound): boolean {
    return (sound.seam?.shortMaxAbsDiff ?? Number.POSITIVE_INFINITY) <= 1;
  }

  private extendLoop(voice: Voice, loaded: Loaded, connectSource: (src: BufferSourceLike, gain: GainNodeLike | null) => void): void {
    const ctx = this.ctx!;
    const sound = voice.sound;
    const rate = sound.sampleRate;
    const loopStart = sound.loopStartSamples! / rate;
    const loopEnd = sound.loopEndSamples! / rate;
    const span = loopEnd - loopStart;
    const x = Math.min(this.crossfade, span / 4);
    const pre = loopStart >= x ? x : 0;
    const horizon = this.clock() + LOOKAHEAD_S;
    let passes = 0;
    while (voice.boundary < horizon && passes < MAX_PASSES_AHEAD && voice.sources.length < MAX_PASSES_AHEAD * 2) {
      const previous = voice.sources[voice.sources.length - 1]!;
      const startWall = voice.boundary - x;
      const gain = ctx.createGain();
      const src = this.source(loaded);
      connectSource(src, gain);
      gain.gain.setValueAtTime(0, this.c(startWall));
      gain.gain.linearRampToValueAtTime(1, this.c(voice.boundary));
      src.start(this.c(startWall), sound.offsetSamples / rate + loaded.bias + loopStart - pre, loopEnd - (loopStart - pre));
      if (previous.gain) {
        previous.gain.gain.setValueAtTime(1, this.c(startWall));
        previous.gain.gain.linearRampToValueAtTime(0, this.c(voice.boundary));
      }
      voice.sources.push({ src, gain });
      voice.boundary = startWall + (loopEnd - (loopStart - pre));
      passes += 1;
    }
  }

  // ---- scheduler ----

  pump(): void {
    if (this.destroyed || !this.ctx) return;
    const now = this.clock();
    for (const voice of this.voices.values()) {
      if (voice.dead || voice.paused !== null || voice.sources.length === 0 || !voice.loaded || !voice.connect || voice.end !== Number.POSITIVE_INFINITY) continue;
      this.extendLoop(voice, voice.loaded, voice.connect);
    }
    // A cry whose end the engine could not time (an unmeasured WEAK cry) never gets a restore event: lift the duck when no cry is left.
    if (this.duck < 1 && now > this.duckAt + 0.5) {
      const busy = (["CRY0", "CRY1"] as Slot[]).some((slot) => this.live(slot, now) !== undefined);
      if (!busy) {
        const end = Math.max(this.duckAt, ...(["CRY0", "CRY1"] as Slot[]).map((slot) => this.voices.get(slot)?.end ?? 0));
        this.counters.duckRestores += 1;
        this.setDuck(1, Math.min(end, now));
      }
    }
  }
}

function defaultCanPlayOgg(): boolean {
  if (typeof document === "undefined") return true;
  const probe = document.createElement("audio");
  return probe.canPlayType('audio/ogg; codecs="vorbis"') !== "";
}

function decode(ctx: AudioContextLike, bytes: ArrayBuffer): Promise<AudioBufferLike> {
  return new Promise((resolve, reject) => {
    const result = ctx.decodeAudioData(bytes, resolve, reject);
    if (result) result.then(resolve, reject);
  });
}

