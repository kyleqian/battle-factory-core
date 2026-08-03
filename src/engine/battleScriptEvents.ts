export type BattleScriptEventProvenance = Readonly<{
  programCounter: number;
  opcodeId: number;
  opcodeName: string;
  dispatcher: string;
  sourceLabel: string;
  sourceStatementLine: number;
  instructionExecution: number;
}>;

export type BattleScriptBattlerId = 0 | 1 | 2 | 3;

/**
 * Semantic contents of one of Emerald's three battle-text substitution
 * buffers. Tokens are resolved by the injected source-context boundary; this
 * deliberately does not expose the controller's encoded byte transport.
 */
export type BattleScriptTextBufferSnapshot = readonly string[];

/**
 * The action globals readable by Cmd_printstring. The full-turn reducer
 * freezes this at the print receipt so presentation never has to rediscover
 * an attacker or move after a later controller/script mutation.
 */
export type BattleScriptActionMessageSnapshot = Readonly<{
  attacker: BattleScriptBattlerId;
  currentMove: number;
  currentMovePosition: number;
}>;

export type BattleScriptSelectionMessageSnapshot = Readonly<{
  currentMove: number;
  originallyUsedMove: number;
  lastItem: number;
  lastAbility: number;
  scriptingBattler: BattleScriptBattlerId;
  scriptPartyIndex: number;
  battlerAbilities: readonly [
    number,
    number,
    number,
    number,
  ];
  textBuffers: readonly [
    BattleScriptTextBufferSnapshot,
    BattleScriptTextBufferSnapshot,
    BattleScriptTextBufferSnapshot,
  ];
}>;

export type BattleScriptGameStat =
  | Readonly<{
    index: 26;
    symbol: "GAME_STAT_USED_SPLASH";
  }>
  | Readonly<{
    index: 27;
    symbol: "GAME_STAT_USED_STRUGGLE";
  }>;

