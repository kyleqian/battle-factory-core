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
 * ISSUES #72 batch 5: the Taunt-pair idiom (PROGRESS 896/897/900, batches
 * 1-4) continued down the ranked REACHABLE list's plain-idiom tail, starting
 * at STRINGID_PKMNFREEDFROM. Each `it` red-verifies via
 * `git stash -- src/engine/battleResolutionPresentation.ts
 * src/engine/factoryBattleScriptFullTurnDecision.ts` (throws the exact
 * completeness-guard error pre-fix).
 */

const SPLASH = 150;
const BIND = 20;
const RAPID_SPIN = 229;
const DREAM_EATER = 138;
const FORESIGHT = 193;
const ENCORE = 227;
const MEAN_LOOK = 212;
const ROLE_PLAY = 272;
const KNOCK_OFF = 282;

const SPECIES_WOBBUFFET = 202; // pure Psychic -- arbitrary neutral filler.
const SPECIES_MURKROW = 198; // Dark/Flying, arbitrary neutral filler.
const SPECIES_SKITTY = 315; // real ABILITY_CUTE_CHARM slot-0 carrier.
const SPECIES_CARVANHA = 330; // real ABILITY_ROUGH_SKIN slot-0 carrier.

const ABILITY_NONE = 0;
const ABILITY_CUTE_CHARM = 56;
const ABILITY_ROUGH_SKIN = 24;
const ABILITY_LEVITATE = 26;

const STATUS2_WRAPPED_MASK = (1 << 13) | (1 << 14) | (1 << 15);

const AT = (battler: 0 | 1): BattleCommandDecision =>
  Object.freeze({ kind: "use-move", moveSlot: 0, targetBattler: battler });
const USE = (slot: 0 | 1 | 2 | 3, battler: 0 | 1): BattleCommandDecision =>
  Object.freeze({ kind: "use-move", moveSlot: slot, targetBattler: battler });

