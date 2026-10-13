// seg127 (S10A / ISSUES #168 slice SA2, docs/seg127-status-se-gate.md): the Scene ON controller's IsBattleSEPlaying gate before a
// B_ANIM_STATUS_* animation. Wired by sag130 (docs/sag130-status-se-gate-live.md): the status-animation command projection in
// battleResolutionPresentation.ts adds seg127StatusSeGateFromEvents' gate to the controller rows.
//
// Source: Player / OpponentHandleStatusAnimation (battle_controller_player.c:2768, battle_controller_opponent.c:1727) poll
// IsBattleSEPlaying (battle_gfx_sfx_util.c:554-571) once per row before LaunchStatusAnimation: while SE1 or SE2 still has a live track
// (sound.c:606-613) the poll returns TRUE, up to 29 times (the 30th stops both players). Every animation script drains its own SEs in
// Cmd_end (battle_anim.c:476-503), so on the Factory path the only SE that can still be playing is the effectivenesssound SE
// (Cmd_effectivenesssound, battle_script_commands.c:2001-2046: SE_NOT_EFFECTIVE 12 / SE_EFFECTIVE 13 / SE_SUPER_EFFECTIVE 14, also
// played by the confusion self-hit and the end-turn sandstorm / hail damage scripts). Hence
//   gate = clamp(seRows[songId] - seAge, 0, 29)
// with seAge = (the statusanimation instruction's row + 1) - the effectivenesssound instruction's row. ROM: 56 / 56 receipts, residual 0
// (tools/integration/fixtures/seg127/receipts/rom-r1.json).

/**
 * Rows an effectivenesssound SE keeps IsSEPlaying TRUE, counted from the effectivenesssound row: 1 + the VBlank of m4a tick T + 1 (T =
 * the song's ticks to FINE, 0.6 ticks per VBlank after tick 0; tools/integration/seg127SeLength.py). Measured identically on every
 * receipt (se_effective 73, se_super_effective 88, se_not_effective 18).
 */
export const SEG127_EFFECTIVENESS_SE_ROWS: Readonly<Record<number, number>> = Object.freeze({ 12: 18, 13: 73, 14: 88 });

/** IsBattleSEPlaying's soundTimer cap: at most 29 TRUE polls. */
export const SEG127_SE_GATE_CAP = 29;

/**
 * seAge - HP-bar rows per receipt path, constant over every ROM receipt of the path (both sides): the rows from the effectivenesssound
 * row to the status controller's first poll that are not HP-bar drain (hitanimation 33 + the 1-row instructions in between, + the
 * moveend / end-turn steps of the later paths).
 */
export const SEG127_FIXED_ROWS = Object.freeze({
  /** seteffectwithchance -> MoveEffect{Burn,Freeze,Paralysis,Poison,Toxic,Confusion} after a damaging hit. */
  "hit-secondary": 44,
  /** Static / Flame Body / Poison Point / Effect Spore at moveend (BattleScript_ApplySecondaryEffect -> MoveEffect*). */
  "contact-ability": 49,
  /** Cute Charm at moveend (BattleScript_CuteCharmActivates). */
  "cute-charm": 47,
  /** ENDTURN_THRASH -> BattleScript_ThrashConfuses after the turn's last hit. */
  "thrash-fatigue": 54,
  /** ENDTURN_YAWN -> BattleScript_YawnMakesAsleep after the end-turn sandstorm hit. */
  yawn: 53,
});

export type Seg127SeGatePath = keyof typeof SEG127_FIXED_ROWS;

/** The source rule. songId: the last effectivenesssound SE (null when none was played since the last animation script). */
export function seg127StatusSeGateRows(input: Readonly<{ songId: number | null; seAgeRows: number }>): number {
  if (!Number.isSafeInteger(input.seAgeRows) || input.seAgeRows < 1) {
    throw new Error(`seg127StatusSeGate: seAgeRows must be a positive integer, got ${input.seAgeRows}`);
  }
  const seRows = input.songId === null ? undefined : SEG127_EFFECTIVENESS_SE_ROWS[input.songId];
  if (seRows === undefined) return 0;
  return Math.max(0, Math.min(SEG127_SE_GATE_CAP, seRows - input.seAgeRows));
}

