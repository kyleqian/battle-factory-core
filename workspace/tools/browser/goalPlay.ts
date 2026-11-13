// Goal-directed play for tools/browser/randomPlay.mjs (no browser imports).
//
// The node side keeps a MIRROR engine and runs the soak's own RandomPlayer
// (tools/soak/randomRoundSoakDriver.ts) against it frame by frame, so the policy always sees the real
// screen/state. The frames it produces (RLE segments: frames + held buttons) are what the browser page then
// replays through its __POKEBENCH__.advance() ABI; the page is deterministic given its inputs, so the page and
// the mirror stay in lockstep without reading anything back. A little uniform-random input (menus opened and
// cancelled, B-backs, START) is mixed in so the run keeps exploring.
import "../../src/engine/monPicPixelsInstall.ts"; // iss215: standalone node run must install the sprite pixel provider (bnd257d)

import { createInitialState, tick, type EngineState } from "../../src/engine/core.ts";
import type { GbaButton } from "../../src/input.ts";
import { isFactoryLobbyCellWalkable, isFactoryLobbyFacingSinglesAttendant, LOBBY_SINGLES_ATTENDANT_CELL, type LobbyDirection } from "../../src/engine/factoryLobbyFreeRoam.ts";
import { ActionLog, RandomPlayer, Rng, type SoakPolicy } from "../soak/randomRoundSoakDriver.ts";
import { createInputGenerator, type InputGenerator } from "./randomPlayInput.ts";

/** GBA frame length in ms (16_777_216 / 280_896 Hz, src/main.ts FRAME_HZ). */
export const FRAME_MS = 280_896 / 16_777.216;
/** Frames the free-roam lobby (the end of a lost challenge) is wandered before a fresh challenge starts. */
export const LOBBY_WANDER_FRAMES = 540;
/** Frames with no surface/turn/battle change before the challenge is abandoned and restarted. */
export const STALL_RESTART_FRAMES = 14_400;
/** Frames with no progress after which random mixing becomes aggressive (the stalled weights). */
export const STALL_MIX_FRAMES = 1_800;
/** Frames one challenge may run before a fresh page and the next policy in the cycle take over (the winners never lose on their own). */
export const CHALLENGE_BUDGET_FRAMES = 120_000;
/** A policy press is held 2..4 frames, like a keyboard tap in the browser (the soak itself presses for 1). */
const MIN_TAP_FRAMES = 2;
const MAX_TAP_FRAMES = 4;

/** With retireFromLobby the continuation menu picks RETIRE this often (RETIRE-YES, like every loss and forfeit, ends in the lobby). */
const LOBBY_RETIRE_RATE = 0.5;

/** One policy per challenge, cycled: mostly the swap-reaching winner, with the plain winner and the random "full" explorer. */
export const DEFAULT_POLICY_CYCLE: readonly SoakPolicy[] = ["winning-swap", "winning", "winning-swap", "full"];

export interface FrameSegment {
  frames: number;
  buttons: GbaButton[];
}

export type RestartReason = "lobby" | "stall" | "budget";

export interface GoalPlayOptions {
  seed: number;
  scene: "on" | "off";
  /** Presentation RNG seed the page was opened with; defaults to `seed`. */
  presentationSeed?: number;
  /** Which challenge this is (0-based); selects the policy and the decision streams. */
  challenge?: number;
  policies?: readonly SoakPolicy[];
  /** Probability that a policy press is replaced by a short burst of uniform-random presses. */
  mixRate?: number;
  /** Frames this challenge may run before it asks for a restart; defaults to CHALLENGE_BUDGET_FRAMES. */
  budgetFrames?: number;
  /**
   * nch231 / lbra (default true): every loss, forfeit and RETIRE-YES ends in the lobby like the ROM, so after wandering it for
   * `lobbyWanderFrames` the director walks back to the singles attendant and presses A: the same page starts another
   * challenge (no restart). `false`: the lobby ends the challenge with a "lobby" restart, and the wander never presses A
   * while facing the attendant (that press would start a new challenge).
   */
  newChallengeFromLobby?: boolean;
  /** Opt-in: the continuation menu picks RETIRE (and answers YES) `LOBBY_RETIRE_RATE` of the time, so the lobby is also reached from a win run. */
  retireFromLobby?: boolean;
  /** Frames of random lobby wandering before the walk back (newChallengeFromLobby only); default 120. */
  lobbyWanderFrames?: number;
  /** Test seam: start from this state instead of the anchor draft. */
  initialState?: EngineState;
}

