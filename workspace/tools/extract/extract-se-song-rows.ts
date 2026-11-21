// Dev-time extractor (hit1, docs/hit1-move-hit-timing.md): how long each SE song keeps IsSEPlaying() TRUE, from sound/songs/midi/se_*.s.
// Output: src/data/gen/se-song-rows.json, read by src/engine/animEndSeWait.ts (Cmd_end's IsSEPlaying wait, battle_anim.c:490-503).
//
// Per song: [rows, player, priority].
//   rows: the script iteration i + rows is the first to see IsSEPlaying() FALSE for an SE started in iteration i (null: the song never
//     ends, a GOTO / REPT 0 loop: Cmd_end's 90-row cap stops it). The m4a tick loop of the aud259 `seExact` port
//     (tools/extract/extract-anim-sound-timing.ts; MPlayMain m4a_1.s:1150-1370, ply_tempo :920-930, ply_fine :750-777, MPlayStart
//     m4a.c:634-637), with the track's flow control followed: PATT pushes the return (at most 3 levels), PEND pops it (a PEND outside a
//     pattern does nothing), REPT n repeats its target n times. A track reads its commands in tick 1 + (the waits before them); the
//     player's status loses its track bits in the first tick after every track processed FINE; one tick per 150 of tempoC, tempoI 150
//     until the song's TEMPO (= 2 x value = the BPM).
//   player: the song table's music player (sound/song_table.inc: 1 = SE1, 2 = SE2, 3 = SE3). IsSEPlaying (sound.c:606-613) reads SE1 / SE2.
//   priority: the song header's priority (`_pri`): MPlayStart (m4a.c) refuses a song while the player plays one of higher priority.
// ROM check: the frame catcher's CATCHER_WATCH runs (hit1) read the SE1 / SE2 track bits clear on the predicted row on every animation
// window measured (SE_M_TRI_ATTACK2 68 rows, Thunder Punch), and the old values hold (se_effective 73 / se_super_effective 88 /
// se_not_effective 18, seg127; se_m_rain_dance 117, rnc1; se_m_solar_beam 194, se_m_vital_throw2 19, aud259).
//
// Run with: node --experimental-strip-types tools/extract/extract-se-song-rows.ts [--out-dir DIR] (or `npm run extract:se-song-rows`).
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const outDirIndex = process.argv.indexOf("--out-dir");
const outDir = outDirIndex < 0 ? join(RUN_ROOT, "src", "data", "gen") : process.argv[outDirIndex + 1]!;
const SONGS_H = join(REF, "include", "constants", "songs.h");
const SONG_TABLE = join(REF, "sound", "song_table.inc");