function extractMessages(events: readonly { payload: { kind: string; messageId?: string } }[]) {
  return events
    .filter((event) => event.payload.kind === "message")
    .map((event) => (event.payload as { messageId: string }).messageId);
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

  const command = createBattleCommandPresentation(
    initial.boundary.request as BattleCommandRequest,
    initial.rules.rulesContext,
    0,
  );
  const resolution = createBattleResolutionPresentation({
    sourceRequest: initial.boundary.request as BattleCommandRequest,
    sourceDecision: playerDecision,
    beforeRules: initial.rules,
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

  return { messageIds, lines, field: command.field, transition };
}

/** Same brute-force-across-seeds idiom as batch 1/2/HURtBy, for accuracy/proc-gated moves. */
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

describe("presentation-string ISSUES #72 batch 5 -- wrap-family end-of-turn release / Rapid Spin", () => {
  it("STRINGID_PKMNFREEDFROM resolves the trapped battler's own name and the trapping move (real staged Bind, 3-turn expiry)", () => {
    let found: ReturnType<typeof runFullTurn> | null = null;
    for (let seed = 1; seed <= 400 && !found; seed += 1) {
      const config: FactoryFullTurnConfig = Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: {
          species: SPECIES_WOBBUFFET, moveId: SPLASH,
          moves: [SPLASH, SPLASH, 0, 0] as [number, number, number, number],
          attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
        },
        trainer: {
          species: SPECIES_MURKROW, moveId: BIND,
          moves: [BIND, SPLASH, 0, 0] as [number, number, number, number],
          attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
        },
      });
      const initial = createFactoryFullTurnBattleState(config);
      if (initial.boundary.kind !== "decision-required") continue;
      const t1p = submitFactoryFullTurnDecision(initial, { requestId: 1, side: "player", decision: AT(0) });
      if (t1p.kind !== "decision-required") continue;
      const t1t = submitFactoryFullTurnDecision(t1p.state, { requestId: 2, side: "trainer", decision: USE(0, 0) });
      if (t1t.kind !== "decision-required") continue;
      const playerStatus2 = t1t.state.rules.rulesContext.battlers[0]!.status2;
      if ((playerStatus2 & STATUS2_WRAPPED_MASK) === 0) continue; // Bind missed
      if (((playerStatus2 & STATUS2_WRAPPED_MASK) >>> 13) !== 2) continue; // want exactly 2 more turns

      const t2p = submitFactoryFullTurnDecision(t1t.state, { requestId: 3, side: "player", decision: USE(1, 0) });
      if (t2p.kind !== "decision-required") continue;
      const t2t = submitFactoryFullTurnDecision(t2p.state, { requestId: 4, side: "trainer", decision: USE(1, 1) });
      if (t2t.kind !== "decision-required") continue;

      const t3p = submitFactoryFullTurnDecision(t2t.state, { requestId: 5, side: "player", decision: USE(1, 0) });
      if (t3p.kind !== "decision-required") continue;
      const t3t = submitFactoryFullTurnDecision(t3p.state, { requestId: 6, side: "trainer", decision: USE(1, 1) });

      const messageIds = extractMessages(t3t.events);
      if (!messageIds.includes("STRINGID_PKMNFREEDFROM")) continue;

      const command = createBattleCommandPresentation(
        t2t.nextRequest as BattleCommandRequest,
        t2t.state.rules.rulesContext,
        1,
      );
      const resolution = createBattleResolutionPresentation({
        sourceRequest: t2t.nextRequest as BattleCommandRequest,
        sourceDecision: USE(1, 0),
        beforeRules: t2t.state.rules,
        transition: t3t,
        fieldBoundary: command.field,
        confirmHandoff: {
          fightDisplayCursor: command.fightDisplayCursor,
          idleBounceElapsed: command.idleBounceElapsed,
        },
        opponentTrainer: Object.freeze({ className: "COOLTRAINER", name: "REY", speechLose: ["", ""] as const }),
      });
      const lines = resolution.segments
        .flatMap((segment) => segment.commands)
        .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
        .map((cmd) => cmd.lines);
      found = { messageIds, lines, field: command.field, transition: t3t };
    }
    if (!found) throw new Error("no seed in 1..400 produced a 3-turn STRINGID_PKMNFREEDFROM repro");
    expect(found.messageIds).toContain("STRINGID_PKMNFREEDFROM");
    expect(found.lines).toContainEqual([`${found.field.player.name} was freed`, "from BIND!"]);
  });

  it("STRINGID_PKMNGOTFREE resolves the freed battler, the wrap's original caster, and the trapping move (real staged Bind then Rapid Spin)", () => {
    const found = (() => {
      for (let seed = 1; seed <= 200; seed += 1) {
        const config: FactoryFullTurnConfig = Object.freeze({
          requestId: 1,
          rngSeed: seed,
          player: {
            species: SPECIES_WOBBUFFET, moveId: SPLASH,
            moves: [SPLASH, RAPID_SPIN, 0, 0] as [number, number, number, number],
            attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
          },
          trainer: {
            species: SPECIES_MURKROW, moveId: BIND,
            moves: [BIND, SPLASH, 0, 0] as [number, number, number, number],
            attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
          },
        });
        const initial = createFactoryFullTurnBattleState(config);
        if (initial.boundary.kind !== "decision-required") continue;
        const t1p = submitFactoryFullTurnDecision(initial, { requestId: 1, side: "player", decision: AT(0) });
        if (t1p.kind !== "decision-required") continue;
        const t1t = submitFactoryFullTurnDecision(t1p.state, { requestId: 2, side: "trainer", decision: USE(0, 0) });
        if (t1t.kind !== "decision-required") continue;
        const playerStatus2 = t1t.state.rules.rulesContext.battlers[0]!.status2;
        if ((playerStatus2 & STATUS2_WRAPPED_MASK) === 0) continue; // Bind missed

        const t2p = submitFactoryFullTurnDecision(t1t.state, { requestId: 3, side: "player", decision: USE(1, 1) });
        if (t2p.kind !== "decision-required") continue;
        const t2t = submitFactoryFullTurnDecision(t2p.state, { requestId: 4, side: "trainer", decision: USE(1, 1) });

        const messageIds = extractMessages(t2t.events);
        if (!messageIds.includes("STRINGID_PKMNGOTFREE")) continue;

        const command = createBattleCommandPresentation(
          t1t.nextRequest as BattleCommandRequest,
          t1t.state.rules.rulesContext,
          1,
        );
        const resolution = createBattleResolutionPresentation({
          sourceRequest: t1t.nextRequest as BattleCommandRequest,
          sourceDecision: USE(1, 1),
          beforeRules: t1t.state.rules,
          transition: t2t,
          fieldBoundary: command.field,
          confirmHandoff: {
            fightDisplayCursor: command.fightDisplayCursor,
            idleBounceElapsed: command.idleBounceElapsed,
          },
          opponentTrainer: Object.freeze({ className: "COOLTRAINER", name: "REY", speechLose: ["", ""] as const }),
        });
        const lines = resolution.segments
          .flatMap((segment) => segment.commands)
          .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
          .map((cmd) => cmd.lines);
        return { messageIds, lines, field: command.field };
      }
      throw new Error("no seed in 1..200 produced a 2-turn STRINGID_PKMNGOTFREE repro");
    })();
    expect(found.messageIds).toContain("STRINGID_PKMNGOTFREE");
    expect(found.lines).toContainEqual([
      `${found.field.player.name} got free of`,
      `Foe ${found.field.opponent.name}’s BIND!`,
    ]);
  });
});

