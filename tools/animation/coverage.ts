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
const coverage = coverageJson as {
  schema: string;
  entries: CoverageEntry[];
  queue: string[];
  componentTracks: ComponentTrack[];
  variantAudits: {
    openLevelSpecies: Array<{
      species: string;
      evidence: string[];
      notes: string;
    }>;
  };
};
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

export function validateAnimationCoverage(): void {
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

export function queuedAnimationMoves(): Array<InventoryMove & { status: AnimationCoverageStatus | "unsupported" }> {
  validateAnimationCoverage();
  const moves = new Map(
    tiers.flatMap(([, data]) => data.moves).map((move) => [move.move, move]),
  );
  const statusByMove = new Map(coverage.entries.map((entry) => [entry.move, entry.status]));
  return coverage.queue.map((label) => ({
    ...moves.get(label)!,
    status: statusByMove.get(label) ?? "unsupported",
  }));
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
