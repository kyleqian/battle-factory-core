import {
  BATTLE_COMMAND_ACTION_ENTER_DELAY,
  type BattleCommandFieldBattler,
  type BattleCommandUiStatus,
} from "./battleCommandPresentation.ts";
import {
  createBattleCommandFieldArtView,
  type BattleCommandFieldArtView,
} from "./battleCommandFieldArt.ts";
import type {
  BattleResolutionDisplayedField,
  BattleResolutionPresentationCommand,
  BattleResolutionPresentationState,
} from "./battleResolutionPresentation.ts";
import {
  BATTLE_SCRIPT_STATUS1_BURN,
  BATTLE_SCRIPT_STATUS1_FREEZE,
  BATTLE_SCRIPT_STATUS1_PARALYSIS,
  BATTLE_SCRIPT_STATUS1_POISON,
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS1_TOXIC_POISON,
} from "./battleScriptSourceConstants.ts";
import {
  battleStringPrintableLength,
  battleStringVisibleCharacters,
} from "./battleStringResolver.ts";
import {
  battleHealthBarAnimationFrames,
  battleHealthBarValueAtFrame,
  type HealthboxContentParams,
} from "./healthboxAssembly.ts";
import {
  buildFightMoveset,
  type FightMoveset,
} from "./fightSubmenuText.ts";
import {
  partySendOutGoTextVisibleChars,
  type PartySendOutPhase,
  partySendOutPhase,
} from "./partySelect.ts";
import { genericHitReactionAtAge } from "./battleMenu.ts";

export const BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES =
  BATTLE_COMMAND_ACTION_ENTER_DELAY;
/**
 * The stat RAM write is silent for exactly 2 frames before the message box
 * clears -- oracle-measured across all 5 omniboost banners (`docs/issue69-
 * omniboost-off-ground-truth.md` §2). The visible post-print hold belongs to
 * the following `message` command's own duration (`STAT_CHANGE_MESSAGE_
 * TIMING`, `battleResolutionPresentation.ts`), not this one -- ISSUES #69.
 */
export const BATTLE_RESOLUTION_STAT_CHANGE_FRAMES = 2;

export type BattleResolutionRenderEffect =
  | Readonly<{
      type: "hit";
      battler: 0 | 1;
      healthboxY2: number;
      targetInvisible: boolean;
    }>
  | Readonly<{
      type: "stat";
      battler: 0 | 1;
      stat: Extract<BattleResolutionPresentationCommand, { type: "stat" }>["stat"];
      from: number;
      to: number;
      age: number;
    }>
  | Readonly<{
      type: "status";
      battler: 0 | 1;
      before: number;
      after: number;
      age: number;
    }>
  | Readonly<{
      type: "faint";
      battler: 0 | 1;
      healthboxVisible: boolean;
      sink:
        | Readonly<{
            type: "opponent-tile-rows";
            keptRows: number;
            y2: number;
          }>
        | Readonly<{
            type: "player-pixel-rows";
            skipPixelRows: number;
          }>;
    }>;

export type BattleResolutionPresentationRenderView = Readonly<{
  field: BattleResolutionDisplayedField;
  fieldArt: BattleCommandFieldArtView;
  healthboxes: Readonly<{
    player: HealthboxContentParams & Readonly<{ currentHp: number; maxHp: number }>;
    opponent: HealthboxContentParams;
  }>;
  message: Readonly<{
    lines: readonly string[];
    visibleCharacters: number;
  }> | null;
  effect: BattleResolutionRenderEffect | null;
  visibility: Readonly<{
    player: Readonly<{ sprite: boolean; healthbox: boolean }>;
    opponent: Readonly<{ sprite: boolean; healthbox: boolean }>;
  }>;
  waitCursor: Readonly<{ age: number }> | null;
  bottom: "fight" | "message" | "blank";
  confirmHandoff: Readonly<{
    idleBounceElapsed: number;
    bounceReset: boolean;
    fightMenu: Readonly<{
      moveset: FightMoveset;
      displayCursor: 0 | 1 | 2 | 3;
    }>;
  }> | null;
  switchIn: Readonly<{
    elapsed: number;
    phase: PartySendOutPhase;
    battler: 0 | 1;
    partyStates: readonly import("./battleResolutionPresentation.ts").PartyBallState[];
  }> | null;
  partySummary: Readonly<{
    battler: 0 | 1;
    states: readonly import("./battleResolutionPresentation.ts").PartyBallState[];
  }> | null;
  /**
   * The terminal win/loss-text trainer slide-in/out, generic across any
   * trainer/outcome (`docs/terminal-seam-round-flow-scout.md` §3(iii)).
   * `offscreenX2` is the ported `SpriteCB_TrainerSlideIn` step (see
   * `TRAINER_SLIDE_TIMING`'s doc): 0 once fully settled on screen, positive
   * while still sliding off the right edge. The renderer owns the absolute
   * screen position; this view only exposes the relative offset.
   */
  trainerSlide: Readonly<{
    battler: 0 | 1;
    picSymbol: string | null;
    offscreenX2: number;
  }> | null;
}>;

