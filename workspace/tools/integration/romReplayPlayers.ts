// parity-mac fourth pass (docs/parity-mac/replay-players.md): the test players of the real-ROM replay (soundCensusRomReplay.ts --policy=NAME).
//   census     the old one: the least-used legal move, never a voluntary switch; a forced replacement is the lowest legal party slot.
//   ai-v1      the game's own trainer AI plays the PLAYER's side: the engine's port of AI_TrySwitchOrUseItem (factoryAiSwitchPolicy.ts) and of the three move scripts
//              (factoryAiDecisionPolicy.ts, mask 7 at every streak), run UNCHANGED on a mirrored copy of the battle state (battler 0 <-> battler 1, the two parties, the two
//              sides). A forced replacement is GetMostSuitableMonToSwitchInto's first pass on the mirrored state.
//   random-v1  a uniformly random legal move; with probability 0.2 a voluntary switch to a uniformly random legal bench Pokemon (when the engine allows one); a forced
//              replacement is uniformly random. It also PROBES what the engine says is not allowed: a switch when the engine offers none although the bench has a
//              healthy Pokemon (a trap), and a move slot the engine says cannot be selected. The ROM must refuse a probe; a probe never changes the battle.
//   script     a staged battle (docs/parity-mac/staged-battles.md): the actions are written down, one per turn; when the list ends another player takes over.
//              A written action the engine does not offer stops the replay (the staging is wrong), it is never bent into something else.
// Every player draws from its own generator, seeded from the battle seed and the policy name. None reads or advances the battle RNG, and none touches the state the
// opponent's AI reads (the orchestrator's aiHistory, the rules context's aiObserved* fields): ai-v1 keeps its own FactoryAiBattleHistory, synced from the mirrored state,
// so it knows of the opponent what the game's AI would know of the player (moves seen, ability / item seen), not the real set.
// A player is a decision policy only: deterministic and legal. ai-v1 is not claimed to be what the game's AI would do on the player's side (the mirror flips the
// per-battler and per-side arrays; fields that hold battler numbers inside scripts are not all rewritten). When the mirrored AI throws, or names an action the engine
// does not offer, the player takes a random legal move from its own generator and counts it (`fallbacks`).
import {
  createFactoryAiBattleHistory, createFactoryAiViewFromLiveRules, syncFactoryAiBattleHistory, type FactoryAiBattleHistory,
} from "../../src/engine/factoryAiLiveDriver.ts";
import { evaluateFactoryAiSwitchPolicy } from "../../src/engine/factoryAiSwitchPolicy.ts";
import { chooseFactoryAiScoredDecision } from "../../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../../src/engine/battleDecisionBoundary.ts";
import { getMostSuitableMonToSwitchInto } from "../../src/engine/battleAiSwitchInto.ts";
import speciesTypesData from "../../src/data/gen/species-types.json" with { type: "json" };

export const PLAYER_POLICIES = ["census", "ai-v1", "random-v1"] as const;
export type PlayerPolicyName = (typeof PLAYER_POLICIES)[number];

/** One written turn of a staged battle: exactly one of move / switch, with optional refusal probes before it. */
export type ScriptStep = Readonly<{ move?: number; switch?: number; prefer?: number; preferSwitch?: number; probeSwitch?: number; probeMove?: number }>;
export type PlayerScript = Readonly<{ actions: readonly ScriptStep[]; replacements?: readonly number[]; then?: PlayerPolicyName }>;

export type PlayerAction = Readonly<{ kind: "move"; slot: number } | { kind: "switch"; partyIndex: number }>;
/** What the ROM must refuse: a switch while the engine offers none, or a move slot the engine says is not selectable. */
export type PlayerProbe = Readonly<{ kind: "switch-refused"; partyIndex: number } | { kind: "move-refused"; slot: number }>;
export type PlayerTurn = Readonly<{ probes: readonly PlayerProbe[]; action: PlayerAction; source: string }>;

export type PlayerMenu = Readonly<{
  rules: any; // BattleScriptRulesContext at the player's command boundary
  /** Slots the engine says can be selected. */
  legalSlots: readonly number[];
  /** Party indexes the engine offers as a voluntary switch. */
  legalSwitches: readonly number[];
  /** True when the ROM opens no move menu this turn (forced Struggle / Encore): no move probe is possible. */
  forcedMove: boolean;
}>;

export type Player = Readonly<{
  name: PlayerPolicyName | "script";
  chooseTurn(menu: PlayerMenu): PlayerTurn;
  chooseReplacement(rules: any, legalPartyIndexes: readonly number[]): number;
  stats: Record<string, number>;
}>;

