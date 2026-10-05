// Voluntary-switch model check (docs/voluntary-switch-lend-audit.md s2): replays the PRODUCTION sprite-order tracker
// (src/engine/spriteOrderEventTransform.ts: party-menu-reset, battle-reshow {playerBattlerPresent: true}, the provisional switch-out
// recall, switch-in start/finish, faint, summary, send-out, bodies) over the SEMANTIC event list of each voluntary BattleLab scenario
// (written from the battle script, never from masks) and compares at every activation edge {F, occupancy, battler slots} with the ROM
// frame before the rise (postkoStateProbe.py) and the occupant ROLES with the ROM read (voluntaryRoleProbe.py: gHealthboxSpriteIds, other
// half, bar, enemy shadow). Roles are derived from the units' survivors (reshowBoth "Cf;Cf;Cfee;Cfee;Cf": n0 player battler, n1 opponent
// battler, n2..n4 / n5..n7 player / opponent healthbox, n8 shadow), never from the ROM. Condition (b) of docs/postko-consumer-audit.md
// s3.2: the ROM occupant prefix relabelled by the role map == the entry prefix. `proposedLend` = production lend with the tracker's
// occupantRoles set from those survivors (the proposal of s4); `productionLend` = today's spriteOrderTrackerLend.
//   npx vite-node tools/integration/voluntaryModelCheck.ts -- <scenario-key> <state.json> <roles.json> [--write]
import { readFileSync, writeFileSync } from "node:fs";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, spriteOrderTrackerLend, spriteOrderTrackerPostUnitView,
  type SpriteOrderOccupantRoles, type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { OPPONENT_KO_SEND_OUT, PLAYER_FAINT_SWITCH, roleMap, type Roles } from "./playerfaintModelCheck.ts";

type Side = "player" | "opponent";
export type Step = SpriteOrderPresentationEvent | { kind: "edge"; label: string };
const P: Step = { kind: "action-prompt" }, C: Step = { kind: "actions-committed" }, HIT: Step = { kind: "hit-animation", targetVisible: true };
const body = (moveId: number, attackerSide: Side): Step => ({ kind: "move-animation", moveId, attackerSide });
const edge = (label: string): Step => ({ kind: "edge", label });
const mv = (moveId: number, side: Side, hit = false): Step[] => [edge(`${moveId}:${side}`), body(moveId, side), ...(hit ? [HIT] : [])];
const SUN: Step[] = [edge("general:SUN_CONTINUES"), { kind: "general-animation", animation: "SUN_CONTINUES" }];
/** Voluntary party menu from the action prompt (ResetSpriteData) and its return (exit reset + reshow with both battlers). */
export const MENU_RETURN: Step[] = [P, { kind: "party-menu-reset" }, { kind: "party-menu-reset" }, { kind: "battle-reshow", playerBattlerPresent: true }];
/** Cancelled menu: the action prompt rises again (new bounce pair) and the turn's move is committed. */
export const MENU_CANCEL: Step[] = [...MENU_RETURN, P, C];
/** Chosen switch: no second prompt; the recall (B_ANIM_SWITCH_OUT_PLAYER_MON, an activation edge) then the switch-in. */
export const MENU_SWITCH: Step[] = [...MENU_RETURN, edge("recall"), { kind: "switch-out" }, { kind: "switch-in-start" }, { kind: "switch-in-finish" }];
export const SCENARIOS: Record<string, Step[]> = {
  // JOLTEON (faster) vs SLOWBRO x3 Swift. T1 cancel, Sunny Day / Swift / sun; T2 switch to slot 1 (SNORLAX), Swift, sun;
  // T3 Heal Bell, Swift, sun; T4 Light Screen, Swift, sun.
  "voluntary-cancel-slot1": [...MENU_CANCEL, ...mv(241, "player"), ...mv(129, "opponent", true), ...SUN,
    ...MENU_SWITCH, ...mv(129, "opponent", true), ...SUN,
    P, C, ...mv(215, "player"), ...mv(129, "opponent", true), ...SUN,
    P, C, ...mv(113, "player"), ...mv(129, "opponent", true), ...SUN],
  // NINETALES vs JOLTEON x3 Swift (opponent first every turn). T1 cancel, Swift / Sunny Day / sun; T2 switch to slot 2 (SNORLAX), Swift,
  // sun; T3 Swift, Light Screen, sun; T4 Swift, Heal Bell, sun.
  "voluntary-cancel-slot2": [...MENU_CANCEL, ...mv(129, "opponent", true), ...mv(241, "player"), ...SUN,
    ...MENU_SWITCH, ...mv(129, "opponent", true), ...SUN,
    P, C, ...mv(129, "opponent", true), ...mv(113, "player"), ...SUN,
    P, C, ...mv(129, "opponent", true), ...mv(215, "player"), ...SUN],
  // SHEDINJA Swift KOs the L5 MAGIKARP lead -> forced menu -> NINETALES; T2 Flamethrower KOs SHEDINJA -> summary + send-out (SLOWBRO);
  // T3 Sunny Day, Swift, sun; T4 Swift, Swift, sun.
  "voluntary-faint-ko-sunnyday": [P, C, ...mv(129, "opponent", true), ...PLAYER_FAINT_SWITCH,
    P, C, ...mv(53, "player", true), ...OPPONENT_KO_SEND_OUT,
    P, C, ...mv(241, "player"), ...mv(129, "opponent", true), ...SUN,
    P, C, ...mv(129, "player", true), ...mv(129, "opponent", true), ...SUN],
  // SNORLAX lead switches to slot 1 (NINETALES; a JOLTEON's Volt Absorb skips the animation) into SLOWBRO Thunderbolt (85:opponent has no EXACT plan: the tracker ends after it).
  "voluntary-slot1-thunderbolt": [...MENU_SWITCH, ...mv(85, "opponent", true)],
  // JOLTEON lead switches to slot 2 (SNORLAX) into SLOWBRO Giga Drain (202:opponent has no EXACT plan).
  "voluntary-slot2-gigadrain": [...MENU_SWITCH, ...mv(202, "opponent", true)],
  // SNORLAX (faster) vs SLOWBRO x3 Swift. T1 cancel, Light Screen / Swift; T2 Heal Bell / Swift.
  "voluntary-cancel-lightscreen": [...MENU_CANCEL, ...mv(113, "player"), ...mv(129, "opponent", true),
    P, C, ...mv(215, "player"), ...mv(129, "opponent", true)],
};