export type BattleScriptSemanticEventPayload =
  | Readonly<{
    kind: "message";
    messageId: string;
    substitutions: readonly string[];
    /** Optional for synthetic/staged receipts that predate the full-turn seam. */
    actionSnapshot?: BattleScriptActionMessageSnapshot;
  }>
  | Readonly<{
    kind: "selection-message";
    audience: "player-only";
    battler: BattleScriptBattlerId;
    stringId: number;
    snapshot: BattleScriptSelectionMessageSnapshot;
  }>
  | Readonly<{
    kind: "play-se";
    battler: BattleScriptBattlerId;
    songId: number;
  }>
  | Readonly<{
    kind: "play-fanfare";
    battler: BattleScriptBattlerId;
    songId: number;
  }>
  | Readonly<{
    kind: "play-faint-cry";
    battler: BattleScriptBattlerId;
  }>
  | Readonly<{
    /** BtlController_EmitFaintAnimation(B_COMM_TO_CONTROLLER) -- Cmd_dofaintanimation's only effect. */
    kind: "faint-animation";
    battler: BattleScriptBattlerId;
  }>
  | Readonly<{
    kind: "hide-party-status-summary";
    battler: BattleScriptBattlerId;
  }>
  | Readonly<{
    /** BtlController_EmitDrawPartyStatusSummary -- source's HP/status snapshot payload is presentation-only, not modeled here. */
    kind: "draw-party-status-summary";
    battler: BattleScriptBattlerId;
  }>
  | Readonly<{
    kind: "set-battler-sprite-visibility";
    battler: BattleScriptBattlerId;
    invisible: boolean;
  }>
  | Readonly<{
    kind: "set-battler-status-data";
    battler: BattleScriptBattlerId;
    /** Raw u32 sent by EmitSetMonData(REQUEST_STATUS_BATTLE). */
    status1: number;
  }>
  | Readonly<{
    /**
     * BtlController_EmitSetMonData(REQUEST_STATUS_BATTLE, partyMask, ...)
     * from Cmd_healpartystatus. The controller applies the same raw status
     * word to every selected party record.
     */
    kind: "set-party-status-data";
    battler: BattleScriptBattlerId;
    partyMask: number;
    status1: number;
  }>
  | Readonly<{
    /** BtlController_EmitStatusIconUpdate(status1, status2) -- Cmd_updatestatusicon's icon-redraw notify, distinct from the data-sync set-battler-status-data. */
    kind: "status-icon-update";
    battler: BattleScriptBattlerId;
    status1: number;
    status2: number;
  }>
  | Readonly<{
    kind: "set-battler-pp-data";
    battler: BattleScriptBattlerId;
    /** gCurrMovePos slot, and the raw post-deduction u8 EmitSetMonData(REQUEST_PPMOVE1_BATTLE + slot) sends. */
    movePosition: number;
    pp: number;
  }>
  | Readonly<{
    /** BtlController_EmitResetActionMoveSelection(..., RESET_MOVE_SELECTION). */
    kind: "reset-action-move-selection";
    battler: BattleScriptBattlerId;
    reset: "move-selection";
    command: 54;
    argument: 2;
  }>
  | Readonly<{
    /** BtlController_EmitSetMonData(REQUEST_MOVES_PP_BATTLE). */
    kind: "set-battler-moves-pp-data";
    battler: BattleScriptBattlerId;
    moves: readonly [number, number, number, number];
    pp: readonly [number, number, number, number];
    ppBonuses: number;
  }>
  | Readonly<{
    /** BtlController_EmitSetMonData(REQUEST_HELDITEM_BATTLE) -- Cmd_removeitem's own consumption notify (battle_script_commands.c:5901-5915). */
    kind: "set-battler-item";
    battler: BattleScriptBattlerId;
    item: number;
  }>
  | Readonly<{
    /**
     * Save/meta observation from Cmd_incrementgamestat. The Battle Script
     * machine deliberately does not own SaveBlock encryption, range checks,
     * or saturation; battleGameStatMeta.ts consumes this typed intent.
     */
    kind: "game-stat-increment";
    gameStat: BattleScriptGameStat;
  }>
  | Readonly<{
    kind: "trainer-slide-in";
    battler: BattleScriptBattlerId;
  }>
  | Readonly<{
    kind: "trainer-slide-out";
    battler: BattleScriptBattlerId;
  }>
  | Readonly<{
    kind: "status-animation";
    battler: BattleScriptBattlerId;
    /** Raw bool8 controller operand: source does not normalize opcode 102. */
    isStatus2: number;
    status: number;
  }>
  | Readonly<{
    kind: "hp-change";
    battler: number;
    from: number;
    to: number;
  }>
  | Readonly<{
    /** BtlController_EmitHealthBarUpdate(B_COMM_TO_CONTROLLER, healthValue) -- the animated bar delta, distinct from hp-change's before/after HP. */
    kind: "health-bar-update";
    battler: BattleScriptBattlerId;
    healthValue: number;
  }>
  | Readonly<{
    kind: "status-change";
    battler: number;
    from: string;
    to: string;
  }>
  | Readonly<{
    kind: "stat-stage-change";
    battler: number;
    stat: "attack" | "defense" | "speed" | "special-attack" | "special-defense" | "accuracy" | "evasion";
    from: number;
    to: number;
    /**
     * ChangeStatBuffs's own pre-clamp `GET_STAT_BUFF_VALUE(statValue)`
     * (battle_script_commands.c:7038,7061), NOT `Math.abs(to - from)`.
     * `STRINGID_ATTACKERSSTATROSE`/`FELL` and `DEFENDERSSTATROSE`/`FELL`'s
     * `{B_BUFF2}` "sharply"/"harshly" selection reads this requested
     * magnitude, so a stage-11 SWORDS DANCE (+2 requested, +1 post-clamp)
     * still prints "sharply rose!" -- oracle-confirmed,
     * docs/issue66b-preclamp-magnitude-verdict.md.
     */
    requestedMagnitude: 1 | 2;
  }>
  | Readonly<{
    kind: "animation";
    animationId: string;
    battler: number | null;
    arguments: readonly string[];
  }>
  | Readonly<{
    kind: "switch";
    side: "player" | "opponent";
    fromPartyIndex: number;
    toPartyIndex: number;
  }>
  | Readonly<{
    /** BtlController_EmitSwitchInAnim from Cmd_switchinanim. */
    kind: "switch-in-animation";
    battler: BattleScriptBattlerId;
    partyIndex: number;
  }>
  | Readonly<{
    kind: "outcome";
    outcome: "player-win" | "opponent-win" | "draw";
  }>;

type SequencedEvent<Event extends BattleScriptSemanticEventPayload> = Readonly<
  Event & {
    sequence: number;
    provenance: BattleScriptEventProvenance;
  }
>;

export type BattleScriptSemanticEvent =
  BattleScriptSemanticEventPayload extends infer Event
    ? Event extends BattleScriptSemanticEventPayload
      ? SequencedEvent<Event>
      : never
    : never;
