/**
 * S10 presentation-seam checkpoint (ROADMAP S10 §3, docs/presentation-seam-
 * scout.md §7.3 gap 5): the shared `STRINGID_* -> English text` resolver
 * that has never existed in production before this rung -- the only prior
 * implementation was a single hardcoded `STRINGID_PKMNFASTASLEEP` case
 * local to one reducer file. Reads `src/data/gen/battle-message-
 * templates.json` (the already-extracted, full 365-entry
 * `gBattleStringsTable`, `tools/extract/extract-battle-messages.ts`) and
 * performs the real placeholder-splice machinery source-faithfully
 * (`BattleStringExpandPlaceholders`, `reference/pokeemerald/src/
 * battle_message.c:2312+`), scoped to exactly the placeholder kinds this
 * checkpoint's window needs: `B_DEF_NAME_WITH_PREFIX` (and its sibling
 * NAME_WITH_PREFIX tokens, the same `HANDLE_NICKNAME_STRING_CASE` macro,
 * `battle_message.c:2286-2306`).
 */
import battleMessageTemplates from "../data/gen/battle-message-templates.json" with { type: "json" };

type BattleMessageSegment =
  | Readonly<{ type: "text"; value: string }>
  | Readonly<{ type: "placeholder"; token: string }>
  | Readonly<{ type: "control"; name: string; args: readonly string[] }>
  | Readonly<{ type: "linebreak"; code: string }>;

type BattleMessageTableEntry = Readonly<{
  id: number;
  symbol: string;
  template: string;
  segments: readonly BattleMessageSegment[];
}>;

const STRING_TABLE = battleMessageTemplates.stringTable as readonly BattleMessageTableEntry[];
const USED_MOVE_ENTRY = battleMessageTemplates.usedMove as BattleMessageTableEntry;
const BY_SYMBOL: ReadonlyMap<string, BattleMessageTableEntry> = new Map(
  [...STRING_TABLE, USED_MOVE_ENTRY].map((entry) => [entry.symbol, entry]),
);

/**
 * Source `HANDLE_NICKNAME_STRING_CASE` (`battle_message.c:2286-2306`): a
 * non-player-side battler's nickname is prefixed "Foe " in a trainer battle
 * (`BATTLE_TYPE_TRAINER`) or "Wild " otherwise; the player's own side never
 * gets a prefix. The Battle Factory is always a trainer battle.
 */
export type BattleStringNameWithPrefixInput = Readonly<{
  side: "player" | "opponent";
  isTrainerBattle: boolean;
  nickname: string;
}>;

export function resolveBattleNameWithPrefix(input: BattleStringNameWithPrefixInput): string {
  if (input.side === "player") return input.nickname;
  return `${input.isTrainerBattle ? "Foe " : "Wild "}${input.nickname}`;
}

/** One resolver function per `{TOKEN}` placeholder this call site's template(s) actually use. */
export type BattleStringPlaceholderResolvers = Readonly<Record<string, () => string>>;

const LINE_BREAK_CODES = new Set(["\\n", "\\l", "\\p"]);

/**
 * Resolves `messageId` (a `STRINGID_*` symbol) against the extracted
 * template table, splicing `resolvers[token]()` for every `{TOKEN}`
 * placeholder segment the template references, and splitting on the
 * source's own line-break control codes (`\n`/`\l`/`\p`) into the fixed
 * two-line shape every committed message window in this dossier renders
 * with (`drawMessageTextLines(fb, line1, line2, ...)`).
 *
 * Throws (rather than guessing) on an unknown messageId, an unresolved
 * placeholder, or an unsupported `{CONTROL}` segment -- the real substance
 * this checkpoint's own brief asked for ("don't guess").
 */
export function resolveBattleStringLines(
  messageId: string,
  resolvers: BattleStringPlaceholderResolvers = {},
): readonly string[] {
  const entry = BY_SYMBOL.get(messageId);
  if (!entry) throw new Error(`battleStringResolver: unknown battle string id ${messageId}`);

  const lines: string[] = [];
  let current = "";
  for (const segment of entry.segments) {
    if (segment.type === "text") {
      current += segment.value;
    } else if (segment.type === "placeholder") {
      const resolve = resolvers[segment.token];
      if (!resolve) {
        throw new Error(
          `battleStringResolver: ${messageId} references placeholder {${segment.token}} with no resolver supplied`,
        );
      }
      current += resolve();
    } else if (segment.type === "linebreak") {
      if (!LINE_BREAK_CODES.has(segment.code)) {
        throw new Error(`battleStringResolver: unsupported line-break code ${segment.code} in ${messageId}`);
      }
      lines.push(current);
      current = "";
    } else {
      throw new Error(`battleStringResolver: unsupported control segment {${segment.name}} in ${messageId}`);
    }
  }
  if (current !== "") lines.push(current);
  return Object.freeze(lines);
}
