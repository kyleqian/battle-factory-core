// Player-faint model check (docs/playerfaint-lend-audit.md s1-s2): replays the PRODUCTION sprite-order tracker
// (src/engine/spriteOrderEventTransform.ts, all battle units incl. faint / party-menu-reset / battle-reshow / switch-in) over the
// SEMANTIC event list of each playerfaint BattleLab scenario (written from the scenario's battle script, never from masks) and compares,
// at every activation edge, {F, occupancy, battler slots} and the post-switch constants {matrix bitmap 0x3, battler matrices P 1 / O 0,
// empty task table} with the ROM frame before the rise (tools/integration/postkoStateProbe.py). It also derives the occupant ROLES
// (battlers, healthbox main/other/bar per side, enemy shadow) from the units' survivors and checks condition (b) of
// docs/postko-consumer-audit.md s3.2 on the ROM: the occupied prefix of sSpriteOrder relabelled by the role map == the entry prefix.
// `roleLend` = F relabelled by the role map rho (occupants by role, free slots rank-for-rank onto the known-entry free set).
//   npx vite-node tools/integration/playerfaintModelCheck.ts -- <scenario-key> <probe.json> [--write]
import { readFileSync, writeFileSync } from "node:fs";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, spriteOrderTrackerLend, spriteOrderTrackerPostUnitView,
  type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";

type Side = "player" | "opponent";
export type Step = SpriteOrderPresentationEvent | { kind: "edge"; label: string; geometry: "entry" | "post" };
const P: Step = { kind: "action-prompt" }, C: Step = { kind: "actions-committed" }, HIT: Step = { kind: "hit-animation", targetVisible: true };
const body = (moveId: number, attackerSide: Side): Step => ({ kind: "move-animation", moveId, attackerSide });
const edge = (label: string, geometry: "entry" | "post" = "post"): Step => ({ kind: "edge", label, geometry });
const SUN: Step[] = [edge("general:SUN_CONTINUES"), { kind: "general-animation", animation: "SUN_CONTINUES" }];
/** Player faint -> forced party menu (ResetSpriteData) -> menu return reshow without the player battler -> forced switch-in. */
export const PLAYER_FAINT_SWITCH: Step[] = [{ kind: "faint", side: "player" }, { kind: "party-menu-reset" },
  { kind: "battle-reshow", playerBattlerPresent: false }, { kind: "switch-in-start" }, { kind: "switch-in-finish" }];
/** Opponent faint -> next-mon party summary -> send-out (docs/sprite-order-uncovered-units.md s2). */
export const OPPONENT_KO_SEND_OUT: Step[] = [{ kind: "faint", side: "opponent" }, { kind: "party-summary-next" }, { kind: "party-summary-hide" },
  { kind: "next-mon-send-out" }];
