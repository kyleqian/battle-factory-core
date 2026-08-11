/**
 * Hand-mapped battle-intro string table for `STRINGID` ids 0/1/2/5
 * (`STRINGID_INTROMSG`/`STRINGID_INTROSENDOUT`/`STRINGID_RETURNMON`/
 * `STRINGID_BATTLEEND`).
 *
 * `docs/issue70-stringid-reachability.md` §3's first bullet
 * (`STRINGID_INTROSENDOUT`, "the one real gap"): these four ids sit below
 * `tools/extract/extract-battle-messages.ts`'s own scoped range (`STRINGID_x`,
 * `x >= BATTLESTRINGS_TABLE_START=12`, that extractor's own header comment,
 * `:6-19`) because `BufferStringBattle`
 * (`reference/pokeemerald/src/battle_message.c:2034+`) dispatches them
 * through a hand-written switch with flag-dependent branching
 * (`BATTLE_TYPE_DOUBLE`/`INGAME_PARTNER`/`TWO_OPPONENTS`/`MULTI`,
 * wild-vs-trainer, link/Union Room), not the flat one-row-per-id template
 * lookup the extractor's `[id - BATTLESTRINGS_TABLE_START]` indexing
 * assumes -- the same reason `STRINGID_SWITCHINMON` (id 3) already has a
 * hand-ported implementation inside `messageLines()` instead of a table
 * entry (`src/engine/battleResolutionPresentation.ts:1019-1038`, the
 * `if (messageId === "STRINGID_SWITCHINMON")` branch).
 *
 * This is NOT extractor output -- hence living at
 * `src/data/battleIntroStrings.ts`, not `src/data/gen/` -- every entry below
 * was parsed by hand from `BufferStringBattle`'s own switch arms
 * (`reference/pokeemerald/src/battle_message.c`), scoped to exactly the
 * branch(es) this engine's reality reaches: singles (`!BATTLE_TYPE_DOUBLE`),
 * a real Battle Factory trainer battle (`BATTLE_TYPE_TRAINER` set,
 * `gTrainerBattleOpponent_A` a real Factory opponent, never
 * `TRAINER_UNION_ROOM`/`TRAINER_LINK_OPPONENT`), and no
 * link/multiplayer/partner flags (`!BATTLE_TYPE_LINK`,
 * `!BATTLE_TYPE_RECORDED_LINK`, `!BATTLE_TYPE_MULTI`,
 * `!BATTLE_TYPE_INGAME_PARTNER`, `!BATTLE_TYPE_TWO_OPPONENTS`,
 * `!BATTLE_TYPE_TOWER_LINK_MULTI`). Every branch still gated behind one of
 * those excluded flags is left out on purpose -- it is dead code for this
 * engine, not a missed row. Each entry's own `source` field cites the exact
 * `stringPtr = sText_...;` assignment line it was read from, plus the
 * `sText_...[] = _("...")` literal's own declaration line, so a later reader
 * can re-verify without re-deriving.
 *
 * `template`/`segments` mirror `src/data/gen/battle-message-templates.json`'s
 * own `stringTable` entry shape exactly: `{B_...}` placeholder spellings
 * verbatim, and `\n`/`\p` line-break codes kept as their literal 2-character
 * source control code (not a real newline), matching
 * `src/engine/battleStringResolver.ts`'s own `LINE_BREAK_CODES` set -- so a
 * later wiring step can splice these rows into that same
 * `resolveBattleStringLines`-style resolver with zero format translation.
 * Every placeholder token used below (`B_TRAINER1_CLASS`, `B_TRAINER1_NAME`,
 * `B_PLAYER_MON1_NAME`, `B_OPPONENT_MON1_NAME`, `B_BUFF1`,
 * `B_LINK_OPPONENT1_NAME`) is already a recognized token in that same
 * extracted table's own `placeholders` array
 * (`src/data/gen/battle-message-templates.json`).
 *
 * A straight apostrophe in the C source renders as the curly glyph in-game
 * -- `charmap.txt` aliases both to the identical byte, and the extractor
 * itself normalizes to the curly form for exactly this reason
 * (`tools/extract/extract-battle-messages.ts:86-108`'s own documented
 * "charmap glyph aliasing" step). This table follows that same convention:
 * `sText_PkmnThatsEnough`'s source "that's" (straight `'`) is written below
 * as "that’s" (curly `’`), matching every other apostrophe already in
 * `battle-message-templates.json`'s own `stringTable`.
 */

