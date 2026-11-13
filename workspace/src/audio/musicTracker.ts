// aud245b: what the player needs to know about the music at the live frame, kept from the SoundEvents the session produced (live ticks
// and, through lib.ts, the `resume` fast-forward). Pure and write-only like the sink it implements: nothing reads it back into the game.
// It keeps only what can still be sounding: the last BGM start, the last duck, and the events after that start. See docs/aud245-audio-player.md.
import type { SoundEvent, SoundSink } from "./soundEvents.ts";

/** Most events kept after the last BGM start; past it the oldest SE goes first (SEs cannot outlast the BGM state). */
const MAX_TAIL = 1024;

export class MusicTracker implements SoundSink {
  private head: SoundEvent | null = null;
  private duck: SoundEvent | null = null;
  private tail: SoundEvent[] = [];

  push(event: SoundEvent): void {
    switch (event.kind) {
      case "bgm":
        this.head = event;
        this.tail = [];
        return;
      case "duck":
        this.duck = event;
        return;
      case "cry":
      case "pan":
        return;
      default:
        this.tail.push(event);
        if (this.tail.length > MAX_TAIL) {
          const oldestSe = this.tail.findIndex((e) => e.kind === "se");
          this.tail.splice(oldestSe === -1 ? 0 : oldestSe, 1);
        }
    }
  }

  /** The kept events in emission order, ready for `AudioPlayer.restore`. */
  events(): SoundEvent[] {
    const list: SoundEvent[] = [];
    if (this.head) list.push(this.head);
    if (this.duck) list.push(this.duck);
    list.push(...this.tail);
    return list.sort((a, b) => a.frame - b.frame);
  }

  reset(): void {
    this.head = null;
    this.duck = null;
    this.tail = [];
  }
}
