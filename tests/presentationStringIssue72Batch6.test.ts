import { describe, it, expect } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";
import type { BattleCommandDecision, BattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";

/**
 * ISSUES #72 batch 6: the Taunt-pair idiom (PROGRESS 896/897/900/902,
 * batches 1-5) continued down the ranked REACHABLE list's plain-idiom tail,
 * starting at STRINGID_PKMNSXCUREDYPROBLEM. Each `it` red-verifies via
 * `git stash -- src/engine/battleResolutionPresentation.ts
 * src/engine/factoryBattleScriptFullTurnDecision.ts
 * src/engine/battleEndTurnOrchestration.ts` (throws the exact
 * completeness-guard error pre-fix).
 */

const SPLASH = 150;
const DISABLE = 50;
const WISH = 273;
const THUNDER_WAVE = 86;
const SAFEGUARD = 219;
const MAGIC_COAT = 277;
const GROWL = 45;
const TICKLE = 321;
const NIGHTMARE = 171;
const SMELLING_SALT = 265;
const PERISH_SONG = 195;

const SPECIES_WOBBUFFET = 202; // pure Psychic -- arbitrary neutral filler.
const SPECIES_MURKROW = 198; // Dark/Flying, arbitrary neutral filler.

const ABILITY_SHED_SKIN = 61;
const ABILITY_RAIN_DISH = 44;
const ABILITY_SPEED_BOOST = 3;

const STATUS1_POISON = 1 << 3;
const STATUS1_PARALYSIS = 1 << 6;

const AT = (battler: 0 | 1): BattleCommandDecision =>
  Object.freeze({ kind: "use-move", moveSlot: 0, targetBattler: battler });
const USE = (slot: 0 | 1 | 2 | 3, battler: 0 | 1): BattleCommandDecision =>
  Object.freeze({ kind: "use-move", moveSlot: slot, targetBattler: battler });

function extractMessages(events: readonly { payload: { kind: string; messageId?: string } }[]) {
  return events
    .filter((event) => event.payload.kind === "message")
    .map((event) => (event.payload as { messageId: string }).messageId);
}

function presentTransition(
  request: BattleCommandRequest,
  rules: ReturnType<typeof createFactoryFullTurnBattleState>["rules"],
  decision: BattleCommandDecision,
  transition: ReturnType<typeof submitFactoryFullTurnDecision>,
  presentSide: 0 | 1 = 0,
) {
  const command = createBattleCommandPresentation(request, rules.rulesContext, presentSide);
  const resolution = createBattleResolutionPresentation({
    sourceRequest: request,
    sourceDecision: decision,
    beforeRules: rules,
    transition,
    fieldBoundary: command.field,
    confirmHandoff: {
      fightDisplayCursor: command.fightDisplayCursor,
      idleBounceElapsed: command.idleBounceElapsed,
    },
    opponentTrainer: Object.freeze({ className: "COOLTRAINER", name: "REY", speechLose: ["", ""] as const }),
  });
  const messageIds = extractMessages(transition.events);
  const lines = resolution.segments
    .flatMap((segment) => segment.commands)
    .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
    .map((cmd) => cmd.lines);
  return { messageIds, lines, field: command.field };
}

function runFullTurn(
  config: FactoryFullTurnConfig,
  playerDecision: BattleCommandDecision,
  trainerDecision: BattleCommandDecision,
) {
  const initial = createFactoryFullTurnBattleState(config);
  if (initial.boundary.kind !== "decision-required") {
    throw new Error("expected the player's command boundary");
  }
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: playerDecision,
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("expected the trainer's command boundary");
  }
  const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: trainerDecision,
  });
  const { messageIds, lines, field } = presentTransition(
    initial.boundary.request as BattleCommandRequest,
    initial.rules,
    playerDecision,
    transition,
  );
  return { messageIds, lines, field, transition };
}