export type BattleIntroStringSegment =
  | Readonly<{ type: "text"; value: string }>
  | Readonly<{ type: "placeholder"; token: string }>
  | Readonly<{ type: "linebreak"; code: "\\n" | "\\p" }>;

export type BattleIntroStringId = 0 | 1 | 2 | 5;

export type BattleIntroStringSymbol =
  | "STRINGID_INTROMSG"
  | "STRINGID_INTROSENDOUT"
  | "STRINGID_RETURNMON"
  | "STRINGID_BATTLEEND";

export type BattleIntroStringEntry = Readonly<{
  id: BattleIntroStringId;
  symbol: BattleIntroStringSymbol;
  /** Which reachable singles-trainer-battle (Factory) branch selects this template. */
  branch: string;
  template: string;
  segments: readonly BattleIntroStringSegment[];
  source: Readonly<{
    /** The `stringPtr = sText_...;` assignment line this branch reaches. */
    branchLine: string;
    /** The `static const u8 sText_...[] = _("...")` literal's own line. */
    literalLine: string;
    cSymbol: string;
  }>;
}>;

/**
 * `STRINGID_INTROMSG` (id 0). Case at `battle_message.c:1986`. The only
 * branch reachable for a singles, non-link, non-partner, non-two-opponents
 * Factory trainer battle.
 */
const INTRO_MSG_ENTRIES: readonly BattleIntroStringEntry[] = Object.freeze([
  Object.freeze({
    id: 0,
    symbol: "STRINGID_INTROMSG",
    branch:
      "BATTLE_TYPE_TRAINER set, !BATTLE_TYPE_LINK, !BATTLE_TYPE_RECORDED_LINK, "
      + "!BATTLE_TYPE_INGAME_PARTNER, !BATTLE_TYPE_TWO_OPPONENTS",
    template: "{B_TRAINER1_CLASS} {B_TRAINER1_NAME}\\nwould like to battle!\\p",
    segments: Object.freeze([
      Object.freeze({ type: "placeholder", token: "B_TRAINER1_CLASS" }),
      Object.freeze({ type: "text", value: " " }),
      Object.freeze({ type: "placeholder", token: "B_TRAINER1_NAME" }),
      Object.freeze({ type: "linebreak", code: "\\n" }),
      Object.freeze({ type: "text", value: "would like to battle!" }),
      Object.freeze({ type: "linebreak", code: "\\p" }),
    ]),
    source: Object.freeze({
      branchLine: "reference/pokeemerald/src/battle_message.c:2019",
      literalLine: "reference/pokeemerald/src/battle_message.c:385",
      cSymbol: "sText_Trainer1WantsToBattle",
    }),
  }),
]);

/**
 * `STRINGID_INTROSENDOUT` (id 1, `docs/issue70-stringid-reachability.md`
 * §3's named gap). Case at `battle_message.c:2034`. Two reachable branches:
 * the player's own first send-out, and the opponent's.
 */
