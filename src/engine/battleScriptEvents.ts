export type BattleScriptEventProvenance = Readonly<{
  programCounter: number;
  opcodeId: number;
  opcodeName: string;
  dispatcher: string;
  sourceLabel: string;
  sourceStatementLine: number;
  instructionExecution: number;
}>;

export type BattleScriptSemanticEventPayload =
  | Readonly<{
    kind: "message";
    messageId: string;
    substitutions: readonly string[];
  }>
  | Readonly<{
    kind: "hp-change";
    battler: number;
    from: number;
    to: number;
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
