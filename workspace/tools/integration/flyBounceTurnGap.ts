// Fly / Bounce turn-gap proof (prep11 s2.3): the attacker is absent from the charge body's end to the strike body's start.
// usage (workspace root): node --experimental-strip-types --no-warnings tools/integration/flyBounceTurnGap.ts <rom-rgb-dir> \
//   <romChargeEnd> <romStrikeStart> <seed> <streak> <slot> <moveId> [<rom-rgb-dir-run2>]
// One input: the player is locked into the move (STATUS2_MULTIPLETURNS), so the strike turn runs without an action prompt.
// ROM side: a fresh direct-mGBA dense dump of the lab scenario (tools/probe/run-battle-lab-rgb.py via liveAdapterFramebuffer,
// POKEBENCH_LIVE_EVIDENCE_DIR), frames romChargeEnd+1 .. romStrikeStart-1 (the drafts' windows; never matched to live output).
// Production side: the generated-rental route replayed through the production orchestrator with ordinary input, every frame
// rendered by the production dispatch (core.ts renderWithoutFactoryTerminal), from the frame after the live charge body's
// last age to the frame before the strike body's age 0. The attacker region is the player battler box x 40..103, y 40..111
// (above the text window; the healthboxes, opponent and its shadow lie outside it).
import { createHash } from "node:crypto";
import "../../src/engine/monPicPixelsInstall.ts";
import { readFileSync } from "node:fs";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
import { createBattleResolutionPresentationRenderView, renderBattleResolutionPresentation } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView, renderGeneratedBattleCommandPresentation } from "../../src/engine/battleScene.ts";
const lastIndex = <T>(items: readonly T[], predicate: (item: T) => boolean): number => {
  for (let i = items.length - 1; i >= 0; i -= 1) if (predicate(items[i]!)) return i;
  return -1;
};

const [romDir, chargeEndArg, strikeStartArg, seedArg, streakArg, slotArg, moveArg, romDir2] = process.argv.slice(2);
const romChargeEnd = Number(chargeEndArg), romStrikeStart = Number(strikeStartArg);
const moveId = Number(moveArg), slot = Number(slotArg) as 0 | 1 | 2 | 3;
const X0 = 40, X1 = 104, Y0 = 40, Y1 = 112;
const region = (fb: Uint8Array, stride: number): Buffer => {
  const out = Buffer.alloc((X1 - X0) * (Y1 - Y0) * 3);
  let o = 0;
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const p = (y * 240 + x) * stride;
    out[o++] = fb[p]!; out[o++] = fb[p + 1]!; out[o++] = fb[p + 2]!;
  }
  return out;
};
const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);
const romRegion = (dir: string, frame: number) => region(readFileSync(`${dir}/rgb/${String(frame).padStart(5, "0")}.rgb`), 3);