export type BattleResolutionPresentationRenderAssets = Readonly<{
  drawScene(
    framebuffer: Uint8Array,
    view: BattleResolutionPresentationRenderView,
  ): void;
}>;

function uiStatusFromStatus1(status1: number): BattleCommandUiStatus {
  if (
    (status1 & BATTLE_SCRIPT_STATUS1_POISON) !== 0
    || (status1 & BATTLE_SCRIPT_STATUS1_TOXIC_POISON) !== 0
  ) return "poison";
  if ((status1 & BATTLE_SCRIPT_STATUS1_BURN) !== 0) return "burn";
  if ((status1 & BATTLE_SCRIPT_STATUS1_FREEZE) !== 0) return "freeze";
  if ((status1 & BATTLE_SCRIPT_STATUS1_PARALYSIS) !== 0) return "paralysis";
  if ((status1 & BATTLE_SCRIPT_STATUS1_SLEEP) !== 0) return "sleep";
  return "none";
}

function replaceFieldBattler(
  field: BattleResolutionDisplayedField,
  battler: 0 | 1,
  replacement: BattleCommandFieldBattler,
): BattleResolutionDisplayedField {
  return Object.freeze(
    battler === 0
      ? { player: replacement, opponent: field.opponent }
      : { player: field.player, opponent: replacement },
  );
}

function fieldBattler(
  field: BattleResolutionDisplayedField,
  battler: 0 | 1,
): BattleCommandFieldBattler {
  return battler === 0 ? field.player : field.opponent;
}

function withDisplayedHp(
  field: BattleResolutionDisplayedField,
  battler: 0 | 1,
  hp: number,
): BattleResolutionDisplayedField {
  return replaceFieldBattler(
    field,
    battler,
    Object.freeze({ ...fieldBattler(field, battler), hp }),
  );
}

function withDisplayedStatus(
  field: BattleResolutionDisplayedField,
  battler: 0 | 1,
  status1: number,
): BattleResolutionDisplayedField {
  return replaceFieldBattler(
    field,
    battler,
    Object.freeze({
      ...fieldBattler(field, battler),
      status: uiStatusFromStatus1(status1),
    }),
  );
}

function applyCompletedCommand(
  field: BattleResolutionDisplayedField,
  command: BattleResolutionPresentationCommand,
): BattleResolutionDisplayedField {
  if (command.type === "hp") {
    return withDisplayedHp(field, command.battler, command.to);
  }
  if (command.type === "status-icon") {
    return withDisplayedStatus(field, command.battler, command.status1);
  }
  if (
    command.type === "message"
    || command.type === "move-animation"
    || command.type === "hit-animation"
    || command.type === "stat"
    // The raw status write is logical battle state. The later
    // status-icon controller receipt owns the visible healthbox transition.
    || command.type === "status"
    || command.type === "faint"
    || command.type === "party-summary"
    || command.type === "sprite-visibility"
    || command.type === "turn-end"
    || command.type === "trainer-slide"
  ) return field;
  if (command.type === "switch-in") {
    return replaceFieldBattler(field, command.battler, command.incoming);
  }
  throw new Error("battle resolution renderer received an unknown command");
}

