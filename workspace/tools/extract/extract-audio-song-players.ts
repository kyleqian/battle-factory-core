// Dev-time extractor (aud245): which m4a music player each song runs on and its header priority, for the WebAudio player's
// SE1 / SE2 / SE3 preemption model. Never imported at runtime.
//   sound/song_table.inc            `song <label>, MUSIC_PLAYER_<X>, <unused>`; the row index is the song id (gSongTable)
//   sound/songs/midi/<label>.s      `.equ <label>_pri, N`: the SongHeader priority byte
//   sound/music_player_table.inc    gMPlayTable's 4th column = MusicPlayerInfo.unk_B (m4a.c:87), the "priority is checked" flag
//   src/m4a.c MPlayStart            starts when !unk_B || (idle or paused) || mplayInfo->priority <= songHeader->priority
// Output: src/assets/gen/audio/song-players.json. Run: node --experimental-strip-types tools/extract/extract-audio-song-players.ts

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REF = join(ROOT, "reference", "pokeemerald");
const PLAYERS = ["BGM", "SE1", "SE2", "SE3"] as const;

const table = readFileSync(join(REF, "sound", "song_table.inc"), "utf8");
const songs: Record<string, [player: number, priority: number]> = {};
let id = 0;
for (const line of table.split("\n")) {
  const m = /^\s*song\s+(\w+),\s*MUSIC_PLAYER_(BGM|SE1|SE2|SE3),/.exec(line);
  if (!m) continue;
  const midi = join(REF, "sound", "songs", "midi", `${m[1]}.s`);
  const pri = existsSync(midi) ? /\.equ\s+\w+_pri,\s*(\d+)/.exec(readFileSync(midi, "utf8")) : null;
  if (pri) songs[String(id)] = [PLAYERS.indexOf(m[2] as (typeof PLAYERS)[number]), Number(pri[1])];
  id += 1;
}

const mplay = readFileSync(join(REF, "sound", "music_player_table.inc"), "utf8");
const priorityChecked = [...mplay.matchAll(/^\s*music_player\s+gMPlayInfo_(\w+),\s*\w+,\s*\w+,\s*(\d+)/gm)].map((m) => [m[1], Number(m[2]) === 1] as const);

const out = {
  schema: "aud245-song-players/1",
  source: "reference/pokeemerald sound/song_table.inc + sound/songs/midi/*.s (_pri) + sound/music_player_table.inc; check = src/m4a.c MPlayStart",
  players: PLAYERS,
  priorityChecked: Object.fromEntries(priorityChecked),
  songs,
};
writeFileSync(join(ROOT, "src", "assets", "gen", "audio", "song-players.json"), `${JSON.stringify(out)}\n`);
console.log(`${id} song rows, ${Object.keys(songs).length} with a header priority; priority-checked players: ${priorityChecked.filter(([, v]) => v).map(([k]) => k).join(", ")}`);
