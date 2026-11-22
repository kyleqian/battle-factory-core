// Frame catcher: make an engine trace to catch bugs in (tools/frame-catcher/README.md). The soak's seeded test player
// (tools/soak/randomRoundSoakDriver.ts RandomPlayer) plays a fresh challenge from the draft with button presses; the presses are
// written in the site's trace shape, so engineRun.mjs and romRun.py replay it like a live player's trace.
//
//   node --experimental-strip-types --no-warnings tools/frame-catcher/makeTrace.mjs OUT.json --seed N [--scene on|off]
//        [--policy full|winning|winning-swap|vanilla|coverage-fight] [--battles B] [--lobby-tail N] [--max-frames N] [--game GAME_WORKSPACE]
//        [--level 50|open] [--start-streak N] [--lobby-levels open,50,...] [--symbols 1|2] [--start after-save] [--gameplay-seed N]
//
// Stops after B battles have ended (default 2), at the end of the challenge, or at --max-frames (default 60000). With --lobby-tail N,
// a trace whose B-th battle ends a round (7, 14, ...) stops N frames after the Lobby's free roam starts (the attendant's "record your
// last match?" answered and the farewell read), instead of playing on to the next round's first battle. B = 14 plays round 1, the
// Lobby, the attendant's new challenge and round 2 (fcr2, docs/fcr2-catcher-round2.md). OUT.lines.txt gets the battle text (each
// resolution's lines, with its first frame) and each battle's and round's end, to pick traces that show the situations wanted.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i < 0 ? dflt : args[i + 1]; };
const out = args[0];
const seed = Number(opt("--seed", "1"));
const scene = opt("--scene", "on");
const policy = opt("--policy", "full");
const battlesWanted = Number(opt("--battles", "2"));
const maxFrames = Number(opt("--max-frames", "60000"));
const lobbyTail = args.includes("--lobby-tail") ? Number(opt("--lobby-tail", "120")) : null;
const GAME = path.resolve(opt("--game", path.resolve(here, "../..")));
// opl: --level open plays an Open Level challenge (the trace's challenge.level; the ROM side starts from the Open Level route).
const level = opt("--level", "50");
if (level !== "50" && level !== "open") throw new Error(`makeTrace: bad --level ${level} (want 50|open)`);
// opl: --start-streak N starts with an active win streak of N (a multiple of 7) for the level (FactorySessionOptions.startStreak)
const startStreak = Number(opt("--start-streak", "0"));
// opl: --lobby-levels open,50,... = the level chosen at each new challenge from the Lobby (the test player's lobbyLevels); a Level 50
// mount then needs OPEN LEVEL pickable (FactorySessionOptions.openLevel, written to the trace's challenge)
const lobbyLevels = opt("--lobby-levels", null)?.split(",") ?? null;
if (lobbyLevels && lobbyLevels.some((l) => l !== "50" && l !== "open")) throw new Error(`makeTrace: bad --lobby-levels ${lobbyLevels}`);
const openLevel = lobbyLevels?.includes("open") && level !== "open" ? true : undefined;
// opl: --symbols N (1 or 2) starts with the save's Factory record: N symbols, the speeches a save with them has heard (FactoryFrontierRecord)
const symbols = Number(opt("--symbols", "0"));
const frontier = symbols ? { symbols, heardBrainSpeech: { silver: symbols >= 1, gold: symbols === 2 } } : undefined;

const { FactorySession } = await import(`${GAME}/src/factorySession.ts`);
const { RandomPlayer, Rng, ActionLog } = await import(`${GAME}/tools/soak/randomRoundSoakDriver.ts`);
await import(`${GAME}/src/engine/monPicPixelsInstall.ts`);