/** Same brute-force-across-seeds idiom as batch 1/2/5, for RNG-gated ticks (Shed Skin's 1/3 proc). */
function runFullTurnUntil(
  buildConfig: (seed: number) => FactoryFullTurnConfig,
  playerDecision: BattleCommandDecision,
  trainerDecision: BattleCommandDecision,
  targetMessageId: string,
  maxSeed = 200,
) {
  for (let seed = 1; seed <= maxSeed; seed += 1) {
    const result = runFullTurn(buildConfig(seed), playerDecision, trainerDecision);
    if (result.messageIds.includes(targetMessageId)) return result;
  }
  throw new Error(`no seed in 1..${maxSeed} produced ${targetMessageId}`);
}

describe("presentation-string ISSUES #72 batch 6 -- end-turn ability ticks", () => {
  it("STRINGID_PKMNSXCUREDYPROBLEM resolves the Shed Skin holder's own name/ability and the cured status (real 1/3 end-turn proc)", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: {
          species: SPECIES_WOBBUFFET, moveId: SPLASH, ability: ABILITY_SHED_SKIN, status1: STATUS1_POISON,
          attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
        },
        trainer: {
          species: SPECIES_MURKROW, moveId: SPLASH,
          attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
        },
      }),
      AT(0),
      AT(1),
      "STRINGID_PKMNSXCUREDYPROBLEM",
    );
    expect(messageIds).toContain("STRINGID_PKMNSXCUREDYPROBLEM");
    expect(lines).toContainEqual([`${field.player.name}’s SHED SKIN`, "cured its poison problem!"]);
  });

  it("STRINGID_PKMNSXRESTOREDHPALITTLE2 resolves the Rain Dish holder's own name/ability (real weather-gated end-turn heal)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      weather: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: SPLASH, ability: ABILITY_RAIN_DISH, hp: 150, maxHp: 200,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNSXRESTOREDHPALITTLE2");
    expect(lines).toContainEqual([`${field.player.name}’s RAIN DISH`, "restored its HP a little!"]);
  });

  it("STRINGID_PKMNRAISEDSPEED resolves the Speed Boost holder's own name/ability (real deterministic end-turn boost)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: SPLASH, ability: ABILITY_SPEED_BOOST,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNRAISEDSPEED");
    expect(lines).toContainEqual([`${field.player.name}’s SPEED BOOST`, "raised its SPEED!"]);
  });

  it("STRINGID_PKMNPERISHCOUNTFELL resolves the counting battler's own name and the pre-decrement count (real Perish Song cast, same-turn tick)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: PERISH_SONG,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
    });
    const { messageIds, lines } = runFullTurn(config, AT(0), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNPERISHCOUNTFELL");
    expect(lines.some((line) => line[1] === "fell to 3!")).toBe(true);
  });
});

describe("presentation-string ISSUES #72 batch 6 -- attack-canceler pair (Disable)", () => {
  it("STRINGID_PKMNMOVEWASDISABLED and STRINGID_PKMNMOVEISDISABLED resolve their own attacker/defender/move (real same-turn Disable-then-blocked-reselect)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: SPLASH, lastMove: SPLASH,
        moves: [SPLASH, 0, 0, 0] as [number, number, number, number],
        pp: [40, 0, 0, 0] as [number, number, number, number],
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: DISABLE,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNMOVEWASDISABLED");
    expect(lines).toContainEqual([`${field.player.name}’s SPLASH`, "was disabled!"]);
    expect(messageIds).toContain("STRINGID_PKMNMOVEISDISABLED");
    expect(lines).toContainEqual([`${field.player.name}’s SPLASH`, "is disabled!"]);
  });
});