const INTRO_SENDOUT_ENTRIES: readonly BattleIntroStringEntry[] = Object.freeze([
  Object.freeze({
    id: 1,
    symbol: "STRINGID_INTROSENDOUT",
    branch: "GetBattlerSide(gActiveBattler) == B_SIDE_PLAYER, !BATTLE_TYPE_DOUBLE",
    template: "Go! {B_PLAYER_MON1_NAME}!",
    segments: Object.freeze([
      Object.freeze({ type: "text", value: "Go! " }),
      Object.freeze({ type: "placeholder", token: "B_PLAYER_MON1_NAME" }),
      Object.freeze({ type: "text", value: "!" }),
    ]),
    source: Object.freeze({
      branchLine: "reference/pokeemerald/src/battle_message.c:2050",
      literalLine: "reference/pokeemerald/src/battle_message.c:396",
      cSymbol: "sText_GoPkmn",
    }),
  }),
  Object.freeze({
    id: 1,
    symbol: "STRINGID_INTROSENDOUT",
    branch:
      "GetBattlerSide(gActiveBattler) == B_SIDE_OPPONENT, !BATTLE_TYPE_DOUBLE, "
      + "!(BATTLE_TYPE_LINK | BATTLE_TYPE_RECORDED_LINK)",
    template: "{B_TRAINER1_CLASS} {B_TRAINER1_NAME} sent\\nout {B_OPPONENT_MON1_NAME}!",
    segments: Object.freeze([
      Object.freeze({ type: "placeholder", token: "B_TRAINER1_CLASS" }),
      Object.freeze({ type: "text", value: " " }),
      Object.freeze({ type: "placeholder", token: "B_TRAINER1_NAME" }),
      Object.freeze({ type: "text", value: " sent" }),
      Object.freeze({ type: "linebreak", code: "\\n" }),
      Object.freeze({ type: "text", value: "out " }),
      Object.freeze({ type: "placeholder", token: "B_OPPONENT_MON1_NAME" }),
      Object.freeze({ type: "text", value: "!" }),
    ]),
    source: Object.freeze({
      branchLine: "reference/pokeemerald/src/battle_message.c:2071",
      literalLine: "reference/pokeemerald/src/battle_message.c:388",
      cSymbol: "sText_Trainer1SentOutPkmn",
    }),
  }),
]);

/**
 * `STRINGID_RETURNMON` (id 2). Case at `battle_message.c:2079`. Player-side
 * branches on `gBattleStruct->hpScale` (0..3, the switching mon's HP
 * fraction) -- all four values are real, singles-reachable outcomes, not
 * excluded by any battle-type flag. Opponent-side has one reachable branch
 * (a real Factory trainer is never `TRAINER_LINK_OPPONENT`, never
 * `BATTLE_TYPE_RECORDED_LINK`).
 */