/**
 * The rule in the inputs production's presentation builder has: any message printed after the SE (crit, "It's super effective!",
 * "It's not very effective...", a weather / status print, ...) puts >= 129 rows between them (print + waitmessage 64), longer than
 * every SE, so the gate is 0; otherwise seAge = SEG127_FIXED_ROWS[path] + hpDrainRows (the HP bar's MoveBattleBar steps between the
 * SE and the status animation: |from - to| for max HP >= 48, battleHealthBarAnimationFrames in healthboxAssembly.ts).
 */
export function seg127StatusSeGateRowsForPath(
  input: Readonly<{ songId: number | null; path: Seg127SeGatePath; hpDrainRows: number; messageSinceSe: boolean }>,
): number {
  if (!Number.isSafeInteger(input.hpDrainRows) || input.hpDrainRows < 0) {
    throw new Error(`seg127StatusSeGate: hpDrainRows must be a non-negative integer, got ${input.hpDrainRows}`);
  }
  if (input.messageSinceSe) return 0;
  return seg127StatusSeGateRows({ songId: input.songId, seAgeRows: SEG127_FIXED_ROWS[input.path] + input.hpDrainRows });
}

/** The kernel event fields the event-level form reads (structurally a BattleScriptSemanticEventPayload subset). */
export type Seg127GateEvent = Readonly<{
  kind: string;
  messageId?: string;
  songId?: number;
  animationId?: string;
  /** hp-change's HP (status-change's are strings: never read). */
  from?: number | string;
  to?: number | string;
}>;

const INFLICTED_BY_STRINGS: ReadonlySet<string> = new Set([
  "STRINGID_PKMNWASPARALYZEDBY", "STRINGID_PKMNPOISONEDBY", "STRINGID_PKMNBURNEDBY", "STRINGID_PKMNMADESLEEP",
]);

/**
 * The gate from a resolution segment's kernel events (what SA2 has at the `status-animation` event): the last `play-se` before
 * `index`, whether a `message` follows it, the `hp-change` rows after it and the path from the message after the receipt. Returns
 * null for an open SE whose path has no measured fixed rows (none on census seeds 0..999).
 */
export function seg127StatusSeGateFromEvents(
  events: readonly Seg127GateEvent[],
  index: number,
  hpBarRows: (from: number, to: number) => number = (from, to) => Math.abs(from - to),
): Readonly<{ gate: number; songId: number | null; path: Seg127SeGatePath | null; hpDrainRows: number; messageSinceSe: boolean }> | null {
  if (events[index]?.kind !== "status-animation") {
    throw new Error(`seg127StatusSeGate: events[${index}] is not a status-animation event`);
  }
  let se = -1;
  for (let i = index - 1; i >= 0; i -= 1) {
    if (events[i]!.kind === "play-se") { se = i; break; }
  }
  if (se < 0) return { gate: 0, songId: null, path: null, hpDrainRows: 0, messageSinceSe: false };
  const songId = events[se]!.songId ?? null;
  const between = events.slice(se + 1, index);
  const messageSinceSe = between.some((e) => e.kind === "message");
  const hpDrainRows = between.reduce((n, e) => (e.kind === "hp-change" ? n + hpBarRows(e.from as number, e.to as number) : n), 0);
  if (messageSinceSe) return { gate: 0, songId, path: null, hpDrainRows, messageSinceSe };
  const next = events.slice(index + 1).find((e) => e.kind === "message")?.messageId ?? null;
  const moveBeforeSe = events.slice(0, se).some((e) => e.kind === "animation" && e.animationId === "MOVE_ANIMATION");
  const path: Seg127SeGatePath | null = next === "STRINGID_PKMNFATIGUECONFUSION" ? "thrash-fatigue"
    : next === "STRINGID_PKMNSXINFATUATEDY" ? "cute-charm"
      : next !== null && INFLICTED_BY_STRINGS.has(next) ? "contact-ability"
        : next === "STRINGID_PKMNFELLASLEEP" ? "yawn"
          : moveBeforeSe ? "hit-secondary" : null;
  if (path === null) return null;
  return { gate: seg127StatusSeGateRowsForPath({ songId, path, hpDrainRows, messageSinceSe }), songId, path, hpDrainRows, messageSinceSe };
}
