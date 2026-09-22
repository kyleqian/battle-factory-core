import inventoryJson from "../../src/data/gen/factory-animation-inventory.json" with { type: "json" };
import componentJson from "../../src/data/gen/battle-animation-components.json" with { type: "json" };
import coverageJson from "../../ANIMATION_COVERAGE.json" with { type: "json" };

export type AnimationCoverageStatus = "staged" | "partial" | "exact";
export type AnimationTier = "level50" | "openOnly" | "outsideFactory";

interface InventoryMove {
  readonly move: string;
  readonly name: string;
  readonly id: number;
  readonly frontierMonCount: number;
  readonly animationScript: string;
}

export interface AnimationWorkBlocker {
  readonly move: string;
  readonly reason: string;
  readonly resumeWhen: string;
  readonly evidence: readonly string[];
}

export interface AnimationWorkItem extends InventoryMove {
  readonly status: AnimationCoverageStatus | "unsupported";
  readonly componentCount: number;
  readonly unprovenComponentCount: number;
}

interface CoverageEntry {
  readonly move: string;
  readonly status: AnimationCoverageStatus;
  readonly covered: readonly string[];
  readonly evidence: readonly string[];
  readonly remaining?: string;
}

interface ComponentTrack {
  readonly id: string;
  readonly components: readonly string[];
  readonly representatives: readonly string[];
  readonly goal: string;
}

interface CoverageSummary {
  readonly tier: AnimationTier;
  readonly total: number;
  readonly unsupported: number;
  readonly staged: number;
  readonly partial: number;
  readonly exact: number;
}

interface AnimationComponent {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly moveCount: number;
  readonly level50MoveCount: number;
  readonly moves: readonly string[];
}

interface AnimationMoveComposition {
  readonly move: string;
  readonly componentIds: readonly string[];
}

export interface ComponentLeverage {
  readonly component: string;
  readonly provenBy: readonly string[];
  readonly remainingMoves: readonly string[];
}

export interface RelatedAnimationMove {
  readonly move: string;
  readonly sharedComponents: readonly string[];
  readonly similarity: number;
}

const inventory = inventoryJson as {
  tiers: Record<AnimationTier, { moveCount: number; moves: InventoryMove[] }>;
  variantAudits: {
    openLevelExclusiveMons: {
      monIndices: { count: number };
      speciesCount: number;
      moveCount: number;
      species: Array<{ species: string }>;
    };
  };
};
export interface AnimationCoverageLedger {
  schema: string;
  entries: CoverageEntry[];
  queue: string[];
  blockers?: AnimationWorkBlocker[];
  componentTracks: ComponentTrack[];
  variantAudits: {
    openLevelSpecies: Array<{
      species: string;
      evidence: string[];
      notes: string;
    }>;
  };
}
const coverage = coverageJson as AnimationCoverageLedger;
const componentInventory = componentJson as {
  schema: string;
  moves: AnimationMoveComposition[];
  components: AnimationComponent[];
};

const statuses = new Set<AnimationCoverageStatus>(["staged", "partial", "exact"]);
const tiers = Object.entries(inventory.tiers) as Array<
  [AnimationTier, { moveCount: number; moves: InventoryMove[] }]
>;
const tierByMove = new Map<string, AnimationTier>();
for (const [tier, data] of tiers) {
  for (const move of data.moves) {
    if (tierByMove.has(move.move)) throw new Error(`${move.move} appears in more than one priority tier`);
    tierByMove.set(move.move, tier);
  }
}