const RETURN_MON_ENTRIES: readonly BattleIntroStringEntry[] = Object.freeze([
  Object.freeze({
    id: 2,
    symbol: "STRINGID_RETURNMON",
    branch: "GetBattlerSide(gActiveBattler) == B_SIDE_PLAYER, hpScale == 0",
    template: "{B_BUFF1}, that’s enough!\\nCome back!",
    segments: Object.freeze([
      Object.freeze({ type: "placeholder", token: "B_BUFF1" }),
      Object.freeze({ type: "text", value: ", that’s enough!" }),
      Object.freeze({ type: "linebreak", code: "\\n" }),
      Object.freeze({ type: "text", value: "Come back!" }),
    ]),
    source: Object.freeze({
      branchLine: "reference/pokeemerald/src/battle_message.c:2083",
      literalLine: "reference/pokeemerald/src/battle_message.c:403",
      cSymbol: "sText_PkmnThatsEnough",
    }),
  }),
  Object.freeze({
    id: 2,
    symbol: "STRINGID_RETURNMON",
    branch:
      "GetBattlerSide(gActiveBattler) == B_SIDE_PLAYER, hpScale == 1 "
      + "(the `|| BATTLE_TYPE_DOUBLE` half of this condition never applies in singles)",
    template: "{B_BUFF1}, come back!",
    segments: Object.freeze([
      Object.freeze({ type: "placeholder", token: "B_BUFF1" }),
      Object.freeze({ type: "text", value: ", come back!" }),
    ]),
    source: Object.freeze({
      branchLine: "reference/pokeemerald/src/battle_message.c:2085",
      literalLine: "reference/pokeemerald/src/battle_message.c:404",
      cSymbol: "sText_PkmnComeBack",
    }),
  }),
  Object.freeze({
    id: 2,
    symbol: "STRINGID_RETURNMON",
    branch: "GetBattlerSide(gActiveBattler) == B_SIDE_PLAYER, hpScale == 2",
    template: "{B_BUFF1}, OK!\\nCome back!",
    segments: Object.freeze([
      Object.freeze({ type: "placeholder", token: "B_BUFF1" }),
      Object.freeze({ type: "text", value: ", OK!" }),
      Object.freeze({ type: "linebreak", code: "\\n" }),
      Object.freeze({ type: "text", value: "Come back!" }),
    ]),
    source: Object.freeze({
      branchLine: "reference/pokeemerald/src/battle_message.c:2087",
      literalLine: "reference/pokeemerald/src/battle_message.c:405",
      cSymbol: "sText_PkmnOkComeBack",
    }),
  }),
  Object.freeze({
    id: 2,
    symbol: "STRINGID_RETURNMON",
    branch: "GetBattlerSide(gActiveBattler) == B_SIDE_PLAYER, hpScale == 3 (the else arm)",
    template: "{B_BUFF1}, good!\\nCome back!",
    segments: Object.freeze([
      Object.freeze({ type: "placeholder", token: "B_BUFF1" }),
      Object.freeze({ type: "text", value: ", good!" }),
      Object.freeze({ type: "linebreak", code: "\\n" }),
      Object.freeze({ type: "text", value: "Come back!" }),
    ]),
    source: Object.freeze({
      branchLine: "reference/pokeemerald/src/battle_message.c:2089",
      literalLine: "reference/pokeemerald/src/battle_message.c:406",
      cSymbol: "sText_PkmnGoodComeBack",
    }),
  }),
  Object.freeze({
    id: 2,
    symbol: "STRINGID_RETURNMON",
    branch:
      "GetBattlerSide(gActiveBattler) == B_SIDE_OPPONENT, gTrainerBattleOpponent_A != TRAINER_LINK_OPPONENT, "
      + "!BATTLE_TYPE_RECORDED_LINK",
    template: "{B_TRAINER1_CLASS} {B_TRAINER1_NAME}\\nwithdrew {B_BUFF1}!",
    segments: Object.freeze([
      Object.freeze({ type: "placeholder", token: "B_TRAINER1_CLASS" }),
      Object.freeze({ type: "text", value: " " }),
      Object.freeze({ type: "placeholder", token: "B_TRAINER1_NAME" }),
      Object.freeze({ type: "linebreak", code: "\\n" }),
      Object.freeze({ type: "text", value: "withdrew " }),
      Object.freeze({ type: "placeholder", token: "B_BUFF1" }),
      Object.freeze({ type: "text", value: "!" }),
    ]),
    source: Object.freeze({
      branchLine: "reference/pokeemerald/src/battle_message.c:2102",
      literalLine: "reference/pokeemerald/src/battle_message.c:407",
      cSymbol: "sText_Trainer1WithdrewPkmn",
    }),
  }),
]);

/**
 * `STRINGID_BATTLEEND` (id 5). Case at `battle_message.c:2166`. The
 * `B_OUTCOME_LINK_BATTLE_RAN` half (`:2167-2179`) never fires outside a real
 * link battle (`B_OUTCOME_LINK_BATTLE_RAN = 1 << 7`, only OR'd into the
 * outcome byte when the player runs from a link battle -- unreachable for
 * the offline Factory). Of the remaining `else` half, `BATTLE_TYPE_MULTI`
 * and `gTrainerBattleOpponent_A == TRAINER_UNION_ROOM` are both excluded by
 * this engine's scope, leaving the final `else` arm's three
 * `gBattleTextBuff1[0]` outcomes (won/lost/drew) -- named "*LinkTrainer" in
 * the source but, per this final `else`, the ordinary single-opponent
 * outcome text used for every non-multi, non-Union-Room trainer battle,
 * Factory included.
 */