export const SCENARIOS: Record<string, Step[]> = {
  // turn 1: slow SLOWBRO Swift KOs the L5 MAGIKARP lead (Splash never runs); forced menu -> JOLTEON.
  // turn 2: JOLTEON Sunny Day (faster), SLOWBRO Swift, sun continues; turn 3: Dragon Dance (+ multi-stat), Swift, sun;
  // turn 4: JOLTEON Swift, SLOWBRO Swift, sun.
  "playerfaint-sunnyday-dragondance-swift": [P, C, edge("129:opponent", "entry"), body(129, "opponent"), HIT, ...PLAYER_FAINT_SWITCH,
    P, C, edge("241:player"), body(241, "player"), edge("129:opponent"), body(129, "opponent"), HIT, ...SUN,
    P, C, edge("349:player"), body(349, "player"), edge("stat:player"), { kind: "stat-animation", argument: 55 },
    edge("129:opponent"), body(129, "opponent"), HIT, ...SUN,
    P, C, edge("129:player"), body(129, "player"), HIT, edge("129:opponent"), body(129, "opponent"), HIT, ...SUN],
  // turn 1: fast JOLTEON Thunderbolt KOs the L5 MAGIKARP lead; forced menu -> SNORLAX. turn 2: SNORLAX Protect (+4 priority, first body),
  // Thunderbolt blocked (no animation); turn 3: JOLTEON Thunderbolt (first). Later ROM activations (PRZ status, full paralysis) follow a
  // body without an EXACT plan (85:opponent) and are not relied on.
  "playerfaint-protect-thunderbolt": [P, C, edge("85:opponent", "entry"), body(85, "opponent"), HIT, ...PLAYER_FAINT_SWITCH,
    P, C, edge("182:player"), body(182, "player"), P, C, edge("85:opponent"), body(85, "opponent")],
  // turn 1 as above (SLOWBRO Swift KOs the MAGIKARP lead); forced menu -> SNORLAX (speed 31 > SLOWBRO). turns 2-5: SNORLAX Light Screen /
  // Heal Bell / Giga Drain / Thunderbolt (first each turn), SLOWBRO Swift after each; turn 5 Thunderbolt paralyzes SLOWBRO (PRZ animation).
  "playerfaint-lightscreen-healbell-gigadrain-thunderbolt": [P, C, edge("129:opponent", "entry"), body(129, "opponent"), HIT, ...PLAYER_FAINT_SWITCH,
    P, C, edge("113:player"), body(113, "player"), edge("129:opponent"), body(129, "opponent"), HIT,
    P, C, edge("215:player"), body(215, "player"), edge("129:opponent"), body(129, "opponent"), HIT,
    P, C, edge("202:player"), body(202, "player"), HIT, edge("129:opponent"), body(129, "opponent"), HIT,
    P, C, edge("85:player"), body(85, "player"), HIT, edge("status:PRZ:opponent"), { kind: "status-animation", status: "PRZ" },
    edge("129:opponent"), body(129, "opponent"), HIT],
  // as the first scenario with JOLTEON in party slot 2 (forced menu DOWN x2): turn 2 Sunny Day, Swift, sun.
  "playerfaint-slot2-sunnyday": [P, C, edge("129:opponent", "entry"), body(129, "opponent"), HIT, ...PLAYER_FAINT_SWITCH,
    P, C, edge("241:player"), body(241, "player"), edge("129:opponent"), body(129, "opponent"), HIT, ...SUN],
  // player faint AFTER an opponent KO: L5 NINETALES Flamethrower KOs a L1 SHEDINJA lead (send-out: opponent battler slot 5), then the
  // SLOWBRO's Swift KOs the L5 NINETALES (turn 2) -> forced menu -> JOLTEON; turn 3: Sunny Day, Swift, sun.
  "playerfaint-afterko-sunnyday": [P, C, edge("53:player", "entry"), body(53, "player"), HIT, ...OPPONENT_KO_SEND_OUT,
    P, C, edge("129:opponent"), body(129, "opponent"), HIT, ...PLAYER_FAINT_SWITCH,
    P, C, edge("241:player"), body(241, "player"), edge("129:opponent"), body(129, "opponent"), HIT, ...SUN],
  // two player faints: SLOWBRO Swift KOs MAGIKARP #1 (turn 1) -> forced menu -> MAGIKARP #2, KO'd in turn 2 -> second forced menu
  // (DOWN x2) -> JOLTEON; turn 3: Sunny Day, Swift, sun.
  "playerfaint-twice-sunnyday": [P, C, edge("129:opponent", "entry"), body(129, "opponent"), HIT, ...PLAYER_FAINT_SWITCH,
    P, C, edge("129:opponent"), body(129, "opponent"), HIT, ...PLAYER_FAINT_SWITCH,
    P, C, edge("241:player"), body(241, "player"), edge("129:opponent"), body(129, "opponent"), HIT, ...SUN],
  // second opponent KO: NINETALES Flamethrower KOs SHEDINJA #1 (turn 1) and SHEDINJA #2 (turn 2; send-out #3 reuses slot 5);
  // turn 3: Sunny Day (first body after send-out #3), SHEDINJA #3 Swift, sun; turn 4: player Swift has no effect (Wonder Guard, no
  // animation), Swift, sun.
  "playerfaint-secondko-sunnyday-swift": [P, C, edge("53:player", "entry"), body(53, "player"), HIT, ...OPPONENT_KO_SEND_OUT,
    P, C, edge("53:player"), body(53, "player"), HIT, ...OPPONENT_KO_SEND_OUT,
    P, C, edge("241:player"), body(241, "player"), edge("129:opponent"), body(129, "opponent"), HIT, ...SUN,
    P, C, edge("129:opponent"), body(129, "opponent"), HIT, ...SUN],
};