export function validateAnimationCoverage(ledger: AnimationCoverageLedger = coverage): void {
  const coverage = ledger;
  if (coverage.schema !== "factory-animation-coverage/v1") {
    throw new Error(`unsupported coverage schema ${coverage.schema}`);
  }
  if (componentInventory.schema !== "battle-animation-components/v1") {
    throw new Error(`unsupported component schema ${componentInventory.schema}`);
  }
  const seen = new Set<string>();
  for (const entry of coverage.entries) {
    if (seen.has(entry.move)) throw new Error(`duplicate coverage entry ${entry.move}`);
    seen.add(entry.move);
    if (!tierByMove.has(entry.move)) throw new Error(`coverage references unknown move ${entry.move}`);
    if (!statuses.has(entry.status)) throw new Error(`invalid status for ${entry.move}: ${entry.status}`);
    if (entry.covered.length === 0 || entry.evidence.length === 0) {
      throw new Error(`${entry.move} needs covered cases and evidence`);
    }
    if (entry.status === "exact" && entry.remaining) {
      throw new Error(`${entry.move} cannot be exact with a remaining obligation`);
    }
    if (entry.status !== "exact" && !entry.remaining) {
      throw new Error(`${entry.move} needs a bounded remaining obligation`);
    }
  }
  const queue = new Set<string>();
  for (const move of coverage.queue) {
    if (queue.has(move)) throw new Error(`duplicate queue move ${move}`);
    queue.add(move);
    if (tierByMove.get(move) !== "level50") {
      throw new Error(`queue move ${move} is not in the Level 50 priority tier`);
    }
  }
  const blocked = new Set<string>();
  for (const blocker of coverage.blockers ?? []) {
    if (blocked.has(blocker.move)) throw new Error(`duplicate blocker ${blocker.move}`);
    blocked.add(blocker.move);
    if (tierByMove.get(blocker.move) !== "level50") {
      throw new Error(`blocked move ${blocker.move} is not in the Level 50 priority tier`);
    }
    if (coverage.entries.some((entry) => entry.move === blocker.move && entry.status === "exact")) {
      throw new Error(`exact move ${blocker.move} cannot remain blocked`);
    }
    if (!blocker.reason.trim() || !blocker.resumeWhen.trim() || blocker.evidence.length === 0
      || blocker.evidence.some((item) => !item.trim())) {
      throw new Error(`${blocker.move} needs a blocker reason, resume condition, and evidence`);
    }
  }
  const componentIds = new Set(
    componentInventory.components.map((component) => component.id),
  );
  const componentsByMove = new Map(
    componentInventory.moves.map((move) => [move.move, new Set(move.componentIds)]),
  );
  const trackIds = new Set<string>();
  for (const track of coverage.componentTracks) {
    if (!track.id || trackIds.has(track.id)) {
      throw new Error(`duplicate or empty component track ${track.id}`);
    }
    trackIds.add(track.id);
    if (track.components.length === 0 || track.representatives.length === 0 || !track.goal) {
      throw new Error(`${track.id} needs components, representatives, and a goal`);
    }
    for (const component of track.components) {
      if (!componentIds.has(component)) {
        throw new Error(`${track.id} references unknown component ${component}`);
      }
    }
    for (const move of track.representatives) {
      if (tierByMove.get(move) !== "level50") {
        throw new Error(`${track.id} representative ${move} is not a Level 50 move`);
      }
      const dependencies = componentsByMove.get(move)!;
      if (!track.components.some((component) => dependencies.has(component))) {
        throw new Error(`${track.id} representative ${move} shares none of its components`);
      }
    }
  }
  const openSpecies = new Set(
    inventory.variantAudits.openLevelExclusiveMons.species.map((entry) => entry.species),
  );
  const auditedSpecies = new Set<string>();
  for (const audit of coverage.variantAudits.openLevelSpecies) {
    if (!openSpecies.has(audit.species)) {
      throw new Error(`open-level audit references unknown species ${audit.species}`);
    }
    if (auditedSpecies.has(audit.species)) {
      throw new Error(`duplicate open-level species audit ${audit.species}`);
    }
    auditedSpecies.add(audit.species);
    if (audit.evidence.length === 0 || audit.notes.length === 0) {
      throw new Error(`${audit.species} audit needs evidence and notes`);
    }
  }
}

export function queuedAnimationComponentTracks(): readonly ComponentTrack[] {
  validateAnimationCoverage();
  return coverage.componentTracks;
}

function compareLeverage(a: ComponentLeverage, b: ComponentLeverage): number {
  return (
    b.remainingMoves.length - a.remainingMoves.length ||
    b.provenBy.length - a.provenBy.length ||
    a.component.localeCompare(b.component)
  );
}

/**
 * Rank source components by Level 50 moves they can help stage next.
 * "Proven" means at least one exact move traverses the component; it does not
 * waive per-move oracle acceptance for the remaining dependents.
 */
export function animationComponentLeverage(): {
  readonly proven: ComponentLeverage[];
  readonly unproven: ComponentLeverage[];
} {
  validateAnimationCoverage();
  const exact = new Set(
    coverage.entries
      .filter((entry) => entry.status === "exact")
      .map((entry) => entry.move),
  );
  const level50 = new Set(inventory.tiers.level50.moves.map((move) => move.move));
  const proven: ComponentLeverage[] = [];
  const unproven: ComponentLeverage[] = [];
  for (const component of componentInventory.components) {
    const dependents = component.moves.filter((move) => level50.has(move));
    if (dependents.length < 2) continue;
    const provenBy = dependents.filter((move) => exact.has(move));
    const remainingMoves = dependents.filter((move) => !exact.has(move));
    if (remainingMoves.length === 0) continue;
    const leverage = { component: component.id, provenBy, remainingMoves };
    (provenBy.length > 0 ? proven : unproven).push(leverage);
  }
  return {
    proven: proven.sort(compareLeverage),
    unproven: unproven.sort(compareLeverage),
  };
}

