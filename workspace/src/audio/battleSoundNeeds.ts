// fsn1 (docs/fsn1-first-use-sounds.md): which sounds the coming battle can play, for the audio player's prefetch. The round's rules name both
// parties (species, ability, moves; side 0 = the player's) as soon as the round controller builds the next opponent, before the Battle Room
// walk and the battle intro; the presentation names a called move (Metronome, Mirror Move ...) once its turn resolves, before its animation
// plays. lib.ts hands each new request to the player (`AudioPlayer.prefetch`), one way: nothing here or there is read back by the session.
// A pure read of the state. Not in the headless graph.
import type { EngineState } from "../engine/core.ts";
import { presentedMoveIds } from "../engine/animAssetNeeds.ts";
import { factoryBattleBgm } from "../engine/battleStartSounds.ts";

/** One SE start: [m4a song id, the pan it starts at (null: an unpanned PlaySE)]. The player plays the recording nearest that pan. */
export type BattleSe = readonly [number, number | null];
/** Per attacker side: [the player's battler attacks, the opponent's battler attacks]. */
export type BattleSesBySide = readonly [readonly BattleSe[], readonly BattleSe[]];

/** src/assets/gen/battle-sounds.json (tools/bundle/battleSoundTable.ts). */
export interface BattleSoundTable {
  readonly schema: string;
  /** Move id -> the SEs its animation can start (every variant of anim-sound-timing.json, and the General_* bodies the move leads to). */
  readonly moves: Readonly<Record<string, BattleSesBySide>>;
  /** Moves whose animation sounds play in Battle Scene OFF too (Cmd_attackanimation under HITMARKER_NO_ANIMATIONS: Transform, Substitute). */
  readonly bothScenes: readonly number[];
  /** Move id -> the cry modes its sound task plays the attacker's cry in (Roar, Howl, Hyper Voice). */
  readonly cryTasks: Readonly<Record<string, readonly string[]>>;
  /** Ability id -> the SEs of the General_* body it leads to (weather each turn, Castform's change). */
  readonly abilities: Readonly<Record<string, BattleSesBySide>>;
  /** SEs every battle can play in both scenes (hits, faint, low HP, ball, stat change). */
  readonly common: readonly BattleSe[];
  /** SEs every Battle Scene ON battle can play (status conditions, the held-item and Focus Band bodies). */
  readonly commonSceneOn: readonly BattleSe[];
}

export interface BattleSoundMon {
  readonly side: 0 | 1;
  readonly species: number;
  readonly ability: number;
  readonly moves: readonly number[];
}

export interface BattleSoundRequest {
  readonly scene: "on" | "off";
  /** Both parties, the player's (side 0) first. */
  readonly mons: readonly BattleSoundMon[];
  /** Moves the presentation names that no party member knows (a called move): played by either side. */
  readonly calledMoves: readonly number[];
  /** The battle music (BGM_BATTLE_FRONTIER, or the Frontier Brain's). */
  readonly bgm: number;
}

/** A kernel party member (FactoryCorpusPartyMemberState): numeric species and move ids. The rules nest them as `playerKernelParty[i]` and `currentOpponent.rentalRecords[i].member`. */
function members(node: unknown, side: 0 | 1, out: BattleSoundMon[], depth: number): void {
  if (node === null || typeof node !== "object" || depth > 4) return;
  if (Array.isArray(node)) {
    for (const item of node) members(item, side, out, depth + 1);
    return;
  }
  const record = node as Record<string, unknown>;
  if (typeof record.species === "number" && Array.isArray(record.moves)) {
    const moves = record.moves.filter((id): id is number => typeof id === "number" && id > 0);
    out.push(Object.freeze({ side, species: record.species, ability: typeof record.ability === "number" ? record.ability : 0, moves: Object.freeze(moves) }));
    return;
  }
  for (const value of Object.values(record)) members(value, side, out, depth + 1);
}

/** Tracks the request of the battle the state is in or heading to; `update` says when it names something new. */
export class BattleSoundNeeds {
  private rules: unknown = null;
  private key = "";
  private request: BattleSoundRequest | null = null;

  /** The latest request (null before the first round has parties). */
  get current(): BattleSoundRequest | null {
    return this.request;
  }

  /**
   * Rescans after a tick; true when the request changed (new parties, a swap, a scene change, a called move). Cheap when nothing did. Only a
   * battle that is coming or under way counts (rules phase presentingBattleStart / battleActive): after a win the rules still name the beaten
   * opponent until the next one is built, so a resume into the swap screen fetches nothing for a battle that is over.
   */
  update(state: EngineState): boolean {
    const rules = state.factoryRoundBattleOrchestrator?.round?.rules;
    if (rules === undefined || (rules.phase !== "presentingBattleStart" && rules.phase !== "battleActive")) return false;
    const scene = state.battleSceneMode === "on" ? "on" : "off";
    let { request } = this;
    if (rules !== this.rules) {
      this.rules = rules;
      const mons: BattleSoundMon[] = [];
      members(rules.playerKernelParty, 0, mons, 0);
      members(rules.currentOpponent, 1, mons, 0);
      const bgm = factoryBattleBgm(rules.currentOpponent.frontierBrain !== undefined);
      const key = JSON.stringify([scene, bgm, mons]);
      if (key !== this.key) {
        this.key = key;
        request = { scene, mons: Object.freeze(mons), calledMoves: Object.freeze([]), bgm };
      }
    }
    if (request !== null && scene === "on") {
      let called: number[] | null = null;
      for (const id of presentedMoveIds(state)) {
        if (request.calledMoves.includes(id) || request.mons.some((mon) => mon.moves.includes(id))) continue;
        (called ??= [...request.calledMoves]).push(id);
      }
      if (called !== null) request = { ...request, calledMoves: Object.freeze(called) };
    }
    if (request === this.request) return false;
    this.request = request;
    return true;
  }

  reset(): void {
    this.rules = null;
    this.key = "";
    this.request = null;
  }
}
