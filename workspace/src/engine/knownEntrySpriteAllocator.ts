import {
  allocateEndLiveSprite, allocateFirstLiveSprite, createLiveSpriteAllocatorHost,
  destroyLiveSprite, type BattleSide, type LiveSpriteAllocatorHost, type LiveSpriteOwner,
} from "./liveSpriteAllocator.ts";

/** Routes proved to enter the common stock `CB2_InitBattle` singles path. */
export type KnownEntryRoute = "ordinary-factory" | "battle-lab-ordinary-singles";

export interface KnownEntrySpriteAllocatorProvider {
  readonly route: KnownEntryRoute;
  /** First legal action prompt; its two cursor sprites are still alive. */
  readonly commandPrompt: LiveSpriteAllocatorHost;
  /** Prompt cursors destroyed, immediately before a first move allocates. */
  readonly firstMove: LiveSpriteAllocatorHost;
}

const owner = {
  healthbox: (kind: "healthbox-main" | "healthbox-other" | "healthbar", side: BattleSide): LiveSpriteOwner => ({ kind, side }),
  side: (kind: "trainer" | "controller" | "battler" | "sendout-ball", side: BattleSide): LiveSpriteOwner => ({ kind, side }),
  summaryBar: (side: BattleSide): LiveSpriteOwner => ({ kind: "party-summary-bar", side }),
  summaryBall: (side: BattleSide, index: number): LiveSpriteOwner => ({ kind: "party-summary-ball", side, index }),
  particle: (side: BattleSide, index: number): LiveSpriteOwner => ({ kind: "ball-particle", side, index }),
  cursor: (index: 0 | 1): LiveSpriteOwner => ({ kind: "command-cursor", index }),
};

function first(host: LiveSpriteAllocatorHost, spriteOwner: LiveSpriteOwner): LiveSpriteAllocatorHost {
  return allocateFirstLiveSprite(host, spriteOwner).host;
}

function end(host: LiveSpriteAllocatorHost, spriteOwner: LiveSpriteOwner): LiveSpriteAllocatorHost {
  return allocateEndLiveSprite(host, spriteOwner).host;
}

/** `CreateBattlerHealthboxSprites`: main first, right and bar from the end. */
function createHealthbox(host: LiveSpriteAllocatorHost, side: BattleSide): LiveSpriteAllocatorHost {
  host = first(host, owner.healthbox("healthbox-main", side));
  host = end(host, owner.healthbox("healthbox-other", side));
  return end(host, owner.healthbox("healthbar", side));
}

/** `CreatePartyStatusSummarySprites`: one first-hole bar and six end-hole balls. */
function createPartySummary(host: LiveSpriteAllocatorHost, side: BattleSide): LiveSpriteAllocatorHost {
  host = first(host, owner.summaryBar(side));
  for (let index = 0; index < 6; index += 1) host = end(host, owner.summaryBall(side, index));
  return host;
}

/** `Task_HidePartyStatusSummary_BattleStart_2`: bar, ball 0, then balls 1..5. */
function destroyPartySummary(host: LiveSpriteAllocatorHost, side: BattleSide): LiveSpriteAllocatorHost {
  host = destroyLiveSprite(host, owner.summaryBar(side));
  for (let index = 0; index < 6; index += 1) host = destroyLiveSprite(host, owner.summaryBall(side, index));
  return host;
}

/** Source loop in `PokeBallOpenParticleAnimation` creates exactly sixteen. */
function createRemainingBallParticles(
  host: LiveSpriteAllocatorHost, side: BattleSide, start: number, endExclusive: number,
): LiveSpriteAllocatorHost {
  for (let index = start; index < endExclusive; index += 1) host = first(host, owner.particle(side, index));
  return host;
}

function destroyBallParticles(host: LiveSpriteAllocatorHost, side: BattleSide): LiveSpriteAllocatorHost {
  for (let index = 0; index < 16; index += 1) host = destroyLiveSprite(host, owner.particle(side, index));
  return host;
}

/**
 * Port the stock ordinary-singles entry lifecycle from `ResetSpriteData` to
 * the first action prompt. The recipe is procedure-relative, never tied to an
 * absolute frame. BattleLab's legal parties and the canonical Factory route
 * share these source controllers after `CB2_InitBattle`; the route is retained
 * so later entry variants cannot be silently treated as equivalent.
 *
 * Unknown entry, switch, in-battle summary, substitute, and transform paths
 * must invalidate the returned host instead of calling this provider.
 */
export function createKnownEntrySpriteAllocatorProvider(
  route: KnownEntryRoute,
): KnownEntrySpriteAllocatorProvider {
  let host = createLiveSpriteAllocatorHost(); // ResetSpriteData
  host = createHealthbox(host, "player");
  host = createHealthbox(host, "opponent");
  host = first(host, { kind: "enemy-shadow", side: "opponent" });
  host = first(host, owner.side("trainer", "player"));
  host = first(host, owner.side("trainer", "opponent"));
  host = createPartySummary(host, "player");
  host = createPartySummary(host, "opponent");

  // Opponent StartSendOutAnim and Poké Ball open. The ball is destroyed and
  // its first-hole slot is immediately reused by particle 13. Opponent party
  // summary cleanup then exposes slot 6 to particle 14.
  host = first(host, owner.side("controller", "opponent"));
  host = first(host, owner.side("battler", "opponent"));
  host = first(host, owner.side("sendout-ball", "opponent"));
  host = createRemainingBallParticles(host, "opponent", 0, 13);
  host = destroyLiveSprite(host, owner.side("sendout-ball", "opponent"));
  host = first(host, owner.particle("opponent", 13));
  host = destroyPartySummary(host, "opponent");
  host = createRemainingBallParticles(host, "opponent", 14, 16);
  host = destroyLiveSprite(host, owner.side("trainer", "opponent"));
  host = destroyBallParticles(host, "opponent");
  host = destroyLiveSprite(host, owner.side("controller", "opponent"));

  // Player sendout starts while its summary and trainer still occupy slots.
  // Summary cleanup happens before ball creation in the same source callback.
  host = first(host, owner.side("controller", "player"));
  host = first(host, owner.side("battler", "player"));
  host = destroyPartySummary(host, "player");
  host = first(host, owner.side("sendout-ball", "player"));
  host = destroyLiveSprite(host, owner.side("trainer", "player"));
  host = createRemainingBallParticles(host, "player", 0, 13);
  host = destroyLiveSprite(host, owner.side("sendout-ball", "player"));
  host = first(host, owner.particle("player", 13));
  host = createRemainingBallParticles(host, "player", 14, 16);
  host = destroyBallParticles(host, "player");
  host = destroyLiveSprite(host, owner.side("controller", "player"));

  host = first(host, owner.cursor(0));
  host = first(host, owner.cursor(1));
  const commandPrompt = host;
  host = destroyLiveSprite(host, owner.cursor(0));
  host = destroyLiveSprite(host, owner.cursor(1));
  return Object.freeze({ route, commandPrompt, firstMove: host });
}