function currentSegment(state: BattleResolutionPresentationState) {
  const segment = state.segments[state.segmentIndex];
  if (!segment) {
    throw new Error(
      `battle resolution renderer has no segment ${state.segmentIndex}`,
    );
  }
  if (
    !Number.isSafeInteger(state.commandIndex)
    || state.commandIndex < 0
    || state.commandIndex > segment.commands.length
  ) {
    throw new Error(
      `battle resolution renderer has invalid command index ${state.commandIndex}`,
    );
  }
  return segment;
}

export function battleResolutionCommandDuration(
  command: BattleResolutionPresentationCommand,
  field: BattleResolutionDisplayedField,
): number {
  switch (command.type) {
    case "message":
      // holdFrames is the source's own post-print `waitmessage
      // B_WAIT_TIME_LONG` -- a hold *after* the text finishes printing, not
      // part of the print-speed floor/length term (ISSUES #69).
      return Math.max(
        command.timing.minimumFrames,
        battleStringPrintableLength(command.lines),
      ) + command.timing.holdFrames;
    case "move-animation":
    case "hit-animation":
      return command.timing.minimumFrames;
    case "hp": {
      const maxHp = fieldBattler(field, command.battler).maxHP;
      return Math.max(
        command.timing.minimumFrames,
        // Frame 0 preserves the old display value; the source controller's
        // first graphical step is frame 1.
        battleHealthBarAnimationFrames({
          maxHp,
          from: command.from,
          to: command.to,
        }) + 1,
      );
    }
    case "stat":
      return Math.max(
        command.timing.minimumFrames,
        BATTLE_RESOLUTION_STAT_CHANGE_FRAMES,
      );
    case "status":
    case "status-icon":
    case "faint":
    case "switch-in":
    case "sprite-visibility":
      return command.timing.minimumFrames;
    case "party-summary":
      return 1;
    case "turn-end":
      return command.timing.minimumFrames;
    case "trainer-slide":
      return command.timing.minimumFrames;
  }
}

export function isBattleResolutionCommandComplete(
  state: BattleResolutionPresentationState,
): boolean {
  if (state.lifecycle.phase !== "presenting") return false;
  const segment = currentSegment(state);
  const command = segment.commands[state.commandIndex];
  if (!command) return true;
  // A button-advance message's dismiss input is the only thing that may
  // retire it -- `battleResolutionCommandDuration`'s length-derived duration
  // is a typing-speed floor, not a substitute completion path. Without this
  // gate, a message whose printable length sits within 1 of
  // `minimumFrames` can have that duration elapse *before*
  // `isBattleResolutionButtonMessageReady` first goes true, silently
  // skipping the dismiss wait entirely (ISSUES #75).
  if (command.type === "message" && command.advance === "button") {
    return isBattleResolutionButtonMessageReady(state);
  }
  let field = state.field;
  for (let index = 0; index < state.commandIndex; index += 1) {
    field = applyCompletedCommand(field, segment.commands[index]!);
  }
  return state.lifecycle.phaseElapsed + 1
    >= battleResolutionCommandDuration(command, field);
}

export function isBattleResolutionButtonMessageReady(
  state: BattleResolutionPresentationState,
): boolean {
  const command = currentSegment(state).commands[state.commandIndex];
  return command?.type === "message"
    && command.advance === "button"
    && state.lifecycle.phaseElapsed
      >= battleStringPrintableLength(command.lines) + 1;
}

export function isBattleResolutionNextCommandHandoffComplete(
  state: BattleResolutionPresentationState,
): boolean {
  return state.lifecycle.phase === "next-command-handoff"
    && state.lifecycle.phaseElapsed >= BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES;
}

function healthboxParams(
  battler: BattleCommandFieldBattler,
  targetHp?: number,
): HealthboxContentParams {
  return Object.freeze({
    name: battler.name,
    level: battler.level,
    gender: battler.gender === "genderless" ? "none" : battler.gender,
    hpFraction: battler.hp / battler.maxHP,
    ...(targetHp === undefined
      ? {}
      : { hpTargetFraction: targetHp / battler.maxHP }),
    status: battler.status,
  });
}

/**
 * Projects one framebuffer view strictly from the immutable display field,
 * typed commands, and command-relative lifecycle. It never reads the
 * transition's settled rules, battle RNG, scene elapsed time, or a canonical
 * duration vector.
 */