/** Find overlapping source compositions without assigning exclusive families. */
export function relatedAnimationMoves(
  moveLabel: string,
  limit = 5,
): RelatedAnimationMove[] {
  validateAnimationCoverage();
  const moves = new Map(componentInventory.moves.map((move) => [move.move, move]));
  const source = moves.get(moveLabel);
  if (!source) throw new Error(`unknown animation move ${moveLabel}`);
  const level50 = new Set(inventory.tiers.level50.moves.map((move) => move.move));
  const componentById = new Map(
    componentInventory.components.map((component) => [component.id, component]),
  );
  const sourceComponents = new Set(source.componentIds);
  return componentInventory.moves
    .filter((candidate) => candidate.move !== moveLabel && level50.has(candidate.move))
    .map((candidate) => {
      const shared = candidate.componentIds.filter((id) => sourceComponents.has(id));
      const union = new Set([...source.componentIds, ...candidate.componentIds]).size;
      // Rare shared dependencies carry more signal than ubiquitous script setup.
      const weightedShared = shared.reduce((sum, id) => {
        const count = componentById.get(id)?.level50MoveCount ?? 1;
        return sum + 1 / count;
      }, 0);
      return {
        move: candidate.move,
        sharedComponents: shared.sort((a, b) => {
          const aCount = componentById.get(a)?.level50MoveCount ?? 1;
          const bCount = componentById.get(b)?.level50MoveCount ?? 1;
          return aCount - bCount || a.localeCompare(b);
        }),
        similarity: union === 0 ? 0 : weightedShared / union,
      };
    })
    .filter((candidate) => candidate.sharedComponents.length > 0)
    .sort((a, b) =>
      b.similarity - a.similarity ||
      b.sharedComponents.length - a.sharedComponents.length ||
      a.move.localeCompare(b.move),
    )
    .slice(0, limit);
}

export function animationCoverageSummary(): CoverageSummary[] {
  validateAnimationCoverage();
  const statusByMove = new Map(coverage.entries.map((entry) => [entry.move, entry.status]));
  return tiers.map(([tier, data]) => {
    const counts = { unsupported: 0, staged: 0, partial: 0, exact: 0 };
    for (const move of data.moves) {
      const status = statusByMove.get(move.move) ?? "unsupported";
      counts[status] += 1;
    }
    return { tier, total: data.moveCount, ...counts };
  });
}

/** Every unfinished Level 50 move is either ready for investigation or explicitly blocked.
 * The manual queue only overrides priority; it never limits the authorized backlog.
 * Component reuse ranks work, but grants no animation acceptance or timing facts.
 */
export function animationWorkPlan(ledger: AnimationCoverageLedger = coverage): {
  state: "ready" | "blocked" | "complete";
  remaining: number;
  ready: AnimationWorkItem[];
  blocked: Array<AnimationWorkItem & AnimationWorkBlocker>;
} {
  validateAnimationCoverage(ledger);
  const statusByMove = new Map(ledger.entries.map((entry) => [entry.move, entry.status]));
  const componentsByMove = new Map(componentInventory.moves.map((move) => [move.move, move.componentIds]));
  const proven = new Set(componentInventory.moves
    .filter((move) => statusByMove.get(move.move) === "exact")
    .flatMap((move) => move.componentIds));
  const blockers = new Map((ledger.blockers ?? []).map((blocker) => [blocker.move, blocker]));
  const priority = new Map(ledger.queue.map((move, index) => [move, index]));
  const remaining = inventory.tiers.level50.moves
    .filter((move) => statusByMove.get(move.move) !== "exact")
    .map((move): AnimationWorkItem => {
      const components = componentsByMove.get(move.move)!;
      return {
        ...move,
        status: statusByMove.get(move.move) ?? "unsupported",
        componentCount: components.length,
        unprovenComponentCount: components.filter((component) => !proven.has(component)).length,
      };
    });
  const ready = remaining.filter((move) => !blockers.has(move.move)).sort((a, b) =>
    (priority.get(a.move) ?? Number.MAX_SAFE_INTEGER) - (priority.get(b.move) ?? Number.MAX_SAFE_INTEGER)
    || a.unprovenComponentCount - b.unprovenComponentCount
    || a.componentCount - b.componentCount
    || b.frontierMonCount - a.frontierMonCount
    || a.id - b.id);
  const blocked = remaining.filter((move) => blockers.has(move.move))
    .map((move) => ({ ...move, ...blockers.get(move.move)! }));
  return {
    state: ready.length > 0 ? "ready" : blocked.length > 0 ? "blocked" : "complete",
    remaining: remaining.length,
    ready,
    blocked,
  };
}

export function queuedAnimationMoves(): AnimationWorkItem[] {
  return animationWorkPlan().ready;
}

export function openLevelVariantAudit(): {
  readonly monSets: number;
  readonly species: number;
  readonly auditedSpecies: number;
  readonly overlappingMoves: number;
} {
  const audit = inventory.variantAudits.openLevelExclusiveMons;
  return {
    monSets: audit.monIndices.count,
    species: audit.speciesCount,
    auditedSpecies: coverage.variantAudits.openLevelSpecies.length,
    overlappingMoves: audit.moveCount,
  };
}