const mix = (x) => { x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; return (x ^ (x >>> 16)) >>> 0; };
// opl: --start after-save (Open Level: the ROM side starts from oracle/bootstrap/factory-open-after-save*.json); --gameplay-seed N replaces the
// seed's own gameplay seed (for after-save at Open, the snapshot's gRngValue 4252487367 is the Lobby cursor on frame 0)
const start = opt("--start", "draft");
const gameplaySeed = args.includes("--gameplay-seed") ? Number(opt("--gameplay-seed", "0")) >>> 0 : mix(seed * 2 + 1);
const challenge = { battleScene: scene, gameplaySeed, presentationSeed: mix(seed * 2 + 2), start, ...(level === "open" ? { level } : {}), ...(startStreak ? { startStreak } : {}), ...(openLevel ? { openLevel } : {}), ...(frontier ? { frontier } : {}) };
const session = new FactorySession({ ...challenge, challengeRequest: "hold" });
const player = new RandomPlayer(new Rng(seed), new ActionLog(false), policy);
if (lobbyLevels) player.lobbyLevels = lobbyLevels;
const segments = [];
const lines = [];
let prevRes = null, prevKey = null, battlesEnded = 0, wasPostwin = false, stop = "max-frames";
let challengeRequest = false;
let lobbyAt = null, round = 1, wasDraft = true;
for (let f = 0; f < maxFrames; f += 1) {
  const buttons = player.decide(session.state);
  const b = [...buttons].sort();
  const last = segments.at(-1);
  if (last && last.buttons.join("+") === b.join("+") && last.frames < 600) last.frames += 1;
  else segments.push({ frames: 1, buttons: b });
  const events = session.tick(buttons);
  if (events.some((e) => e.type === "challenge-request" || e.kind === "challenge-request")) challengeRequest = true; // (FactorySession events carry `type`)
  const st = session.state;
  const o = st.factoryRoundBattleOrchestrator;
  const res = o?.battleResolutionPresentation ?? null;
  if (res && res !== prevRes) {
    const text = [];
    for (const sg of res.segments ?? []) for (const cmd of sg.commands ?? []) if (cmd.lines) text.push(cmd.lines.join(" "));
    const key = text.join(" | ");
    if (key !== prevKey) { lines.push(`${session.frame} :: ${key}`); prevKey = key; }
    prevRes = res;
  }
  const postwin = st.postwin !== null || st.factoryTerminal !== null;
  if (postwin && !wasPostwin) {
    battlesEnded += 1;
    // (the outcome from the round's last battle: a lost battle's return hold is a postwin state too)
    const outcome = o?.round?.rules?.lastBattle?.outcome;
    lines.push(`${session.frame} :: -- battle ${battlesEnded} ended (${outcome === "win" ? "won" : outcome ? "lost" : st.postwin ? "won" : "round over"})`);
  }
  wasPostwin = postwin;
  // a new round: the attendant's door walk dealt a new draft (prebattleEntry), the draft screen is up again
  const inDraft = o === undefined || o === null ? st.prebattleEntry !== null : false;
  if (inDraft && !wasDraft && battlesEnded > 0) { round += 1; lines.push(`${session.frame} :: -- round ${round} starts (after ${battlesEnded} battles)`); }
  wasDraft = inDraft;
  if (lobbyTail !== null && battlesEnded >= battlesWanted && st.lobbyFreeRoam && lobbyAt === null) lobbyAt = session.frame;
  if (lobbyAt !== null && session.frame >= lobbyAt + lobbyTail) { stop = "lobby"; break; }
  // after the last wanted battle: play on to the next battle's first menu (the rooms, the swap), then stop
  if (battlesEnded >= battlesWanted && o?.battleCommandPresentation?.lifecycle.phase === "action-menu") { stop = "battles"; break; }
  if (challengeRequest) { stop = "round-over"; break; }
}
fs.writeFileSync(out, JSON.stringify({ challenge, maker: { seed, scene, policy, battlesWanted, stop, frames: session.frame, battlesEnded, rounds: round, lobbyAt }, segments }));
fs.writeFileSync(out.replace(/\.json$/, "") + ".lines.txt", lines.join("\n") + "\n");
console.log(`makeTrace: seed ${seed} ${scene} ${policy}: ${session.frame} frames, ${battlesEnded} battles ended, round ${round}, stop ${stop}`);
