// Post-KO sprite-order tracker routes (presentation-only): generated-rental ordinary battles driven by real command input
// in which the opponent faints, its next mon is sent out and later bodies run. Records the adapter/fallback decisions
// (must be identical before vs after the battle-unit host mapping), ON/OFF logical parity (scene bit 0x80 excluded), and
// the live host tracker vs the independent pure prediction (tools/integration/orderCrossBodyRouteScan.ts) at every
// command edge.
// (library; CLI = postKoTrackerRoutesRun.ts)
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
import { predictTrackers } from "./orderCrossBodyRouteScan.ts";

type Slot = 0 | 1 | 2 | 3;
type Replay = ReturnType<typeof generatedCommandAnimationReplay>;
interface Ev { sequence: number; payload: { kind: string; battler?: number; animationId?: string } }

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

export function postKoRoute(seed: number, slots: readonly Slot[]) {
  const on = generatedCommandAnimationReplay(seed, "on", slots, 0, true);
  const off = generatedCommandAnimationReplay(seed, "off", slots, 0, true);
  const events = on.semanticEvents.map(row => row.event as Ev);
  const opponentFaints = events.filter(e => e.payload.kind === "faint-animation" && e.payload.battler === 1).map(e => e.sequence);
  const sendOuts = events.filter(e => e.payload.kind === "switch-in-animation" && e.payload.battler === 1).map(e => e.sequence);
  const playerFaints = events.filter(e => e.payload.kind === "faint-animation" && e.payload.battler === 0).map(e => e.sequence);
  const entryKnown = (on.boundaries[0] as unknown as { nextEventSequence: number }).nextEventSequence === 0;
  const modelled = predictTrackers(on, entryKnown, true);
  const before = predictTrackers(on, entryKnown, false);
  const bodies = on.commands.filter(row => row.type === "move-animation").map(row => {
    const command = row.command as { eventSequence: number; animation?: { moveId: number; attacker: number } };
    const pre = modelled.preBody.get(command.eventSequence);
    return {
      sequence: command.eventSequence, moveId: command.animation?.moveId ?? 0, side: command.animation?.attacker === 0 ? "player" : "opponent",
      afterSendOut: sendOuts.length > 0 && command.eventSequence > sendOuts[0]!,
      lent: row.spriteOrderInput ?? null,
      pureTrackerKnown: pre?.cursor.order.known ?? false, pureTrackerKnownWithoutUnits: before.preBody.get(command.eventSequence)?.cursor.order.known ?? false,
      pureOccupied: pre?.cursor.order.known ? pre.cursor.occupied : null, pureBattlerSlots: pre?.cursor.order.known ? pre.battlerSlots : null,
    };
  });
  // Live host tracker after each command edge == the pure tracker at the host's event cursor.
  let compared = 0, hostKnown = 0, hostDeclines = 0;
  const mismatches: string[] = [];
  for (const row of on.commands) {
    const view = row.orderHostView;
    if (!view?.cursor) continue;
    const pure = modelled.positions.get(`${view.cursor.requestId}:${view.cursor.segmentIndex}:${view.cursor.nextEventIndex}`);
    if (!pure) continue;
    compared += 1;
    if (!view.known) { if (pure.cursor.order.known) hostDeclines += 1; continue; }
    hostKnown += 1;
    if (!pure.cursor.order.known || JSON.stringify(pure.cursor.order.free) !== JSON.stringify(view.free)
      || JSON.stringify(pure.cursor.occupied) !== JSON.stringify(view.occupied)
      || JSON.stringify(pure.battlerSlots) !== JSON.stringify(view.battlerSlots)) mismatches.push(`frame ${row.frame} ${row.type}`);
  }
  return {
    seed, slots: [...slots], stalled: on.stalled, frames: on.frame, opponentFaints, sendOuts, playerFaints, bodies,
    decisions: {
      animations: on.animations.map(a => ({ moveId: a.moveId, attacker: a.attacker, ages: a.ages.length, adapterActive: a.adapterActive.map(Number).join("") })),
      commands: on.commands.map(row => ({ type: row.type, frame: row.frame, spriteOrderInput: row.spriteOrderInput ?? null,
        paletteInputHistoryKnown: row.paletteInputHistoryKnown ?? null, spriteInputHistoryKnown: row.spriteInputHistoryKnown ?? null })),
      offCommands: off.commands.map(row => ({ type: row.type, spriteOrderInput: row.spriteOrderInput ?? null })),
    },
    parity: rulesParity(on, off),
    hostVsPure: { compared, hostKnown, hostDeclines, mismatches },
  };
}