// mulberry32: a small generator of the tool's own. Seeded from the battle seed and the policy name, never from gRngValue.
function generator(seed: number, name: string) {
  let a = (seed ^ 0x9e3779b9) >>> 0;
  for (const ch of name) a = (Math.imul(a ^ ch.charCodeAt(0), 0x01000193) + 0x7f4a7c15) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(rand: () => number, items: readonly T[]): T => items[Math.floor(rand() * items.length)]!;

const flipId = (v: number) => (v === 0 ? 1 : v === 1 ? 0 : v);
const swap01 = <T>(a: readonly T[]): readonly T[] => Object.freeze(a.map((v, i) => (i === 0 ? a[1]! : i === 1 ? a[0]! : v)));
const BATTLER_ID_FIELDS = ["battlerPreventingEscape", "battlerWithSureHit", "wrappedBy", "protectPhysicalBattlerId", "protectSpecialBattlerId"];
const SIDE_TIMER_ID_FIELDS = ["reflectBattlerId", "lightscreenBattlerId", "safeguardBattlerId", "mistBattlerId", "followmeTarget"];
const STATUS3_LEECHSEED = 1 << 2;

/** The battle seen from the other side: battler 0 <-> 1, party player <-> opponent, side 0 <-> 1. A copy; the input is not changed. */
export function mirrorRulesContext(rc: any): any {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rc as Record<string, any>)) {
    if (key === "battlers") {
      out[key] = swap01((value as any[]).map((b) => {
        const m: any = { ...b, side: b.side === 0 ? 1 : 0, status3: b.status3 & STATUS3_LEECHSEED ? b.status3 ^ 1 : b.status3 };
        for (const f of BATTLER_ID_FIELDS) if (typeof m[f] === "number") m[f] = flipId(m[f]);
        return Object.freeze(m);
      }));
    } else if (key === "party") {
      out[key] = Object.freeze({ player: value.opponent, opponent: value.player });
    } else if (key === "moveHistory") {
      out[key] = Object.freeze(Object.fromEntries(Object.entries(value as Record<string, any>).map(([k, v]) =>
        [k, Array.isArray(v) && v.length === 4 ? (k === "lastHitBy" ? Object.freeze(swap01(v).map(flipId)) : swap01(v)) : v])));
    } else if (key === "sideTimers") {
      out[key] = swap01((value as any[]).map((t) => {
        const m: any = { ...t };
        for (const f of SIDE_TIMER_ID_FIELDS) if (typeof m[f] === "number") m[f] = flipId(m[f]);
        return Object.freeze(m);
      }));
    } else if (key === "selectorRoles") {
      out[key] = Object.freeze(Object.fromEntries(Object.entries(value as Record<string, any>).map(([k, v]) => [k, typeof v === "number" ? flipId(v) : v])));
    } else if (Array.isArray(value) && (value.length === 4 || value.length === 2) && value.every((v) => typeof v !== "object" || v === null)) {
      out[key] = swap01(value);
    } else out[key] = value;
  }
  return Object.freeze(out);
}

// species-types.json rows start at species 1 (battleScriptOpenPartyScreenOpcode.ts resolveSpeciesTypes reads [species - 1]).
function typesOfSpecies(species: number): readonly [string, string] {
  const types = (speciesTypesData as any).species[species - 1]?.types;
  if (!Array.isArray(types) || types.length !== 2) throw new Error(`no types for species ${species}`);
  return types as unknown as readonly [string, string];
}

// The mirrored AI always runs all three scripts: an ordinary trainer of challenge 7 (GetAiScriptsInBattleFactory, battle_factory.c:889-911).
const AI_CHALLENGE = Object.freeze({ factoryWinStreak: 42, trainerOpponentId: 200 });

