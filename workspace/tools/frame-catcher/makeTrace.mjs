// Frame catcher: make an engine trace to catch bugs in (tools/frame-catcher/README.md). The soak's seeded test player
// (tools/soak/randomRoundSoakDriver.ts RandomPlayer) plays a fresh challenge from the draft with button presses; the presses are
// written in the site's trace shape, so engineRun.mjs and romRun.py replay it like a live player's trace.
//
//   node --experimental-strip-types --no-warnings tools/frame-catcher/makeTrace.mjs OUT.json --seed N [--scene on|off]
//        [--policy full|winning|winning-swap|vanilla|coverage-fight] [--battles B] [--max-frames N] [--game GAME_WORKSPACE]
//
// Stops after B battles have ended (default 2), at the end of the challenge, or at --max-frames (default 60000). OUT.lines.txt gets
// the battle text (each resolution's lines, with its first frame), to pick traces that show the situations wanted.
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
const GAME = path.resolve(opt("--game", path.resolve(here, "../..")));

const { FactorySession } = await import(`${GAME}/src/factorySession.ts`);
const { RandomPlayer, Rng, ActionLog } = await import(`${GAME}/tools/soak/randomRoundSoakDriver.ts`);
await import(`${GAME}/src/engine/monPicPixelsInstall.ts`);

const mix = (x) => { x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; return (x ^ (x >>> 16)) >>> 0; };
const challenge = { battleScene: scene, gameplaySeed: mix(seed * 2 + 1), presentationSeed: mix(seed * 2 + 2), start: "draft" };
const session = new FactorySession({ ...challenge, challengeRequest: "hold" });
const player = new RandomPlayer(new Rng(seed), new ActionLog(false), policy);
const segments = [];
const lines = [];
let prevRes = null, prevKey = null, battlesEnded = 0, wasPostwin = false, stop = "max-frames";
let challengeRequest = false;
for (let f = 0; f < maxFrames; f += 1) {
  const buttons = player.decide(session.state);
  const b = [...buttons].sort();
  const last = segments.at(-1);
  if (last && last.buttons.join("+") === b.join("+") && last.frames < 600) last.frames += 1;
  else segments.push({ frames: 1, buttons: b });
  const events = session.tick(buttons);
  if (events.some((e) => e.kind === "challenge-request")) challengeRequest = true;
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
    lines.push(`${session.frame} :: -- battle ${battlesEnded} ended (${st.postwin ? "won" : "round over"})`);
  }
  wasPostwin = postwin;
  // after the last wanted battle: play on to the next battle's first menu (the rooms, the swap), then stop
  if (battlesEnded >= battlesWanted && o?.battleCommandPresentation?.lifecycle.phase === "action-menu") { stop = "battles"; break; }
  if (challengeRequest) { stop = "round-over"; break; }
}
fs.writeFileSync(out, JSON.stringify({ challenge, maker: { seed, scene, policy, battlesWanted, stop, frames: session.frame }, segments }));
fs.writeFileSync(out.replace(/\.json$/, "") + ".lines.txt", lines.join("\n") + "\n");
console.log(`makeTrace: seed ${seed} ${scene} ${policy}: ${session.frame} frames, ${battlesEnded} battles ended, stop ${stop}`);