export interface GoalPlayStats {
  policy: SoakPolicy;
  policyPresses: number;
  randomPresses: number;
  lobbyPresses: number;
  /** nch231: challenges started from the lobby attendant on this page. */
  lobbyNewChallenges: number;
  maxBattleDepth: number;
  swapScreens: number;
}

export function policyForChallenge(challenge: number, policies: readonly SoakPolicy[] = DEFAULT_POLICY_CYCLE): SoakPolicy {
  return policies[challenge % policies.length]!;
}

/** Cheap order-sensitive hash of an RGBA frame; the page-side twin in randomPlay.mjs must stay identical. */
export function frameHash(rgba: ArrayLike<number>): number {
  let hash = 0;
  for (let i = 0; i < rgba.length; i += 4) hash = (Math.imul(hash, 31) + (rgba[i]! | (rgba[i + 1]! << 8) | (rgba[i + 2]! << 16))) | 0;
  return hash;
}

const msToFrames = (ms: number): number => Math.max(1, Math.round(ms / FRAME_MS));

/** Appends one frame to an RLE segment list (same shape as the session trace). */
export function appendFrame(segments: FrameSegment[], buttons: readonly GbaButton[]): void {
  const sorted = [...buttons].sort() as GbaButton[];
  const key = sorted.join("+");
  const last = segments[segments.length - 1];
  if (last !== undefined && last.buttons.join("+") === key) last.frames += 1;
  else segments.push({ frames: 1, buttons: sorted });
}

export class GoalPlayDirector {
  readonly policy: SoakPolicy;
  readonly stats: GoalPlayStats;
  state: EngineState;
  /** Set once the mirror engine (or the policy reading it) threw; no further frames are produced. */
  mirrorError: Error | null = null;
  /** Set when this challenge should be abandoned (a fresh page, a fresh challenge). */
  restart: RestartReason | null = null;

  private readonly player: RandomPlayer;
  private readonly rng: Rng;
  private readonly generator: InputGenerator;
  private readonly mixRate: number;
  private readonly budgetFrames: number;
  private heldButtons: GbaButton[] = [];
  private holdLeft = 0;
  private gapLeft = 0;
  private burst = 0;
  private progressKey = "";
  private progressFrame = 0;
  private lobbyEnteredFrame: number | null = null;
  private readonly newChallengeFromLobby: boolean;
  private readonly lobbyWanderFrames: number;
  private sawLobby = false;
  private sawSwap = false;

  constructor(options: GoalPlayOptions) {
    const challenge = options.challenge ?? 0;
    this.policy = policyForChallenge(challenge, options.policies);
    const streamSeed = (options.seed + Math.imul(challenge, 7919)) >>> 0;
    this.rng = new Rng(streamSeed, 0x6041);
    this.player = new RandomPlayer(new Rng(streamSeed), new ActionLog(false), this.policy);
    this.player.summaryExplore = this.policy === "full";
    this.generator = createInputGenerator(streamSeed ^ 0x5eed);
    this.mixRate = options.mixRate ?? 0.04;
    this.budgetFrames = options.budgetFrames ?? CHALLENGE_BUDGET_FRAMES;
    this.newChallengeFromLobby = options.newChallengeFromLobby ?? true;
    if (options.retireFromLobby === true) this.player.retireRate = LOBBY_RETIRE_RATE;
    this.lobbyWanderFrames = options.lobbyWanderFrames ?? 120;
    this.state =
      options.initialState ??
      createInitialState({
        battleScene: options.scene,
        presentationSeed: options.presentationSeed ?? options.seed,
      });
    this.stats = { policy: this.policy, policyPresses: 0, randomPresses: 0, lobbyPresses: 0, lobbyNewChallenges: 0, maxBattleDepth: 0, swapScreens: 0 };
  }

