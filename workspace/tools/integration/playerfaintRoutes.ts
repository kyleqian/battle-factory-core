// Player-faint lends on ordinary-input generated routes (presentation-only, docs/playerfaint-lend-audit.md §4): generated-rental
// battles driven by real command input in which the player's mon faints and the forced-replacement party screen is answered with
// the first healthy member (generatedCommandAnimationReplay `answerForcedSwitch`). Records, per body, whether it follows a forced
// player switch-in, the production order lend, the allocator input, and whether the live adapter was active at every age; plus
// ON/OFF logical parity (scene bit 0x80 excluded) and the live host tracker vs the independent pure prediction (postKoRoute).
//   npx vite-node tools/integration/playerfaintRoutes.ts -- [--out <receipt.json>] <seed>:<slot> ...
import { writeFileSync } from "node:fs";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

type Slot = 0 | 1 | 2 | 3;
type Replay = ReturnType<typeof generatedCommandAnimationReplay>;
interface Ev { sequence: number; payload: { kind: string; battler?: number } }

function rulesParity(on: Replay, off: Replay): string | null {
  if (on.boundaries.length !== off.boundaries.length) return `boundary count ${on.boundaries.length} != ${off.boundaries.length}`;
  for (let index = 0; index < on.boundaries.length; index += 1) {
    const a = on.boundaries[index]!, b = off.boundaries[index]!;
    if (JSON.stringify(a.rng) !== JSON.stringify(b.rng)) return `rng differs at boundary ${index}`;
    const { hitMarker: am, ...ar } = a.rules.rulesContext;
    const { hitMarker: bm, ...br } = b.rules.rulesContext;
    if (JSON.stringify(ar) !== JSON.stringify(br)) return `rules differ at boundary ${index}`;
    if ((am ^ bm) !== 0x80) return `hitMarker differs beyond the scene bit at boundary ${index}`;
    if (JSON.stringify(a.boundary) !== JSON.stringify(b.boundary)) return `boundary differs at ${index}`;
  }
  return null;
}

export function playerfaintRoute(seed: number, slots: readonly Slot[], answerForcedSwitch = true) {
  const on = generatedCommandAnimationReplay(seed, "on", slots, 0, true, answerForcedSwitch);
  const off = generatedCommandAnimationReplay(seed, "off", slots, 0, true, answerForcedSwitch);
  const events = on.semanticEvents.map(row => row.event as Ev);
  const playerFaints = events.filter(e => e.payload.kind === "faint-animation" && e.payload.battler === 0).map(e => e.sequence);
  const playerSwitchIns = events.filter(e => e.payload.kind === "switch-in-animation" && e.payload.battler === 0).map(e => e.sequence);
  const bodyCommands = on.commands.filter(row => row.type === "move-animation");
  const animations = on.animations;
  let liveIndex = 0;
  const bodies = bodyCommands.map(row => {
    const command = row.command as { eventSequence: number; animation?: { moveId: number; attacker: number } };
    const sequence = command.eventSequence;
    const moveId = command.animation?.moveId ?? 0;
    const live = animations[liveIndex]?.moveId === moveId && animations[liveIndex]?.attacker === command.animation?.attacker
      ? animations[liveIndex++] : undefined;
    return {
      sequence, moveId, side: command.animation?.attacker === 0 ? "player" : "opponent",
      afterPlayerFaint: playerFaints.some(f => f < sequence),
      afterForcedSwitchIn: playerSwitchIns.some(s => s < sequence) && playerFaints.some(f => f < sequence),
      lent: row.spriteOrderInput ?? null, allocatorKnown: row.spriteInputHistoryKnown ?? null,
      adapterActive: live ? live.adapterActive.map(Number).join("") : null,
    };
  });
  return {
    seed, slots: [...slots], stalled: on.stalled, offStalled: off.stalled, frames: on.frame, playerFaints, playerSwitchIns, bodies,
    parity: rulesParity(on, off),
    decisions: {
      animations: animations.map(a => ({ moveId: a.moveId, attacker: a.attacker, ages: a.ages.length, adapterActive: a.adapterActive.map(Number).join("") })),
      commands: on.commands.map(row => ({ type: row.type, frame: row.frame, spriteOrderInput: row.spriteOrderInput ?? null,
        paletteInputHistoryKnown: row.paletteInputHistoryKnown ?? null, spriteInputHistoryKnown: row.spriteInputHistoryKnown ?? null })),
    },
  };
}

if (process.argv.some(arg => /^\d+:\d$/.test(arg))) {
  const args = process.argv.slice(2).filter(arg => arg !== "--");
  const outIndex = args.indexOf("--out");
  const out = outIndex >= 0 ? args[outIndex + 1] : undefined;
  const rows = [];
  for (const spec of args.filter(arg => /^\d+:\d$/.test(arg))) {
    const [seed, slot] = spec.split(":").map(Number) as [number, Slot];
    const route = playerfaintRoute(seed, Array(8).fill(slot));
    const post = route.bodies.filter(b => b.afterForcedSwitchIn);
    console.log(JSON.stringify({ spec, stalled: route.stalled, parity: route.parity, playerFaints: route.playerFaints.length,
      playerSwitchIns: route.playerSwitchIns.length, bodies: route.bodies.length,
      post: post.map(b => `${b.moveId}:${b.side}:${b.lent ? "lent" : "-"}:${b.allocatorKnown ? "alloc" : "-"}:${b.adapterActive ?? "nolive"}`) }));
    rows.push(route);
  }
  if (out) writeFileSync(out, JSON.stringify(rows, null, 1) + "\n");
}