describe("presentation-string ISSUES #72 batch 6 -- Magic Coat pair", () => {
  it("STRINGID_PKMNSHROUDEDITSELF and STRINGID_PKMNMOVEBOUNCED resolve their own attacker/move (real same-turn Magic Coat then bounced GROWL)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: MAGIC_COAT,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: GROWL,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNSHROUDEDITSELF");
    expect(lines).toContainEqual([`${field.player.name} shrouded`, "itself in MAGIC COAT!"]);
    expect(messageIds).toContain("STRINGID_PKMNMOVEBOUNCED");
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name}’s GROWL`,
      "was bounced back by MAGIC COAT!",
    ]);
  });
});

describe("presentation-string ISSUES #72 batch 6 -- Safeguard blocks a status move", () => {
  it("STRINGID_PKMNUSEDSAFEGUARD resolves the protected side's own target (real same-turn Safeguard-then-blocked Thunder Wave)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: THUNDER_WAVE,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SAFEGUARD,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNUSEDSAFEGUARD");
    expect(lines).toContainEqual([`Foe ${field.opponent.name}’s party is protected`, "by SAFEGUARD!"]);
  });
});

describe("presentation-string ISSUES #72 batch 6 -- standalone move-effect entry scripts", () => {
  it("STRINGID_STATSWONTDECREASE2 resolves Tickle's own target (real compound both-stats-at-minimum gate)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: TICKLE,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH,
        statStages: [6, 0, 0, 6, 6, 6, 6, 6] as const,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_STATSWONTDECREASE2");
    expect(lines).toContainEqual([`Foe ${field.opponent.name}’s stats won’t`, "go any lower!"]);
  });

  it("STRINGID_PKMNFELLINTONIGHTMARE resolves Nightmare's own target (real already-asleep gate)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: NIGHTMARE,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH, status1: 3,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNFELLINTONIGHTMARE");
    expect(lines).toContainEqual([`Foe ${field.opponent.name} fell into`, "a NIGHTMARE!"]);
  });

  it("STRINGID_PKMNHEALEDPARALYSIS resolves Smelling Salt's own target (real paralyzed carrier)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: SMELLING_SALT,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH, status1: STATUS1_PARALYSIS,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNHEALEDPARALYSIS");
    expect(lines).toContainEqual([`Foe ${field.opponent.name} was`, "healed of paralysis!"]);
  });
});

describe("presentation-string ISSUES #72 batch 6 -- Wish's delayed heal", () => {
  it("STRINGID_PKMNWISHCAMETRUE resolves the caster's own name (real 2-turn cast-then-resolve)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        // Full HP so end-of-turn 2 takes BattleScript_WishButFullHp (which
        // prints only STRINGID_PKMNWISHCAMETRUE and returns) rather than
        // BattleScript_WishComesTrue's own follow-on STRINGID_PKMNREGAINEDHEALTH
        // print -- the latter is the still-open "hard trio" id, out of scope
        // for this batch (needs its own per-context battler-role investigation,
        // ISSUES #72's batch 1 note).
        species: SPECIES_WOBBUFFET, moveId: WISH,
        moves: [WISH, SPLASH, 0, 0] as [number, number, number, number],
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
    });
    const initial = createFactoryFullTurnBattleState(config);
    if (initial.boundary.kind !== "decision-required") throw new Error("expected player boundary");
    const t1p = submitFactoryFullTurnDecision(initial, { requestId: 1, side: "player", decision: USE(0, 0) });
    if (t1p.kind !== "decision-required") throw new Error("expected trainer boundary");
    const t1t = submitFactoryFullTurnDecision(t1p.state, { requestId: 2, side: "trainer", decision: AT(1) });
    if (t1t.kind !== "decision-required") throw new Error("expected turn-2 player boundary");

    const t2p = submitFactoryFullTurnDecision(t1t.state, { requestId: 3, side: "player", decision: USE(1, 0) });
    if (t2p.kind !== "decision-required") throw new Error("expected turn-2 trainer boundary");
    const t2t = submitFactoryFullTurnDecision(t2p.state, { requestId: 4, side: "trainer", decision: AT(1) });

    const { messageIds, lines, field } = presentTransition(
      t1t.nextRequest as BattleCommandRequest,
      t1t.state.rules,
      USE(1, 0),
      t2t,
      1,
    );
    expect(messageIds).toContain("STRINGID_PKMNWISHCAMETRUE");
    expect(lines).toContainEqual([`${field.player.name}’s WISH`, "came true!"]);
  });
});
