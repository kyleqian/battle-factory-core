// hit1 (docs/hit1-move-hit-timing.md): the battle-animation script's `end` waits for the SEs it started.
//
// Cmd_end (battle_anim.c:476-524) first waits while visual / sound tasks or the monbg tasks are alive, then, while IsSEPlaying()
// (sound.c:606-613: SE1 or SE2 still has a track), up to 90 more calls (`++sSoundAnimFramesToWait <= 90`, then m4aMPlayStop on SE1 and
// SE2); only then does gAnimScriptActive fall and the battle script's waitanimation let the hit (effectivenesssound, hitanimation, HP)
// run. So a move whose last SE outlasts its pictures ends with the SE, not with its last drawn row. Presentation timing only.
//
// The SE starts are the script rows of the anim-sound-timing table (script row r runs on the activation row + 1 + r: the row
// gAnimScriptActive rises is row -1); the song lengths are src/data/gen/se-song-rows.json (tools/extract/extract-se-song-rows.ts, the
// m4a tick loop). A new SE on a player replaces the one it plays unless that one has the higher header priority (MPlayStart, m4a.c).
import songData from "../data/gen/se-song-rows.json" with { type: "json" };
import type { AnimPanContext } from "../audio/soundEvents.ts";
import { moveAnimOpRows, type TimedOp } from "./animSoundOps.ts";

/** Cmd_end's cap: 90 waiting calls after the first one that finds every task done, then the SEs are stopped. */
export const CMD_END_SE_WAIT_CAP_ROWS = 90;

type SongRow = readonly [rows: number | null, player: number, priority: number];
const SONGS = (songData as unknown as { songs: Readonly<Record<string, SongRow>> }).songs;

/** IsSEPlaying rows of an SE song from its start iteration (null: the song never ends), its music player (1 / 2 / 3) and priority. */
export function seSongRows(songId: number): SongRow | undefined {
  return SONGS[String(songId)];
}

/**
 * Rows from the activation row (gAnimScriptActive's rise) to the first row IsSEPlaying() reads FALSE after the script's SEs (0: no SE on
 * SE1 / SE2; Infinity: an endless song still plays). An SE id outside the song table is skipped (it cannot hold the script).
 */
export function animScriptSeStopRow(ops: readonly TimedOp[], context: AnimPanContext): number {
  const starts: Array<{ row: number; id: number }> = [];
  for (const op of ops) {
    for (const row of moveAnimOpRows(op, context)) {
      if (row.emission.kind === "se" && row.emission.id !== null) starts.push({ row: op.frame + row.offset, id: row.emission.id });
    }
  }
  starts.sort((a, b) => a.row - b.row);
  const playing = new Map<number, { stop: number; priority: number }>();
  for (const { row, id } of starts) {
    const song = seSongRows(id);
    if (song === undefined) continue;
    const [rows, player, priority] = song;
    if (player !== 1 && player !== 2) continue;
    const at = row + 1;
    const current = playing.get(player);
    if (current !== undefined && current.stop > at && current.priority > priority) continue;
    playing.set(player, { stop: rows === null ? Number.POSITIVE_INFINITY : at + rows, priority });
  }
  let stop = 0;
  for (const { stop: s } of playing.values()) stop = Math.max(stop, s);
  return stop;
}

/**
 * The rows Cmd_end keeps a live body active past its window. `windowRows` = the presented idle lead + the live body rows: the body's last
 * row is activation + windowRows - 1, the ROM's first inactive row when the window ends on the script's last task (idle94's trail -1).
 * The script then falls on max(that row, the SE stop), at most 90 rows later.
 */
export function cmdEndSeWaitRows(windowRows: number, seStopRow: number): number {
  const last = windowRows - 1;
  return Math.max(0, Math.min(seStopRow, last + CMD_END_SE_WAIT_CAP_ROWS) - last);
}