describe("presentation-string ISSUES #72 batch 5 -- Dream Eater's status-gated pair", () => {
  it("STRINGID_PKMNDREAMEATEN resolves the sleeping target's own name", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: DREAM_EATER,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
        status1: 3,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNDREAMEATEN");
    expect(lines).toContainEqual([`Foe ${field.opponent.name}’s`, "dream was eaten!"]);
  });

  it("STRINGID_PKMNWASNTAFFECTED resolves the awake target's own name", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: DREAM_EATER,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNWASNTAFFECTED");
    expect(lines).toContainEqual([`Foe ${field.opponent.name}`, "wasn’t affected!"]);
  });
});

describe("presentation-string ISSUES #72 batch 5 -- standalone move-effect entry scripts", () => {
  it("STRINGID_TARGETCANTESCAPENOW resolves Mean Look's own target", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: MEAN_LOOK,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_TARGETCANTESCAPENOW");
    expect(lines).toContainEqual([`Foe ${field.opponent.name} can’t`, "escape now!"]);
  });

  it("STRINGID_PKMNGOTENCORE resolves Encore's own target (a real prior move staged via lastMove)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: ENCORE,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH,
        moves: [SPLASH, 0, 0, 0] as [number, number, number, number],
        pp: [40, 0, 0, 0] as [number, number, number, number],
        lastMove: SPLASH,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNGOTENCORE");
    expect(lines).toContainEqual([`Foe ${field.opponent.name} got`, "an ENCORE!"]);
  });

  it("STRINGID_PKMNIDENTIFIED resolves Foresight's own attacker/target pair", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: FORESIGHT,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNIDENTIFIED");
    expect(lines).toContainEqual([`${field.player.name} identified`, `Foe ${field.opponent.name}!`]);
  });

  it("STRINGID_PKMNCOPIEDFOE resolves Role Play's own attacker/target/ability trio", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: ROLE_PLAY, ability: ABILITY_NONE,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH, ability: ABILITY_LEVITATE,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNCOPIEDFOE");
    expect(lines).toContainEqual([
      `${field.player.name} copied`,
      `Foe ${field.opponent.name}’s LEVITATE!`,
    ]);
  });
});

describe("presentation-string ISSUES #72 batch 5 -- on-contact abilities off Knock Off (item-less target, no Knock Off message of its own)", () => {
  it("STRINGID_PKMNHURTSWITH resolves Rough Skin's own holder and the attacker it hurt (deterministic, no RNG proc)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: KNOCK_OFF, item: 0,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
      trainer: {
        species: SPECIES_CARVANHA, moveId: SPLASH, ability: ABILITY_ROUGH_SKIN, item: 0,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNHURTSWITH");
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name}’s ROUGH SKIN`,
      `hurt ${field.player.name}!`,
    ]);
  });

  it("STRINGID_PKMNSXINFATUATEDY resolves Cute Charm's own holder and the attacker it infatuated (real 1/3 contact proc, opposite genders staged via personality)", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: {
          species: SPECIES_SKITTY, moveId: KNOCK_OFF, item: 0,
          ability: ABILITY_NONE, personality: 0xff,
          attack: 60, defense: 60, spAttack: 60, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
        },
        trainer: {
          species: SPECIES_SKITTY, moveId: SPLASH, ability: ABILITY_CUTE_CHARM, item: 0,
          personality: 0,
          attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
        },
      }),
      AT(1),
      AT(1),
      "STRINGID_PKMNSXINFATUATEDY",
    );
    expect(messageIds).toContain("STRINGID_PKMNSXINFATUATEDY");
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name}’s CUTE CHARM`,
      `infatuated ${field.player.name}!`,
    ]);
  });

  it("STRINGID_PKMNKNOCKEDOFF resolves the attacker/defender pair and the defender's own pre-removal item name", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: KNOCK_OFF, item: 0,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH, item: 187, // ITEM_KINGS_ROCK -- arbitrary Factory-legal held item.
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNKNOCKEDOFF");
    expect(lines).toContainEqual([
      `${field.player.name} knocked off`,
      `Foe ${field.opponent.name}’s KING'S ROCK!`,
    ]);
  });
});
