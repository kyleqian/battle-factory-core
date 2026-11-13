// aud245: the committed AAC (.m4a) fallback set and the ROM song -> player table the player reads.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const AUDIO = join(__dirname, "..", "src", "assets", "gen", "audio");
type Alt = {
  format: string;
  mime: string;
  dir: string;
  sampleRates: Record<"se" | "cry" | "song", number>;
  bitrates: Record<string, number>;
  totals: { files: number; bytes: number };
  files: Record<string, { bytes: number; sha256: string; leadSamples: number }>;
};
const manifest = JSON.parse(readFileSync(join(AUDIO, "manifest.json"), "utf8")) as {
  files: Record<string, { bytes: number }>;
  sounds: Record<string, { file: string; kind: string }>;
  totals: { bytes: number };
  alt: Alt;
};
const songPlayers = JSON.parse(readFileSync(join(AUDIO, "song-players.json"), "utf8")) as {
  players: string[];
  priorityChecked: Record<string, boolean>;
  songs: Record<string, [number, number]>;
};

describe("AAC fallback set", () => {
  it("has one .m4a per .ogg, on disk, with matching size and hash", () => {
    expect(readdirSync(join(AUDIO, "aac")).sort()).toEqual(Object.keys(manifest.files).map((f) => f.replace(/\.ogg$/, ".m4a")).sort());
    expect(Object.keys(manifest.alt.files).sort()).toEqual(Object.keys(manifest.files).map((f) => `aac/${f.replace(/\.ogg$/, ".m4a")}`).sort());
    let total = 0;
    for (const [path, meta] of Object.entries(manifest.alt.files)) {
      const data = readFileSync(join(AUDIO, path));
      expect(data.length, path).toBe(meta.bytes);
      expect(createHash("sha256").update(data).digest("hex"), path).toBe(meta.sha256);
      total += meta.bytes;
    }
    expect(manifest.alt.totals).toMatchObject({ files: Object.keys(manifest.files).length, bytes: total });
  });

  it("is AAC-LC in MP4 at sample rates AAC has, with a measured decoder lead", () => {
    expect(manifest.alt.format).toBe("aac-m4a");
    expect(manifest.alt.mime).toBe('audio/mp4; codecs="mp4a.40.2"');
    expect(manifest.alt.dir).toBe("aac/");
    for (const rate of Object.values(manifest.alt.sampleRates)) expect([8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000]).toContain(rate);
    for (const [path, meta] of Object.entries(manifest.alt.files)) {
      const head = readFileSync(join(AUDIO, path)).subarray(0, 4096);
      expect(head.subarray(4, 8).toString("latin1"), path).toBe("ftyp");
      expect(head.includes(Buffer.from("mp4a")) || readFileSync(join(AUDIO, path)).includes(Buffer.from("mp4a")), path).toBe(true);
      expect(Math.abs(meta.leadSamples), path).toBeLessThanOrEqual(1200);
    }
  });

  it("is about the size of the Ogg set (the size impact is documented in docs/aud245-audio-player.md)", () => {
    expect(manifest.alt.totals.bytes).toBeLessThan(manifest.totals.bytes * 1.2);
    expect(manifest.alt.totals.bytes).toBeGreaterThan(manifest.totals.bytes * 0.8);
    expect(existsSync(join(AUDIO, "aac"))).toBe(true);
    expect(statSync(join(AUDIO, "aac")).isDirectory()).toBe(true);
  });
});

describe("song-players.json", () => {
  it("names the four music players and which ones MPlayStart priority-checks (m4a.c: unk_B)", () => {
    expect(songPlayers.players).toEqual(["BGM", "SE1", "SE2", "SE3"]);
    expect(songPlayers.priorityChecked).toEqual({ BGM: false, SE1: true, SE2: true, SE3: false });
  });

  it("has a [player, priority] row for every recorded non-cry song, with the ROM values for the known ones", () => {
    for (const key of Object.keys(manifest.sounds)) {
      if (key.startsWith("cry:")) continue;
      const row = songPlayers.songs[key.split(":")[1]!];
      expect(row, key).toBeDefined();
      expect(row![0]).toBeGreaterThanOrEqual(0);
      expect(row![0]).toBeLessThan(4);
    }
    // sound/song_table.inc: SE_SELECT (5) is on SE2 at priority 5; the BGM songs are on the BGM player; fanfares run on SE2.
    expect(songPlayers.songs["5"]).toEqual([2, 5]);
    for (const bgm of ["354", "412", "469", "476"]) expect(songPlayers.songs[bgm]![0], bgm).toBe(0);
    for (const fanfare of ["368", "459", "466"]) expect(songPlayers.songs[fanfare]![0], fanfare).toBe(2);
  });
});