export function createPlayer(name: PlayerPolicyName, seed: number): Player {
  const rand = generator(seed, name);
  const stats: Record<string, number> = {};
  const count = (k: string) => { stats[k] = (stats[k] ?? 0) + 1; };
  const slotUses = [0, 0, 0, 0];
  const censusMove = (legalSlots: readonly number[]) => {
    const slot = legalSlots.length === 0 ? 0 : legalSlots.reduce((best, s) => (slotUses[s]! < slotUses[best]! ? s : best), legalSlots[0]!);
    return slot;
  };
  const randomMove = (legalSlots: readonly number[]) => (legalSlots.length === 0 ? 0 : pick(rand, legalSlots));
  const done = (turn: PlayerTurn): PlayerTurn => {
    if (turn.action.kind === "move") { slotUses[turn.action.slot]!++; count("moves"); } else count("voluntarySwitches");
    for (const p of turn.probes) count(p.kind === "switch-refused" ? "switchProbes" : "moveProbes");
    return turn;
  };

  if (name === "census") {
    return {
      name, stats,
      chooseTurn: (menu) => done({ probes: [], action: { kind: "move", slot: censusMove(menu.legalSlots) }, source: "census" }),
      chooseReplacement: (_rules, legal) => { count("replacements"); return Math.min(...legal); },
    };
  }

  if (name === "random-v1") {
    return {
      name, stats,
      chooseTurn: (menu) => {
        const probes: PlayerProbe[] = [];
        const player = menu.rules.battlers[0];
        const bench = (menu.rules.party.player as any[]).map((m, i) => ({ m, i })).filter(({ m, i }) => i !== player.partyIndex && m.species !== 0 && m.hp > 0).map(({ i }) => i);
        // A trap: the engine offers no switch although a healthy bench Pokemon exists. The ROM must refuse the switch too.
        if (menu.legalSwitches.length === 0 && bench.length > 0 && rand() < 0.5) probes.push({ kind: "switch-refused", partyIndex: pick(rand, bench) });
        const refusedSlots = [0, 1, 2, 3].filter((s) => !menu.legalSlots.includes(s) && player.moves[s] !== 0);
        if (!menu.forcedMove && refusedSlots.length > 0 && rand() < 0.3) probes.push({ kind: "move-refused", slot: pick(rand, refusedSlots) });
        if (menu.legalSwitches.length > 0 && rand() < 0.2) return done({ probes, action: { kind: "switch", partyIndex: pick(rand, menu.legalSwitches) }, source: "random" });
        return done({ probes, action: { kind: "move", slot: randomMove(menu.legalSlots) }, source: "random" });
      },
      chooseReplacement: (_rules, legal) => { count("replacements"); return pick(rand, legal); },
    };
  }

  // ai-v1
  let history: FactoryAiBattleHistory | null = null;
  let aiRng: Readonly<{ value: number; calls: number }> = Object.freeze({ value: Math.floor(rand() * 4294967296) >>> 0, calls: 0 });
  return {
    name, stats,
    chooseTurn: (menu) => {
      if (menu.forcedMove) return done({ probes: [], action: { kind: "move", slot: menu.legalSlots[0] ?? 0 }, source: "forced" });
      try {
        const mirrored = mirrorRulesContext(menu.rules);
        history = syncFactoryAiBattleHistory(history ?? createFactoryAiBattleHistory(mirrored), mirrored);
        const switchPolicy = evaluateFactoryAiSwitchPolicy({ rules: mirrored, rng: aiRng });
        aiRng = switchPolicy.rng;
        if (switchPolicy.selectedPartyIndex !== null) {
          if (menu.legalSwitches.includes(switchPolicy.selectedPartyIndex)) {
            count("aiSwitch");
            return done({ probes: [], action: { kind: "switch", partyIndex: switchPolicy.selectedPartyIndex }, source: `ai-switch:${switchPolicy.choice.kind}` });
          }
          count("aiSwitchNotLegal");
        }
        const view = createFactoryAiViewFromLiveRules({ rulesContext: mirrored, history, challenge: AI_CHALLENGE });
        const request = createBattleCommandRequest({
          kind: "command", requestId: 1, side: "trainer", battler: 1,
          legalDecisions: menu.legalSlots.map((moveSlot) => ({ kind: "use-move", moveSlot, targetBattler: 0 })),
        } as never);
        const choice = chooseFactoryAiScoredDecision({ view, request, rng: aiRng, turnStartRandomNumber: Object.freeze({ owner: "battle-turn-boundary" as const, value: aiRng.value >>> 16 }) });
        aiRng = choice.rng;
        const decision: any = choice.submission.decision;
        if (decision.kind === "use-move" && menu.legalSlots.includes(decision.moveSlot)) {
          count("aiMove");
          return done({ probes: [], action: { kind: "move", slot: decision.moveSlot }, source: "ai-move" });
        }
        count("aiMoveNotLegal");
      } catch (e) {
        count("aiThrew");
        stats.firstError ??= String(e).slice(0, 200) as never;
      }
      count("fallbacks");
      return done({ probes: [], action: { kind: "move", slot: randomMove(menu.legalSlots) }, source: "fallback" });
    },
    chooseReplacement: (rules, legal) => {
      count("replacements");
      try {
        const party = rules.party.player as any[];
        const bench = Array.from({ length: 6 }, (_, i) => {
          const m = party[i];
          return m && m.species !== 0 ? { species: m.species, hp: m.hp, types: typesOfSpecies(m.species), moves: m.moves }
            : { species: 0, hp: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const, moves: [0, 0, 0, 0] as const };
        });
        const scored = getMostSuitableMonToSwitchInto(bench as never, rules.battlers[0].partyIndex, rules.battlers[1].types);
        if (scored.kind === "resolved" && legal.includes(scored.partyIndex)) { count("aiReplacement"); return scored.partyIndex; }
      } catch (e) {
        count("aiReplacementThrew");
        stats.firstError ??= String(e).slice(0, 200) as never;
      }
      count("replacementFallbacks");
      return pick(rand, legal);
    },
  };
}