  get frame(): number {
    return this.state.frame;
  }

  get done(): boolean {
    return this.restart !== null || this.mirrorError !== null;
  }

  /**
   * Produce up to `count` frames of input, ticking the mirror with each. Stops early on restart or a mirror
   * throw; the frame whose tick threw IS included, so a browser replaying the output hits the same throw.
   */
  runFrames(count: number): FrameSegment[] {
    const segments: FrameSegment[] = [];
    for (let i = 0; i < count && !this.done; i += 1) {
      let buttons: readonly GbaButton[];
      try {
        buttons = this.pickButtons();
      } catch (error) {
        this.mirrorError = error instanceof Error ? error : new Error(String(error));
        break;
      }
      if (this.restart !== null) break;
      appendFrame(segments, buttons);
      try {
        this.state = tick(this.state, new Set(buttons));
      } catch (error) {
        this.mirrorError = error instanceof Error ? error : new Error(String(error));
        break;
      }
      this.observe();
    }
    return segments;
  }

  private observe(): void {
    const orch = this.state.factoryRoundBattleOrchestrator;
    if (orch !== null) {
      const depth = orch.config.factoryWinStreak + orch.round.rules.battleIndex;
      if (depth > this.stats.maxBattleDepth) this.stats.maxBattleDepth = depth;
    }
    const swapping = this.state.factorySwap !== null;
    if (swapping && !this.sawSwap) this.stats.swapScreens += 1;
    this.sawSwap = swapping;
  }

  private pickButtons(): readonly GbaButton[] {
    if (this.holdLeft > 0) {
      this.holdLeft -= 1;
      return this.heldButtons;
    }
    if (this.gapLeft > 0) {
      this.gapLeft -= 1;
      return [];
    }
    const state = this.state;
    if (state.lobbyFreeRoam === null && state.frame >= this.budgetFrames) {
      this.restart = "budget";
      return [];
    }
    const key = `${this.player.surface(state)}|${this.player.battle}|${this.player.turn}|${state.factoryRoundBattleOrchestrator?.config.id ?? ""}`;
    if (key !== this.progressKey) {
      this.progressKey = key;
      this.progressFrame = state.frame;
    }
    const stalledFor = state.frame - this.progressFrame;
    if (stalledFor >= STALL_RESTART_FRAMES) {
      this.restart = "stall";
      return [];
    }

    if (state.lobbyFreeRoam !== null) {
      this.sawLobby = true;
      this.lobbyEnteredFrame ??= state.frame;
      const waited = state.frame - this.lobbyEnteredFrame;
      if (this.newChallengeFromLobby && waited >= this.lobbyWanderFrames) return this.walkToAttendant(state);
      if (!this.newChallengeFromLobby && waited >= LOBBY_WANDER_FRAMES) {
        this.restart = "lobby";
        return [];
      }
      this.stats.lobbyPresses += 1;
      const button = this.rng.pick(["UP", "DOWN", "LEFT", "RIGHT", "A", "B"] as const);
      // A facing the attendant starts a new challenge: only the newChallengeFromLobby walk-back may press it.
      const safe = button === "A" && isFactoryLobbyFacingSinglesAttendant(state.lobbyFreeRoam) ? "B" : button;
      return this.press(safe, 6 + this.rng.int(40), 2);
    }
    if (this.sawLobby) {
      this.sawLobby = false;
      this.stats.lobbyNewChallenges += 1;
    }
    this.lobbyEnteredFrame = null;

    const stalled = stalledFor >= STALL_MIX_FRAMES;
    if (this.burst > 0) return this.randomPress(stalled);
    // A Summary opened inside the swap screen by a mixed-in press belongs to no policy; leave it like a player would.
    const summary = state.summaryScreen;
    if (summary.isOpen && !summary.transition && !summary.pageTransition && !summary.monTransition && state.factorySwap !== null) {
      this.stats.randomPresses += 1;
      return this.press(this.rng.chance(0.3) ? this.rng.pick(["UP", "DOWN", "LEFT", "RIGHT"] as const) : "B", MIN_TAP_FRAMES, 4);
    }
    const [button] = this.player.decide(state);
    // A policy that has nothing to press on a stalled screen (a surface it does not drive) is shaken by random input.
    if (button === undefined) return stalled && this.rng.chance(0.1) ? this.randomPress(true) : [];
    if (this.rng.chance(stalled ? 0.5 : this.mixRate)) {
      this.burst = 1 + this.rng.int(4);
      return this.randomPress(stalled);
    }
    this.stats.policyPresses += 1;
    return this.press(button, MIN_TAP_FRAMES + this.rng.int(MAX_TAP_FRAMES - MIN_TAP_FRAMES + 1), 0);
  }