const BATTLE_END_ENTRIES: readonly BattleIntroStringEntry[] = Object.freeze([
  Object.freeze({
    id: 5,
    symbol: "STRINGID_BATTLEEND",
    branch:
      "!B_OUTCOME_LINK_BATTLE_RAN, !BATTLE_TYPE_MULTI, gTrainerBattleOpponent_A != TRAINER_UNION_ROOM, "
      + "gBattleTextBuff1[0] == B_OUTCOME_WON",
    template: "Player defeated\\n{B_LINK_OPPONENT1_NAME}!",
    segments: Object.freeze([
      Object.freeze({ type: "text", value: "Player defeated" }),
      Object.freeze({ type: "linebreak", code: "\\n" }),
      Object.freeze({ type: "placeholder", token: "B_LINK_OPPONENT1_NAME" }),
      Object.freeze({ type: "text", value: "!" }),
    ]),
    source: Object.freeze({
      branchLine: "reference/pokeemerald/src/battle_message.c:2223",
      literalLine: "reference/pokeemerald/src/battle_message.c:322",
      cSymbol: "sText_PlayerDefeatedLinkTrainer",
    }),
  }),
  Object.freeze({
    id: 5,
    symbol: "STRINGID_BATTLEEND",
    branch:
      "!B_OUTCOME_LINK_BATTLE_RAN, !BATTLE_TYPE_MULTI, gTrainerBattleOpponent_A != TRAINER_UNION_ROOM, "
      + "gBattleTextBuff1[0] == B_OUTCOME_LOST",
    template: "Player lost against\\n{B_LINK_OPPONENT1_NAME}!",
    segments: Object.freeze([
      Object.freeze({ type: "text", value: "Player lost against" }),
      Object.freeze({ type: "linebreak", code: "\\n" }),
      Object.freeze({ type: "placeholder", token: "B_LINK_OPPONENT1_NAME" }),
      Object.freeze({ type: "text", value: "!" }),
    ]),
    source: Object.freeze({
      branchLine: "reference/pokeemerald/src/battle_message.c:2226",
      literalLine: "reference/pokeemerald/src/battle_message.c:324",
      cSymbol: "sText_PlayerLostAgainstLinkTrainer",
    }),
  }),
  Object.freeze({
    id: 5,
    symbol: "STRINGID_BATTLEEND",
    branch:
      "!B_OUTCOME_LINK_BATTLE_RAN, !BATTLE_TYPE_MULTI, gTrainerBattleOpponent_A != TRAINER_UNION_ROOM, "
      + "gBattleTextBuff1[0] == B_OUTCOME_DREW",
    template: "Player battled to a draw against\\n{B_LINK_OPPONENT1_NAME}!",
    segments: Object.freeze([
      Object.freeze({ type: "text", value: "Player battled to a draw against" }),
      Object.freeze({ type: "linebreak", code: "\\n" }),
      Object.freeze({ type: "placeholder", token: "B_LINK_OPPONENT1_NAME" }),
      Object.freeze({ type: "text", value: "!" }),
    ]),
    source: Object.freeze({
      branchLine: "reference/pokeemerald/src/battle_message.c:2229",
      literalLine: "reference/pokeemerald/src/battle_message.c:326",
      cSymbol: "sText_PlayerBattledToDrawLinkTrainer",
    }),
  }),
]);

/**
 * The full hand-mapped table, ids 0/1/2/5, singles-Factory-trainer-battle
 * branches only (11 entries: 1 + 2 + 5 + 3).
 */
export const BATTLE_INTRO_STRINGS: readonly BattleIntroStringEntry[] = Object.freeze([
  ...INTRO_MSG_ENTRIES,
  ...INTRO_SENDOUT_ENTRIES,
  ...RETURN_MON_ENTRIES,
  ...BATTLE_END_ENTRIES,
]);