/** The player of a staged battle: the written actions in order, then the `then` player (default census). */
export function createScriptPlayer(seed: number, script: PlayerScript): Player {
  const rest = createPlayer(script.then ?? "census", seed);
  const stats: Record<string, number> = {};
  const count = (k: string) => { stats[k] = (stats[k] ?? 0) + 1; };
  let turn = 0; let replacement = 0;
  return {
    name: "script", stats,
    chooseTurn: (menu) => {
      const step = script.actions[turn];
      turn += 1;
      if (step === undefined) { count("afterScript"); return rest.chooseTurn(menu); }
      const where = `staged battle, written turn ${turn}`;
      const probes: PlayerProbe[] = [];
      if (step.probeSwitch !== undefined) {
        if (menu.legalSwitches.length > 0) throw new Error(`${where}: probeSwitch, but the engine offers a switch (${menu.legalSwitches.join(", ")})`);
        probes.push({ kind: "switch-refused", partyIndex: step.probeSwitch }); count("switchProbes");
      }
      if (step.probeMove !== undefined) {
        if (menu.legalSlots.includes(step.probeMove) || menu.forcedMove) throw new Error(`${where}: probeMove ${step.probeMove}, but the engine offers that slot or the turn is forced`);
        probes.push({ kind: "move-refused", slot: step.probeMove }); count("moveProbes");
      }
      if (step.preferSwitch !== undefined) {
        // "switch to this party slot when the engine offers it" (the slot may have fainted); else the `then` player decides this turn.
        if (step.move !== undefined || step.switch !== undefined || step.prefer !== undefined) throw new Error(`${where}: a preferSwitch step takes no move / switch / prefer`);
        if (!menu.legalSwitches.includes(step.preferSwitch)) { count("preferNotOffered"); return rest.chooseTurn(menu); }
        count("switches");
        return { probes, action: { kind: "switch", partyIndex: step.preferSwitch }, source: "script" };
      }
      if (step.prefer !== undefined) {
        // "use this slot when the engine offers it": for a staging whose move can be taken away by the other side (no PP under Pressure, Disable,
        // Torment, Taunt, a copied move set after Transform). Not offered -> this turn goes to the `then` player; the written list goes on.
        if (step.move !== undefined || step.switch !== undefined) throw new Error(`${where}: a prefer step takes no move / switch`);
        if (!menu.legalSlots.includes(step.prefer)) { count("preferNotOffered"); return rest.chooseTurn(menu); }
        count("moves");
        return { probes, action: { kind: "move", slot: step.prefer }, source: "script" };
      }
      if ((step.move === undefined) === (step.switch === undefined)) throw new Error(`${where}: a step needs exactly one of move / switch`);
      if (step.switch !== undefined) {
        if (!menu.legalSwitches.includes(step.switch)) throw new Error(`${where}: switch to party slot ${step.switch} is not offered by the engine (offered: ${menu.legalSwitches.join(", ") || "none"})`);
        count("voluntarySwitches");
        return { probes, action: { kind: "switch", partyIndex: step.switch }, source: "script" };
      }
      if (!menu.legalSlots.includes(step.move!)) throw new Error(`${where}: move slot ${step.move} is not offered by the engine (offered: ${menu.legalSlots.join(", ") || "none"})`);
      count("moves");
      return { probes, action: { kind: "move", slot: step.move! }, source: "script" };
    },
    chooseReplacement: (rules, legal) => {
      const wanted = script.replacements?.[replacement];
      replacement += 1; count("replacements");
      if (wanted === undefined) return rest.chooseReplacement(rules, legal);
      if (!legal.includes(wanted)) throw new Error(`staged battle, replacement ${replacement}: party slot ${wanted} is not legal (legal: ${legal.join(", ")})`);
      return wanted;
    },
  };
}
