// aud245: the bundled audio data the lazily-loaded player (src/audio/player.ts) uses by default. The ONLY source module that
// references src/assets/gen/audio (tests/aud244aAudioManifest.test.ts); lib.ts reaches it only through `import("./audio/player.ts")`.
import manifestJson from "../assets/gen/audio/manifest.json";
import songPlayersJson from "../assets/gen/audio/song-players.json";
import battleSoundsJson from "../assets/gen/battle-sounds.json";
import type { BattleSoundTable } from "./battleSoundNeeds.ts";

export interface PlayerSound {
  readonly file: string;
  readonly kind: string;
  readonly sampleRate: number;
  readonly channels: number;
  readonly offsetSamples: number;
  readonly lengthSamples: number;
  readonly onsetSamples: number;
  readonly loops?: boolean;
  readonly loopStartSamples?: number;
  readonly loopEndSamples?: number;
  readonly pan?: number | null;
  readonly seam?: { readonly maxAbsDiff: number; readonly shortMaxAbsDiff: number };
}

export interface PlayerManifest {
  readonly sounds: Readonly<Record<string, PlayerSound>>;
  readonly alt?: {
    readonly mime: string;
    readonly dir?: string;
    readonly sampleRates: Readonly<Record<"se" | "cry" | "song", number>>;
    readonly files: Readonly<Record<string, { readonly leadSamples: number }>>;
  };
}

export interface PlayerSongPlayers {
  readonly players: readonly string[];
  readonly priorityChecked: Readonly<Record<string, boolean>>;
  readonly songs: Readonly<Record<string, readonly [number, number]>>;
}

export interface PlayerAssets {
  readonly manifest: PlayerManifest;
  readonly songPlayers: PlayerSongPlayers;
  /** fsn1: what a battle can play, for the battle prefetch (absent: the prefetch fetches the cries and the music only). */
  readonly battleSounds?: BattleSoundTable;
  /** Bundled URL of `path` (`bgm-469.ogg`, `aac/bgm-469.m4a`); undefined when the build does not carry it. */
  urlFor(path: string): string | undefined;
}

const urls = import.meta.glob("../assets/gen/audio/{*.ogg,aac/*.m4a}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const byPath = new Map<string, string>();
for (const [key, url] of Object.entries(urls)) byPath.set(key.slice("../assets/gen/audio/".length), url);

export const bundledAssets: PlayerAssets = {
  manifest: manifestJson as unknown as PlayerManifest,
  songPlayers: songPlayersJson as unknown as PlayerSongPlayers,
  battleSounds: battleSoundsJson as unknown as BattleSoundTable,
  urlFor: (path) => byPath.get(path),
};