export function createBattleResolutionPresentationRenderView(
  state: BattleResolutionPresentationState,
): BattleResolutionPresentationRenderView {
  const segment = currentSegment(state);
  let field = state.field;
  let latestMessage: readonly string[] | null = null;
  let switchIn: BattleResolutionPresentationRenderView["switchIn"] = null;
  let partySummary: BattleResolutionPresentationRenderView["partySummary"] = null;
  const fainted = new Set<0 | 1>();
  const spriteVisibility = new Map<0 | 1, boolean>([[0, true], [1, true]]);
  // Recalled battlers (real CONTROLLER_RETURNMONTOBALL receipts) lose their
  // healthbox alongside the sprite; the unrelated CONTROLLER_SPRITEINVISIBILITY
  // receipt (Dig/Fly semi-invisibility) never does -- see the "sprite-visibility"
  // command's own `recall` doc comment.
  const healthboxVisibility = new Map<0 | 1, boolean>([[0, true], [1, true]]);
  let settledTrainer: Readonly<{ battler: 0 | 1 }> | null = null;
  // Visibility receipts are controller-owned persistent state. A later
  // automatic locked-action segment starts from the finished prior segment,
  // not from an invented visible baseline.
  for (let segmentIndex = 0; segmentIndex < state.segmentIndex; segmentIndex += 1) {
    for (const completed of state.segments[segmentIndex]!.commands) {
      if (completed.type === "sprite-visibility") {
        spriteVisibility.set(completed.battler, completed.visible);
        if (completed.recall) healthboxVisibility.set(completed.battler, completed.visible);
      }
      if (completed.type === "trainer-slide") {
        settledTrainer = completed.direction === "in"
          ? Object.freeze({ battler: completed.battler })
          : null;
      }
    }
  }
  const confirmHandoff = state.confirmHandoff === null
    ? null
    : Object.freeze({
        idleBounceElapsed: state.confirmHandoff.idleBounceElapsed,
        bounceReset: state.confirmHandoff.bounceReset,
        fightMenu: Object.freeze({
          moveset: buildFightMoveset(
            state.field.player.moveIds,
            state.field.player.currentPP,
            state.field.player.ppBonuses,
          ),
          displayCursor: state.confirmHandoff.fightDisplayCursor,
        }),
      });
  if (state.lifecycle.phase === "presenting-switch-in") {
    const switchCommand = segment.commands.find(
      (candidate): candidate is Extract<
        BattleResolutionPresentationCommand,
        { type: "switch-in" }
      > => candidate.type === "switch-in",
    );
    const summary = segment.commands.find(
      (candidate): candidate is Extract<
        BattleResolutionPresentationCommand,
        { type: "party-summary" }
      > => candidate.type === "party-summary" && candidate.visible,
    );
    const message = segment.commands.find(
      (candidate): candidate is Extract<
        BattleResolutionPresentationCommand,
        { type: "message" }
      > => candidate.type === "message",
    );
    if (!switchCommand || !summary || !message) {
      throw new Error(
        "battle resolution switch-in lifecycle requires summary, message, and switch commands",
      );
    }
    field = replaceFieldBattler(
      field,
      switchCommand.battler,
      switchCommand.incoming,
    );
    latestMessage = message.lines;
    switchIn = Object.freeze({
      elapsed: state.lifecycle.phaseElapsed,
      phase: partySendOutPhase(state.lifecycle.phaseElapsed),
      battler: switchCommand.battler,
      partyStates: summary.states,
    });
  }
  for (let index = 0; index < state.commandIndex; index += 1) {
    const completed = segment.commands[index]!;
    field = applyCompletedCommand(field, completed);
    if (completed.type === "message") latestMessage = completed.lines;
    if (completed.type === "faint") fainted.add(completed.battler);
    if (completed.type === "switch-in") fainted.delete(completed.battler);
    if (completed.type === "sprite-visibility") {
      spriteVisibility.set(completed.battler, completed.visible);
      if (completed.recall) healthboxVisibility.set(completed.battler, completed.visible);
    }
    if (completed.type === "party-summary") {
      partySummary = completed.visible
        ? Object.freeze({ battler: completed.battler, states: completed.states })
        : null;
    }
    if (completed.type === "trainer-slide") {
      settledTrainer = completed.direction === "in"
        ? Object.freeze({ battler: completed.battler })
        : null;
    }
  }

  const command = segment.commands[state.commandIndex] ?? null;
  let effect: BattleResolutionRenderEffect | null = null;
  let visibleCharacters = latestMessage === null
    ? 0
    : switchIn === null
      ? battleStringPrintableLength(latestMessage)
      : partySendOutGoTextVisibleChars(switchIn.elapsed);
  let hpTarget: Readonly<{ battler: 0 | 1; to: number }> | null = null;
  let waitCursor: Readonly<{ age: number }> | null = null;
  let activeTrainerSlide: Readonly<{ battler: 0 | 1; offscreenX2: number }> | null = null;

  if (
    (
      state.lifecycle.phase === "presenting"
      || state.lifecycle.phase === "awaiting-message-dismiss"
      || state.lifecycle.phase === "forced-party-handoff"
    )
    && command
  ) {
    if (command.type === "message") {
      latestMessage = command.lines;
      visibleCharacters = battleStringVisibleCharacters(
        command.lines,
        state.lifecycle.phaseElapsed,
      );
      if (
        command.advance === "button"
        && !command.noCursor
        && isBattleResolutionButtonMessageReady(state)
      ) {
        waitCursor = Object.freeze({
          age:
            state.lifecycle.phaseElapsed
            - battleStringPrintableLength(command.lines)
            - 1,
        });
      }
    } else if (command.type === "hp") {
      const battler = fieldBattler(field, command.battler);
      if (battler.hp !== command.from) {
        throw new Error(
          `battle resolution HP command starts at ${command.from}, displayed ${battler.hp}`,
        );
      }
      const semanticEndpoint = Math.max(
        0,
        Math.min(battler.maxHP, command.from - command.healthValue),
      );
      if (semanticEndpoint !== command.to) {
        throw new Error(
          `battle resolution HP controller ${command.healthValue} resolves ${command.from}->${semanticEndpoint}, event endpoint is ${command.to}`,
        );
      }
      field = withDisplayedHp(
        field,
        command.battler,
        battleHealthBarValueAtFrame(
          { maxHp: battler.maxHP, from: command.from, to: command.to },
          state.lifecycle.phaseElapsed,
        ),
      );
      hpTarget = Object.freeze({ battler: command.battler, to: command.to });
    } else if (command.type === "hit-animation") {
      effect = Object.freeze({
        type: "hit",
        battler: command.battler,
        ...genericHitReactionAtAge(
          state.lifecycle.phaseElapsed,
          command.timing.firstDisplayedAge,
        ),
      });
    } else if (command.type === "stat") {
      effect = Object.freeze({
        type: "stat",
        battler: command.battler,
        stat: command.stat,
        from: command.from,
        to: command.to,
        age: state.lifecycle.phaseElapsed,
      });
    } else if (command.type === "status") {
      effect = Object.freeze({
        type: "status",
        battler: command.battler,
        before: command.before,
        after: command.after,
        age: state.lifecycle.phaseElapsed,
      });
    } else if (command.type === "faint") {
      if (command.timing.sink === "opponent-tile-rows") {
        const d = state.lifecycle.phaseElapsed - 1;
        const erased = d <= 0
          ? 0
          : Math.min(command.timing.steps, Math.ceil(d / 2));
        effect = Object.freeze({
          type: "faint",
          battler: command.battler,
          healthboxVisible:
            state.lifecycle.phaseElapsed
            < command.timing.healthboxVanishFrame,
          sink: Object.freeze({
            type: "opponent-tile-rows",
            keptRows: command.timing.steps - erased,
            y2: erased * 8,
          }),
        });
      } else {
        effect = Object.freeze({
          type: "faint",
          battler: command.battler,
          healthboxVisible:
            state.lifecycle.phaseElapsed
            < command.timing.healthboxVanishFrame,
          sink: Object.freeze({
            type: "player-pixel-rows",
            skipPixelRows: Math.min(
              command.timing.spriteRows,
              command.timing.pixelsPerFrame * state.lifecycle.phaseElapsed,
            ),
          }),
        });
      }
    } else if (command.type === "party-summary") {
      partySummary = command.visible
        ? Object.freeze({ battler: command.battler, states: command.states })
        : null;
    } else if (command.type === "switch-in") {
      field = replaceFieldBattler(field, command.battler, command.incoming);
      fainted.delete(command.battler);
    } else if (command.type === "sprite-visibility") {
      spriteVisibility.set(command.battler, command.visible);
      if (command.recall) healthboxVisibility.set(command.battler, command.visible);
    } else if (command.type === "trainer-slide") {
      const age = Math.min(state.lifecycle.phaseElapsed, command.timing.minimumFrames);
      activeTrainerSlide = Object.freeze({
        battler: command.battler,
        offscreenX2: command.direction === "in"
          ? 2 * (command.timing.minimumFrames - age)
          : 2 * age,
      });
    }
  } else if (
    state.lifecycle.phase !== "confirm-handoff"
    &&
    state.lifecycle.phase !== "next-command-handoff"
    && state.lifecycle.phase !== "terminal-handoff"
    && state.lifecycle.phase !== "presenting-switch-in"
    && state.lifecycle.phase !== "presenting"
  ) {
    throw new Error(
      `battle resolution non-KO renderer cannot render ${state.lifecycle.phase}`,
    );
  }

  const playerTarget =
    hpTarget?.battler === 0 ? hpTarget.to : undefined;
  const opponentTarget =
    hpTarget?.battler === 1 ? hpTarget.to : undefined;
  const playerFaint = effect?.type === "faint" && effect.battler === 0
    ? effect
    : null;
  const opponentFaint = effect?.type === "faint" && effect.battler === 1
    ? effect
    : null;
  const fieldArt = createBattleCommandFieldArtView(field);
  const playerHit = effect?.type === "hit" && effect.battler === 0
    ? effect
    : null;
  const opponentHit = effect?.type === "hit" && effect.battler === 1
    ? effect
    : null;
  return Object.freeze({
    field,
    fieldArt,
    healthboxes: Object.freeze({
      player: Object.freeze({
        ...healthboxParams(field.player, playerTarget),
        currentHp: field.player.hp,
        maxHp: field.player.maxHP,
      }),
      opponent: healthboxParams(field.opponent, opponentTarget),
    }),
    message:
      latestMessage === null
        ? null
        : Object.freeze({
            lines: latestMessage,
            visibleCharacters,
          }),
    effect,
    visibility: Object.freeze({
      player: Object.freeze({
        sprite: (spriteVisibility.get(0) ?? true)
          && !fainted.has(0)
          && !(playerHit?.targetInvisible ?? false)
          && !(
            playerFaint?.sink.type === "player-pixel-rows"
            && playerFaint.sink.skipPixelRows
              >= fieldArt.player.pic.tileset.rows * 8
          ),
        healthbox: !fainted.has(0)
          && (playerFaint?.healthboxVisible ?? true)
          && (healthboxVisibility.get(0) ?? true),
      }),
      opponent: Object.freeze({
        sprite: (spriteVisibility.get(1) ?? true)
          && !fainted.has(1)
          && !(opponentHit?.targetInvisible ?? false)
          && !(
            opponentFaint?.sink.type === "opponent-tile-rows"
            && opponentFaint.sink.keptRows === 0
          ),
        healthbox: !fainted.has(1)
          && (opponentFaint?.healthboxVisible ?? true)
          && (healthboxVisibility.get(1) ?? true),
      }),
    }),
    waitCursor,
    bottom:
      confirmHandoff !== null
        ? "fight"
      : state.lifecycle.phase === "next-command-handoff"
      || switchIn?.phase === "blankMessage"
        ? "blank"
        : "message",
    confirmHandoff,
    switchIn,
    partySummary,
    trainerSlide: activeTrainerSlide !== null
      ? Object.freeze({
          battler: activeTrainerSlide.battler,
          picSymbol: state.opponentTrainer?.trainerPic ?? null,
          offscreenX2: activeTrainerSlide.offscreenX2,
        })
      : settledTrainer !== null
        ? Object.freeze({
            battler: settledTrainer.battler,
            picSymbol: state.opponentTrainer?.trainerPic ?? null,
            offscreenX2: 0,
          })
        : null,
  });
}

export function renderBattleResolutionPresentation(
  framebuffer: Uint8Array,
  state: BattleResolutionPresentationState,
  assets: BattleResolutionPresentationRenderAssets,
): void {
  assets.drawScene(
    framebuffer,
    createBattleResolutionPresentationRenderView(state),
  );
}