const songIds = new Map<string, number>();
for (const m of readFileSync(SONGS_H, "utf8").matchAll(/^#define\s+(SE_\w+)\s+(\d+)/gm)) songIds.set(m[1]!.toLowerCase(), Number(m[2]));
const players = new Map<string, number>();
for (const m of readFileSync(SONG_TABLE, "utf8").matchAll(/^\s*song\s+(\w+)\s*,\s*MUSIC_PLAYER_(\w+)\s*,/gm)) {
  const player = { SE1: 1, SE2: 2, SE3: 3 }[m[2]!];
  if (player !== undefined) players.set(m[1]!, player);
}

type TrackEvent = { tick: number; kind: "tempo" | "fine"; bpm?: number };

/** One track's timed events, or null for an endless track (a GOTO back or REPT 0). */
function trackEvents(name: string, start: string, lines: readonly string[], labels: ReadonlyMap<string, number>, tbs: number): TrackEvent[] | null {
  let pc = labels.get(start)!;
  let tick = 1;
  const stack: number[] = [];
  const repeats = new Map<number, number>();
  const out: TrackEvent[] = [];
  const wordAt = (at: number): string => {
    const m = /^\.word\s+(\w+)$/.exec(lines[at] ?? "");
    if (m === null) throw new Error(`${name}: expected .word at line ${at}`);
    return m[1]!;
  };
  for (let steps = 0; steps < 20000; steps += 1) {
    const line = lines[pc];
    if (line === undefined) throw new Error(`${name}: ran off the song`);
    const wait = /^\.byte\s+W(\d\d)$/.exec(line);
    if (wait !== null) { tick += Number(wait[1]); pc += 1; continue; }
    if (/^\.byte\s+FINE$/.test(line)) { out.push({ tick, kind: "fine" }); return out; }
    const tempo = new RegExp(`^\\.byte\\s+TEMPO\\s*,\\s*(\\d+)\\*${name}_tbs/2$`).exec(line);
    if (tempo !== null) { out.push({ tick, kind: "tempo", bpm: Number(tempo[1]) * tbs }); pc += 1; continue; }
    if (/^\.byte\s+TEMPO\b/.test(line)) throw new Error(`${name}: unexpected tempo form ${line}`);
    if (/^\.byte\s+GOTO$/.test(line)) return null; // every SE GOTO jumps back: the song loops
    if (/^\.byte\s+PATT$/.test(line)) {
      const target = wordAt(pc + 1);
      if (stack.length < 3) { stack.push(pc + 2); pc = labels.get(target)!; } else pc += 2;
      continue;
    }
    if (/^\.byte\s+PEND$/.test(line)) { pc = stack.length > 0 ? stack.pop()! : pc + 1; continue; }
    const rept = /^\.byte\s+REPT\s*,\s*(\d+)$/.exec(line);
    if (rept !== null) {
      const n = Number(rept[1]);
      if (n === 0) return null;
      const count = (repeats.get(pc) ?? 0) + 1;
      if (count < n) { repeats.set(pc, count); pc = labels.get(wordAt(pc + 1))!; } else { repeats.set(pc, 0); pc += 2; }
      continue;
    }
    pc += 1;
  }
  throw new Error(`${name}: no FINE`);
}

function songRows(name: string): { rows: number | null; priority: number } {
  const src = readFileSync(join(REF, "sound", "songs", "midi", `${name}.s`), "utf8");
  const tbs = Number(new RegExp(`\\.equ\\s+${name}_tbs,\\s*(\\d+)`).exec(src)?.[1]);
  const priority = Number(new RegExp(`\\.equ\\s+${name}_pri,\\s*(\\d+)`).exec(src)?.[1]);
  if (!Number.isFinite(tbs) || !Number.isFinite(priority)) throw new Error(`${name}: no tbs / priority`);
  const lines: string[] = [];
  const labels = new Map<string, number>();
  for (const raw of src.split("\n")) {
    const line = raw.split("@")[0]!.trim();
    if (line === "") continue;
    const label = /^(\w+):$/.exec(line);
    if (label !== null) { labels.set(label[1]!, lines.length); continue; }
    lines.push(line);
  }
  const header = new RegExp(`^${name}:\\s*\\n([\\s\\S]*?)\\.end`, "m").exec(src)?.[1];
  if (header === undefined) throw new Error(`${name}: no song header`);
  const tracks = [...header.matchAll(/\.word\s+(\w+)/g)].map((m) => m[1]!).slice(1); // the first .word is the voice group
  const events = tracks.map((track) => trackEvents(name, track, lines, labels, tbs));
  if (events.some((e) => e === null)) return { rows: null, priority };
  const all = events.flatMap((e) => e!);
  const tempos = all.filter((e) => e.kind === "tempo").sort((a, b) => a.tick - b.tick);
  const lastTick = Math.max(...all.filter((e) => e.kind === "fine").map((e) => e.tick)) + 1;
  let tempoC = 0;
  let tempoI = 150;
  let tick = 0;
  for (let vblank = 1; vblank <= 5000; vblank += 1) {
    tempoC += tempoI;
    while (tempoC >= 150) {
      tick += 1;
      for (const t of tempos) if (t.tick === tick) tempoI = t.bpm!;
      if (tick === lastTick) return { rows: vblank, priority };
      tempoC -= 150;
    }
  }
  throw new Error(`${name}: did not end in 5000 VBlanks`);
}

const songs: Record<string, [number | null, number, number]> = {};
for (const [name, id] of [...songIds].sort((a, b) => a[1] - b[1])) {
  const player = players.get(name);
  if (player === undefined) continue;
  const { rows, priority } = songRows(name);
  songs[String(id)] = [rows, player, priority];
}
const sha = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 16);
const out = {
  schema: "se-song-rows/v1",
  description: "Per SE song id: [IsSEPlaying rows from the start iteration (null: never ends), music player (1 SE1, 2 SE2, 3 SE3), header priority]. docs/hit1-move-hit-timing.md.",
  generatedFrom: { extractor: "tools/extract/extract-se-song-rows.ts", files: { "reference/pokeemerald/include/constants/songs.h": sha(SONGS_H), "reference/pokeemerald/sound/song_table.inc": sha(SONG_TABLE) } },
  songs,
};
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "se-song-rows.json"), `${JSON.stringify(out)}\n`);
console.log(`se-song-rows: ${Object.keys(songs).length} songs, ${Object.values(songs).filter((s) => s[0] === null).length} endless`);
