// fam1 (docs/fam1-first-use-move-animations.md): the animation files one move's animation reads, recorded directly. Shared by the table
// writer (tools/bundle/animAssetNeeds.ts `moves`) and tests/fam1MoveAnimationReads*.test.ts, which fails when a Factory move reads a lazy
// file its src/assets/gen/anim-asset-moves.json entry does not list.
//
// Method: the move's live body through the two functions the live draw calls (battleScene.ts renderBattleResolutionLiveView:
// liveMoveAnimationPresentation, then renderSceneOnMovePresentation), for both attackers and every row of the body
// (liveMoveAnimationDuration), with the inputs the hosts give a battle's first body (palette, allocator, sprite order, presentation
// words), on two fields (a default pair, and a Factory user of the move on both sides), over a source that records every asset read.
// The request is a Proxy that records which of its fields the body reads; every field a body reads is then varied over its range, one
// field at a time from the base request (turn, damage, power, friendship, multihit, rolloutCounter), and a variant that reads a new field
// varies that one too. The general animations that replay a move body (the turn-trap residual, the weather that continues, Leech Seed's
// drain) are recorded under the move that causes them, with the request flags production gives them. `undrawn` lists the requests with a
// live body of which no row drew (the recording cannot see those). The other general animations a move causes (Wish's heal, Knock Off's
// item, Focus Punch's tightening...) are not move bodies: the staged battles of animAssetNeeds.ts `stage` record them through the real
// game. Draws over the full tables (monPicPixelsInstall.ts installs the pictures and every animation file).
import "../../src/engine/monPicPixelsInstall.ts";
import movesData from "../../src/data/gen/moves.json" with { type: "json" };
import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import roundPolicyData from "../../src/data/gen/factory-round-policy.json" with { type: "json" };
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { installAnimAssets, installedAnimAssets, type AnimAssetSource } from "../../src/engine/animAssets.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import { WEATHER_CONTINUES_MOVE_IDS } from "../../src/engine/battleResolutionPresentation.ts";
import { LEECH_SEED_DRAIN_ABSORB_MOVE_ID } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderSceneOnMovePresentation } from "../../src/engine/battleScene.ts";
import {
  LIVE_TURN_TRAP_BODY_ROWS, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
import { createLiveMovePaletteHost, prepareLiveMovePalette } from "../../src/engine/liveMoveAnimationPalette.ts";
import { activateLiveMovePresentationRng, GENERAL_RAIN_RANDOM2_PLAN } from "../../src/engine/liveMovePresentationRng.ts";
import { prepareLiveMoveSpriteAllocator, type LiveMoveSpriteOrderInput } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { createPresentationRngHost, DEFAULT_PRESENTATION_RNG_SEED, recordPresentationRngSubStream } from "../../src/engine/presentationRngHost.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER } from "../../src/engine/spriteOrderProvider.ts";

const WORDS_KEY = "move:1:0:0";
const FIRST_BODY_ORDER: LiveMoveSpriteOrderInput = Object.freeze({ known: true as const, free: KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, firstBody: true as const });

type MoveRow = { id: number; move: string; name: string; power: number };
const MOVES = (movesData as unknown as { moves: MoveRow[] }).moves;
const MOVE_ID = new Map(MOVES.map((row) => [row.move, row.id]));
const MOVE_LEECH_SEED = 73;
const MOVE_RAIN_DANCE = 240;
const MOVE_ROLLOUT = 205;

/** Every move id a Factory set can carry: Level 50 pools (sets of the level50 ranges) and Open Level pools (the open ranges). */
export function factoryMoveIds(level: "50" | "open" | "both" = "both"): number[] {
  const ranges = (roundPolicyData as unknown as { rentalSelection: { ranges: Record<"level50" | "open", { start: number; end: number }[]> } })
    .rentalSelection.ranges;
  const wanted = level === "both" ? [...ranges.level50, ...ranges.open] : level === "50" ? ranges.level50 : ranges.open;
  const ids = new Set<number>();
  for (const entry of (frontierMonsData as unknown as { entries: { index: number; moves: string[] }[] }).entries) {
    if (!wanted.some((range) => entry.index >= range.start && entry.index <= range.end)) continue;
    for (const move of entry.moves) {
      const id = MOVE_ID.get(move);
      if (id === undefined) throw new Error(`unknown move ${move}`);
      if (id > 0) ids.add(id);
    }
  }
  return [...ids].sort((a, b) => a - b);
}

/** Every move id (1..354): a called move (Metronome, Mimic, Sleep Talk, Assist, Mirror Move) can be any of them. */
export function allMoveIds(): number[] {
  return MOVES.filter((row) => row.id > 0).map((row) => row.id);
}

export function moveName(id: number): string {
  return MOVES[id]?.name ?? String(id);
}

// The values a read field is varied over (the base request's value is the first).
const FIELD_VALUES: Readonly<Record<string, readonly (number | true)[]>> = Object.freeze({
  turn: [0, 1, 2, 3, 4, 5],
  damage: [30, 0, 1, 20, 33, 40, 65, 66, 100, 150, 200, 400],
  power: [-1, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 150, 200],
  friendship: [70, 0, 50, 128, 200, 255],
  multihit: [0, 1, 2, 3, 4, 5],
  rolloutCounter: [1, 2, 3, 4, 5],
});

function battler(name: string, side: "player" | "opponent") {
  const row = (speciesStats as unknown as { species: { id: number; name: string }[] }).species.find((s) => s.name === `SPECIES_${name}`)!;
  return {
    species: row.id, speciesSymbol: name, name, level: 50, hp: 100, maxHP: 100, gender: "male", status: "none",
    side: side === "player" ? "player" : "trainer", battler: side === "player" ? 0 : 1, partyIndex: 0,
  };
}
const field = (player: string, opponent: string): BattleResolutionDisplayedField =>
  Object.freeze({ player: battler(player, "player"), opponent: battler(opponent, "opponent") }) as unknown as BattleResolutionDisplayedField;
const DEFAULT_FIELD = field("SNORLAX", "MINUN");

const FACTORY_FIRST_SET = Math.min(...Object.values(
  (roundPolicyData as unknown as { rentalSelection: { ranges: Record<string, { start: number }[]> } }).rentalSelection.ranges,
).flat().map((range) => range.start));

/**
 * The fields a move is recorded on: the default pair, and a Factory set's own species on both sides (the first set that carries the
 * move): a body may be gated on its user (Hidden Power draws only for Unown, every Factory Hidden Power user).
 */
function fieldsFor(moveId: number): BattleResolutionDisplayedField[] {
  const symbol = MOVES[moveId]?.move;
  const user = (frontierMonsData as unknown as { entries: { index: number; species: string; moves: string[] }[] }).entries
    .find((entry) => entry.index >= FACTORY_FIRST_SET && entry.moves.includes(symbol!));
  return user === undefined ? [DEFAULT_FIELD] : [DEFAULT_FIELD, field(user.species.slice(8), user.species.slice(8))];
}

export type MoveAnimationReads = {
  moveId: number;
  /** Every asset file read (lazy and eager), sorted. */
  reads: string[];
  /** Requests rendered (body x attacker x variant) and rows drawn. */
  requests: number;
  rows: number;
  /** Request fields the body read (besides moveId / attacker / target). */
  fields: string[];
  /** Variant requests whose body threw (the base request never may). */
  errors: string[];
  /** Requests with a live body (a duration) of which no row drew: what the recording could not see. */
  undrawn: string[];
};

type Base = Omit<BattleMoveAnimationRequest, "attacker" | "target">;

/** The requests a move's animation is recorded with: its own body, and the general-animation bodies it causes (see the module comment). */
function bodies(moveId: number): Base[] {
  const power = MOVES[moveId]?.power ?? 0;
  // Rollout's request carries its counter (battleMoveAnimation.ts); a body that reads it on another move varies it like any field.
  const base: Base = { moveId, turn: 0, power, damage: 30, friendship: 70, multihit: 0, ...(moveId === MOVE_ROLLOUT ? { rolloutCounter: 1 } : {}) };
  const out: Base[] = [base];
  if (LIVE_TURN_TRAP_BODY_ROWS[moveId] !== undefined) out.push({ ...base, power: 0, damage: 0, friendship: 0, turnTrapBody: true });
  if (Object.values(WEATHER_CONTINUES_MOVE_IDS).includes(moveId)) {
    out.push({ ...base, power: 0, damage: 0, friendship: 0, ...(moveId === MOVE_RAIN_DANCE ? { generalRain: true as const } : {}) });
  }
  if (moveId === MOVE_LEECH_SEED) {
    out.push({ moveId: LEECH_SEED_DRAIN_ABSORB_MOVE_ID, turn: 0, power: 0, damage: 0, friendship: 0, multihit: 0, taskHostedScript: true });
  }
  return out;
}

/**
 * The inputs the orchestrator's hosts give the first body of a battle (factoryRoundBattleOrchestrator.ts prepareResolutionPalette): the
 * palette and allocator after the known battle entry, the known-entry first-action sprite order, and the body's presentation words
 * (activated on a fresh host, as the tick does on the body's first row: a faithful-random body draws nothing without them).
 */
function firstBodyInputs(request: BattleMoveAnimationRequest) {
  const host = createPresentationRngHost(DEFAULT_PRESENTATION_RNG_SEED, 0);
  return {
    palette: prepareLiveMovePalette(createLiveMovePaletteHost(), request).input,
    allocator: prepareLiveMoveSpriteAllocator(createKnownEntrySpriteAllocatorProvider("ordinary-factory").firstMove, request).input,
    order: FIRST_BODY_ORDER,
    // General_Rain's drops are the general animation's own non-consuming sub-stream (liveMovePresentationRng.ts tick seam).
    words: Object.freeze({
      host: request.generalRain === true
        ? recordPresentationRngSubStream(host, WORDS_KEY, GENERAL_RAIN_RANDOM2_PLAN) : activateLiveMovePresentationRng(host, request, WORDS_KEY),
      key: WORDS_KEY,
    }),
  };
}

/** Records the files `moveId`'s animation reads. Installs a recording source over the installed one for the call and restores it. */
export function recordMoveAnimationReads(moveId: number): MoveAnimationReads {
  const previous = installedAnimAssets();
  if (previous === undefined) throw new Error("recordMoveAnimationReads: install the full animation assets first");
  const reads = new Set<string>();
  const recording: AnimAssetSource = { get: (name) => (reads.add(name), previous.get(name)) };
  const fields = new Set<string>();
  const errors: string[] = [];
  const undrawn: string[] = [];
  const fb = new Uint8Array(240 * 160 * 4);
  let requests = 0;
  let rows = 0;
  const seen = new Set<string>();
  const run = (body: Base, attacker: 0 | 1, isBase: boolean, on: BattleResolutionDisplayedField): Set<string> => {
    const plain = Object.freeze({ ...body, attacker, target: attacker === 0 ? 1 : 0 }) as BattleMoveAnimationRequest;
    const key = `${JSON.stringify(plain)} on ${on.player.name}/${on.opponent.name}`;
    const read = new Set<string>();
    if (seen.has(key)) return read;
    seen.add(key);
    const request = new Proxy(plain, {
      get(target, property) {
        if (typeof property === "string") read.add(property);
        return Reflect.get(target, property);
      },
      ownKeys(target) {
        for (const property of Reflect.ownKeys(target)) if (typeof property === "string") read.add(property);
        return Reflect.ownKeys(target);
      },
    });
    try {
      const duration = liveMoveAnimationDuration(request, on);
      requests += 1;
      if (duration !== null) {
        const inputs = firstBodyInputs(plain);
        let drawn = 0;
        for (let age = 0; age < duration; age += 1) {
          // A row the first body's inputs decline is drawn as production draws a body without them (the apx219 fallbacks), if it can be.
          const state = liveMoveAnimationPresentation(request, on, age, inputs.palette, inputs.allocator, inputs.order, inputs.words)
            ?? liveMoveAnimationPresentation(request, on, age, undefined, undefined, undefined, inputs.words);
          if (state === null) continue;
          renderSceneOnMovePresentation(fb, state, true);
          drawn += 1;
        }
        rows += drawn;
        if (drawn === 0) undrawn.push(key);
      }
    } catch (error) {
      const message = `${moveId}${isBase ? " base" : ""} ${key}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(message);
    }
    return read;
  };
  installAnimAssets(recording);
  try {
    for (const on of fieldsFor(moveId)) {
      for (const body of bodies(moveId)) {
        for (const attacker of [0, 1] as const) {
          // Vary every request field the body reads, one at a time from the base request, until no variant reads a new one.
          const varied = new Set<string>();
          let queue = [...run(body, attacker, true, on)];
          while (queue.length > 0) {
            const next: string[] = [];
            for (const name of queue) {
              fields.add(name);
              if (varied.has(name) || FIELD_VALUES[name] === undefined) continue;
              varied.add(name);
              for (const value of FIELD_VALUES[name]!) {
                const variant = { ...body, [name]: value === -1 ? MOVES[moveId]?.power ?? 0 : value } as Base;
                for (const more of run(variant, attacker, false, on)) if (!fields.has(more)) next.push(more);
              }
            }
            queue = next;
          }
        }
      }
    }
  } finally {
    installAnimAssets(previous);
  }
  for (const field of ["moveId", "attacker", "target"]) fields.delete(field);
  return { moveId, reads: [...reads].sort(), requests, rows, fields: [...fields].sort(), errors, undrawn };
}