const maskSlots = (mask: string) => { const b = BigInt(`0x${mask}`); return Array.from({ length: 64 }, (_, s) => s).filter(s => (b >> BigInt(s)) & 1n); };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const ENTRY_PREFIX = [62, 60, 0, 63, 1, 61, 6, 8, 2];
type RomRoles = { riseFrame: number; battlers: number[]; healthbox: number[][]; shadow: number; inUse: number[] };

/** Occupant roles from a reshow unit's survivors (reshowBoth / reshowPlayerGone). */
function reshowRoles(survivors: readonly number[], playerPresent: boolean): SpriteOrderOccupantRoles {
  const k = playerPresent ? 1 : 0;
  return { healthboxMain: { player: survivors[k + 1]!, opponent: survivors[k + 4]! }, shadow: survivors[k + 7]! };
}

export function modelCheck(key: string, probe: { activations: { riseFrame: number; moveIndex: number; animAttacker: number; before: Record<string, unknown> }[] },
  romRoles: { edges: RomRoles[] }) {
  const steps = SCENARIOS[key];
  if (!steps) throw new Error(`unknown scenario ${key}`);
  let tracker: SpriteOrderTracker = createSpriteOrderTracker(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
  let roles: Roles = { battler: { player: 6, opponent: 8 }, healthbox: { player: [0, 63, 62], opponent: [1, 61, 60] }, shadow: 2, fixed: [] };
  let proposedRoles: SpriteOrderOccupantRoles | null = tracker.occupantRoles;
  const edges: Record<string, unknown>[] = [];
  let a = 0;
  for (const step of steps) {
    if (step.kind !== "edge") {
      tracker = applySpriteOrderPresentationEvent(tracker, step);
      const survivors = tracker.cursor.survivors[tracker.cursor.units - 1] ?? [];
      if (step.kind === "battle-reshow" && tracker.cursor.order.known) {
        const k = step.playerBattlerPresent ? 1 : 0;
        roles = { battler: { player: null, opponent: null }, healthbox: { player: survivors.slice(k + 1, k + 4), opponent: survivors.slice(k + 4, k + 7) },
          shadow: survivors[k + 7]!, fixed: [] };
        proposedRoles = reshowRoles(survivors, step.playerBattlerPresent);
      }
      if (step.kind === "party-menu-reset") proposedRoles = null;
      roles = { ...roles, battler: { player: tracker.battlerSlots.player, opponent: tracker.battlerSlots.opponent } };
      continue;
    }
    const rom = probe.activations[a];
    const romRole = romRoles.edges[a++];
    if (!rom || !romRole) { edges.push({ label: step.label, missingInRom: true }); continue; }
    const b = rom.before as { order: string; mask: string; battlerSprites: number[]; battlerMatrix: (number | null)[]; bitmap: string; tasks: string[] };
    const occupied = maskSlots(b.mask);
    const order = [...Buffer.from(b.order, "hex")];
    const romF = order.filter(s => !occupied.includes(s)), romPrefix = order.filter(s => occupied.includes(s));
    const known = tracker.cursor.order.known;
    const view = spriteOrderTrackerPostUnitView(tracker);
    const predicted = { free: known ? [...tracker.cursor.order.free] : null, occupied: known ? [...tracker.cursor.occupied] : null,
      battlerSlots: [tracker.battlerSlots.player, tracker.battlerSlots.opponent] };
    const romRoleObj: Roles = { battler: { player: romRole.battlers[0]!, opponent: romRole.battlers[1]! },
      healthbox: { player: romRole.healthbox[0]!, opponent: romRole.healthbox[1]! }, shadow: romRole.shadow, fixed: [] };
    const rho = view ? roleMap(view, roles) : null;
    const romRho = roleMap({ free: romF, occupied }, romRoleObj);
    const proposed: SpriteOrderTracker = { ...tracker, occupantRoles: proposedRoles };
    const proposedLend = spriteOrderTrackerLend(proposed), productionLend = spriteOrderTrackerLend(tracker);
    const roleLend = rho && view ? view.free.map(s => rho.get(s)!) : null;
    const checks = {
      free: known && same(predicted.free, romF), occupied: known && same(predicted.occupied, occupied),
      battlerSlots: same(predicted.battlerSlots, b.battlerSprites),
      // model roles (from unit survivors) == ROM roles (gHealthboxSpriteIds + other half + bar, shadowSpriteId), all in use
      roles: same({ ...roles, fixed: [] }, romRoleObj) && romRole.inUse.every(u => u === 1),
      tasks: same(b.tasks, []),
      prefixRelabels: romRho !== null && same(romPrefix.map(s => romRho.get(s)), ENTRY_PREFIX),
      // the proposed production lend (roles kept from reshowBoth through recall + switch-in) == the role lend; at the prompt/recall edge
      // (prompt pair alive / mid-unit) both are null
      proposedEqualsRole: same(proposedLend, roleLend),
      productionAgrees: productionLend === null || same(productionLend, roleLend),
    };
    edges.push({ label: step.label, riseFrame: rom.riseFrame, romMove: [rom.moveIndex, rom.animAttacker], known, lastUnit: tracker.lastUnit,
      checks, mismatches: Object.values(checks).filter(v => !v).length, predicted, roles,
      rom: { free: romF, occupied, prefix: romPrefix, battlerSlots: b.battlerSprites, battlerMatrix: b.battlerMatrix, bitmap: b.bitmap, tasks: b.tasks, roles: romRole },
      productionLend, proposedLend, roleLend, roleMap: rho ? Object.fromEntries([...rho].filter(([s, l]) => s !== l)) : null });
  }
  return { scenario: key, edges, edgeCount: edges.length, knownEdges: edges.filter(e => e.known).length,
    knownMismatchedEdges: edges.filter(e => e.known && (e.mismatches as number) > 0).length,
    romActivations: probe.activations.length, invalidReason: tracker.invalidReason };
}

if (process.argv.some(arg => arg.startsWith("voluntary-"))) {
  const args = process.argv.slice(2).filter(x => x !== "--" && x !== "--write" && !x.endsWith(".ts"));
  const [key, path, rolesPath] = args;
  const result = modelCheck(key!, JSON.parse(readFileSync(path!, "utf8")), JSON.parse(readFileSync(rolesPath!, "utf8")));
  for (const e of result.edges) {
    const failed = Object.entries((e.checks ?? {}) as Record<string, boolean>).filter(([, v]) => !v).map(([k]) => k);
    console.log(e.label, e.riseFrame, JSON.stringify(e.romMove), "known", e.known, e.lastUnit, "mismatches", e.mismatches, failed.join(","),
      "prod", e.productionLend === null ? "null" : "lent", "proposed", e.proposedLend === null ? "null" : "lent");
  }
  console.log(JSON.stringify({ edges: result.edgeCount, knownEdges: result.knownEdges, knownMismatchedEdges: result.knownMismatchedEdges,
    romActivations: result.romActivations, invalidReason: result.invalidReason }));
  if (process.argv.includes("--write")) {
    writeFileSync(new URL(`./fixtures/voluntary/model-check-${key}.json`, import.meta.url), JSON.stringify(result, null, 1) + "\n");
  }
}