/** Occupant roles. Healthbox = [main (CreateSprite), other half (CreateSpriteAtEnd), bar (CreateSpriteAtEnd)]. */
export type Roles = { battler: Record<Side, number | null>; healthbox: Record<Side, readonly number[]>; shadow: number; fixed: readonly number[] };
/** Known entry (ROM gHealthboxSpriteIds / affineParam / data[5] at frame 90: P 0,63,62; O 1,61,60; battlers 6/8; shadow 2). */
export const ENTRY_ROLES: Roles = { battler: { player: 6, opponent: 8 }, healthbox: { player: [0, 63, 62], opponent: [1, 61, 60] }, shadow: 2, fixed: [] };
const roleSlots = (r: Roles) => [r.battler.player, r.battler.opponent, ...r.healthbox.player, ...r.healthbox.opponent, r.shadow, ...r.fixed];
const ENTRY_FREE_SORTED = [...KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER].sort((l, r) => l - r);

/** rho of the role map: occupant by role onto its entry label, free slots rank-for-rank onto the entry free set; null if not role-complete. */
export function roleMap(view: { free: readonly number[]; occupied: readonly number[] }, roles: Roles): Map<number, number> | null {
  const slots = roleSlots(roles), entry = roleSlots(ENTRY_ROLES);
  if (slots.some(s => s === null) || new Set(slots).size !== slots.length) return null;
  const occ = [...view.occupied].sort((l, r) => l - r);
  if (JSON.stringify(occ) !== JSON.stringify([...(slots as number[])].sort((l, r) => l - r))) return null;
  const free = [...view.free].sort((l, r) => l - r);
  if (free.length !== ENTRY_FREE_SORTED.length) return null;
  const rho = new Map<number, number>();
  slots.forEach((s, i) => rho.set(s!, entry[i]!));
  free.forEach((s, rank) => rho.set(s, ENTRY_FREE_SORTED[rank]!));
  return rho;
}

const maskSlots = (mask: string) => { const b = BigInt(`0x${mask}`); return Array.from({ length: 64 }, (_, s) => s).filter(s => (b >> BigInt(s)) & 1n); };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const ENTRY_PREFIX = [62, 60, 0, 63, 1, 61, 6, 8, 2];

