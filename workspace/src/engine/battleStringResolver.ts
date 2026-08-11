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
import movesAsset from "../data/gen/moves.json" with { type: "json" };

const MOVES = movesAsset.moves as readonly { id: number; name: string }[];

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
 * Source-table lookup for a BattleStringExpandPlaceholders token.  A name
 * selector can be encoded either as the ordinary `{B_TXT_*}` placeholder or
 * as charmap's zero-argument control form (`B_EFF_NAME_WITH_PREFIX`), so the
 * caller must inspect both segment shapes rather than assuming one encoding.
 */
export function battleStringReferencesToken(messageId: string, token: string): boolean {
  const entry = BY_SYMBOL.get(messageId);
  // A few source print receipts (for example STRINGID_SWITCHINMON) are
  // deliberately resolved by the separate intro-string table rather than
  // gBattleStringsTable. This is a capability query, not the resolver's
  // completeness guard, so those ids simply have no token in this table.
  if (!entry) return false;
  return entry.segments.some((segment) =>
    (segment.type === "placeholder" && segment.token === token)
    || (segment.type === "control" && segment.name === token)
  );
}

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

/**
 * `STRINGID_USEDMOVE`'s own `{B_BUFF2}` (`battle_message.c:2155-2162`):
 * `gBattleTextBuff2` is set to `gMoveNames[currentMove]`, then
 * `ChooseTypeOfMoveUsedString` (`:2922-2955`) appends one of 5
 * `sText_ExclamationMark*` constants selected via `sGrammarMoveUsedTable`
 * (a leftover Japanese-grammar table -- MOVE_ROCK_SLIDE falls into its
 * default/untabled case, MOVE_DOUBLE_TEAM is explicitly tabled into a
 * different case) -- but all 5 constants are the literal English string `"!"`
 * (`:420-424`, confirmed by the source's own comment `:2907-2921`: the
 * Japanese-specific grammar collapsed to identical English text), so the
 * table's own case selection is not port-worthy: every move's own display
 * name plus a bare `"!"` is correct in English regardless of which case it
 * falls into.
 */
export function resolveMoveNameExclaim(moveId: number): string {
  const entry = MOVES[moveId];
  if (!entry) throw new Error(`battleStringResolver: no moves.json entry for move id ${moveId}`);
  return `${entry.name}!`;
}

/** `{B_CURRENT_MOVE}`: `gMoveNames[gBattleMsgDataPtr->currentMove]` (battle_message.c:2453-2456), no punctuation appended. */
export function resolveMoveName(moveId: number): string {
  const entry = MOVES[moveId];
  if (!entry) throw new Error(`battleStringResolver: no moves.json entry for move id ${moveId}`);
  return entry.name;
}

/**
 * One resolver function per source text substitution this call site's
 * template(s) actually use. Most are `B_TXT_*` placeholders; a few
 * nickname substitutions (notably `B_EFF_NAME_WITH_PREFIX`, charmap.txt:368)
 * are encoded as zero-argument text controls instead.
 */
export type BattleStringPlaceholderResolvers = Readonly<Record<string, () => string>>;

const LINE_BREAK_CODES = new Set(["\\n", "\\l", "\\p"]);

/**
 * Source text printers advance once per printable glyph; line-break control
 * codes select the next window line without consuming a glyph frame.
 * Resolution commands already contain frozen, resolved lines, so their
 * presentation clock can use this helper without reopening the string table
 * or consulting battle state.
 */
export function battleStringPrintableLength(lines: readonly string[]): number {
  return lines.reduce((total, line) => total + [...line].length, 0);
}

/**
 * Number of resolved glyphs visible at a command-relative text-printer age.
 * Age 0 is the first printer callback and therefore exposes the first glyph.
 */
export function battleStringVisibleCharacters(
  lines: readonly string[],
  printerAge: number,
): number {
  if (!Number.isSafeInteger(printerAge)) {
    throw new Error(
      `battleStringResolver: printer age must be a safe integer, got ${printerAge}`,
    );
  }
  return Math.min(
    battleStringPrintableLength(lines),
    Math.max(0, printerAge + 1),
  );
}

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
      // `B_EFF_NAME_WITH_PREFIX` is a source nickname substitution encoded
      // as its own zero-argument text control (charmap.txt:368), not a
      // B_TXT placeholder. Treat a supplied zero-argument resolver exactly
      // like a placeholder; actual controls such as {WAIT_SE} remain
      // unsupported until their timing behavior is explicitly modeled.
      const resolve = segment.args.length === 0
        ? resolvers[segment.name]
        : undefined;
      if (!resolve) {
        throw new Error(`battleStringResolver: unsupported control segment {${segment.name}} in ${messageId}`);
      }
      current += resolve();
    }
  }
  if (current !== "") lines.push(current);
  return Object.freeze(lines);
}