type Kind = { kind: string; hidden: boolean | null; region: Buffer };
const frames: Kind[] = [];
const r = generatedCommandAnimationReplay(Number(seedArg), "on", [slot], Number(streakArg), false, false, (state) => {
  const fb = new Uint8Array(240 * 160 * 4);
  let kind = "other", hidden: boolean | null = null;
  const res = state.battleResolutionPresentation, cmd = state.battleCommandPresentation;
  if (res && !state.battleForcedPartySelect) {
    renderBattleResolutionPresentation(fb, res, { drawScene: renderBattleResolutionLiveView });
    const view = createBattleResolutionPresentationRenderView(res);
    const c = res.segments[res.segmentIndex]?.commands[res.commandIndex];
    kind = view.effect?.type === "move" ? `move:${view.effect.request.moveId}:t${view.effect.request.turn}:age${view.effect.age}`
      : `resolution:${res.lifecycle.phase}:${c?.type ?? "end"}`;
    hidden = !view.visibility.player.sprite;
  } else if (cmd && !state.battlePartySelect) {
    renderGeneratedBattleCommandPresentation(fb, cmd);
    kind = `command:${cmd.lifecycle.phase}`;
    hidden = !cmd.spriteVisibility.player;
  }
  frames.push({ kind, hidden, region: region(fb, 4) });
});
const chargeLast = lastIndex(frames, f => f.kind.startsWith(`move:${moveId}:t0:`));
const strikeFirst = frames.findIndex(f => f.kind === `move:${moveId}:t1:age0`);
if (chargeLast < 0 || strikeFirst < 0) throw new Error(`route did not reach both bodies (${chargeLast}, ${strikeFirst})`);
const gap = frames.slice(chargeLast + 1, strikeFirst);
const nextPrompt = frames.findIndex((f, i) => i > strikeFirst && f.kind === "command:action-menu");
const romGap = Array.from({ length: romStrikeStart - romChargeEnd - 1 }, (_, i) => romChargeEnd + 1 + i);
const romHashes = new Map<string, number>(), prodHashes = new Map<string, number>();
for (const f of romGap) { const h = hash(romRegion(romDir, f)); romHashes.set(h, (romHashes.get(h) ?? 0) + 1); }
for (const f of gap) { const h = hash(f.region); prodHashes.set(h, (prodHashes.get(h) ?? 0) + 1); }
// Pixel compare: k-th gap frame after each body end (both sides), over the shorter gap.
let comparedFrames = 0, mismatchedPixels = 0, mismatchedFrames = 0;
for (let k = 0; k < Math.min(romGap.length, gap.length); k++) {
  const a = romRegion(romDir, romGap[k]!), b = gap[k]!.region;
  let n = 0;
  for (let p = 0; p < a.length; p += 3) if (a[p] !== b[p] || a[p + 1] !== b[p + 1] || a[p + 2] !== b[p + 2]) n++;
  comparedFrames++; mismatchedPixels += n; if (n) mismatchedFrames++;
}
// Control: the attacker is drawn (region differs from the gap background) at the charge body's age 0 and at the next prompt.
const chargeAge0 = frames.find(f => f.kind === `move:${moveId}:t0:age0`)!;
const background = gap[0]!.region;
const diff = (a: Buffer, b: Buffer) => { let n = 0; for (let p = 0; p < a.length; p += 3) if (a[p] !== b[p] || a[p + 1] !== b[p + 1] || a[p + 2] !== b[p + 2]) n++; return n; };
const kinds = new Map<string, number>();
for (const f of gap) { const k = f.kind.replace(/:age\d+$/, ""); kinds.set(k, (kinds.get(k) ?? 0) + 1); }
const out = {
  route: { seed: Number(seedArg), streak: Number(streakArg), slot, moveId },
  rom: { dir: romDir, chargeEnd: romChargeEnd, strikeStart: romStrikeStart, gapFrames: romGap.length, regionHashes: Object.fromEntries(romHashes),
    run2Identical: romDir2 ? romGap.every(f => hash(romRegion(romDir, f)) === hash(romRegion(romDir2, f))) : null },
  production: { chargeLastFrame: chargeLast + 1, strikeFirstFrame: strikeFirst + 1, gapFrames: gap.length, regionHashes: Object.fromEntries(prodHashes),
    hiddenEveryGapFrame: gap.every(f => f.hidden === true), gapKinds: Object.fromEntries(kinds),
    nextPromptFrame: nextPrompt + 1, attackerVisibleAtNextPrompt: nextPrompt >= 0 ? frames[nextPrompt]!.hidden === false : null,
    nextPromptRegionPixelsVsGapBackground: nextPrompt >= 0 ? diff(frames[nextPrompt]!.region, background) : null },
  compare: { comparedFrames, mismatchedFrames, mismatchedPixels, romGapRegionEqualsProductionGapRegion: romHashes.size === 1 && prodHashes.size === 1
    && [...romHashes.keys()][0] === [...prodHashes.keys()][0] },
  control: { chargeAge0RegionPixelsVsGapBackground: diff(chargeAge0.region, background) },
  stalled: r.stalled,
};
console.log(JSON.stringify(out, null, 1));