export function modelCheck(key: string, probe: { activations: { riseFrame: number; moveIndex: number; animAttacker: number; before: Record<string, unknown> }[] }) {
  const steps = SCENARIOS[key];
  if (!steps) throw new Error(`unknown scenario ${key}`);
  let tracker: SpriteOrderTracker = createSpriteOrderTracker(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
  let roles: Roles = { ...ENTRY_ROLES };
  const edges: Record<string, unknown>[] = [];
  let a = 0;
  for (const step of steps) {
    if (step.kind !== "edge") {
      tracker = applySpriteOrderPresentationEvent(tracker, step);
      const survivors = tracker.cursor.survivors[tracker.cursor.units - 1] ?? [];
      // Roles from the unit survivors (reshowPlayerGone "Cf;Cfee;Cfee;Cf": n0 opponent battler, n1..n3 player healthbox, n4..n6 opponent
      // healthbox, n7 shadow; reshowBoth "Cf;Cf;Cfee;Cfee;Cf": n0 player battler, n1 opponent battler, then the same shifted by one).
      if (step.kind === "battle-reshow") {
        const k = step.playerBattlerPresent ? 1 : 0;
        roles = { battler: { player: step.playerBattlerPresent ? survivors[0]! : null, opponent: survivors[k]! },
          healthbox: { player: survivors.slice(k + 1, k + 4), opponent: survivors.slice(k + 4, k + 7) }, shadow: survivors[k + 7]!, fixed: [] };
      }
      roles = { ...roles, battler: { player: tracker.battlerSlots.player, opponent: tracker.battlerSlots.opponent } };
      continue;
    }
    const rom = probe.activations[a++];
    if (!rom) { edges.push({ label: step.label, missingInRom: true }); continue; }
    const b = rom.before as { order: string; mask: string; battlerSprites: number[]; battlerMatrix: (number | null)[]; bitmap: string; tasks: string[] };
    const occupied = maskSlots(b.mask);
    const order = [...Buffer.from(b.order, "hex")];
    const romF = order.filter(s => !occupied.includes(s)), romPrefix = order.filter(s => occupied.includes(s));
    const view = spriteOrderTrackerPostUnitView(tracker);
    const known = tracker.cursor.order.known;
    const predicted = { free: known ? [...tracker.cursor.order.free] : null, occupied: known ? [...tracker.cursor.occupied] : null,
      battlerSlots: [tracker.battlerSlots.player, tracker.battlerSlots.opponent] };
    const constants = step.geometry === "post" ? { bitmap: "3", battlerMatrix: [1, 0], tasks: [] } : { bitmap: "6", battlerMatrix: [1, 2], tasks: [] };
    const rho = view ? roleMap(view, roles) : null;
    const romRho = roleMap({ free: romF, occupied }, { ...roles, battler: { player: b.battlerSprites[0]!, opponent: b.battlerSprites[1]! } });
    const checks = {
      free: known && same(predicted.free, romF), occupied: known && same(predicted.occupied, occupied),
      battlerSlots: same(predicted.battlerSlots, b.battlerSprites), bitmap: b.bitmap === constants.bitmap, tasks: same(b.tasks, constants.tasks),
      battlerMatrix: b.battlerMatrix.every((m, i) => m === null || m === constants.battlerMatrix[i]),
      // condition (b): the ROM occupant prefix relabelled by the role map is the known-entry prefix
      prefixRelabels: romRho !== null && same(romPrefix.map(s => romRho.get(s)), ENTRY_PREFIX),
      // the role lend agrees with today's production lend wherever production lends (entry, opponent-KO geometry)
      productionAgrees: spriteOrderTrackerLend(tracker) === null || same(spriteOrderTrackerLend(tracker), rho && view ? view.free.map(s => rho.get(s)!) : null),
    };
    edges.push({ label: step.label, geometry: step.geometry, riseFrame: rom.riseFrame, romMove: [rom.moveIndex, rom.animAttacker], known,
      promptPair: tracker.promptPair, checks, mismatches: Object.values(checks).filter(v => !v).length, predicted, roles,
      rom: { free: romF, occupied, prefix: romPrefix, battlerSlots: b.battlerSprites, battlerMatrix: b.battlerMatrix, bitmap: b.bitmap, tasks: b.tasks },
      constants, productionLend: spriteOrderTrackerLend(tracker),
      roleLend: rho && view ? view.free.map(s => rho.get(s)!) : null,
      roleMap: rho ? Object.fromEntries([...rho].filter(([s, l]) => s !== l)) : null });
  }
  // unknown = the strict tracker invalidated earlier for plan-coverage reasons (a body without an EXACT plan); not a relied-on edge
  return { scenario: key, edges, edgeCount: edges.length, knownEdges: edges.filter(e => e.known).length,
    knownMismatchedEdges: edges.filter(e => e.known && (e.mismatches as number) > 0).length,
    mismatchedEdges: edges.filter(e => (e.mismatches as number) > 0 || e.missingInRom).length,
    romActivations: probe.activations.length, invalidReason: tracker.invalidReason };
}

if (process.argv.some(arg => arg.startsWith("playerfaint-"))) {
  const args = process.argv.slice(2).filter(x => x !== "--" && x !== "--write" && !x.endsWith(".ts"));
  const [key, path] = args;
  const result = modelCheck(key!, JSON.parse(readFileSync(path!, "utf8")));
  for (const e of result.edges) console.log(e.label, e.riseFrame, JSON.stringify(e.romMove), "known", e.known, "mismatches", e.mismatches, JSON.stringify(e.checks), "prod lend", e.productionLend === null ? "null" : "lent");
  console.log(JSON.stringify({ edges: result.edgeCount, knownEdges: result.knownEdges, knownMismatchedEdges: result.knownMismatchedEdges, mismatchedEdges: result.mismatchedEdges, romActivations: result.romActivations, invalidReason: result.invalidReason }));
  if (process.argv.includes("--write")) {
    writeFileSync(new URL(`./fixtures/playerfaint/model-check-${key}.json`, import.meta.url), JSON.stringify(result, null, 1) + "\n");
  }
}
