import { describe, expect, it } from "vitest";
import battleMessageTemplates from "../src/data/gen/battle-message-templates.json" with { type: "json" };
import {
  battleStringReferencesToken,
  resolveBattleStringLines,
} from "../src/engine/battleStringResolver.ts";
import {
  projectBattleResolutionCommands,
  type BattleResolutionPresentationCommand,
} from "../src/engine/battleResolutionPresentation.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import {
  createFactoryFullTurnBattleState,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import type { BattleCommandRequest, BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";

type Segment = Readonly<{
  type: "text" | "placeholder" | "control" | "linebreak";
  token?: string;
  name?: string;
}>;

type Entry = Readonly<{
  symbol: string;
  template: string;
  segments: readonly Segment[];
}>;

const STRING_TABLE = battleMessageTemplates.stringTable as readonly Entry[];

const TOKEN_EFFECT = "B_EFF_NAME_WITH_PREFIX";
const TOKEN_SCRIPTING = "B_SCR_ACTIVE_NAME_WITH_PREFIX";
const TOKEN_LAST_ITEM = "B_LAST_ITEM";

function hasToken(entry: Entry, token: string): boolean {
  return entry.segments.some((segment) =>
    (segment.type === "placeholder" && segment.token === token)
    || (segment.type === "control" && segment.name === token)
  );
}

function onlyTokens(entry: Entry, allowed: readonly string[]): boolean {
  return entry.segments.every((segment) =>
    segment.type !== "placeholder"
    || (segment.token !== undefined && allowed.includes(segment.token))
  );
}

const EFFECT_ENTRIES = STRING_TABLE.filter((entry) => hasToken(entry, TOKEN_EFFECT));
const SCRIPTING_ENTRIES = STRING_TABLE.filter((entry) => hasToken(entry, TOKEN_SCRIPTING));
const SIMPLE_SCRIPTING_ITEM_ENTRIES = STRING_TABLE.filter((entry) =>
  hasToken(entry, TOKEN_SCRIPTING)
  && hasToken(entry, TOKEN_LAST_ITEM)
  && onlyTokens(entry, [TOKEN_SCRIPTING, TOKEN_LAST_ITEM])
);

const ALL_NAME_AND_TEXT_RESOLVERS = (effectName: string, scriptingName: string) => Object.freeze({
  B_ATK_NAME_WITH_PREFIX: () => "ATTACKER",
  B_DEF_NAME_WITH_PREFIX: () => "DEFENDER",
  B_EFF_NAME_WITH_PREFIX: () => effectName,
  B_SCR_ACTIVE_NAME_WITH_PREFIX: () => scriptingName,
  B_CURRENT_MOVE: () => "TACKLE",
  B_LAST_ITEM: () => "PECHA BERRY",
  B_SCR_ACTIVE_ABILITY: () => "STATIC",
  B_DEF_ABILITY: () => "LIMBER",
  B_EFF_ABILITY: () => "INNER FOCUS",
  B_BUFF1: () => "poison",
  B_BUFF2: () => "status",
});

const BASE_CONFIG: FactoryFullTurnConfig = Object.freeze({
  requestId: 1,
  rngSeed: 1,
  player: Object.freeze({
    species: 12, // BUTTERFREE
    moveId: 33,
    moves: [33, 33, 33, 33] as const,
    pp: [35, 35, 35, 35] as const,
    ability: 0,
    item: 139, // ORAN BERRY
    friendship: 0,
    attack: 60,
    defense: 60,
    spAttack: 80,
    spDefense: 80,
    speed: 120,
    hp: 200,
    maxHp: 200,
    types: ["TYPE_BUG", "TYPE_FLYING"] as const,
  }),
  trainer: Object.freeze({
    species: 198, // MURKROW
    moveId: 33,
    moves: [33, 33, 33, 33] as const,
    pp: [35, 35, 35, 35] as const,
    ability: 0,
    item: 135, // PECHA BERRY
    friendship: 0,
    attack: 60,
    defense: 60,
    spAttack: 60,
    spDefense: 60,
    speed: 60,
    hp: 200,
    maxHp: 200,
    types: ["TYPE_DARK", "TYPE_FLYING"] as const,
  }),
});

const PROVENANCE = Object.freeze({
  programCounter: 1,
  opcodeId: 1,
  opcodeName: "test",
  dispatcher: "test",
  sourceLabel: "BattleScript_Test",
  sourceStatementLine: 1,
  instructionExecution: 1,
});

function semanticEvent(
  payload: Extract<BattleKernelSemanticEvent["payload"], { kind: "message" }>,
): BattleKernelSemanticEvent {
  return Object.freeze({
    sequence: 1,
    payload: Object.freeze(payload),
    provenance: PROVENANCE,
  });
}

function projectMessage(
  payload: Extract<BattleKernelSemanticEvent["payload"], { kind: "message" }>,
): Readonly<{ lines: readonly string[]; playerName: string; opponentName: string }> {
  const initial = createFactoryFullTurnBattleState(BASE_CONFIG);
  if (initial.boundary.kind !== "decision-required" || initial.boundary.request.kind !== "command") {
    throw new Error("fixture expected a command boundary");
  }
  const command = createBattleCommandPresentation(
    initial.boundary.request as BattleCommandRequest,
    initial.rules.rulesContext,
    0,
  );
  const commands = projectBattleResolutionCommands(
    [semanticEvent(payload)],
    initial.rules.rulesContext,
    initial.rules.rulesContext,
    command.field,
    null,
  );
  const message = commands.find(
    (candidate): candidate is Extract<BattleResolutionPresentationCommand, { type: "message" }> =>
      candidate.type === "message",
  );
  if (!message) throw new Error("fixture projected no message command");
  return Object.freeze({
    lines: message.lines,
    playerName: command.field.player.name,
    opponentName: command.field.opponent.name,
  });
}

describe("ISSUES #86 source selector control families", () => {
  it("enumerates every extracted effect/scripting-name sibling in both selector orientations", () => {
    // These totals come from the source/charmap extraction, not a handwritten
    // STRINGID list. The table has the control-form EFF token and the normal
    // placeholder-form scripting token; both must stay discoverable.
    expect(EFFECT_ENTRIES).toHaveLength(17);
    expect(SCRIPTING_ENTRIES).toHaveLength(45);
    expect(SIMPLE_SCRIPTING_ITEM_ENTRIES).toHaveLength(11);

    for (const orientation of [
      Object.freeze({ effect: "EFFECT", scripting: "Foe SCRIPT" }),
      Object.freeze({ effect: "Foe EFFECT", scripting: "SCRIPT" }),
    ]) {
      const resolvers = ALL_NAME_AND_TEXT_RESOLVERS(
        orientation.effect,
        orientation.scripting,
      );
      for (const entry of EFFECT_ENTRIES) {
        expect(battleStringReferencesToken(entry.symbol, TOKEN_EFFECT)).toBe(true);
        expect(resolveBattleStringLines(entry.symbol, resolvers).join("\n")).toContain(
          orientation.effect,
        );
      }
      for (const entry of SCRIPTING_ENTRIES) {
        expect(battleStringReferencesToken(entry.symbol, TOKEN_SCRIPTING)).toBe(true);
        expect(resolveBattleStringLines(entry.symbol, resolvers).join("\n")).toContain(
          orientation.scripting,
        );
      }
    }
  });

  it("uses print-time effect/scripting roles, trainer prefixes, and the frozen item snapshot", () => {
    for (const effectBattler of [0, 1] as const) {
      const projected = projectMessage({
        kind: "message",
        messageId: "STRINGID_PKMNFELLASLEEP",
        substitutions: [],
        scriptingBattler: effectBattler === 0 ? 1 : 0,
        effectBattler,
      });
      expect(projected.lines).toEqual([
        effectBattler === 0 ? projected.playerName : `Foe ${projected.opponentName}`,
        "fell asleep!",
      ]);
    }

    for (const scriptingBattler of [0, 1] as const) {
      const effectBattler = scriptingBattler === 0 ? 1 : 0;
      const projected = projectMessage({
        kind: "message",
        messageId: "STRINGID_PKMNMADESLEEP",
        substitutions: ["STATIC"],
        scriptingBattler,
        effectBattler,
      });
      const scriptingName = scriptingBattler === 0
        ? projected.playerName
        : `Foe ${projected.opponentName}`;
      const effectName = effectBattler === 0
        ? projected.playerName
        : `Foe ${projected.opponentName}`;
      expect(projected.lines).toEqual([
        `${scriptingName}’s STATIC`,
        `made ${effectName} sleep!`,
      ]);
    }

    for (const scriptingBattler of [0, 1] as const) {
      const expectedItem = scriptingBattler === 0 ? "ORAN BERRY" : "PECHA BERRY";
      for (const entry of SIMPLE_SCRIPTING_ITEM_ENTRIES) {
        const projected = projectMessage({
          kind: "message",
          messageId: entry.symbol,
          substitutions: [],
          scriptingBattler,
          // Deliberately independent of the party member lookup: source
          // B_TXT_LAST_ITEM reads gLastUsedItem at this print receipt.
          lastItem: scriptingBattler === 0 ? 139 : 135,
        });
        const scriptingName = scriptingBattler === 0
          ? projected.playerName
          : `Foe ${projected.opponentName}`;
        expect(projected.lines.join("\n")).toContain(scriptingName);
        expect(projected.lines.join("\n")).toContain(expectedItem);
      }
    }

    expect(projectMessage({
      kind: "message",
      messageId: "STRINGID_PKMNSITEMCUREDPROBLEM",
      substitutions: ["poison"],
      scriptingBattler: 1,
      lastItem: 135,
    }).lines).toEqual(["Foe MURKROW’s PECHA BERRY", "cured its poison problem!"]);
    expect(projectMessage({
      kind: "message",
      messageId: "STRINGID_PKMNSITEMRESTOREDPP",
      substitutions: ["TACKLE"],
      scriptingBattler: 0,
      lastItem: 139,
    }).lines).toEqual(["BUTTERFREE’s ORAN BERRY", "restored TACKLE’s PP!"]);
  });

  it("keeps unrelated source controls fatal", () => {
    expect(() => resolveBattleStringLines("STRINGID_PKMNGREWTOLV", {
      B_BUFF1: () => "BUTTERFREE",
      B_BUFF2: () => "50",
    })).toThrow(
      "battleStringResolver: unsupported control segment {WAIT_SE} in STRINGID_PKMNGREWTOLV",
    );
  });
});
