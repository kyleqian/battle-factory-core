// aud247: the music already playing on a mount's first frame. The session emits no SoundEvent for it (nothing starts it in the game's own
// timeline), so this table seeds the MusicTracker with the bgm event that would have started it, back-dated by its position.
// Pure data keyed by the mount start; nothing in the engine reads it. See docs/aud245-audio-player.md "aud247".
import { BGM_DRAFT } from "../engine/screenSounds.ts";
import type { SoundEvent } from "./soundEvents.ts";

/** m4a ticks per game frame of MUS_B_FACTORY (144 BPM): the ROM's BGM `clock` advanced 1920 ticks in 2000 frames from the anchor. */
const BGM_DRAFT_TICKS_PER_FRAME = 0.96;
/** gMPlayInfo_BGM.clock at the bootstrap anchor (Scene OFF and ON read the same): BGM 469 (header == gSongTable[469]), status 0x1ff. */
const ANCHOR_BGM_CLOCK = 3287;

export type MountStart = "draft" | "after-save";

/** The bgm event that explains the music at frame 0. A start at frame F means the song began F frames before; `frame <= 0` puts it in the past. */
export function initialMusicEvents(start: MountStart | undefined): SoundEvent[] {
  if (start === "after-save") {
    // The Lobby map music (MUS_B_FACTORY) starts with the map; the engine skips the walk and the save, so no ROM position exists: song start.
    return [{ frame: 0, kind: "bgm", id: BGM_DRAFT, pan: null }];
  }
  return [{ frame: -Math.round(ANCHOR_BGM_CLOCK / BGM_DRAFT_TICKS_PER_FRAME), kind: "bgm", id: BGM_DRAFT, pan: null }];
}