  /**
   * One frame of the walk from wherever the player stands to the tile below the attendant, then UP into it and A.
   * Direction is chosen per frame from the tile the player is arriving at, so a held press never overshoots.
   */
  private walkToAttendant(state: EngineState): readonly GbaButton[] {
    const lobby = state.lobbyFreeRoam!;
    if (isFactoryLobbyFacingSinglesAttendant(lobby)) {
      return this.press("A", MIN_TAP_FRAMES, 2);
    }
    const target = { x: LOBBY_SINGLES_ATTENDANT_CELL.x, y: LOBBY_SINGLES_ATTENDANT_CELL.y + 1 };
    const here = lobby.stepRemaining > 0
      ? {
          x: lobby.stepFromX + (lobby.stepDir === "east" ? 1 : lobby.stepDir === "west" ? -1 : 0),
          y: lobby.stepFromY + (lobby.stepDir === "south" ? 1 : lobby.stepDir === "north" ? -1 : 0),
        }
      : { x: lobby.x, y: lobby.y };
    const dir = here.x === target.x && here.y === target.y ? "north" : firstLobbyStepTowards(here, target);
    if (dir === null) {
      this.restart = "lobby";
      return [];
    }
    this.stats.lobbyPresses += 1;
    return [LOBBY_DIR_BUTTON[dir]];
  }

  private press(button: GbaButton, holdFrames: number, gapFrames: number): readonly GbaButton[] {
    this.heldButtons = [button];
    this.holdLeft = holdFrames - 1;
    this.gapLeft = gapFrames;
    return this.heldButtons;
  }

  private randomPress(stalled: boolean): readonly GbaButton[] {
    this.burst = Math.max(0, this.burst - 1);
    this.stats.randomPresses += 1;
    const input = this.generator.next(stalled);
    return this.press(input.button as GbaButton, msToFrames(input.holdMs), msToFrames(input.gapMs));
  }
}

const LOBBY_DIR_BUTTON: Readonly<Record<LobbyDirection, GbaButton>> = { north: "UP", south: "DOWN", west: "LEFT", east: "RIGHT" };
const LOBBY_STEPS: readonly (readonly [LobbyDirection, number, number])[] = [
  ["north", 0, -1],
  ["south", 0, 1],
  ["west", -1, 0],
  ["east", 1, 0],
];

/** Breadth-first first move from `from` to `to` over the lobby's walkable cells; null when unreachable. */
function firstLobbyStepTowards(from: { x: number; y: number }, to: { x: number; y: number }): LobbyDirection | null {
  const seen = new Set<string>([`${from.x},${from.y}`]);
  let frontier: { x: number; y: number; first: LobbyDirection | null }[] = [{ ...from, first: null }];
  while (frontier.length > 0) {
    const next: typeof frontier = [];
    for (const cell of frontier) {
      for (const [dir, dx, dy] of LOBBY_STEPS) {
        const x = cell.x + dx;
        const y = cell.y + dy;
        const key = `${x},${y}`;
        if (seen.has(key) || !isFactoryLobbyCellWalkable(x, y)) continue;
        seen.add(key);
        const first = cell.first ?? dir;
        if (x === to.x && y === to.y) return first;
        next.push({ x, y, first });
      }
    }
    frontier = next;
  }
  return null;
}
